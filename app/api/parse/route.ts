import { querySnowflake } from "@/lib/snowflake"
import fs from "fs"
import path from "path"
import crypto from "crypto"
import { STAGE, TEMP_PREFIX, refreshStage, sanitizeFileName } from "@/lib/stage"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const id = crypto.randomUUID().slice(0, 8)
  let tmpPath = ""
  let tmpDir = ""
  let stageFile = ""

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file || file.size === 0) {
      return Response.json({ error: "No file uploaded" }, { status: 400 })
    }

    const ext = path.extname(file.name).toLowerCase()
    const allowed = [".pdf", ".png", ".jpg", ".jpeg", ".tif", ".tiff", ".txt", ".docx", ".doc", ".pptx", ".gif", ".bmp", ".webp"]
    if (!allowed.includes(ext)) {
      return Response.json({ error: `Unsupported file type: ${ext}. Allowed: ${allowed.join(", ")}` }, { status: 400 })
    }

    // Save to /tmp/<id>/ keeping the original name so it stays recognizable on the stage
    const base = sanitizeFileName(path.basename(file.name, path.extname(file.name)))
    const safeName = `${id}_${base}${ext}`
    tmpDir = `/tmp/parse_${id}`
    fs.mkdirSync(tmpDir, { recursive: true })
    tmpPath = `${tmpDir}/${safeName}`
    const buf = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(tmpPath, buf)

    // PUT to stage
    stageFile = `${TEMP_PREFIX}/${safeName}`
    await querySnowflake(
      `PUT 'file://${tmpPath}' ${STAGE}/${TEMP_PREFIX}/ AUTO_COMPRESS=FALSE OVERWRITE=TRUE`,
    )
    await refreshStage()

    // AI_PARSE_DOCUMENT with OCR mode
    const rows = await querySnowflake(
      `SELECT AI_PARSE_DOCUMENT(
        TO_FILE('${STAGE}', '${stageFile}'),
        {'mode': 'OCR'}
      ) AS result`,
    )

    const raw = rows[0]?.RESULT
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw

    return Response.json({
      fileName: file.name,
      fileSize: file.size,
      content: parsed?.content ?? parsed,
      pages: parsed?.pages,
      stageFile,
    })
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Parse failed" },
      { status: 500 },
    )
  } finally {
    // Cleanup local tmp files only; stage file is kept for Save, unsaved ones are
    // removed later by /api/cleanup
    if (tmpDir) {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch {}
    }
  }
}

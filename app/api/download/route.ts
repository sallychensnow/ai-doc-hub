import { querySnowflake } from "@/lib/snowflake"
import { DATA_SCHEMA } from "@/lib/config"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const docId = url.searchParams.get("id")
    if (!docId) {
      return new Response("Missing id parameter", { status: 400 })
    }

    // Get file info and presigned URL
    // STAGE_FILE_PATH stores the full stage path for parse-uploaded files (e.g. _parse_temp/parse_xxx.pdf)
    // For legacy docs, fall back to FILE_HASH.pdf
    const rows = await querySnowflake(
      `SELECT FILE_NAME, FILE_HASH, STAGE_FILE_PATH,
              GET_PRESIGNED_URL(
                @${DATA_SCHEMA}.RAG_PDF_STAGE,
                COALESCE(
                  REPLACE(STAGE_FILE_PATH, '@${DATA_SCHEMA}.RAG_PDF_STAGE/', ''),
                  FILE_HASH || '.pdf'
                ),
                3600
              ) AS url
       FROM ${DATA_SCHEMA}.RAG_DOCUMENTS
       WHERE DOCUMENT_ID = ?`,
      { binds: [docId] },
    )

    if (!rows.length) {
      return new Response("Document not found", { status: 404 })
    }

    const fileName = rows[0].FILE_NAME as string
    const presignedUrl = rows[0].URL as string

    // Fetch the file via presigned URL
    const fileRes = await fetch(presignedUrl)
    if (!fileRes.ok) {
      return new Response("Failed to fetch file from stage", { status: 502 })
    }

    const body = fileRes.body
    const encoded = encodeURIComponent(fileName)
    const ext = fileName.split(".").pop()?.toLowerCase() || "pdf"
    const mimeTypes: Record<string, string> = {
      pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
      tif: "image/tiff", tiff: "image/tiff", txt: "text/plain",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    }

    return new Response(body, {
      headers: {
        "Content-Type": mimeTypes[ext] || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encoded}"; filename*=UTF-8''${encoded}`,
      },
    })
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "Download failed", { status: 500 })
  }
}

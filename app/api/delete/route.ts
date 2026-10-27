import { querySnowflake } from "@/lib/snowflake"
import { refreshStage, removeStageFile, toRelativePath } from "@/lib/stage"
import { DATA_SCHEMA } from "@/lib/config"

export const dynamic = "force-dynamic"

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url)
    const docId = url.searchParams.get("id")
    if (!docId) {
      return Response.json({ error: "Missing id parameter" }, { status: 400 })
    }

    // Get stage location of the original file
    const rows = await querySnowflake(
      `SELECT FILE_HASH, STAGE_FILE_PATH FROM ${DATA_SCHEMA}.RAG_DOCUMENTS WHERE DOCUMENT_ID = ?`,
      { binds: [docId] },
    )
    if (!rows.length) {
      return Response.json({ error: "Document not found" }, { status: 404 })
    }

    const fileHash = rows[0].FILE_HASH as string
    const stageFilePath = rows[0].STAGE_FILE_PATH as string | null

    // Delete chunks first (FK dependency)
    const chunkResult = await querySnowflake(
      `DELETE FROM ${DATA_SCHEMA}.RAG_CHUNKS WHERE DOCUMENT_ID = ?`,
      { binds: [docId] },
    )

    // Delete document record
    await querySnowflake(
      `DELETE FROM ${DATA_SCHEMA}.RAG_DOCUMENTS WHERE DOCUMENT_ID = ?`,
      { binds: [docId] },
    )

    // Remove the actual stage file (Live Parse uploads live under _parse_temp/,
    // legacy uploads are <hash>.pdf at the stage root). Best effort.
    const relPath = stageFilePath
      ? toRelativePath(stageFilePath)
      : fileHash ? `${fileHash}.pdf` : ""
    let stageFileRemoved = false
    try {
      stageFileRemoved = await removeStageFile(relPath)
    } catch {
      // Stage file may not exist or already removed
    }
    await refreshStage()

    return Response.json({
      documentId: docId,
      chunksDeleted: chunkResult[0]?.["number of rows deleted"] ?? 0,
      stageFile: relPath || null,
      stageFileRemoved,
      message: "Document, chunks, and stage file deleted.",
    })
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Delete failed" },
      { status: 500 },
    )
  }
}

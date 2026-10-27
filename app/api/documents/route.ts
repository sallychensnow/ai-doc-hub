import { querySnowflake } from "@/lib/snowflake"
import { DATA_SCHEMA } from "@/lib/config"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const rows = await querySnowflake(`
      SELECT d.DOCUMENT_ID, d.FILE_NAME, d.FILE_SIZE, d.TOTAL_PAGES, d.SOURCE, d.CREATED_AT,
             COUNT(c.CHUNK_ID) AS chunk_count,
             GET_PRESIGNED_URL(
               @${DATA_SCHEMA}.RAG_PDF_STAGE,
               COALESCE(
                 REPLACE(d.STAGE_FILE_PATH, '@${DATA_SCHEMA}.RAG_PDF_STAGE/', ''),
                 d.FILE_HASH || '.pdf'
               ),
               3600
             ) AS download_url
      FROM ${DATA_SCHEMA}.RAG_DOCUMENTS d
      LEFT JOIN ${DATA_SCHEMA}.RAG_CHUNKS c ON d.DOCUMENT_ID = c.DOCUMENT_ID
      GROUP BY d.DOCUMENT_ID, d.FILE_NAME, d.FILE_HASH, d.FILE_SIZE, d.TOTAL_PAGES, d.SOURCE, d.CREATED_AT, d.STAGE_FILE_PATH
      ORDER BY d.CREATED_AT DESC
    `)

    function toIso(val: unknown): string | null {
      if (!val) return null
      if (val instanceof Date) return val.toISOString()
      return String(val)
    }

    return Response.json(rows.map((r: Record<string, unknown>) => ({
      documentId: r.DOCUMENT_ID,
      fileName: r.FILE_NAME,
      fileSize: Number(r.FILE_SIZE ?? 0),
      totalPages: Number(r.TOTAL_PAGES ?? 0),
      source: r.SOURCE,
      createdAt: toIso(r.CREATED_AT),
      chunkCount: Number(r.CHUNK_COUNT ?? 0),
      downloadUrl: r.DOWNLOAD_URL ?? null,
    })))
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Failed to fetch documents" }, { status: 500 })
  }
}

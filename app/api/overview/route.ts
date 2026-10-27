import { querySnowflake } from "@/lib/snowflake"
import { DATA_SCHEMA } from "@/lib/config"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const [docRows, chunkRows] = await Promise.all([
      querySnowflake(`SELECT COUNT(*) AS cnt, MAX(CREATED_AT) AS latest FROM ${DATA_SCHEMA}.RAG_DOCUMENTS`),
      querySnowflake(`SELECT COUNT(*) AS cnt, COUNT(DISTINCT DOCUMENT_ID) AS doc_cnt FROM ${DATA_SCHEMA}.RAG_CHUNKS`),
    ])
    return Response.json({
      totalDocuments: Number(docRows[0]?.CNT ?? 0),
      latestUpload: docRows[0]?.LATEST ?? null,
      totalChunks: Number(chunkRows[0]?.CNT ?? 0),
      indexedDocuments: Number(chunkRows[0]?.DOC_CNT ?? 0),
    })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Failed to fetch overview" }, { status: 500 })
  }
}

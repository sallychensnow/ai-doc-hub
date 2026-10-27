import { querySnowflake } from "@/lib/snowflake"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const q = url.searchParams.get("q") || ""
    const limit = Math.min(Number(url.searchParams.get("limit") || 10), 20)

    if (!q.trim()) {
      return Response.json({ results: [], query: "" })
    }

    const rows = await querySnowflake(
      `SELECT PARSE_JSON(SNOWFLAKE.CORTEX.SEARCH_PREVIEW(
        'RAG_DEMO.RAG_CORTEX.TEST',
        ?
      )) AS result`,
      { binds: [JSON.stringify({ query: q, columns: ["CHUNK_TEXT", "FILE_NAME", "PAGE_NUMBER", "CHUNK_ID"], limit })] },
    )

    const parsed = rows[0]?.RESULT
    const results = (parsed?.results || []).map((r: Record<string, unknown>) => ({
      chunkText: r.CHUNK_TEXT,
      fileName: r.FILE_NAME,
      pageNumber: r.PAGE_NUMBER,
      chunkId: r.CHUNK_ID,
      scores: r["@scores"],
    }))

    return Response.json({ results, query: q })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Search failed" }, { status: 500 })
  }
}

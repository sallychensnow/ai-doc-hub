import { querySnowflake } from "@/lib/snowflake"
import { STAGE, STAGE_NAME, TEMP_PREFIX, refreshStage, removeStageFile } from "@/lib/stage"

export const dynamic = "force-dynamic"

// Files parsed in Live Parse but never saved stay in _parse_temp/. Only files older
// than this are treated as orphans, so an in-progress parse → save is never touched.
const DEFAULT_MIN_AGE_MINUTES = 60

async function findOrphans(minAgeMinutes: number) {
  await refreshStage()
  const rows = await querySnowflake(
    `SELECT d.RELATIVE_PATH, d.SIZE, d.LAST_MODIFIED
       FROM DIRECTORY(${STAGE}) d
      WHERE STARTSWITH(d.RELATIVE_PATH, '${TEMP_PREFIX}/')
        AND d.LAST_MODIFIED < DATEADD('minute', -?, CURRENT_TIMESTAMP())
        AND NOT EXISTS (
          SELECT 1 FROM RAG_DEMO.RAG_CORTEX.RAG_DOCUMENTS r
           WHERE REPLACE(r.STAGE_FILE_PATH, '@${STAGE_NAME}/', '') = d.RELATIVE_PATH
        )
      ORDER BY d.LAST_MODIFIED`,
    { binds: [minAgeMinutes] },
  )
  return rows.map(r => ({
    path: r.RELATIVE_PATH as string,
    size: Number(r.SIZE),
    lastModified: r.LAST_MODIFIED,
  }))
}

function minAge(req: Request): number {
  const v = Number(new URL(req.url).searchParams.get("minAgeMinutes"))
  return Number.isFinite(v) && v >= 0 ? Math.floor(v) : DEFAULT_MIN_AGE_MINUTES
}

/** Preview: list unsaved Live Parse files that would be removed. */
export async function GET(req: Request) {
  try {
    const orphans = await findOrphans(minAge(req))
    return Response.json({ count: orphans.length, files: orphans })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Cleanup preview failed" }, { status: 500 })
  }
}

/** Remove unsaved Live Parse files from the stage. */
export async function POST(req: Request) {
  try {
    const orphans = await findOrphans(minAge(req))
    const removed: string[] = []
    const failed: string[] = []
    for (const f of orphans) {
      try {
        if (await removeStageFile(f.path)) removed.push(f.path)
        else failed.push(f.path)
      } catch {
        failed.push(f.path)
      }
    }
    await refreshStage()
    return Response.json({ removed: removed.length, failed, files: removed })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Cleanup failed" }, { status: 500 })
  }
}

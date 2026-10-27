import { querySnowflake } from "@/lib/snowflake"
import { DATA_SCHEMA } from "@/lib/config"

export const STAGE_NAME = `${DATA_SCHEMA}.RAG_PDF_STAGE`
export const STAGE = `@${STAGE_NAME}`
export const TEMP_PREFIX = "_parse_temp"

// Only allow safe characters in stage paths that get interpolated into SQL.
const SAFE_PATH = /^[A-Za-z0-9_\-./\u4e00-\u9fff]+$/

/** Turn an arbitrary uploaded filename into a stage-safe name (keeps CJK). */
export function sanitizeFileName(name: string): string {
  const cleaned = name
    .replace(/[^A-Za-z0-9_\-.\u4e00-\u9fff]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^\.+/, "")
  return cleaned.slice(-120) || "file"
}

/** Convert "@DB.SCHEMA.STAGE/path" (or a bare path) to a path relative to the stage. */
export function toRelativePath(stagePath: string): string {
  return stagePath.replace(new RegExp(`^@?${STAGE_NAME.replace(/\./g, "\\.")}/`, "i"), "")
}

export function isSafePath(p: string): boolean {
  return SAFE_PATH.test(p) && !p.includes("..") && !p.startsWith("/")
}

/** Sync the stage directory table so Snowsight / DIRECTORY() reflect PUT/REMOVE. */
export async function refreshStage(): Promise<void> {
  try {
    await querySnowflake(`ALTER STAGE ${STAGE_NAME} REFRESH`)
  } catch {
    // Directory table may be disabled; not fatal for the app.
  }
}

/** Remove a single file from the stage. Returns true if the path was valid and REMOVE ran. */
export async function removeStageFile(relPath: string): Promise<boolean> {
  if (!relPath || !isSafePath(relPath)) return false
  await querySnowflake(`REMOVE '${STAGE}/${relPath}'`)
  return true
}

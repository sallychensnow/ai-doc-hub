import { querySnowflake } from "@/lib/snowflake"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { text, fields } = body as { text: string; fields: string[] }

    if (!text || !fields?.length) {
      return Response.json({ error: "text and fields are required" }, { status: 400 })
    }

    const uniqueFields = [...new Set(fields.map((f: string) => f.trim()).filter(Boolean))]
    if (!uniqueFields.length) {
      return Response.json({ error: "No valid fields provided" }, { status: 400 })
    }
    const fieldsArray = uniqueFields.map((f: string) => `'${f.replace(/'/g, "''")}'`).join(", ")
    const rows = await querySnowflake(
      `SELECT AI_EXTRACT(?, [${fieldsArray}]) AS result`,
      { binds: [text] },
    )

    const raw = rows[0]?.RESULT
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw
    return Response.json(parsed)
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Extraction failed" }, { status: 500 })
  }
}

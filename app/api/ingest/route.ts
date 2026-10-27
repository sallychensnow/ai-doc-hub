import { querySnowflake } from "@/lib/snowflake"
import crypto from "crypto"

export const dynamic = "force-dynamic"

const CHUNK_SIZE = 1000
const CHUNK_OVERLAP = 100

function chunkText(text: string): string[] {
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    let end = start + CHUNK_SIZE
    if (end < text.length) {
      // Try to break at paragraph or sentence boundary
      const slice = text.slice(start, end + 200)
      const paraBreak = slice.lastIndexOf("\n\n", CHUNK_SIZE)
      const sentBreak = slice.lastIndexOf("。", CHUNK_SIZE)
      const dotBreak = slice.lastIndexOf(". ", CHUNK_SIZE)
      const best = Math.max(paraBreak, sentBreak, dotBreak)
      if (best > CHUNK_SIZE * 0.5) {
        end = start + best + 1
      }
    } else {
      end = text.length
    }
    chunks.push(text.slice(start, end).trim())
    start = end - CHUNK_OVERLAP
    if (start < 0) start = 0
    if (end >= text.length) break
  }
  return chunks.filter(c => c.length > 0)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { fileName, fileSize, content, stageFile } = body as {
      fileName: string
      fileSize: number
      content: string
      stageFile?: string
    }

    if (!fileName || !content) {
      return Response.json({ error: "fileName and content are required" }, { status: 400 })
    }

    const fileHash = crypto.createHash("md5").update(content).digest("hex")
    const docId = `doc_${fileHash}`

    // Check if document already exists
    const existing = await querySnowflake(
      `SELECT DOCUMENT_ID FROM RAG_DEMO.RAG_CORTEX.RAG_DOCUMENTS WHERE DOCUMENT_ID = ?`,
      { binds: [docId] },
    )
    if (existing.length > 0) {
      return Response.json({ error: "Document already exists", documentId: docId }, { status: 409 })
    }

    // Chunk the content
    const chunks = chunkText(content)

    // Insert document record
    const stagePath = stageFile
      ? `@RAG_DEMO.RAG_CORTEX.RAG_PDF_STAGE/${stageFile}`
      : null

    await querySnowflake(
      `INSERT INTO RAG_DEMO.RAG_CORTEX.RAG_DOCUMENTS
        (DOCUMENT_ID, FILE_NAME, FILE_HASH, FILE_SIZE, TOTAL_PAGES, SOURCE, STAGE_FILE_PATH)
       VALUES (?, ?, ?, ?, ?, 'app_upload', ?)`,
      { binds: [docId, fileName, fileHash, fileSize, chunks.length, stagePath] },
    )

    // Insert chunks in batches
    for (let i = 0; i < chunks.length; i++) {
      const chunkId = `${docId}_chunk_${String(i).padStart(4, "0")}`
      await querySnowflake(
        `INSERT INTO RAG_DEMO.RAG_CORTEX.RAG_CHUNKS
          (CHUNK_ID, DOCUMENT_ID, FILE_NAME, CHUNK_INDEX, PAGE_NUMBER, CHUNK_TEXT, CHUNK_LENGTH)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        { binds: [chunkId, docId, fileName, i, 1, chunks[i], chunks[i].length] },
      )
    }

    return Response.json({
      documentId: docId,
      fileName,
      chunksCreated: chunks.length,
      message: `Document saved. ${chunks.length} chunks indexed for Cortex Search.`,
    })
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Ingest failed" },
      { status: 500 },
    )
  }
}

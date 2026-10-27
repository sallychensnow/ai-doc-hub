"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Doc {
  documentId: string
  fileName: string
  fileSize: number
  totalPages: number
  chunkCount: number
  createdAt: string
  downloadUrl: string | null
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export default function DocumentsPage() {
  const queryClient = useQueryClient()
  const docs = useQuery({ queryKey: ["documents"], queryFn: () => fetch("/api/documents").then(r => r.json()) })
  const [deleting, setDeleting] = useState<string | null>(null)
  const [cleaning, setCleaning] = useState(false)

  async function handleCleanup() {
    setCleaning(true)
    try {
      const preview = await fetch("/api/cleanup").then(r => r.json())
      if (preview.error) { alert(`Cleanup failed: ${preview.error}`); return }
      if (!preview.count) { alert("No unsaved Live Parse files older than 60 minutes."); return }
      const list = preview.files.slice(0, 10).map((f: { path: string }) => `• ${f.path}`).join("\n")
      const more = preview.count > 10 ? `\n…and ${preview.count - 10} more` : ""
      if (!confirm(`Remove ${preview.count} unsaved file(s) from the stage?\n\n${list}${more}`)) return
      const res = await fetch("/api/cleanup", { method: "POST" }).then(r => r.json())
      if (res.error) alert(`Cleanup failed: ${res.error}`)
      else alert(`Removed ${res.removed} file(s).${res.failed?.length ? ` Failed: ${res.failed.length}` : ""}`)
    } catch (e) {
      alert(`Cleanup failed: ${e instanceof Error ? e.message : "Unknown error"}`)
    } finally {
      setCleaning(false)
    }
  }

  async function handleDelete(docId: string, fileName: string) {
    if (!confirm(`Delete "${fileName}"?\n\nThis will remove the document, all chunks, and the stage file.`)) return
    setDeleting(docId)
    try {
      const res = await fetch(`/api/delete?id=${encodeURIComponent(docId)}`, { method: "DELETE" })
      const data = await res.json()
      if (data.error) {
        alert(`Delete failed: ${data.error}`)
      } else {
        queryClient.invalidateQueries({ queryKey: ["documents"] })
        queryClient.invalidateQueries({ queryKey: ["overview"] })
      }
    } catch (e) {
      alert(`Delete failed: ${e instanceof Error ? e.message : "Unknown error"}`)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <main className="w-full max-w-5xl mx-auto py-8 px-4 animate-in">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold mb-1">Document Library</h1>
          <p className="text-xs text-muted-foreground">All indexed documents in RAG_DEMO.RAG_CORTEX</p>
        </div>
        <button
          onClick={handleCleanup}
          disabled={cleaning}
          className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted disabled:opacity-50"
          title="Remove files parsed in Live Parse but never saved (older than 60 min)"
        >
          {cleaning ? "Cleaning…" : "Clean up unsaved files"}
        </button>
      </div>

      {docs.isLoading && <p className="text-sm text-muted-foreground">Loading documents...</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {docs.data?.map?.((d: Doc) => (
          <Card key={d.documentId} className="glass-card">
            <CardContent className="py-4 px-5">
              <p className="text-sm font-medium mb-1 truncate" title={d.fileName}>{d.fileName}</p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                <Badge variant="secondary" className="text-[10px]">{d.totalPages} pages</Badge>
                <Badge variant="secondary" className="text-[10px]">{d.chunkCount} chunks</Badge>
                <Badge variant="secondary" className="text-[10px]">{formatBytes(d.fileSize)}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground">Uploaded: {d.createdAt?.slice(0, 10)}</span>
                <div className="flex items-center gap-2">
                  {d.downloadUrl && (
                    <a
                      href={`/api/download?id=${encodeURIComponent(d.documentId)}`}
                      className="text-[10px] text-primary hover:underline"
                    >
                      Download
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(d.documentId, d.fileName)}
                    disabled={deleting === d.documentId}
                    className="text-[10px] text-destructive hover:underline disabled:opacity-50"
                  >
                    {deleting === d.documentId ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  )
}

"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  const overview = useQuery({ queryKey: ["overview"], queryFn: () => fetch("/api/overview").then(r => r.json()) })
  const docs = useQuery({ queryKey: ["documents"], queryFn: () => fetch("/api/documents").then(r => r.json()) })
  const [q, setQ] = useState("")
  const router = useRouter()

  const o = overview.data

  return (
    <main className="w-full max-w-5xl mx-auto py-8 px-4 animate-in">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">AI Document Hub</h1>
        <p className="text-sm text-muted-foreground mt-1">Snowflake Cortex AI - Search, Extract, Understand</p>
      </div>

      {/* Quick Search */}
      <form
        className="flex gap-2 max-w-xl mx-auto mb-8"
        onSubmit={e => { e.preventDefault(); if (q.trim()) router.push(`/search?q=${encodeURIComponent(q)}`) }}
      >
        <input
          className="flex-1 rounded-md border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Search documents... 搜索文档..."
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        <Button type="submit">Search</Button>
      </form>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Documents", value: o?.totalDocuments ?? "..." },
          { label: "Chunks Indexed", value: o?.totalChunks?.toLocaleString() ?? "..." },
          { label: "Indexed Docs", value: o?.indexedDocuments ?? "..." },
          { label: "Search Service", value: "Active", color: "#10b981" },
        ].map(k => (
          <Card key={k.label} className="glass-card">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{k.label}</p>
              <p className="text-2xl font-bold mt-1" style={{ color: k.color }}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link href="/search">
          <Card className="glass-card h-full">
            <CardContent className="pt-5">
              <p className="text-sm font-semibold text-primary">Semantic Search</p>
              <p className="text-xs text-muted-foreground mt-1">Search across all documents using Cortex Search with relevance scoring</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/documents">
          <Card className="glass-card h-full">
            <CardContent className="pt-5">
              <p className="text-sm font-semibold text-primary">Document Library</p>
              <p className="text-xs text-muted-foreground mt-1">Browse {o?.totalDocuments ?? ""} documents with metadata and chunk details</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/extract">
          <Card className="glass-card h-full">
            <CardContent className="pt-5">
              <p className="text-sm font-semibold text-primary">AI Extract</p>
              <p className="text-xs text-muted-foreground mt-1">Extract structured fields from any text using AI_EXTRACT</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/parse">
          <Card className="glass-card h-full">
            <CardContent className="pt-5">
              <p className="text-sm font-semibold text-primary">Live Parse</p>
              <p className="text-xs text-muted-foreground mt-1">Upload a PDF or image, OCR parse it, then chain AI_EXTRACT</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Documents */}
      <h2 className="text-sm font-semibold mb-3">Recent Documents</h2>
      <div className="space-y-2">
        {docs.isLoading && <p className="text-xs text-muted-foreground">Loading...</p>}
        {docs.data?.slice?.(0, 5)?.map((d: { documentId: string; fileName: string; totalPages: number; chunkCount: number; createdAt: string }) => (
          <Link key={d.documentId} href={`/documents?id=${d.documentId}`}>
            <Card className="glass-card">
              <CardContent className="py-3 px-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{d.fileName}</p>
                  <p className="text-xs text-muted-foreground">{d.totalPages} pages, {d.chunkCount} chunks</p>
                </div>
                <span className="text-[10px] text-muted-foreground">{d.createdAt?.slice(0, 10)}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center mt-10">
        Powered by Snowflake Cortex AI: AI_EXTRACT + PARSE_DOCUMENT + Cortex Search
      </p>
    </main>
  )
}

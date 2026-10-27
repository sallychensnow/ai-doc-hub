"use client"

import { useQuery } from "@tanstack/react-query"
import { useSearchParams, useRouter } from "next/navigation"
import { useState, Suspense } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface SearchResult {
  chunkText: string
  fileName: string
  pageNumber: number
  chunkId: string
  scores: { cosine_similarity: number; text_match: number }
}

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialQ = searchParams.get("q") || ""
  const [input, setInput] = useState(initialQ)
  const [query, setQuery] = useState(initialQ)

  const search = useQuery({
    queryKey: ["search", query],
    queryFn: () => fetch(`/api/search?q=${encodeURIComponent(query)}&limit=10`).then(r => r.json()),
    enabled: !!query,
  })

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (input.trim()) {
      setQuery(input.trim())
      router.replace(`/search?q=${encodeURIComponent(input.trim())}`, { scroll: false })
    }
  }

  return (
    <main className="w-full max-w-4xl mx-auto py-8 px-4 animate-in">
      <h1 className="text-xl font-bold mb-1">Semantic Search</h1>
      <p className="text-xs text-muted-foreground mb-4">Cortex Search across {2981} indexed document chunks</p>

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          className="flex-1 rounded-md border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Search documents... 搜索文档内容..."
          value={input}
          onChange={e => setInput(e.target.value)}
          autoFocus
        />
        <Button type="submit">Search</Button>
      </form>

      {search.isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
          Searching...
        </div>
      )}

      {search.data?.results?.length === 0 && query && !search.isLoading && (
        <p className="text-sm text-muted-foreground">No results found for &quot;{query}&quot;</p>
      )}

      <div className="space-y-3">
        {search.data?.results?.map((r: SearchResult, i: number) => (
          <Card key={r.chunkId || i} className="glass-card">
            <CardContent className="py-4 px-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">{r.fileName}</Badge>
                  {r.pageNumber != null && <span className="text-[10px] text-muted-foreground">p.{r.pageNumber}</span>}
                </div>
                <div className="flex gap-1">
                  {r.scores?.cosine_similarity != null && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">
                      cos: {r.scores.cosine_similarity.toFixed(3)}
                    </span>
                  )}
                  {r.scores?.text_match != null && r.scores.text_match > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-mono">
                      text: {r.scores.text_match.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs leading-relaxed text-card-foreground/90 line-clamp-6 whitespace-pre-wrap">
                {r.chunkText}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {search.data?.results?.length > 0 && (
        <p className="text-xs text-muted-foreground text-center mt-6">
          {search.data.results.length} results for &quot;{query}&quot;
        </p>
      )}
    </main>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading search...</div>}>
      <SearchContent />
    </Suspense>
  )
}

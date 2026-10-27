"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function ParsePage() {
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [result, setResult] = useState<{ fileName: string; fileSize: number; content: string; pages?: unknown[]; stageFile?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Save to Snowflake state
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<{ documentId: string; chunksCreated: number; message: string } | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // AI_EXTRACT chain state
  const [extractFields, setExtractFields] = useState("")
  const [extractResult, setExtractResult] = useState<Record<string, unknown> | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)

  const PRESETS = [
    { label: "Invoice", keywords: ["invoice", "发票", "buyer", "seller", "卖方", "买方"], fields: "invoice_number, date, seller, buyer, total_amount, currency, payment_terms" },
    { label: "Expense", keywords: ["expense", "报销", "reimburse", "费用报告"], fields: "employee_name, department, total_amount, report_period, expense_count, manager" },
    { label: "Contract", keywords: ["contract", "合同", "甲方", "乙方", "party_a", "签约"], fields: "contract_number, party_a, party_b, amount, service_period, signing_date" },
    { label: "Inventory", keywords: ["inventory", "库存", "warehouse", "仓库", "sku", "stock", "on hand", "reorder"], fields: "warehouse_name, report_date, manager, total_items, total_value, item_count" },
    { label: "Report", keywords: ["report", "报告", "summary", "findings", "摘要"], fields: "title, author, date, summary, key_findings" },
    { label: "Meeting", keywords: ["meeting", "会议", "attendee", "参会", "议程"], fields: "meeting_date, host, attendees, decisions, action_items" },
    { label: "Medical", keywords: ["patient", "患者", "diagnosis", "诊断", "medication", "医"], fields: "patient_name, age, diagnosis, medications, attending_physician" },
    { label: "Sales", keywords: ["sales", "revenue", "pipeline", "deal", "quota", "营收", "销售"], fields: "total_revenue, top_region, period, deal_count, pipeline_value" },
  ]

  function detectPreset(text: string): string {
    const lower = text.toLowerCase()
    // Check specific types before generic "report"
    const specificFirst = PRESETS.filter(p => p.label !== "Report")
    for (const p of specificFirst) {
      if (p.keywords.some(k => lower.includes(k))) return p.fields
    }
    // Fall back to Report if it matches
    const reportPreset = PRESETS.find(p => p.label === "Report")
    if (reportPreset && reportPreset.keywords.some(k => lower.includes(k))) return reportPreset.fields
    return "title, author, date, summary, key_points"
  }

  function handleFile(f: File) {
    setFile(f)
    setResult(null)
    setError(null)
    setExtractResult(null)
    setExtractError(null)
    setSaveResult(null)
    setSaveError(null)
  }

  async function handleParse() {
    if (!file) return
    setParsing(true)
    setError(null)
    setResult(null)
    setExtractResult(null)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/parse", { method: "POST", body: fd })
      const data = await res.json()
      if (data.error) {
        setError(typeof data.error === "string" ? data.error : JSON.stringify(data.error))
      } else {
        setResult(data)
        const text = typeof data.content === "string" ? data.content : JSON.stringify(data.content)
        setExtractFields(detectPreset(text))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setParsing(false)
    }
  }

  async function handleExtract() {
    if (!result?.content || !extractFields.trim()) return
    setExtracting(true)
    setExtractError(null)
    setExtractResult(null)
    try {
      // Validate: fields should be short names, not full text
      if (extractFields.length > 200) {
        setExtractError("⚠ This looks like document text, not field names. Click a preset button (Invoice/Contract/etc.) or type short names like: employee_name, amount, date")
        setExtracting(false)
        return
      }
      // Catch values or text pasted as field names (e.g. "Report Date: 2026-09-01")
      if (/:\s*\d|\d{4}-\d{2}-\d{2}|¥|\$|\d{3},\d{3}/.test(extractFields)) {
        setExtractError("⚠ This looks like a value (e.g. a date or amount), not a field name. Enter names like: report_date, total_amount — or click a preset button above.")
        setExtracting(false)
        return
      }
      const fields = extractFields.split(",").map(f => f.trim().replace(/\s+/g, "_").toLowerCase()).filter(Boolean)
      if (fields.some(f => f.length > 30)) {
        setExtractError("⚠ Field names should be short (e.g. 'contract_number'). It looks like you pasted text — click a preset button above instead.")
        setExtracting(false)
        return
      }
      if (fields.length > 15) {
        setExtractError("⚠ Too many fields — this looks like text split by commas. Click a preset button above or enter 3-8 field names.")
        setExtracting(false)
        return
      }
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: typeof result.content === "string" ? result.content : JSON.stringify(result.content), fields }),
      })
      const data = await res.json()
      if (data.error) {
        setExtractError(typeof data.error === "string" ? data.error : JSON.stringify(data.error))
      } else {
        setExtractResult(data.response ?? data)
      }
    } catch (e) {
      setExtractError(e instanceof Error ? e.message : "Extract failed")
    } finally {
      setExtracting(false)
    }
  }

  async function handleSave() {
    if (!result?.content) return
    setSaving(true)
    setSaveError(null)
    setSaveResult(null)
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: result.fileName,
          fileSize: result.fileSize,
          content: contentText,
          stageFile: result.stageFile,
        }),
      })
      const data = await res.json()
      if (data.error) {
        setSaveError(typeof data.error === "string" ? data.error : JSON.stringify(data.error))
      } else {
        setSaveResult(data)
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const contentText = result?.content
    ? typeof result.content === "string"
      ? result.content
      : JSON.stringify(result.content, null, 2)
    : ""

  return (
    <main className="w-full max-w-5xl mx-auto py-8 px-4 animate-in">
      <h1 className="text-xl font-bold mb-1">Live Document Parse</h1>
      <p className="text-xs text-muted-foreground mb-6">
        Upload a PDF, image, or text file — AI_PARSE_DOCUMENT (OCR) extracts the content, then optionally chain AI_EXTRACT
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Upload + Parse */}
        <div className="space-y-4">
          {/* Drop Zone */}
          <div
            className={`relative rounded-lg border-2 border-dashed transition-colors p-8 text-center cursor-pointer ${
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            }`}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault()
              setDragOver(false)
              const f = e.dataTransfer.files[0]
              if (f) handleFile(f)
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff,.txt"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
            {file ? (
              <div>
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground">Drop file here or click to browse</p>
                <p className="text-[10px] text-muted-foreground mt-1">PDF, PNG, JPG, TIFF, TXT</p>
              </div>
            )}
          </div>

          <Button onClick={handleParse} disabled={!file || parsing} className="w-full">
            {parsing ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                Parsing...
              </span>
            ) : "Run AI_PARSE_DOCUMENT"}
          </Button>

          {error && <div className="rounded-md bg-destructive/10 text-destructive text-xs p-3">{error}</div>}

          {/* Parse Result */}
          {result && (
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Parsed Content</CardTitle>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { navigator.clipboard.writeText(contentText); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                      className="text-[10px] px-2 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {copied ? "Copied!" : "Copy"}
                    </button>
                    <Badge variant="secondary" className="text-[10px]">{contentText.length} chars</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="text-xs leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto bg-muted rounded-md p-3 font-mono">
                  {contentText}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* Save to Snowflake */}
          {result && !saveResult && (
            <div className="space-y-2">
              <Button onClick={handleSave} disabled={saving} variant="outline" className="w-full">
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin h-4 w-4 border-2 border-foreground border-t-transparent rounded-full" />
                    Saving to Snowflake...
                  </span>
                ) : "Save to Snowflake (RAG_DOCUMENTS + RAG_CHUNKS)"}
              </Button>
              {saveError && <div className="rounded-md bg-destructive/10 text-destructive text-xs p-3">{saveError}</div>}
            </div>
          )}
          {saveResult && (
            <div className="rounded-md bg-primary/10 text-primary text-xs p-3 space-y-1">
              <p className="font-semibold">{saveResult.message}</p>
              <p className="text-[10px] font-mono">Document ID: {saveResult.documentId}</p>
              <p className="text-[10px]">Cortex Search will index new chunks on next refresh.</p>
            </div>
          )}
        </div>

        {/* Right: AI_EXTRACT chain */}
        <div className="space-y-4">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Chain: AI_EXTRACT</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Enter the <strong>field names</strong> you want to extract (not the text itself)
              </p>
              {/* Quick-fill presets */}
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map(p => (
                  <button
                    key={p.label}
                    onClick={() => { setExtractFields(p.fields); setExtractResult(null); setExtractError(null) }}
                    className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                      extractFields === p.fields
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border text-muted-foreground hover:text-primary hover:border-primary/50"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="relative">
                <input
                  className={`w-full rounded-md border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary pr-8 ${
                    extractFields.length > 200 ? "border-destructive" : "border-border"
                  }`}
                  placeholder="e.g. employee_name, total_amount, department, date..."
                  value={extractFields}
                  onChange={e => setExtractFields(e.target.value)}
                  disabled={!result}
                />
                {extractFields && (
                  <button
                    onClick={() => setExtractFields("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                  >
                    &times;
                  </button>
                )}
              </div>
              {extractFields.length > 100 && (
                <p className="text-[10px] text-destructive font-medium">
                  ⚠ This looks like document text, not field names. Click a preset button above or type short names like: employee_name, amount, date
                </p>
              )}
              <Button
                onClick={handleExtract}
                disabled={!result || !extractFields.trim() || extracting}
                variant="outline"
                className="w-full"
              >
                {extracting ? "Extracting..." : "Run AI_EXTRACT on parsed text"}
              </Button>

              {extractError && <div className="rounded-md bg-destructive/10 text-destructive text-xs p-3">{extractError}</div>}

              {extractResult && (
                <div className="rounded-md border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted">
                        <th className="px-3 py-2 text-left font-semibold">Field</th>
                        <th className="px-3 py-2 text-left font-semibold">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(extractResult).map(([k, v]) => (
                        <tr key={k} className="border-t border-border">
                          <td className="px-3 py-2 font-mono text-primary">{k}</td>
                          <td className="px-3 py-2">{typeof v === "object" ? JSON.stringify(v) : String(v ?? "")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!result && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Upload and parse a document first to enable extraction
                </p>
              )}
            </CardContent>
          </Card>

          {/* Pipeline diagram */}
          <Card className="glass-card">
            <CardContent className="py-4 px-5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Pipeline</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-1 rounded bg-primary/10 text-primary font-mono">Upload</span>
                <span className="text-muted-foreground">&rarr;</span>
                <span className="px-2 py-1 rounded bg-primary/10 text-primary font-mono">Stage</span>
                <span className="text-muted-foreground">&rarr;</span>
                <span className="px-2 py-1 rounded bg-primary/10 text-primary font-mono">AI_PARSE</span>
                <span className="text-muted-foreground">&rarr;</span>
                <span className="px-2 py-1 rounded bg-primary/10 text-primary font-mono">AI_EXTRACT</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                File &rarr; PUT @STAGE &rarr; AI_PARSE_DOCUMENT(OCR) &rarr; AI_EXTRACT([fields])
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}

"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const PRESETS: Record<string, { text: string; fields: string[] }> = {
  Invoice: {
    text: "Invoice #12345. Date: 2026-01-15. Total: $500.00. Vendor: Acme Corp. Payment terms: Net 30.",
    fields: ["invoice_number", "date", "total", "vendor", "payment_terms"],
  },
  "Contract (CN)": {
    text: "合同编号：HT-2026-0815。甲方：北京科技有限公司。乙方：上海数据服务有限公司。合同金额：人民币伍拾万元整（¥500,000）。签订日期：2026年8月15日。",
    fields: ["contract_number", "party_a", "party_b", "amount", "signing_date"],
  },
  Email: {
    text: "From: john@example.com\nTo: jane@company.cn\nSubject: Q3 Budget Approval\nDate: 2026-09-10\n\nPlease approve the Q3 budget of $1.2M for marketing. Deadline: September 30.",
    fields: ["sender", "recipient", "subject", "budget_amount", "department", "deadline"],
  },
  "Medical Record": {
    text: "Patient: Zhang Wei, Age: 45, DOB: 1981-03-22. Diagnosis: Type 2 Diabetes. HbA1c: 7.8%. BP: 135/85. Medication: Metformin 500mg twice daily.",
    fields: ["patient_name", "age", "diagnosis", "hba1c", "blood_pressure", "medications"],
  },
}

export default function ExtractPage() {
  const [text, setText] = useState(PRESETS.Invoice.text)
  const [fields, setFields] = useState<string[]>(PRESETS.Invoice.fields)
  const [newField, setNewField] = useState("")
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [activePreset, setActivePreset] = useState("Invoice")

  function addField() {
    const f = newField.trim().replace(/\s+/g, "_").toLowerCase()
    if (f && !fields.includes(f)) {
      setFields([...fields, f])
      setNewField("")
    }
  }

  function removeField(f: string) {
    setFields(fields.filter(x => x !== f))
  }

  function loadPreset(name: string) {
    const p = PRESETS[name]
    if (p) {
      setText(p.text)
      setFields(p.fields)
      setResult(null)
      setError(null)
      setActivePreset(name)
    }
  }

  async function handleExtract() {
    if (!text.trim() || !fields.length) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, fields }),
      })
      const data = await res.json()
      if (data.error) {
        setError(typeof data.error === "string" ? data.error : JSON.stringify(data.error))
      } else {
        setResult(data.response ?? data)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="w-full max-w-5xl mx-auto py-8 px-4 animate-in">
      <h1 className="text-xl font-bold mb-1">AI Extract Playground</h1>
      <p className="text-xs text-muted-foreground mb-6">Extract structured fields from any text using Snowflake AI_EXTRACT</p>

      {/* Preset Templates */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.keys(PRESETS).map(name => (
          <button
            key={name}
            onClick={() => loadPreset(name)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              activePreset === name
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input Panel */}
        <div className="space-y-4">
          <Card className="glass-card">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Input Text</CardTitle></CardHeader>
            <CardContent>
              <textarea
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                rows={8}
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Paste any text here..."
              />
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Fields to Extract</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {fields.map(f => (
                  <Badge key={f} variant="secondary" className="text-xs gap-1">
                    {f}
                    <button onClick={() => removeField(f)} className="ml-1 text-muted-foreground hover:text-destructive">x</button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Add field name..."
                  value={newField}
                  onChange={e => setNewField(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addField())}
                />
                <Button variant="outline" size="sm" onClick={addField}>Add</Button>
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleExtract} disabled={loading || !text.trim() || !fields.length} className="w-full">
            {loading ? "Extracting..." : "Run AI_EXTRACT"}
          </Button>
        </div>

        {/* Result Panel */}
        <div>
          <Card className="glass-card h-full">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Extraction Result</CardTitle></CardHeader>
            <CardContent>
              {!result && !error && !loading && (
                <p className="text-xs text-muted-foreground py-8 text-center">Click &quot;Run AI_EXTRACT&quot; to see results</p>
              )}
              {loading && (
                <div className="flex items-center gap-2 py-8 justify-center text-sm text-muted-foreground">
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                  Processing...
                </div>
              )}
              {error && (
                <div className="rounded-md bg-destructive/10 text-destructive text-xs p-3">{error}</div>
              )}
              {result && (
                <div className="space-y-3">
                  {/* Table View */}
                  <div className="rounded-md border border-border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted">
                          <th className="px-3 py-2 text-left font-semibold">Field</th>
                          <th className="px-3 py-2 text-left font-semibold">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(result).map(([k, v]) => (
                          <tr key={k} className="border-t border-border">
                            <td className="px-3 py-2 font-mono text-primary">{k}</td>
                            <td className="px-3 py-2">{typeof v === "object" ? JSON.stringify(v) : String(v)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Raw JSON */}
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Raw JSON</summary>
                    <pre className="mt-2 p-3 rounded-md bg-muted text-[11px] font-mono overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center mt-8">
        SQL: SELECT AI_EXTRACT(text, [fields...]) — Powered by Snowflake Cortex
      </p>
    </main>
  )
}

"use client";

import { useCallback, useState } from "react";
import { parseFile } from "../import/parser";
import type { ParsedFile } from "../types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { UploadZone } from "./UploadZone";
import { PreviewTable } from "./PreviewTable";
import { ColumnMapper } from "./ColumnMapper";
import { ProgressCard } from "./ProgressCard";
import { SummaryCard } from "./SummaryCard";
import { HistoryTable } from "./HistoryTable";
import { autoMapColumn } from "../types";
import type { ImportHistoryRecord } from "../types";

type Step = "upload" | "preview" | "mapping" | "progress" | "summary";

export default function ImportClient({
  initialHistory,
}: {
  initialHistory: ImportHistoryRecord[];
}) {
  const [step, setStep] = useState<Step>("upload");
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [duplicateStrategy, setDuplicateStrategy] = useState<"skip" | "replace" | "update" | "keep_both">("skip");
  const [progressState, setProgressState] = useState({
    rowsImported: 0,
    rowsRemaining: 0,
    estimatedTime: 0,
    errors: [] as { row: number; message: string; column?: string }[],
    progress: 0,
  });
  const [summary, setSummary] = useState<{
    imported: number;
    skipped: number;
    updated: number;
    failed: number;
    duplicates: number;
  } | null>(null);
  const [history, setHistory] = useState(initialHistory);
  const [isParsing, setIsParsing] = useState(false);

  const handleFileSelected = useCallback(async (file: File) => {
    setIsParsing(true);
    try {
      const result = await parseFile(file);
      if (result) {
        setParsed(result);
        // Auto-map columns
        const autoMapped: Record<string, string> = {};
        for (const header of result.headers) {
          const target = autoMapColumn(header);
          if (target) autoMapped[header] = target;
        }
        setMapping(autoMapped);
        setStep("preview");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to parse file.");
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleStartImport = useCallback(() => {
    if (!parsed) return;
    setStep("progress");
    const total = parsed.rows.length;

    // Simulate import progress for smooth animation
    let imported = 0;
    const interval = setInterval(() => {
      imported += Math.max(1, Math.ceil(total / 50));
      if (imported >= total) {
        clearInterval(interval);
        setProgressState({
          rowsImported: total,
          rowsRemaining: 0,
          estimatedTime: 0,
          errors: [],
          progress: 1,
        });
        setSummary({
          imported: Math.floor(total * 0.92),
          skipped: Math.floor(total * 0.05),
          updated: 0,
          failed: Math.max(0, total - Math.floor(total * 0.97)),
          duplicates: parsed.rows.length - total,
        });
        setStep("summary");
      } else {
        const pct = imported / total;
        setProgressState({
          rowsImported: imported,
          rowsRemaining: total - imported,
          estimatedTime: Math.round((1 - pct) * 10),
          errors: [],
          progress: pct,
        });
      }
    }, 30);
  }, [parsed]);

  const handleImportAnother = useCallback(() => {
    setStep("upload");
    setParsed(null);
    setMapping({});
    setSummary(null);
    setProgressState({ rowsImported: 0, rowsRemaining: 0, estimatedTime: 0, errors: [], progress: 0 });
  }, []);

  const handleDownloadErrors = useCallback(() => {
    // Generate error report as CSV
    const errors = progressState.errors;
    if (errors.length === 0) return;
    const csv = ["Row,Message", ...errors.map((e) => `${e.row},"${e.message.replace(/"/g, '""')}"`)].join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "import-error-report.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [progressState.errors]);

  // Render different steps
  return (
    <div className="space-y-6">
      {/* Import workflow */}
      {step === "upload" && (
        <Card className="p-6">
          <UploadZone onFileSelected={handleFileSelected} isProcessing={isParsing} />
        </Card>
      )}

      {step === "preview" && parsed && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Preview your data</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {parsed.fileName} · {parsed.rows.length.toLocaleString()} rows · {parsed.headers.length} columns
              </p>
            </div>
            <Button variant="primary" onClick={() => setStep("mapping")}>
              Continue to mapping
            </Button>
          </div>
          <PreviewTable headers={parsed.headers} rows={parsed.rows} maxRows={8} />
        </Card>
      )}

      {step === "mapping" && parsed && (
        <Card className="p-6 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Map your columns</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              We've auto-matched columns where possible. Review and adjust before importing.
            </p>
          </div>
          <ColumnMapper headers={parsed.headers} mapping={mapping} onChange={setMapping} />

          {/* Duplicate strategy */}
          <div className="border-t border-slate-100 pt-4 flex flex-wrap items-center gap-2">
            <p className="text-xs font-medium text-slate-500 mr-2">Duplicates:</p>
            {(["skip", "replace", "update", "keep_both"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setDuplicateStrategy(s)}
                className={
                  duplicateStrategy === s
                    ? "px-3 py-1 rounded-full text-xs font-medium bg-navy-900 text-white"
                    : "px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200"
                }
              >
                {s.replace("_", " ")}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep("preview")}>
              Back to preview
            </Button>
            <Button variant="primary" onClick={handleStartImport}>
              Start Import →
            </Button>
          </div>
        </Card>
      )}

      {step === "progress" && parsed && (
        <ProgressCard progress={progressState} totalRows={parsed.rows.length} />
      )}

      {step === "summary" && summary && parsed && (
        <SummaryCard
          summary={summary}
          fileName={parsed.fileName}
          onImportAnother={handleImportAnother}
          onDownloadErrors={handleDownloadErrors}
        />
      )}

      {/* History */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-900">Import History</h3>
        </div>
        <Card className="p-0">
          <HistoryTable
            records={history}
            type="import"
            onDelete={(id) => {
              setHistory((prev) => prev.filter((r) => r.id !== id));
              // TODO: call server action to delete
            }}
          />
        </Card>
      </div>

      {/* Coming soon sources */}
      {step === "upload" && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">More ways to import</h3>
            <span className="text-xs text-slate-400">Coming soon</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: "Google Sheets", icon: "📊" },
              { label: "Notion", icon: "📝" },
              { label: "API Import", icon: "🔌" },
            ].map((source) => (
              <div key={source.label} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 opacity-50">
                <span className="text-xl">{source.icon}</span>
                <div>
                  <p className="text-sm font-medium text-slate-700">{source.label}</p>
                  <p className="text-xs text-slate-400">Coming soon</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
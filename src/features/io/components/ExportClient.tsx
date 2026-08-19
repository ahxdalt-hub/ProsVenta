"use client";

import { useCallback, useState } from "react";
import { exportProspects } from "../export/generator";
import type {
  ExportFormat,
  ExportScope,
  ExportProgress,
  ExportHistoryRecord,
} from "../types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { HistoryTable } from "./HistoryTable";
import { cn } from "@/lib/utils";
import type { Prospect } from "@/types/database";

interface ExportClientProps {
  prospects: Prospect[];
  initialHistory: ExportHistoryRecord[];
  organizationName?: string | null;
}

const FORMATS: { value: ExportFormat; label: string; description: string; icon: string }[] = [
  { value: "csv", label: "CSV", description: "Universal spreadsheet format", icon: "📄" },
  { value: "xlsx", label: "Excel", description: "Formatted spreadsheet workbook", icon: "📊" },
  { value: "pdf", label: "PDF", description: "Print-ready report document", icon: "📕" },
];

const SCOPES: Omit<{ value: ExportScope; label: string; description: string }, "description">[] = [
  { value: "all", label: "All Prospects" },
  { value: "favorites", label: "Favorites" },
  { value: "filtered", label: "Filtered Results" },
  { value: "saved_view", label: "Saved Views" },
  { value: "selected", label: "Selected Rows" },
];

export default function ExportClient({ prospects, initialHistory, organizationName }: ExportClientProps) {
  const scopes = SCOPES.map((s) => ({
    ...s,
    description:
      s.value === "all"
        ? `Export all ${prospects.length} prospects`
        : s.value === "favorites"
        ? "Export favorited prospects only"
        : s.value === "filtered"
        ? "Export currently filtered view"
        : s.value === "saved_view"
        ? "Export from a saved view"
        : "Export manually selected rows",
  }));
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [scope, setScope] = useState<ExportScope>("all");
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [history, setHistory] = useState(initialHistory);

  const handleExport = useCallback(async () => {
    if (prospects.length === 0 || isExporting) return;
    setIsExporting(true);
    setProgress({ stage: "preparing", progress: 0, message: "Preparing export…" });

    try {
      await exportProspects(
        prospects,
        format,
        scope,
        (p) => setProgress(p),
        organizationName
      );

      // Add to history
      const record: ExportHistoryRecord = {
        id: `export-${Date.now()}`,
        organization_id: "",
        created_by: "",
        file_name: `prosventa-${scope}-${new Date().toISOString().slice(0, 10)}.${format === "xlsx" ? "xlsx" : format === "pdf" ? "pdf" : "csv"}`,
        format,
        status: "completed",
        scope,
        saved_view_id: null,
        total_rows: prospects.length,
        duration_ms: null,
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      };
      setHistory((prev) => [record, ...prev]);
    } catch {
      setProgress({ stage: "download_ready", progress: 1, message: "Export failed. Please try again." });
    } finally {
      setIsExporting(false);
    }
  }, [prospects, format, scope, isExporting, organizationName]);

  return (
    <div className="space-y-6">
      {/* Format selection */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-slate-900">Export format</h3>
        <p className="mt-0.5 text-xs text-slate-500">Choose how you want to receive your data.</p>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {FORMATS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFormat(f.value)}
              className={cn(
                "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all duration-150",
                format === f.value
                  ? "border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <span className="text-xl">{f.icon}</span>
              <div>
                <p className="text-sm font-semibold text-slate-900">{f.label}</p>
                <p className="mt-0.5 text-xs text-slate-500">{f.description}</p>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Scope selection */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-slate-900">What to export</h3>
        <p className="mt-0.5 text-xs text-slate-500">Select the data range for this export.</p>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {scopes.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setScope(s.value)}
              className={cn(
                "rounded-xl border p-4 text-left transition-all duration-150",
                scope === s.value
                  ? "border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <p className="text-sm font-semibold text-slate-900">{s.label}</p>
              <p className="mt-0.5 text-xs text-slate-500">{s.description}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Export progress */}
      {progress && (
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-slate-900">{progress.message}</h4>
                <span className="text-sm font-bold text-slate-900">
                  {Math.round(progress.progress * 100)}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300 ease-out",
                    progress.stage === "download_ready"
                      ? "bg-green-500"
                      : "bg-gradient-to-r from-blue-500 to-navy-700"
                  )}
                  style={{ width: `${progress.progress * 100}%` }}
                />
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                {progress.stage === "preparing" && (
                  <>
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    Preparing data…
                  </>
                )}
                {progress.stage === "generating" && (
                  <>
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    Generating file…
                  </>
                )}
                {progress.stage === "download_ready" && (
                  <span className="inline-flex items-center gap-1.5 text-green-600">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Ready to download
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Export button */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {prospects.length.toLocaleString()} prospects will be exported
          {format === "pdf" && " (limited to 100 rows in PDF)"}
        </p>
        <Button
          variant="primary"
          size="lg"
          onClick={handleExport}
          loading={isExporting}
          disabled={prospects.length === 0}
        >
          Export {format.toUpperCase()}
        </Button>
      </div>

      {/* Coming soon integrations */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-900">Sync to other tools</h3>
          <span className="text-xs text-slate-400">Coming soon</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "Google Sheets", icon: "📊" },
            { label: "Notion", icon: "📝" },
            { label: "CRM Sync", icon: "💼" },
          ].map((sync) => (
            <div key={sync.label} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 opacity-50">
              <span className="text-xl">{sync.icon}</span>
              <div>
                <p className="text-sm font-medium text-slate-700">{sync.label}</p>
                <p className="text-xs text-slate-400">Coming soon</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Export history */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-900">Export History</h3>
        </div>
        <Card className="p-0">
          <HistoryTable
            records={history}
            type="export"
            onDownload={(record) => {
              // Re-export with the same format and scope
              setFormat(record.format as ExportFormat);
              setScope(record.scope as ExportScope);
              handleExport();
            }}
            onDelete={(id) => {
              setHistory((prev) => prev.filter((r) => r.id !== id));
            }}
          />
        </Card>
      </div>
    </div>
  );
}
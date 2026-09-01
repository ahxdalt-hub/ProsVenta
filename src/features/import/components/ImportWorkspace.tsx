"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { ParsedFile, ImportHistoryRecord } from "@/features/io/types";
import type { ImportProspectsResult } from "@/features/io/actions";
import type { SavedList } from "@/types/database";
import { UploadZone } from "./UploadZone";
import { FilePreviewCard, FilePreviewSkeleton } from "./FilePreviewCard";
import { StepIndicator } from "./StepIndicator";
import { MappingStep } from "./MappingStep";
import { ReviewStep } from "./ReviewStep";
import type { ReviewData, ProspectCapacity } from "./ReviewStep";
import { ProgressStep } from "./ProgressStep";
import { ResultsStep } from "./ResultsStep";
import { HistoryStrip } from "./HistoryStrip";
import { SaveToListDialog } from "@/features/prospects/components/SaveToListDialog";
import { autoMapImportColumn } from "../types";
import type { ImportStep } from "../types";

interface ImportWorkspaceProps {
  initialHistory: ImportHistoryRecord[];
  savedLists: SavedList[];
  capacity: ProspectCapacity | null;
}

export default function ImportWorkspace({
  initialHistory,
  savedLists,
  capacity,
}: ImportWorkspaceProps) {
  const router = useRouter();
  const [step, setStep] = useState<ImportStep>("upload");
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [review, setReview] = useState<ReviewData | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportProspectsResult | null>(null);
  const [showSaveToList, setShowSaveToList] = useState(false);

  const reset = useCallback(() => {
    setParsed(null);
    setMapping({});
    setReview(null);
    setReviewError(null);
    setResult(null);
    setParseError(null);
    setShowSaveToList(false);
    setStep("upload");
  }, []);

  const goToReview = useCallback(() => setStep("review"), []);

  const handleFileSelected = useCallback(async (file: File) => {
    setParseError(null);
    setIsParsing(true);
    try {
      // Dynamic import keeps the large spreadsheet parser out of the initial
      // bundle — it loads only when the user actually uploads a file.
      const { parseFile } = await import("@/features/io/import/parser");
      const data = await parseFile(file);
      if (!data) {
        setParseError("We couldn't read this file. Please try another one.");
        return;
      }
      setParsed(data);
      const autoMapped: Record<string, string> = {};
      for (const header of data.headers) {
        const target = autoMapImportColumn(header);
        if (target) autoMapped[header] = target;
      }
      setMapping(autoMapped);
      setReview(null);
      setReviewError(null);
      setResult(null);
      setStep("upload");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      // Never surface parser stack traces / internals.
      setParseError(
        message && message.toLowerCase().includes("file")
          ? message
          : "This file doesn't contain a usable prospect table."
      );
    } finally {
      setIsParsing(false);
    }
  }, []);

  // Run server-side validation once the user reaches the Review step.
  useEffect(() => {
    if (step !== "review" || !parsed || review) return;
    let cancelled = false;
    setIsValidating(true);
    setReviewError(null);
    import("@/features/io/actions")
      .then(({ validateImportRowsAction }) =>
        validateImportRowsAction({ rows: parsed.rows, mapping })
      )
      .then((res) => {
        if (cancelled) return;
        if (res.error) {
          setReviewError(res.error);
          setReview(null);
        } else {
          setReview({ valid: res.valid, invalid: res.invalid });
        }
      })
      .catch(() => {
        if (cancelled) return;
        setReviewError("We couldn't validate this import. Please try again.");
        setReview(null);
      })
      .finally(() => {
        if (!cancelled) setIsValidating(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, parsed]);

  const handleImport = useCallback(async () => {
    if (!parsed) return;
    setIsImporting(true);
    setReviewError(null);
    setStep("progress");
    try {
      const { importProspectsAction } = await import("@/features/io/actions");
      const res = await importProspectsAction({
        rows: parsed.rows,
        mapping,
        fileName: parsed.fileName,
        fileSize: parsed.fileSize,
        fileType: parsed.fileType,
        duplicateStrategy: "skip",
      });
      setResult(res);
      // Refresh server-rendered history, capacity and lists in the background.
      router.refresh();
      setStep("results");
    } catch {
      setResult({
        error: "An unexpected error occurred during import. Please try again.",
      });
      setStep("results");
    } finally {
      setIsImporting(false);
    }
  }, [parsed, mapping, router]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <StepIndicator current={step} />

      <AnimatePresence mode="wait">
        <motion.div
          key={step + (parsed?.fileName ?? "")}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        >
          {step === "upload" && (
            <div className="space-y-5">
              {parseError && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {parseError}
                </div>
              )}

              {!parsed ? (
                <div className="space-y-5">
                  <div className="premium-card p-5">
                    <h2 className="text-sm font-semibold text-slate-900">
                      Add your prospect file
                    </h2>
                    <p className="mt-0.5 max-w-xl text-xs text-slate-500">
                      Upload a <span className="font-medium text-slate-700">CSV</span> or{" "}
                      <span className="font-medium text-slate-700">Excel</span> (.xlsx / .xls)
                      file with your prospect data. We&apos;ll help you review and map it before
                      anything is added to your workspace.
                    </p>
                  </div>
                  {isParsing ? (
                    <FilePreviewSkeleton />
                  ) : (
                    <UploadZone onFileSelected={handleFileSelected} />
                  )}
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                      <span className="font-medium text-slate-700">Company</span> is the only
                      required column.
                    </span>
                    <span className="text-slate-300" aria-hidden="true">·</span>
                    <span>Max 10MB — columns are matched automatically, and you confirm the mapping.</span>
                  </div>
                </div>
              ) : (
                <FilePreviewCard
                  parsed={parsed}
                  mapping={mapping}
                  onContinue={() => setStep("mapping")}
                  onChooseAnother={reset}
                />
              )}
            </div>
          )}

          {step === "mapping" && parsed && (
            <MappingStep
              parsed={parsed}
              mapping={mapping}
              onChange={setMapping}
              onBack={() => setStep("upload")}
              onContinue={goToReview}
            />
          )}

          {step === "review" && parsed && (
            <ReviewStep
              parsed={parsed}
              review={review}
              reviewError={reviewError}
              capacity={capacity}
              isImporting={isImporting || isValidating}
              onBack={() => setStep("mapping")}
              onImport={handleImport}
            />
          )}

          {step === "progress" && parsed && (
            <ProgressStep fileName={parsed.fileName} rowCount={parsed.rows.length} />
          )}

          {step === "results" && parsed && result && (
            <ResultsStep
              parsedFileName={parsed.fileName}
              parsedDuplicates={parsed.duplicateCount ?? 0}
              result={result}
              onImportAnother={reset}
              onAddToList={() => setShowSaveToList(true)}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Secondary control so a valid file is never lost on a wrong click. */}
      {parsed && step !== "upload" && step !== "results" && (
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={reset}
            disabled={isImporting}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-slate-600 disabled:opacity-50"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Start over from the top
          </button>
        </div>
      )}

      <SaveToListDialog
        open={showSaveToList}
        onClose={() => setShowSaveToList(false)}
        prospectIds={result?.summary?.ids ?? []}
        savedLists={savedLists}
        onComplete={() => setShowSaveToList(false)}
      />

      {initialHistory.length > 0 && <HistoryStrip records={initialHistory} />}
    </div>
  );
}
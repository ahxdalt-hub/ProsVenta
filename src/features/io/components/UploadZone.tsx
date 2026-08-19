"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/Spinner";

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
  isProcessing?: boolean;
  className?: string;
}

const ACCEPTED_TYPES = ".csv,.xlsx,.xls";

export function UploadZone({ onFileSelected, isProcessing, className }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const processFile = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["csv", "xlsx", "xls"].includes(ext)) {
      setError("Unsupported file format. Please upload a CSV or Excel (.xlsx) file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File is too large. Maximum size is 10MB.");
      return;
    }
    setError(null);
    onFileSelected(file);
  };

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-200 p-10 text-center w-full cursor-pointer",
        isDragging
          ? "border-blue-500 bg-blue-50/50 scale-[1.01]"
          : "border-slate-300 bg-slate-50/50 hover:border-slate-400 hover:bg-slate-50",
        error && "border-red-300 bg-red-50/50",
        isProcessing && "opacity-60 pointer-events-none",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      aria-label="Upload a CSV or Excel file"
      onClick={() => !isProcessing && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processFile(file);
        }}
      />

      <div
        className={cn(
          "flex items-center justify-center w-14 h-14 rounded-2xl mb-4 transition-all duration-200",
          isDragging ? "bg-blue-100 text-blue-600 scale-110" : "bg-slate-100 text-slate-500"
        )}
      >
        {isProcessing ? (
          <Spinner size="md" />
        ) : (
          <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        )}
      </div>

      <h3 className="text-sm font-semibold text-slate-900">
        {isProcessing ? "Processing file…" : isDragging ? "Drop your file here" : "Drag & drop your file"}
      </h3>
      <p className="mt-1 text-xs text-slate-500">
        or <span className="font-medium text-blue-600">browse files</span> — CSV or Excel (.xlsx) up to 10MB
      </p>

      {error && (
        <p className="mt-3 text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      )}

      <p className="mt-4 text-[11px] text-slate-400">
        Your data is processed securely. Files are never shared.
      </p>
    </div>
  );
}
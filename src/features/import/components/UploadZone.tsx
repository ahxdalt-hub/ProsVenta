"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
  isProcessing?: boolean;
  className?: string;
}

const ACCEPT = ".csv,.xlsx,.xls";

const UPLOAD_ICON = (
  <svg
    className="h-7 w-7"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

/**
 * Accessible drag-and-drop file picker.
 * Supports drag-enter / drag-over / drop, click to select, and keyboard access.
 * Only CSV and Excel (.xlsx / .xls) are accepted — the formats the backend
 * parser actually reads.
 */
export function UploadZone({ onFileSelected, isProcessing, className }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    (file: File) => {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!["csv", "xlsx", "xls"].includes(ext)) {
        setError("Unsupported file type. Please upload a CSV or Excel file.");
        return;
      }
      if (file.size === 0) {
        setError("This file is empty. Please choose a file with some data.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("This file is larger than 10MB. Please choose a smaller file.");
        return;
      }
      setError(null);
      onFileSelected(file);
    },
    [onFileSelected]
  );

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
    [processFile]
  );

  const openPicker = useCallback(() => {
    if (!isProcessing) inputRef.current?.click();
  }, [isProcessing]);

  return (
    <div
      className={cn(
        "relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200",
        isDragging
          ? "border-blue-500 bg-brand-50/60 scale-[1.01]"
          : "border-slate-300 bg-slate-50/50 hover:border-slate-400 hover:bg-slate-50",
        error && "border-red-300 bg-red-50/50",
        isProcessing && "pointer-events-none opacity-60",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      aria-label="Upload a CSV or Excel file"
      onClick={openPicker}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openPicker();
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processFile(file);
          e.target.value = "";
        }}
      />

      <div
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-200",
          isDragging
            ? "bg-blue-100 text-blue-600 scale-110"
            : "bg-slate-100 text-slate-500"
        )}
      >
        {UPLOAD_ICON}
      </div>

      <h3 className="mt-4 text-sm font-semibold text-slate-900">
        {isDragging ? "Drop your file here" : "Drag & drop a file"}
      </h3>
      <p className="mt-1 text-xs text-slate-500">
        or{" "}
        <span className="font-medium text-blue-600">browse from your computer</span>{" "}
        — CSV or Excel, up to 10MB
      </p>

      {error && (
        <p role="alert" className="mt-3 text-xs font-medium text-red-600">
          {error}
        </p>
      )}

      <p className="mt-4 text-[11px] text-slate-400">
        Your data stays in Prosventa and is never shared.
      </p>
    </div>
  );
}
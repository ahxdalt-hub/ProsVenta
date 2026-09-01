"use client";

import { Spinner } from "@/components/ui/Spinner";

export function ProgressStep({ fileName, rowCount }: { fileName: string; rowCount: number }) {
  return (
    <div className="premium-card flex flex-col items-center justify-center p-10 text-center">
      <Spinner size="lg" />
      <h2 className="mt-5 text-base font-semibold text-slate-900">Importing prospects…</h2>
      <p className="mt-1 text-sm text-slate-500">
        Processing <span className="font-medium text-slate-700">{rowCount.toLocaleString()}</span> rows
        from <span className="font-medium text-slate-700">{fileName}</span>.
      </p>
      <p className="mt-2 text-xs text-slate-400">Please keep this window open. This can take a moment.</p>
    </div>
  );
}
import { Suspense } from "react";
import { getImportHistory } from "@/lib/db/io";
import { ImportClient } from "@/features/io";

export default async function ImportPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading import center…</div>}>
      <ImportContent />
    </Suspense>
  );
}

async function ImportContent() {
  const history = await getImportHistory();

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900">Import Center</h1>
        <p className="mt-1 text-sm text-slate-500">
          Import prospects from CSV or Excel files with confidence.
        </p>
      </div>
      <ImportClient initialHistory={history} />
    </div>
  );
}
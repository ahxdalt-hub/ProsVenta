import { Suspense } from "react";
import { getExportHistory } from "@/lib/db/io";
import { getProspects } from "@/lib/db/prospects";
import { getOrganizationDetails } from "@/lib/db/organizations";
import { ExportClient } from "@/features/io";

export default async function ExportPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading export center…</div>}>
      <ExportContent />
    </Suspense>
  );
}

async function ExportContent() {
  const [history, prospects, org] = await Promise.all([
    getExportHistory(),
    getProspects(),
    getOrganizationDetails(),
  ]);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900">Export Center</h1>
        <p className="mt-1 text-sm text-slate-500">
          Export your prospect data in the format you need.
        </p>
      </div>
      <ExportClient
        prospects={prospects}
        initialHistory={history}
        organizationName={org?.organization?.name ?? null}
      />
    </div>
  );
}
import { Suspense } from "react";
import ImportWorkspace from "@/features/import/components/ImportWorkspace";
import { getImportHistory } from "@/lib/db/io";
import { getSavedLists } from "@/lib/db/lists";
import { ensureOrganization } from "@/lib/db/organizations";
import { EntitlementService } from "@/features/plans/service";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Import Prospects - Prosventa",
};

function PageSkeleton() {
  return (
    <div className="w-full space-y-6 p-6 lg:p-8">
      <div>
        <div className="premium-skeleton h-7 w-48" aria-hidden="true" />
        <div className="premium-skeleton mt-2 h-4 w-96 max-w-full" aria-hidden="true" />
      </div>
      <div className="premium-skeleton h-20 w-full rounded-xl" aria-hidden="true" />
      <div className="premium-card h-64 rounded-2xl border border-dashed p-8">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-slate-100" aria-hidden="true" />
        <div className="premium-skeleton mx-auto mt-4 h-4 w-48" aria-hidden="true" />
        <div className="premium-skeleton mx-auto mt-2 h-3 w-64" aria-hidden="true" />
      </div>
    </div>
  );
}

export default async function ImportPage() {
  await ensureOrganization();

  const [history, savedLists, capacity] = await Promise.all([
    getImportHistory().catch(() => []),
    getSavedLists().catch(() => []),
    resolveCapacity(),
  ]);

  return (
    <section className="dashboard-enter w-full p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Import Prospects</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Bring prospect data into Prosventa, review it, and add it to your workspace.
        </p>
      </div>

      <Suspense fallback={<PageSkeleton />}>
        <ImportWorkspace
          initialHistory={history}
          savedLists={savedLists}
          capacity={capacity}
        />
      </Suspense>
    </section>
  );
}

async function resolveCapacity() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();
    if (!membership) return null;
    const decision = await EntitlementService.checkLimit(
      membership.organization_id,
      "max_prospects"
    );
    return {
      limitValue: decision.limitValue,
      currentUsage: decision.currentUsage,
      remaining: decision.remaining,
    };
  } catch {
    // Never block the page on entitlement resolution hiccups.
    return null;
  }
}
// ============================================================================
// Prosventa Saved Lists — List detail workspace page (Phase 2 rebuild)
// ============================================================================
// Server shell: loads the list + its real members (with embedded ICP scores,
// one query each) through RLS-scoped lib/db functions. Wrapped in the
// IntelligenceActionHostProvider so row/bulk Enrich & Research reuse the
// EXISTING single action-window system. An unknown id (another org's list or
// a deleted list) renders a not-found state — RLS simply returns no rows.
// ============================================================================

import { Suspense } from "react";
import Link from "next/link";
import { ensureOrganization } from "@/lib/db/organizations";
import { getSavedListMembers, getSavedLists } from "@/lib/db/lists";
import { ListDetailWorkspace } from "@/features/prospects/components/saved-lists/ListDetailWorkspace";
import { IntelligenceActionHostProvider } from "@/features/intelligence/action-window";
import type { SavedList } from "@/types/database";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `List - Prosventa (${id.slice(0, 8)})` };
}

export default async function DashboardSavedListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await ensureOrganization();

  let list: SavedList | null = null;
  let members: Awaited<ReturnType<typeof getSavedListMembers>>["prospects"] = [];
  let allLists: Awaited<ReturnType<typeof getSavedLists>> = [];

  try {
    const [membersResult, lists] = await Promise.all([
      getSavedListMembers(id),
      getSavedLists(),
    ]);
    list = membersResult.list;
    members = membersResult.prospects;
    allLists = lists;
  } catch {
    list = null;
  }

  // Not found / other organization's list (RLS) → useful fallback, no crash.
  if (!list) {
    return (
      <section className="dashboard-enter flex flex-1 items-center justify-center p-6 lg:p-8">
        <div className="premium-card max-w-md px-8 py-10 text-center">
          <h1 className="text-lg font-semibold text-slate-900">List not found</h1>
          <p className="mt-2 text-sm text-slate-500">
            This list doesn&apos;t exist or you don&apos;t have access to it.
          </p>
          <Link
            href="/dashboard/saved-lists"
            className="mt-5 inline-flex items-center justify-center rounded-lg bg-navy-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-800"
          >
            Back to Saved Lists
          </Link>
        </div>
      </section>
    );
  }

  return (
    <Suspense fallback={<div className="p-6 lg:p-8" />}>
      <IntelligenceActionHostProvider>
        <ListDetailWorkspace list={list} members={members} allLists={allLists} />
      </IntelligenceActionHostProvider>
    </Suspense>
  );
}

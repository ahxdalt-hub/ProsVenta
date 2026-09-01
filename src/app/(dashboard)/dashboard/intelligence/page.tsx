// ============================================================================
// Prosventa Intelligence — Main Workspace Page
// ============================================================================
// Core Intelligence experience (Phase 1 of 3):
//   1. What is important right now?        → Priority Intelligence
//   2. What has Prosventa discovered?      → Signals
//   3. What intelligence activity happened?→ Recent activity
//   4. What can I act on?                  → Action triggers (Phase 2 windows)
//
// Loading architecture:
//   • The shell (header, status, section structure, icons, action controls)
//     renders immediately.
//   • Every dynamic area is an independent async Server Component inside its
//     own Suspense boundary → parallel loading, no request waterfalls, and
//     per-section error isolation (one failed source never breaks the page).
// ============================================================================

import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { ensureOrganization } from "@/lib/db/organizations";

import { IntelligenceStatus } from "@/features/intelligence/workspace/components/IntelligenceStatus";
import {
  IntelligenceSummary,
  IntelligenceSummaryFallback,
} from "@/features/intelligence/workspace/components/IntelligenceSummary";
import {
  PriorityIntelligence,
  PriorityIntelligenceFallback,
} from "@/features/intelligence/workspace/components/PriorityIntelligence";
import {
  SignalsSection,
  SignalsSectionFallback,
} from "@/features/intelligence/workspace/components/SignalsSection";
import {
  RecentActivity,
  RecentActivityFallback,
} from "@/features/intelligence/workspace/components/RecentActivity";
import { CreditUsage, CreditUsageFallback } from "@/features/intelligence/workspace/components/CreditUsage";
import { IntelligenceActions } from "@/features/intelligence/workspace/components/IntelligenceActions";
import { IntelligenceActionHostProvider } from "@/features/intelligence/action-window";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Intelligence — Prosventa",
};

export default async function IntelligencePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  await ensureOrganization();

  return (
    <IntelligenceActionHostProvider>
      <div className="mx-auto max-w-6xl space-y-8">
      {/* ---------------------------------------------------------------- */}
      {/* Header + status + actions — static shell, renders instantly      */}
      {/* ---------------------------------------------------------------- */}
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Intelligence
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
            See the important changes, signals, research, and intelligence
            Prosventa has discovered across your workspace.
          </p>
          <Suspense fallback={null}>
            <div className="mt-3">
              <IntelligenceStatus />
            </div>
          </Suspense>
        </div>
        <div className="shrink-0">
          <IntelligenceActions />
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* Summary numbers — load independently, skeleton first             */}
      {/* ---------------------------------------------------------------- */}
      <Suspense fallback={<IntelligenceSummaryFallback />}>
        <IntelligenceSummary />
      </Suspense>

      {/* ---------------------------------------------------------------- */}
      {/* Priority intelligence — the most important section               */}
      {/* ---------------------------------------------------------------- */}
      <Suspense fallback={<PriorityIntelligenceFallback />}>
        <PriorityIntelligence />
      </Suspense>

      {/* ---------------------------------------------------------------- */}
      {/* Signals + Recent activity — two independent streams              */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Suspense fallback={<SignalsSectionFallback />}>
          <div className="lg:col-span-3">
            <SignalsSection />
          </div>
        </Suspense>

        <Suspense fallback={<RecentActivityFallback />}>
          <aside className="lg:col-span-2">
            <RecentActivity />
          </aside>
        </Suspense>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Credit awareness — real wallet data, hidden when unavailable     */}
      {/* ---------------------------------------------------------------- */}
      <footer className="border-t border-slate-100 pt-4">
        <Suspense fallback={<CreditUsageFallback />}>
          <CreditUsage />
        </Suspense>
      </footer>
      </div>
    </IntelligenceActionHostProvider>
  );
}

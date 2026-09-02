// ============================================================================
// Prosventa Intelligence — Workspace
// ============================================================================
// Phase 2 of the Intelligence rebuild: Today's Priorities. The page now turns
// existing recommendation engine output (ICP fit, signals, enrichment,
// research) into a ranked, explainable priority list with lightweight
// filtering and the existing prospect detail experience.
//
// Data: only real, RLS-scoped workspace data via existing lightweight loaders
// (bounded lists + counts — never full prospect scans). If a loader fails,
// a calm recovery state is rendered — never raw errors, never fake data.
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import { ensureOrganization } from "@/lib/db/organizations";
import { getDashboardOverview } from "@/lib/db/dashboard";
import { getRecentSignalsForWorkspaceDetailed } from "@/lib/db/signals";
import { getRecentRecommendationsForWorkspace } from "@/lib/db/recommendations";
import { getProspectIdentityMap } from "@/lib/db/prospects";
import { getSavedLists } from "@/lib/db/lists";

import { IntelligenceHeader } from "@/features/intelligence/workspace/IntelligenceHeader";
import { AttentionSummary, type AttentionSummaryData } from "@/features/intelligence/workspace/AttentionSummary";
import { PrioritiesSection } from "@/features/intelligence/workspace/PrioritiesSection";
import { IntelligenceFeedSection } from "@/features/intelligence/workspace/IntelligenceFeedSection";
import { WorkspaceContextPanel } from "@/features/intelligence/workspace/WorkspaceContextPanel";
import { DashboardErrorState } from "@/components/dashboard/feedback/PageStates";
import { IntelligenceActionHostProvider } from "@/features/intelligence/action-window";
import { buildPriorityCollection, type PriorityCollection } from "@/features/intelligence/workspace/priority-logic";

import type { SignalRecord } from "@/features/intelligence/signals/types";
import type { RecommendationRecord } from "@/features/intelligence/recommendations/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Intelligence — Prosventa",
};

/** How many feed/priority records to load — bounded, never a full scan. */
const FEED_LIMIT = 20;

interface WorkspaceData {
  generatedAt: string;
  signals: SignalRecord[];
  signalsFailed: boolean;
  recommendations: RecommendationRecord[];
  priorities: PriorityCollection;
  savedLists: Awaited<ReturnType<typeof getSavedLists>>;
  prospectCount: number;
  savedListCount: number;
  hasIcp: boolean;
}

async function loadWorkspaceData(): Promise<WorkspaceData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  await ensureOrganization();

  const [overview, signalsResult, recommendations, savedLists] = await Promise.all([
    getDashboardOverview(),
    getRecentSignalsForWorkspaceDetailed(FEED_LIMIT),
    getRecentRecommendationsForWorkspace(FEED_LIMIT),
    getSavedLists(),
  ]);

  // Identity lookup for exactly the recommendations on this page (bounded).
  const prospectIds = Array.from(
    new Set(
      recommendations
        .map((rec) => rec.prospect_id)
        .filter((id): id is string => Boolean(id))
    )
  );
  const identities = await getProspectIdentityMap(prospectIds);
  const priorities = buildPriorityCollection(recommendations, identities);

  return {
    generatedAt: new Date().toISOString(),
    signals: signalsResult.rows,
    signalsFailed: signalsResult.failed,
    recommendations: recommendations ?? [],
    priorities,
    savedLists: savedLists ?? [],
    prospectCount: overview.prospectCount,
    savedListCount: overview.savedListCount,
    hasIcp: overview.hasIcp,
  };
}

function buildAttentionSummary(data: WorkspaceData): AttentionSummaryData {
  const weekAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const newSignals = data.signals.filter((s) => {
    const detected = new Date(s.detected_at).getTime();
    return Number.isFinite(detected) && detected >= weekAgoMs;
  }).length;

  return {
    // Real count: the number of priority records currently surfaced.
    needsAttention: data.priorities.records.length,
    newSignals,
    // Real count: surfaced priorities with an ICP fit of 80+ (the same
    // threshold the Prospects "high score" quick filter uses). Neutral "—"
    // when no scored priorities exist.
    highFitProspects:
      data.priorities.records.filter((r) => r.icpScore !== null && r.icpScore >= 80)
        .length || null,
  };
}

export default async function IntelligencePage() {
  let data: WorkspaceData | null = null;
  try {
    data = await loadWorkspaceData();
  } catch {
    // Calm, user-safe recovery state. No raw errors or stack traces.
    return (
      <div className="dashboard-enter">
        <DashboardErrorState
          title="Intelligence couldn't load"
          description="We couldn't load your intelligence workspace right now. Your data is safe — please try again in a moment."
        />
      </div>
    );
  }

  const attention = buildAttentionSummary(data);

  return (
    <IntelligenceActionHostProvider>
      <div className="dashboard-enter flex min-w-0 flex-col gap-8">
        <IntelligenceHeader generatedAt={data.generatedAt} />

        <AttentionSummary data={attention} />

        {/* Primary workspace: priorities + feed in the main column, real
            workspace context in a secondary column on wide screens. The page
            itself scrolls naturally; only long lists scroll internally. */}
        <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-w-0 flex-col gap-8">
            <PrioritiesSection
              records={data.priorities.records}
              counts={data.priorities.counts}
              savedLists={data.savedLists}
            />
            <IntelligenceFeedSection
              signals={data.signals}
              failed={data.signalsFailed}
              savedLists={data.savedLists}
            />
          </div>

          <div className="hidden min-w-0 lg:block">
            <WorkspaceContextPanel
              prospectCount={data.prospectCount}
              savedListCount={data.savedListCount}
              hasIcp={data.hasIcp}
            />
          </div>
        </div>
      </div>
    </IntelligenceActionHostProvider>
  );
}

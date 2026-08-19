// ============================================================================
// Prosventa Intelligence Command Center — DB Aggregation Layer
// Stage 4 — Phase 10: Intelligence Command Center
// ============================================================================
// Server-side aggregation for the Command Center.
// Reuses existing stored intelligence (scores, signals, recommendations,
// workflow executions). No recalculation, no AI calls, no N+1 patterns.
// All queries rely on RLS for workspace isolation.
// ============================================================================

"use server";

import { createClient } from "@/lib/supabase/server";
import type { Prospect } from "@/types/database";
import type { ProspectScore } from "@/features/intelligence/scoring/types";
import type { SignalRecord } from "@/features/intelligence/signals/types";
import type { RecommendationRecord } from "@/features/intelligence/recommendations/types";
import type { IntelligenceExecution } from "@/features/intelligence/workflows/types";
import type {
  CommandCenterSummary,
  IntelligenceHealth,
} from "./types";

// ============================================================================
// Constants
// ============================================================================
const HIGH_FIT_THRESHOLD = 75;
const STALE_ENRICHMENT_DAYS = 30;
const RECENT_SIGNAL_DAYS = 7;
const RECENT_CHANGE_DAYS = 7;

// ============================================================================
// Summary
// ============================================================================
export async function getCommandCenterSummary(): Promise<CommandCenterSummary> {
  const supabase = await createClient();

  const [highFitResult, signalsResult, recommendationsResult, workflowsResult, prospectsResult] =
    await Promise.all([
      supabase
        .from("prospect_scores")
        .select("id", { count: "exact", head: true })
        .gte("score", HIGH_FIT_THRESHOLD),
      supabase
        .from("signals")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .in("importance", ["critical", "high"])
        .gte("detected_at", new Date(Date.now() - RECENT_SIGNAL_DAYS * 86400000).toISOString()),
      supabase
        .from("recommendations")
        .select("id", { count: "exact", head: true })
        .eq("status", "new"),
      supabase
        .from("workflows")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("prospects")
        .select("id", { count: "exact", head: true })
        .gte("updated_at", new Date(Date.now() - RECENT_CHANGE_DAYS * 86400000).toISOString()),
    ]);

  return {
    highFitProspects: highFitResult.count ?? 0,
    recentHighPrioritySignals: signalsResult.count ?? 0,
    pendingRecommendations: recommendationsResult.count ?? 0,
    activeWorkflows: workflowsResult.count ?? 0,
    recentlyChangedProspects: prospectsResult.count ?? 0,
  };
}

// ============================================================================
// Priority Prospects
// ============================================================================
// Ranks prospects using EXISTING stored intelligence only:
//   - ICP score (stored in prospect_scores)
//   - Recent high-priority signals (stored in signals)
//   - Pending recommendations (stored in recommendations)
//   - Recent prospect updates (prospects.updated_at)
// No new hidden scoring formula — this is an orchestration of existing signals.
// ============================================================================
export async function getPriorityProspects(limit = 8): Promise<
  Array<{
    prospect: Prospect;
    score: ProspectScore | null;
    signals: SignalRecord[];
    recommendations: RecommendationRecord[];
    reasons: Array<{ type: "high_fit" | "recent_signal" | "recommendation_pending" | "recently_updated"; label: string }>;
  }>
> {
  const supabase = await createClient();

  // Fetch prospects with enrichment, ordered by most-recently updated
  // to surface active accounts. Limit eagerly to avoid loading the whole DB.
  const { data: prospects } = await supabase
    .from("prospects")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(limit * 2);

  if (!prospects || prospects.length === 0) return [];

  const prospectIds = prospects.map((p: Prospect) => p.id);

  const [scoresResult, signalsResult, recommendationsResult] = await Promise.all([
    supabase
      .from("prospect_scores")
      .select("*")
      .in("prospect_id", prospectIds),
    supabase
      .from("signals")
      .select("*")
      .eq("status", "active")
      .in("prospect_id", prospectIds)
      .order("detected_at", { ascending: false }),
    supabase
      .from("recommendations")
      .select("*")
      .neq("status", "dismissed")
      .in("prospect_id", prospectIds)
      .order("created_at", { ascending: false }),
  ]);

  const scores = (scoresResult.data ?? []) as ProspectScore[];
  const signals = (signalsResult.data ?? []) as SignalRecord[];
  const recommendations = (recommendationsResult.data ?? []) as RecommendationRecord[];

  // Build ranked list from existing intelligence (no new computation).
  const ranked = prospects
    .map((prospect: Prospect) => {
      const score = scores.find((s) => s.prospect_id === prospect.id) ?? null;
      const prospectSignals = signals.filter((s) => s.prospect_id === prospect.id);
      const prospectRecommendations = recommendations.filter((r) => r.prospect_id === prospect.id);

      // Derive priority reasons from existing stored data.
      const reasons: Array<{ type: "high_fit" | "recent_signal" | "recommendation_pending" | "recently_updated"; label: string }> = [];

      if (score && score.score >= HIGH_FIT_THRESHOLD) {
        reasons.push({ type: "high_fit", label: `ICP fit ${score.score}` });
      }

      const recentSignal = prospectSignals[0];
      if (recentSignal) {
        const detectedAt = new Date(recentSignal.detected_at).getTime();
        if (Date.now() - detectedAt < RECENT_SIGNAL_DAYS * 86400000) {
          reasons.push({
            type: "recent_signal",
            label:
              recentSignal.importance === "critical" || recentSignal.importance === "high"
                ? `${recentSignal.title} (${recentSignal.importance})`
                : recentSignal.title,
          });
        }
      }

      const pendingRec = prospectRecommendations.find((r) => r.status === "new");
      if (pendingRec) {
        reasons.push({ type: "recommendation_pending", label: "Recommendation pending" });
      }

      const updatedAt = new Date(prospect.updated_at).getTime();
      if (Date.now() - updatedAt < RECENT_CHANGE_DAYS * 86400000 && reasons.length >= 1) {
        reasons.push({ type: "recently_updated", label: "Recently updated" });
      }

      return {
        prospect,
        score,
        signals: prospectSignals,
        recommendations: prospectRecommendations,
        reasons,
      };
    })
    .filter((item) => item.reasons.length > 0)
    .sort((a, b) => {
      // Rank by existing intelligence evidence, not a hidden formula.
      const scoreA = a.score?.score ?? -1;
      const scoreB = b.score?.score ?? -1;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return new Date(b.prospect.updated_at).getTime() - new Date(a.prospect.updated_at).getTime();
    })
    .slice(0, limit);

  return ranked;
}

// ============================================================================
// Feed
// ============================================================================
// Compact feed of important recent intelligence events.
// Merges signals, recommendations, workflow executions, and score changes
// using existing stored data — not a live event stream.
// ============================================================================
export async function getIntelligenceFeed(limit = 20): Promise<
  Array<{
    type: "signal" | "recommendation" | "workflow" | "score";
    id: string;
    title: string;
    description: string;
    entityType: "prospect" | "company" | "workspace";
    entityId: string | null;
    entityName: string | null;
    occurredAt: string;
    importance: "critical" | "high" | "medium" | "low";
    confidence: string | null;
    prospectId: string | null;
  }>
> {
  const supabase = await createClient();

  // Fetch recent signals
  const { data: signals } = await supabase
    .from("signals")
    .select("*, prospect:prospects(name, company_name)")
    .eq("status", "active")
    .order("detected_at", { ascending: false })
    .limit(limit);

  // Fetch recent recommendations
  const { data: recommendations } = await supabase
    .from("recommendations")
    .select("*, prospect:prospects(name, company_name)")
    .neq("status", "dismissed")
    .order("created_at", { ascending: false })
    .limit(limit);

  // Fetch recent workflow executions
  const { data: executions } = await supabase
    .from("workflow_executions")
    .select("*, workflow:workflows(name), prospect:prospects(name, company_name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  // Fetch recent score updates
  const { data: scores } = await supabase
    .from("prospect_scores")
    .select("*, prospect:prospects(name, company_name)")
    .order("scored_at", { ascending: false })
    .limit(limit);

  const items: Array<{
    type: "signal" | "recommendation" | "workflow" | "score";
    id: string;
    title: string;
    description: string;
    entityType: "prospect" | "company" | "workspace";
    entityId: string | null;
    entityName: string | null;
    occurredAt: string;
    importance: "critical" | "high" | "medium" | "low";
    confidence: string | null;
    prospectId: string | null;
  }> = [];

  // Signals
  for (const signal of (signals ?? []) as Array<SignalRecord & { prospect: { name: string; company_name: string } | null }>) {
    const prospect = signal.prospect;
    const entityName = prospect?.company_name || prospect?.name || null;
    items.push({
      type: "signal",
      id: `signal-${signal.id}`,
      title: signal.title,
      description: signal.interpretation || signal.description,
      entityType: prospect ? "company" : "workspace",
      entityId: signal.prospect_id,
      entityName,
      occurredAt: signal.detected_at,
      importance: signal.importance,
      confidence: signal.confidence,
      prospectId: signal.prospect_id,
    });
  }

  // Recommendations
  for (const rec of (recommendations ?? []) as Array<RecommendationRecord & { prospect: { name: string; company_name: string } | null }>) {
    const prospect = rec.prospect;
    const entityName = prospect?.company_name || prospect?.name || null;
    items.push({
      type: "recommendation",
      id: `rec-${rec.id}`,
      title: rec.title,
      description: rec.summary,
      entityType: prospect ? "company" : "workspace",
      entityId: rec.prospect_id,
      entityName,
      occurredAt: rec.created_at,
      importance: rec.priority === "high" ? "high" : rec.priority === "medium" ? "medium" : "low",
      confidence: `${rec.confidence}%`,
      prospectId: rec.prospect_id,
    });
  }

  // Workflow executions
  for (const exec of (executions ?? []) as Array<IntelligenceExecution & { workflow: { name: string } | null; prospect: { name: string; company_name: string } | null }>) {
    const prospect = exec.prospect;
    const entityName = prospect?.company_name || prospect?.name || exec.prospect_name || null;
    items.push({
      type: "workflow",
      id: `workflow-${exec.id}`,
      title: exec.workflow?.name || "Workflow executed",
      description: `Status: ${exec.status}`,
      entityType: prospect ? "company" : "workspace",
      entityId: exec.prospect_id,
      entityName,
      occurredAt: exec.created_at,
      importance: exec.status === "failed" ? "high" : exec.status === "waiting_approval" ? "high" : "medium",
      confidence: null,
      prospectId: exec.prospect_id,
    });
  }

  // Score updates
  for (const score of (scores ?? []) as Array<ProspectScore & { prospect: { name: string; company_name: string } | null }>) {
    const prospect = score.prospect;
    if (!prospect) continue;
    items.push({
      type: "score",
      id: `score-${score.id}`,
      title: `${prospect.company_name || prospect.name} scored ${score.score}`,
      description: `Confidence ${score.confidence}%`,
      entityType: "company",
      entityId: score.prospect_id,
      entityName: prospect.company_name || prospect.name,
      occurredAt: score.scored_at,
      importance: score.score >= HIGH_FIT_THRESHOLD ? "high" : "medium",
      confidence: `${score.confidence}%`,
      prospectId: score.prospect_id,
    });
  }

  // Sort by occurred_at descending and truncate
  return items
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, limit);
}

// ============================================================================
// Recommended Actions (from existing recommendations)
// ============================================================================
export async function getRecommendedActions(limit = 10): Promise<
  Array<{
    recommendation: RecommendationRecord;
    prospectName: string | null;
    companyName: string | null;
  }>
> {
  const supabase = await createClient();

  const { data: recommendations } = await supabase
    .from("recommendations")
    .select("*, prospect:prospects(name, company_name)")
    .eq("status", "new")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  return (recommendations ?? []).map((rec: RecommendationRecord & { prospect: { name: string; company_name: string } | null }) => ({
    recommendation: rec,
    prospectName: rec.prospect?.name ?? null,
    companyName: rec.prospect?.company_name ?? null,
  }));
}

// ============================================================================
// Workflow Activity
// ============================================================================
export async function getWorkflowActivity(limit = 10): Promise<
  Array<{
    execution: IntelligenceExecution;
    workflowName: string | null;
  }>
> {
  const supabase = await createClient();

  const { data: executions } = await supabase
    .from("workflow_executions")
    .select("*, workflow:workflows(name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (executions ?? []).map((exec: IntelligenceExecution & { workflow: { name: string } | null }) => ({
    execution: exec,
    workflowName: exec.workflow?.name ?? null,
  }));
}

// ============================================================================
// Intelligence Health
// ============================================================================
// Real data-quality indicators computed from existing prospect columns.
// No fabricated values.
// ============================================================================
export async function getIntelligenceHealth(): Promise<IntelligenceHealth> {
  const supabase = await createClient();

  const staleDate = new Date(Date.now() - STALE_ENRICHMENT_DAYS * 86400000).toISOString();

  const [staleResult, missingTitleResult, missingIndustryResult, lowConfidenceResult] =
    await Promise.all([
      // Prospects whose enrichment is stale or failed/pending
      supabase
        .from("prospects")
        .select("id", { count: "exact", head: true })
        .or(`enrichment_status.eq.failed,enrichment_status.eq.pending,updated_at.lte.${staleDate}`),
      // Prospects with enrichment completed but missing contact role
      supabase
        .from("prospects")
        .select("id", { count: "exact", head: true })
        .eq("enrichment_status", "completed")
        .is("contact_name", null),
      // Prospects missing industry
      supabase
        .from("prospects")
        .select("id", { count: "exact", head: true })
        .is("industry", null),
      // Prospects with low-confidence signals
      supabase
        .from("signals")
        .select("prospect_id")
        .eq("status", "active")
        .eq("confidence", "low")
        .limit(100),
    ]);

  // Count unique prospects with low-confidence signals
  const lowConfidenceProspectIds = new Set(
    (lowConfidenceResult.data ?? []).map((s: { prospect_id: string | null }) => s.prospect_id)
  );

  return {
    staleEnrichment: staleResult.count ?? 0,
    missingJobTitles: missingTitleResult.count ?? 0,
    missingIndustry: missingIndustryResult.count ?? 0,
    lowConfidenceIntelligence: lowConfidenceProspectIds.size,
  };
}
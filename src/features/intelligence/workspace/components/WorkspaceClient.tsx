"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "@/features/prospects/components/ProspectBadges";
import { loadWorkspaceData, runWorkspaceOperation } from "../actions";
import type { WorkspaceData, WorkspaceTabId, WorkspaceOperation } from "../types";
import { WORKSPACE_TABS } from "../types";
import { ProspectSelector } from "./ProspectSelector";
import { OverviewTab } from "./OverviewTab";
import { ResearchTab } from "./ResearchTab";
import { CompanyTab } from "./CompanyTab";
import { SignalsTab } from "./SignalsTab";
import { ScoreTab } from "./ScoreTab";
import { RecommendationsTab } from "./RecommendationsTab";
import { WorkspaceEmptyState, WorkspaceErrorState } from "./sections";
import { getScoreCategoryLabel } from "../../scoring/types";
import { updateRecommendationStatusAction } from "../../recommendations/actions";

type LoadState = "idle" | "loading" | "success" | "error";

export function WorkspaceClient({ initialProspectId }: { initialProspectId: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [prospectId, setProspectId] = useState<string | null>(initialProspectId);
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [loadState, setLoadState] = useState<LoadState>(initialProspectId ? "loading" : "idle");
  const [activeTab, setActiveTab] = useState<WorkspaceTabId>("overview");
  const [processingOp, setProcessingOp] = useState<WorkspaceOperation | null>(null);

  const load = useCallback(async (id: string) => {
    setLoadState("loading");
    setData(null);
    try {
      const bundle = await loadWorkspaceData(id);
      if (bundle) {
        setData(bundle);
        setLoadState("success");
      } else {
        setLoadState("error");
      }
    } catch {
      setLoadState("error");
    }
  }, []);

  // Load when prospectId changes (from URL or selector)
  useEffect(() => {
    if (prospectId) {
      load(prospectId);
    } else {
      setData(null);
      setLoadState("idle");
    }
  }, [prospectId, load]);

  const handleSelect = useCallback(
    (id: string) => {
      setProspectId(id);
      setActiveTab("overview");
      // Keep URL state in sync where supported.
      const params = new URLSearchParams(searchParams.toString());
      params.set("prospect", id);
      router.replace(`/dashboard/intelligence?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const handleRun = useCallback(
    async (op: WorkspaceOperation) => {
      if (!prospectId || processingOp) return;
      setProcessingOp(op);
      try {
        await runWorkspaceOperation(prospectId, op);
        // Refresh the bundle so all tabs reflect the new state.
        await load(prospectId);
      } catch {
        // Keep existing data visible; the operation result is best-effort.
      } finally {
        setProcessingOp(null);
      }
    },
    [prospectId, processingOp, load]
  );

  const handleRecommendationStatus = useCallback(
    async (id: string, status: "new" | "reviewed" | "dismissed" | "completed") => {
      const ok = await updateRecommendationStatusAction(id, status);
      if (ok && data) {
        setData({
          ...data,
          recommendations:
            status === "dismissed"
              ? data.recommendations.filter((r) => r.id !== id)
              : data.recommendations.map((r) => (r.id === id ? { ...r, status } : r)),
        });
      }
    },
    [data]
  );

  const prospect = data?.prospect ?? null;
  const companyName = prospect?.company_name || prospect?.name || "Unknown company";
  const score = data?.score ?? null;
  const topSignal = data?.signals?.[0] ?? null;

  // Summary strip values (all derived from real data).
  const summary = useMemo(() => {
    const items: Array<{ label: string; value: string; tone?: "good" | "warn" | "neutral" }> = [];
    if (score) {
      items.push({
        label: "ICP Score",
        value: `${score.score}/100 · ${getScoreCategoryLabel(score.category)}`,
        tone: score.score >= 75 ? "good" : score.score >= 50 ? "warn" : "neutral",
      });
    } else {
      items.push({ label: "ICP Score", value: "Not scored", tone: "neutral" });
    }
    if (score) {
      items.push({
        label: "Confidence",
        value: `${score.confidence}%`,
        tone: score.confidence >= 80 ? "good" : score.confidence >= 50 ? "warn" : "neutral",
      });
    }
    const intent = prospect?.buying_intent;
    if (intent) {
      items.push({
        label: "Intent",
        value: intent.charAt(0).toUpperCase() + intent.slice(1),
        tone: intent === "high" ? "good" : intent === "medium" ? "warn" : "neutral",
      });
    } else {
      items.push({ label: "Intent", value: "Unknown", tone: "neutral" });
    }
    if (topSignal) {
      items.push({ label: "Last signal", value: topSignal.title, tone: "neutral" });
    } else {
      items.push({ label: "Last signal", value: "None detected", tone: "neutral" });
    }
    return items;
  }, [score, prospect, topSignal]);

  if (loadState === "idle") {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Intelligence Workspace</h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Select a prospect to see why they matter, what intelligence exists, and what to do next.
            </p>
          </div>
          <ProspectSelector value={null} onSelect={handleSelect} />
        </div>
        <WorkspaceEmptyState
          title="No prospect selected"
          description="Choose a prospect from your workspace to open its intelligence profile."
        />
      </div>
    );
  }

  if (loadState === "loading") {
    return (
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-slate-100 animate-pulse shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="h-6 w-48 rounded bg-slate-100 animate-pulse" />
              <div className="mt-2 h-4 w-64 rounded bg-slate-100 animate-pulse" />
              <div className="mt-1.5 h-3 w-40 rounded bg-slate-100 animate-pulse" />
            </div>
          </div>
          <div className="w-full max-w-md h-9 rounded-lg bg-slate-100 animate-pulse shrink-0" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
              <div className="h-3 w-16 rounded bg-slate-100 animate-pulse" />
              <div className="mt-2 h-4 w-24 rounded bg-slate-100 animate-pulse" />
            </div>
          ))}
        </div>
        <div className="h-10 rounded-lg bg-slate-100 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-lg border border-slate-100 bg-white p-4">
                <div className="h-4 w-1/3 rounded bg-slate-100 animate-pulse" />
                <div className="mt-2 h-3 w-full rounded bg-slate-100 animate-pulse" />
                <div className="mt-1.5 h-3 w-2/3 rounded bg-slate-100 animate-pulse" />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="rounded-lg border border-slate-100 bg-white p-4">
                <div className="h-4 w-1/2 rounded bg-slate-100 animate-pulse" />
                <div className="mt-2 h-6 w-16 rounded bg-slate-100 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Intelligence Workspace</h1>
            <p className="mt-1.5 text-sm text-slate-500">Prospect intelligence profile.</p>
          </div>
          <ProspectSelector value={prospectId} onSelect={handleSelect} />
        </div>
        <WorkspaceErrorState
          message="Intelligence could not be loaded for this prospect."
          onRetry={() => prospectId && load(prospectId)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 text-lg font-bold shrink-0">
            {companyName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 truncate">{companyName}</h1>
              {prospect && <StatusBadge status={prospect.status} />}
            </div>
            <p className="text-sm text-slate-500 mt-0.5 truncate">
              {prospect?.contact_name ? `${prospect.contact_name} · ` : ""}
              {prospect?.industry || "Industry unknown"}
              {prospect?.location ? ` · ${prospect.location}` : ""}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {prospect?.domain || prospect?.website || "No website"}
              {prospect?.updated_at && ` · Updated ${formatDate(prospect.updated_at)}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ProspectSelector value={prospectId} onSelect={handleSelect} />
        </div>
      </div>

      {/* Intelligence Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summary.map((item) => (
          <div key={item.label} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">{item.label}</p>
            <p
              className={cn(
                "mt-1 text-sm font-semibold truncate",
                item.tone === "good" && "text-emerald-700",
                item.tone === "warn" && "text-amber-700",
                (!item.tone || item.tone === "neutral") && "text-slate-800"
              )}
            >
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/50 p-1 overflow-x-auto" role="tablist" aria-label="Intelligence sections">
        {WORKSPACE_TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 min-w-[96px] px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none whitespace-nowrap",
              activeTab === tab.id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active Tab — data is already loaded, so switching is instant */}
      <div key={activeTab} className="dashboard-enter">
        {activeTab === "overview" && (
          <OverviewTab
            data={data}
status="success"
            onRun={(op) => handleRun(op)}
          />
        )}
        {activeTab === "research" && (
          <ResearchTab
            data={data}
            isProcessing={processingOp === "research_company" || processingOp === "research_prospect"}
            onRun={(op) => handleRun(op)}
          />
        )}
        {activeTab === "company" && (
          <CompanyTab
            data={data}
            isProcessing={processingOp === "enrich_company"}
            onEnrich={() => handleRun("enrich_company")}
          />
        )}
        {activeTab === "signals" && (
          <SignalsTab
            signals={data?.signals ?? []}
            isProcessing={processingOp === "detect_signals"}
            onDetect={() => handleRun("detect_signals")}
          />
        )}
        {activeTab === "score" && (
          <ScoreTab
            score={data?.score ?? null}
            isProcessing={processingOp === "score"}
            onScore={() => handleRun("score")}
          />
        )}
        {activeTab === "recommendations" && (
          <RecommendationsTab
            recommendations={data?.recommendations ?? []}
            isProcessing={processingOp === "generate_recommendations"}
            onGenerate={() => handleRun("generate_recommendations")}
            onStatusChange={handleRecommendationStatus}
          />
        )}
      </div>
    </div>
  );
}
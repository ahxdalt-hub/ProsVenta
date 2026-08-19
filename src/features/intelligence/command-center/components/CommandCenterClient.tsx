// ============================================================================
// Prosventa Intelligence Command Center — Client
// Stage 4 — Phase 10: Intelligence Command Center
// ============================================================================
// Orchestrates independent section loading so one failing service does not
// take down the entire Command Center. Each section has its own loading,
// error, and empty states.
// ============================================================================

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  loadSummaryAction,
  loadPriorityProspectsAction,
  loadFeedAction,
  loadRecommendedActionsAction,
  loadWorkflowActivityAction,
  loadHealthAction,
} from "../actions";
import type {
  CommandCenterSummary,
  FeedItem,
  IntelligenceHealth,
  PriorityProspect,
  RecommendedAction,
  WorkflowActivity,
} from "../types";
import { SummarySection } from "./SummarySection";
import { PriorityProspectsSection } from "./PriorityProspectsSection";
import { IntelligenceFeedSection } from "./IntelligenceFeedSection";
import { RecommendedActionsSection } from "./RecommendedActionsSection";
import { WorkflowActivitySection } from "./WorkflowActivitySection";
import { HealthSection } from "./HealthSection";

type SectionState<T> = {
  status: "loading" | "success" | "error";
  data: T | null;
};

const initialSection = <T,>(): SectionState<T> => ({ status: "loading", data: null });

export function CommandCenterClient() {
  const [summary, setSummary] = useState<SectionState<CommandCenterSummary>>(initialSection);
  const [priorityProspects, setPriorityProspects] = useState<SectionState<PriorityProspect[]>>(initialSection);
  const [feed, setFeed] = useState<SectionState<FeedItem[]>>(initialSection);
  const [recommendedActions, setRecommendedActions] = useState<SectionState<RecommendedAction[]>>(initialSection);
  const [workflowActivity, setWorkflowActivity] = useState<SectionState<WorkflowActivity[]>>(initialSection);
  const [health, setHealth] = useState<SectionState<IntelligenceHealth>>(initialSection);

  const loadAll = useCallback(async () => {
    // Load each section independently — one failure does not block others.
    setSummary(initialSection());
    setPriorityProspects(initialSection());
    setFeed(initialSection());
    setRecommendedActions(initialSection());
    setWorkflowActivity(initialSection());
    setHealth(initialSection());

    const [summaryResult, priorityResult, feedResult, actionsResult, workflowResult, healthResult] =
      await Promise.allSettled([
        loadSummaryAction(),
        loadPriorityProspectsAction(),
        loadFeedAction(),
        loadRecommendedActionsAction(),
        loadWorkflowActivityAction(),
        loadHealthAction(),
      ]);

    if (summaryResult.status === "fulfilled") {
      setSummary({ status: "success", data: summaryResult.value });
    } else {
      setSummary({ status: "error", data: null });
    }

    if (priorityResult.status === "fulfilled") {
      setPriorityProspects({ status: "success", data: priorityResult.value });
    } else {
      setPriorityProspects({ status: "error", data: null });
    }

    if (feedResult.status === "fulfilled") {
      setFeed({ status: "success", data: feedResult.value });
    } else {
      setFeed({ status: "error", data: null });
    }

    if (actionsResult.status === "fulfilled") {
      setRecommendedActions({ status: "success", data: actionsResult.value });
    } else {
      setRecommendedActions({ status: "error", data: null });
    }

    if (workflowResult.status === "fulfilled") {
      setWorkflowActivity({ status: "success", data: workflowResult.value });
    } else {
      setWorkflowActivity({ status: "error", data: null });
    }

    if (healthResult.status === "fulfilled") {
      setHealth({ status: "success", data: healthResult.value });
    } else {
      setHealth({ status: "error", data: null });
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return (
    <div className="space-y-8">
      {/* Top Summary */}
      <SummarySection
        status={summary.status}
        data={summary.data}
        onRetry={loadAll}
      />

      {/* Priority Prospects + Recommended Actions (two-column on desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PriorityProspectsSection
            status={priorityProspects.status}
            data={priorityProspects.data}
            onRetry={loadAll}
          />
        </div>
        <div>
          <RecommendedActionsSection
            status={recommendedActions.status}
            data={recommendedActions.data}
            onRetry={loadAll}
          />
        </div>
      </div>

      {/* Intelligence Feed + Workflow Activity (two-column on desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <IntelligenceFeedSection
            status={feed.status}
            data={feed.data}
            onRetry={loadAll}
          />
        </div>
        <div>
          <WorkflowActivitySection
            status={workflowActivity.status}
            data={workflowActivity.data}
            onRetry={loadAll}
          />
        </div>
      </div>

      {/* Intelligence Health */}
      <HealthSection
        status={health.status}
        data={health.data}
        onRetry={loadAll}
      />
    </div>
  );
}
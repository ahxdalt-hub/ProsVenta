// ============================================================================
// AI & Intelligence Settings — Server View Model
// ============================================================================
// Loads ONLY verifiable facts for the Settings › AI & Intelligence page:
//
//   1. Capability availability, derived from the real intelligence provider
//      environment/registry (resolveProviderStatus) — never fabricated.
//   2. Aggregate intelligence activity, counted from the organization's own
//      completed credit usage records (org-scoped + RLS).
//
// No preferences exist in the backend today, so the page exposes none.
// All values are serializable so the same view model powers both the routed
// page and the Settings landing detail panel.
// ============================================================================

import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getIntelligenceEnvironment } from "@/features/intelligence/config";
import {
  resolveProviderStatus,
  type ProviderStatus,
} from "@/features/intelligence/status";
import type { CreditOperationKey } from "@/features/credits/operations";

export interface AiCapabilityVm {
  /** True only when the backing engine/provider is actually usable today. */
  available: boolean;
  /** Short, user-facing explanation of the current state. */
  detail: string;
}

export interface AiActivityEntryVm {
  operationKey: CreditOperationKey;
  count: number;
}

export interface AiIntelligenceViewModel {
  health: "healthy" | "limited" | "error";
  healthMessage: string;
  capabilities: {
    enrichment: AiCapabilityVm;
    research: AiCapabilityVm;
    signals: AiCapabilityVm;
    automation: AiCapabilityVm;
  };
  /** Completed intelligence operations for this organization, by type. */
  activity: AiActivityEntryVm[];
  /** False when the activity read failed (shown as a localized error). */
  activityAvailable: boolean;
}

function describeEnrichment(statuses: ProviderStatus[]): AiCapabilityVm {
  const anyAvailable = statuses.includes("available");
  const anyError = statuses.includes("error");
  return {
    available: anyAvailable,
    detail: anyAvailable
      ? "Ready to add firmographic and contact information to your records."
      : anyError
        ? "Temporarily unavailable — the data provider needs attention."
        : "Not configured yet for this workspace.",
  };
}

/**
 * Builds the AI & Intelligence settings view model. Every field reflects real
 * application state; nothing here is a placeholder. Failures degrade that one
 * piece (activityAvailable) instead of failing the whole Settings page.
 */
export async function loadAiIntelligenceViewModel(): Promise<AiIntelligenceViewModel> {
  const env = getIntelligenceEnvironment();

  // ---- Capability availability (real provider resolution) -----------------
  const companyStatus = resolveProviderStatus({
    providerId: env.companyProviderId,
    kind: "company_enrichment",
  });
  const prospectStatus = resolveProviderStatus({
    providerId: env.prospectProviderId,
    kind: "prospect_enrichment",
  });
  const researchStatus = resolveProviderStatus({
    providerId: env.researchProviderId,
    kind: "research",
  });

  const capabilities: AiIntelligenceViewModel["capabilities"] = {
    enrichment: describeEnrichment([companyStatus.status, prospectStatus.status]),
    research: {
      available: researchStatus.status === "available",
      detail:
        researchStatus.status === "available"
          ? "Ready to build deeper context around companies and prospects."
          : "Not configured yet for this workspace.",
    },
    // The signals engine always runs internal activity analysis (free);
    // external buying-intent detection activates with a configured provider.
    signals: {
      available: true,
      detail:
        "Internal activity signals run automatically. External intent detection is included when a signal provider is connected.",
    },
    // The workflow engine ships with the product; steps consume Credits only
    // when they succeed (see CREDIT_OPERATION_CATALOG.automation_execution).
    automation: {
      available: true,
      detail:
        "Runs supported intelligence steps inside workflows you set up. Each successful step uses Credits.",
    },
  };

  // ---- Health --------------------------------------------------------------
  const statuses: ProviderStatus[] = [
    companyStatus.status,
    prospectStatus.status,
    researchStatus.status,
  ];
  let health: AiIntelligenceViewModel["health"];
  let healthMessage: string;
  if (statuses.includes("error")) {
    health = "error";
    healthMessage = "Some intelligence features require attention.";
  } else if (capabilities.enrichment.available && capabilities.research.available) {
    health = "healthy";
    healthMessage = "Intelligence is working normally.";
  } else {
    health = "limited";
    healthMessage = "Some intelligence features are currently unavailable.";
  }

  // ---- Activity (completed operations, org-scoped, RLS-protected) ----------
  let activity: AiActivityEntryVm[] = [];
  let activityAvailable = true;
  try {
    const supabase = await createClient();
    const keys: CreditOperationKey[] = [
      "company_enrichment",
      "prospect_enrichment",
      "company_research",
      "prospect_research",
      "signal_refresh",
      "automation_execution",
    ];
    const results = await Promise.all(
      keys.map(async (key) => {
        const { count, error } = await supabase
          .from("credit_usage_records")
          .select("id", { count: "exact", head: true })
          .eq("operation_key", key)
          .eq("status", "completed");
        return { operationKey: key, count: error ? null : (count ?? 0) };
      })
    );
    activityAvailable = results.every((r) => r.count !== null);
    activity = results
      .filter(
        (r): r is { operationKey: CreditOperationKey; count: number } =>
          r.count !== null && r.count > 0
      )
      .sort((a, b) => b.count - a.count);
  } catch {
    activity = [];
    activityAvailable = false;
  }

  return { health, healthMessage, capabilities, activity, activityAvailable };
}


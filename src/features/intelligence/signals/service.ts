// ============================================================================
// Prosventa Buying & Intent Signals — Service
// Stage 4 — Phase 7: Buying & Intent Signals
// ============================================================================
// Server-side boundary for signal detection operations. UI components never
// call providers or engines directly — they go through this service.
//
// Authorization is resolved server-side from the authenticated user's
// organization membership. The client-supplied prospectId is never trusted
// to determine workspace access.
//
// Detection flow:
//   Signal Detection (internal + external)
//    → Provider Adapter (external only, when configured)
//    → Normalized Signal
//    → Validation
//    → Deduplication
//    → Supabase
//    → Signal UI
//
// IMPORTANT:
//  - Does NOT detect signals on every page load. One explicit user action
//    produces one detection operation.
//  - Does NOT make AI calls for signal detection in this phase.
//  - External signals are ONLY produced when a provider is configured.
//  - Internal Prosventa activity signals are always grounded in real data.
// ============================================================================
"use server";

import { createClient } from "@/lib/supabase/server";
import { IntelligenceError, toIntelligenceError } from "../errors";
import { normalizeDomain } from "../domain";
import { recordIntelligenceUsage } from "@/lib/db/intelligence";
import { getCompanyEnrichment, getProspectEnrichment } from "@/lib/db/intelligence";
import { createNotificationEntry } from "@/lib/db/collaboration";
import {
  getSignalsForProspect,
  getRecentSignalsForWorkspace,
  getExternalSignalCandidates,
  insertSignal,
  signalExists,
  dismissSignal,
  updateSignal,
} from "@/lib/db/signals";
import { insertRecommendation, recommendationExists } from "@/lib/db/recommendations";
import { detectInternalActivitySignals } from "./internal-engine";
import { isExternalSignalDetectionConfigured } from "./provider";
import {
  resolveExternalSignalProvider,
  assertBusinessSignalsCapability,
} from "./external/provider";
import { normalizeExternalEventType } from "./external/types";
import { toNormalizedSignalInput } from "./external/normalize";
import type {
  ExternalSignalProvider,
  ExternalSignalDetectionRequest,
} from "./external/types";
import { findDuplicateExternalSignal } from "./external/dedupe";
import { validateAndFilterSignals, buildDedupeKey } from "./dedupe";
import {
  toEvidenceInsert,
  type NormalizedEvidenceInput,
} from "./evidence";
import type {
  SignalDetectionInput,
  SignalOperationResult,
  SignalRecord,
  SignalInput,
} from "./types";

// ============================================================================
// Rate Limiting (provider protection)
// ============================================================================
// External signal detection is expensive. Repeated user clicks or rapid
// re-detection for the same prospect are throttled in-memory per organization
// + prospect. This protects the provider from uncontrolled request volume;
// background refresh (future phase) will replace this with proper scheduling.
// ============================================================================

const EXTERNAL_DETECTION_COOLDOWN_MS = 30_000; // 30s per org+prospect

const lastExternalDetectionAt = new Map<string, number>();

function isThrottled(key: string): boolean {
  const last = lastExternalDetectionAt.get(key);
  return typeof last === "number" && Date.now() - last < EXTERNAL_DETECTION_COOLDOWN_MS;
}

function markDetection(key: string): void {
  lastExternalDetectionAt.set(key, Date.now());
  // Keep the map bounded.
  if (lastExternalDetectionAt.size > 1000) {
    const oldest = Array.from(lastExternalDetectionAt.entries()).sort(
      (a, b) => a[1] - b[1]
    )[0];
    if (oldest) lastExternalDetectionAt.delete(oldest[0]);
  }
}

// ============================================================================
// Authorization Helper
// ============================================================================

async function getOrgAndUser(): Promise<{ orgId: string; userId: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new IntelligenceError("AUTHENTICATION_FAILED");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) throw new IntelligenceError("AUTHENTICATION_FAILED");

  return { orgId: membership.organization_id, userId: user.id };
}

// ============================================================================
// Notification Hook
// ============================================================================
// Only genuinely important signals (critical/high importance) create a
// notification. Low/medium signals never notify — we do not spam users.
// ============================================================================

async function notifyHighImportanceSignal(
  orgId: string,
  signal: SignalInput,
  prospectId: string
): Promise<void> {
  if (signal.importance !== "critical" && signal.importance !== "high") {
    return;
  }

  // Notify all active workspace members (excluding the acting user is not
  // possible here since detection is a server action; the notification is
  // created for all members so the team sees genuinely important signals).
  const supabase = await createClient();
  const { data: members } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", orgId)
    .eq("status", "active");

  for (const member of members ?? []) {
    await createNotificationEntry({
      user_id: member.user_id,
      organization_id: orgId,
      type: "signal_detected",
      title: `Signal: ${signal.title}`,
      body: signal.description.slice(0, 120),
      entity_type: "prospect",
      entity_id: prospectId,
    });
  }
}

// ============================================================================
// Usage Tracking
// ============================================================================

async function trackUsage(
  orgId: string,
  userId: string,
  provider: string,
  status: "pending" | "completed" | "failed"
) {
  await recordIntelligenceUsage({
    organization_id: orgId,
    user_id: userId,
    operation: "signals",
    provider,
    status,
  });
}

// ============================================================================
// Context Builder
// ============================================================================
// Gathers available prospect + enrichment data to build the detection context.
// Does NOT call external providers. Uses strongest available information.
// ============================================================================

async function buildDetectionInput(
  prospectId: string,
  orgId: string
): Promise<SignalDetectionInput> {
  const supabase = await createClient();

  // Resolve the prospect server-side to verify workspace authorization.
  // RLS ensures the user can only access prospects in their own org.
  const { data: prospect } = await supabase
    .from("prospects")
    .select("id, organization_id, company_name, name, website, domain, contact_name, contact_email")
    .eq("id", prospectId)
    .single();

  if (!prospect) {
    throw new IntelligenceError("NOT_FOUND");
  }

  // Verify the prospect belongs to the authenticated user's org.
  if (prospect.organization_id !== orgId) {
    throw new IntelligenceError("AUTHENTICATION_FAILED");
  }

  const domain = normalizeDomain(prospect.domain || prospect.website) ?? null;

  // Check whether company enrichment exists (drives internal activity signals).
  let hasCompanyEnrichment = false;
  if (domain) {
    const enrichment = await getCompanyEnrichment(prospectId, domain);
    if (enrichment?.status === "completed" && enrichment.data) {
      hasCompanyEnrichment = true;
    }
  }

  // Check whether prospect enrichment exists.
  let hasProspectEnrichment = false;
  const prospectEnrichment = await getProspectEnrichment(prospectId);
  if (prospectEnrichment?.status === "completed" && prospectEnrichment.data) {
    hasProspectEnrichment = true;
  }

  return {
    prospectId,
    organizationId: orgId,
    companyName: prospect.company_name || prospect.name || null,
    domain,
    contactName: prospect.contact_name || null,
    contactEmail: prospect.contact_email || null,
    jobTitle: hasProspectEnrichment
      ? (prospectEnrichment?.data?.jobTitle ?? null)
      : null,
    externalResearchPerformed: hasCompanyEnrichment,
  };
}

// ============================================================================
// Signal Detection Operation
// ============================================================================

/**
 * Detects and stores signals for a prospect.
 *
 * Authorization:
 *  - authenticated user
 *  - workspace membership (resolved server-side)
 *  - prospect belongs to user's org
 *
 * Detection:
 *  - Internal Prosventa activity signals are always grounded in real data.
 *  - External signals are ONLY produced when a provider is configured
 *    (SIGNALS_PROVIDER env var). Never fabricate external signals.
 *
 * Deduplication:
 *  - The same event must not appear repeatedly. A stable dedupe key is built
 *    from signal type, source, source URL, event date, and event id.
 *
 * Usage:
 *  - Only external signal detection is tracked as a paid-intelligence op.
 *  - Internal activity detection is low-cost and not tracked as external usage.
 */
export async function detectSignalsForProspect(
  prospectId: string,
  options?: { runExternal?: boolean }
): Promise<SignalOperationResult> {
  try {
    const { orgId, userId } = await getOrgAndUser();

    // Build the detection context (verifies workspace auth for prospect).
    const input = await buildDetectionInput(prospectId, orgId);

    // === 1. Internal Prosventa activity signals (always grounded) ===
    const signals: SignalInput[] = detectInternalActivitySignals(input);

    // === 2. Validate internal signals ===
    const validSignals = validateAndFilterSignals(signals);

    let created = 0;
    let duplicates = 0;
    const messages: string[] = [];
    let providerId: string | null = null;
    let reason: SignalOperationResult["reason"];

    // === 3. Store internal signals (deduplicated) ===
    for (const signal of validSignals) {
      const dedupeKey = buildDedupeKey(signal);
      if (await signalExists(orgId, dedupeKey)) {
        duplicates++;
        continue;
      }

      const inserted = await insertSignal({
        organization_id: orgId,
        prospect_id: prospectId,
        signal_type: signal.signal_type,
        category: signal.category,
        signal_origin: "internal",
        title: signal.title,
        description: signal.description,
        evidence: signal.evidence ?? null,
        source: signal.source,
        source_url: signal.source_url ?? null,
        detected_at: signal.detected_at,
        confidence: signal.confidence,
        importance: signal.importance,
        dedupe_key: dedupeKey,
        interpretation: signal.interpretation ?? null,
      });

      if (inserted) {
        created++;
        await notifyHighImportanceSignal(orgId, signal, prospectId);
        // Stage 7 Phase 2: signal.detected → trigger engine. Reuses Stage 6
        // deduplication — only signals that survived dedupe reach this point.
        emitSignalEventSafe({
          organizationId: orgId,
          signalRecord: inserted,
        });
      }
    }

    // === 4. External business signals (only on explicit request) ===
    if (options?.runExternal && !reason) {
      const throttleKey = `${orgId}:${prospectId}`;
      if (isThrottled(throttleKey)) {
        reason = "rate_limited";
        messages.push("External detection was just run — please wait a moment.");
      } else {
        const provider = await resolveExternalSignalProvider(orgId);
        if (!provider) {
          reason = "not_configured";
          messages.push(
            "No external signal provider is configured yet, so no external business events were detected."
          );
        } else {
          providerId = provider.getConfig().id;
          try {
            assertBusinessSignalsCapability(provider);
          } catch {
            reason = "unsupported";
            messages.push(
              "The configured provider does not support external business signals."
            );
          }

          if (!reason) {
            markDetection(throttleKey);
            await trackUsage(orgId, userId, provider.getConfig().id, "pending");
            try {
              const outcome = await detectAndStoreExternalSignals(orgId, input, provider);
              created += outcome.created;
              duplicates += outcome.duplicates;
              if (outcome.message) messages.push(outcome.message);
              await trackUsage(orgId, userId, provider.getConfig().id, "completed");
            } catch {
              await trackUsage(orgId, userId, provider.getConfig().id, "failed");
              reason = "provider_error";
              messages.push(
                "The external signal provider could not be reached. Please try again later."
              );
            }
          }
        }
      }
    }

    if (created > 0) {
      messages.unshift(`Recorded ${created} new signal${created === 1 ? "" : "s"}.`);
    } else if (duplicates > 0 && !reason) {
      messages.push("All detected events were already recorded.");
    }
    if (messages.length === 0 && !reason) {
      messages.push("No recent external signals found.");
    }

    return {
      status: "completed",
      message: messages.join(" ") || "Detection completed.",
      created,
      duplicates,
      provider: providerId,
      externalConfigured: Boolean(providerId),
      ...(reason ? { reason } : {}),
    };
  } catch (error) {
    const intelError = toIntelligenceError(error, "signals");
    return {
      status: "failed",
      message: intelError.message,
      created: 0,
      duplicates: 0,
      provider: null,
      externalConfigured: isExternalSignalDetectionConfigured(),
    };
  }
}

// ============================================================================
// External Detection + Storage (Stage 6 — Phase 5)
// ============================================================================
// Normalizes provider events, drops anything without trustworthy evidence,
// cross-provider deduplicates, stores company-level provenance, and creates
// recommendations ONLY for genuinely meaningful (high-importance) signals.
// ============================================================================

async function detectAndStoreExternalSignals(
  orgId: string,
  input: SignalDetectionInput,
  provider: ExternalSignalProvider
): Promise<{ created: number; duplicates: number; message: string }> {
  const domain = normalizeDomain(input.domain) ?? null;
  const companyKey = domain;

  const request: ExternalSignalDetectionRequest = {
    companyId: input.prospectId,
    domain,
    companyName: input.companyName,
  };

  // Raw provider events (provider-specific vocabulary).
  const rawEvents = await provider.detectExternalSignals(request);
  if (rawEvents.length === 0) {
    return { created: 0, duplicates: 0, message: "No recent external signals found." };
  }

  // Stored external signals for this company — duplicate anchors.
  const stored = await getExternalSignalCandidates(orgId, companyKey);

  let created = 0;
  let duplicates = 0;

  for (const raw of rawEvents) {
    // Unknown/unmappable event types are dropped honestly, never guessed.
    if (!normalizeExternalEventType(raw.eventTypeRaw)) continue;

    // Normalize into Prosventa's internal model (+ relevance methodology).
    const normalized = toNormalizedSignalInput(raw, request, provider.getConfig().id);
    if (!normalized) continue;

    // Cross-provider / repeated-detection deduplication.
    const duplicate = findDuplicateExternalSignal(
      { ...raw, resolvedType: normalized.signal_type },
      stored
    );
    if (duplicate) {
      duplicates++;
      continue;
    }

    const dedupeKey = [
      "ext",
      normalized.signal_type,
      companyKey ?? "no-domain",
      raw.providerSignalId ?? dayKeyOf(normalized.detected_at),
      raw.sourceUrl ?? "no-url",
    ].join("|");

    const inserted = await insertSignal({
      organization_id: orgId,
      prospect_id: input.prospectId,
      signal_type: normalized.signal_type,
      category: "external_event",
      signal_origin: "external",
      title: normalized.title,
      description: normalized.description,
      // Short summary mirrors the factual event description
      summary: normalized.description.slice(0, 240),
      evidence: normalized.evidence ?? null,
      source: normalized.source,
      source_url: normalized.source_url ?? null,
      // The provider's own record id — provenance + dedup anchor
      source_record_id: raw.providerSignalId ?? null,
      detected_at: normalized.detected_at,
      published_at: normalized.published_at,
      // When the event ACTUALLY happened (never invented; falls back to null)
      occurred_at: normalized.published_at,
      confidence: normalized.confidence,
      importance: normalized.importance,
      status: "detected",
      dedupe_key: dedupeKey,
      interpretation: normalized.interpretation ?? null,
      provider: provider.getConfig().id,
      provider_signal_id: raw.providerSignalId,
      company_key: companyKey,
    });
    if (!inserted) continue;

    // Persist NORMALIZED EVIDENCE so every signal answers "why was this shown?".
    // Insufficient-evidence events never reach this point (dropped above).
    await persistSignalEvidenceSafe(orgId, inserted.id, {
      provider: provider.getConfig().id,
      evidenceType: "provider_record",
      sourceName: raw.sourceName || provider.getConfig().id,
      sourceUrl: raw.sourceUrl,
      sourceRecordId: raw.providerSignalId,
      occurredAt: normalized.published_at,
      capturedAt: raw.retrievedAt,
      normalizedData: {
        event_type_raw: raw.eventTypeRaw,
        resolved_signal_type: normalized.signal_type,
        published_at: normalized.published_at,
        retrieved_at: raw.retrievedAt,
        freshness: normalized.freshness,
      },
    });

    created++;
    // Stage 7 Phase 2: signal.detected → trigger engine (external signals too).
    emitSignalEventSafe({ organizationId: orgId, signalRecord: inserted });

    stored.push({

      id: inserted.id,
      signal_type: inserted.signal_type,
      title: inserted.title,
      source_url: inserted.source_url,
      provider: inserted.provider,
      provider_signal_id: inserted.provider_signal_id,
      detected_at: inserted.detected_at,
    });

    // Meaningful external signals may justify ONE grounded recommendation.
    if (inserted.importance === "high" && inserted.prospect_id) {
      await maybeCreateSignalRecommendation(orgId, inserted);
    }
  }

  return {
    created,
    duplicates,
    message:
      created > 0
        ? `Detected ${created} external business signal${created === 1 ? "" : "s"}${
            duplicates > 0
              ? ` (${duplicates} duplicate${duplicates === 1 ? "" : "s"} skipped)`
              : ""
          }.`
        : "",
  };
}

function dayKeyOf(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "unknown-date" : d.toISOString().slice(0, 10);
}

// ============================================================================
// Evidence Persistence Helper (Feature 3 — Phase 1)
// ============================================================================
// Persists normalized evidence for a stored signal. Never throws and never
// corrupts an existing signal record on failure — evidence persistence is
// best-effort with a logged error so provider issues cannot break detection.
// ============================================================================

async function persistSignalEvidenceSafe(
  organizationId: string,
  signalId: string,
  input: NormalizedEvidenceInput
): Promise<void> {
  try {
    const evidenceInsert = toEvidenceInsert(input, organizationId, signalId);
    if (!evidenceInsert) {
      // Minimum evidence requirements not met — nothing is persisted.
      return;
    }
    const { insertSignalEvidence } = await import("@/lib/db/signal-evidence");
    await insertSignalEvidence(evidenceInsert);
  } catch (err) {
    console.error("[signals] Evidence persistence failed:", err);
  }
}

// ============================================================================
// Signal → Recommendation Hook
// ============================================================================
// Uses the EXISTING recommendation engine's storage. Only high-importance
// external signals qualify; language stays cautious ("worth reviewing").
// Recommendations are deduplicated so one event produces one recommendation.
// ============================================================================

async function maybeCreateSignalRecommendation(
  orgId: string,
  signal: SignalRecord
): Promise<void> {
  const dedupeKey = `signal-review-${signal.id}`;
  if (await recommendationExists(orgId, dedupeKey)) return;

  await insertRecommendation({
    organization_id: orgId,
    prospect_id: signal.prospect_id,
    recommendation_type: "review_recent_signal",
    title: `Worth reviewing: ${signal.title}`,
    summary:
      "A meaningful external business signal was detected for this prospect's company.",
    reasoning:
      "Recent external activity MAY increase sales relevance. Review the signal and its evidence before acting — it is not proof of intent to buy.",
    evidence: [
      {
        type: "signal",
        label: `Signal: ${signal.signal_type}`,
        detail: signal.evidence ?? signal.description,
        sourceId: signal.id,
        retrievedAt: signal.retrieved_at,
      },
    ],
    priority: "medium",
    confidence:
      signal.confidence === "high" ? 70 : signal.confidence === "medium" ? 50 : 30,
    source_signal_ids: [signal.id],
    dedupe_key: dedupeKey,
    intelligence_updated_at: signal.detected_at,
  });
}

// ============================================================================
// Stage 7 Phase 2 — Trigger & Event Engine producer helper
// ============================================================================
// Fire-and-forget signal.detected emission. Never throws, never blocks
// detection. Event identity reuses the Stage 6 dedupe key so the same
// underlying signal can never produce two events.
// ============================================================================
function emitSignalEventSafe(input: {
  organizationId: string;
  signalRecord: SignalRecord;
}): void {
  import("@/features/intelligence/workflows/triggers/emit")
    .then(({ safeEmitWorkflowEvent }) =>
      safeEmitWorkflowEvent({
        eventType: "signal.detected",
        organizationId: input.organizationId,
        targetType: "signal",
        targetId: input.signalRecord.id,
        payload: {
          prospect_id: input.signalRecord.prospect_id ?? null,
          signal_id: input.signalRecord.id,
          signal_type: input.signalRecord.signal_type ?? null,
          signal_strength: input.signalRecord.importance ?? null,
          confidence: input.signalRecord.confidence ?? null,
          detected_at: input.signalRecord.detected_at ?? new Date().toISOString(),
        },
        dedupeKey: `signal.detected:${input.signalRecord.dedupe_key ?? input.signalRecord.id}`,
      })
    )
    .catch((err) => console.error("[signals] Event emission failed:", err));
}

// ============================================================================
// Batch Foundation (future background refresh)
// ============================================================================
// The service is designed so a future background job can call the same
// per-company operation over many prospects. Batch execution is ALWAYS
// server-side and bounded — never uncontrolled browser-side requests.
// ============================================================================

export async function detectExternalSignalsForCompanies(
  prospectIds: string[]
): Promise<SignalOperationResult[]> {
  const results: SignalOperationResult[] = [];
  // Bounded concurrency: process in small chunks to protect providers.
  const CHUNK = 3;
  for (let i = 0; i < prospectIds.length; i += CHUNK) {
    const chunk = prospectIds.slice(i, i + CHUNK);
    const chunkResults = await Promise.all(
      chunk.map((id) => detectSignalsForProspect(id, { runExternal: true }))
    );
    results.push(...chunkResults);
  }
  return results;
}

// ============================================================================
// Read Operations
// ============================================================================
/**
 * Returns recent signals for a prospect without running detection.
 * Used for cached display on page load. Returns [] when none exist.
 */
export async function getSignalsForProspectDisplay(
  prospectId: string
): Promise<SignalRecord[]> {
  try {
    const { orgId } = await getOrgAndUser();

    const supabase = await createClient();
    const { data: prospect } = await supabase
      .from("prospects")
      .select("id, organization_id, domain, website")
      .eq("id", prospectId)
      .single();

    if (!prospect || prospect.organization_id !== orgId) {
      return [];
    }

    // Company-level association: external signals are stored once per company.
    const companyKey = normalizeDomain(prospect.domain || prospect.website);

    return await getSignalsForProspect(prospectId, 20, companyKey);
  } catch {
    return [];
  }
}

/**
 * Returns recent signals for the user's workspace.
 * Used for a compact "Recent Signals" display.
 */
export async function getRecentSignalsForWorkspaceDisplay(
  limit = 10
): Promise<SignalRecord[]> {
  try {
    const { orgId: _orgId } = await getOrgAndUser();
    // RLS already scopes to the user's org. Verify membership is valid.
    return await getRecentSignalsForWorkspace(limit);
  } catch {
    return [];
  }
}

/**
 * Dismisses a signal (soft-hide from active feed).
 * RLS ensures workspace scoping.
 */
export async function dismissSignalForWorkspace(
  signalId: string
): Promise<boolean> {
  try {
    const { orgId } = await getOrgAndUser();

    const supabase = await createClient();
    const { data: signal } = await supabase
      .from("signals")
      .select("id, organization_id, status")
      .eq("id", signalId)
      .single();

    if (!signal || signal.organization_id !== orgId) {
      return false;
    }

    // Lifecycle guard: only signals whose current status legally allows
    // 'dismissed' may be dismissed (same rule as changeSignalStatusForWorkspace).
    if (!canTransitionSignalStatus(signal.status as SignalStatus, "dismissed")) {
      return false;
    }

    return await dismissSignal(signalId);
  } catch {
    return false;
  }
}

// ============================================================================
// Signals UX — filtered, paginated prospect signals (Feature 3 — Phase 3)
// ============================================================================
// The single server-side way for the Signals tab to retrieve signals connected
// to a prospect AND its company. Filters are translated here (never in UI
// components) using the canonical registry and centralized lifecycle logic.
// ============================================================================

import { queryProspectSignals } from "@/lib/db/signals";
import { getSignalTypesByCategory } from "./registry";
import { LIVE_SIGNAL_STATUSES, canTransitionSignalStatus } from "./lifecycle";
import type {
  SignalCategory,
  SignalStatus,
  SignalType,
} from "./types";
export type ProspectSignalSort = "newest" | "freshest" | "important";
export type ProspectSignalStatusFilter = "live" | "dismissed" | "all";
export type ProspectSignalFreshnessFilter =
  | "all"
  | "fresh"
  | "aging"
  | "expired";

export interface ProspectSignalsRequest {
  prospectId: string;
  /** Normalized company domain — includes the company's own signals. */
  companyKey?: string | null;
  category?: SignalCategory | "all";
  freshness?: ProspectSignalFreshnessFilter;
  status?: ProspectSignalStatusFilter;
  sort?: ProspectSignalSort;
  limit?: number;
  offset?: number;
}

export interface ProspectSignalsPage {
  rows: SignalRecord[];
  total: number;
  limit: number;
  offset: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function freshnessToRange(
  freshness: ProspectSignalFreshnessFilter
): { from: string | null; to: string | null } {
  if (freshness === "all") return { from: null, to: null };
  const now = Date.now();
  if (freshness === "fresh") {
    return { from: new Date(now - 7 * DAY_MS).toISOString(), to: null };
  }
  if (freshness === "aging") {
    return {
      from: new Date(now - 30 * DAY_MS).toISOString(),
      to: new Date(now - 7 * DAY_MS).toISOString(),
    };
  }
  return { from: null, to: new Date(now - 30 * DAY_MS).toISOString() };
}

/**
 * Paginated signal list for a prospect + its company. Sorting is applied
 * server-side ("important" uses a bounded recent window of 100 rows which the
 * client ranks by importance — never an unbounded fetch).
 */
export async function listProspectSignalsDisplay(
  request: ProspectSignalsRequest
): Promise<ProspectSignalsPage> {
  await getOrgAndUser();

  const category =
    request.category && request.category !== "all" ? request.category : null;
  const signalTypes: SignalType[] = category
    ? getSignalTypesByCategory(category)
    : [];

  const statuses: SignalStatus[] =
    request.status === "dismissed"
      ? ["dismissed"]
      : request.status === "all"
        ? []
        : [...LIVE_SIGNAL_STATUSES];

  const range = freshnessToRange(request.freshness ?? "all");
  const sort = request.sort ?? "newest";

  // Bounded window for importance ranking — never fetches whole history.
  const limit =
    sort === "important"
      ? Math.min(request.limit ?? 100, 100)
      : Math.min(request.limit ?? 20, 50);
  const offset = sort === "important" ? 0 : Math.max(request.offset ?? 0, 0);

  const result = await queryProspectSignals({
    prospectId: request.prospectId,
    companyKey: request.companyKey ?? null,
    statuses,
    signalTypes,
    occurredFrom: range.from,
    occurredTo: range.to,
    orderBy: sort === "freshest" ? "occurred_at" : "detected_at",
    ascending: false,
    limit,
    offset,
  });

  return {
    rows: result.rows,
    total: result.total,
    limit,
    offset,
  };
}

/**
 * Small summary for the Signals overview header. Bounded count queries —
 * no row payloads are transferred.
 */
export async function getProspectSignalsSummary(
  prospectId: string,
  companyKey: string | null
): Promise<{ total: number; fresh: number; highImportance: number }> {
  await getOrgAndUser();

  const now = Date.now();
  const base = {
    prospectId,
    companyKey,
    signalTypes: [] as SignalType[],
    statuses: [...LIVE_SIGNAL_STATUSES],
    occurredFrom: null,
    occurredTo: null,
    orderBy: "detected_at" as const,
    ascending: false,
    limit: 1,
    offset: 0,
  };

  const [total, fresh, supabase] = await Promise.all([
    queryProspectSignals(base),
    queryProspectSignals({
      ...base,
      occurredFrom: new Date(now - 7 * DAY_MS).toISOString(),
      occurredTo: null,
    }),
    createClient(),
  ]);

  let q = supabase
    .from("signals")
    .select("id", { count: "exact" })
    .in("importance", ["critical", "high"])
    .in("status", [...LIVE_SIGNAL_STATUSES]);
  q = companyKey
    ? q.or(`prospect_id.eq.${prospectId},company_key.eq.${companyKey}`)
    : q.eq("prospect_id", prospectId);
  const { count } = await q;

  return {
    total: total.total,
    fresh: fresh.total,
    highImportance: count ?? 0,
  };
}

/**
 * Applies a lifecycle-validated status change to a signal owned by the
 * caller's organization. Evidence rows are NEVER deleted — dismissed signals
 * stay auditable under the "Dismissed" filter.
 */
export async function changeSignalStatusForWorkspace(
  signalId: string,
  next: SignalStatus
): Promise<SignalRecord | null> {
  try {
    const { orgId } = await getOrgAndUser();
    const supabase = await createClient();

    const { data: signal } = await supabase
      .from("signals")
      .select("*")
      .eq("id", signalId)
      .single();

    if (!signal || signal.organization_id !== orgId) return null;
    if (!canTransitionSignalStatus(signal.status as SignalStatus, next)) {
      return null;
    }

    return await updateSignal(signalId, {
      status: next,
      updated_at: new Date().toISOString(),
    });
  } catch {
    return null;
  }
}
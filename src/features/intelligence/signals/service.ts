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
  insertSignal,
  signalExists,
  dismissSignal,
} from "@/lib/db/signals";
import { detectInternalActivitySignals } from "./internal-engine";
import { getSignalProvider, isExternalSignalDetectionConfigured } from "./provider";
import { validateAndFilterSignals, buildDedupeKey } from "./dedupe";
import type {
  SignalDetectionInput,
  SignalOperationResult,
  SignalRecord,
  SignalRecordInsert,
  SignalInput,
} from "./types";

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
    let signals: SignalInput[] = detectInternalActivitySignals(input);

    // === 2. External signals (only when provider is configured) ===
    const externalConfigured = isExternalSignalDetectionConfigured();
    const provider = getSignalProvider();

    if (options?.runExternal && provider && externalConfigured) {
      // Track external signal detection usage only when actually running.
      await trackUsage(orgId, userId, provider.id, "pending");
      try {
        const externalSignals = await provider.detectSignals(input);
        signals = [...signals, ...externalSignals];
        await trackUsage(orgId, userId, provider.id, "completed");
      } catch {
        await trackUsage(orgId, userId, provider.id, "failed");
        // Do not fail the entire operation — report as unavailable.
        return {
          status: "completed",
          message: "Internal activity signals recorded. External signal detection failed.",
          created: 0,
          duplicates: 0,
          provider: provider.id,
          externalConfigured: true,
        };
      }
    }

    // === 3. Validate & filter ===
    const validSignals = validateAndFilterSignals(signals);
    if (validSignals.length === 0) {
      return {
        status: "completed",
        message: "No new signals detected.",
        created: 0,
        duplicates: 0,
        provider: externalConfigured ? (provider?.id ?? null) : null,
        externalConfigured,
      };
    }

    // === 4. Deduplicate & insert ===
    let created = 0;
    let duplicates = 0;

    for (const signal of validSignals) {
      const dedupeKey = buildDedupeKey(signal);
      const exists = await signalExists(orgId, dedupeKey);
      if (exists) {
        duplicates++;
        continue;
      }

      const record: SignalRecordInsert = {
        organization_id: orgId,
        prospect_id: prospectId,
        signal_type: signal.signal_type,
        category: signal.category,
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
      };

      const inserted = await insertSignal(record);
      if (inserted) {
        created++;
        // Only genuinely important signals create notifications.
        await notifyHighImportanceSignal(orgId, signal, prospectId);
      }
    }

    return {
      status: "completed",
      message:
        created > 0
          ? `Recorded ${created} signal${created === 1 ? "" : "s"}.`
          : "No new signals were recorded.",
      created,
      duplicates,
      provider: externalConfigured ? (provider?.id ?? null) : null,
      externalConfigured,
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
      .select("id, organization_id")
      .eq("id", prospectId)
      .single();

    if (!prospect || prospect.organization_id !== orgId) {
      return [];
    }

    return await getSignalsForProspect(prospectId);
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
      .select("id, organization_id")
      .eq("id", signalId)
      .single();

    if (!signal || signal.organization_id !== orgId) {
      return false;
    }

    return await dismissSignal(signalId);
  } catch {
    return false;
  }
}
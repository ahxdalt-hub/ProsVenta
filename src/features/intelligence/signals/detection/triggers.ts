// ============================================================================
// Prosventa Signals — Detection Triggers (server-side)
// Feature 3 — Phase 2: Real Signal Detection
// ============================================================================
// Safe server-side entry points for running detection for ONE prospect, ONE
// company, or a bounded organization batch. Callable from:
//   - manual user action (UI, later phases)
//   - background job / future scheduler
//
// Authorization is ALWAYS resolved server-side from the authenticated user's
// organization membership; client-supplied ids are verified against that org.
// No unrestricted provider execution is exposed to normal users: org-scoped
// runs are bounded by batchSize and per-company cooldowns.
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import { recordIntelligenceUsage } from "@/lib/db/intelligence";
import { normalizeDomain } from "../../domain";
import { runDetectionForCompany } from "./engine";
import type { CompanyRunSummary } from "./engine";

const ORG_BATCH_LIMIT = 25;

interface AuthContext {
  orgId: string;
  userId: string;
}

async function getAuthContext(): Promise<AuthContext | null> {
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

  return { orgId: membership.organization_id as string, userId: user.id };
}

async function trackUsage(
  ctx: AuthContext,
  provider: string,
  status: "pending" | "completed" | "failed"
): Promise<void> {
  try {
    await recordIntelligenceUsage({
      organization_id: ctx.orgId,
      user_id: ctx.userId,
      operation: "signals",
      provider,
      status,
    });
  } catch (err) {
    console.error("[signals:detection] Usage tracking failed:", err);
  }
}

/**
 * Runs detection for ONE prospect. The prospect must belong to the caller's
 * organization (verified server-side) — cross-org ids are silently ignored.
 */
export async function runDetectionForProspect(
  prospectId: string
): Promise<Record<string, unknown>> {
  const ctx = await getAuthContext();
  if (!ctx) return { ok: false, reason: "auth" };

  const supabase = await createClient();
  const { data: prospect } = await supabase
    .from("prospects")
    .select("id, organization_id, company_name, domain, website")
    .eq("id", prospectId)
    .single();

  if (!prospect || prospect.organization_id !== ctx.orgId) {
    // Another org's prospect → indistinguishable from "not found".
    return { ok: false, reason: "not_found" };
  }

  await trackUsage(ctx, "signal-detection", "pending");
  try {
    const summary = await runDetectionForCompany({
      orgId: ctx.orgId,
      prospectId: prospect.id,
      domain: normalizeDomain(prospect.domain ?? prospect.website),
      companyName: prospect.company_name ?? null,
    });
    await trackUsage(ctx, "signal-detection", "completed");
    return { ok: true, ...summary } as Record<string, unknown>;
  } catch (error) {
    await trackUsage(ctx, "signal-detection", "failed");
    console.error("[signals:detection] Prospect run failed:", error);
    return { ok: false, reason: "provider_error" };
  }
}

/**
 * Bounded organization-wide run. Intended for background jobs and the future
 * scheduler — NOT exposed as an unrestricted user action.
 */
export async function runDetectionForOrganization(
  options: { batchSize?: number } = {}
): Promise<Record<string, unknown>> {
  const ctx = await getAuthContext();
  if (!ctx) return { ok: false, reason: "auth" };

  const limit = Math.min(Math.max(1, options.batchSize ?? 10), ORG_BATCH_LIMIT);
  const supabase = await createClient();
  const { data: prospects } = await supabase
    .from("prospects")
    .select("id, company_name, domain, website")
    .eq("organization_id", ctx.orgId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  const results: CompanyRunSummary[] = [];
  // Bounded concurrency protects providers (mirrors Phase 1 chunking).
  const CHUNK = 3;
  for (let i = 0; i < (prospects?.length ?? 0); i += CHUNK) {
    const chunk = prospects!.slice(i, i + CHUNK);
    const chunkResults = await Promise.all(
      chunk.map((p) =>
        runDetectionForCompany({
          orgId: ctx.orgId,
          prospectId: p.id,
          domain: normalizeDomain(p.domain ?? p.website),
          companyName: p.company_name ?? null,
        })
      )
    );
    results.push(...chunkResults);
  }

  return { ok: true, processed: results.length, results };
}

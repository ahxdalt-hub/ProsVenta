// ============================================================================
// Prosventa Enrichment — Server Service
// Feature 2: Enrichment - Phase 1 of 4
// ============================================================================
// THE single server-side entry point for prospect enrichment:
//
//   UI / future phases → enrichProspect() → existing hardened flows
//
// This is a FACADE over Prosventa's already-hardened enrichment services
// (person-enrichment, company-enrichment) — it deliberately does NOT
// re-implement provider calls, retries, freshness, or job management. It adds
// the Phase-1 foundation on top of them:
//
//   - Session-resolved organization + explicit prospect ownership check
//     (never trusts client-supplied organization IDs)
//   - One normalized request/response contract (EnrichmentRequest/Result)
//   - Idempotency-key computation for duplicate-request protection
//   - Structured error categorization
//
// Security model:
//   - Provider credentials stay in server-side env vars (inside adapters)
//   - No NEXT_PUBLIC_* values anywhere in this path
//   - Credits are NOT charged here; the underlying services record measurable
//     usage and the CreditService reserve/consume/release boundary already
//     exists for when final pricing lands (Phase 2+ wiring only).
// ============================================================================
"use server";

import { createClient } from "@/lib/supabase/server";
import { enrichPersonForProspect } from "@/features/intelligence/person-enrichment/service";
import { enrichCompanyForProspect } from "@/features/intelligence/company-enrichment/service";
import { buildEnrichmentIdempotencyKey } from "./idempotency";
import { classifyEnrichmentError } from "./operations";
import {
  cleanDomain,
  collectReturnedFields,
  isPartialResponse,
  normalizeEnrichmentPayload,
} from "./normalize";
import type {
  EnrichmentRequest,
  EnrichmentResult,
  NormalizedEnrichmentResponse,
} from "./types";

/** Client-safe failure helper — structured message, no internals. */
function failedResult(message: string): EnrichmentResult {
  return {
    status: "failed",
    message,
    provider: null,
    response: null,
    fieldsReturned: [],
    warnings: [],
  };
}

/**
 * Resolves the caller's authenticated identity + organization membership.
 * The organization is ALWAYS derived from the session — never from input.
 */
async function resolveSession(): Promise<
  { ok: true; userId: string; organizationId: string } | { ok: false }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();
  if (!membership) return { ok: false };

  return { ok: true, userId: user.id, organizationId: membership.organization_id };
}

interface ProspectRow {
  id: string;
  company_name: string | null;
  website: string | null;
  domain: string | null;
}

/**
 * Loads the prospect scoped to the caller's organization. RLS additionally
 * enforces isolation; this explicit org filter is defense-in-depth so an
 * enrichment result can never be attached to another organization's prospect.
 */
async function loadOwnedProspect(
  supabase: Awaited<ReturnType<typeof createClient>>,
  prospectId: string,
  organizationId: string
): Promise<ProspectRow | null> {
  const { data } = await supabase
    .from("prospects")
    .select("id, company_name, website, domain")
    .eq("id", prospectId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  return (data as ProspectRow) ?? null;
}

function deriveDomainInput(prospect: ProspectRow): string | null {
  return (
    cleanDomain(prospect.domain) ??
    cleanDomain(prospect.website) ??
    // Fall back to exact company name — the company-enrichment flow accepts
    // a name-based identifier and resolves it itself.
    (prospect.company_name?.trim() || null)
  );
}

/**
 * THE normalized enrichment entry point. Accepts a Prosventa request (never
 * provider-specific parameters), verifies authorization server-side, and
 * delegates to the existing hardened person/company enrichment flows.
 */
export async function enrichProspect(
  request: EnrichmentRequest
): Promise<EnrichmentResult> {
  const session = await resolveSession();
  if (!session.ok) {
    return failedResult("Please sign in to enrich prospects.");
  }

  const supabase = await createClient();
  const prospect = await loadOwnedProspect(
    supabase,
    request.prospectId,
    session.organizationId
  );
  if (!prospect) {
    return failedResult("Prospect not found in your organization.");
  }

  const requestedFields = request.fields ?? [];
  const startedAt = Date.now();

  try {
    if (request.operation === "company_enrichment") {
      const domainInput = deriveDomainInput(prospect);
      if (!domainInput) {
        return failedResult(
          "This prospect has no company domain or name to enrich against."
        );
      }

      const result = await enrichCompanyForProspect(prospect.id, domainInput);

      const response: NormalizedEnrichmentResponse | null = result.data
        ? normalizeEnrichmentPayload(
            result.data as unknown as Record<string, unknown>,
            {
              provider: result.provider,
              retrievedAt: result.enrichedAt,
              confidence: result.confidence,
              warnings: result.warnings,
            }
          )
        : null;

      const status: EnrichmentResult["status"] = result.alreadyInProgress
        ? "already_in_progress"
        : result.usedCached
          ? "used_cached"
          : result.status === "completed"
            ? result.partial || (response !== null && isPartialResponse(response))
              ? "partial"
              : "completed"
            : "failed";

      return {
        status,
        message: result.message,
        provider: result.provider ?? null,
        response,
        fieldsReturned: response
          ? collectReturnedFields(response, requestedFields)
          : [],
        warnings: result.warnings ?? [],
      };
    }

    // ---- prospect_enrichment (person/contact) -------------------------------
    const result = await enrichPersonForProspect(prospect.id);

    const response: NormalizedEnrichmentResponse | null = result.data
      ? normalizeEnrichmentPayload(
          result.data as unknown as Record<string, unknown>,
          {
            provider: result.provider,
            retrievedAt: result.enrichedAt,
            warnings: result.warnings ?? [],
          }
        )
      : null;

    const status: EnrichmentResult["status"] = result.alreadyInProgress
      ? "already_in_progress"
      : result.usedCached
        ? "used_cached"
        : result.status === "completed"
          ? (result.warnings?.length ?? 0) > 0 || (response !== null && isPartialResponse(response))
            ? "partial"
            : "completed"
          : "failed";

    return {
      status,
      message: result.message,
      provider: result.provider ?? null,
      response,
      fieldsReturned: response
        ? collectReturnedFields(response, requestedFields)
        : [],
      warnings: result.warnings ?? [],
    };
  } catch (error) {
    // Structured categorization for observability/metadata. Raw errors never
    // reach the caller; nothing here throws to the UI layer.
    const category = classifyEnrichmentError(
      error instanceof Error && "code" in error
        ? String((error as { code: unknown }).code)
        : null
    );
    console.error(
      `[enrichment] enrichProspect failed ` +
        `{ org: ${session.organizationId}, user: ${session.userId}, ` +
        `prospect: ${request.prospectId}, operation: ${request.operation}, ` +
        `category: ${category}, durationMs: ${Date.now() - startedAt} }`
    );
    return failedResult("Enrichment could not be completed. Please try again.");
  }
}

/**
 * Computes the server-side idempotency key for one logical enrichment
 * operation. Exposed so Phase 2 job/batch flows persist it on
 * intelligence_jobs (unique index) without duplicating the logic.
 */
export async function getEnrichmentIdempotencyKey(params: {
  prospectId: string;
  provider: string;
}): Promise<string> {
  const session = await resolveSession();
  // Key contains no secrets; unauthorized callers simply cannot act on it.
  return buildEnrichmentIdempotencyKey({
    prospectId: params.prospectId,
    operation: "prospect_enrichment",
    provider: params.provider,
    scope: session.ok ? session.organizationId : "anonymous",
  });
}
// NOTE: Do NOT re-export types from this "use server" module. Next.js sweeps
// every module-scope export of a server module into its server-action map, so a
// type-only re-export (e.g. `export type { EnrichableField }`) gets registered
// as a runtime server reference even though the binding is erased at compile
// time → `ReferenceError: EnrichableField is not defined` crashes client
// consumers of this module. EnrichableField stays available through the
// @/features/enrichment barrel (index.ts), which re-exports it from ./types.


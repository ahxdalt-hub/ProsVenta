// ============================================================================
// Prosventa Intelligence Provider Resolution (Organization-Aware)
// Stage 6 - Phase 1: Data Provider & Enrichment Foundation
// ============================================================================
// Server-side resolution order for which provider an organization uses:
//
//   1. Explicit providerId argument (internal callers / tests)
//   2. Organization-level configuration (organization_provider_configs)
//   3. Environment default (INTELLIGENCE_*_PROVIDER)
//
// The orgId MUST come from the caller's authenticated membership
// (see getOrgAndUser in service.ts). RLS guarantees one organization can
// never read another organization's configuration.
// API keys are NEVER resolved here — they stay in server-side env vars.
// ============================================================================

import type { ProviderKind } from "../config";
import { getOrganizationProviderConfig } from "@/lib/db/intelligence";

/**
 * Resolves the effective provider id for an organization and kind.
 * Prefers explicit override → org config → environment default.
 */
export async function resolveProviderIdForOrg(
  orgId: string,
  kind: ProviderKind,
  options?: { providerId?: string | null }
): Promise<string | null> {
  if (options?.providerId?.trim()) return options.providerId.trim();

  const orgConfig = await getOrganizationProviderConfig(orgId, kind);
  if (orgConfig && orgConfig.enabled && orgConfig.provider_id.trim()) {
    return orgConfig.provider_id.trim();
  }

  switch (kind) {
    case "company_enrichment":
      return process.env.INTELLIGENCE_COMPANY_PROVIDER?.trim() || null;
    case "prospect_enrichment":
      return process.env.INTELLIGENCE_PROSPECT_PROVIDER?.trim() || null;
    case "research":
      return process.env.COMPANY_RESEARCH_PROVIDER?.trim() || null;
    default:
      return null;
  }
}
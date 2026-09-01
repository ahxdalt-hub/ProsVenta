// ============================================================================
// Prosventa Find Matching Leads — Discovery Defaults
// ============================================================================
// Pure derivation of search-control defaults from an ActiveIcpSummary.
// Server-safe by design: no React hooks, no browser APIs, no client modules.
// Imported by the server page (find-leads/page.tsx) to precompute defaults,
// and reused by the client workspace — one canonical implementation.
// ============================================================================

import type { ActiveIcpSummary } from "./icp-summary";

export interface DiscoveryDefaults {
  industry: string;
  location: string;
  companySize: string;
  role: string;
}

export function deriveDiscoveryDefaults(icp: ActiveIcpSummary | null): DiscoveryDefaults {
  if (!icp) return { industry: "", location: "", companySize: "", role: "" };
  return {
    industry: icp.industries?.split(",")[0]?.trim() ?? "",
    location: icp.countries?.split(",")[0]?.trim() ?? "",
    companySize: icp.companySizes?.split(",")[0]?.trim() ?? "",
    role: icp.roles?.split(",")[0]?.trim() ?? "",
  };
}

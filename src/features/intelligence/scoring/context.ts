// ============================================================================
// Prosventa Scoring Context Builder
// ============================================================================
// Gathers available prospect + company data from existing Prosventa data for
// the deterministic scoring engine. Uses the strongest available information.
// Does NOT call external providers. Plain server module — not an action.
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import { getCompanyEnrichment, getProspectEnrichment } from "@/lib/db/intelligence";
import { getCompanyResearch } from "@/lib/db/company-research";
import { getProspectResearch } from "@/lib/db/prospect-research";
import { normalizeDomain } from "../domain";
import { cleanValue } from "../quality/values";
import type { ProspectScoringContext } from "./types";

export async function buildScoringContext(
  prospectId: string,
  orgId: string
): Promise<ProspectScoringContext> {
  const supabase = await createClient();

  // Resolve the prospect server-side to verify workspace authorization.
  const { data: prospect } = await supabase
    .from("prospects")
    .select(
      "id, organization_id, company_name, name, website, domain, industry, description, employee_count, city, country, location, contact_name, contact_email"
    )
    .eq("id", prospectId)
    .single();

  if (!prospect) {
    throw new Error("Prospect not found.");
  }

  // Verify the prospect belongs to the authenticated user's org.
  if (prospect.organization_id !== orgId) {
    throw new Error("Prospect does not belong to this workspace.");
  }

  const domain = normalizeDomain(prospect.domain || prospect.website) ?? null;

  // Load company enrichment data when available.
  let companyEnrichment: Record<string, unknown> | null = null;
  let hasCompanyEnrichment = false;
  if (domain) {
    const enrichmentRecord = await getCompanyEnrichment(prospectId, domain);
    if (enrichmentRecord?.status === "completed" && enrichmentRecord.data) {
      companyEnrichment = enrichmentRecord.data as unknown as Record<string, unknown>;
      hasCompanyEnrichment = true;
    }
  }

  // Load prospect enrichment data when available.
  let prospectEnrichment: Record<string, unknown> | null = null;
  let hasProspectEnrichment = false;
  const prospectEnrichmentRecord = await getProspectEnrichment(prospectId);
  if (prospectEnrichmentRecord?.status === "completed" && prospectEnrichmentRecord.data) {
    prospectEnrichment = prospectEnrichmentRecord.data as unknown as Record<string, unknown>;
    hasProspectEnrichment = true;
  }

  // Load company research when available.
  let hasCompanyResearch = false;
  if (domain) {
    const researchRecord = await getCompanyResearch(prospectId, domain);
    if (researchRecord?.status === "completed" && researchRecord.result) {
      hasCompanyResearch = true;
    }
  }

  // Load prospect research when available.
  let hasProspectResearch = false;
  const prospectResearchRecord = await getProspectResearch(prospectId);
  if (prospectResearchRecord?.status === "completed" && prospectResearchRecord.result) {
    hasProspectResearch = true;
  }

  // Derive company data — every string passes through the quality layer's
  // value cleaner so placeholders ("N/A", "-") can never influence ICP
  // scoring. Customer-entered prospect fields keep priority as before.
  const company = {
    industry:
      cleanValue(prospect.industry) ??
      cleanValue(companyEnrichment?.industry as string | null) ?? null,
    employeeCount: prospect.employee_count ?? (companyEnrichment?.employeeCount as number | null) ?? null,
    employeeRange: cleanValue(companyEnrichment?.employeeRange as string | null),
    country:
      cleanValue(prospect.country) ??
      cleanValue(companyEnrichment?.country as string | null) ?? null,
    companyType: cleanValue(companyEnrichment?.companyType as string | null),
    technologies: Array.isArray(companyEnrichment?.technologies)
      ? (companyEnrichment.technologies as string[])
          .map((t) => cleanValue(t))
          .filter((t): t is string => t !== null)
      : [],
    businessModel: cleanValue(companyEnrichment?.businessModel as string | null),
  };

  // Derive prospect data (same normalization guarantee).
  const prospectData = {
    jobTitle: cleanValue(prospectEnrichment?.jobTitle as string | null),
    department: cleanValue(prospectEnrichment?.department as string | null),
    seniority: cleanValue(prospectEnrichment?.seniority as string | null),
    location:
      cleanValue(prospect.location) ??
      cleanValue(prospectEnrichment?.location as string | null) ?? null,
    country:
      cleanValue(prospect.country) ??
      cleanValue(prospectEnrichment?.country as string | null) ?? null,
    city:
      cleanValue(prospect.city) ??
      cleanValue(prospectEnrichment?.city as string | null) ?? null,
  };

  return {
    prospectId,
    organizationId: orgId,
    company,
    prospect: prospectData,
    hasCompanyEnrichment,
    hasProspectEnrichment,
    hasCompanyResearch,
    hasProspectResearch,
  };
}
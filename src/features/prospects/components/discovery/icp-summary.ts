// ============================================================================
// Prosventa Find Matching Leads — ICP Summary
// ============================================================================
// Pure helpers that translate an IcpConfiguration into human-readable summary
// data for the Find Matching Leads page. No raw database JSON is exposed.
// ============================================================================

import type { IcpConfiguration, IcpCriteria } from "@/features/intelligence/scoring/types";

export interface ActiveIcpSummary {
  id: string;
  name: string;
  description: string | null;
  /** "SaaS, Fintech" style joined lists — only non-empty criteria included. */
  industries: string | null;
  countries: string | null;
  companySizes: string | null;
  roles: string | null;
  seniorityLevels: string | null;
  technologies: string | null;
  employeeRange: string | null;
  /** Number of distinct criteria dimensions configured (for context hints). */
  criteriaCount: number;
}

function joinList(values: string[]): string | null {
  const cleaned = values.map((v) => v.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned.join(", ") : null;
}

export function summarizeIcpCriteria(
  config: Pick<IcpConfiguration, "id" | "name" | "description" | "criteria">
): ActiveIcpSummary {
  const c: IcpCriteria = config.criteria;
  const employeeRange =
    c.company.minEmployees != null || c.company.maxEmployees != null
      ? `${c.company.minEmployees ?? 0}–${c.company.maxEmployees ?? "any"} employees`
      : null;

  const dimensions = [
    joinList(c.company.targetIndustries),
    joinList(c.company.targetCountries),
    joinList(c.company.targetCompanySizes),
    employeeRange,
    joinList(c.prospect.targetJobTitles),
    joinList(c.prospect.targetSeniorityLevels),
    joinList(c.company.targetTechnologies),
  ].filter(Boolean).length;

  return {
    id: config.id,
    name: config.name,
    description: config.description,
    industries: joinList(c.company.targetIndustries),
    countries: joinList(c.company.targetCountries),
    companySizes: joinList(c.company.targetCompanySizes),
    roles: joinList(c.prospect.targetJobTitles),
    seniorityLevels: joinList(c.prospect.targetSeniorityLevels),
    technologies: joinList(c.company.targetTechnologies),
    employeeRange,
    criteriaCount: dimensions,
  };
}

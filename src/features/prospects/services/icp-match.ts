// ============================================================================
// Prosventa Discovery ICP Match Scoring (server-safe, deterministic)
// Stage 2 — Phase 8: Real Lead Discovery
// ============================================================================
// First version of Prosventa's explainable matching logic. Every score is
// composed of named factors with match/partial/unavailable statuses so users
// understand WHY a lead matched. Deterministic by design — AI scoring can be
// layered in later without changing this contract.
// ============================================================================

import type {
  LeadMatchScore,
  MatchFactor,
  NormalizedLead,
} from "@/features/prospects/types/discovery";
import { getScoreCategory } from "@/features/intelligence/scoring/types";
import type { IcpCriteria } from "@/features/intelligence/scoring/types";

// Weights sum to 100 so the score reads directly as a fit percentage.
const WEIGHTS = {
  industry: 25,
  location: 20,
  companySize: 20,
  jobTitle: 20,
  seniority: 15,
} as const;

function norm(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/** Substring containment in either direction ("saas" matches "saas platforms"). */
function fuzzyIncludes(a: string, b: string): boolean {
  return a.includes(b) || b.includes(a);
}

function anyMatch(values: string[], candidates: string[]): string | null {
  for (const candidate of candidates) {
    const c = norm(candidate);
    if (!c) continue;
    for (const value of values) {
      const v = norm(value);
      if (!v) continue;
      if (fuzzyIncludes(v, c)) return candidate;
    }
  }
  return null;
}

function employeeRangeForSize(size: string): [number, number] | null {
  const m = /^(\d+)\s*[-–+]?\s*(\d*)$/.exec(size.trim());
  if (!m) return null;
  return [parseInt(m[1], 10), m[2] ? parseInt(m[2], 10) : Number.MAX_SAFE_INTEGER];
}

export function scoreLeadAgainstIcp(
  lead: NormalizedLead,
  criteria: IcpCriteria | null
): LeadMatchScore {
  if (!criteria) {
    return {
      score: 0,
      category: getScoreCategory(0),
      factors: [{ label: "ICP", status: "unavailable", detail: "No active ICP configured." }],
    };
  }

  const factors: MatchFactor[] = [];
  let score = 0;

  // ---- Industry -------------------------------------------------------------
  const icpIndustries = criteria.company.targetIndustries;
  if (icpIndustries.length === 0) {
    factors.push({ label: "Industry", status: "unavailable", detail: "No target industries in your ICP." });
  } else if (!lead.industry) {
    factors.push({ label: "Industry", status: "unavailable", detail: "Industry information unavailable." });
  } else {
    const hit = anyMatch([lead.industry], icpIndustries);
    if (hit) {
      score += WEIGHTS.industry;
      factors.push({ label: "Industry", status: "match", detail: lead.industry });
    } else {
      factors.push({ label: "Industry", status: "partial", detail: `${lead.industry} differs from your targets` });
    }
  }

  // ---- Location ---------------------------------------------------------------
  const icpCountries = criteria.company.targetCountries;
  if (icpCountries.length === 0) {
    factors.push({ label: "Location", status: "unavailable", detail: "No target locations in your ICP." });
  } else if (!lead.location) {
    factors.push({ label: "Location", status: "unavailable", detail: "Location information unavailable." });
  } else {
    const hit = anyMatch([lead.location], icpCountries);
    if (hit) {
      score += WEIGHTS.location;
      factors.push({ label: "Location", status: "match", detail: lead.location });
    } else {
      factors.push({ label: "Location", status: "partial", detail: `${lead.location} is outside your targets` });
    }
  }

  // ---- Company size ------------------------------------------------------------
  const sizeTargets = criteria.company.targetCompanySizes;
  const hasEmployeeBounds =
    criteria.company.minEmployees != null || criteria.company.maxEmployees != null;
  const employeeCount = lead.employeeCount;

  if (sizeTargets.length === 0 && !hasEmployeeBounds) {
    factors.push({ label: "Company size", status: "unavailable", detail: "No size range in your ICP." });
  } else if (employeeCount == null) {
    factors.push({ label: "Company size", status: "unavailable", detail: "Company size information unavailable." });
  } else {
    let sizeMatch = false;
    if (hasEmployeeBounds) {
      const min = criteria.company.minEmployees ?? 0;
      const max = criteria.company.maxEmployees ?? Number.MAX_SAFE_INTEGER;
      sizeMatch = employeeCount >= min && employeeCount <= max;
    } else {
      for (const target of sizeTargets) {
        const range = employeeRangeForSize(target);
        if (range && employeeCount >= range[0] && employeeCount <= range[1]) {
          sizeMatch = true;
          break;
        }
      }
    }
    if (sizeMatch) {
      score += WEIGHTS.companySize;
      factors.push({ label: "Company size", status: "match", detail: `${employeeCount.toLocaleString()} employees` });
    } else {
      factors.push({
        label: "Company size",
        status: "partial",
        detail: `${employeeCount.toLocaleString()} employees is outside your range`,
      });
    }
  }

  // ---- Role / title ----------------------------------------------------------------
  const icpTitles = criteria.prospect.targetJobTitles;
  if (icpTitles.length === 0) {
    factors.push({ label: "Role", status: "unavailable", detail: "No target roles in your ICP." });
  } else if (!lead.jobTitle) {
    factors.push({ label: "Role", status: "unavailable", detail: "No contact title available." });
  } else {
    const hit = anyMatch([lead.jobTitle], icpTitles);
    if (hit) {
      score += WEIGHTS.jobTitle;
      factors.push({ label: "Role", status: "match", detail: lead.jobTitle });
    } else {
      factors.push({ label: "Role", status: "partial", detail: `${lead.jobTitle} is outside your target roles` });
    }
  }

  // ---- Seniority ----------------------------------------------------------------------
  const icpSeniority = criteria.prospect.targetSeniorityLevels;
  if (icpSeniority.length === 0) {
    factors.push({ label: "Seniority", status: "unavailable", detail: "No seniority levels in your ICP." });
  } else if (!lead.jobTitle) {
    factors.push({ label: "Seniority", status: "unavailable", detail: "Seniority information unavailable." });
  } else {
    const hit = anyMatch([lead.jobTitle], icpSeniority);
    if (hit) {
      score += WEIGHTS.seniority;
      factors.push({ label: "Seniority", status: "match", detail: hit });
    } else {
      factors.push({ label: "Seniority", status: "unavailable", detail: "Could not determine seniority" });
    }
  }

  return { score: Math.round(score), category: getScoreCategory(score), factors };
}

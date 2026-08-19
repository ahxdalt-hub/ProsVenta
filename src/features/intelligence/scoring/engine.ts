// ============================================================================
// Prosventa Smart Lead & ICP Scoring — Deterministic Engine
// Stage 4 — Phase 6: Smart Lead & ICP Scoring
// ============================================================================
// A fully deterministic, explainable ICP scoring engine.
// No AI is used for simple comparisons — every factor has a name, score,
// maximum, reason, and evidence. Missing data never auto-penalizes a prospect;
// instead it's marked as "unknown" and lowers confidence.
// ============================================================================

import type {
  CompanyScoringData,
  IcpCriteria,
  ProspectScoringData,
  ProspectScoringContext,
  ScoringFactor,
} from "./types";

// ============================================================================
// Scoring Weights (configurable in code)
// ============================================================================

export interface ScoringWeights {
  /** Company fit weight (0-1) */
  companyWeight: number;
  /** Prospect fit weight (0-1) */
  prospectWeight: number;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  companyWeight: 0.6,
  prospectWeight: 0.4,
};

// ============================================================================
// Helpers
// ============================================================================

function ci(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

function includesCIMatch(value: string | null | undefined, list: string[]): boolean {
  const v = ci(value);
  if (!v) return false;
  return list.some((item) => ci(item) === v);
}

function includesSubstringMatch(value: string | null | undefined, list: string[]): boolean {
  const v = ci(value);
  if (!v) return false;
  return list.some((item) => {
    const i = ci(item);
    return i.length > 0 && v.includes(i);
  });
}

function matchesEmployeeRange(employeeCount: number | null, ranges: string[]): boolean {
  if (employeeCount === null || employeeCount === undefined) return false;
  const count = employeeCount;
  return ranges.some((range) => {
    const r = range.trim().toLowerCase();
    if (r === "1-10") return count >= 1 && count <= 10;
    if (r === "11-50") return count >= 11 && count <= 50;
    if (r === "51-200") return count >= 51 && count <= 200;
    if (r === "201-500") return count >= 201 && count <= 500;
    if (r === "501-1000") return count >= 501 && count <= 1000;
    if (r === "1001-5000") return count >= 1001 && count <= 5000;
    if (r === "5001+") return count >= 5001;
    return false;
  });
}

// ============================================================================
// Company Fit Factors
// ============================================================================

function scoreIndustry(criteria: IcpCriteria, data: CompanyScoringData): ScoringFactor {
  const max = 20;
  if (!data.industry) {
    return { name: "Industry", score: 0, maxScore: max, reason: "Industry is unknown.", status: "unknown", evidence: null };
  }
  if (includesCIMatch(data.industry, criteria.company.excludedIndustries)) {
    return {
      name: "Industry",
      score: 0,
      maxScore: max,
      reason: `Industry "${data.industry}" is excluded by the ICP.`,
      status: "mismatch",
      evidence: data.industry,
    };
  }
  if (includesCIMatch(data.industry, criteria.company.targetIndustries)) {
    return {
      name: "Industry",
      score: max,
      maxScore: max,
      reason: `Company industry matches the selected target industry "${data.industry}".`,
      status: "match",
      evidence: data.industry,
    };
  }
  return {
    name: "Industry",
    score: 0,
    maxScore: max,
    reason: `Company industry "${data.industry}" is not in the target industries.`,
    status: "mismatch",
    evidence: data.industry,
  };
}

function scoreCompanySize(criteria: IcpCriteria, data: CompanyScoringData): ScoringFactor {
  const max = 15;
  if (data.employeeCount === null && !data.employeeRange) {
    return { name: "Company size", score: 0, maxScore: max, reason: "Company size is unknown.", status: "unknown", evidence: null };
  }
  const count = data.employeeCount;
  const range = data.employeeRange;

  if (criteria.company.minEmployees !== null || criteria.company.maxEmployees !== null) {
    const min = criteria.company.minEmployees ?? 0;
    const maxCount = criteria.company.maxEmployees ?? Number.MAX_SAFE_INTEGER;
    if (count !== null && count >= min && count <= maxCount) {
      return {
        name: "Company size",
        score: max,
        maxScore: max,
        reason: `Company has ${count} employees, within target range ${min}–${maxCount === Number.MAX_SAFE_INTEGER ? "∞" : maxCount}.`,
        status: "match",
        evidence: String(count),
      };
    }
    if (count !== null) {
      return {
        name: "Company size",
        score: 0,
        maxScore: max,
        reason: `Company has ${count} employees, outside target range.`,
        status: "mismatch",
        evidence: String(count),
      };
    }
  }

  if (criteria.company.targetCompanySizes.length > 0) {
    if (count !== null && matchesEmployeeRange(count, criteria.company.targetCompanySizes)) {
      return {
        name: "Company size",
        score: max,
        maxScore: max,
        reason: `Company size (${count} employees) matches a target size range.`,
        status: "match",
        evidence: String(count),
      };
    }
    if (range && includesCIMatch(range, criteria.company.targetCompanySizes)) {
      return {
        name: "Company size",
        score: max,
        maxScore: max,
        reason: `Company size range "${range}" matches a target size range.`,
        status: "match",
        evidence: range,
      };
    }
    return {
      name: "Company size",
      score: 0,
      maxScore: max,
      reason: count !== null
        ? `Company has ${count} employees, not in a target size range.`
        : `Company size range "${range}" is not in the target ranges.`,
      status: "mismatch",
      evidence: count !== null ? String(count) : range,
    };
  }

  return { name: "Company size", score: 0, maxScore: max, reason: "No company size criteria configured.", status: "unknown", evidence: null };
}

function scoreGeography(criteria: IcpCriteria, data: CompanyScoringData): ScoringFactor {
  const max = 15;
  if (!data.country) {
    return { name: "Target geography", score: 0, maxScore: max, reason: "Company country is unknown.", status: "unknown", evidence: null };
  }
  if (criteria.company.targetCountries.length === 0) {
    return { name: "Target geography", score: 0, maxScore: max, reason: "No target geography configured.", status: "unknown", evidence: null };
  }
  if (includesCIMatch(data.country, criteria.company.targetCountries)) {
    return {
      name: "Target geography",
      score: max,
      maxScore: max,
      reason: `Company country "${data.country}" matches a target country.`,
      status: "match",
      evidence: data.country,
    };
  }
  return {
    name: "Target geography",
    score: 0,
    maxScore: max,
    reason: `Company country "${data.country}" is not in the target countries.`,
    status: "mismatch",
    evidence: data.country,
  };
}

function scoreCompanyType(criteria: IcpCriteria, data: CompanyScoringData): ScoringFactor {
  const max = 5;
  if (!data.companyType) {
    return { name: "Company type", score: 0, maxScore: max, reason: "Company type is unknown.", status: "unknown", evidence: null };
  }
  if (criteria.company.targetCompanyTypes.length === 0) {
    return { name: "Company type", score: 0, maxScore: max, reason: "No target company types configured.", status: "unknown", evidence: null };
  }
  if (includesCIMatch(data.companyType, criteria.company.targetCompanyTypes)) {
    return {
      name: "Company type",
      score: max,
      maxScore: max,
      reason: `Company type "${data.companyType}" matches a target type.`,
      status: "match",
      evidence: data.companyType,
    };
  }
  return {
    name: "Company type",
    score: 0,
    maxScore: max,
    reason: `Company type "${data.companyType}" is not a target type.`,
    status: "mismatch",
    evidence: data.companyType,
  };
}

function scoreTechnologies(criteria: IcpCriteria, data: CompanyScoringData): ScoringFactor {
  const max = 5;
  if (criteria.company.targetTechnologies.length === 0) {
    return { name: "Technologies", score: 0, maxScore: max, reason: "No target technologies configured.", status: "unknown", evidence: null };
  }
  if (data.technologies.length === 0) {
    return { name: "Technologies", score: 0, maxScore: max, reason: "Company technologies are unknown.", status: "unknown", evidence: null };
  }
  const matched = data.technologies.filter((t: string) => includesCIMatch(t, criteria.company.targetTechnologies));
  if (matched.length > 0) {
    return {
      name: "Technologies",
      score: max,
      maxScore: max,
      reason: `Company uses target technology: ${matched.join(", ")}.`,
      status: "match",
      evidence: matched.join(", "),
    };
  }
  return {
    name: "Technologies",
    score: 0,
    maxScore: max,
    reason: "Company does not use any target technologies.",
    status: "mismatch",
    evidence: data.technologies.join(", "),
  };
}

function scoreBusinessModel(criteria: IcpCriteria, data: CompanyScoringData): ScoringFactor {
  const max = 5;
  if (!data.businessModel) {
    return { name: "Business model", score: 0, maxScore: max, reason: "Business model is unknown.", status: "unknown", evidence: null };
  }
  if (criteria.company.targetBusinessModels.length === 0) {
    return { name: "Business model", score: 0, maxScore: max, reason: "No target business models configured.", status: "unknown", evidence: null };
  }
  if (includesSubstringMatch(data.businessModel, criteria.company.targetBusinessModels)) {
    return {
      name: "Business model",
      score: max,
      maxScore: max,
      reason: `Business model "${data.businessModel}" matches a target.`,
      status: "match",
      evidence: data.businessModel,
    };
  }
  return {
    name: "Business model",
    score: 0,
    maxScore: max,
    reason: `Business model "${data.businessModel}" is not a target.`,
    status: "mismatch",
    evidence: data.businessModel,
  };
}

// ============================================================================
// Prospect Fit Factors
// ============================================================================

function scoreJobTitle(criteria: IcpCriteria, data: ProspectScoringData): ScoringFactor {
  const max = 20;
  if (!data.jobTitle) {
    return { name: "Job title", score: 0, maxScore: max, reason: "Job title is unknown.", status: "unknown", evidence: null };
  }
  if (includesSubstringMatch(data.jobTitle, criteria.prospect.excludedRoles)) {
    return {
      name: "Job title",
      score: 0,
      maxScore: max,
      reason: `Job title "${data.jobTitle}" matches an excluded role.`,
      status: "mismatch",
      evidence: data.jobTitle,
    };
  }
  if (criteria.prospect.targetJobTitles.length === 0) {
    return { name: "Job title", score: 0, maxScore: max, reason: "No target job titles configured.", status: "unknown", evidence: null };
  }
  if (includesSubstringMatch(data.jobTitle, criteria.prospect.targetJobTitles)) {
    return {
      name: "Job title",
      score: max,
      maxScore: max,
      reason: `Job title "${data.jobTitle}" matches a target role.`,
      status: "match",
      evidence: data.jobTitle,
    };
  }
  return {
    name: "Job title",
    score: 0,
    maxScore: max,
    reason: `Job title "${data.jobTitle}" does not match a target role.`,
    status: "mismatch",
    evidence: data.jobTitle,
  };
}

function scoreDepartment(criteria: IcpCriteria, data: ProspectScoringData): ScoringFactor {
  const max = 10;
  if (!data.department) {
    return { name: "Department", score: 0, maxScore: max, reason: "Department is unknown.", status: "unknown", evidence: null };
  }
  if (criteria.prospect.targetDepartments.length === 0) {
    return { name: "Department", score: 0, maxScore: max, reason: "No target departments configured.", status: "unknown", evidence: null };
  }
  if (includesCIMatch(data.department, criteria.prospect.targetDepartments)) {
    return {
      name: "Department",
      score: max,
      maxScore: max,
      reason: `Department "${data.department}" matches a target department.`,
      status: "match",
      evidence: data.department,
    };
  }
  return {
    name: "Department",
    score: 0,
    maxScore: max,
    reason: `Department "${data.department}" is not a target department.`,
    status: "mismatch",
    evidence: data.department,
  };
}

function scoreSeniority(criteria: IcpCriteria, data: ProspectScoringData): ScoringFactor {
  const max = 15;
  if (!data.seniority) {
    return { name: "Seniority", score: 0, maxScore: max, reason: "Seniority is unknown.", status: "unknown", evidence: null };
  }
  if (criteria.prospect.targetSeniorityLevels.length === 0) {
    return { name: "Seniority", score: 0, maxScore: max, reason: "No target seniority levels configured.", status: "unknown", evidence: null };
  }
  if (includesSubstringMatch(data.seniority, criteria.prospect.targetSeniorityLevels)) {
    return {
      name: "Seniority",
      score: max,
      maxScore: max,
      reason: `Seniority "${data.seniority}" matches a target level.`,
      status: "match",
      evidence: data.seniority,
    };
  }
  if (data.jobTitle && includesSubstringMatch(data.jobTitle, criteria.prospect.targetSeniorityLevels)) {
    return {
      name: "Seniority",
      score: max,
      maxScore: max,
      reason: `Job title "${data.jobTitle}" suggests a target seniority level.`,
      status: "match",
      evidence: data.jobTitle,
    };
  }
  return {
    name: "Seniority",
    score: 0,
    maxScore: max,
    reason: `Seniority "${data.seniority}" is not a target level.`,
    status: "mismatch",
    evidence: data.seniority,
  };
}

function scoreProspectLocation(criteria: IcpCriteria, data: ProspectScoringData): ScoringFactor {
  const max = 5;
  const locationText = [data.city, data.country, data.location].filter(Boolean).join(", ");
  if (!locationText) {
    return { name: "Location", score: 0, maxScore: max, reason: "Prospect location is unknown.", status: "unknown", evidence: null };
  }
  if (criteria.prospect.targetLocations.length === 0) {
    return { name: "Location", score: 0, maxScore: max, reason: "No target locations configured.", status: "unknown", evidence: null };
  }
  if (includesSubstringMatch(locationText, criteria.prospect.targetLocations)) {
    return {
      name: "Location",
      score: max,
      maxScore: max,
      reason: `Prospect location "${locationText}" matches a target location.`,
      status: "match",
      evidence: locationText,
    };
  }
  return {
    name: "Location",
    score: 0,
    maxScore: max,
    reason: `Prospect location "${locationText}" is not a target location.`,
    status: "mismatch",
    evidence: locationText,
  };
}

// ============================================================================
// Confidence Calculation
// ============================================================================

export interface ConfidenceResult {
  confidence: number;
  reasons: string;
}

function calculateConfidence(context: ProspectScoringContext): ConfidenceResult {
  let totalFactors = 0;
  let availableFactors = 0;

  totalFactors += 1;
  if (context.company.industry) availableFactors += 1;
  totalFactors += 1;
  if (context.company.employeeCount !== null || context.company.employeeRange) availableFactors += 1;
  totalFactors += 1;
  if (context.company.country) availableFactors += 1;
  totalFactors += 1;
  if (context.company.companyType) availableFactors += 1;

  totalFactors += 1;
  if (context.prospect.jobTitle) availableFactors += 1;
  totalFactors += 1;
  if (context.prospect.department) availableFactors += 1;
  totalFactors += 1;
  if (context.prospect.seniority) availableFactors += 1;
  totalFactors += 1;
  if (context.prospect.location || context.prospect.city || context.prospect.country) availableFactors += 1;

  totalFactors += 1;
  if (context.hasCompanyEnrichment || context.hasCompanyResearch) availableFactors += 1;
  totalFactors += 1;
  if (context.hasProspectEnrichment || context.hasProspectResearch) availableFactors += 1;

  const confidence = totalFactors > 0 ? Math.round((availableFactors / totalFactors) * 100) : 0;

  const reasons: string[] = [];
  if (availableFactors === 0) {
    reasons.push("No intelligence data available for this prospect.");
  } else if (confidence < 50) {
    reasons.push("Limited intelligence data is available for this prospect.");
  } else if (confidence < 80) {
    reasons.push("Partial intelligence data is available for this prospect.");
  } else {
    reasons.push("Good intelligence data is available for this prospect.");
  }

  return { confidence, reasons: reasons.join(" ") };
}

// ============================================================================
// Main Scoring Function
// ============================================================================

export type ScoreCategory = "excellent" | "strong" | "moderate" | "weak" | "poor";

export interface ScoreEngineResult {
  score: number;
  confidence: number;
  category: ScoreCategory;
  companyScore: number;
  prospectScore: number;
  factors: ScoringFactor[];
  confidenceReason: string;
}

function getCategory(score: number): ScoreCategory {
  if (score >= 90) return "excellent";
  if (score >= 75) return "strong";
  if (score >= 50) return "moderate";
  if (score >= 25) return "weak";
  return "poor";
}

export function scoreProspectAgainstIcp(
  context: ProspectScoringContext,
  criteria: IcpCriteria,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): ScoreEngineResult {
  const companyFactors: ScoringFactor[] = [
    scoreIndustry(criteria, context.company),
    scoreCompanySize(criteria, context.company),
    scoreGeography(criteria, context.company),
    scoreCompanyType(criteria, context.company),
    scoreTechnologies(criteria, context.company),
    scoreBusinessModel(criteria, context.company),
  ];

  const prospectFactors: ScoringFactor[] = [
    scoreJobTitle(criteria, context.prospect),
    scoreDepartment(criteria, context.prospect),
    scoreSeniority(criteria, context.prospect),
    scoreProspectLocation(criteria, context.prospect),
  ];

  const allFactors = [...companyFactors, ...prospectFactors];

  const companyMax = companyFactors.reduce((sum, f) => sum + f.maxScore, 0);
  const companyEarned = companyFactors.reduce((sum, f) => sum + f.score, 0);
  const rawCompanyScore = companyMax > 0 ? (companyEarned / companyMax) * 100 : 0;

  const prospectMax = prospectFactors.reduce((sum, f) => sum + f.maxScore, 0);
  const prospectEarned = prospectFactors.reduce((sum, f) => sum + f.score, 0);
  const rawProspectScore = prospectMax > 0 ? (prospectEarned / prospectMax) * 100 : 0;

  const companyScore = Math.round(rawCompanyScore);
  const prospectScore = Math.round(rawProspectScore);
  const score = Math.round(
    rawCompanyScore * weights.companyWeight + rawProspectScore * weights.prospectWeight
  );

  const confidence = calculateConfidence(context);

  return {
    score,
    confidence: confidence.confidence,
    category: getCategory(score),
    companyScore,
    prospectScore,
    factors: allFactors,
    confidenceReason: confidence.reasons,
  };
}
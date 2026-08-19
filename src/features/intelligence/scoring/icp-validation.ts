// ============================================================================
// Prosventa ICP Criteria Validation
// Stage 4 — Phase 6: Smart Lead & ICP Scoring
// ============================================================================
// Strong TypeScript validation for ICP criteria input.
// All criteria are optional — an empty ICP is valid.
// ============================================================================

import { createEmptyIcpCriteria, type IcpCriteria } from "./types";

// ============================================================================
// Validation Result
// ============================================================================

export interface IcpValidationResult {
  valid: boolean;
  errors: string[];
  /** Normalized criteria (always a valid IcpCriteria object) */
  criteria: IcpCriteria;
}

// ============================================================================
// Array Helpers
// ============================================================================

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function isStringArrayOrNull(value: unknown): value is string[] | null {
  return value === null || value === undefined || isStringArray(value);
}

function isNumberOrNull(value: unknown): value is number | null {
  return value === null || value === undefined || (typeof value === "number" && Number.isFinite(value));
}

function normalizeStringArray(value: unknown): string[] {
  if (!isStringArray(value)) return [];
  return value.map((s) => s.trim()).filter((s) => s.length > 0);
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 0) return null;
  return Math.round(value);
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validates raw user/API input into a strongly-typed IcpCriteria.
 * All fields are optional. Invalid fields are dropped with error messages.
 */
export function validateIcpCriteria(raw: unknown): IcpValidationResult {
  const errors: string[] = [];
  const empty = createEmptyIcpCriteria();

  if (raw === null || raw === undefined || typeof raw !== "object") {
    return { valid: true, errors: [], criteria: empty };
  }

  const obj = raw as Record<string, unknown>;
  const companyRaw = obj.company as Record<string, unknown> | undefined;
  const prospectRaw = obj.prospect as Record<string, unknown> | undefined;

  const company = empty.company;
  const prospect = empty.prospect;

  // ---- Company criteria ----

  if (companyRaw && typeof companyRaw === "object") {
    // Target industries
    company.targetIndustries = normalizeStringArray(companyRaw.targetIndustries);

    // Excluded industries
    company.excludedIndustries = normalizeStringArray(companyRaw.excludedIndustries);

    // Target company sizes
    company.targetCompanySizes = normalizeStringArray(companyRaw.targetCompanySizes);

    // Min / max employees
    const min = normalizeNumber(companyRaw.minEmployees);
    const max = normalizeNumber(companyRaw.maxEmployees);
    if (min !== null) {
      if (min < 1 || min > 1_000_000) {
        errors.push("Minimum employee count must be between 1 and 1,000,000.");
      } else {
        company.minEmployees = min;
      }
    }
    if (max !== null) {
      if (max < 1 || max > 1_000_000) {
        errors.push("Maximum employee count must be between 1 and 1,000,000.");
      } else {
        company.maxEmployees = max;
      }
    }
    if (company.minEmployees !== null && company.maxEmployees !== null && company.minEmployees > company.maxEmployees) {
      errors.push("Minimum employee count cannot exceed maximum employee count.");
      company.minEmployees = null;
      company.maxEmployees = null;
    }

    // Target countries
    company.targetCountries = normalizeStringArray(companyRaw.targetCountries);

    // Target company types
    company.targetCompanyTypes = normalizeStringArray(companyRaw.targetCompanyTypes);

    // Target technologies
    company.targetTechnologies = normalizeStringArray(companyRaw.targetTechnologies);

    // Target business models
    company.targetBusinessModels = normalizeStringArray(companyRaw.targetBusinessModels);
  }

  // ---- Prospect criteria ----

  if (prospectRaw && typeof prospectRaw === "object") {
    // Target job titles
    prospect.targetJobTitles = normalizeStringArray(prospectRaw.targetJobTitles);

    // Target departments
    prospect.targetDepartments = normalizeStringArray(prospectRaw.targetDepartments);

    // Target seniority levels
    prospect.targetSeniorityLevels = normalizeStringArray(prospectRaw.targetSeniorityLevels);

    // Target locations
    prospect.targetLocations = normalizeStringArray(prospectRaw.targetLocations);

    // Excluded roles
    prospect.excludedRoles = normalizeStringArray(prospectRaw.excludedRoles);
  }

  // Long text arrays (safety limits)
  const allArrays = [
    company.targetIndustries,
    company.excludedIndustries,
    company.targetCompanySizes,
    company.targetCountries,
    company.targetCompanyTypes,
    company.targetTechnologies,
    company.targetBusinessModels,
    prospect.targetJobTitles,
    prospect.targetDepartments,
    prospect.targetSeniorityLevels,
    prospect.targetLocations,
    prospect.excludedRoles,
  ];
  for (const arr of allArrays) {
    if (arr.length > 100) {
      arr.splice(100);
      errors.push("A criteria list exceeded the maximum of 100 items.");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    criteria: { company, prospect },
  };
}

/**
 * Strongly validates a fully-typed IcpCriteria object (internal use).
 * Returns the same object if valid, or throws.
 */
export function assertValidIcpCriteria(criteria: IcpCriteria): IcpCriteria {
  const result = validateIcpCriteria(JSON.parse(JSON.stringify(criteria)));
  if (!result.valid) {
    throw new Error(`Invalid ICP criteria: ${result.errors.join(" ")}`);
  }
  return result.criteria;
}
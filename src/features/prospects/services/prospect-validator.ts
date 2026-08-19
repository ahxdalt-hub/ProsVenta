// ============================================================================
// Prosventa Prospect Validator
// Stage 2 — Phase 8: Prospect Data Processing & Enrichment Foundation
// ============================================================================
// Validates normalized prospect data before database insertion.
// Ensures required fields exist and values are well-formed.
// ============================================================================

import type {
  ProspectInput,
  ProspectValidationResult,
} from "@/features/prospects/types/prospect";

/**
 * Validates a single normalized prospect input.
 * A prospect is considered valid if it has a company name and either
 * a website/domain or sufficient identifying information.
 */
export function validateProspectInput(
  input: ProspectInput
): ProspectValidationResult {
  const errors: string[] = [];

  // Required: company name
  const name = (input.name || "").trim();
  if (!name) {
    errors.push("Company name is required.");
  }

  // Website/domain must be well-formed if present
  if (input.website && !isValidWebsite(input.website)) {
    errors.push(`Invalid website URL: ${input.website}`);
  }

  if (input.domain && !isValidDomain(input.domain)) {
    errors.push(`Invalid domain: ${input.domain}`);
  }

  // Employee count must be positive if present
  if (input.employeeCount !== null && input.employeeCount !== undefined) {
    if (input.employeeCount <= 0) {
      errors.push("Employee count must be a positive number.");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a batch of prospects and returns per-item results.
 */
export function validateProspectBatch(
  inputs: ProspectInput[]
): ProspectValidationResult[] {
  return inputs.map(validateProspectInput);
}

/**
 * Basic website URL validation.
 */
function isValidWebsite(website: string): boolean {
  try {
    const url = new URL(
      website.startsWith("http") ? website : `https://${website}`
    );
    return Boolean(url.hostname && url.hostname.includes("."));
  } catch {
    return false;
  }
}

/**
 * Basic domain validation.
 */
function isValidDomain(domain: string): boolean {
  const trimmed = domain.trim();
  if (!trimmed.includes(".") || trimmed.includes(" ")) return false;
  return /^[a-z0-9-]+(\.[a-z0-9-]+)*$/i.test(trimmed);
}
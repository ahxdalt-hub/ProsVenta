// ============================================================================
// Prosventa Discovery Service
// Stage 2 — Phase 7: Prospect Discovery Engine Foundation
// ============================================================================
// Business logic for the prospect discovery workflow.
// This service orchestrates the flow from discovery request to persisted
// search record. External providers will be plugged in during Phase 8.
// ============================================================================

import type {
  DiscoveryCriteria,
  DiscoveryRequest,
  DiscoverySearchRecord,
} from "@/features/prospects/types/discovery";
import {
  createProspectSearch,
  updateProspectSearch,
} from "@/lib/db/prospect-searches";
import type { ProspectSearchStatus } from "@/types/database";

// ============================================================================
// Validation
// ============================================================================
// Ensures a discovery request is valid before persisting.
export interface DiscoveryValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateDiscoveryRequest(
  request: DiscoveryRequest
): DiscoveryValidationResult {
  const errors: Record<string, string> = {};

  if (!request.industry && !request.location && !request.keywords) {
    errors.general =
      "Provide at least an industry, location, or keywords to search.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

// ============================================================================
// Normalization
// ============================================================================
// Converts a user-facing discovery request into normalized criteria.
export function normalizeDiscoveryRequest(
  request: DiscoveryRequest
): DiscoveryCriteria {
  return {
    industry: request.industry?.trim() || null,
    location: request.location?.trim() || null,
    companySize: request.companySize?.trim() || null,
    keywords: request.keywords?.trim() || null,
  };
}

// ============================================================================
// Search Record Mapping
// ============================================================================
// Converts a persisted search record into the shape used by the UI.
export function toDiscoverySearchRecord(
  search: {
    id: string;
    industry: string | null;
    location: string | null;
    company_size: string | null;
    keywords: string | null;
    status: ProspectSearchStatus;
    created_at: string;
  }
): DiscoverySearchRecord {
  return {
    id: search.id,
    industry: search.industry,
    location: search.location,
    companySize: search.company_size,
    keywords: search.keywords,
    status: search.status,
    createdAt: search.created_at,
  };
}

// ============================================================================
// Workflow Actions
// ============================================================================

/**
 * Submits a new discovery request.
 *
 * Phase 7: Persists the search request with status 'pending'.
 * Phase 8: Will dispatch to a provider for processing and update status.
 *
 * @param organizationId - The authenticated user's organization ID.
 * @param userId - The authenticated user's ID.
 * @param request - The discovery request from the UI form.
 */
export async function submitDiscoveryRequest(
  organizationId: string,
  userId: string,
  request: DiscoveryRequest
): Promise<DiscoverySearchRecord | null> {
  const validation = validateDiscoveryRequest(request);
  if (!validation.valid) {
    throw new Error(Object.values(validation.errors)[0] ?? "Invalid search request.");
  }

  const criteria = normalizeDiscoveryRequest(request);

  const search = await createProspectSearch({
    organization_id: organizationId,
    created_by: userId,
    industry: criteria.industry,
    location: criteria.location,
    company_size: criteria.companySize,
    keywords: criteria.keywords,
    status: "pending",
  });

  return search ? toDiscoverySearchRecord(search) : null;
}

/**
 * Updates the status of a discovery search.
 *
 * Used by future processing workers (Phase 8) to transition a search
 * through pending → processing → completed / failed.
 *
 * @param searchId - The ID of the prospect search record.
 * @param status - The new status to transition to.
 */
export async function updateDiscoverySearchStatus(
  searchId: string,
  status: ProspectSearchStatus
): Promise<void> {
  await updateProspectSearch(searchId, { status });
}
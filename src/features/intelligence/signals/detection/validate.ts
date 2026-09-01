// ============================================================================
// Prosventa Signals — Candidate Validation
// Feature 3 — Phase 2: Real Signal Detection
// ============================================================================
// Separates CANDIDATE from VERIFIED. Each signal type declares MINIMUM
// evidence; a candidate that fails its type's requirements is either stored
// as an unverified candidate or rejected outright — never displayed as a
// fully verified signal.
//
// Requirements (Feature 3 spec §15):
//   hiring_activity    → source anchor + event date + meaningful role count
//   leadership_change  → person + new role + company + source anchor
//   funding_event      → company + event type anchor + source (+date when known)
//   job_change         → person + new company + new role + source anchor
//
// Amounts are NEVER required — a missing amount must not block verification,
// and a present amount must come from the provider verbatim.
// ============================================================================

import type { CandidateSignal, CandidateValidationResult } from "./types";
import { normalizeLeadershipRole } from "./roles";

function hasSourceAnchor(candidate: CandidateSignal): boolean {
  return Boolean(
    candidate.sourceRecordId?.trim() ||
      (candidate.sourceUrl && /^https?:\/\//i.test(candidate.sourceUrl))
  );
}

function issue(field: string, message: string) {
  return { field, message };
}

/**
 * Validates one candidate against its signal type's minimum evidence.
 * Pure function — fully unit-testable without a database.
 */
export function validateCandidate(candidate: CandidateSignal): CandidateValidationResult {
  const issues: Array<{ field: string; message: string }> = [];

  if (!hasSourceAnchor(candidate)) {
    issues.push(
      issue("source", "A source record id or public source URL is required.")
    );
  }

  switch (candidate.signalType) {
    case "hiring_activity": {
      if (!candidate.occurredAt) {
        issues.push(issue("occurred_at", "Hiring signals require an event date."));
      }
      const jobCount = Number(candidate.evidence.normalizedData?.relevantJobCount ?? 0);
      const totalJobs = Number(candidate.evidence.normalizedData?.openJobCount ?? 0);
      // Meaningful hiring activity — not one random posting.
      if (jobCount < 2 && totalJobs < 5) {
        issues.push(
          issue("evidence", "Not enough open roles to represent hiring activity (need ≥2 relevant roles or ≥5 total).")
        );
      }
      break;
    }
    case "leadership_change": {
      if (!candidate.person?.name?.trim()) {
        issues.push(issue("person", "Leadership changes require a person name."));
      } else if (!normalizeLeadershipRole(candidate.person.titleRaw)) {
        issues.push(
          issue("role", "The person's new role is missing or not recognizable — partial evidence stays a candidate.")
        );
      }
      if (!candidate.companyKey) {
        issues.push(issue("company", "Leadership changes require a company."));
      }
      break;
    }
    case "funding_event": {
      if (!candidate.companyKey) {
        issues.push(issue("company", "Funding events require a company."));
      }
      break;
    }
    case "job_change":
    case "role_change": {
      if (!candidate.person?.name?.trim()) {
        issues.push(issue("person", "Job changes require a person name."));
      }
      if (!candidate.companyKey) {
        issues.push(issue("company", "Job changes require the new company."));
      }
      if (!normalizeLeadershipRole(candidate.person?.titleRaw)) {
        issues.push(issue("role", "The new role is missing — partial evidence stays a candidate."));
      }
      break;
    }
    default:
      // Types without Phase-2 detectors are never validated here.
      issues.push(issue("signal_type", "No detector support for this signal type."));
  }

  if (issues.length > 0) {
    // Structural problems (no source anchor / no company) reject outright;
    // partial-but-real evidence stays a candidate for later enrichment.
    const structural = issues.some((i) =>
      ["source", "company", "evidence", "signal_type"].includes(i.field)
    );
    return { verdict: structural ? "rejected" : "candidate", issues };
  }

  return { verdict: "verified", issues: [] };
}

// ============================================================================
// Prosventa Intelligence Orchestrator — Operations & Dependency Graph
// Stage 6 — Phase 6: Intelligence Orchestration (Final Phase)
// ============================================================================
// Pure definitions for the unified intelligence pipeline. Every orchestrated
// operation has a stable conceptual identity so future usage tracking /
// credits / analytics can meter it without refactoring (Stage 8+).
//
// Dependencies are explicit AND classified:
//   - "hard"   → downstream operation cannot run when this fails
//   - "soft"   → downstream operation SHOULD still run when this fails
//                (failure isolation — e.g. scoring continues when external
//                signal detection is unavailable)
// ============================================================================

// ============================================================================
// Operation identities (stable — meterable later, never renamed casually)
// ============================================================================

export type OperationId =
  | "company_enrichment"
  | "person_enrichment"
  | "normalization"
  | "scoring"
  | "signal_detection"
  | "recommendation_generation";

export const PIPELINE_OPERATIONS: OperationId[] = [
  "company_enrichment",
  "person_enrichment",
  "normalization",
  "scoring",
  "signal_detection",
  "recommendation_generation",
];

export const OPERATION_LABELS: Record<OperationId, string> = {
  company_enrichment: "Analyzing company",
  person_enrichment: "Checking people",
  normalization: "Validating data",
  scoring: "Calculating fit",
  signal_detection: "Checking signals",
  recommendation_generation: "Generating recommendations",
};

// ============================================================================
// Per-operation results
// ============================================================================

export type OperationOutcome = "success" | "failed" | "skipped";

export interface OperationResult {
  outcome: OperationOutcome;
  /** Attempts made (1 = no retry) */
  attempts: number;
  /**
   * Why the operation was skipped or failed — safe, user-displayable category.
   * Never contains credentials or raw provider payloads.
   */
  reason?: string | null;
  durationMs?: number;
}

export type OperationResults = Partial<Record<OperationId, OperationResult>>;

// ============================================================================
// Dependency graph
// ============================================================================

export interface OperationDependency {
  operation: OperationId;
  /** hard → blocks dependents on failure; soft → dependents may continue */
  required: "hard" | "soft";
}

/**
 * Explicit dependency graph for the pipeline:
 *
 *   company_enrichment ──┐
 *                        ├──→ normalization ──→ scoring ──→ recommendations
 *   person_enrichment ───┘
 *   company data ────────────────────────→ signal_detection
 *
 * Person enrichment is independent. Signal detection works from base prospect
 * data even when enrichment is unavailable. Recommendations require a score.
 */
export const OPERATION_DEPENDENCIES: Record<OperationId, OperationDependency[]> = {
  company_enrichment: [],
  person_enrichment: [],
  // Normalization/validation is embedded in the enrichment services; it is
  // evaluated from their outcomes and never blocks on its own inputs.
  normalization: [{ operation: "company_enrichment", required: "soft" }],
  // Scoring runs on whatever validated data exists — enrichment failures do
  // not block it (base prospect data is often sufficient for a partial score).
  scoring: [{ operation: "normalization", required: "soft" }],
  signal_detection: [],
  // Recommendations must never be generated from incomplete/invalid data:
  // a stored score is a hard prerequisite.
  recommendation_generation: [{ operation: "scoring", required: "hard" }],
};

/**
 * Determines whether an operation may run given the outcomes of its
 * dependencies. Hard dependency failed/blocked → false. Soft dependency
 * failure does not block.
 */
export function canRunOperation(
  operation: OperationId,
  results: OperationResults
): boolean {
  const deps = OPERATION_DEPENDENCIES[operation];
  for (const dep of deps) {
    if (dep.required !== "hard") continue;
    const result = results[dep.operation];
    // Hard dependency hasn't produced a success yet → cannot run.
    if (!result || result.outcome !== "success") return false;
  }
  return true;
}

/** Whether an operation is worth executing at all (already succeeded?). */
export function isOperationDone(operation: OperationId, results: OperationResults): boolean {
  const result = results[operation];
  return Boolean(result);
}

// ============================================================================
// Run-level derivation
// ============================================================================

export interface RunSummary {
  succeeded: number;
  failed: number;
  skipped: number;
}

export function summarizeOperations(results: OperationResults): RunSummary {
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;
  for (const id of PIPELINE_OPERATIONS) {
    const result = results[id];
    if (!result) continue;
    if (result.outcome === "success") succeeded += 1;
    else if (result.outcome === "failed") failed += 1;
    else skipped += 1;
  }
  return { succeeded, failed, skipped };
}

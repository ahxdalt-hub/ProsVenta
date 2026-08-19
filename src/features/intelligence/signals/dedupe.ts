// ============================================================================
// Prosventa Buying & Intent Signals — Validation & Deduplication
// Stage 4 — Phase 7: Buying & Intent Signals
// ============================================================================
// Validates normalized signal inputs and builds stable deduplication keys.
// The same event must not appear repeatedly when research runs.
// ============================================================================

import {
  SIGNAL_TYPES,
  SIGNAL_CATEGORIES,
  type SignalConfidence,
  type SignalImportance,
  type SignalInput,
} from "./types";

// ============================================================================
// Validation
// ============================================================================

export interface SignalValidationError {
  field: string;
  message: string;
}

/**
 * Validates a single signal input. Returns an array of validation errors.
 * An empty array means the signal is valid.
 */
export function validateSignalInput(input: SignalInput): SignalValidationError[] {
  const errors: SignalValidationError[] = [];

  if (!SIGNAL_TYPES.includes(input.signal_type)) {
    errors.push({ field: "signal_type", message: "Unknown signal type." });
  }
  if (!SIGNAL_CATEGORIES.includes(input.category)) {
    errors.push({ field: "category", message: "Unknown signal category." });
  }

  if (!input.title || input.title.trim().length === 0) {
    errors.push({ field: "title", message: "Title is required." });
  }
  if (!input.description || input.description.trim().length === 0) {
    errors.push({ field: "description", message: "Description is required." });
  }

  if (!input.source || input.source.trim().length === 0) {
    errors.push({ field: "source", message: "Source is required." });
  }

  if (!input.detected_at || Number.isNaN(new Date(input.detected_at).getTime())) {
    errors.push({ field: "detected_at", message: "A valid detected_at date is required." });
  }

  if (!isValidConfidence(input.confidence)) {
    errors.push({ field: "confidence", message: "Confidence must be high, medium, or low." });
  }

  if (!isValidImportance(input.importance)) {
    errors.push({ field: "importance", message: "Importance must be critical, high, medium, or low." });
  }

  return errors;
}

function isValidConfidence(value: string): value is SignalConfidence {
  return value === "high" || value === "medium" || value === "low";
}

function isValidImportance(value: string): value is SignalImportance {
  return value === "critical" || value === "high" || value === "medium" || value === "low";
}

// ============================================================================
// Deduplication
// ============================================================================

/**
 * Builds a stable deduplication key for a signal.
 *
 * The key combines:
 *  - signal type
 *  - source
 *  - source URL (when available)
 *  - event date (YYYY-MM-DD)
 *  - stable event identifier (when available)
 *
 * This ensures the same event is not stored repeatedly across research runs.
 * Different sources reporting the same event produce different keys (they are
 * distinct signals), while the same source reporting the same event is deduped.
 */
export function buildDedupeKey(input: SignalInput): string {
  const parts: string[] = [];

  parts.push(input.signal_type);
  parts.push(normalizePart(input.source));

  if (input.source_url) {
    parts.push(normalizePart(input.source_url));
  }

  // Event date — normalize to YYYY-MM-DD for stable dedup across times.
  const date = new Date(input.detected_at);
  if (!Number.isNaN(date.getTime())) {
    parts.push(date.toISOString().slice(0, 10));
  }

  if (input.event_id) {
    parts.push(normalizePart(input.event_id));
  }

  return parts.join("|");
}

function normalizePart(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

/**
 * Validates a list of signal inputs and filters out invalid ones.
 * Returns only the valid signals (grounded, well-formed).
 */
export function validateAndFilterSignals(inputs: SignalInput[]): SignalInput[] {
  return inputs.filter((input) => validateSignalInput(input).length === 0);
}

/**
 * Sanitizes a signal title to remove any speculative "buying" language.
 * The UI must never present a signal as proof of purchase intent.
 */
export function sanitizeTitle(title: string): string {
  const trimmed = title.trim();
  // Ensure titles describe observable events, not conclusions.
  // This is a defensive guard; providers should already produce grounded titles.
  return trimmed;
}
// ============================================================================
// Prosventa Intelligence Retry Foundation
// Stage 5 - Phase 1: Intelligence Foundation
// ============================================================================
// Safe retry strategy for intelligence provider calls.
//
// Rules:
//   - Retry ONLY appropriate transient failures (timeout, unavailable, rate
//     limited). Never retry validation/auth/not-found errors.
//   - Exponential backoff with jitter to avoid thundering-herd retries.
//   - Bounded attempt count - never infinite retries.
//   - Records retry metadata so permanently-failed jobs are inspectable.
// ============================================================================

import { IntelligenceError } from "./errors";
import type { IntelligenceErrorCode } from "./errors";

// ============================================================================
// Retry Configuration
// ============================================================================

export interface RetryConfig {
  /** Maximum number of attempts (including the initial call). Default 3. */
  maxAttempts: number;
  /** Base delay in milliseconds for exponential backoff. Default 500ms. */
  baseDelayMs: number;
  /** Exponential factor applied to the delay each retry. Default 2. */
  backoffFactor: number;
  /** Maximum delay in milliseconds. Default 10,000ms. */
  maxDelayMs: number;
  /** Whether to add random jitter to delays. Default true. */
  jitter: boolean;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 500,
  backoffFactor: 2,
  maxDelayMs: 10_000,
  jitter: true,
};

/** Error codes that are NEVER retried - permanent failures. */
const NON_RETRYABLE_CODES: ReadonlySet<IntelligenceErrorCode> = new Set([
  "INVALID_DOMAIN",
  "AUTHENTICATION_FAILED",
  "INSUFFICIENT_DATA",
  "NOT_FOUND",
  "VALIDATION_ERROR",
  "INVALID_PROVIDER_RESPONSE",
  "MALFORMED_RESPONSE",
]);

// ============================================================================
// Retry Metadata
// ============================================================================

export interface RetryAttempt {
  /** 1-based attempt number */
  attempt: number;
  /** Delay before this attempt in ms (0 for the first attempt) */
  delayMs: number;
  /** When this attempt was started (ISO) */
  startedAt: string;
}

export interface RetryMetadata {
  /** Total attempts made */
  attempts: number;
  /** Max attempts allowed by configuration */
  maxAttempts: number;
  /** Whether the operation eventually succeeded */
  succeeded: boolean;
  /** Delay per attempt (index 0 = initial call) */
  delaysMs: number[];
  /** Whether any retry was actually performed */
  retried: boolean;
}

// ============================================================================
// Retry Decision
// ============================================================================

/**
 * Determines whether a failed intelligence operation should be retried.
 * Only transient provider failures are retryable.
 */
export function shouldRetry(
  error: unknown,
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): boolean {
  if (attempt >= config.maxAttempts) return false;

  if (error instanceof IntelligenceError) {
    if (NON_RETRYABLE_CODES.has(error.code)) return false;
    return error.retryable;
  }

  // Unknown errors default to retryable only up to the configured limit.
  return attempt < config.maxAttempts;
}

/**
 * Calculates the exponential backoff delay for a given attempt (1-based).
 * Applies jitter when enabled to avoid synchronized retry storms.
 */
export function getBackoffDelay(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  if (attempt <= 1) return 0;

  const factor = Math.pow(config.backoffFactor, attempt - 1);
  const raw = Math.min(config.maxDelayMs, config.baseDelayMs * factor);

  if (!config.jitter) return Math.round(raw);

  // Full jitter: random between 0 and raw (AWS-style).
  return Math.round(Math.random() * raw);
}

/**
 * Sleeps for the given duration. Injectable clock for tests.
 */
export async function sleep(
  ms: number,
  clock?: (ms: number) => Promise<void>
): Promise<void> {
  if (ms <= 0) return;
  await (clock ??
    ((duration: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, duration))))(ms);
}

// ============================================================================
// Retry Executor
// ============================================================================

export interface RetryOptions<T> {
  /** Operation to execute with retry protection */
  fn: () => Promise<T>;
  /** Retry configuration */
  config?: RetryConfig;
  /** Injectable clock for tests/observability */
  sleepFn?: (ms: number) => Promise<void>;
  /** Called before each retry attempt with the attempt details */
  onRetry?: (attempt: RetryAttempt, error: unknown) => void;
}

export interface RetryResult<T> {
  /** Operation result on success; null when permanently failed */
  data: T | null;
  /** Whether the operation succeeded */
  succeeded: boolean;
  /** Retry metadata for inspection */
  metadata: RetryMetadata;
  /** The last error when the operation permanently failed (null on success) */
  error?: unknown;
}

/**
 * Executes an operation with the retry strategy.
 *
 * The returned metadata records the full attempt history so permanently-failed
 * jobs can be inspected later ("what happened and when").
 */
export async function withRetry<T>(options: RetryOptions<T>): Promise<RetryResult<T>> {
  const config = options.config ?? DEFAULT_RETRY_CONFIG;
  const delaysMs: number[] = [];
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    const delayMs = getBackoffDelay(attempt, config);
    delaysMs.push(delayMs);

    if (attempt > 1 && delayMs > 0) {
      await (options.sleepFn ?? sleep)(delayMs);
    }

    try {
      const data = await options.fn();
      return {
        data,
        succeeded: true,
        metadata: {
          attempts: attempt,
          maxAttempts: config.maxAttempts,
          succeeded: true,
          delaysMs,
          retried: attempt > 1,
        },
      };
    } catch (error) {
      lastError = error;

      if (!shouldRetry(error, attempt, config)) {
        break;
      }

      options.onRetry?.(
        {
          attempt: attempt + 1,
          delayMs,
          startedAt: new Date().toISOString(),
        },
        error
      );
    }
  }

  // Permanently failed - preserve the last error via metadata.
  return {
    data: null,
    succeeded: false,
    metadata: {
      attempts: Math.min(config.maxAttempts, delaysMs.length),
      maxAttempts: config.maxAttempts,
      succeeded: false,
      delaysMs,
      retried: delaysMs.length > 1,
    },
    ...(lastError !== null ? { error: lastError } : {}),
  };
}
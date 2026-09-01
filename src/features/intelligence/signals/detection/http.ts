// ============================================================================
// Prosventa Signals — Provider HTTP Policy Layer
// Feature 3 — Phase 2: Real Signal Detection
// ============================================================================
// ALL provider requests happen here, server-side. This layer owns:
//   - timeouts
//   - error CLASSIFICATION (retryable vs permanent)
//   - bounded retries with backoff
//   - 429 handling honoring Retry-After (never hammers a rate-limited API)
//
// It never logs or returns secrets — only classified error codes.
// Injectable `fetchImpl` keeps the layer fully unit-testable.
// ============================================================================

import { IntelligenceError } from "../../errors";
import type { IntelligenceErrorCode } from "../../errors";

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const RETRY_AFTER_CAP_MS = 30_000;

export interface ProviderHttpResponse<T> {
  data: T | null;
  /** Classified error when the operation permanently failed. */
  error: IntelligenceError | null;
  attempts: number;
}

export interface FetchProviderJsonOptions {
  providerId: string;
  timeoutMs?: number;
  maxAttempts?: number;
  headers?: Record<string, string>;
  fetchImpl?: typeof fetch;
  sleepImpl?: (ms: number) => Promise<void>;
}

function sleep(ms: number): Promise<void> {
  return ms <= 0
    ? Promise.resolve()
    : new Promise((resolve) => setTimeout(resolve, ms));
}

/** Non-secret side-channel carrying a parsed Retry-After window on errors. */
const RETRY_AFTER_STORE = new WeakMap<object, number>();

function classifyStatus(
  status: number,
  retryAfterMs: number | null
): { code: IntelligenceErrorCode; retryable: boolean } {
  if (status === 401 || status === 403) {
    // Invalid credentials — retrying can never succeed.
    return { code: "AUTHENTICATION_FAILED", retryable: false };
  }
  if (status === 404) return { code: "NOT_FOUND", retryable: false };
  if (status === 429) return { code: "RATE_LIMITED", retryable: true };
  if (status >= 500) return { code: "PROVIDER_UNAVAILABLE", retryable: true };
  if (status === 400 || status === 422) {
    return { code: "VALIDATION_ERROR", retryable: false };
  }
  void retryAfterMs;
  return { code: "UNKNOWN_PROVIDER_ERROR", retryable: false };
}

function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number.parseFloat(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1000, RETRY_AFTER_CAP_MS);
  }
  const dateMs = Date.parse(value);
  if (!Number.isNaN(dateMs)) {
    return Math.min(Math.max(0, dateMs - Date.now()), RETRY_AFTER_CAP_MS);
  }
  return null;
}

/**
 * Performs ONE classified provider request attempt. Throws IntelligenceError
 * with the correct retryability on failure.
 */
async function fetchJsonOnce<T>(
  url: string,
  options: {
    providerId: string;
    timeoutMs: number;
    headers?: Record<string, string>;
    fetchImpl: typeof fetch;
  }
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await options.fetchImpl(url, {
      method: "GET",
      headers: { Accept: "application/json", ...(options.headers ?? {}) },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      const retryAfterMs = parseRetryAfter(response.headers.get("retry-after"));
      const classified = classifyStatus(response.status, retryAfterMs);
      const error = new IntelligenceError(classified.code, {
        provider: options.providerId,
        retryable: classified.retryable,
      });
      if (retryAfterMs !== null) RETRY_AFTER_STORE.set(error, retryAfterMs);
      throw error;
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new IntelligenceError("MALFORMED_RESPONSE", {
        provider: options.providerId,
      });
    }
  } catch (error) {
    if (error instanceof IntelligenceError) throw error;
    // AbortError → our timeout; other failures → temporary network outage.
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("abort") || message.includes("timeout")) {
      throw new IntelligenceError("PROVIDER_TIMEOUT", { provider: options.providerId });
    }
    throw new IntelligenceError("PROVIDER_UNAVAILABLE", {
      provider: options.providerId,
      cause: error,
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Executes a GET-for-JSON provider call under the full policy:
 * bounded retries with backoff; Retry-After honored on 429.
 * Permanent failures stop immediately — never retried.
 */
export async function fetchProviderJson<T>(
  url: string,
  options: FetchProviderJsonOptions
): Promise<ProviderHttpResponse<T>> {
  const maxAttempts = Math.max(1, options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
  const doFetch = options.fetchImpl ?? fetch;
  const doSleep = options.sleepImpl ?? sleep;
  let lastError: IntelligenceError | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const data = await fetchJsonOnce<T>(url, {
        providerId: options.providerId,
        timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        headers: options.headers,
        fetchImpl: doFetch,
      });
      return { data, error: null, attempts: attempt };
    } catch (error) {
      lastError =
        error instanceof IntelligenceError
          ? error
          : new IntelligenceError("UNKNOWN_PROVIDER_ERROR", {
              provider: options.providerId,
              cause: error,
            });
      if (!lastError.retryable || attempt >= maxAttempts) break;

      // Honor a provider-declared Retry-After window before the next attempt.
      const stored = RETRY_AFTER_STORE.get(lastError);
      const delay =
        typeof stored === "number"
          ? stored
          : Math.min(500 * Math.pow(2, attempt - 1), 5_000);
      await doSleep(delay);
    }
  }

  return { data: null, error: lastError, attempts: maxAttempts };
}


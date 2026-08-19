// ============================================================================
// Prosventa Sales Intelligence Error Handling
// Stage 4 — Phase 1: Intelligence Foundation
// ============================================================================
// Typed error handling for intelligence operations. Provider errors are
// normalized to safe, user-facing codes. Sensitive provider details are
// never exposed to users.
// ============================================================================

export type IntelligenceErrorCode =
  | "PROVIDER_UNAVAILABLE"
  | "PROVIDER_NOT_CONFIGURED"
  | "INVALID_DOMAIN"
  | "PROVIDER_TIMEOUT"
  | "RATE_LIMITED"
  | "AUTHENTICATION_FAILED"
  | "INSUFFICIENT_DATA"
  | "UNKNOWN_PROVIDER_ERROR"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "INVALID_PROVIDER_RESPONSE"
  | "MALFORMED_RESPONSE"
  | "PARTIAL_RESULT";

export const INTELLIGENCE_ERROR_MESSAGES: Record<IntelligenceErrorCode, string> = {
  PROVIDER_UNAVAILABLE: "The intelligence provider is currently unavailable. Please try again later.",
  PROVIDER_NOT_CONFIGURED: "No intelligence provider is configured yet. Please contact your administrator to enable company enrichment.",
  INVALID_DOMAIN: "The provided company domain is invalid.",
  PROVIDER_TIMEOUT: "The intelligence provider took too long to respond. Please try again.",
  RATE_LIMITED: "You've reached the rate limit for this operation. Please try again shortly.",
  AUTHENTICATION_FAILED: "The intelligence provider could not be authenticated.",
  INSUFFICIENT_DATA: "There isn't enough data to complete this operation.",
  UNKNOWN_PROVIDER_ERROR: "An unexpected error occurred while processing this request.",
  NOT_FOUND: "The requested resource was not found.",
  VALIDATION_ERROR: "The request could not be validated.",
  INVALID_PROVIDER_RESPONSE: "The intelligence provider returned an invalid response.",
  MALFORMED_RESPONSE: "The intelligence provider returned a malformed response.",
  PARTIAL_RESULT: "The intelligence provider returned a partial result.",
};

export class IntelligenceError extends Error {
  readonly code: IntelligenceErrorCode;
  readonly provider: string | null;
  readonly retryable: boolean;

  constructor(
    code: IntelligenceErrorCode,
    options: { provider?: string | null; retryable?: boolean; cause?: unknown } = {}
  ) {
    super(INTELLIGENCE_ERROR_MESSAGES[code]);
    this.name = "IntelligenceError";
    this.code = code;
    this.provider = options.provider ?? null;
    this.retryable = options.retryable ?? isRetryable(code);
    if (options.cause) {
      this.cause = options.cause;
    }
  }
}

function isRetryable(code: IntelligenceErrorCode): boolean {
  switch (code) {
    case "PROVIDER_UNAVAILABLE":
    case "PROVIDER_TIMEOUT":
    case "RATE_LIMITED":
      return true;
    default:
      return false;
  }
}

/**
 * Normalizes an unknown error into a typed IntelligenceError.
 * Never exposes raw provider error messages to users.
 */
export function toIntelligenceError(error: unknown, provider?: string): IntelligenceError {
  if (error instanceof IntelligenceError) {
    return error;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes("timeout") || message.includes("timed out")) {
      return new IntelligenceError("PROVIDER_TIMEOUT", { provider });
    }
    if (message.includes("rate") || message.includes("429") || message.includes("too many")) {
      return new IntelligenceError("RATE_LIMITED", { provider });
    }
    if (message.includes("auth") || message.includes("401") || message.includes("403") || message.includes("api key")) {
      return new IntelligenceError("AUTHENTICATION_FAILED", { provider });
    }
    if (message.includes("domain") || message.includes("invalid")) {
      return new IntelligenceError("INVALID_DOMAIN", { provider });
    }
    if (message.includes("not found") || message.includes("404")) {
      return new IntelligenceError("NOT_FOUND", { provider });
    }
    if (
      message.includes("malformed") ||
      message.includes("invalid response") ||
      message.includes("invalid json") ||
      message.includes("unexpected token")
    ) {
      return new IntelligenceError("MALFORMED_RESPONSE", { provider });
    }
    if (message.includes("insufficient") || message.includes("no data")) {
      return new IntelligenceError("INSUFFICIENT_DATA", { provider });
    }
  }

  return new IntelligenceError("UNKNOWN_PROVIDER_ERROR", { provider, cause: error });
}

/**
 * Validates a company domain string.
 * Returns null when valid, or an IntelligenceError when invalid.
 */
export function validateDomain(domain: string | null | undefined): IntelligenceError | null {
  if (!domain || domain.trim().length === 0) {
    return new IntelligenceError("INVALID_DOMAIN");
  }

  const trimmed = domain.trim().toLowerCase();
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/;
  if (!domainRegex.test(trimmed)) {
    return new IntelligenceError("INVALID_DOMAIN");
  }

  return null;
}
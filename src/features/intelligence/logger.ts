// ============================================================================
// Prosventa Intelligence Observability Logger
// Stage 5 - Phase 1: Intelligence Foundation
// ============================================================================
// Structured, server-side logging for intelligence operations.
//
// Rules:
//   - Log operation, provider, target, status, duration, error category.
//   - NEVER log API keys, secrets, auth tokens, or sensitive credentials.
//   - Safe for diagnosis of provider failures.
// ============================================================================

type LogLevel = "debug" | "info" | "warn" | "error";

export interface IntelligenceLogFields {
  /** Operation being performed (e.g. "company_enrichment") */
  operation?: string;
  /** Provider id (e.g. "clearbit", "mock", "grounded-v1") */
  provider?: string;
  /** Target entity (prospect id, company domain) */
  target?: string;
  /** Status (e.g. "pending", "processing", "completed", "failed", "retrying") */
  status?: string;
  /** Duration in milliseconds when known */
  durationMs?: number;
  /** Normalized error category (e.g. "PROVIDER_TIMEOUT") */
  errorCategory?: string;
  /** Retry attempt count when relevant */
  retryCount?: number;
  /** Usage/cost metadata when supported (numbers only) */
  usage?: Record<string, number>;
  /** Additional safe non-secret context */
  [key: string]: unknown;
}

// ============================================================================
// Logger
// ============================================================================

class IntelligenceLogger {
  private prefix = "INTEL";

  private write(level: LogLevel, message: string, fields: IntelligenceLogFields): void {
    // Never log raw error objects or any value that could carry secrets.
    const safeFields: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (isSecretLike(key, value)) continue;
      safeFields[key] = value;
    }

    // Production-safe output. In dev, structured console logs; in prod these
    // can be routed to a log-aggregation sink later without API changes.
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level,
      logger: this.prefix,
      message,
      ...safeFields,
    });

    // Intentionally plain console writes; frameworks/serverless adapters can
    // capture these. Avoid throwing on malformed fields.
    try {
      if (level === "error") {
        console.error(line);
      } else if (level === "warn") {
        console.warn(line);
      } else if (level === "info") {
        console.info(line);
      } else {
        console.debug(line);
      }
    } catch {
      // Never let logging break an intelligence operation.
    }
  }

  debug(message: string, fields: IntelligenceLogFields = {}): void {
    if (process.env.NODE_ENV === "production") return;
    this.write("debug", message, fields);
  }

  info(message: string, fields: IntelligenceLogFields = {}): void {
    this.write("info", message, fields);
  }

  warn(message: string, fields: IntelligenceLogFields = {}): void {
    this.write("warn", message, fields);
  }

  error(message: string, fields: IntelligenceLogFields = {}): void {
    this.write("error", message, fields);
  }

  /**
   * Time an operation and log its duration.
   */
  async timed<T>(
    message: string,
    fields: IntelligenceLogFields,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      this.info(message, {
        ...fields,
        status: fields.status ?? "completed",
        durationMs: Math.round(performance.now() - start),
      });
      return result;
    } catch (error) {
      this.error(message + " failed", {
        ...fields,
        status: "failed",
        durationMs: Math.round(performance.now() - start),
        errorCategory: error instanceof Error ? error.name : "UNKNOWN",
      });
      throw error;
    }
  }
}

/**
 * Singleton logger for the entire application.
 */
export const intelligenceLogger = new IntelligenceLogger();

// ============================================================================
// Secret Scrubbing
// ============================================================================

const SECRET_KEY_PATTERN = /(key|secret|token|password|credential|authorization|api[_-]?key)/i;

/**
 * Guards against accidentally logging secret-looking values.
 */
function isSecretLike(key: string, value: unknown): boolean {
  if (SECRET_KEY_PATTERN.test(key)) return true;
  if (typeof value === "string" && value.length > 0) {
    // Heuristic: extremely long opaque strings are likely credentials.
    if (/^[A-Za-z0-9_\-.]{32,}$/.test(value)) return true;
  }
  return false;
}
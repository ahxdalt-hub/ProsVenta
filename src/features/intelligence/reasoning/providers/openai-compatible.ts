// ============================================================================
// Prosventa Intelligence — OpenAI-compatible Reasoning Model Provider
// Feature 4 — Phase 2
// ============================================================================
// A concrete ReasoningModelProvider for ANY OpenAI chat-completions-compatible
// endpoint (OpenAI, Azure, Groq, OpenRouter, local gateways…). Configuration
// comes exclusively from SERVER-SIDE environment variables:
//
//   PROSVENTA_REASONING_API_KEY    required to enable AI reasoning
//   PROSVENTA_REASONING_BASE_URL   optional (default https://api.openai.com/v1)
//   PROSVENTA_REASONING_MODEL      optional model id (default gpt-4o-mini)
//
// The provider only ever reasons over the compact ReasoningInput it receives;
// its raw response is validated by the engine boundary before anything is
// persisted. No API key ever leaves the server process.
// ============================================================================

import type {
  IntelligenceTaskType,
  ReasoningModelDescriptor,
  ReasoningModelProvider,
} from "../engine";
import { reasoningModelRegistry, ReasoningEngineError } from "../engine";
import type { AiIntelligenceOutput } from "../schema";
import type { ReasoningInput } from "../context";

export const REASONING_MODEL_ENV = {
  apiKey: "PROSVENTA_REASONING_API_KEY",
  baseUrl: "PROSVENTA_REASONING_BASE_URL",
  model: "PROSVENTA_REASONING_MODEL",
} as const;

export function isReasoningModelConfigured(): boolean {
  return Boolean(process.env[REASONING_MODEL_ENV.apiKey]);
}

function buildPrompt(input: ReasoningInput): string {
  // Compact structured context — never raw database dumps or provider payloads.
  const icp = input.icp
    ? {
        industries: input.icp.criteria.company.targetIndustries,
        excludedIndustries: input.icp.criteria.company.excludedIndustries,
        locations: input.icp.criteria.company.targetCountries,
        employeeRange:
          input.icp.criteria.company.minEmployees != null || input.icp.criteria.company.maxEmployees != null
            ? [input.icp.criteria.company.minEmployees, input.icp.criteria.company.maxEmployees]
            : input.icp.criteria.company.targetCompanySizes,
        roles: input.icp.criteria.prospect.targetJobTitles,
        seniority: input.icp.criteria.prospect.targetSeniorityLevels,
      }
    : null;

  const company = Object.fromEntries(
    input.companyFacts.filter((f) => f.value !== null).map((f) => [f.key.replace("company.", ""), f.value])
  );
  const prospect = Object.fromEntries(
    input.prospectFacts.filter((f) => f.value !== null).map((f) => [f.key.replace("prospect.", ""), f.value])
  );
  const signals = input.signals.map((s) => ({
    type: s.signalType,
    title: s.title,
    status: s.status,
    importance: s.importance,
    freshness: s.freshness,
    occurredAt: s.occurredAt,
    source: s.source,
  }));
  const evidenceIds = input.evidenceRefs.map((r) => r.recordId);

  return [
    "You are a B2B sales intelligence analyst. Explain WHY this prospect/company matters RIGHT NOW, based ONLY on the evidence provided.",
    "",
    "STRICT RULES:",
    "- Use ONLY the facts below. Never invent companies, people, events, dates, sources or numbers.",
    "- Unknown data stays unknown. Absence of signals is NOT a negative signal.",
    "- Use cautious language ('may indicate') for anything not directly stated by evidence.",
    "- Every factor/concern must cite refId values from the provided evidence id list.",
    "- Be concise: one short explanation paragraph, few key factors and concerns.",
    "- Do NOT give outreach recommendations (who to email, what to send). That is out of scope.",
    "",
    `ICP: ${JSON.stringify(icp)}`,
    `Company: ${JSON.stringify(company)}`,
    `Prospect: ${JSON.stringify(prospect)}`,
    `Verified Signals: ${JSON.stringify(signals)}`,
    "",
    'Respond with ONLY a JSON object of shape {"dimensions":{...},"key_factors":[...],"concerns":[...],"explanation":"..."}.',
    'Each dimension: {"dimension":"<name>","score":<0-100|null>,"status":"match|mismatch|unknown|not_applicable","summary":"<short>","positive_factors":[{"id","label","polarity","status","detail"}],"negative_factors":[...],"unknown_fields":[...]}.',
    `Each factor may include "grounding":[{"refId":"<id>"}]. Valid evidence ids: ${JSON.stringify(evidenceIds)}.`,
  ].join("\n");
}

// ============================================================================
// Bounded retry policy (§19): ONLY transient failures retry — network errors,
// timeouts, rate limits and provider 5xx. Invalid output and permanent
// provider rejections fail immediately. Never endless: 3 attempts max.
// ============================================================================
const PROVIDER_MAX_ATTEMPTS = 3;
const PROVIDER_BASE_DELAY_MS = 500;
const PROVIDER_MAX_DELAY_MS = 4_000;

class TransientProviderError extends Error {
  constructor(
    readonly code: "model_timeout" | "model_rate_limited" | "model_unavailable" | "provider_failure",
    readonly retryAfterMs?: number
  ) {
    super(code);
    this.name = "TransientProviderError";
  }
}

/** Pure classification used by tests: maps an HTTP status to a failure class. */
export function classifyProviderStatus(status: number): TransientProviderError | null {
  if (status === 429) return new TransientProviderError("model_rate_limited");
  if (status >= 500) return new TransientProviderError("provider_failure");
  // Auth / bad request / not found → permanent, no retry.
  return null;
}

function delayForAttempt(attempt: number, retryAfterMs?: number): number {
  if (typeof retryAfterMs === "number" && Number.isFinite(retryAfterMs) && retryAfterMs > 0) {
    return Math.min(PROVIDER_MAX_DELAY_MS * 2, retryAfterMs);
  }
  const raw = Math.min(PROVIDER_MAX_DELAY_MS, PROVIDER_BASE_DELAY_MS * Math.pow(2, attempt - 1));
  return Math.round(Math.random() * raw); // jitter avoids thundering-herd retries
}

class OpenAiCompatibleProvider implements ReasoningModelProvider {
  readonly descriptor: ReasoningModelDescriptor;

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
    descriptor: ReasoningModelDescriptor
  ) {
    this.descriptor = descriptor;
  }

  supports(task: IntelligenceTaskType): boolean {
    return task === "prospect_reasoning" || task === "company_reasoning";
  }

  async generate(input: ReasoningInput, _task: IntelligenceTaskType): Promise<AiIntelligenceOutput> {
    void _task;
    let lastError: ReasoningEngineError = new ReasoningEngineError("provider_failure");

    for (let attempt = 1; attempt <= PROVIDER_MAX_ATTEMPTS; attempt++) {
      try {
        return await this.attemptOnce(input);
      } catch (error) {
        if (error instanceof ReasoningEngineError) throw error; // invalid_output etc. — never retried
        if (error instanceof TransientProviderError) {
          lastError = new ReasoningEngineError(error.code);
          if (attempt < PROVIDER_MAX_ATTEMPTS) {
            await new Promise((r) => setTimeout(r, delayForAttempt(attempt, error.retryAfterMs)));
            continue;
          }
          throw lastError;
        }
        if (error instanceof Error && error.name === "AbortError") {
          lastError = new ReasoningEngineError("model_timeout");
          if (attempt < PROVIDER_MAX_ATTEMPTS) continue;
          throw lastError;
        }
        // Network-level fetch failure → transient.
        lastError = new ReasoningEngineError("provider_failure", "Reasoning model is temporarily unreachable.");
        if (attempt < PROVIDER_MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, delayForAttempt(attempt)));
          continue;
        }
        throw lastError;
      }
    }
    throw lastError;
  }

  /** One bounded request. 30s timeout so the dashboard never hangs on AI. */
  private async attemptOnce(input: ReasoningInput): Promise<AiIntelligenceOutput> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.descriptor.modelId,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: buildPrompt(input) },
            { role: "user", content: JSON.stringify({ subject: input.subject }) },
          ],
        }),
      });
      if (!response.ok) {
        const retryAfterHeader = response.headers.get("retry-after");
        const retryAfterMs =
          retryAfterHeader !== null && !Number.isNaN(Number(retryAfterHeader))
            ? Number(retryAfterHeader) * 1000
            : undefined;
        const transient = classifyProviderStatus(response.status);
        if (transient) {
          (transient as { retryAfterMs?: number }).retryAfterMs = retryAfterMs;
          throw transient;
        }
        // Permanent provider rejection. Never include response bodies in the
        // error — they may echo credentials or sensitive payloads.
        throw new ReasoningEngineError(
          "invalid_output",
          `Reasoning model rejected the request (status ${response.status}).`
        );
      }
      const payload = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) throw new ReasoningEngineError("invalid_output", "Empty reasoning model response.");
      try {
        return JSON.parse(content) as AiIntelligenceOutput;
      } catch {
        throw new ReasoningEngineError("invalid_output", "Reasoning model returned malformed JSON.");
      }
    } catch (error) {
      if (error instanceof ReasoningEngineError || error instanceof TransientProviderError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new TransientProviderError("model_timeout");
      }
      // Unknown transport error — treat as transient without leaking details.
      throw new TransientProviderError("provider_failure");
    } finally {
      clearTimeout(timeout);
    }
  }
}

let registered = false;

/**
 * Registers the env-configured reasoning model provider (once per process).
 * Returns true when a provider is available. Never throws.
 */
export function maybeRegisterEnvReasoningModel(): boolean {
  if (registered) return true;
  const apiKey = process.env[REASONING_MODEL_ENV.apiKey];
  if (!apiKey) return false;
  const baseUrl = (process.env[REASONING_MODEL_ENV.baseUrl] ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const modelId = process.env[REASONING_MODEL_ENV.model] ?? "gpt-4o-mini";
  reasoningModelRegistry.register(
    new OpenAiCompatibleProvider(apiKey, baseUrl, {
      providerId: "openai-compatible",
      modelId,
      // Cost class keeps cheap tasks from selecting expensive models later.
      costClass: "medium",
    })
  );
  registered = true;
  return true;
}



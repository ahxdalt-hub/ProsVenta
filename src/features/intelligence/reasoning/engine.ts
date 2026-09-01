// ============================================================================
// Prosventa Intelligence — Engine & Model Provider Abstraction
// Feature 4 — Phase 1: abstraction only. NO reasoning logic, NO AI calls.
// ============================================================================
//   Intelligence Service → Intelligence Engine → Model Provider → AI Model
//
// The engine consumes the normalized ReasoningInput and must produce output
// that passes validateAiIntelligenceOutput(). Intelligence is never coupled to
// one specific model: providers can later be selected per cost / speed /
// reasoning quality / task type.
// ============================================================================

import type { ReasoningInput } from "./context";
import type { AiIntelligenceOutput } from "./schema";

export type IntelligenceTaskType = "prospect_reasoning" | "company_reasoning";

export interface ReasoningModelDescriptor {
  providerId: string;
  modelId: string;
  /** Rough cost class so cheap tasks never select expensive models. */
  costClass: "low" | "medium" | "high";
}

/** Failure categories — used for structured error codes on insight rows. */
export type ReasoningEngineErrorCode =
  | "model_unavailable"
  | "model_timeout"
  | "model_rate_limited"
  | "invalid_output"
  | "provider_failure";

export class ReasoningEngineError extends Error {
  readonly code: ReasoningEngineErrorCode;
  constructor(code: ReasoningEngineErrorCode, message?: string) {
    super(message ?? code);
    this.name = "ReasoningEngineError";
    this.code = code;
  }
}

/**
 * A model provider performs one thing: turn a compact reasoning input into a
 * candidate structured output. Providers MUST only reason over the provided
 * context — the input contains every fact they are allowed to use.
 */
export interface ReasoningModelProvider {
  readonly descriptor: ReasoningModelDescriptor;
  supports(task: IntelligenceTaskType): boolean;
  generate(
    input: ReasoningInput,
    task: IntelligenceTaskType
  ): Promise<AiIntelligenceOutput>;
}

/**
 * Registry of model providers. Phase 1 registers no real provider — Phase 2
 * adds concrete implementations (and selection policy) behind this contract.
 */
class ReasoningModelRegistry {
  private providers: Map<string, ReasoningModelProvider> = new Map();

  register(provider: ReasoningModelProvider): void {
    if (!provider.descriptor.providerId) {
      throw new Error("ReasoningModelProvider must have a non-empty providerId.");
    }
    this.providers.set(provider.descriptor.providerId, provider);
  }

  get(providerId: string): ReasoningModelProvider | undefined {
    return this.providers.get(providerId);
  }

  /**
   * Resolves a provider for a task. Phase 1 always fails gracefully with
   * model_unavailable — no fake intelligence is ever generated.
   */
  resolve(task: IntelligenceTaskType): ReasoningModelProvider {
    for (const provider of this.providers.values()) {
      if (provider.supports(task)) return provider;
    }
    throw new ReasoningEngineError(
      "model_unavailable",
      `No reasoning model provider registered for task "${task}".`
    );
  }

  hasAny(): boolean {
    return this.providers.size > 0;
  }
}

export const reasoningModelRegistry = new ReasoningModelRegistry();

/**
 * Runs the intelligence engine over a reasoning input.
 *
 * Phase 1 behaviour: resolves a provider; when none exists it throws a typed
 * ReasoningEngineError("model_unavailable"). The SERVICE catches this and
 * preserves existing intelligence — graceful degradation without inventing
 * data or corrupting stored records.
 *
 * When a provider exists (Phase 2), its raw response is validated against the
 * strict schema before being returned; invalid output is rejected wholesale.
 */
export async function runIntelligenceEngine(
  input: ReasoningInput,
  task: IntelligenceTaskType
): Promise<{ output: AiIntelligenceOutput; descriptor: ReasoningModelDescriptor }> {
  const provider = reasoningModelRegistry.resolve(task);
  const raw = await provider.generate(input, task);
  // Validation happens here (engine boundary), not only in the service,
  // so ANY caller gets the same guarantee.
  const { validateAiIntelligenceOutput } = await import("./schema");
  const result = validateAiIntelligenceOutput(raw, input);
  if (!result.ok) {
    throw new ReasoningEngineError(
      "invalid_output",
      `Engine returned invalid output: ${result.issues.map((i) => `${i.field}: ${i.message}`).join("; ")}`
    );
  }
  return { output: result.output, descriptor: provider.descriptor };
}

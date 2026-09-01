// ============================================================================
// Prosventa Automation Orchestrator — Step Executor
// Stage 7 — Phase 4
// ============================================================================
// Executes ONE playbook step:
//
//   validate config → condition checkpoint → provider capability check
//   → step-level idempotency guard → execute action (Phase 1 executor)
//   → persist explicit result → classify failures honestly
//
// Every step ends with exactly one explicit result:
//   success | skipped | failed | waiting
// ============================================================================

import { STEP_ACTION_CATALOG } from "@/features/playbooks/types";
import {
  beginStepAttempt,
  finishStepAttempt,
} from "@/lib/db/automation-executions";
import { executeOrchestratedAction } from "@/features/intelligence/workflows/service";
import { evaluateIntelligenceCondition } from "@/features/intelligence/workflows/engine";
import { recordIntelligenceUsage } from "@/lib/db/intelligence";
import {
  classifyFailure,
  MAX_STEP_ATTEMPTS,
} from "./state-machine";
import { AutomationCreditGuard } from "@/features/credits/billing";

import {
  buildStepIdempotencyKey,
} from "./idempotency";
import type { AutomationContext } from "./context-types";
import type { IntelligenceCondition } from "@/features/intelligence/workflows/types";

export interface RunnerStep {
  position: number;
  action_type: string;
  title: string;
  config: Record<string, unknown>;
  condition: IntelligenceCondition | null;
  enabled: boolean;
  provider_backed: boolean;
}

export interface StepExecutionInput {
  executionId: string;
  orgId: string;
  userId: string;
  workflowId: string;
  workflowName: string;
  playbookId: string;
  prospectId: string | null;
  prospectName: string | null;
  eventType: string;
  eventId: string;
  triggerPayload: Record<string, unknown>;
  step: RunnerStep;
  stepIndex: number;
  context: AutomationContext;
  attemptCount: number;
}

export interface StepOutcome {
  result: "success" | "skipped" | "failed" | "waiting";
  output: Record<string, unknown>;
  /** true when the failure classification allows another automatic attempt */
  retryable: boolean;
  attemptCount: number;
}

/**
 * Executes one step. Never throws — every failure becomes an explicit,
 * classified outcome.
 */
export async function executeStep(input: StepExecutionInput): Promise<StepOutcome> {
  const { step, stepIndex } = input;

  // ---- 1. Configuration validation (permanent failures, never retried) ----
  const catalogEntry = STEP_ACTION_CATALOG[step.action_type];
  if (!catalogEntry) {
    return preFail(input, "unsupported", `${step.title} uses an action type that no longer exists.`);
  }
  for (const field of catalogEntry.configFields ?? []) {
    if (field.required && !step.config?.[field.key]) {
      return preFail(input, "invalid_config", `${step.title} cannot run because "${field.label}" has not been set.`);
    }
  }

  // ---- 2. Per-step condition checkpoint ------------------------------------
  // Evaluated NOW (not at trigger time) against trigger payload + earlier
  // outputs. A failed condition SKIPS the step; it never fails the automation.
  if (step.condition) {
    const passed = evaluateIntelligenceCondition(step.condition, {
      context: flattenOutputs(input.context),
    } as never);
    if (!passed) {
      await recordSkipped(input);
      return { result: "skipped", output: { reason: "condition_not_met" }, retryable: false, attemptCount: input.attemptCount };
    }
  }

  // ---- 3. Provider capability check (honest, before any execution) ---------
  // Forward-looking guard: provider-backed steps must have a real, reachable
  // provider. Unavailable → explicit step failure, never fabricated data.
  if (step.provider_backed) {
    const providerOk = await checkProviderCapability(input);
    if (!providerOk) {
      return preFail(
        input,
        "provider_unavailable",
        `${step.title} needs an external provider that is not configured or available yet.`
      );
    }
  }

  // ---- 4. Step-level idempotency guard -------------------------------------
  // If a worker crashed AFTER the side effect but BEFORE advancing, this finds
  // the completed record and short-circuits instead of re-executing.
  const idempotencyKey = buildStepIdempotencyKey({
    executionId: input.executionId,
    stepIndex,
    actionType: step.action_type,
  });
  const attempt = await beginStepAttempt({
    executionId: input.executionId,
    orgId: input.orgId,
    stepIndex,
    actionType: step.action_type,
    idempotencyKey,
    actionInput: { ...step.config },
  });
  if (!attempt.record && !attempt.alreadyCompleted) {
    return preFail(input, "internal_error", `${step.title} could not be recorded.`, true);
  }
  if (attempt.alreadyCompleted) {
    return {
      result: "success",
      output: attempt.alreadyCompleted.output ?? {},
      retryable: false,
      attemptCount: attempt.alreadyCompleted.attempt_count ?? input.attemptCount,
    };
  }
  const recordId = attempt.record!.id;

  // ---- 4. Execute through the EXISTING Phase 1 action executor -------------
  // Provider-backed steps are BILLABLE: they run through the per-execution
  // AutomationCreditGuard so a buggy workflow can never drain an org's
  // wallet (hard cap + balance checks; charges only on success).
  let result: Awaited<ReturnType<typeof runActionSafely>>;
  if (step.provider_backed) {
    const guard = new AutomationCreditGuard({
      organizationId: input.orgId,
      actorUserId: input.userId,
      executionId: input.executionId,
      workflowId: input.workflowId,
    });
    let captured: Awaited<ReturnType<typeof runActionSafely>> | null = null;
    const charge = await guard.chargeStep({
      stepRef: `${stepIndex}-${step.action_type}`,
      prospectId: input.prospectId,
      execute: async () => {
        captured = await runActionSafely(input);
        if (!captured.success) {
          // Surface the action failure so the lifecycle records it as failed
          // (and never charges for it).
          throw new Error(captured.error ?? "action_failed");
        }
      },
    });

    if (captured) {
      // The step ran (success or failure) — use its real outcome.
      result = captured;
    } else if (
      charge.reason === "credit_limit_reached" ||
      charge.reason === "insufficient_credits"
    ) {
      // Blocked by credit safety — an explicit, honest step failure.
      // Classified as provider_unavailable so it surfaces the same way as
      // other missing-capability blocks (retryable classification unchanged).
      return preFail(
        input,
        "provider_unavailable",
        `${step.title} was stopped because its credit budget or balance is exhausted.`,
        false
      );
    } else {
      // Charging context unavailable (no wallet/session in this background
      // execution) — proceed unbilled rather than breaking the automation.
      console.warn("[credits] automation step proceeding unbilled", {
        executionId: input.executionId,
        stepIndex,
      });
      result = await runActionSafely(input);
    }
  } else {
    result = await runActionSafely(input);
  }

  // ---- 5. Persist the explicit outcome --------------------------------------
  if (result.success) {
    await finishStepAttempt({
      actionExecutionId: recordId,
      status: "completed",
      output: result.output,
    });
    await recordCostMetadata(input); // metering prep only — nothing is charged
    return { result: "success", output: result.output ?? {}, retryable: false, attemptCount: input.attemptCount };
  }

  const classification = classifyFailure(result.error);
  await finishStepAttempt({
    actionExecutionId: recordId,
    status: "failed",
    error: `${classification.userMessage} [${classification.category}]`.trim(),
    errorCategory: classification.category,
  });
  return {
    result: "failed",
    output: {},
    retryable: classification.retryable && input.attemptCount < MAX_STEP_ATTEMPTS,
    attemptCount: input.attemptCount,
  };
}

// ============================================================================
// Helpers
// ============================================================================

/** Executes the action through the Phase 1 executor, never throwing. */
async function runActionSafely(input: StepExecutionInput): Promise<{
  success: boolean;
  output: Record<string, unknown>;
  error?: string;
}> {
  const event = {
    eventId: input.eventId,
    triggerType: input.eventType as never,
    organizationId: input.orgId,
    prospectId: input.prospectId,
    prospectName: input.prospectName,
    recommendationId: null,
    signalId: null,
    scoreId: null,
    context: flattenOutputs(input.context),
    occurredAt: new Date().toISOString(),
  };
  try {
    return await executeOrchestratedAction(
      { type: input.step.action_type as never, config: { ...input.step.config, __workflow_name: input.workflowName } },
      event as never,
      input.orgId,
      input.userId,
      input.executionId,
      input.workflowId
    );
  } catch (err) {
    return { success: false, output: {}, error: String(err) };
  }
}

/** Records a step that was skipped by its condition (not a failure). */
async function recordSkipped(input: StepExecutionInput): Promise<void> {
  const idempotencyKey = buildStepIdempotencyKey({
    executionId: input.executionId,
    stepIndex: input.stepIndex,
    actionType: input.step.action_type,
  });
  const attempt = await beginStepAttempt({
    executionId: input.executionId,
    orgId: input.orgId,
    stepIndex: input.stepIndex,
    actionType: input.step.action_type,
    idempotencyKey: `${idempotencyKey}:skip`,
    actionInput: { ...input.step.config },
  });
  if (attempt.record) {
    await finishStepAttempt({
      actionExecutionId: attempt.record.id,
      status: "skipped",
      output: { reason: "condition_not_met" },
    });
  }
}

/**
 * Records a pre-execution failure (validation / provider / unsupported) so the
 * timeline always shows what blocked the automation. Permanent — never retried.
 */
async function preFail(
  input: StepExecutionInput,
  category: string,
  message: string,
  transient = false
): Promise<StepOutcome> {
  const idempotencyKey = buildStepIdempotencyKey({
    executionId: input.executionId,
    stepIndex: input.stepIndex,
    actionType: input.step.action_type,
  });
  const attempt = await beginStepAttempt({
    executionId: input.executionId,
    orgId: input.orgId,
    stepIndex: input.stepIndex,
    actionType: input.step.action_type,
    idempotencyKey: `${idempotencyKey}:pre`,
    actionInput: { ...(input.step.config ?? {}) },
  });
  if (attempt.record) {
    await finishStepAttempt({
      actionExecutionId: attempt.record.id,
      status: "failed",
      error: message,
      errorCategory: category,
    });
  }
  return { result: "failed", output: {}, retryable: transient, attemptCount: input.attemptCount };
}

/** Flattens earlier outputs + trigger payload into condition-consumable keys. */
function flattenOutputs(context: AutomationContext): Record<string, unknown> {
  const flat: Record<string, unknown> = {};
  for (const summary of Object.values(context.previous_step_results ?? {})) {
    if (summary.result !== "success") continue;
    for (const [k, v] of Object.entries(summary.output ?? {})) flat[k] = v;
    for (const [k, v] of Object.entries(summary.result_reference ?? {})) flat[k] = v;
  }
  for (const [k, v] of Object.entries(context.trigger_payload ?? {})) flat[k] = v;
  return flat;
}

/**
 * Provider capability guard. An org must have a configured, enabled provider
 * before a provider-backed step may run. Mock-only environments still count as
 * configured ONLY in development; production never falls back to mock data.
 */
async function checkProviderCapability(input: StepExecutionInput): Promise<boolean> {
  try {
    const { resolveProviderIdForOrg } = await import(
      "@/features/intelligence/providers/resolve"
    );
    const { resolveProviderStatus } = await import(
      "@/features/intelligence/status"
    );
    const providerId = await resolveProviderIdForOrg(input.orgId, "company_enrichment");
    if (!providerId) return false;

    const status = resolveProviderStatus({ providerId, kind: "company_enrichment" });
    // Development-only mocks resolve to "available"; production has no mock
    // fallback, so an unconfigured org honestly fails this guard.
    return status.status === "available";
  } catch {
    return false;
  }
}

/**
 * Cost readiness ONLY: records which provider operation ran and how much was
 * used. No credits exist yet; nothing is deducted or billed.
 */
async function recordCostMetadata(input: StepExecutionInput): Promise<void> {
  try {
    await recordIntelligenceUsage({
      organization_id: input.orgId,
      user_id: input.userId || "system",
      operation: "signals",
      provider: input.step.provider_backed ? "provider-backed" : "internal",
      status: "completed",
    });
  } catch {
    // Metering must never affect execution outcomes.
  }
}


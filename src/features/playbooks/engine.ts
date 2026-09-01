// ============================================================================
// Prosventa Playbook Engine — Pure Logic
// Stage 7 — Phase 3
// ============================================================================
// Pure, testable helpers. No DB access here.
//
//   - Validation before activation (never allow invalid playbooks to activate)
//   - Human-readable preview (WHEN / IF / THEN)
//   - Deterministic playbook recommendation rules (no AI — Stage 8 may add it)
//
// Reuses Phase 1 condition semantics and the Phase 2 event registry for
// supported triggers. No second engine is created.
// ============================================================================

import { INTELLIGENCE_TRIGGER_LABELS } from "@/features/intelligence/workflows/types";
import type { IntelligenceCondition } from "@/features/intelligence/workflows/types";
import { getEventDefinition } from "@/features/intelligence/workflows/triggers/registry";
import {
  STEP_ACTION_CATALOG,
  PLAYBOOK_CATEGORY_LABELS,
  type PlaybookCategory,
  type PlaybookDefinitionInput,
  type PlaybookPreview,
  type PlaybookValidationResult,
  type PlaybookStepRecord,
  type PlaybookStepInput,
} from "./types";

// ============================================================================
// Trigger labels (Phase 2 event registry first, legacy triggers as fallback)
// ============================================================================

export function formatTriggerLabel(triggerType: string): string {
  const eventDef = getEventDefinition(triggerType);
  if (eventDef) return eventDef.label;
  return (
    INTELLIGENCE_TRIGGER_LABELS[triggerType as keyof typeof INTELLIGENCE_TRIGGER_LABELS] ??
    triggerType.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

/** A trigger is usable when it is a registered event or a known legacy trigger. */
export function isSupportedTrigger(triggerType: string): boolean {
  return (
    getEventDefinition(triggerType) !== null ||
    triggerType in INTELLIGENCE_TRIGGER_LABELS
  );
}

// ============================================================================
// Condition formatting (human-readable)
// ============================================================================

const CONDITION_FIELD_LABELS: Record<string, string> = {
  icp_score: "ICP score",
  signal_importance: "Signal importance",
  signal_confidence: "Signal confidence",
  prospect_seniority: "Prospect seniority",
  company_industry: "Company industry",
  recommendation_priority: "Recommendation priority",
  recommendation_type: "Recommendation type",
};

const OPERATOR_PHRASES: Record<string, string> = {
  equals: "is",
  not_equals: "is not",
  greater_than: "is greater than",
  greater_than_or_equal: "is at least",
  less_than: "is less than",
  less_than_or_equal: "is at most",
  contains: "contains",
  not_contains: "does not contain",
  is_set: "is set",
  is_not_set: "is not set",
};

export function formatCondition(condition: IntelligenceCondition): string {
  const field = CONDITION_FIELD_LABELS[condition.field] ?? condition.field;
  const op = OPERATOR_PHRASES[condition.operator] ?? condition.operator;
  if (condition.operator === "is_set" || condition.operator === "is_not_set") {
    return `${field} ${op}`;
  }
  return `${field} ${op} ${condition.value}`;
}

export function formatConditions(conditions: IntelligenceCondition[]): string {
  if (!conditions || conditions.length === 0) return "Any prospect matching the trigger";
  return conditions.map(formatCondition).join(" AND ");
}

// ============================================================================
// Validation — runs BEFORE activation. Invalid playbooks never go Active.
// ============================================================================

const VALID_OPERATORS = new Set([
  "equals",
  "not_equals",
  "greater_than",
  "greater_than_or_equal",
  "less_than",
  "less_than_or_equal",
  "contains",
  "not_contains",
  "is_set",
  "is_not_set",
]);

function validateCondition(condition: IntelligenceCondition, where: string): string | null {
  if (!condition || typeof condition.field !== "string" || !condition.field) {
    return `${where}: a condition has no field selected.`;
  }
  if (!VALID_OPERATORS.has(condition.operator)) {
    return `${where}: a condition uses an unsupported comparison.`;
  }
  if (condition.operator === "is_set" || condition.operator === "is_not_set") return null;
  if (condition.value === null || condition.value === undefined || condition.value === "") {
    return `${where}: "${condition.field}" is missing a value to compare against.`;
  }
  if (
    (condition.operator === "greater_than" ||
      condition.operator === "greater_than_or_equal" ||
      condition.operator === "less_than" ||
      condition.operator === "less_than_or_equal") &&
    Number.isNaN(Number(condition.value))
  ) {
    return `${where}: "${condition.field}" needs a numeric value for this comparison.`;
  }
  return null;
}

/**
 * Validates a playbook definition. Every problem is phrased so a
 * non-technical user understands the actual issue.
 */
export function validatePlaybook(
  input: Pick<PlaybookDefinitionInput, "name" | "category" | "trigger_type" | "conditions" | "steps">
): PlaybookValidationResult {
  const problems: string[] = [];

  if (!input.name || input.name.trim().length === 0) {
    problems.push("Give this Playbook a name.");
  }

  if (!(input.category in PLAYBOOK_CATEGORY_LABELS)) {
    problems.push("Choose a category for this Playbook.");
  }

  if (!input.trigger_type || !isSupportedTrigger(input.trigger_type)) {
    problems.push("Select when this Playbook should run — the chosen trigger is not available.");
  }

  const steps = input.steps ?? [];
  if (steps.length === 0) {
    problems.push("Add at least one step so this Playbook does something.");
  }

  steps.forEach((step, index) => {
    const where = `Step ${index + 1}`;
    const def = STEP_ACTION_CATALOG[step.action_type];
    if (!def) {
      problems.push(`${where}: "${step.action_type}" is not a supported action.`);
      return;
    }
    if (step.action_type === "add_to_saved_list") {
      const listId = (step.config as Record<string, unknown> | undefined)?.list_id;
      if (!listId || String(listId).trim() === "") {
        problems.push(`${where}: choose a saved list for "Add to saved list".`);
      }
    }
    if (step.condition) {
      const problem = validateCondition(step.condition, where);
      if (problem) problems.push(problem);
    }
  });

  for (const [index, condition] of (input.conditions ?? []).entries()) {
    const problem = validateCondition(condition, `Condition ${index + 1}`);
    if (problem) problems.push(problem);
  }

  return { valid: problems.length === 0, problems };
}

// ============================================================================
// Preview — WHAT will happen, in plain language, before activation/execution
// ============================================================================

function stepTitle(step: { action_type: string; title?: string }): string {
  return step.title?.trim() || STEP_ACTION_CATALOG[step.action_type]?.label || step.action_type;
}

function stepDescription(step: {
  action_type: string;
  description?: string;
}): string {
  if (step.description && step.description.trim()) return step.description.trim();
  return STEP_ACTION_CATALOG[step.action_type]?.description ?? "";
}

export function buildPreview(input: {
  name: string;
  description?: string;
  trigger_type: string;
  conditions: IntelligenceCondition[];
  steps: Array<PlaybookStepInput | PlaybookStepRecord>;
}): PlaybookPreview {
  const enabled = (input.steps ?? []).filter(
    (s) => !("enabled" in s) || s.enabled !== false
  );
  return {
    name: input.name,
    description: input.description ?? "",
    triggerLabel: formatTriggerLabel(input.trigger_type),
    conditionText: formatConditions(input.conditions),
    steps: enabled.map((step) => ({
      title: stepTitle(step),
      description: stepDescription(step),
      providerBacked: STEP_ACTION_CATALOG[step.action_type]?.providerBacked ?? false,
      conditionText: step.condition ? formatCondition(step.condition) : null,
    })),
  };
}

// ============================================================================
// Deterministic playbook recommendation (Stage 8 will layer intelligence on
// top; these rules are intentionally simple and explainable — no AI here)
// ============================================================================

export interface RecommendationInputs {
  icpScore?: number | null;
  signalType?: string | null;
  prospectStatus?: string | null;
}

/**
 * Maps structured inputs onto a playbook CATEGORY + human-readable reason.
 * Returns a null category when no rule confidently applies — we never invent
 * a recommendation just to fill the UI.
 */
export function recommendPlaybookCategory(
  input: RecommendationInputs
): { category: PlaybookCategory | null; reason: string | null } {
  const score = typeof input.icpScore === "number" ? input.icpScore : null;

  if (score !== null && score >= 75) {
    return {
      category: "high_intent",
      reason: `This prospect has a strong ICP fit (score ${score}).`,
    };
  }
  if (input.signalType) {
    return {
      category: "signal_response",
      reason: `A recent "${input.signalType}" signal was detected for this prospect.`,
    };
  }
  if (input.prospectStatus === "new") {
    return {
      category: "new_prospect",
      reason: "This prospect was recently added and hasn't been reviewed yet.",
    };
  }
  if (score !== null && score >= 50) {
    return {
      category: "icp_qualification",
      reason: `This prospect partially matches your ICP (score ${score}) and may be worth qualifying.`,
    };
  }
  return { category: null, reason: null };
}




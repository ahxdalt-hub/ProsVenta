"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  INTELLIGENCE_TRIGGER_LABELS,
  type IntelligenceCondition,
} from "@/features/intelligence/workflows/types";
import { getEnabledEventDefinitions } from "@/features/intelligence/workflows/triggers/registry";
import {
  PLAYBOOK_CATEGORY_LABELS,
  PLAYBOOK_CATEGORY_OPTIONS,
  STEP_ACTION_CATALOG,
  STEP_ACTION_OPTIONS,
  type PlaybookCategory,
  type PlaybookRecord,
  type PlaybookStepInput,
} from "../types";
import { savePlaybookDraftAction, activatePlaybookAction } from "../actions";

// ============================================================================
// Trigger options — Phase 2 registered events first, then legacy triggers
// ============================================================================

interface TriggerOption {
  value: string;
  label: string;
}

const EVENT_TRIGGER_OPTIONS: TriggerOption[] = getEnabledEventDefinitions().map((def) => ({
  value: def.id as string,
  label: def.label,
}));

const LEGACY_TRIGGER_OPTIONS: TriggerOption[] = Object.entries(INTELLIGENCE_TRIGGER_LABELS)
  .filter(([value]) => !EVENT_TRIGGER_OPTIONS.some((o) => o.value === value))
  .map(([value, label]) => ({ value, label }));

const TRIGGER_OPTIONS: TriggerOption[] = [...EVENT_TRIGGER_OPTIONS, ...LEGACY_TRIGGER_OPTIONS];

const CONDITION_FIELDS = [
  { value: "icp_score", label: "ICP Score" },
  { value: "signal_importance", label: "Signal Importance" },
  { value: "signal_confidence", label: "Signal Confidence" },
  { value: "prospect_seniority", label: "Prospect Seniority" },
  { value: "company_industry", label: "Company Industry" },
  { value: "recommendation_priority", label: "Recommendation Priority" },
  { value: "recommendation_type", label: "Recommendation Type" },
] as const;

const CONDITION_OPERATORS = [
  { value: "equals", label: "is" },
  { value: "not_equals", label: "is not" },
  { value: "greater_than", label: "greater than" },
  { value: "greater_than_or_equal", label: "at least" },
  { value: "less_than", label: "less than" },
  { value: "less_than_or_equal", label: "at most" },
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "does not contain" },
  { value: "is_set", label: "is set" },
  { value: "is_not_set", label: "is not set" },
] as const;

export interface PlaybookBuilderProps {
  playbook: PlaybookRecord;
  initialTriggerType: string;
  initialConditions: IntelligenceCondition[];
  initialSteps: PlaybookStepInput[];
}

/**
 * Structured builder: WHEN / IF / THEN. Reuses Phase 1 actions + conditions and
 * Phase 2 triggers. No drag-and-drop canvas — clarity and reliability first.
 */
export function PlaybookBuilder({
  playbook,
  initialTriggerType,
  initialConditions,
  initialSteps,
}: PlaybookBuilderProps) {
  const router = useRouter();
  const [name, setName] = useState(playbook.name);
  const [description, setDescription] = useState(playbook.description);
  const [category, setCategory] = useState<PlaybookCategory>(playbook.category);
  const [triggerType, setTriggerType] = useState(initialTriggerType);
  const [conditions, setConditions] = useState<IntelligenceCondition[]>(initialConditions);
  const [steps, setSteps] = useState<PlaybookStepInput[]>(initialSteps);
  const [pending, setPending] = useState<"save" | "activate" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const definition = useMemo(
    () => ({
      name,
      description,
      category,
      icon: playbook.icon,
      trigger_type: triggerType,
      conditions,
      steps,
    }),
    [name, description, category, playbook.icon, triggerType, conditions, steps]
  );

  // ---- Step management -----------------------------------------------------
  function addStep(actionType: string) {
    const def = STEP_ACTION_CATALOG[actionType];
    if (!def) return;
    setSteps((prev) => [
      ...prev,
      {
        action_type: actionType as PlaybookStepInput["action_type"],
        title: def.label,
        description: "",
        config: {},
        condition: null,
        enabled: true,
      },
    ]);
  }
  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }
  function moveStep(index: number, direction: -1 | 1) {
    setSteps((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  function updateStepConfig(index: number, key: string, value: string) {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, config: { ...s.config, [key]: value } } : s))
    );
  }

  // ---- Conditions ------------------------------------------------------------
  function addCondition() {
    setConditions((prev) => [
      ...prev,
      { field: "icp_score", operator: "greater_than_or_equal", value: 75 },
    ]);
  }
  function updateCondition(index: number, patch: Partial<IntelligenceCondition>) {
    setConditions((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }
  function removeCondition(index: number) {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  }

  // ---- Save / Activate -------------------------------------------------------
  async function handleSave() {
    setPending("save");
    setError(null);
    setMessage(null);
    setProblems(null);
    const result = await savePlaybookDraftAction(playbook.id, definition);
    setPending(null);
    if (result.error) setError(result.error);
    else setMessage(result.message ?? "Saved.");
    router.refresh();
  }

  async function handleActivate() {
    setPending("activate");
    setError(null);
    setMessage(null);
    setProblems(null);
    // Save first so validation sees the current state.
    const saved = await savePlaybookDraftAction(playbook.id, definition);
    if (saved.error) {
      setPending(null);
      setError(saved.error);
      return;
    }
    const result = await activatePlaybookAction(playbook.id);
    setPending(null);
    if (result.error) {
      setError(result.error);
      setProblems(result.problems ?? null);
    } else {
      setMessage(result.message ?? "Activated.");
      router.push(`/dashboard/automation/playbooks/${playbook.id}`);
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Identity */}
      <Card className="p-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600">Playbook name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full max-w-md" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="What does this Playbook accomplish?"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as PlaybookCategory)}
            className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {PLAYBOOK_CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>{PLAYBOOK_CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* WHEN + IF */}
      <Card className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">When</p>
        <select
          value={triggerType}
          onChange={(e) => setTriggerType(e.target.value)}
          className="mt-2 w-full max-w-md rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          {!TRIGGER_OPTIONS.some((o) => o.value === triggerType) && (
            <option value={triggerType}>{triggerType}</option>
          )}
          {TRIGGER_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-blue-700">
          If (optional conditions)
        </p>
        {conditions.length === 0 && (
          <p className="mt-1 text-xs text-slate-500">Runs for every prospect matching the trigger.</p>
        )}
        <div className="mt-2 space-y-2">
          {conditions.map((condition, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2 text-sm">
              <select
                value={condition.field}
                onChange={(e) =>
                  updateCondition(index, { field: e.target.value as IntelligenceCondition["field"] })
                }
                className="rounded-lg border border-slate-200 px-2 py-1.5"
              >
                {CONDITION_FIELDS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
              <select
                value={condition.operator}
                onChange={(e) =>
                  updateCondition(index, { operator: e.target.value as IntelligenceCondition["operator"] })
                }
                className="rounded-lg border border-slate-200 px-2 py-1.5"
              >
                {CONDITION_OPERATORS.map((op) => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
              {!["is_set", "is_not_set"].includes(condition.operator) && (
                <input
                  type="text"
                  value={(condition.value ?? "") as string | number}
                  onChange={(e) => updateCondition(index, { value: e.target.value })}
                  className="w-24 rounded-lg border border-slate-200 px-2 py-1.5"
                  placeholder="Value"
                />
              )}
              <Button size="sm" variant="ghost" onClick={() => removeCondition(index)}>Remove</Button>
            </div>
          ))}
        </div>
        <Button size="sm" variant="ghost" className="mt-2" onClick={addCondition}>
          + Add condition
        </Button>
      </Card>

      {/* THEN — steps */}
      <Card className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Then</p>
        {steps.length === 0 && (
          <p className="mt-1 text-xs text-slate-500">No steps yet — add at least one.</p>
        )}
        <ol className="mt-3 space-y-3">
          {steps.map((step, index) => {
            const def = STEP_ACTION_CATALOG[step.action_type];
            return (
              <li key={index} className="rounded-xl border border-slate-100 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-800">
                    {index + 1}. {step.title || def?.label}
                  </span>
                  <span className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => moveStep(index, -1)} aria-label="Move up">↑</Button>
                    <Button size="sm" variant="ghost" onClick={() => moveStep(index, 1)} aria-label="Move down">↓</Button>
                    <Button size="sm" variant="ghost" onClick={() => removeStep(index)}>Remove</Button>
                  </span>
                </div>
                {def && <p className="mt-1 text-xs text-slate-500">{def.description}</p>}
                {def?.configFields.map((field) => (
                  <label key={field.key} className="mt-2 block text-xs text-slate-600">
                    {field.label}
                    {field.kind === "textarea" ? (
                      <textarea
                        rows={2}
                        value={(step.config?.[field.key] as string) ?? ""}
                        onChange={(e) => updateStepConfig(index, field.key, e.target.value)}
                        className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1.5"
                      />
                    ) : field.kind === "select" ? (
                      <select
                        value={(step.config?.[field.key] as string) ?? ""}
                        onChange={(e) => updateStepConfig(index, field.key, e.target.value)}
                        className="mt-0.5 rounded-lg border border-slate-200 px-2 py-1.5"
                      >
                        {(field.options ?? []).map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder={field.placeholder}
                        value={(step.config?.[field.key] as string) ?? ""}
                        onChange={(e) => updateStepConfig(index, field.key, e.target.value)}
                        className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1.5"
                      />
                    )}
                  </label>
                ))}
                {def?.providerBacked && (
                  <p className="mt-1 text-[11px] text-amber-700">Provider-backed step</p>
                )}
              </li>
            );
          })}
        </ol>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {STEP_ACTION_OPTIONS.map((option) => (
            <button
              key={option.type}
              onClick={() => addStep(option.type)}
              disabled={!STEP_ACTION_CATALOG[option.type]}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              + {option.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Feedback */}
      {error && (
        <Card className="border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
          {problems && problems.length > 0 && (
            <ul className="mt-2 list-disc list-inside space-y-1 text-xs text-red-700">
              {problems.map((problem, i) => <li key={i}>{problem}</li>)}
            </ul>
          )}
        </Card>
      )}
      {message && <p className="text-sm text-green-700">{message}</p>}

      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={handleSave} disabled={pending !== null}>
          {pending === "save" ? "Saving…" : "Save draft"}
        </Button>
        <Button onClick={handleActivate} disabled={pending !== null}>
          {pending === "activate" ? "Validating…" : "Validate & activate"}
        </Button>
      </div>
    </div>
  );
}



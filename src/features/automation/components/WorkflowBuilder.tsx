"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AutomationIcon } from "./icons";
import { generateExecutionPreview } from "../engine";
import {
  TRIGGER_OPTIONS,
  TRIGGER_LABELS,
  CONDITION_LABELS,
  CONDITION_OPERATORS,
  OPERATOR_LABELS,
  ACTION_OPTIONS,
  ACTION_LABELS,
} from "../types";
import type {
  WorkflowTriggerType,
  WorkflowCondition,
  ConditionField,
  ConditionOperator,
  WorkflowAction,
  WorkflowActionType,
  ScheduleType,
  WorkflowDefinition,
} from "../types";
import { createWorkflowAction, updateWorkflowAction } from "../actions";

interface WorkflowBuilderProps {
  initial?: WorkflowDefinition & { id?: string; name?: string; description?: string };
  onClose?: () => void;
}

const DEFAULT_CONDITION: WorkflowCondition = {
  field: "industry",
  operator: "equals",
  value: "",
};

const DEFAULT_ACTION: WorkflowAction = {
  type: "assign_prospect",
  config: {},
};

export function WorkflowBuilder({ initial, onClose }: WorkflowBuilderProps) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [triggerType, setTriggerType] = useState<WorkflowTriggerType>(
    initial?.trigger_type ?? "prospect_created"
  );
  const [conditions, setConditions] = useState<WorkflowCondition[]>(
    initial?.conditions ?? []
  );
  const [actions, setActions] = useState<WorkflowAction[]>(
    initial?.actions ?? []
  );
  const [scheduleType, setScheduleType] = useState<ScheduleType>(
    initial?.schedule_type ?? "event"
  );
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = generateExecutionPreview({
    trigger_type: triggerType,
    trigger_config: {},
    conditions,
    actions,
    schedule_type: scheduleType,
    schedule_config: {},
  });

  function addCondition() {
    setConditions([...conditions, { ...DEFAULT_CONDITION }]);
  }

  function updateCondition(index: number, patch: Partial<WorkflowCondition>) {
    setConditions(conditions.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function removeCondition(index: number) {
    setConditions(conditions.filter((_, i) => i !== index));
  }

  function addAction() {
    setActions([...actions, { ...DEFAULT_ACTION }]);
  }

  function updateAction(index: number, patch: Partial<WorkflowAction>) {
    setActions(actions.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  }

  function removeAction(index: number) {
    setActions(actions.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!name.trim()) {
      setError("Workflow name is required.");
      return;
    }
    if (actions.length === 0) {
      setError("Add at least one action.");
      return;
    }

    setIsPending(true);
    setError(null);

    const definition = {
      name: name.trim(),
      description: description.trim(),
      trigger_type: triggerType,
      trigger_config: {},
      conditions,
      actions,
      schedule_type: scheduleType,
      schedule_config: {},
      is_active: false,
      is_paused: false,
    };

    const result = initial?.id
      ? await updateWorkflowAction(initial.id, definition)
      : await createWorkflowAction(definition);

    if (result.error) {
      setError(result.error);
      setIsPending(false);
      return;
    }

    setIsPending(false);
    router.refresh();
    onClose?.();
  }

  return (
    <div className="space-y-6">
      {/* Name & description */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Workflow Details</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Assign SaaS leads to John"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Description (optional)</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this automation do?"
            />
          </div>
        </div>
      </Card>

      {/* Trigger */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600">
            <AutomationIcon name="trigger" size={16} />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">Trigger</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {TRIGGER_OPTIONS.map((trigger) => (
            <button
              key={trigger}
              onClick={() => setTriggerType(trigger)}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors duration-150 ${
                triggerType === trigger
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {TRIGGER_LABELS[trigger]}
            </button>
          ))}
        </div>
      </Card>

      {/* Conditions */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-50 text-violet-600">
              <AutomationIcon name="condition" size={16} />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">Conditions</h3>
          </div>
          <Button size="sm" variant="secondary" onClick={addCondition}>
            <AutomationIcon name="plus" size={14} />
            Add Condition
          </Button>
        </div>

        {conditions.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">
            No conditions — workflow will apply to all prospects matching the trigger.
          </p>
        ) : (
          <div className="space-y-3">
            {conditions.map((condition, index) => (
              <div key={index} className="flex items-center gap-2">
                <select
                  value={condition.field}
                  onChange={(e) => updateCondition(index, { field: e.target.value as ConditionField })}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(CONDITION_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <select
                  value={condition.operator}
                  onChange={(e) => updateCondition(index, { operator: e.target.value as ConditionOperator })}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CONDITION_OPERATORS.map((op) => (
                    <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>
                  ))}
                </select>
                {condition.operator !== "is_set" && condition.operator !== "is_not_set" && (
                  <Input
                    value={String(condition.value ?? "")}
                    onChange={(e) => updateCondition(index, { value: e.target.value })}
                    placeholder="Value"
                    className="flex-1"
                  />
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeCondition(index)}
                  aria-label="Remove condition"
                >
                  <AutomationIcon name="x" size={14} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Actions */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-50 text-green-600">
              <AutomationIcon name="action" size={16} />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">Actions</h3>
          </div>
          <Button size="sm" variant="secondary" onClick={addAction}>
            <AutomationIcon name="plus" size={14} />
            Add Action
          </Button>
        </div>

        {actions.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">
            Add at least one action to perform when conditions are met.
          </p>
        ) : (
          <div className="space-y-3">
            {actions.map((action, index) => (
              <div key={index} className="flex items-center gap-2">
                <select
                  value={action.type}
                  onChange={(e) => updateAction(index, { type: e.target.value as WorkflowActionType })}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ACTION_OPTIONS.map((type) => (
                    <option key={type} value={type}>{ACTION_LABELS[type]}</option>
                  ))}
                </select>
                {action.type === "add_tag" && (
                  <Input
                    value={String(action.config.tag ?? "")}
                    onChange={(e) => updateAction(index, { config: { ...action.config, tag: e.target.value } })}
                    placeholder="Tag name"
                    className="flex-1"
                  />
                )}
                {action.type === "move_pipeline_stage" && (
                  <select
                    value={String(action.config.stage ?? "")}
                    onChange={(e) => updateAction(index, { config: { ...action.config, stage: e.target.value } })}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select stage</option>
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="proposal_sent">Proposal Sent</option>
                    <option value="negotiation">Negotiation</option>
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                  </select>
                )}
                {action.type === "create_reminder" && (
                  <Input
                    value={String(action.config.title ?? "")}
                    onChange={(e) => updateAction(index, { config: { ...action.config, title: e.target.value } })}
                    placeholder="Reminder title"
                    className="flex-1"
                  />
                )}
                {action.type === "send_notification" && (
                  <Input
                    value={String(action.config.message ?? "")}
                    onChange={(e) => updateAction(index, { config: { ...action.config, message: e.target.value } })}
                    placeholder="Notification message"
                    className="flex-1"
                  />
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeAction(index)}
                  aria-label="Remove action"
                >
                  <AutomationIcon name="x" size={14} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Schedule */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 text-amber-600">
            <AutomationIcon name="clock" size={16} />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">Schedule</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {(["event", "daily", "weekly", "monthly", "custom"] as ScheduleType[]).map((type) => (
            <button
              key={type}
              onClick={() => setScheduleType(type)}
              className={`rounded-lg border px-3 py-2 text-xs font-medium capitalize transition-colors duration-150 ${
                scheduleType === type
                  ? "border-amber-500 bg-amber-50 text-amber-700"
                  : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </Card>

      {/* Execution Preview */}
      <Card className="p-6 border-blue-100 bg-blue-50/30">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white">
            <AutomationIcon name="shield" size={16} />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">Execution Preview</h3>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400 w-20">Trigger</span>
            <span className="text-slate-700">{preview.trigger}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400 w-20">Condition</span>
            <span className="text-slate-700">{preview.condition}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400 w-20">Action</span>
            <span className="text-slate-700">{preview.action}</span>
          </div>
          <div className="mt-3 rounded-lg bg-white border border-blue-100 p-3 text-xs text-blue-700">
            {preview.estimatedResult}
          </div>
        </div>
      </Card>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600" role="alert">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        {onClose && (
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSave} loading={isPending}>
          {initial?.id ? "Save Changes" : "Create Workflow"}
        </Button>
      </div>
    </div>
  );
}
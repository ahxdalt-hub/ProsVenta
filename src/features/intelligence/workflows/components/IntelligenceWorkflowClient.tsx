// ============================================================================
// Prosventa Intelligence-Powered Workflows — Client Component
// Stage 4 — Phase 9: Intelligence-Powered Workflows
// ============================================================================
"use client";

import { useState, useCallback } from "react";
import {
  createWorkflowAction,
  updateWorkflowAction,
  deleteWorkflowAction,
  setWorkflowStatusAction,
  getExecutionHistoryAction,
  getPendingApprovalsAction,
  decideApprovalAction,
} from "../actions";
import {
  INTELLIGENCE_TRIGGER_OPTIONS,
  INTELLIGENCE_TRIGGER_LABELS,
  INTELLIGENCE_CONDITION_LABELS,
  INTELLIGENCE_ACTION_OPTIONS,
  INTELLIGENCE_ACTION_LABELS,
  WORKFLOW_STATUS_LABELS,
} from "../types";
import type {
  IntelligenceWorkflow,
  IntelligenceCondition,
  IntelligenceAction,
  IntelligenceTriggerType,
  IntelligenceConditionField,
  IntelligenceActionType,
  WorkflowStatus,
} from "../types";

interface Props {
  workflows: IntelligenceWorkflow[];
  initialExecutions: any[];
  initialApprovals: any[];
}

// ============================================================================
// Builder State
// ============================================================================
interface BuilderState {
  name: string;
  description: string;
  trigger_type: IntelligenceTriggerType;
  conditions: IntelligenceCondition[];
  actions: IntelligenceAction[];
  requires_approval: boolean;
}

const EMPTY_BUILDER: BuilderState = {
  name: "",
  description: "",
  trigger_type: "high_priority_signal",
  conditions: [],
  actions: [],
  requires_approval: false,
};

// ============================================================================
// Condition / Action value options
// ============================================================================
const CONDITION_VALUE_OPTIONS: Partial<Record<IntelligenceConditionField, string[]>> = {
  signal_importance: ["critical", "high", "medium", "low"],
  signal_confidence: ["high", "medium", "low"],
  prospect_seniority: ["executive", "director", "manager", "individual"],
  recommendation_priority: ["high", "medium", "low"],
};

export default function IntelligenceWorkflowClient({ workflows, initialExecutions, initialApprovals }: Props) {
  const [builder, setBuilder] = useState<BuilderState>(EMPTY_BUILDER);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [executions, setExecutions] = useState(initialExecutions);
  const [approvals, setApprovals] = useState(initialApprovals);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refreshExecutions = useCallback(async () => {
    const data = await getExecutionHistoryAction();
    setExecutions(data);
  }, []);

  const refreshApprovals = useCallback(async () => {
    const data = await getPendingApprovalsAction();
    setApprovals(data);
  }, []);

  const handleSaveWorkflow = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      if (editingId) {
        const result = await updateWorkflowAction(editingId, {
          name: builder.name,
          description: builder.description,
          trigger_type: builder.trigger_type,
          conditions: builder.conditions,
          actions: builder.actions,
          requires_approval: builder.requires_approval,
        });
        if (result.status === "failed") {
          setError(result.message);
          return;
        }
      } else {
        const result = await createWorkflowAction({
          name: builder.name,
          description: builder.description,
          trigger_type: builder.trigger_type,
          trigger_config: {},
          conditions: builder.conditions,
          actions: builder.actions,
          requires_approval: builder.requires_approval,
          max_executions_per_event: 1,
        });
        if (result.status === "failed") {
          setError(result.message);
          return;
        }
      }
      setMessage("Workflow saved.");
      setShowBuilder(false);
      setBuilder(EMPTY_BUILDER);
      setEditingId(null);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save workflow.");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, status: WorkflowStatus) => {
    setLoading(true);
    setError(null);
    try {
      const result = await setWorkflowStatusAction(id, status);
      if (result.status === "failed") setError(result.message);
      window.location.reload();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this workflow?")) return;
    setLoading(true);
    setError(null);
    try {
      const result = await deleteWorkflowAction(id);
      if (result.status === "failed") setError(result.message);
      window.location.reload();
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (w: IntelligenceWorkflow) => {
    setBuilder({
      name: w.name,
      description: w.description,
      trigger_type: w.trigger_type as IntelligenceTriggerType,
      conditions: (w.conditions ?? []) as IntelligenceCondition[],
      actions: (w.actions ?? []) as IntelligenceAction[],
      requires_approval: w.requires_approval,
    });
    setEditingId(w.id);
    setShowBuilder(true);
  };

  const handleApproval = async (approvalId: string, decision: "approved" | "rejected") => {
    const result = await decideApprovalAction(approvalId, decision);
    if (result.status === "failed") setError(result.message);
    await refreshApprovals();
  };

  const addCondition = () => {
    setBuilder((b) => ({
      ...b,
      conditions: [...b.conditions, { field: "icp_score", operator: "greater_than", value: 80 }],
    }));
  };

  const addAction = () => {
    setBuilder((b) => ({
      ...b,
      actions: [...b.actions, { type: "create_task", config: {} }],
    }));
  };

  const updateCondition = (index: number, patch: Partial<IntelligenceCondition>) => {
    setBuilder((b) => ({
      ...b,
      conditions: b.conditions.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    }));
  };

  const updateAction = (index: number, patch: Partial<IntelligenceAction>) => {
    setBuilder((b) => ({
      ...b,
      actions: b.actions.map((a, i) => (i === index ? { ...a, ...patch } : a)),
    }));
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {message && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">{message}</div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Intelligence Workflows</h2>
          <p className="text-sm text-gray-500">
            Connect intelligence signals to safe, user-approved actions. New workflows start as drafts.
          </p>
        </div>
        <button
          onClick={() => {
            setBuilder(EMPTY_BUILDER);
            setEditingId(null);
            setShowBuilder(true);
          }}
          disabled={loading}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          New Workflow
        </button>
      </div>

      {/* Builder */}
      {showBuilder && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold">
            {editingId ? "Edit Workflow" : "Create Workflow"}
          </h3>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Name</label>
                <input
                  value={builder.name}
                  onChange={(e) => setBuilder({ ...builder, name: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="e.g. High-fit prospect review"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Trigger</label>
                <select
                  value={builder.trigger_type}
                  onChange={(e) => setBuilder({ ...builder, trigger_type: e.target.value as IntelligenceTriggerType })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  {INTELLIGENCE_TRIGGER_OPTIONS.map((t) => (
                    <option key={t} value={t}>{INTELLIGENCE_TRIGGER_LABELS[t]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Description</label>
              <textarea
                value={builder.description}
                onChange={(e) => setBuilder({ ...builder, description: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                rows={2}
                placeholder="What does this workflow do?"
              />
            </div>

            {/* Conditions */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium">Conditions (ALL must match)</label>
                <button onClick={addCondition} className="text-sm text-blue-600 hover:underline">
                  + Add condition
                </button>
              </div>
              {builder.conditions.length === 0 && (
                <p className="text-xs text-gray-400">No conditions — runs on every matching trigger.</p>
              )}
              {builder.conditions.map((cond, idx) => (
                <div key={idx} className="mb-2 flex flex-wrap items-center gap-2 rounded-md bg-gray-50 p-2">
                  <select
                    value={cond.field}
                    onChange={(e) => updateCondition(idx, { field: e.target.value as IntelligenceConditionField })}
                    className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                  >
                    {Object.entries(INTELLIGENCE_CONDITION_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                  <select
                    value={cond.operator}
                    onChange={(e) => updateCondition(idx, { operator: e.target.value as any })}
                    className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                  >
                    <option value="equals">Equals</option>
                    <option value="not_equals">Not equals</option>
                    <option value="greater_than">Greater than</option>
                    <option value="less_than">Less than</option>
                    <option value="is_set">Is set</option>
                    <option value="is_not_set">Is not set</option>
                  </select>
                  {cond.operator !== "is_set" && cond.operator !== "is_not_set" && (
                    <input
                      value={String(cond.value ?? "")}
                      onChange={(e) => updateCondition(idx, { value: e.target.value })}
                      className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                      placeholder="Value"
                      list={`cond-values-${idx}`}
                    />
                  )}
                  <button
                    onClick={() => setBuilder((b) => ({ ...b, conditions: b.conditions.filter((_, i) => i !== idx) }))}
                    className="text-sm text-red-500"
                  >
                    ✕
                  </button>
                  {CONDITION_VALUE_OPTIONS[cond.field] && (
                    <datalist id={`cond-values-${idx}`}>
                      {CONDITION_VALUE_OPTIONS[cond.field]!.map((v) => (
                        <option key={v} value={v} />
                      ))}
                    </datalist>
                  )}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium">Actions (SAFE internal actions only)</label>
                <button onClick={addAction} className="text-sm text-blue-600 hover:underline">
                  + Add action
                </button>
              </div>
              {builder.actions.length === 0 && (
                <p className="text-xs text-gray-400">No actions configured.</p>
              )}
              {builder.actions.map((action, idx) => (
                <div key={idx} className="mb-2 flex flex-wrap items-center gap-2 rounded-md bg-gray-50 p-2">
                  <select
                    value={action.type}
                    onChange={(e) => updateAction(idx, { type: e.target.value as IntelligenceActionType })}
                    className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                  >
                    {INTELLIGENCE_ACTION_OPTIONS.map((a) => (
                      <option key={a} value={a}>{INTELLIGENCE_ACTION_LABELS[a]}</option>
                    ))}
                  </select>
                  {action.type === "create_task" && (
                    <input
                      value={(action.config.title as string) ?? ""}
                      onChange={(e) => updateAction(idx, { config: { ...action.config, title: e.target.value } })}
                      className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                      placeholder="Task title"
                    />
                  )}
                  {action.type === "update_prospect_status" && (
                    <input
                      value={(action.config.status as string) ?? ""}
                      onChange={(e) => updateAction(idx, { config: { ...action.config, status: e.target.value } })}
                      className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                      placeholder="New status (e.g. qualified)"
                    />
                  )}
                  <button
                    onClick={() => setBuilder((b) => ({ ...b, actions: b.actions.filter((_, i) => i !== idx) }))}
                    className="text-sm text-red-500"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={builder.requires_approval}
                onChange={(e) => setBuilder({ ...builder, requires_approval: e.target.checked })}
              />
              Require explicit user approval before executing actions
            </label>

            <div className="flex gap-2">
              <button
                onClick={handleSaveWorkflow}
                disabled={loading || !builder.name}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Saving..." : editingId ? "Save Changes" : "Create Workflow"}
              </button>
              <button
                onClick={() => { setShowBuilder(false); setEditingId(null); setBuilder(EMPTY_BUILDER); }}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workflow List */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-4 py-3">
          <h3 className="text-base font-semibold">Workflows</h3>
        </div>
        {workflows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-400">No intelligence workflows yet. Create one to get started.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {workflows.map((w) => (
              <li key={w.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{w.name}</p>
                  <p className="truncate text-xs text-gray-500">
                    {INTELLIGENCE_TRIGGER_LABELS[w.trigger_type as IntelligenceTriggerType] ?? w.trigger_type}
                    {w.conditions.length > 0 && ` • ${w.conditions.length} condition(s)`}
                    {w.actions.length > 0 && ` • ${w.actions.length} action(s)`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    w.status === "active" ? "bg-green-100 text-green-700"
                    : w.status === "paused" ? "bg-amber-100 text-amber-700"
                    : w.status === "archived" ? "bg-gray-200 text-gray-600"
                    : "bg-blue-100 text-blue-700"
                  }`}>
                    {WORKFLOW_STATUS_LABELS[w.status as WorkflowStatus] ?? w.status}
                  </span>
                  <button onClick={() => handleEdit(w)} className="text-sm text-blue-600 hover:underline">Edit</button>
                  {w.status === "draft" && (
                    <button onClick={() => handleStatusChange(w.id, "active")} className="text-sm text-green-600 hover:underline">Activate</button>
                  )}
                  {w.status === "active" && (
                    <button onClick={() => handleStatusChange(w.id, "paused")} className="text-sm text-amber-600 hover:underline">Pause</button>
                  )}
                  {w.status === "paused" && (
                    <button onClick={() => handleStatusChange(w.id, "active")} className="text-sm text-green-600 hover:underline">Resume</button>
                  )}
                  {w.status !== "archived" && (
                    <button onClick={() => handleStatusChange(w.id, "archived")} className="text-sm text-gray-500 hover:underline">Archive</button>
                  )}
                  <button onClick={() => handleDelete(w.id)} className="text-sm text-red-500 hover:underline">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pending Approvals */}
      {approvals.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 shadow-sm">
          <div className="border-b border-amber-200 px-4 py-3">
            <h3 className="text-base font-semibold text-amber-800">Pending Approvals</h3>
          </div>
          <ul className="divide-y divide-amber-100">
            {approvals.map((a: any) => (
              <li key={a.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{a.action_type.replace(/_/g, " ")}</p>
                  <p className="text-xs text-gray-500">
                    {Object.entries(a.preview?.details ?? {}).map(([k, v]) => `${k}: ${v}`).join(" • ")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleApproval(a.id, "approved")} className="rounded-md bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700">Approve</button>
                  <button onClick={() => handleApproval(a.id, "rejected")} className="rounded-md bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700">Reject</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Execution History */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h3 className="text-base font-semibold">Execution History</h3>
          <button onClick={refreshExecutions} className="text-sm text-blue-600 hover:underline">Refresh</button>
        </div>
        {executions.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-400">No executions yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {executions.map((e: any) => (
              <li key={e.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{e.workflow?.name ?? "Workflow"}</p>
                  <p className="text-xs text-gray-500">
                    {e.prospect_name ?? "No prospect"} • {new Date(e.created_at).toLocaleString()}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  e.status === "completed" ? "bg-green-100 text-green-700"
                  : e.status === "failed" ? "bg-red-100 text-red-700"
                  : e.status === "waiting_approval" ? "bg-amber-100 text-amber-700"
                  : "bg-gray-100 text-gray-600"
                }`}>
                  {e.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
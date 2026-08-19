"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AutomationIcon } from "./icons";
import { WorkflowCard } from "./WorkflowCard";
import { AutomationHistory } from "./AutomationHistory";
import { ReminderCard } from "./ReminderCard";
import { SuggestionCard } from "./SuggestionCard";
import { WorkflowBuilder } from "./WorkflowBuilder";
import type { Workflow, WorkflowExecution, Reminder, AutomationSuggestion } from "../types";

interface AutomationClientProps {
  workflows: Workflow[];
  executions: WorkflowExecution[];
  reminders: Reminder[];
  suggestions: AutomationSuggestion[];
  stats: {
    totalWorkflows: number;
    activeWorkflows: number;
    inactiveWorkflows: number;
    pausedWorkflows: number;
    totalExecutions: number;
    totalSuccesses: number;
    totalFailures: number;
    lastRunAt: string | null;
  };
}

export function AutomationClient({
  workflows,
  executions,
  reminders,
  suggestions,
  stats,
}: AutomationClientProps) {
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);

  const activeWorkflows = workflows.filter((w) => w.is_active && !w.is_paused);
  const inactiveWorkflows = workflows.filter((w) => !w.is_active && !w.is_paused);
  const pausedWorkflows = workflows.filter((w) => w.is_paused);

  function handleNewWorkflow() {
    setEditingWorkflow(null);
    setShowBuilder(true);
  }

  function handleEditWorkflow(workflow: Workflow) {
    setEditingWorkflow(workflow);
    setShowBuilder(true);
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="dashboard-enter flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Automation Center</h1>
          <p className="mt-1 text-sm text-slate-500">
            Automate repetitive sales tasks and focus on closing deals.
          </p>
        </div>
        <Button onClick={handleNewWorkflow}>
          <AutomationIcon name="plus" size={16} />
          New Workflow
        </Button>
      </div>

      {/* Stats */}
      <div className="dashboard-enter grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" style={{ animationDelay: "60ms" }}>
        <StatCard
          label="Active Workflows"
          value={stats.activeWorkflows}
          icon={<AutomationIcon name="bolt" size={20} />}
          color="blue"
        />
        <StatCard
          label="Total Executions"
          value={stats.totalExecutions}
          icon={<AutomationIcon name="history" size={20} />}
          color="green"
        />
        <StatCard
          label="Success Rate"
          value={stats.totalExecutions > 0 ? `${Math.round((stats.totalSuccesses / stats.totalExecutions) * 100)}%` : "—"}
          icon={<AutomationIcon name="shield" size={20} />}
          color="purple"
        />
        <StatCard
          label="Paused"
          value={stats.pausedWorkflows}
          icon={<AutomationIcon name="pause" size={20} />}
          color="amber"
        />
      </div>

      {/* Workflow Builder */}
      {showBuilder && (
        <div className="dashboard-enter">
          <WorkflowBuilder
            initial={editingWorkflow ?? undefined}
            onClose={() => {
              setShowBuilder(false);
              setEditingWorkflow(null);
            }}
          />
        </div>
      )}

      {/* Workflows */}
      <div className="dashboard-enter space-y-6" style={{ animationDelay: "120ms" }}>
        {/* Active */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900">Active Workflows</h2>
            <span className="text-xs text-slate-400">{activeWorkflows.length}</span>
          </div>
          {activeWorkflows.length === 0 ? (
            <EmptyWorkflows onNew={handleNewWorkflow} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeWorkflows.map((workflow) => (
                <WorkflowCard key={workflow.id} workflow={workflow} onEdit={handleEditWorkflow} />
              ))}
            </div>
          )}
        </section>

        {/* Inactive */}
        {inactiveWorkflows.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900">Inactive Workflows</h2>
              <span className="text-xs text-slate-400">{inactiveWorkflows.length}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {inactiveWorkflows.map((workflow) => (
                <WorkflowCard key={workflow.id} workflow={workflow} onEdit={handleEditWorkflow} />
              ))}
            </div>
          </section>
        )}

        {/* Paused */}
        {pausedWorkflows.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900">Paused Workflows</h2>
              <span className="text-xs text-slate-400">{pausedWorkflows.length}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pausedWorkflows.map((workflow) => (
                <WorkflowCard key={workflow.id} workflow={workflow} onEdit={handleEditWorkflow} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Two-column: History + Reminders/Suggestions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: History */}
        <div className="lg:col-span-2 dashboard-enter space-y-6" style={{ animationDelay: "180ms" }}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900">Automation History</h2>
              <span className="text-xs text-slate-400">{executions.length} recent</span>
            </div>
            <AutomationHistory executions={executions} />
          </div>
        </div>

        {/* Right: Reminders + Suggestions */}
        <div className="dashboard-enter space-y-6" style={{ animationDelay: "180ms" }}>
          {/* Reminders */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900">Reminders</h2>
              <span className="text-xs text-slate-400">{reminders.length}</span>
            </div>
            {reminders.length === 0 ? (
              <Card>
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-50 text-slate-400 mb-2">
                    <AutomationIcon name="clock" size={20} />
                  </div>
                  <p className="text-sm text-slate-400">No reminders yet</p>
                </div>
              </Card>
            ) : (
              <div className="space-y-2">
                {reminders.map((reminder) => (
                  <ReminderCard key={reminder.id} reminder={reminder} />
                ))}
              </div>
            )}
          </div>

          {/* Smart Suggestions */}
          {suggestions.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-900">Smart Suggestions</h2>
                <span className="text-xs text-slate-400">AI</span>
              </div>
              <div className="space-y-3">
                {suggestions.map((suggestion) => (
                  <SuggestionCard key={suggestion.id} suggestion={suggestion} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: "blue" | "green" | "purple" | "amber";
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <div className="premium-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function EmptyWorkflows({ onNew }: { onNew: () => void }) {
  return (
    <Card>
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 text-blue-500 mb-3">
          <AutomationIcon name="bolt" size={24} />
        </div>
        <p className="text-sm font-medium text-slate-900">No active workflows</p>
        <p className="mt-1 text-xs text-slate-400">
          Create your first automation to start saving time.
        </p>
        <Button size="sm" className="mt-4" onClick={onNew}>
          <AutomationIcon name="plus" size={14} />
          Create Workflow
        </Button>
      </div>
    </Card>
  );
}
// ============================================================================
// Prosventa AI Assistant — Reusable Card Components
// Stage 3 — Phase 8: AI-Powered Sales Workspace
// ============================================================================
// Reusable, memoized components for AI message presentation.
// All components follow the Prosventa enterprise design language.
// ============================================================================

"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type {
  AIProspectSummary,
  AISuggestion,
  AIRiskItem,
  AITimelineSummary,
  AIQuickAction,
  AIQuickActionType,
} from "../types";
import {
  SparkleIcon,
  CheckIcon,
  WarningIcon,
  ClockIcon,
  TargetIcon,
  BuildingIcon,
  CalendarIcon,
  UserIcon,
  MailIcon,
  PhoneIcon,
  SearchIcon,
} from "./icons";

// ============================================================================
// Priority Badge
// ============================================================================

interface PriorityBadgeProps {
  priority: "high" | "medium" | "low";
}

export const PriorityBadge = memo(function PriorityBadge({ priority }: PriorityBadgeProps) {
  const styles = {
    high: "bg-blue-50 text-blue-600 border-blue-100",
    medium: "bg-amber-50 text-amber-600 border-amber-100",
    low: "bg-slate-50 text-slate-500 border-slate-100",
  };

  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", styles[priority])}>
      {priority}
    </span>
  );
});

// ============================================================================
// Severity Badge
// ============================================================================

interface SeverityBadgeProps {
  severity: "high" | "medium" | "low";
}

export const SeverityBadge = memo(function SeverityBadge({ severity }: SeverityBadgeProps) {
  const styles = {
    high: "bg-red-50 text-red-600 border-red-100",
    medium: "bg-amber-50 text-amber-600 border-amber-100",
    low: "bg-slate-50 text-slate-500 border-slate-100",
  };

  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", styles[severity])}>
      {severity}
    </span>
  );
});

// ============================================================================
// Action Button
// ============================================================================

interface ActionButtonProps {
  action: AIQuickAction;
  onAction: (action: AIQuickAction) => void;
}

const ACTION_ICONS: Record<AIQuickActionType, React.ReactNode> = {
  assign: <UserIcon className="w-3.5 h-3.5" />,
  open_prospect: <BuildingIcon className="w-3.5 h-3.5" />,
  schedule_followup: <CalendarIcon className="w-3.5 h-3.5" />,
  create_task: <CheckIcon className="w-3.5 h-3.5" />,
  mark_qualified: <TargetIcon className="w-3.5 h-3.5" />,
  send_email: <MailIcon className="w-3.5 h-3.5" />,
  call: <PhoneIcon className="w-3.5 h-3.5" />,
  research: <SearchIcon className="w-3.5 h-3.5" />,
};

export const ActionButton = memo(function ActionButton({ action, onAction }: ActionButtonProps) {
  return (
    <button
      onClick={() => onAction(action)}
      disabled={action.disabled}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-slate-600 disabled:hover:border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
      title={action.disabled ? "Select a prospect first" : action.label}
    >
      {ACTION_ICONS[action.type]}
      {action.label}
    </button>
  );
});

// ============================================================================
// Quick Actions Row
// ============================================================================

interface QuickActionsRowProps {
  actions?: AIQuickAction[];
  onAction: (action: AIQuickAction) => void;
}

export const QuickActionsRow = memo(function QuickActionsRow({ actions, onAction }: QuickActionsRowProps) {
  if (!actions || actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100">
      {actions.map((action) => (
        <ActionButton key={action.id} action={action} onAction={onAction} />
      ))}
    </div>
  );
});

// ============================================================================
// Suggestion Card
// ============================================================================

interface SuggestionCardProps {
  suggestion: AISuggestion;
  onAction?: (action: AIQuickAction) => void;
}

export const SuggestionCard = memo(function SuggestionCard({ suggestion, onAction }: SuggestionCardProps) {
  const handleAction = () => {
    if (onAction && suggestion.action) {
      onAction({
        id: `sug-action-${suggestion.id}`,
        type: suggestion.action,
        label: suggestion.title,
        prospectId: suggestion.prospectId ?? null,
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3"
    >
      <span className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-50 text-blue-600 shrink-0 mt-0.5">
        <SparkleIcon className="w-3 h-3" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-900">{suggestion.title}</p>
          <PriorityBadge priority={suggestion.priority} />
        </div>
        <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
          {suggestion.description}
        </p>
        {suggestion.action && onAction && (
          <button
            onClick={handleAction}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            {suggestion.action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} →
          </button>
        )}
      </div>
    </motion.div>
  );
});

// ============================================================================
// Risk Card
// ============================================================================

interface RiskCardProps {
  risk: AIRiskItem;
}

export const RiskCard = memo(function RiskCard({ risk }: RiskCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-start gap-3 rounded-lg border border-red-50 bg-red-50/30 p-3"
    >
      <span className="flex items-center justify-center w-6 h-6 rounded-md bg-red-50 text-red-500 shrink-0 mt-0.5">
        <WarningIcon className="w-3 h-3" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-900">{risk.title}</p>
          <SeverityBadge severity={risk.severity} />
        </div>
        <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
          {risk.description}
        </p>
      </div>
    </motion.div>
  );
});

// ============================================================================
// Summary Card
// ============================================================================

interface SummaryCardProps {
  summary: AIProspectSummary;
}

export const SummaryCard = memo(function SummaryCard({ summary }: SummaryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-lg border border-slate-100 bg-white p-3 space-y-3"
    >
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-50 text-blue-600 shrink-0">
          <BuildingIcon className="w-3 h-3" />
        </span>
        <p className="text-sm font-semibold text-slate-900">Company Overview</p>
      </div>
      <p className="text-xs text-slate-600 leading-relaxed">{summary.companyOverview}</p>

      {summary.industry && (
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-slate-400 w-20 shrink-0">Industry</span>
          <span className="text-xs text-slate-700 font-medium">{summary.industry}</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-[11px] font-medium text-slate-400 w-20 shrink-0">Lead Quality</span>
        <span className="text-xs text-slate-700 font-medium">{summary.leadQuality}</span>
      </div>

      {summary.importantNotes.length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-slate-400 mb-1.5">Important Notes</p>
          <div className="space-y-1.5">
            {summary.importantNotes.map((note, i) => (
              <p key={i} className="text-xs text-slate-600 leading-relaxed pl-2 border-l-2 border-blue-100">
                {note}
              </p>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-[11px] font-medium text-slate-400 mb-1">Recent Activity</p>
        <p className="text-xs text-slate-600 leading-relaxed">{summary.recentActivity}</p>
      </div>

      <div className="rounded-lg bg-blue-50/50 border border-blue-100 p-2.5">
        <p className="text-[11px] font-medium text-blue-600 mb-0.5">Suggested Next Step</p>
        <p className="text-xs text-slate-700 leading-relaxed">{summary.suggestedNextStep}</p>
      </div>
    </motion.div>
  );
});

// ============================================================================
// Timeline Card
// ============================================================================

interface TimelineCardProps {
  timeline: AITimelineSummary;
}

export const TimelineCard = memo(function TimelineCard({ timeline }: TimelineCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-lg border border-slate-100 bg-white p-3 space-y-3"
    >
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-50 text-blue-600 shrink-0">
          <ClockIcon className="w-3 h-3" />
        </span>
        <p className="text-sm font-semibold text-slate-900">Activity Timeline</p>
      </div>

      <p className="text-xs text-slate-600 leading-relaxed">{timeline.text}</p>

      {timeline.events.length > 0 && (
        <div className="space-y-2">
          {timeline.events.slice(0, 5).map((event, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-slate-700 leading-relaxed">{event.description}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {new Date(event.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
});

// ============================================================================
// Recommendation Card
// ============================================================================

interface RecommendationCardProps {
  suggestions: AISuggestion[];
  onAction?: (action: AIQuickAction) => void;
}

export const RecommendationCard = memo(function RecommendationCard({ suggestions, onAction }: RecommendationCardProps) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="space-y-2">
      {suggestions.map((suggestion) => (
        <SuggestionCard key={suggestion.id} suggestion={suggestion} onAction={onAction} />
      ))}
    </div>
  );
});

// ============================================================================
// Risk List Card
// ============================================================================

interface RiskListCardProps {
  risks: AIRiskItem[];
}

export const RiskListCard = memo(function RiskListCard({ risks }: RiskListCardProps) {
  if (!risks || risks.length === 0) return null;

  return (
    <div className="space-y-2">
      {risks.map((risk) => (
        <RiskCard key={risk.id} risk={risk} />
      ))}
    </div>
  );
});

// ============================================================================
// Message Content Renderer
// ============================================================================

interface MessageContentProps {
  content: string;
}

export const MessageContent = memo(function MessageContent({ content }: MessageContentProps) {
  // Simple markdown-ish rendering: bold, bullets, line breaks
  const lines = content.split("\n");

  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        if (line.trim() === "") return <div key={i} className="h-1" />;

        // Bullet point
        if (line.trim().startsWith("•")) {
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 shrink-0" />
              <span className="text-xs text-slate-600 leading-relaxed">{renderInline(line.trim().slice(1).trim())}</span>
            </div>
          );
        }

        // Numbered list
        const numbered = line.match(/^(\d+)\.\s+(.*)/);
        if (numbered) {
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="text-[10px] font-bold text-blue-600 mt-0.5 shrink-0 w-4">{numbered[1]}.</span>
              <span className="text-xs text-slate-600 leading-relaxed">{renderInline(numbered[2])}</span>
            </div>
          );
        }

        return (
          <p key={i} className="text-xs text-slate-600 leading-relaxed">
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
});

function renderInline(text: string): React.ReactNode {
  // Bold: **text**
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return (
        <strong key={i} className="font-semibold text-slate-900">
          {part}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
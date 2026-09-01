// ============================================================================
// Prosventa AI — Result Cards
// ============================================================================
// Memoized presentation components for assistant responses. Structured
// business information is rendered as clean intelligence cards that reuse
// the Prosventa design system — typography, radii, borders, shadows and
// motion curves are shared with the rest of the dashboard.
// ============================================================================

"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { transitions } from "@/lib/motion";
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
// Shared entrance transition — small fade + upward movement
// ============================================================================

const cardMotion = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  transition: transitions.base,
} as const;

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
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        styles[priority]
      )}
    >
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
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        styles[severity]
      )}
    >
      {severity}
    </span>
  );
});

// ============================================================================
// Card Header — shared pattern for all intelligence cards
// ============================================================================

const CARD_ICON_STYLES: Record<string, string> = {
  blue: "bg-blue-50 text-blue-600",
  red: "bg-red-50 text-red-500",
};

function CardHeader({
  icon,
  tint,
  title,
}: {
  icon: React.ReactNode;
  tint: keyof typeof CARD_ICON_STYLES;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
          CARD_ICON_STYLES[tint]
        )}
      >
        {icon}
      </span>
      <p className="text-[13px] font-semibold tracking-tight text-slate-900">{title}</p>
    </div>
  );
}

// ============================================================================
// Action Button
// ============================================================================

interface ActionButtonProps {
  action: AIQuickAction;
  onAction: (action: AIQuickAction) => void;
}

const ACTION_ICONS: Record<AIQuickActionType, React.ReactNode> = {
  assign: <UserIcon className="h-3.5 w-3.5" />,
  open_prospect: <BuildingIcon className="h-3.5 w-3.5" />,
  schedule_followup: <CalendarIcon className="h-3.5 w-3.5" />,
  create_task: <CheckIcon className="h-3.5 w-3.5" />,
  mark_qualified: <TargetIcon className="h-3.5 w-3.5" />,
  send_email: <MailIcon className="h-3.5 w-3.5" />,
  call: <PhoneIcon className="h-3.5 w-3.5" />,
  research: <SearchIcon className="h-3.5 w-3.5" />,
};

export const ActionButton = memo(function ActionButton({ action, onAction }: ActionButtonProps) {
  return (
    <button
      onClick={() => onAction(action)}
      disabled={action.disabled}
      className="btn-press inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors duration-150 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-600"
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

export const QuickActionsRow = memo(function QuickActionsRow({
  actions,
  onAction,
}: QuickActionsRowProps) {
  if (!actions || actions.length === 0) return null;

  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
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

export const SuggestionCard = memo(function SuggestionCard({
  suggestion,
  onAction,
}: SuggestionCardProps) {
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
      {...cardMotion}
      className="card-hover flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs"
    >
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600">
        <SparkleIcon className="h-3 w-3" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[13px] font-semibold tracking-tight text-slate-900">
            {suggestion.title}
          </p>
          <PriorityBadge priority={suggestion.priority} />
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{suggestion.description}</p>
        {suggestion.action && onAction && (
          <button
            onClick={handleAction}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 transition-colors hover:text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
      {...cardMotion}
      className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50/40 p-3"
    >
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-500">
        <WarningIcon className="h-3 w-3" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[13px] font-semibold tracking-tight text-slate-900">{risk.title}</p>
          <SeverityBadge severity={risk.severity} />
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{risk.description}</p>
      </div>
    </motion.div>
  );
});

// ============================================================================
// Prospect Overview Card — structured summary of a single prospect
// ============================================================================

interface SummaryCardProps {
  summary: AIProspectSummary;
}

export const SummaryCard = memo(function SummaryCard({ summary }: SummaryCardProps) {
  return (
    <motion.div
      {...cardMotion}
      className="space-y-3.5 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-xs"
    >
      <CardHeader icon={<BuildingIcon className="h-3 w-3" />} tint="blue" title="Prospect overview" />

      <p className="text-[13px] leading-relaxed text-slate-600">{summary.companyOverview}</p>

      <dl className="space-y-2">
        {summary.industry && (
          <div className="flex items-baseline gap-3">
            <dt className="w-24 shrink-0 text-[11px] font-medium text-slate-400">Industry</dt>
            <dd className="text-xs font-medium text-slate-700">{summary.industry}</dd>
          </div>
        )}
        <div className="flex items-baseline gap-3">
          <dt className="w-24 shrink-0 text-[11px] font-medium text-slate-400">Lead quality</dt>
          <dd className="text-xs font-medium text-slate-700">{summary.leadQuality}</dd>
        </div>
      </dl>

      {summary.importantNotes.length > 0 && (
        <div>
          <p className="mb-1.5 text-[11px] font-medium text-slate-400">Important notes</p>
          <div className="space-y-1.5">
            {summary.importantNotes.map((note, i) => (
              <p
                key={i}
                className="border-l-2 border-blue-100 pl-2.5 text-xs leading-relaxed text-slate-600"
              >
                {note}
              </p>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-0.5 text-[11px] font-medium text-slate-400">Recent activity</p>
        <p className="text-xs leading-relaxed text-slate-600">{summary.recentActivity}</p>
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-2.5">
        <p className="mb-0.5 text-[11px] font-semibold text-blue-600">Suggested next step</p>
        <p className="text-xs leading-relaxed text-slate-700">{summary.suggestedNextStep}</p>
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
      {...cardMotion}
      className="space-y-3 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-xs"
    >
      <CardHeader icon={<ClockIcon className="h-3 w-3" />} tint="blue" title="Activity timeline" />

      <p className="text-[13px] leading-relaxed text-slate-600">{timeline.text}</p>

      {timeline.events.length > 0 && (
        <div className="space-y-2.5">
          {timeline.events.slice(0, 5).map((event, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <div className="min-w-0">
                <p className="text-xs leading-relaxed text-slate-700">{event.description}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">
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
// Recommendation List
// ============================================================================

interface RecommendationCardProps {
  suggestions: AISuggestion[];
  onAction?: (action: AIQuickAction) => void;
}

export const RecommendationCard = memo(function RecommendationCard({
  suggestions,
  onAction,
}: RecommendationCardProps) {
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
// Risk List
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
// Message Content Renderer — lightweight markdown-ish formatting
// ============================================================================

interface MessageContentProps {
  content: string;
}

export const MessageContent = memo(function MessageContent({ content }: MessageContentProps) {
  // Split on line breaks (LF or CRLF) without inline escape sequences.
  const lines = content.split(/\s*\r?\n\s*/);

  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        if (line.trim() === "") return <div key={i} className="h-1.5" />;

        // Bullet point
        if (line.trim().startsWith("•")) {
          return (
            <div key={i} className="flex items-start gap-2">
              <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-blue-400" />
              <span className="text-[13px] leading-relaxed text-slate-600">
                {renderInline(line.trim().slice(1).trim())}
              </span>
            </div>
          );
        }

        // Numbered list
        const numbered = line.match(/^(\d+)\.\s+(.*)/);
        if (numbered) {
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-px w-4 shrink-0 text-[11px] font-bold text-blue-600">
                {numbered[1]}.
              </span>
              <span className="text-[13px] leading-relaxed text-slate-600">
                {renderInline(numbered[2])}
              </span>
            </div>
          );
        }

        return (
          <p key={i} className="text-[13px] leading-relaxed text-slate-600">
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
"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import type { ProspectStatus } from "@/types/database";
import { STATUS_LABELS } from "./status-config";

export type TimelineEventType =
  | "created"
  | "status_changed"
  | "note_added"
  | "tag_added"
  | "imported"
  | "edited"
  | "contacted";

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  title: string;
  description?: string;
  timestamp: string;
  status?: ProspectStatus;
}

interface ProspectTimelineProps {
  events: TimelineEvent[];
}

const EVENT_ICONS: Record<TimelineEventType, React.ReactNode> = {
  created: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  status_changed: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4v16h16" />
      <polyline points="20 10 12 18 8 14" />
    </svg>
  ),
  note_added: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  ),
  tag_added: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  ),
  imported: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  edited: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  contacted: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
};

const EVENT_COLORS: Record<TimelineEventType, string> = {
  created: "bg-blue-100 text-blue-600",
  status_changed: "bg-violet-100 text-violet-600",
  note_added: "bg-amber-100 text-amber-600",
  tag_added: "bg-emerald-100 text-emerald-600",
  imported: "bg-indigo-100 text-indigo-600",
  edited: "bg-slate-100 text-slate-500",
  contacted: "bg-teal-100 text-teal-600",
};

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDate(timestamp);
}

const TimelineItem = memo(function TimelineItem({ event }: { event: TimelineEvent }) {
  return (
    <motion.li
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex gap-3"
    >
      {/* Timeline dot */}
      <div className="relative flex flex-col items-center">
        <div className={cn("flex items-center justify-center w-7 h-7 rounded-full shrink-0", EVENT_COLORS[event.type])}>
          {EVENT_ICONS[event.type]}
        </div>
        {/* Connector line */}
        <div className="w-px flex-1 bg-slate-100 mt-1" aria-hidden="true" />
      </div>

      {/* Content */}
      <div className="pb-5 min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-slate-800">
            {event.title}
          </p>
          <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
            {formatRelativeTime(event.timestamp)}
          </span>
        </div>
        {event.description && (
          <p className="mt-0.5 text-xs text-slate-500">
            {event.description}
          </p>
        )}
        {event.status && (
          <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" aria-hidden="true" />
            {STATUS_LABELS[event.status]}
          </span>
        )}
      </div>
    </motion.li>
  );
});

export function ProspectTimeline({ events }: ProspectTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-slate-400">No activity yet.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-0">
      {events.map((event) => (
        <TimelineItem key={event.id} event={event} />
      ))}
    </ul>
  );
}
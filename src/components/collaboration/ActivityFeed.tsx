"use client";

import { memo } from "react";
import { Avatar } from "@/components/ui/Avatar";
import type { ActivityEvent } from "@/types/database";

interface ActivityFeedProps {
  events: (ActivityEvent & {
    actor: { full_name: string | null; avatar_url: string | null } | null;
  })[];
  limit?: number;
}

function formatTimestamp(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const ACTION_LABELS: Record<string, string> = {
  prospect_created: "created a prospect",
  prospect_updated: "updated a prospect",
  prospect_status_changed: "changed prospect status",
  prospect_assigned: "assigned a prospect",
  prospect_owner_changed: "changed prospect owner",
  prospect_deleted: "deleted a prospect",
  note_added: "added a note",
  comment_added: "commented on a prospect",
  comment_replied: "replied to a comment",
  member_invited: "invited a new member",
  member_joined: "joined the workspace",
  member_removed: "removed a member",
  member_role_changed: "changed a member's role",
  import_completed: "completed an import",
  export_completed: "completed an export",
  view_shared: "shared a view",
  list_created: "created a saved list",
  list_updated: "updated a saved list",
};

function getActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? `performed action: ${action.replace(/_/g, " ")}`;
}

function getActionIcon(action: string) {
  switch (true) {
    case action.includes("prospect"):
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
      );
    case action.includes("comment") || action.includes("note"):
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
      );
    case action.includes("member"):
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
      );
    case action.includes("import") || action.includes("export"):
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
      );
    case action.includes("view") || action.includes("list"):
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" /></svg>
      );
    default:
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
      );
  }
}

const ActivityItem = memo(function ActivityItem({ event }: { event: ActivityFeedProps["events"][number] }) {
  const actorName = event.actor?.full_name ?? "Unknown user";
  const entityName = event.entity_name;

  return (
    <div className="flex gap-3 py-3">
      {/* Actor avatar */}
      <Avatar
        src={event.actor?.avatar_url}
        name={event.actor?.full_name}
        size="sm"
        className="shrink-0"
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 leading-relaxed">
          <span className="font-semibold text-slate-900">{actorName}</span>{" "}
          <span className="text-slate-500">{getActionLabel(event.action)}</span>
          {entityName && (
            <span className="font-medium text-slate-700"> · {entityName}</span>
          )}
        </p>
        {event.metadata?.preview !== undefined && event.metadata?.preview !== null && (
          <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">
            {String(event.metadata.preview)}
          </p>
        )}
        <p className="mt-0.5 text-xs text-slate-400">{formatTimestamp(event.created_at)}</p>
      </div>

      {/* Action icon */}
      <div className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg bg-slate-50 text-slate-400">
        {getActionIcon(event.action)}
      </div>
    </div>
  );
});

export function ActivityFeed({ events, limit = 20 }: ActivityFeedProps) {
  const visibleEvents = events.slice(0, limit);

  if (visibleEvents.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 text-slate-400 mb-3">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /></svg>
        </div>
        <p className="text-sm font-medium text-slate-900">No activity yet</p>
        <p className="mt-1 text-xs text-slate-400">Team activity will appear here as your team works.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-50">
      {visibleEvents.map((event) => (
        <ActivityItem key={event.id} event={event} />
      ))}
    </div>
  );
}
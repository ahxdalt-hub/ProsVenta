"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import type { ProspectStatus, ProspectPriority } from "@/types/database";
import {
  STATUS_LABELS,
  STATUS_STYLES,
  STATUS_DOT_STYLES,
  PRIORITY_LABELS,
  PRIORITY_STYLES,
  PRIORITY_DOT_STYLES,
  getTagColor,
} from "./status-config";

interface StatusBadgeProps {
  status: ProspectStatus;
  size?: "sm" | "md";
  className?: string;
}

export const StatusBadge = memo(function StatusBadge({
  status,
  size = "sm",
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap",
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
        STATUS_STYLES[status],
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", STATUS_DOT_STYLES[status])} aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
});

interface PriorityBadgeProps {
  priority: ProspectPriority;
  size?: "sm" | "md";
  className?: string;
}

export const PriorityBadge = memo(function PriorityBadge({
  priority,
  size = "sm",
  className,
}: PriorityBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap",
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
        PRIORITY_STYLES[priority],
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", PRIORITY_DOT_STYLES[priority])} aria-hidden="true" />
      {PRIORITY_LABELS[priority]}
    </span>
  );
});

interface TagBadgeProps {
  tag: string;
  className?: string;
}

export const TagBadge = memo(function TagBadge({ tag, className }: TagBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        getTagColor(tag),
        className
      )}
    >
      {tag}
    </span>
  );
});
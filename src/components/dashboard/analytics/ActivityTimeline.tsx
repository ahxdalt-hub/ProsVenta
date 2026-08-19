"use client";
import { motion } from "framer-motion";
import {
  DashboardIcon,
  type IconName,
} from "@/components/dashboard/navigation/icons";
import { staggerContainer, listItem } from "@/lib/motion";
export interface ActivityItem {
  id: string;
  type:
    "prospect_created" | "prospect_updated" | "list_created" | "status_changed";
  title: string;
  description: string;
  timestamp: string;
  icon: IconName;
  iconColor: string;
  iconBg: string;
}
interface ActivityTimelineProps {
  items: ActivityItem[];
}
/** * Premium activity timeline showing recent prospect updates, status changes, * and new saved lists. Items stagger in with a vertical connector line. */ export function ActivityTimeline({
  items,
}: ActivityTimelineProps) {
  if (items.length === 0) return null;
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="relative"
    >
      {" "}
      {/* Vertical connector line */}{" "}
      <div className="absolute left-[15px] top-2 bottom-2 w-px bg-slate-200" />{" "}
      <div className="space-y-1">
        {" "}
        {items.map((item) => (
          <motion.div
            key={item.id}
            variants={listItem}
            className="relative flex items-start gap-3 rounded-lg p-2"
          >
            {" "}
            {/* Icon dot */}{" "}
            <div
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-white ${item.iconBg} ${item.iconColor}`}
            >
              {" "}
              <DashboardIcon name={item.icon} size={14} />{" "}
            </div>{" "}
            {/* Content */}{" "}
            <div className="flex-1 pt-0.5">
              {" "}
              <div className="flex items-baseline justify-between gap-2">
                {" "}
                <p className="text-sm font-medium text-slate-700">
                  {" "}
                  {item.title}{" "}
                </p>{" "}
                <span className="shrink-0 text-[11px] text-slate-400">
                  {" "}
                  {formatRelativeTime(item.timestamp)}{" "}
                </span>{" "}
              </div>{" "}
              <p className="mt-0.5 text-xs text-slate-500">
                {" "}
                {item.description}{" "}
              </p>{" "}
            </div>{" "}
          </motion.div>
        ))}{" "}
      </div>{" "}
    </motion.div>
  );
}
/** Formats an ISO timestamp as a relative time string (e.g.,"2h ago"). */ function formatRelativeTime(
  timestamp: string,
): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 7) {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

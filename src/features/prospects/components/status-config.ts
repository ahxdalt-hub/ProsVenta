import type { ProspectStatus, ProspectPriority } from "@/types/database";

export const STATUS_OPTIONS: ProspectStatus[] = [
  "new",
  "contacted",
  "qualified",
  "proposal_sent",
  "negotiation",
  "won",
  "lost",
];

export const STATUS_LABELS: Record<ProspectStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal_sent: "Proposal Sent",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

export const STATUS_STYLES: Record<ProspectStatus, string> = {
  new: "bg-amber-50 text-amber-700 border-amber-200",
  contacted: "bg-blue-50 text-blue-700 border-blue-200",
  qualified: "bg-violet-50 text-violet-700 border-violet-200",
  proposal_sent: "bg-indigo-50 text-indigo-700 border-indigo-200",
  negotiation: "bg-orange-50 text-orange-700 border-orange-200",
  won: "bg-emerald-50 text-emerald-700 border-emerald-200",
  lost: "bg-slate-100 text-slate-600 border-slate-200",
};

export const STATUS_DOT_STYLES: Record<ProspectStatus, string> = {
  new: "bg-amber-400",
  contacted: "bg-blue-500",
  qualified: "bg-violet-500",
  proposal_sent: "bg-indigo-500",
  negotiation: "bg-orange-500",
  won: "bg-emerald-500",
  lost: "bg-slate-400",
};

export const PRIORITY_OPTIONS: ProspectPriority[] = ["low", "medium", "high", "urgent"];

export const PRIORITY_LABELS: Record<ProspectPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const PRIORITY_STYLES: Record<ProspectPriority, string> = {
  low: "bg-slate-50 text-slate-500 border-slate-200",
  medium: "bg-blue-50 text-blue-700 border-blue-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  urgent: "bg-red-50 text-red-700 border-red-200",
};

export const PRIORITY_DOT_STYLES: Record<ProspectPriority, string> = {
  low: "bg-slate-400",
  medium: "bg-blue-500",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

export const TAG_COLORS = [
  "bg-blue-50 text-blue-700 border-blue-200",
  "bg-emerald-50 text-emerald-700 border-emerald-200",
  "bg-violet-50 text-violet-700 border-violet-200",
  "bg-amber-50 text-amber-700 border-amber-200",
  "bg-pink-50 text-pink-700 border-pink-200",
  "bg-teal-50 text-teal-700 border-teal-200",
  "bg-indigo-50 text-indigo-700 border-indigo-200",
  "bg-orange-50 text-orange-700 border-orange-200",
];

export function getTagColor(tag: string): string {
  const hash = tag.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return TAG_COLORS[hash % TAG_COLORS.length];
}
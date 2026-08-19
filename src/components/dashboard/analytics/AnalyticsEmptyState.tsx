"use client";
import { motion } from "framer-motion";
import {
  DashboardIcon,
  type IconName,
} from "@/components/dashboard/navigation/icons";
import { fadeUp, staggerContainerFast } from "@/lib/motion";
import Link from "next/link";
interface AnalyticsEmptyStateProps {
  title?: string;
  description?: string;
  icon?: IconName;
  actionLabel?: string;
  actionHref?: string;
}
/** * Premium empty state for the Analytics workspace. * Displays when there is insufficient data to show analytics. */ export function AnalyticsEmptyState({
  title = "No analytics available yet",
  description = "Add prospects to begin seeing business insights. Your analytics dashboard will populate as your prospect database grows.",
  icon = "analytics",
  actionLabel = "Add prospects",
  actionHref = "/dashboard/prospects",
}: AnalyticsEmptyStateProps) {
  return (
    <motion.div
      variants={staggerContainerFast}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center justify-center px-6 py-16 text-center"
    >
      {" "}
      <motion.div
        variants={fadeUp}
        className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-slate-100 text-blue-500"
      >
        {" "}
        <DashboardIcon
          name={icon}
          size={28}
        /> {/* Decorative pulse ring */}{" "}
        <span className="absolute inset-0 rounded-2xl bg-blue-400/10 animate-pulse-soft" />{" "}
      </motion.div>{" "}
      <motion.h3
        variants={fadeUp}
        className="mt-5 text-lg font-bold tracking-tight text-slate-900"
      >
        {" "}
        {title}{" "}
      </motion.h3>{" "}
      <motion.p
        variants={fadeUp}
        className="mt-2 max-w-md text-sm text-slate-500"
      >
        {" "}
        {description}{" "}
      </motion.p>{" "}
      {actionLabel && actionHref && (
        <motion.div variants={fadeUp}>
          {" "}
          <Link
            href={actionHref}
            className="btn-press mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            {" "}
            <DashboardIcon name="plus" size={16} /> {actionLabel}{" "}
          </Link>{" "}
        </motion.div>
      )}{" "}
    </motion.div>
  );
}
/** * Compact empty state for individual sections (e.g. a chart with no data). */ export function SectionEmptyState({
  title = "No data for this view",
  description = "Try adjusting your filters or adding more prospects.",
  icon = "sparkles",
}: {
  title?: string;
  description?: string;
  icon?: IconName;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      {" "}
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        {" "}
        <DashboardIcon name={icon} size={18} />{" "}
      </div>{" "}
      <p className="mt-3 text-sm font-medium text-slate-600">{title}</p>{" "}
      <p className="mt-1 max-w-xs text-xs text-slate-400">{description}</p>{" "}
    </div>
  );
}

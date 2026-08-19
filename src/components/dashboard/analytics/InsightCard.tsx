"use client";
import { motion } from "framer-motion";
import {
  DashboardIcon,
  type IconName,
} from "@/components/dashboard/navigation/icons";
import { listItem } from "@/lib/motion";
interface InsightCardProps {
  label: string;
  value: string;
  description?: string;
  icon: IconName;
  iconColor?: string;
  iconBg?: string;
}
/** * Premium insight card showing a single computed metric (e.g. top industry, * most common country, newest prospect). Values are calculated from real * database records — no placeholders. */ export function InsightCard({
  label,
  value,
  description,
  icon,
  iconColor = "text-blue-600",
  iconBg = "bg-blue-50",
}: InsightCardProps) {
  return (
    <motion.div variants={listItem} className="premium-card p-4">
      {" "}
      <div className="flex items-center gap-2.5">
        {" "}
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBg} ${iconColor}`}
        >
          {" "}
          <DashboardIcon name={icon} size={16} />{" "}
        </div>{" "}
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {" "}
          {label}{" "}
        </span>{" "}
      </div>{" "}
      <p
        className="mt-3 truncate text-lg font-bold tracking-tight text-slate-900"
        title={value}
      >
        {" "}
        {value}{" "}
      </p>{" "}
      {description && (
        <p
          className="mt-0.5 truncate text-xs text-slate-500"
          title={description}
        >
          {" "}
          {description}{" "}
        </p>
      )}{" "}
    </motion.div>
  );
}
/** * Grid of insight cards with staggered entrance. */ export function InsightGrid({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <motion.div
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.04, delayChildren: 0.04 } },
      }}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {" "}
      {children}{" "}
    </motion.div>
  );
}

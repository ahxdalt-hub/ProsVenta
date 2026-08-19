"use client";
import { motion } from "framer-motion";
import {
  DashboardIcon,
  type IconName,
} from "@/components/dashboard/navigation/icons";
import { AnimatedCounter } from "./AnimatedCounter";
import { staggerContainerFast, listItem } from "@/lib/motion";
interface KpiCardProps {
  label: string;
  value: number;
  icon: IconName;
  iconColor?: string;
  iconBg?: string;
  emptyHint?: string;
  delay?: number;
}
/** * Premium KPI card with animated counter, icon, and stagger entrance. * Shows a premium empty hint when the value is 0. */ export function KpiCard({
  label,
  value,
  icon,
  iconColor = "text-blue-600",
  iconBg = "bg-blue-50",
  emptyHint,
  delay = 0,
}: KpiCardProps) {
  return (
    <motion.div
      variants={staggerContainerFast}
      initial="hidden"
      animate="visible"
      className="premium-card p-5"
      style={{ animationDelay: `${delay}ms` }}
    >
      {" "}
      <motion.div
        variants={listItem}
        className="flex items-center justify-between"
      >
        {" "}
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBg} ${iconColor}`}
        >
          {" "}
          <DashboardIcon name={icon} size={18} />{" "}
        </div>{" "}
        {value > 0 && (
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {" "}
            Live{" "}
          </span>
        )}{" "}
      </motion.div>{" "}
      <motion.div variants={listItem} className="mt-4">
        {" "}
        {value > 0 ? (
          <p className="text-3xl font-bold tracking-tight text-slate-900">
            {" "}
            <AnimatedCounter value={value} />{" "}
          </p>
        ) : (
          <p className="text-2xl font-bold tracking-tight text-slate-300">
            {" "}
            0{" "}
          </p>
        )}{" "}
        <p className="mt-1 text-sm font-medium text-slate-500">{label}</p>{" "}
        {value === 0 && emptyHint && (
          <p className="mt-0.5 text-xs text-slate-400">{emptyHint}</p>
        )}{" "}
      </motion.div>{" "}
    </motion.div>
  );
}
/** * Grid of KPI cards with staggered entrance animation. */ export function KpiGrid({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <motion.div
      variants={staggerContainerFast}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6"
    >
      {" "}
      {children}{" "}
    </motion.div>
  );
}

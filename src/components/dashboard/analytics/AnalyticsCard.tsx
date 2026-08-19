"use client";

import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion";
import { DashboardIcon, type IconName } from "@/components/dashboard/navigation/icons";

interface AnalyticsCardProps {
  title: string;
  subtitle?: string;
  icon?: IconName;
  iconColor?: string;
  iconBg?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

/**
 * Premium card container for analytics sections.
 * Provides consistent spacing, typography, and entrance animation.
 * Used across all dashboard sections for visual consistency.
 */
export function AnalyticsCard({
  title,
  subtitle,
  icon,
  iconColor = "text-blue-600",
  iconBg = "bg-blue-50",
  action,
  children,
  className = "",
  delay = 0,
}: AnalyticsCardProps) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      transition={{ delay }}
      className={`premium-card p-5 sm:p-6 ${className}`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {icon && (
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBg} ${iconColor}`}>
              <DashboardIcon name={icon} size={16} />
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </motion.div>
  );
}
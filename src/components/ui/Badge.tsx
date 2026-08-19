import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "primary" | "success" | "warning" | "danger" | "neutral";

interface BadgeProps {
  variant?: BadgeVariant;
  className?: string;
  children: ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-blue-50 text-blue-700",
  primary: "bg-navy-900 text-white",
  success: "bg-green-50 text-green-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
  neutral: "bg-slate-100 text-slate-600",
};

export function Badge({ variant = "default", className = "", children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

interface StatusDotBadgeProps extends BadgeProps {
  dotClassName?: string;
}

export function StatusDotBadge({ children, className, dotClassName, ...props }: StatusDotBadgeProps) {
  return (
    <Badge {...props} className={className}>
      <span className={cn("w-1.5 h-1.5 rounded-full", dotClassName ?? "bg-current")} aria-hidden="true" />
      {children}
    </Badge>
  );
}
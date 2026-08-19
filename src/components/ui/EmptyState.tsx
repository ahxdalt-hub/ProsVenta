import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: EmptyStateAction;
  className?: string;
}

/**
 * Shared empty-state placeholder used across the application.
 * Displays a neutral illustration, message, and optional call-to-action.
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  const content = (
    <div className={cn("flex flex-col items-center justify-center text-center px-6 py-8", className)}>
      {icon && (
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100 text-slate-400 mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-slate-500 max-w-sm">{description}</p>
      )}
      {action &&
        (action.href ? (
          <Link
            href={action.href}
            className="mt-5 inline-flex items-center justify-center rounded-lg bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800 transition-colors duration-150"
          >
            {action.label}
          </Link>
        ) : action.onClick ? (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-5 inline-flex items-center justify-center rounded-lg bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800 transition-colors duration-150"
          >
            {action.label}
          </button>
        ) : null)}
    </div>
  );

  return content;
}
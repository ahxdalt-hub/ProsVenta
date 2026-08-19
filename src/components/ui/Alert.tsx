import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AlertVariant = "info" | "success" | "warning" | "error";

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  className?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

const variantStyles: Record<AlertVariant, string> = {
  info: "border-blue-200 bg-blue-50 text-blue-800",
  success: "border-green-200 bg-green-50 text-green-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  error: "border-red-200 bg-red-50 text-red-800",
};

const iconStyles: Record<AlertVariant, string> = {
  info: "text-blue-500",
  success: "text-green-500",
  warning: "text-amber-500",
  error: "text-red-500",
};

export function AlertIcon({ variant = "info" }: { variant?: AlertVariant }) {
  return (
    <svg className={cn("w-4 h-4 shrink-0", iconStyles[variant])} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {variant === "info" ? (
        <>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </>
      ) : variant === "success" ? (
        <>
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </>
      ) : variant === "warning" ? (
        <>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </>
      )}
    </svg>
  );
}

export function Alert({
  variant = "info",
  title,
  children,
  className = "",
  onRetry,
  retryLabel = "Retry",
}: AlertProps) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn("rounded-lg border px-4 py-3 text-sm flex items-start gap-3", variantStyles[variant], className)}
    >
      <AlertIcon variant={variant} />
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        <div className={cn("text-sm", variant === "error" ? "text-red-700" : "")}>{children}</div>
        {onRetry && (
          <button
            onClick={onRetry}
            className={cn(
              "mt-2 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors duration-150",
              variant === "error"
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-navy-900 text-white hover:bg-navy-800"
            )}
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            {retryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
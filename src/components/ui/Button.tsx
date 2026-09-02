"use client";

import { cn } from "@/lib/utils";
import { Spinner } from "./Spinner";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg" | "xl";
  loading?: boolean;
  isSuccess?: boolean;
  children: React.ReactNode;
  /** React 19 — refs pass through as a regular prop. */
  ref?: React.Ref<HTMLButtonElement>;
}

const variants = {
  primary:
    "bg-navy-900 text-white hover:bg-navy-800 shadow-sm hover:shadow-md",
  secondary:
    "border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 shadow-sm",
  ghost:
    "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
  danger:
    "border border-red-200 bg-white text-red-600 hover:bg-red-50 hover:border-red-300",
  success:
    "bg-green-600 text-white hover:bg-green-700 shadow-sm hover:shadow-md",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs rounded-md",
  md: "px-4 py-2 text-sm rounded-lg",
  lg: "px-6 py-2.5 text-sm rounded-lg",
  xl: "px-8 py-3.5 text-base rounded-xl",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  loading = false,
  isSuccess = false,
  disabled,
  ref,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      ref={ref}
      className={cn(
        "btn-press inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:active:scale-100",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading || isSuccess}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <Spinner size="sm" className="shrink-0" />
          <span className="sr-only">Loading</span>
          {children}
        </>
      ) : isSuccess ? (
        <svg className="w-4 h-4 shrink-0 success-pop" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <>{children}</>
      )}
    </button>
  );
}
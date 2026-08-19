"use client";

import type { ButtonHTMLAttributes } from "react";

interface LoadingButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  loading?: boolean;
  variant?: "primary" | "secondary" | "success";
  success?: boolean;
}

export default function LoadingButton({
  children,
  loading,
  success,
  disabled,
  variant = "primary",
  ...props
}: LoadingButtonProps) {
  const baseStyles =
    "btn-press w-full inline-flex items-center justify-center rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2";

  const variants = {
    primary:
      "bg-navy-900 text-white hover:bg-navy-800 focus:ring-navy-900/20 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md",
    secondary:
      "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 focus:ring-slate-200 disabled:opacity-50 disabled:cursor-not-allowed",
    success:
      "bg-green-600 text-white hover:bg-green-700 focus:ring-green-600/20 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md",
  };

  return (
    <button
      {...props}
      disabled={disabled || loading || success}
      className={`${baseStyles} ${variants[variant]} ${loading ? "relative" : ""}`}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {children}
        </span>
      ) : success ? (
        <span className="flex items-center gap-2 success-pop">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
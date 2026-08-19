"use client";

import { useState, type InputHTMLAttributes } from "react";

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'> {
  label: string;
  error?: string | null;
}

export default function PasswordInput({ label, error, id, ...props }: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);
  const inputId = id || label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <input
          id={inputId}
          type={showPassword ? "text" : "password"}
          {...props}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            setHasValue(!!e.target.value);
            props.onBlur?.(e);
          }}
          onChange={(e) => {
            setHasValue(!!e.target.value);
            props.onChange?.(e);
          }}
          className={`
            w-full rounded-lg border bg-white px-3 pt-5 pb-2 pr-10 text-sm text-slate-900
            placeholder:text-transparent
            focus:outline-none focus:ring-2 focus:ring-blue-500/20
            transition-all duration-150
            ${error
              ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
              : "border-slate-200 focus:border-blue-500"
            }
            ${props.disabled ? "bg-slate-50 text-slate-500 cursor-not-allowed" : ""}
          `}
          placeholder={label}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          autoComplete={props.autoComplete || "current-password"}
        />
        <label
          htmlFor={inputId}
          className={`
            absolute left-3 transition-all duration-150 pointer-events-none
            ${focused || hasValue || props.value
              ? "text-[10px] top-1.5 text-blue-600 font-medium"
              : "text-sm top-3 text-slate-400"
            }
            ${error ? "text-red-500" : ""}
          `}
        >
          {label}
        </label>
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors duration-150"
          aria-label={showPassword ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {showPassword ? (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
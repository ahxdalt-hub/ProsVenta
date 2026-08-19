"use client";

import { useState, type InputHTMLAttributes } from "react";

interface AuthInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label: string;
  error?: string | null;
}

export default function AuthInput({ label, error, id, ...props }: AuthInputProps) {
  const [focused, setFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);
  const inputId = id || label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <input
          id={inputId}
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
            w-full rounded-lg border bg-white px-3 pt-5 pb-2 text-sm text-slate-900
            placeholder:text-transparent
            focus:outline-none focus:ring-2 focus:ring-blue-500/20
            transition-all duration-150 hover:border-slate-300
            ${error
              ? "border-red-300 focus:border-red-500 focus:ring-red-500/20 input-error-shake"
              : "border-slate-200 focus:border-blue-500"
            }
            ${props.disabled ? "bg-slate-50 text-slate-500 cursor-not-allowed" : ""}
          `}
          placeholder={label}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
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
      </div>
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
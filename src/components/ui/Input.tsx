import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const fieldClasses =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition-all duration-150 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-slate-300 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, className = "", id, ...props }, ref) => {
    const inputId = id ?? props.name;
    const describedBy = error ? `${inputId}-error` : helper ? `${inputId}-helper` : undefined;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(fieldClasses, error && "border-red-300 focus:border-red-500 focus:ring-red-500/10", className)}
          {...props}
        />
        {error ? (
          <p id={`${inputId}-error`} className="mt-1 text-xs text-red-600 font-medium" role="alert">
            {error}
          </p>
        ) : helper ? (
          <p id={`${inputId}-helper`} className="mt-1 text-xs text-slate-400">
            {helper}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helper, className = "", id, children, ...props }, ref) => {
    const selectId = id ?? props.name;
    const describedBy = error ? `${selectId}-error` : helper ? `${selectId}-helper` : undefined;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-slate-700 mb-1.5">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(fieldClasses, "cursor-pointer appearance-none pr-10 bg-[url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%2364748b%22%3E%3Cpath fill-rule=%22evenodd%22 d=%22M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z%22 clip-rule=%22evenodd%22/%3E%3C/svg%3E')] bg-no-repeat bg-[position:right_0.75rem_center] bg-[length:1.25rem]", error && "border-red-300", className)}
          {...props}
        >
          {children}
        </select>
        {error ? (
          <p id={`${selectId}-error`} className="mt-1 text-xs text-red-600 font-medium" role="alert">
            {error}
          </p>
        ) : helper ? (
          <p id={`${selectId}-helper`} className="mt-1 text-xs text-slate-400">
            {helper}
          </p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = "Select";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helper, className = "", id, ...props }, ref) => {
    const textareaId = id ?? props.name;
    const describedBy = error ? `${textareaId}-error` : helper ? `${textareaId}-helper` : undefined;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium text-slate-700 mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(fieldClasses, "resize-none min-h-[100px]", error && "border-red-300 focus:border-red-500 focus:ring-red-500/10", className)}
          {...props}
        />
        {error ? (
          <p id={`${textareaId}-error`} className="mt-1 text-xs text-red-600 font-medium" role="alert">
            {error}
          </p>
        ) : helper ? (
          <p id={`${textareaId}-helper`} className="mt-1 text-xs text-slate-400">
            {helper}
          </p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
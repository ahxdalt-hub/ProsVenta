"use client";

interface OnboardingInputProps {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  autoFocus?: boolean;
  required?: boolean;
}

export default function OnboardingInput({
  label,
  name,
  type = "text",
  placeholder,
  autoFocus = false,
  required = true,
}: OnboardingInputProps) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={name}
        className="block text-sm font-medium text-slate-700"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        autoFocus={autoFocus}
        required={required}
        className="w-full rounded-lg border border-slate-300 bg-white/80 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-150"
      />
    </div>
  );
}
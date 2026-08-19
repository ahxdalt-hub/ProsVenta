"use client";

import { cn } from "@/lib/utils";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  "aria-label"?: string;
}

export function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  label,
  ...rest
}: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label ?? rest["aria-label"]}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        "settings-toggle",
        checked && "settings-toggle-on",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <span className="settings-toggle-knob" />
    </button>
  );
}
import { cn } from "@/lib/utils";
import type { SVGProps } from "react";

// ============================================================================
// Automation-specific icons (feather-style, 24x24, stroke-based)
// ============================================================================

type AutomationIconName =
  | "bolt"
  | "workflow"
  | "trigger"
  | "condition"
  | "action"
  | "clock"
  | "history"
  | "suggestion"
  | "pause"
  | "play"
  | "duplicate"
  | "trash"
  | "shield"
  | "arrow-down"
  | "plus"
  | "x";

const PATHS: Record<AutomationIconName, React.ReactNode> = {
  bolt: (
    <>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </>
  ),
  workflow: (
    <>
      <rect x="3" y="3" width="6" height="6" rx="1.5" />
      <rect x="15" y="15" width="6" height="6" rx="1.5" />
      <path d="M9 6h3a3 3 0 0 1 3 3v6" />
    </>
  ),
  trigger: (
    <>
      <path d="M12 2a10 10 0 1 0 10 10" />
      <path d="M12 6a6 6 0 1 0 6 6" />
      <circle cx="12" cy="12" r="2" />
    </>
  ),
  condition: (
    <>
      <path d="M4 6h16" />
      <path d="M4 12h10" />
      <path d="M4 18h16" />
      <circle cx="18" cy="12" r="1.5" />
    </>
  ),
  action: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12h8" />
      <path d="M12 8v8" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </>
  ),
  history: (
    <>
      <path d="M3 3v5h5" />
      <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
      <path d="M12 7v5l4 2" />
    </>
  ),
  suggestion: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </>
  ),
  pause: (
    <>
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </>
  ),
  play: (
    <>
      <polygon points="5 3 19 12 5 21 5 3" />
    </>
  ),
  duplicate: (
    <>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>
  ),
  trash: (
    <>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </>
  ),
  shield: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </>
  ),
  "arrow-down": (
    <>
      <polyline points="6 9 12 15 18 9" />
    </>
  ),
  plus: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
  x: (
    <>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </>
  ),
};

interface AutomationIconProps extends SVGProps<SVGSVGElement> {
  name: AutomationIconName;
  size?: number;
}

export function AutomationIcon({ name, size = 16, className, ...props }: AutomationIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
      aria-hidden="true"
      {...props}
    >
      {PATHS[name]}
    </svg>
  );
}

export type { AutomationIconName };
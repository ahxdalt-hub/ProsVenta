// ============================================================================
// Prosventa Help Center — Playbook Artwork
// ============================================================================
// Custom inline-SVG illustrations for each playbook, drawn in the same
// 1.75px-stroke style as the rest of the dashboard icon system (no emoji).
// Each artwork is a small composed scene rendered inside a tinted tile that
// follows the existing navy/blue/slate design language.
// ============================================================================

import { cn } from "@/lib/utils";
import type { Playbook } from "./playbook-content";

const ART_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** Composed scene per playbook slug — consistent stroke illustration set.
 *  Hand-authored from simple primitives so every artwork is predictable and
 *  renders in the same 1.75px-stroke line style as the dashboard icon system.
 */
const PLAYBOOK_ART: Record<string, React.ReactNode> = {
  // Magnifying glass over a crosshair — searching for your first prospects
  "find-your-first-prospects": (
    <svg {...ART_PROPS}>
      <circle cx="11" cy="12" r="7" />
      <line x1="17.5" y1="16" x2="21.5" y2="21.5" />
      <line x1="11" y1="5" x2="11" y2="12" />
      <line x1="11" y1="19" x2="11" y2="12" />
    </svg>
  ),
  // Filter funnel with a result — building a targeted list
  "build-a-targeted-prospect-list": (
    <svg {...ART_PROPS}>
      <polygon points="4 2 20 2 11 14 13 14" />
      <line x1="12" y1="14" x2="12" y2="20" />
      <circle cx="12" cy="21.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  ),
  // Target with crosshair — qualifying prospects on merit
  "qualify-prospects": (
    <svg {...ART_PROPS}>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="3" x2="12" y2="21" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  ),
  // Stacked list lines with a plus — organizing into saved lists
  "organize-prospects-into-lists": (
    <svg {...ART_PROPS}>
      <line x1="6" y1="6" x2="20" y2="6" />
      <line x1="6" y1="12" x2="20" y2="12" />
      <line x1="6" y1="18" x2="20" y2="18" />
      <line x1="3.5" y1="6" x2="6" y2="6" />
      <line x1="3.5" y1="12" x2="6" y2="12" />
      <line x1="3.5" y1="18" x2="6" y2="18" />
      <line x1="15.5" y1="5" x2="15.5" y2="7.5" />
      <line x1="14.25" y1="6.25" x2="16.75" y2="6.25" />
    </svg>
  ),
  // Document with content lines — importing prospects from a file
  "import-prospects-from-csv": (
    <svg {...ART_PROPS}>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <line x1="8" y1="9" x2="16" y2="9" />
      <line x1="8" y1="13" x2="15" y2="13" />
    </svg>
  ),
  // Panel with a rising sparkline — prospect intelligence
  "use-prospect-intelligence": (
    <svg {...ART_PROPS}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <polyline points="6 15 9 12 12 13 15 10 18 7" />
      <circle cx="18" cy="7" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  // Heartbeat sparkline — reviewing prospect signals
  "review-prospect-signals": (
    <svg {...ART_PROPS}>
      <polyline points="4 17 8 13 12 15 16 9 20 12" />
      <circle cx="16" cy="9" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  ),
  // Connected team graph — managing your workspace
  "manage-your-workspace": (
    <svg {...ART_PROPS}>
      <circle cx="12" cy="12" r="1.1" />
      <circle cx="6" cy="8" r="1.1" />
      <circle cx="18" cy="8" r="1.1" />
      <line x1="6" y1="8" x2="12" y2="12" />
      <line x1="18" y1="8" x2="12" y2="12" />
      <line x1="6" y1="8" x2="18" y2="8" />
    </svg>
  ),
};

/** Fallback for any slug without dedicated artwork. */
const DEFAULT_ART = (
  <svg {...ART_PROPS}>
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </svg>
);

interface PlaybookArtworkProps {
  playbook: Pick<Playbook, "slug">;
  /** Tile size preset */
  size?: "md" | "lg";
  className?: string;
}

/**
 * Tinted tile + composed stroke illustration.
 * Uses the existing slate/blue surface language; hover accent is applied by
 * the parent card via the `group` class.
 */
export function PlaybookArtwork({ playbook, size = "md", className }: PlaybookArtworkProps) {
  const art = PLAYBOOK_ART[playbook.slug] ?? DEFAULT_ART;
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-blue-50/60 text-navy-800 transition-colors duration-200 group-hover:border-blue-200 group-hover:text-blue-700",
        size === "lg" ? "h-14 w-14" : "h-12 w-12",
        className
      )}
      aria-hidden="true"
    >
      <span className={size === "lg" ? "[&>svg]:w-7 [&>svg]:h-7" : "[&>svg]:w-6 [&>svg]:h-6"}>
        {art}
      </span>
    </div>
  );
}
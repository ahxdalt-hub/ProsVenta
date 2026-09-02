// ============================================================================
// Prosventa Intelligence Workspace — Header
// ============================================================================
// Phase 1 (Intelligence rebuild): wide page header with title, subtitle and a
// small set of utility controls. Presentational only — data comes from the
// server page. No fake data.
// ============================================================================

import { IntelligenceRefreshButton } from "./IntelligenceRefreshButton";

interface IntelligenceHeaderProps {
  /** When the workspace data was loaded (server-rendered, UTC). */
  generatedAt: string | null;
}

function formatLocal(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

export function IntelligenceHeader({ generatedAt }: IntelligenceHeaderProps) {
  const generatedLabel = formatLocal(generatedAt);

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Intelligence
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">
          Turn prospect data and business signals into clear priorities.
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {generatedLabel && (
          <p className="hidden text-xs text-slate-400 md:block">
            As of {generatedLabel}
          </p>
        )}
        <IntelligenceRefreshButton />
      </div>
    </header>
  );
}

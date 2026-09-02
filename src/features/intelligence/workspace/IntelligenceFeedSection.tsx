// ============================================================================
// Prosventa Intelligence Workspace — Intelligence Feed (container)
// ============================================================================
// Phase 3: evidence-based intelligence feed built on real signal pipeline
// records. Every record explains WHAT changed, WHO it concerns, WHEN it
// happened, WHERE it came from (real stored sources only), and WHY it may
// matter (stored detection-time interpretation only — never generated).
//
// States: skeleton on route load (loading.tsx), distinct error state with
// retry, calm empty state — a failed load is NEVER rendered as empty.
// ============================================================================

import { EmptyState } from "@/components/ui/EmptyState";
import type { SavedList } from "@/types/database";
import type { SignalRecord } from "@/features/intelligence/signals/types";
import { IntelligenceFeed } from "./IntelligenceFeed";
import { FeedRetryButton } from "./FeedRetryButton";

interface IntelligenceFeedSectionProps {
  signals: SignalRecord[] | null;
  /** True when the signal query itself failed — distinct from an empty feed. */
  failed?: boolean;
  savedLists: SavedList[];
}

export function IntelligenceFeedSection({
  signals,
  failed = false,
  savedLists,
}: IntelligenceFeedSectionProps) {
  const hasSignals = signals !== null && signals.length > 0;

  return (
    <section aria-labelledby="feed-heading" className="min-w-0">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <div>
          <h2 id="feed-heading" className="text-lg font-bold tracking-tight text-slate-900">
            Intelligence feed
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Recent changes and signals across your prospects — with the evidence behind them.
          </p>
        </div>
        {hasSignals && (
          <span className="shrink-0 text-xs font-medium text-slate-400">
            {signals.length} event{signals.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <div className="premium-card overflow-hidden">
        {failed ? (
          <div className="px-6 py-10 text-center" aria-live="polite">
            <h3 className="text-base font-semibold text-slate-900">Couldn&apos;t load intelligence</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              This looks like a temporary problem loading recent intelligence — not an empty feed.
              Your data is safe. Please try again.
            </p>
            <FeedRetryButton />
          </div>
        ) : hasSignals ? (
          <IntelligenceFeed signals={signals} savedLists={savedLists} />
        ) : (
          <EmptyState
            className="py-14"
            title="No intelligence signals yet"
            description="Prosventa will surface meaningful changes and signals here as your prospect data becomes available."
            icon={
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            }
          />
        )}
      </div>
    </section>
  );
}


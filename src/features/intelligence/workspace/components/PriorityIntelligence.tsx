// ============================================================================
// Prosventa Intelligence Workspace — Priority Intelligence Section
// ============================================================================
// The most important area on the page: what Prosventa found that the user
// should actually care about. Ranked by real stored signal importance, then
// recency — never simply the newest database rows.
// ============================================================================

import { formatRelativeTime } from "../relative-time";
import { getPriorityIntelligence } from "../data";
import { IntelligenceActionTrigger } from "./IntelligenceActions";
import {
  Reveal,
} from "./Reveal";
import { PriorityIntelligenceSkeleton, SectionCard, SectionEmpty, SectionError, SectionIcon } from "./shared";

export function PriorityIntelligenceFallback() {
  return (
    <SectionCard
      title="Priority Intelligence"
      description="What deserves your attention right now."
      icon={<SectionIcon name="intelligence" />}
    >
      <div className="p-5">
        <PriorityIntelligenceSkeleton />
      </div>
    </SectionCard>
  );
}

export async function PriorityIntelligence() {
  let items;
  try {
    items = await getPriorityIntelligence();
  } catch {
    return (
      <SectionCard
        title="Priority Intelligence"
        description="What deserves your attention right now."
        icon={<SectionIcon name="intelligence" />}
      >
        <SectionError title="priority intelligence" />
      </SectionCard>
    );
  }

  return (
    <Reveal>
      <SectionCard
        title="Priority Intelligence"
        description="What deserves your attention right now."
        icon={<SectionIcon name="intelligence" />}
      >
        {items.length === 0 ? (
          <SectionEmpty
            title="No priority intelligence"
            description="Nothing needs your attention right now."
          />
        ) : (
          <ul className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                    {item.label}
                  </p>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                    {item.importanceLabel}
                  </span>
                </div>

                {item.subject && (
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {item.subject}
                  </p>
                )}

                <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                  {item.title}
                </p>
                {item.description && (
                  <p className="mt-1 text-[13px] leading-relaxed text-slate-500 line-clamp-2">
                    {item.description}
                  </p>
                )}

                <div className="mt-4 flex items-center justify-between gap-3 pt-1">
                  <time
                    dateTime={item.when}
                    className="text-xs text-slate-400"
                  >
                    {formatRelativeTime(item.when)}
                  </time>
                  <IntelligenceActionTrigger
                    label="Review"
                    kind="review_signal"
                    targetId={item.id}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </Reveal>
  );
}

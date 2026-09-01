// ============================================================================
// Prosventa Intelligence Workspace — Recent Activity Section
// ============================================================================
// Compact merged feed over existing records: intelligence jobs (research,
// enrichment, detection) plus signal activity. Real records only.
// ============================================================================

import { formatRelativeTime } from "../relative-time";
import { getRecentActivity } from "../data";
import { Reveal } from "./Reveal";
import {
  SectionCard,
  SectionEmpty,
  SectionError,
  SectionIcon,
  RecentActivitySkeleton,
} from "./shared";

export function RecentActivityFallback() {
  return (
    <SectionCard
      title="Recent activity"
      description="What Prosventa has been working on."
      icon={<SectionIcon name="research" />}
    >
      <div className="p-5" aria-hidden="true">
        <RecentActivitySkeleton />
      </div>
    </SectionCard>
  );
}

export async function RecentActivity() {
  let activity;
  try {
    activity = await getRecentActivity();
  } catch {
    return (
      <SectionCard
        title="Recent activity"
        description="What Prosventa has been working on."
        icon={<SectionIcon name="research" />}
      >
        <SectionError title="recent activity" />
      </SectionCard>
    );
  }

  return (
    <Reveal>
      <SectionCard
        title="Recent activity"
        description="What Prosventa has been working on."
        icon={<SectionIcon name="research" />}
      >
        {activity.length === 0 ? (
          <SectionEmpty
            title="No activity yet"
            description="Intelligence activity will appear here as your workspace starts using research, enrichment, and signals."
          />
        ) : (
          <ul className="divide-y divide-slate-50">
            {activity.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-4 px-5 py-3"
              >
                <p className="min-w-0 truncate text-sm text-slate-700">
                  <span className="font-medium text-slate-900">
                    {item.label}
                  </span>
                  {item.subject && (
                    <>
                      <span className="text-slate-300" aria-hidden="true">
                        {" · "}
                      </span>
                      {item.subject}
                    </>
                  )}
                </p>
                <time
                  dateTime={item.when}
                  className="shrink-0 text-xs text-slate-400"
                >
                  {formatRelativeTime(item.when)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </Reveal>
  );
}

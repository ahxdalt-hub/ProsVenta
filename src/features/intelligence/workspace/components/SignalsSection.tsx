// ============================================================================
// Prosventa Intelligence Workspace — Signals Section
// ============================================================================
// Focused feed over the EXISTING signal system (no engine recreation):
// type, company/prospect, concise explanation, timestamp, confidence.
// ============================================================================

import { formatRelativeTime } from "../relative-time";
import { getWorkspaceSignals } from "../data";
import { IntelligenceActionTrigger } from "./IntelligenceActions";
import { Reveal } from "./Reveal";
import {
  SectionCard,
  SectionEmpty,
  SectionError,
  SectionIcon,
  SignalsSectionSkeleton,
} from "./shared";

export function SignalsSectionFallback() {
  return (
    <SectionCard
      title="Signals"
      description="Recent buying and intent signals detected across your prospects."
      icon={<SectionIcon name="signals" />}
    >
      <div className="p-5" aria-hidden="true">
        <SignalsSectionSkeleton />
      </div>
    </SectionCard>
  );
}

export async function SignalsSection() {
  let signals;
  try {
    signals = await getWorkspaceSignals();
  } catch {
    return (
      <SectionCard
        title="Signals"
        description="Recent buying and intent signals detected across your prospects."
        icon={<SectionIcon name="signals" />}
      >
        <SectionError title="signals" />
      </SectionCard>
    );
  }

  return (
    <Reveal>
      <SectionCard
        title="Signals"
        description="Recent buying and intent signals detected across your prospects."
        icon={<SectionIcon name="signals" />}
      >
        {signals.length === 0 ? (
          <SectionEmpty
            title="No signals"
            description="No relevant signals have been detected yet."
          />
        ) : (
          <ul className="divide-y divide-slate-50">
            {signals.map((signal) => (
              <li
                key={signal.id}
                className="flex items-start justify-between gap-4 px-5 py-3.5 transition hover:bg-slate-50/60"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[13px] font-semibold text-slate-900">
                      {signal.typeLabel}
                    </span>
                    {signal.subject && (
                      <>
                        <span
                          className="text-slate-300"
                          aria-hidden="true"
                        >
                          ·
                        </span>
                        <span className="text-[13px] text-slate-600">
                          {signal.subject}
                        </span>
                      </>
                    )}
                    {signal.originExternal && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                        External
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm text-slate-600">
                    {signal.description || signal.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {formatRelativeTime(signal.when)} · {signal.confidenceLabel}
                  </p>
                </div>
                <IntelligenceActionTrigger
                  label="Review"
                  kind="review_signal"
                  targetId={signal.id}
                />
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </Reveal>
  );
}

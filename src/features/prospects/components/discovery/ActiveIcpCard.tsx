"use client";

// ============================================================================
// Prosventa Find Matching Leads — Active ICP Summary (compact)
// ============================================================================
// A compact, information-dense summary of the organization's active ICP.
// Long criterion lists collapse intelligently ("A · B · C · +N more"); the
// FULL criteria live behind "View full criteria", which opens the shared
// ActionWindow architecture (smooth open/close, focus trap, Escape,
// minimizable={false} — no "-" control). Search state is never lost while
// inspecting criteria because nothing navigates away from the workspace.
// ============================================================================

import Link from "next/link";
import { useEffect, useState } from "react";
import { Target, Settings2, ListFilter } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ActionWindow } from "@/components/action-window/ActionWindow";
import { settingsDeepLink } from "@/lib/settings/navigation";
import type { ActiveIcpSummary } from "./icp-summary";

interface ActiveIcpCardProps {
  icp: ActiveIcpSummary | null;
}

/** Split a joined summary string back into parts for chip rendering. */
function toList(joined: string | null): string[] {
  return (joined ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Collapse a list to the first `max` items plus "+N more". */
function summarizeList(parts: string[], max: number): string {
  if (parts.length === 0) return "";
  if (parts.length <= max) return parts.join(" · ");
  return `${parts.slice(0, max).join(" · ")} · +${parts.length - max} more`;
}

/** One compact labeled summary row — omitted entirely when there is no value. */
function CompactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-baseline gap-2">
      <span className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span className="min-w-0 truncate text-sm text-slate-600">{value}</span>
    </div>
  );
}


/** Chip used inside the full-criteria window — real values only, never JSON. */
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
      {children}
    </span>
  );
}

function ChipGroup({ label, values }: { label: string; values: string[] }) {
  if (values.length === 0) return null;
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</h4>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {values.map((v) => (
          <Chip key={v}>{v}</Chip>
        ))}
      </div>
    </div>
  );
}

export function ActiveIcpCard({ icp }: ActiveIcpCardProps) {
  // The window stays MOUNTED so ActionWindow's smooth close animation plays.
  const [showCriteria, setShowCriteria] = useState(false);
  const [shownIcp, setShownIcp] = useState<ActiveIcpSummary | null>(null);
  useEffect(() => {
    if (icp) setShownIcp(icp);
  }, [icp]);

  if (!icp) {
    return (
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <Target size={16} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-slate-900">No active ICP yet</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Configure your Ideal Customer Profile so discovery can find prospects matching your best customers.
            </p>
          </div>
          <Link
            href={settingsDeepLink("icp")}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-navy-900 px-3.5 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-navy-800"
          >
            <Settings2 size={14} aria-hidden="true" />
            Configure your ICP
          </Link>
        </div>
      </Card>
    );
  }

  const industries = toList(icp.industries);
  const countries = toList(icp.countries);
  const sizes = toList(icp.companySizes);
  const roles = toList(icp.roles);
  const seniority = toList(icp.seniorityLevels);
  const sizeValue = summarizeList(sizes, 3) || icp.employeeRange || "";

  return (
    <Card className="p-5">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <Target size={13} aria-hidden="true" />
          Active ICP
        </span>
        <Link
          href={settingsDeepLink("icp")}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
        >
          <Settings2 size={13} aria-hidden="true" />
          Edit ICP
        </Link>
      </div>

      {/* Identity — clamped so long descriptions never dominate */}
      <div className="mt-2 min-w-0">
        <h2 className="truncate text-base font-semibold text-slate-900">{icp.name}</h2>
        {icp.description && (
          <p className="mt-0.5 line-clamp-2 max-w-4xl text-sm leading-snug text-slate-500">
            {icp.description}
          </p>
        )}
      </div>

      {/* Dense criteria rows — collapsed intelligently */}
      {(industries.length > 0 || countries.length > 0 || sizeValue || roles.length > 0 || seniority.length > 0) && (
        <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-2 border-t border-slate-100 pt-3 md:grid-cols-2">
          {industries.length > 0 && <CompactRow label="Industries" value={summarizeList(industries, 5)} />}
          {countries.length > 0 && <CompactRow label="Locations" value={summarizeList(countries, 5)} />}
          {sizeValue && <CompactRow label="Size" value={sizeValue} />}
          {(roles.length > 0 || seniority.length > 0) && (
            <CompactRow
              label="Roles"
              value={
                summarizeList(roles, 4) +
                (seniority.length > 0 ? (roles.length > 0 ? " · " : "") + summarizeList(seniority, 2) : "")
              }
            />
          )}
        </div>
      )}

      {/* Full criteria access — window, not navigation */}
      <button
        type="button"
        onClick={() => setShowCriteria(true)}
        className="mt-4 inline-flex items-center gap-1.5 rounded text-xs font-semibold text-blue-600 transition-colors duration-150 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        <ListFilter size={13} aria-hidden="true" />
        View full criteria
      </button>

      <ActionWindow
        open={showCriteria}
        onClose={() => setShowCriteria(false)}
        title={`${icp.name} — full criteria`}
        description="Everything discovery uses when matching prospects."
        minimizable={false}
        size="lg"
        closeLabel="Close full criteria"
      >
        {shownIcp && (
          <div className="space-y-6">
            {shownIcp.description && (
              <section aria-labelledby="icp-full-description">
                <h4 id="icp-full-description" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Description
                </h4>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{shownIcp.description}</p>
              </section>
            )}

            <section aria-labelledby="icp-full-company" className="space-y-5 border-t border-slate-100 pt-5">
              <h4 id="icp-full-company" className="text-sm font-semibold text-slate-900">Company</h4>
              <ChipGroup label="Industries" values={toList(shownIcp.industries)} />
              <ChipGroup label="Locations" values={toList(shownIcp.countries)} />
              <ChipGroup label="Company sizes" values={toList(shownIcp.companySizes)} />
              {shownIcp.employeeRange && (
                <ChipGroup label="Employees" values={[shownIcp.employeeRange]} />
              )}
            </section>

            <section aria-labelledby="icp-full-people" className="space-y-5 border-t border-slate-100 pt-5">
              <h4 id="icp-full-people" className="text-sm font-semibold text-slate-900">People</h4>
              <ChipGroup label="Roles / titles" values={toList(shownIcp.roles)} />
              <ChipGroup label="Seniority levels" values={toList(shownIcp.seniorityLevels)} />
            </section>

            {toList(shownIcp.technologies).length > 0 && (
              <section aria-labelledby="icp-full-tech" className="space-y-5 border-t border-slate-100 pt-5">
                <h4 id="icp-full-tech" className="text-sm font-semibold text-slate-900">Technologies</h4>
                <ChipGroup label="Target technologies" values={toList(shownIcp.technologies)} />
              </section>
            )}
          </div>
        )}
      </ActionWindow>
    </Card>
  );
}

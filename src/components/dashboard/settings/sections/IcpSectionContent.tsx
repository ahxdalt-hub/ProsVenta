import { SettingsCard, SettingsCardHeader } from "../SettingsCard";
import { IcpEditor } from "./IcpEditor";
import type { IcpCriteria } from "@/features/intelligence/scoring/types";

// ============================================================================
// IcpSectionContent — shared ICP presentation
// ============================================================================
// Phase 2 detail-panel architecture: this component renders the SAME content
// both at /dashboard/settings/icp (via IcpSection) and inside the Settings
// detail panel (preloaded view model). Client-safe by design: no server-only
// imports, so it can render inside client component trees.
// ============================================================================

/** Serializable view model for the shared ICP section content. */
export interface IcpViewModel {
  /** False when the user has no workspace yet. */
  hasWorkspace: boolean;
  config: {
    name: string | null;
    description: string | null;
    criteria: IcpCriteria | null;
    updatedAt: string | null;
  } | null;
}

export function IcpSectionContent({ vm, onDirtyChange }: { vm: IcpViewModel; onDirtyChange?: (dirty: boolean) => void }) {
  const config = vm.config;
  const criteria: IcpCriteria | null = config?.criteria ?? null;

  const hasAnyCriteria = Boolean(
    criteria &&
      (criteria.company.targetIndustries.length > 0 ||
        criteria.company.targetCompanySizes.length > 0 ||
        criteria.company.targetCountries.length > 0 ||
        criteria.prospect.targetJobTitles.length > 0 ||
        criteria.prospect.targetDepartments.length > 0 ||
        criteria.prospect.targetSeniorityLevels.length > 0)
  );

  if (!vm.hasWorkspace) {
    return (
      <SettingsCard>
        <h3 className="text-[15px] font-semibold tracking-tight text-slate-900">
          No workspace yet
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Your Ideal Customer Profile belongs to your workspace. Complete
          onboarding or join a workspace to configure it.
        </p>
      </SettingsCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <SettingsCard>
        <SettingsCardHeader
          title="Your ideal customer"
          description="A plain-language summary of who Prosventa prioritizes for you."
        />
        {hasAnyCriteria && criteria ? (
          <dl className="space-y-3 text-sm">
            <SummaryRow
              label="Industries"
              value={criteria.company.targetIndustries.join(", ")}
            />
            {criteria.company.excludedIndustries.length > 0 && (
              <SummaryRow
                label="Excluded"
                value={criteria.company.excludedIndustries.join(", ")}
              />
            )}
            <SummaryRow
              label="Company size"
              value={formatSizeRange(criteria)}
            />
            <SummaryRow
              label="Countries"
              value={criteria.company.targetCountries.join(", ")}
            />
            <SummaryRow
              label="Decision-makers"
              value={
                [
                  criteria.prospect.targetSeniorityLevels.join("/"),
                  criteria.prospect.targetDepartments.length > 0
                    ? `in ${criteria.prospect.targetDepartments.join(", ")}`
                    : null,
                  criteria.prospect.targetJobTitles.length > 0
                    ? `titles like ${criteria.prospect.targetJobTitles.slice(0, 4).join(", ")}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" ") || null
              }
            />
          </dl>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-5">
            <h4 className="text-sm font-semibold text-slate-900">
              Tell Prosventa who your best customers look like
            </h4>
            <p className="mt-1.5 max-w-lg text-[13px] leading-relaxed text-slate-500">
              Without an Ideal Customer Profile, prospects aren&apos;t ranked by
              fit. Add just a few basics below - industries, company size and
              the roles you sell to - and prospect scoring starts working for
              you immediately.
            </p>
          </div>
        )}
      </SettingsCard>

      {/* Score explanation */}
      <SettingsCard className="border-blue-100 bg-gradient-to-br from-blue-50/60 to-white">
        <div className="flex items-start gap-3.5">
          <TargetBadge />
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold tracking-tight text-slate-900">
              How this affects your prospect scores
            </h3>
            <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-slate-600">
              Prosventa compares each prospect against these criteria to
              estimate how closely they match your ideal customer. The closer
              the match, the higher the prospect scores and the earlier it
              appears in your priorities. Every score factor is explainable -
              open any scored prospect to see exactly which criteria helped or
              hurt its fit.
            </p>
          </div>
        </div>
      </SettingsCard>

      {/* Edit flow */}
      <IcpEditor
        key={config?.updatedAt ?? "empty"}
        initialName={config?.name ?? null}
        initialDescription={config?.description ?? null}
        initialCriteria={criteria}
        onDirtyChange={onDirtyChange}
      />
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
      <dt className="w-32 shrink-0 text-[13px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="font-medium leading-relaxed text-slate-800">{value}</dd>
    </div>
  );
}

function formatSizeRange(criteria: IcpCriteria): string | null {
  const parts: string[] = [];
  if (criteria.company.targetCompanySizes.length > 0) {
    parts.push(criteria.company.targetCompanySizes.join(", "));
  }
  if (criteria.company.minEmployees != null || criteria.company.maxEmployees != null) {
    const min = criteria.company.minEmployees ?? 0;
    const max = criteria.company.maxEmployees ?? "+";
    parts.push(`${min.toLocaleString()}\u2013${max} employees`);
  }
  return parts.join(" \u00b7 ") || null;
}

function TargetBadge() {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 ring-1 ring-blue-100">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    </span>
  );
}

import Link from "next/link";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import {
  getImplementedNavGroups,
  settingsHref,
  type SettingsNavItem,
  type SettingsSectionId,
} from "@/lib/settings/navigation";
import { DashboardIcon } from "@/components/dashboard/navigation/icons";
import { CreditToken } from "@/components/dashboard/credits/CreditToken";
import { SettingsPageTransition } from "./SettingsShell";
import { SettingsBillingFocus } from "./SettingsBillingFocus";
import { SettingsSectionHighlighter } from "./SettingsSectionHighlighter";
import {
  SettingsNavCardWithPanel,
  type PanelData,
  type SecurityViewModel,
} from "./panels/SettingsNavCardWithPanel";
import type { ProfileViewModel } from "./sections/ProfileSection";
import type { WorkspaceViewModel } from "./sections/WorkspaceContent";
import type { IcpViewModel } from "./sections/IcpSectionContent";
import type { UserSettings } from "@/types/database";
import type { AiIntelligenceViewModel } from "@/lib/db/ai-settings";

// ============================================================================
// SettingsLanding — wide Settings control center (/dashboard/settings)
// ============================================================================
// Server Component. Category-grouped navigation cards in a wide (max-w-7xl)
// responsive grid. Visual layout unchanged in Phase 1/2 — but ALL implemented
// sections now open their EXISTING content inside a detail panel overlay
// instead of navigating away (when preloaded panel data is provided). If a
// preload fails or is unavailable, that card degrades to its plain link so
// the route still works.
// ============================================================================

/** Preloaded, serializable view models for panel-enabled sections. */
export interface SettingsLandingPanels {
  profile?: ProfileViewModel | null;
  workspace?: WorkspaceViewModel | null;
  icp?: IcpViewModel | null;
  /** User settings row powering the Notifications panel (null = defaults). */
  userSettings?: UserSettings | null;
  security?: SecurityViewModel;
  /** Preloaded AI & Intelligence view model (null = degrade to plain link). */
  ai?: AiIntelligenceViewModel | null;
}

/** Grid classes per category size — deliberate visual rhythm. */
function gridClasses(count: number): string {
  if (count >= 3) return "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4";
  if (count === 2) return "grid grid-cols-1 sm:grid-cols-2 gap-4";
  return "grid grid-cols-1 gap-4";
}

interface NavCardProps {
  item: SettingsNavItem;
  emphasized?: boolean;
  /** Compact treatment for the denser three-column Billing section. */
  compact?: boolean;
}

/**
 * A full-card navigation link. The whole surface is clickable; the chevron is
 * a decorative affordance and the accessible name comes from the card text.
 * Content is left-anchored: icon → title/description, chevron on the right.
 */
function NavCard({ item, emphasized = false, compact = false }: NavCardProps) {
  const isCredits = item.icon === "credits";

  return (
    <Link
      href={settingsHref(item.id)}
      id={`settings-card-${item.id}`}
      data-settings-card={item.id}
      className={cn(
        "group relative flex items-start text-left",
        compact ? "gap-3 p-4" : "gap-4 p-5 sm:p-6",
        "rounded-xl border transition-all duration-150 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
        emphasized
          ? [
              "border-blue-200 bg-gradient-to-br from-blue-50/80 via-white to-white",
              "shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
              "hover:border-blue-300 hover:shadow-[0_4px_12px_rgba(15,23,42,0.08)]",
            ].join(" ")
          : [
              "border-slate-200 bg-white",
              "shadow-[0_1px_2px_rgba(15,23,42,0.03)]",
              "hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-[0_3px_10px_rgba(15,23,42,0.06)]",
            ].join(" ")
      )}
    >
      {/* Icon */}
      <span
        aria-hidden="true"
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg border transition-colors duration-150",
          compact ? "h-9 w-9" : "h-11 w-11",
          emphasized
            ? "border-blue-200 bg-blue-100/70 text-blue-700 group-hover:border-blue-300 group-hover:bg-blue-100"
            : "border-slate-200 bg-slate-50 text-slate-600 group-hover:border-slate-300 group-hover:text-slate-900"
        )}
      >
        {isCredits ? (
          <CreditToken size={compact ? 16 : 24} className="text-sky-600" />
        ) : (
          <DashboardIcon name={item.icon} size={compact ? 16 : 20} />
        )}
      </span>

      {/* Text */}
      <span className="min-w-0 flex-1">
        <span
          className="block text-[15px] font-semibold leading-snug tracking-tight text-slate-900"
        >
          {item.label}
        </span>
        <span className={cn("block text-sm font-normal leading-relaxed text-slate-500", compact ? "mt-0.5" : "mt-1")}>
          {item.landingDescription ?? item.description}
        </span>
      </span>

      {/* Navigation affordance */}
      <span
        aria-hidden="true"
        className="mt-1 shrink-0 text-slate-300 transition-all duration-150 ease-out group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5 group-hover:text-slate-500"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </span>
    </Link>
  );
}

export function SettingsLanding({
  panels,
}: {
  panels?: SettingsLandingPanels;
} = {}) {

  const groups = getImplementedNavGroups();

  return (
    /* Aligned with the dashboard canvas — no extra horizontal padding or max-w
       cap of its own, so the header and every section share the exact left edge
       (and usable width) of the rest of the dashboard content. */
    <div className="w-full py-6 sm:py-8">
      <SettingsPageTransition routeKey="settings-landing">
        {/* Header — shares the same left alignment line as every section */}
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
            Settings
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500 sm:text-[15px]">
            Manage your account, preferences, and workspace configuration.
          </p>
        </header>

        {/* Category sections */}
        <div className="mt-7 space-y-7">
          {groups.map((group) => (
            <section
              key={group.id}
              aria-labelledby={`settings-group-${group.id}`}
              id={`settings-section-${group.id}`}
              data-settings-section={group.id}
              className="scroll-mt-8"
            >
              <h2
                id={`settings-group-${group.id}`}
                className="border-b border-slate-100 pb-2.5 text-sm font-semibold tracking-tight text-slate-900"
              >
                {group.label}
              </h2>
              <div className={cn("mt-4", gridClasses(group.items.length))}>
                {group.items.map((item) => {
                  // Phase 2: every implemented section opens in the detail
                  // panel (same content, same visuals) when its data is
                  // available; otherwise it falls back to a plain link.
                  const panel = getPanelForItem(item.id, panels);
                  if (panel) {
                    return (
                      <SettingsNavCardWithPanel
                        key={item.id}
                        item={item}
                        emphasized={item.id === "ai"}
                        compact={group.items.length >= 3}
                        panel={panel}
                      />
                    );
                  }
                  return (
                    <NavCard
                      key={item.id}
                      item={item}
                      emphasized={item.id === "ai"}
                      compact={group.items.length >= 3}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </SettingsPageTransition>

      {/* Consumes ?focus=billing deep links (from the topbar Credits popover). */}
      <SettingsBillingFocus />

      {/* Consumes ?section=... deep links — scrolls to the card and glows it
          twice (wrapped in Suspense for useSearchParams safety). */}
      <Suspense fallback={null}>
        <SettingsSectionHighlighter />
      </Suspense>
    </div>
  );
}

/**
 * Maps a section id to its preloaded panel data. Returns null when the panel
 * cannot be opened (missing preload) so the card degrades to a plain link —
 * the direct route keeps working either way.
 */
function getPanelForItem(
  id: SettingsSectionId,
  panels?: SettingsLandingPanels
): PanelData | null {
  if (!panels) return null;
  switch (id) {
    case "profile":
      return panels.profile ? { kind: "profile", profile: panels.profile } : null;
    case "workspace":
      return panels.workspace
        ? { kind: "workspace", workspace: panels.workspace }
        : null;
    case "icp":
      return panels.icp ? { kind: "icp", icp: panels.icp } : null;
    case "ai":
      return panels.ai ? { kind: "ai", ai: panels.ai } : null;
    case "notifications":
      return panels.userSettings !== undefined
        ? { kind: "notifications", settings: panels.userSettings }
        : null;
    case "security":
      return panels.security ? { kind: "security", security: panels.security } : null;
    case "credits":
      return { kind: "credits" };
    case "plan-billing":
      return { kind: "plan-billing" };
    case "purchases":
      return { kind: "purchases" };
    case "support":
      return { kind: "support" };
    default:
      return null;
  }
}

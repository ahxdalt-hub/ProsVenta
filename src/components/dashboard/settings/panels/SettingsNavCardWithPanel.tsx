"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { SettingsNavItem } from "@/lib/settings/navigation";
import { DashboardIcon } from "@/components/dashboard/navigation/icons";
import { CreditToken } from "@/components/dashboard/credits/CreditToken";
import { SettingsDetailPanel } from "./SettingsDetailPanel";
import { SettingsPanelErrorBoundary } from "./SettingsPanelErrorBoundary";
import {
  settingsNavCardClassName,
  settingsNavIconClassName,
} from "./settingsNavCardStyles";
import { ProfileClient } from "../sections/ProfileClient";
import type { ProfileViewModel } from "../sections/ProfileSection";
import {
  WorkspaceContent,
  type WorkspaceViewModel,
} from "../sections/WorkspaceContent";
import {
  IcpSectionContent,
  type IcpViewModel,
} from "../sections/IcpSectionContent";
import { NotificationsSection } from "../sections/NotificationsSection";
import { SecurityClient } from "../sections/SecurityClient";
import { CreditsSection } from "../sections/CreditsSection";
import { PlanBillingSection } from "../sections/PlanBillingSection";
import { PurchasesSection } from "../sections/PurchasesSection";
import { SupportSection } from "../sections/SupportSection";
import { AiIntelligenceSection } from "../sections/AiIntelligenceSection";
import type { AiIntelligenceViewModel } from "@/lib/db/ai-settings";
import { SettingsCard } from "../SettingsCard";
import type { UserSettings } from "@/types/database";

// ============================================================================
// SettingsNavCardWithPanel — Settings landing card that opens a detail panel
// ============================================================================
// Phase 2: every implemented Settings section opens its EXISTING content
// inside a SettingsDetailPanel instead of navigating away. Each panel renders
// the SAME component the routed page uses (single source of truth):
//
//   profile / workspace  → preloaded view models (Phase 1 pattern)
//   icp / ai             → preloaded view models (server loaders)
//   notifications        → preloaded user settings
//   security             → preloaded email + verification state
//   credits / plan-billing /
//   purchases / support  → self-fetching client components, reused as-is
//
// State model: local `selectedSettingsSection` per card. No global state; the
// landing page stays mounted underneath so its state is fully preserved.
// ============================================================================

/** Serializable data for the Security panel (from getSettingsData()). */
export interface SecurityViewModel {
  /** Null when signed out — SecurityClient shows its own sign-in notice. */
  email: string | null;
  emailConfirmed: boolean;
}

export type PanelData =
  | { kind: "profile"; profile: ProfileViewModel }
  | { kind: "workspace"; workspace: WorkspaceViewModel }
  | { kind: "icp"; icp: IcpViewModel }
  | { kind: "ai"; ai: AiIntelligenceViewModel }
  | { kind: "notifications"; settings: UserSettings | null }
  | { kind: "security"; security: SecurityViewModel }
  | { kind: "credits" }
  | { kind: "plan-billing" }
  | { kind: "purchases" }
  | { kind: "support" };

interface SettingsNavCardWithPanelProps {
  item: SettingsNavItem;
  emphasized?: boolean;
  compact?: boolean;
  panel: PanelData;
}

export function SettingsNavCardWithPanel({
  item,
  emphasized = false,
  compact = false,
  panel,
}: SettingsNavCardWithPanelProps) {
  // selectedSettingsSection: null (closed) | item.id (this card's panel open)
  const [selectedSettingsSection, setSelectedSettingsSection] = useState<
    string | null
  >(null);
  // Real unsaved-edit signal from sections with editable state (profile,
  // ICP, security). Sections that save instantly never report dirty.
  const [isDirty, setIsDirty] = useState(false);
  // True while this card owns an extra history entry for its open panel.
  // Browser Back (popstate) closes the panel; closing via the UI pops that
  // entry exactly once so no duplicate history entries accumulate.
  const ownsHistoryEntryRef = useRef(false);
  // Reset the dirty flag whenever the panel fully closes.
  const resetPanelState = useCallback(() => {
    setSelectedSettingsSection(null);
    setIsDirty(false);
  }, []);
  const handleClose = useCallback(() => {
    resetPanelState();
    if (
      ownsHistoryEntryRef.current &&
      typeof window !== "undefined" &&
      window.history.state?.settingsPanel
    ) {
      // Remove the entry we pushed on open. The resulting popstate finds the
      // panel already closed and is a no-op.
      ownsHistoryEntryRef.current = false;
      window.history.back();
    }
    ownsHistoryEntryRef.current = false;
  }, [resetPanelState]);

  // Browser Back closes the active panel instead of leaving Settings.
  useEffect(() => {
    function onPopState() {
      ownsHistoryEntryRef.current = false;
      resetPanelState();
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [resetPanelState]);

  const openPanel = useCallback(() => {
    // One history entry per open — repeated interactions never duplicate it.
    if (!ownsHistoryEntryRef.current && selectedSettingsSection === null) {
      window.history.pushState({ settingsPanel: item.id }, "");
      ownsHistoryEntryRef.current = true;
    }
    setSelectedSettingsSection(item.id);
  }, [item.id, selectedSettingsSection]);
  const isCredits = item.icon === "credits";
  const visual = { emphasized, compact };

  return (
    <>
      <button
        type="button"
        onClick={openPanel}
        aria-haspopup="dialog"
        aria-expanded={selectedSettingsSection === item.id}
        className={settingsNavCardClassName(visual)}
      >
        {/* Icon */}
        <span aria-hidden="true" className={settingsNavIconClassName(visual)}>
          {isCredits ? (
            <CreditToken size={compact ? 16 : 24} className="text-sky-600" />
          ) : (
            <DashboardIcon name={item.icon} size={compact ? 16 : 20} />
          )}
        </span>

        {/* Text */}
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold leading-snug tracking-tight text-slate-900">
            {item.label}
          </span>
          <span
            className={cn(
              "block text-sm font-normal leading-relaxed text-slate-500",
              compact ? "mt-0.5" : "mt-1"
            )}
          >
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
      </button>

      <SettingsDetailPanel
        open={selectedSettingsSection === item.id}
        onClose={handleClose}
        isDirty={isDirty}
        title={item.title ?? item.label}
        description={item.description}
        icon={item.icon}
      >
        <SettingsPanelErrorBoundary
          resetKey={`${panel.kind}:${selectedSettingsSection ?? ""}`}
        >
          <PanelContent panel={panel} onDirtyChange={setIsDirty} />
        </SettingsPanelErrorBoundary>
      </SettingsDetailPanel>
    </>
  );
}

/** Renders the SAME section content the routed page uses. */
function PanelContent({
  panel,
  onDirtyChange,
}: {
  panel: PanelData;
  /** Receives true while the section has unsaved local edits. */
  onDirtyChange: (dirty: boolean) => void;
}) {
  switch (panel.kind) {
    case "profile":
      return <ProfileClient {...panel.profile} onDirtyChange={onDirtyChange} />;
    case "workspace":
      return <WorkspaceContent vm={panel.workspace} />;
    case "icp":
      return (
        <IcpSectionContent vm={panel.icp} onDirtyChange={onDirtyChange} />
      );
    case "ai":
      // Rebuilt AI & Intelligence page (same content as the routed page).
      return <AiIntelligenceSection vm={panel.ai} />;
    case "notifications":
      return <NotificationsSection settings={panel.settings} />;
    case "security":
      // Same guard as SecuritySection — SecurityClient requires an email.
      return panel.security.email ? (
        <SecurityClient
          email={panel.security.email}
          emailConfirmed={panel.security.emailConfirmed}
          onDirtyChange={onDirtyChange}
        />
      ) : (
        <SettingsCard>
          <h3 className="text-[15px] font-semibold tracking-tight text-slate-900">
            Sign in to manage your security
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Your session has ended. Sign in again to review your account
            protection settings.
          </p>
        </SettingsCard>
      );
    case "credits":
      return <CreditsSection />;
    case "plan-billing":
      return <PlanBillingSection />;
    case "purchases":
      return <PurchasesSection />;
    case "support":
      return <SupportSection />;
  }
}

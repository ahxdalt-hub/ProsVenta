"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { SettingsCard, SettingsCardHeader, SettingsRow } from "../SettingsCard";
import { ToggleSwitch } from "../ToggleSwitch";
import { updateUserSettingsAction } from "@/features/settings/actions/settings";
import type { UserSettings } from "@/types/database";

// ============================================================================
// Notifications — Settings › Notifications
// ============================================================================
// A compact notification control center built ONLY on preferences that have
// real backend support (persisted user_settings columns) and notification
// events that actually exist in Prosventa today:
//
//   • notifications_workspace        → in-app mentions/replies/member/import activity
//   • notifications_security_alerts  → account security notices
//   • notifications_product_updates  → product news
//
// Categories whose events exist but have no per-user preference yet
// (intelligence signals, payment confirmations) are explained honestly instead
// of receiving fake switches. There is no email/SMS/push delivery channel in
// the backend, so no such channel toggles are offered — in-app is the primary
// and only channel.
// ============================================================================

type PrefKey = "workspace" | "security_alerts" | "product_updates";

const FIELD_MAP: Record<PrefKey, `notifications_${string}`> = {
  workspace: "notifications_workspace",
  security_alerts: "notifications_security_alerts",
  product_updates: "notifications_product_updates",
};

interface NotificationsSectionProps {
  settings: UserSettings | null;
}

export function NotificationsSection({ settings }: NotificationsSectionProps) {
  const [, startTransition] = useTransition();
  const [savedKey, setSavedKey] = useState<PrefKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Local optimistic state — rolled back if the request fails.
  const [prefs, setPrefs] = useState<Record<PrefKey, boolean>>({
    workspace: settings?.notifications_workspace ?? true,
    security_alerts: settings?.notifications_security_alerts ?? true,
    product_updates: settings?.notifications_product_updates ?? true,
  });

  // Re-sync when fresh server data arrives (navigation, revalidation).
  useEffect(() => {
    if (!settings) return;
    setPrefs({
      workspace: settings.notifications_workspace,
      security_alerts: settings.notifications_security_alerts,
      product_updates: settings.notifications_product_updates,
    });
  }, [settings]);

  useEffect(() => {
    return () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, []);

  function handleToggle(key: PrefKey, value: boolean) {
    setError(null);
    const previous = prefs[key];
    setPrefs((p) => ({ ...p, [key]: value }));

    startTransition(async () => {
      const result = await updateUserSettingsAction({ [FIELD_MAP[key]]: value });
      if (result.error) {
        // Roll back to the persisted value and explain what happened.
        setPrefs((p) => ({ ...p, [key]: previous }));
        setError("We couldn't save that preference. Nothing was changed — please try again.");
        return;
      }
      if (savedTimer.current) clearTimeout(savedTimer.current);
      setSavedKey(key);
      savedTimer.current = setTimeout(() => setSavedKey(null), 1800);
    });
  }

  function Toggle({ pref }: { pref: PrefKey }) {
    return (
      <div className="flex items-center gap-3">
        <span
          aria-live="polite"
          className={`text-xs font-medium text-emerald-600 transition-opacity duration-200 ${
            savedKey === pref ? "opacity-100" : "opacity-0"
          }`}
        >
          Saved
        </span>
        <ToggleSwitch
          checked={prefs[pref]}
          onChange={(v) => handleToggle(pref, v)}
          label={pref.replace(/_/g, " ")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Delivery channel */}
      <SettingsCard>
        <SettingsCardHeader
          title="Delivery"
          description="Where Prosventa sends your notifications."
          icon={<BellIcon />}
        />
        <div>
          <SettingsRow title="In Prosventa" description="Your notification feed in the dashboard. This is the primary delivery channel.">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">Always on</span>
          </SettingsRow>
        </div>
      </SettingsCard>

      {/* Workspace */}
      <SettingsCard>
        <SettingsCardHeader
          title="Workspace"
          description="Collaboration happening around you."
          icon={<UsersIcon />}
        />
        <div>
          <SettingsRow
            title="Workspace activity"
            description="Mentions and replies, team member changes, and completed imports or exports."
          >
            <Toggle pref="workspace" />
          </SettingsRow>
        </div>
      </SettingsCard>

      {/* Intelligence */}
      <SettingsCard>
        <SettingsCardHeader
          title="Intelligence"
          description="Signals and research about your prospects."
          icon={<SparkIcon />}
        />
        <div>
          <SettingsRow
            title="Important prospect signals"
            description="High-importance signal alerts are posted to your notification feed automatically so your whole team sees them. Per-person controls aren't available yet."
          >
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">Automatic</span>
          </SettingsRow>
        </div>
      </SettingsCard>

      {/* Billing & Credits */}
      <SettingsCard>
        <SettingsCardHeader
          title="Billing & Credits"
          description="Purchases, payments and refunds."
          icon={<CreditIcon />}
        />
        <div>
          <SettingsRow
            title="Payment updates"
            description="Confirmations, failed payments and refunds are always sent to the person who made the purchase — these records are too important to miss."
          >
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">Always on</span>
          </SettingsRow>
        </div>
      </SettingsCard>

      {/* Account & Security */}
      <SettingsCard>
        <SettingsCardHeader
          title="Account & Security"
          description="Keeping your account safe."
          icon={<ShieldIcon />}
        />
        <div>
          <SettingsRow
            title="Security notices"
            description="Account protection events, like changes to your sign-in details."
          >
            <Toggle pref="security_alerts" />
          </SettingsRow>
        </div>
        <p className="mt-4 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-[13px] leading-relaxed text-blue-800">
          Critical security events can&apos;t be turned off — we&apos;ll always tell you when something important happens to your account.
        </p>
      </SettingsCard>

      {/* Product updates */}
      <SettingsCard>
        <SettingsCardHeader
          title="Product updates"
          description="What&apos;s new in Prosventa."
          icon={<MegaphoneIcon />}
        />
        <div>
          <SettingsRow
            title="New features & improvements"
            description="Occasional announcements about new capabilities in Prosventa."
          >
            <Toggle pref="product_updates" />
          </SettingsRow>
        </div>
      </SettingsCard>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
          {error}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Tiny icons ------------------------------- */

function IconSvg({ children }: { children: React.ReactNode }) {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

function BellIcon() {
  return (
    <IconSvg>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </IconSvg>
  );
}

function UsersIcon() {
  return (
    <IconSvg>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </IconSvg>
  );
}

function SparkIcon() {
  return (
    <IconSvg>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
    </IconSvg>
  );
}

function CreditIcon() {
  return (
    <IconSvg>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </IconSvg>
  );
}

function ShieldIcon() {
  return (
    <IconSvg>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </IconSvg>
  );
}

function MegaphoneIcon() {
  return (
    <IconSvg>
      <path d="M3 11l18-7v18l-9-3.5" />
      <path d="M3 11v4a2 2 0 0 0 2 2h1l1 4h2l-1-4" />
    </IconSvg>
  );
}
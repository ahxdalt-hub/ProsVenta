"use client";
import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SettingsCard, SettingsCardHeader, SettingsRow } from "../SettingsCard";
import { ToggleSwitch } from "../ToggleSwitch";
import { updateUserSettingsAction } from "@/features/settings/actions/settings";
import type { UserSettings } from "@/types/database";

interface NotificationsSectionProps {
  settings: UserSettings | null;
}

export function NotificationsSection({ settings }: NotificationsSectionProps) {
  const [, startTransition] = useTransition();
  const [successKey, setSuccessKey] = useState<string | null>(null);

  const prefs = {
    product_updates: settings?.notifications_product_updates ?? true,
    workspace: settings?.notifications_workspace ?? true,
    security_alerts: settings?.notifications_security_alerts ?? true,
    email_digest: settings?.notifications_email_digest ?? true,
    marketing: settings?.notifications_marketing ?? false,
  };

  function showSuccess(key: string) {
    setSuccessKey(key);
    setTimeout(() => setSuccessKey(null), 2000);
  }

  function handleToggle(key: keyof typeof prefs, value: boolean) {
    startTransition(async () => {
      const fieldMap: Record<string, string> = {
        product_updates: "notifications_product_updates",
        workspace: "notifications_workspace",
        security_alerts: "notifications_security_alerts",
        email_digest: "notifications_email_digest",
        marketing: "notifications_marketing",
      };
      await updateUserSettingsAction({ [fieldMap[key]]: value });
      showSuccess(key);
    });
  }

  return (
    <div className="space-y-6">
      {/* Email notifications */}
      <SettingsCard>
        <SettingsCardHeader
          title="Email Notifications"
          description="Choose what we send to your inbox"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          }
        />
        <div>
          <SettingsRow
            title="Product Updates"
            description="New features, improvements, and product announcements"
          >
            <ToggleSwitch checked={prefs.product_updates} onChange={(v) => handleToggle("product_updates", v)} label="Product updates" />
          </SettingsRow>
          <SettingsRow
            title="Workspace Notifications"
            description="Team activity, member changes, and workspace updates"
          >
            <ToggleSwitch checked={prefs.workspace} onChange={(v) => handleToggle("workspace", v)} label="Workspace notifications" />
          </SettingsRow>
          <SettingsRow
            title="Security Alerts"
            description="Important security events and account protection notices"
          >
            <ToggleSwitch checked={prefs.security_alerts} onChange={(v) => handleToggle("security_alerts", v)} label="Security alerts" />
          </SettingsRow>
          <SettingsRow
            title="Email Digest"
            description="A periodic summary of your workspace activity"
          >
            <ToggleSwitch checked={prefs.email_digest} onChange={(v) => handleToggle("email_digest", v)} label="Email digest" />
          </SettingsRow>
          <SettingsRow
            title="Marketing Emails"
            description="Tips, best practices, and promotional content"
          >
            <ToggleSwitch checked={prefs.marketing} onChange={(v) => handleToggle("marketing", v)} label="Marketing emails" />
          </SettingsRow>
        </div>
        <AnimatePresence>
          {successKey && (
            <SuccessToast message="Notification preferences saved." />
          )}
        </AnimatePresence>
      </SettingsCard>

      {/* Info note — clear, readable */}
      <div className="flex items-start gap-3 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3.5">
        <svg className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        <p className="text-sm text-blue-800 leading-relaxed">
          Security alerts are always enabled for critical account events. You can manage your notification preferences here, but certain essential communications will still be sent to protect your account.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Success Toast
// ============================================================================

function SuccessToast({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700 flex items-center gap-2"
    >
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
      {message}
    </motion.div>
  );
}
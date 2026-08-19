"use client";
import { useTransition, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SettingsCard,
  SettingsCardHeader,
  SettingsRow,
  ComingSoonBadge,
} from "../SettingsCard";
import { ToggleSwitch } from "../ToggleSwitch";
import { useTheme } from "../ThemeProvider";
import { updateUserSettingsAction } from "@/features/settings/actions/settings";
import type { UserSettings } from "@/types/database";

interface AccessibilitySectionProps {
  settings: UserSettings | null;
}

export function AccessibilitySection({ settings }: AccessibilitySectionProps) {
  const { reducedMotion, setReducedMotion } = useTheme();
  const [, startTransition] = useTransition();
  const [successKey, setSuccessKey] = useState<string | null>(null);

  const highContrast = settings?.high_contrast ?? false;
  const largeText = settings?.large_text ?? false;

  function showSuccess(key: string) {
    setSuccessKey(key);
    setTimeout(() => setSuccessKey(null), 2000);
  }

  function handleReducedMotion(value: boolean) {
    setReducedMotion(value);
    startTransition(async () => {
      await updateUserSettingsAction({ reduced_motion: value });
      showSuccess("motion");
    });
  }

  function handleHighContrast(value: boolean) {
    startTransition(async () => {
      await updateUserSettingsAction({ high_contrast: value });
      showSuccess("contrast");
    });
  }

  function handleLargeText(value: boolean) {
    startTransition(async () => {
      await updateUserSettingsAction({ large_text: value });
      showSuccess("text");
    });
  }

  return (
    <div className="space-y-6">
      {/* Motion */}
      <SettingsCard>
        <SettingsCardHeader
          title="Motion & Animation"
          description="Control how elements animate and transition"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          }
        />
        <SettingsRow
          title="Reduced Motion"
          description="Minimize animations, transitions, and auto-playing effects"
        >
          <ToggleSwitch checked={reducedMotion} onChange={handleReducedMotion} label="Reduced motion" />
        </SettingsRow>
        <p className="text-[13px] text-slate-500 mt-3 leading-relaxed">
          This setting also respects the{" "}
          <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-mono">
            prefers-reduced-motion
          </code>{" "}
          system preference.
        </p>
        <AnimatePresence>
          {successKey === "motion" && <SuccessToast message="Motion preference saved." />}
        </AnimatePresence>
      </SettingsCard>

      {/* Visual adjustments */}
      <SettingsCard>
        <SettingsCardHeader
          title="Visual Adjustments"
          description="Enhance visibility for better readability"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          }
        />
        <SettingsRow
          title="High Contrast"
          description="Increase contrast between text and background elements"
        >
          <div className="flex items-center gap-2">
            <ComingSoonBadge />
            <ToggleSwitch checked={highContrast} onChange={handleHighContrast} disabled={true} label="High contrast" />
          </div>
        </SettingsRow>
        <SettingsRow
          title="Large Text"
          description="Increase the base font size for improved readability"
        >
          <div className="flex items-center gap-2">
            <ComingSoonBadge />
            <ToggleSwitch checked={largeText} onChange={handleLargeText} disabled={true} label="Large text" />
          </div>
        </SettingsRow>
        <AnimatePresence>
          {(successKey === "contrast" || successKey === "text") && (
            <SuccessToast message="Visual preference saved." />
          )}
        </AnimatePresence>
      </SettingsCard>

      {/* Keyboard navigation */}
      <SettingsCard>
        <SettingsCardHeader
          title="Keyboard Navigation"
          description="Prosventa is fully navigable by keyboard"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10" />
            </svg>
          }
        />
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-800">Tab Navigation</p>
              <p className="text-[13px] text-slate-500 mt-0.5">Move between interactive elements</p>
            </div>
            <kbd className="px-2.5 py-1 rounded-md border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">Tab</kbd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-800">Activate</p>
              <p className="text-[13px] text-slate-500 mt-0.5">Trigger buttons and links</p>
            </div>
            <kbd className="px-2.5 py-1 rounded-md border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">Enter</kbd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-800">Skip to Content</p>
              <p className="text-[13px] text-slate-500 mt-0.5">Jump directly to main content</p>
            </div>
            <kbd className="px-2.5 py-1 rounded-md border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">Tab</kbd>
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}

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
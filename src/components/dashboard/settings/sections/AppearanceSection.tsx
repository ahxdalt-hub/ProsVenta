"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SettingsCard, SettingsCardHeader, SettingsRow, ComingSoonBadge } from "../SettingsCard";
import { ToggleSwitch } from "../ToggleSwitch";
import { useTheme } from "../ThemeProvider";
import { updateUserSettingsAction } from "@/features/settings/actions/settings";
import type { UserSettings } from "@/types/database";

interface AppearanceSectionProps {
  settings: UserSettings | null;
}

const ACCENT_COLORS = [
  { id: "blue", label: "Blue", color: "#3b82f6" },
  { id: "purple", label: "Purple", color: "#8b5cf6" },
  { id: "green", label: "Green", color: "#10b981" },
  { id: "orange", label: "Orange", color: "#f97316" },
  { id: "pink", label: "Pink", color: "#ec4899" },
];

export function AppearanceSection({ settings }: AppearanceSectionProps) {
  const { reducedMotion, setReducedMotion } = useTheme();
  const [, startTransition] = useTransition();
  const [successKey, setSuccessKey] = useState<string | null>(null);

  const compactMode = settings?.compact_mode ?? false;
  const accentColor = settings?.accent_color ?? "blue";

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

  function handleCompactMode(value: boolean) {
    startTransition(async () => {
      await updateUserSettingsAction({ compact_mode: value });
      showSuccess("compact");
    });
  }

  function handleAccentColor(color: string) {
    startTransition(async () => {
      await updateUserSettingsAction({ accent_color: color });
      showSuccess("accent");
    });
  }

  return (
    <div className="space-y-6">
      {/* Theme selection — Light is default, Dark is coming soon */}
      <SettingsCard>
        <SettingsCardHeader
          title="Theme"
          description="Choose how Prosventa looks to you"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          }
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
          {/* Light Mode — active, default */}
          <div className="settings-theme-option settings-theme-option-active">
            {/* Preview swatch */}
            <div className="w-full h-12 rounded-md overflow-hidden border border-slate-200">
              <div className="w-full h-full bg-white flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-amber-300" />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-700">Light Mode</span>
            </div>
            <div className="absolute top-2 right-2 flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
          </div>

          {/* Dark Mode — coming soon */}
          <div className="settings-theme-option settings-theme-option-disabled">
            {/* Preview swatch */}
            <div className="w-full h-12 rounded-md overflow-hidden border border-slate-200">
              <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-indigo-400" />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-3 h-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span className="text-xs font-semibold text-slate-700">Dark Mode</span>
            </div>
            <div className="mt-1">
              <ComingSoonBadge />
            </div>
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-500 leading-relaxed">
          Prosventa is currently available in light mode. Dark mode is coming soon — {"we're"} preparing a polished experience.
        </p>
      </SettingsCard>

      {/* Display density */}
      <SettingsCard>
        <SettingsCardHeader
          title="Display Density"
          description="Adjust the spacing and compactness of the interface"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          }
        />
        <SettingsRow
          title="Compact Mode"
          description="Reduce spacing and padding for a denser layout"
        >
          <div className="flex items-center gap-2">
            <ComingSoonBadge />
            <ToggleSwitch checked={compactMode} onChange={handleCompactMode} disabled={true} label="Compact mode" />
          </div>
        </SettingsRow>
        <AnimatePresence>
          {successKey === "compact" && <SuccessToast message="Display preference saved." />}
        </AnimatePresence>
      </SettingsCard>

      {/* Accent color */}
      <SettingsCard>
        <SettingsCardHeader
          title="Accent Color"
          description="Personalize your interface with a signature color"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
              <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
              <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
              <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.05 0 5.555-2.504 5.555-5.555C21.965 6.012 17.461 2 12 2z" />
            </svg>
          }
        />
        <div className="flex items-center gap-4 flex-wrap">
          {ACCENT_COLORS.map((color) => (
            <button
              key={color.id}
              type="button"
              onClick={() => handleAccentColor(color.id)}
              className="group relative flex flex-col items-center gap-1.5"
              aria-label={`Select ${color.label} accent color`}
            >
              <span
                className="block w-9 h-9 rounded-full transition-transform duration-150 group-hover:scale-110 group-active:scale-95"
                style={{
                  backgroundColor: color.color,
                  boxShadow: accentColor === color.id ? `0 0 0 3px white, 0 0 0 5px ${color.color}` : "none",
                }}
              />
              <span className="text-xs font-medium text-slate-600">{color.label}</span>
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2">
          <ComingSoonBadge />
          <p className="text-sm text-slate-500 leading-relaxed">Accent color customization is coming soon.</p>
        </div>
        <AnimatePresence>
          {successKey === "accent" && <SuccessToast message="Accent color preference saved." />}
        </AnimatePresence>
      </SettingsCard>

      {/* Motion */}
      <SettingsCard>
        <SettingsCardHeader
          title="Motion"
          description="Control animation and transition behavior"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          }
        />
        <SettingsRow
          title="Reduced Motion"
          description="Minimize animations and transitions across the interface"
        >
          <ToggleSwitch checked={reducedMotion} onChange={handleReducedMotion} label="Reduced motion" />
        </SettingsRow>
        <AnimatePresence>
          {successKey === "motion" && <SuccessToast message="Motion preference saved." />}
        </AnimatePresence>
      </SettingsCard>
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
"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  updatePasswordAction,
  signOutAllDevicesAction,
} from "@/features/settings/actions/settings";
import { SettingsCard, SettingsCardHeader, SettingsRow } from "../SettingsCard";
import { EASE_OUT } from "@/lib/motion";

// ============================================================================
// SecurityClient - interactive layer for Settings > Security
// ============================================================================
// Password changes re-authenticate via Supabase Auth on the server before
// updating; sign-out-everywhere uses the provider's real global sign-out.
// ============================================================================

type PwState = "idle" | "saving" | "saved" | "error";
type SoState = "idle" | "confirming" | "signingout";

export function SecurityClient({
  email,
  emailConfirmed,
  onDirtyChange,
}: {
  email: string;
  emailConfirmed: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwState, setPwState] = useState<PwState>("idle");
  const [pwError, setPwError] = useState<string | null>(null);

  const [soState, setSoState] = useState<SoState>("idle");

  const protectedStatus = emailConfirmed;

  // Real unsaved-edit signal: typed-but-unsaved password fields.
  const pwDirty =
    pwState !== "saving" && Boolean(currentPassword || newPassword || confirmPassword);
  useEffect(() => {
    onDirtyChange?.(pwDirty);
    return () => onDirtyChange?.(false);
  }, [pwDirty, onDirtyChange]);

  async function handlePasswordChange() {
    setPwError(null);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwState("error");
      setPwError("Fill in all three fields to change your password.");
      return;
    }
    if (newPassword.length < 6) {
      setPwState("error");
      setPwError("Your new password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwState("error");
      setPwError("The new passwords don't match.");
      return;
    }
    setPwState("saving");
    try {
      const result = await updatePasswordAction({ currentPassword, newPassword });
      if (result.error) {
        setPwState("error");
        setPwError(result.error);
        return;
      }
      setPwState("saved");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPwState("idle"), 2500);
    } catch {
      setPwState("error");
      setPwError("Your password couldn't be changed. Please try again.");
    }
  }

  async function handleSignOutEverywhere() {
    try {
      setSoState("signingout");
      await signOutAllDevicesAction();
    } catch {
      // The action redirects on success; failures surface as an error page.
      setSoState("idle");
    }
  }

  return (
    <div className="space-y-6">
      {/* Security overview - computed from real account state only */}
      <SettingsCard>
        <SettingsCardHeader
          title="Account protection"
          description="An honest view of your account security - no invented scores."
        />
        <div
          className={`flex items-start gap-3 rounded-xl border p-4 ${
            protectedStatus ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
          }`}
        >
          <span
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ${
              protectedStatus
                ? "bg-white text-emerald-600 ring-emerald-200"
                : "bg-white text-amber-600 ring-amber-200"
            }`}
            aria-hidden="true"
          >
            {protectedStatus ? <ShieldCheckIcon /> : <AlertIcon />}
          </span>
          <div>
            <p className={`text-sm font-bold ${protectedStatus ? "text-emerald-800" : "text-amber-900"}`}>
              {protectedStatus ? "Your account is protected" : "Action required: verify your email"}
            </p>
            <p className={`mt-1 text-[13px] leading-relaxed ${protectedStatus ? "text-emerald-700" : "text-amber-800"}`}>
              {protectedStatus
                ? "Your email address is verified and you sign in with a password you control."
                : `Your email address (${email}) isn't verified yet. Verification keeps your account recoverable if you ever lose access.`}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <SettingsRow title="Sign-in method" description="How you authenticate to Prosventa.">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
              Email &amp; password
            </span>
          </SettingsRow>
          <SettingsRow
            title="Email verification"
            description={
              emailConfirmed
                ? "Verified - password recovery emails will reach you."
                : "Not verified yet - check your inbox for the verification link."
            }
            className="border-b-0 pb-0"
          >
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                emailConfirmed
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                  : "bg-amber-50 text-amber-700 ring-amber-200"
              }`}
            >
              {emailConfirmed ? "Verified" : "Pending"}
            </span>
          </SettingsRow>
        </div>
      </SettingsCard>

      {/* Password change */}
      <SettingsCard>
        <SettingsCardHeader
          title="Change password"
          description="Your current password is verified before the change is applied. Nothing about your passwords is ever stored in the app."
        />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handlePasswordChange();
          }}
          className="space-y-4"
        >
          <PasswordInput
            id="current-password"
            label="Current password"
            value={currentPassword}
            onChange={setCurrentPassword}
            autoComplete="current-password"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PasswordInput
              id="new-password"
              label="New password"
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
              hint="At least 6 characters, up to 72."
            />
            <PasswordInput
              id="confirm-password"
              label="Confirm new password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-1">
            <AnimatePresence>
              {(pwState === "saving" || pwState === "saved") && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15, ease: EASE_OUT }}
                  className="text-[13px] font-medium"
                >
                  {pwState === "saving" ? (
                    <span className="text-slate-500">Updating...</span>
                  ) : (
                    <span className="text-emerald-600">Password updated</span>
                  )}
                </motion.span>
              )}
            </AnimatePresence>
            <button
              type="submit"
              disabled={pwState === "saving"}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-40"
            >
              Update password
            </button>
          </div>
          <AnimatePresence>
            {pwError && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: EASE_OUT }}
                role="alert"
                className="text-[13px] font-medium text-red-600"
              >
                {pwError}
              </motion.p>
            )}
          </AnimatePresence>
        </form>
      </SettingsCard>

      {/* Sign out everywhere */}
      <SettingsCard>
        <SettingsCardHeader
          title="Sign out everywhere"
          description="Ends every active session on all devices, including this one. You will be returned to the sign-in page. Use this if you think someone else has access to your account."
        />
        {soState === "idle" && (
          <button
            type="button"
            onClick={() => setSoState("confirming")}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-red-300 hover:text-red-600"
          >
            Sign out of all devices
          </button>
        )}
        <AnimatePresence>
          {soState !== "idle" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
              className="overflow-hidden"
            >
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-800">
                  Sign out of every device?
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-red-700">
                  This cannot be undone remotely - you&apos;ll need to sign in again
                  everywhere.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleSignOutEverywhere()}
                    disabled={soState === "signingout"}
                    className="rounded-lg bg-red-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                  >
                    {soState === "signingout" ? "Signing out..." : "Yes, sign out everywhere"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSoState("idle")}
                    className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </SettingsCard>
    </div>
  );
}

/* ------------------------------ Sub-components ---------------------------- */

function PasswordInput({
  id,
  label,
  value,
  onChange,
  autoComplete,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-slate-700">
        {label}
      </label>
      <input
        id={id}
        type="password"
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      />
      {hint && <p className="mt-1 text-xs leading-relaxed text-slate-400">{hint}</p>}
    </div>
  );
}

function ShieldCheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11.5 14.5 15.5 9.5" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

"use client";
import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SettingsCard,
  SettingsCardHeader,
  SettingsRow,
  ComingSoonBadge,
} from "../SettingsCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { updatePasswordAction } from "@/features/settings/actions/settings";
import type { SettingsData } from "@/lib/db/settings";

interface SecuritySectionProps {
  data: SettingsData;
}

export function SecuritySection({ data }: SecuritySectionProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const email = data.email ?? "Not available";

  function handleCancel() {
    setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setError(null);
    setShowPasswordForm(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (form.newPassword !== form.confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    startTransition(async () => {
      const result = await updatePasswordAction({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      setShowPasswordForm(false);
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => setSuccess(false), 3000);
    });
  }

  return (
    <div className="space-y-6">
      {/* Account email */}
      <SettingsCard>
        <SettingsCardHeader
          title="Account Email"
          description="The email address associated with your account"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          }
        />
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-50">
              <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{email}</p>
              <p className="text-[13px] text-slate-500">Verified and active</p>
            </div>
          </div>
        </div>
      </SettingsCard>

      {/* Password */}
      <SettingsCard>
        <SettingsCardHeader
          title="Password"
          description="Change your account password"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          }
          action={
            !showPasswordForm ? (
              <Button variant="secondary" size="sm" onClick={() => setShowPasswordForm(true)}>
                Change
              </Button>
            ) : null
          }
        />
        <AnimatePresence mode="wait">
          {showPasswordForm ? (
            <motion.form
              key="password-form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <Input
                label="Current Password"
                name="currentPassword"
                type="password"
                value={form.currentPassword}
                onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                placeholder="Enter current password"
                required
                autoComplete="current-password"
              />
              <Input
                label="New Password"
                name="newPassword"
                type="password"
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                placeholder="At least 6 characters"
                required
                minLength={6}
                autoComplete="new-password"
                helper="Must be at least 6 characters"
              />
              <Input
                label="Confirm New Password"
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                placeholder="Re-enter new password"
                required
                autoComplete="new-password"
              />
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600" role="alert">
                  {error}
                </div>
              )}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="secondary" onClick={handleCancel} disabled={isPending}>
                  Cancel
                </Button>
                <Button type="submit" loading={isPending} disabled={!form.currentPassword || !form.newPassword || !form.confirmPassword}>
                  Update Password
                </Button>
              </div>
            </motion.form>
          ) : (
            <motion.div
              key="password-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-50">
                  <svg className="w-5 h-5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Password set</p>
                  <p className="text-[13px] text-slate-500">Last updated: Unknown</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700 flex items-center gap-2"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              Password updated successfully.
            </motion.div>
          )}
        </AnimatePresence>
      </SettingsCard>

      {/* Two-factor authentication */}
      <SettingsCard>
        <SettingsCardHeader
          title="Two-Factor Authentication"
          description="Add an extra layer of security to your account"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          }
        />
        <SettingsRow
          title="Authenticator App"
          description="Use an authenticator app to generate verification codes"
        >
          <div className="flex items-center gap-2">
            <ComingSoonBadge />
            <Button variant="secondary" size="sm" disabled>Enable</Button>
          </div>
        </SettingsRow>
      </SettingsCard>

      {/* Active session */}
      <SettingsCard>
        <SettingsCardHeader
          title="Active Session"
          description="Your current login session"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
        />
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-50">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">This device</p>
            <p className="text-[13px] text-slate-500">Session active</p>
          </div>
        </div>
      </SettingsCard>

      {/* Login history */}
      <SettingsCard>
        <SettingsCardHeader
          title="Login History"
          description="Recent account access events"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v5h5" />
              <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
              <path d="M12 7v5l4 2" />
            </svg>
          }
        />
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 text-slate-400 mb-3">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-900">Login history coming soon</p>
          <p className="mt-1 text-[13px] text-slate-500">We are building a detailed view of your recent sign-ins.</p>
          <div className="mt-3">
            <ComingSoonBadge />
          </div>
        </div>
      </SettingsCard>

      {/* Connected devices */}
      <SettingsCard>
        <SettingsCardHeader
          title="Connected Devices"
          description="Devices currently signed into your account"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          }
        />
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 text-slate-400 mb-3">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-900">Device management coming soon</p>
          <p className="mt-1 text-[13px] text-slate-500">You will be able to view and revoke active device sessions.</p>
          <div className="mt-3">
            <ComingSoonBadge />
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}
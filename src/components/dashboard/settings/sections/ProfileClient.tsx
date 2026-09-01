"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  uploadProfileImageAction,
  removeProfileImageAction,
} from "@/features/settings/actions/avatar";
import { updateProfileAction } from "@/features/settings/actions/settings";
import { SettingsCard, SettingsCardHeader, SettingsRow } from "../SettingsCard";
import { EASE_OUT } from "@/lib/motion";
import { useShellData } from "@/components/dashboard/layout/ShellDataProvider";
import { Avatar } from "@/components/ui/Avatar";


// ============================================================================
// ProfileClient - Settings > Profile (interactive layer)
// ============================================================================
// Avatar upload, personal information editing and account context. All writes
// go through the preserved server actions (user-scoped, RLS enforced).
// Storage/service errors are never surfaced raw - only friendly messages.
// ============================================================================

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

interface ProfileClientProps {
  profile: {
    fullName: string | null;
    avatarUrl: string | null;
    jobRole: string | null;
    companyName: string | null;
    memberSince: string;
  };
  email: string | null;
  workspaceName: string | null;
  role: string | null;
  /** Reports true while there are unsaved local edits (panel close guard). */
  onDirtyChange?: (dirty: boolean) => void;
}

type AvatarState = "idle" | "uploading" | "saved" | "error";
type FormState = "idle" | "saving" | "saved" | "error";

export function ProfileClient({ profile, email, workspaceName, role, onDirtyChange }: ProfileClientProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setIdentity } = useShellData();
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [avatarState, setAvatarState] = useState<AvatarState>("idle");
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [fullName, setFullName] = useState(profile.fullName ?? "");
  const [jobRole, setJobRole] = useState(profile.jobRole ?? "");
  const [formState, setFormState] = useState<FormState>("idle");
  const [formError, setFormError] = useState<string | null>(null);

  const nameDirty = fullName !== (profile.fullName ?? "");
  const roleDirty = jobRole !== (profile.jobRole ?? "");
  const formDirty = nameDirty || roleDirty;

  // Report genuine unsaved edits upward so the detail panel can guard close.
  useEffect(() => {
    onDirtyChange?.(formDirty);
    return () => onDirtyChange?.(false);
  }, [formDirty, onDirtyChange]);

  async function handleFileSelected(file: File | undefined) {
    if (!file) return; // cancelled - no state change, no error
    setAvatarError(null);
    if (!ALLOWED_TYPES.includes(file.type)) {
      setAvatarState("error");
      setAvatarError("Please choose a JPG, PNG, WebP or GIF image.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarState("error");
      setAvatarError("Images must be 5MB or smaller.");
      return;
    }

    setAvatarState("uploading");
    const formData = new FormData();
    formData.append("avatar", file);
    try {
      const result = await uploadProfileImageAction(formData);
      if (result.error || !result.avatarUrl) {
        setAvatarState("error");
        setAvatarError("Your photo couldn't be uploaded. Please try a different image.");
        return;
      }
      setAvatarUrl(result.avatarUrl);
      // Propagate to the shared shell identity — Topbar/ProfileMenu update
      // immediately, no reload or re-login required.
      setIdentity({ avatarUrl: result.avatarUrl });
      setAvatarState("saved");
      setTimeout(() => setAvatarState("idle"), 2000);
    } catch {
      setAvatarState("error");
      setAvatarError("Your photo couldn't be uploaded. Please try again.");
    }
  }

  async function handleRemoveAvatar() {
    setAvatarError(null);
    setAvatarState("uploading");
    try {
      const result = await removeProfileImageAction();
      if (result.error) {
        setAvatarState("error");
        setAvatarError("Your photo couldn't be removed. Please try again.");
        return;
      }
      setAvatarUrl(null);
      // Propagate removal — every avatar location returns to initials.
      setIdentity({ avatarUrl: null });
      setAvatarState("idle");
    } catch {
      setAvatarState("error");
      setAvatarError("Your photo couldn't be removed. Please try again.");
    }
  }

  async function handleSaveProfile() {
    setFormError(null);
    if (!fullName.trim()) {
      setFormState("error");
      setFormError("Your name is required.");
      return;
    }
    setFormState("saving");
    try {
      const result = await updateProfileAction({ full_name: fullName, job_role: jobRole });
      if (result.error) {
        setFormState("error");
        setFormError(result.error);
        return;
      }
      // Keep the shell identity (account menu name / avatar initials) in sync.
      setIdentity({ userName: fullName.trim() });
      setFormState("saved");
      setTimeout(() => setFormState("idle"), 2500);
    } catch {
      setFormState("error");
      setFormError("Your changes couldn't be saved. Please try again.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Identity + avatar */}
      <SettingsCard>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="relative shrink-0 self-start">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarState === "uploading"}
              aria-label="Change profile photo"
              className="group relative block h-24 w-24 rounded-full focus-visible:outline-none"
            >
              <Avatar
                src={avatarUrl}
                name={fullName || email}
                size="xl"
                className="h-24 w-24 ring-1 ring-slate-200"
              />
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-900/0 transition-colors duration-150 group-hover:bg-slate-900/40 group-focus-visible:bg-slate-900/40">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-700 opacity-0 shadow-sm ring-1 ring-slate-200 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
                  <CameraIcon />
                </span>
              </span>
              {avatarState === "uploading" && (
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70 backdrop-blur-[2px]">
                  <motion.span
                    className="h-6 w-6 rounded-full border-2 border-slate-300 border-t-blue-600"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                    aria-hidden="true"
                  />
                </span>
              )}
            </button>
            <AnimatePresence>
              {avatarState === "saved" && (
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: EASE_OUT }}
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm"
                  aria-hidden="true"
                >
                  <CheckIcon />
                </motion.span>
              )}
            </AnimatePresence>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                void handleFileSelected(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold tracking-tight text-slate-900">
              {profile.fullName || "Your profile"}
            </h3>
            <p className="mt-0.5 truncate text-sm font-medium text-slate-500">{email}</p>
            <p className="mt-2 max-w-md text-[13px] leading-relaxed text-slate-500">
              Click your photo to upload a new one. JPG, PNG, WebP or GIF up to 5MB.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarState === "uploading"}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
              >
                Upload photo
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => void handleRemoveAvatar()}
                  disabled={avatarState === "uploading"}
                  className="rounded-lg px-2 py-1.5 text-[13px] font-medium text-slate-500 transition-colors hover:text-red-600 disabled:opacity-50"
                >
                  Remove
                </button>
              )}
            </div>
            <AnimatePresence>
              {avatarError && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15, ease: EASE_OUT }}
                  role="alert"
                  className="mt-3 text-[13px] font-medium text-red-600"
                >
                  {avatarError}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </SettingsCard>

      {/* Personal information */}
      <SettingsCard>
        <SettingsCardHeader
          title="Personal information"
          description="How you appear to teammates across your workspace."
        />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSaveProfile();
          }}
          className="space-y-5"
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="full-name" className="mb-1.5 block text-[13px] font-semibold text-slate-700">
                Full name
              </label>
              <input
                id="full-name"
                type="text"
                value={fullName}
                maxLength={100}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (formState === "saved") setFormState("idle");
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Your name"
              />
            </div>
            <div>
              <label htmlFor="job-role" className="mb-1.5 block text-[13px] font-semibold text-slate-700">
                Job title
              </label>
              <input
                id="job-role"
                type="text"
                value={jobRole}
                onChange={(e) => {
                  setJobRole(e.target.value);
                  if (formState === "saved") setFormState("idle");
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="e.g. Head of Sales"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            <AnimatePresence>
              {(formDirty || formState === "saving" || formState === "saved") && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15, ease: EASE_OUT }}
                  className="text-[13px]"
                >
                  {formState === "saving" && (
                    <span className="font-medium text-slate-500">Saving…</span>
                  )}
                  {formState === "saved" && (
                    <span className="font-semibold text-emerald-600">Changes saved</span>
                  )}
                  {formState !== "saving" && formState !== "saved" && formDirty && (
                    <span className="font-medium text-amber-600">Unsaved changes</span>
                  )}
                </motion.span>
              )}
            </AnimatePresence>
            <button
              type="submit"
              disabled={!formDirty || formState === "saving"}
              aria-live="polite"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {formState === "saving" ? (
                <>
                  <SpinnerIcon />
                  Saving…
                </>
              ) : formState === "saved" ? (
                <>
                  <CheckIcon />
                  Saved
                </>
              ) : (
                "Save changes"
              )}
            </button>
          </div>
          <AnimatePresence>
            {formError && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: EASE_OUT }}
                role="alert"
                className="text-[13px] font-medium text-red-600"
              >
                {formError}
              </motion.p>
            )}
          </AnimatePresence>
        </form>
      </SettingsCard>

      {/* Account context */}
      <SettingsCard>
        <SettingsCardHeader
          title="Account"
          description="Read-only context about your account and workspace membership."
        />
        <div>
          <SettingsRow title="Email" description="Used to sign in and receive notifications.">
            <span className="max-w-[220px] truncate text-sm font-medium text-slate-700">{email ?? "-"}</span>
          </SettingsRow>
          <SettingsRow title="Workspace" description="The workspace this account belongs to.">
            <span className="text-sm font-medium text-slate-700">{workspaceName ?? "No workspace"}</span>
          </SettingsRow>
          <SettingsRow title="Role" description="Your permission level in the workspace.">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-700 ring-1 ring-slate-200">
              {role ?? "member"}
            </span>
          </SettingsRow>
          <SettingsRow
            title="Member since"
            description="When you joined Prosventa."
            className="border-b-0 pb-0"
          >
            <span className="text-sm font-medium text-slate-700">
              {new Date(profile.memberSince).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
              })}
            </span>
          </SettingsRow>
        </div>
      </SettingsCard>
    </div>
  );
}

/* ------------------------------ Tiny icons ------------------------------- */

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="h-3.5 w-3.5 animate-spin" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

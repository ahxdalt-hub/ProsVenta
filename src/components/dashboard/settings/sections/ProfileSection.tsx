"use client";
import { useState, useTransition, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SettingsCard } from "../SettingsCard";
import { DefaultAvatar } from "../DefaultAvatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/toast";
import { updateProfileAction } from "@/features/settings/actions/settings";
import { uploadProfileImageAction, removeProfileImageAction } from "@/features/settings/actions/avatar";
import { cn, formatDate } from "@/lib/utils";
import type { SettingsData } from "@/lib/db/settings";

interface ProfileSectionProps {
  data: SettingsData;
  organizationName: string | null;
}

type AvatarState =
  | { type: "saved"; url: string | null }
  | { type: "preview"; url: string }
  | { type: "saving" }
  | { type: "removing" };

export function ProfileSection({ data, organizationName }: ProfileSectionProps) {
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success: toastSuccess, error: toastError } = useToast();

  const [avatar, setAvatar] = useState<AvatarState>({
    type: "saved",
    url: data.profile?.avatar_url ?? null,
  });

  const [form, setForm] = useState({
    full_name: data.profile?.full_name ?? "",
    job_role: data.profile?.job_role ?? "",
  });

  const fullName = data.profile?.full_name ?? "Not set";
  const jobRole = data.profile?.job_role ?? null;
  const email = data.email ?? "Not available";
  const createdAt = data.profile?.created_at ? formatDate(data.profile.created_at) : "Unknown";

  // ============================================================================
  // Profile edit
  // ============================================================================

  function handleCancel() {
    setForm({
      full_name: data.profile?.full_name ?? "",
      job_role: data.profile?.job_role ?? "",
    });
    setError(null);
    setIsEditing(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaved(false);
    startTransition(async () => {
      const result = await updateProfileAction({
        full_name: form.full_name,
        job_role: form.job_role || undefined,
      });
      if (result.error) {
        setError(result.error);
        toastError("Failed to update profile", result.error);
        return;
      }
      toastSuccess("Profile updated", "Your profile information has been saved.");
      setIsSaved(true);
      setIsEditing(false);
      setTimeout(() => setIsSaved(false), 2500);
    });
  }

  // ============================================================================
  // Avatar upload with preview
  // ============================================================================

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toastError("Invalid file", "Please select an image file (JPG, PNG, WebP, or GIF).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toastError("File too large", "Profile image must be 5MB or smaller.");
      return;
    }

    // Show immediate preview before upload
    const reader = new FileReader();
    reader.onload = () => {
      setAvatar({ type: "preview", url: reader.result as string });
    };
    reader.readAsDataURL(file);

    // Upload to server
    const formData = new FormData();
    formData.append("avatar", file);
    startTransition(async () => {
      try {
        const result = await uploadProfileImageAction(formData);
        if (result.error) {
          setAvatar({ type: "saved", url: data.profile?.avatar_url ?? null });
          toastError("Upload failed", result.error);
          return;
        }
        setAvatar({ type: "saved", url: result.avatarUrl ?? null });
        toastSuccess("Photo updated", "Your profile picture has been updated.");
      } catch {
        setAvatar({ type: "saved", url: data.profile?.avatar_url ?? null });
        toastError("Upload failed", "An unexpected error occurred while uploading your photo.");
      }
    });
  }

  const handleRemoveAvatar = useCallback(() => {
    setAvatar({ type: "removing" });
    startTransition(async () => {
      const result = await removeProfileImageAction();
      if (result.error) {
        setAvatar({ type: "saved", url: data.profile?.avatar_url ?? null });
        toastError("Remove failed", result.error);
        return;
      }
      setAvatar({ type: "saved", url: null });
      toastSuccess("Photo removed", "Your profile picture has been removed.");
    });
  }, [data.profile?.avatar_url, toastSuccess, toastError]);

  const hasAvatar =
    (avatar.type === "saved" || avatar.type === "preview") && avatar.url !== null;
  const showSpinner = avatar.type === "saving" || avatar.type === "removing";

  return (
    <div className="space-y-6">
      {/* ======================================================================
          Premium Profile Header
          ====================================================================== */}
      <SettingsCard className="overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-2"
        >
          {/* Avatar with upload overlay */}
          <div className="relative shrink-0 group">
            <AnimatePresence mode="wait">
              {showSpinner ? (
                <motion.div
                  key="saving"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center"
                >
                  <svg className="w-6 h-6 text-slate-400 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </motion.div>
              ) : hasAvatar ? (
                <motion.img
                  key="saved"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  src={avatar.url!}
                  alt={fullName}
                  className="w-20 h-20 rounded-full object-cover ring-2 ring-slate-200 shadow-sm"
                />
              ) : (
                <motion.div
                  key="default"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <DefaultAvatar size="lg" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Upload / remove overlay */}
            <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              <div className="absolute inset-0 rounded-full bg-slate-900/40 flex items-center justify-center">
                <div className="flex flex-col items-center gap-1.5 px-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-white text-[10px] font-semibold uppercase tracking-wider hover:underline"
                  >
                    <svg className="w-4 h-4 mx-auto mb-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    Change
                  </button>
                  {hasAvatar && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="text-white/80 text-[10px] font-medium hover:text-white hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* Identity */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              {isSaved ? (
                <motion.div
                  key="saved-check"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2"
                >
                  <span className="inline-flex items-center gap-2 rounded-full bg-green-50 border border-green-100 px-3 py-1 text-xs font-medium text-green-700">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    Saved
                  </span>
                </motion.div>
              ) : (
                <motion.div key="identity" initial={{ opacity: 1 }} animate={{ opacity: 1 }}>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900 leading-tight">
                    {fullName}
                  </h2>
                  {jobRole && (
                    <p className="text-sm font-medium text-slate-500 mt-1">{jobRole}</p>
                  )}
                  <p className="text-sm text-slate-500 mt-1">{email}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Meta badges */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {organizationName && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />
                  </svg>
                  {organizationName}
                </span>
              )}
              {jobRole && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="7" width="20" height="14" rx="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                  {jobRole}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Member since {createdAt}
              </span>
            </div>
          </div>

          {/* Edit button */}
          {!isEditing && (
            <div className="shrink-0">
              <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit Profile
              </Button>
            </div>
          )}
        </motion.div>
      </SettingsCard>

      {/* ======================================================================
          Profile Information Card
          ====================================================================== */}
      <SettingsCard>
        <AnimatePresence mode="wait">
          {isEditing ? (
            <motion.form
              key="edit"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 tracking-tight">Edit Profile</h3>
                  <p className="text-sm text-slate-500 mt-0.5">Update your personal information</p>
                </div>
              </div>

              <Input
                label="Full Name"
                name="full_name"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="e.g. John Doe"
                required
                maxLength={100}
              />
              <Input
                label="Job Title"
                name="job_role"
                value={form.job_role}
                onChange={(e) => setForm({ ...form, job_role: e.target.value })}
                placeholder="e.g. Sales Director"
                helper="Optional — your role within your organization"
                maxLength={100}
              />

              {error && (
                <div
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600"
                  role="alert"
                >
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCancel}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={isPending}
                  disabled={!form.full_name.trim()}
                >
                  Save Changes
                </Button>
              </div>
            </motion.form>
          ) : (
            <motion.div
              key="view"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 tracking-tight">Profile Information</h3>
                  <p className="text-sm text-slate-500 mt-0.5">Your account details and organization context</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <ProfileDetail label="Full Name" value={fullName} />
                <ProfileDetail label="Job Title" value={jobRole ?? "Not set"} />
                <ProfileDetail label="Email" value={email} monospace />
                <ProfileDetail label="Organization" value={organizationName ?? "Not set"} />
                <ProfileDetail label="Account Created" value={createdAt} />
                <ProfileDetail label="Status" value="Active" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </SettingsCard>
    </div>
  );
}

// ============================================================================
// Detail field
// ============================================================================

function ProfileDetail({
  label,
  value,
  monospace = false,
}: {
  label: string;
  value: string;
  monospace?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-sm font-semibold text-slate-900",
          monospace && "font-mono text-[13px] text-slate-700"
        )}
      >
        {value}
      </p>
    </div>
  );
}
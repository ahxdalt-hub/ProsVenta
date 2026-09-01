"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOrganizationAction } from "@/features/organization/actions/organization";
import { ROLE_DEFINITIONS } from "@/features/collaboration/permissions";
import type { OrganizationRole } from "@/types/database";

// ============================================================================
// OrganizationIdentityCard — Settings › Organization
// ============================================================================
// Premium workspace identity header. Uses a polished generated visual
// (professional building icon on a calm gradient tile) — NOT a letter avatar.
// The name is editable inline by authorized roles only; authorization is
// enforced again server-side inside updateOrganizationAction.
// ============================================================================

interface OrganizationIdentityCardProps {
  name: string;
  role: OrganizationRole | null;
  memberCount: number;
  createdAt: string | null;
  canEdit: boolean;
}

export function OrganizationIdentityCard({
  name,
  role,
  memberCount,
  createdAt,
  canEdit,
}: OrganizationIdentityCardProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  function startEditing() {
    setDraft(name);
    setError(null);
    setIsEditing(true);
  }

  function cancel() {
    setIsEditing(false);
    setError(null);
  }

  function save() {
    const trimmed = draft.trim();
    if (!trimmed) {
      setError("The workspace name can't be empty.");
      return;
    }
    if (trimmed === name) {
      cancel();
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updateOrganizationAction({ name: trimmed });
      if (result.error) {
        setError(result.error);
        return;
      }
      setIsEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
      router.refresh();
    });
  }

  const createdLabel = createdAt
    ? new Date(createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="premium-card p-6 sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        {/* Generated identity visual */}
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 via-slate-50 to-blue-100/60 ring-1 ring-blue-100/80">
          <svg className="h-7 w-7 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="4" y="2" width="16" height="20" rx="2" />
            <path d="M9 22v-4h6v4" />
            <path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01" />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          {/* Name row */}
          {isEditing ? (
            <div className="max-w-md">
              <label htmlFor="org-name-input" className="sr-only">
                Workspace name
              </label>
              <input
                id="org-name-input"
                ref={inputRef}
                type="text"
                value={draft}
                maxLength={120}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") save();
                  if (e.key === "Escape") cancel();
                }}
                disabled={pending}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-lg font-semibold text-slate-900 outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
              />
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={save}
                  disabled={pending}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                >
                  {pending ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={cancel}
                  disabled={pending}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 className="truncate text-xl font-semibold tracking-tight text-slate-900">{name}</h2>
              {canEdit && (
                <button
                  type="button"
                  onClick={startEditing}
                  aria-label="Edit workspace name"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  </svg>
                </button>
              )}
              {saved && (
                <span aria-live="polite" className="text-xs font-medium text-emerald-600">
                  Saved
                </span>
              )}
            </div>
          )}

          {error && (
            <p role="alert" className="mt-2 text-sm text-red-600">
              {error}
            </p>
          )}

          {/* Identity chips — real information only */}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-slate-500">
            {role && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                <svg className="h-3.5 w-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                You are {ROLE_DEFINITIONS[role]?.label ?? role}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
              <svg className="h-3.5 w-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              </svg>
              {memberCount} {memberCount === 1 ? "member" : "members"}
            </span>
            {createdLabel && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                <svg className="h-3.5 w-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                Created {createdLabel}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
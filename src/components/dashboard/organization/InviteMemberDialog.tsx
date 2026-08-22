"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { createInvitationAction } from "@/features/collaboration/actions/collaboration";
import { canAssignRole } from "@/features/collaboration/permissions";
import type { OrganizationRole } from "@/types/database";

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserRole?: OrganizationRole | null;
}

const ROLE_OPTIONS: { value: OrganizationRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "sales", label: "Sales" },
  { value: "viewer", label: "Viewer" },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function InviteMemberDialog({ open, onOpenChange, currentUserRole }: InviteMemberDialogProps) {
  // Safest default: the least privileged appropriate role.
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrganizationRole>("viewer");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Only roles strictly below the current user's level can be invited.
  const availableRoles = ROLE_OPTIONS.filter(
    (option) => option.value !== "owner" && canAssignRole(currentUserRole ?? null, option.value)
  );

  // Reset state when the dialog opens; lock body scroll while open.
  useEffect(() => {
    if (open) {
      setEmailError(null);
      setFormError(null);
      setSuccess(false);
      // Reset to the safest available role each time the dialog opens.
      setRole(availableRoles[availableRoles.length - 1]?.value ?? "viewer");
      document.body.style.overflow = "hidden";
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => {
        clearTimeout(t);
        document.body.style.overflow = "";
      };
    }
    document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Escape closes the dialog.
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onOpenChange(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onOpenChange]);

  function validateEmail(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return "Email address is required.";
    if (!EMAIL_REGEX.test(trimmed)) return "Enter a valid email address.";
    return null;
  }

  function handleEmailChange(value: string) {
    setEmail(value);
    // Clear the inline error as the user types.
    if (emailError) setEmailError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validateEmail(email);
    if (validationError) {
      setEmailError(validationError);
      return;
    }
    if (!availableRoles.some((option) => option.value === role)) {
      setFormError("You're not allowed to invite someone with that role.");
      return;
    }

    setFormError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await createInvitationAction(email.trim(), role);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      setSuccess(true);
      setEmail("");
      // Keep the dialog open briefly so the user sees the confirmation.
      setTimeout(() => onOpenChange(false), 1200);
    });
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Subtle, restrained backdrop — only for this true modal. */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 z-40 bg-slate-900/20"
            aria-hidden="true"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl"
              role="dialog"
              aria-modal="true"
              aria-label="Invite member"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Invite member</h2>
                  <p className="mt-0.5 text-xs text-slate-400">Bring a teammate into your workspace</p>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  disabled={isPending}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
                  aria-label="Close dialog"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="px-6 py-5" noValidate>
                <Input
                  ref={inputRef}
                  label="Email address"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  onBlur={() => {
                    if (email.trim() && !emailError) {
                      const err = validateEmail(email);
                      if (err) setEmailError(err);
                    }
                  }}
                  placeholder="colleague@company.com"
                  error={emailError ?? undefined}
                  autoComplete="email"
                  disabled={isPending}
                />

                <div className="mt-4">
                  <Select
                    label="Role"
                    name="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as OrganizationRole)}
                    disabled={isPending || availableRoles.length === 0}
                    helper={
                      currentUserRole === "admin"
                        ? "Only the owner can invite an Admin."
                        : undefined
                    }
                  >
                    {availableRoles.length === 0 ? (
                      <option value="viewer">Viewer</option>
                    ) : (
                      availableRoles.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))
                    )}
                  </Select>
                </div>

                {formError && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600" role="alert">
                    {formError}
                  </div>
                )}

                {success && (
                  <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700" role="status">
                    <span className="flex items-center gap-2">
                      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Invitation sent
                    </span>
                  </div>
                )}

                <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                  <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isPending}>
                    Cancel
                  </Button>
                  <Button type="submit" loading={isPending} disabled={!email.trim()}>
                    {isPending ? "Sending…" : "Send invite"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
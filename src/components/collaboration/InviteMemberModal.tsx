"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { createInvitationAction } from "@/features/collaboration/actions/collaboration";
import type { OrganizationRole } from "@/types/database";

interface InviteMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLE_OPTIONS: { value: OrganizationRole; label: string; description: string }[] = [
  { value: "admin", label: "Admin", description: "Can manage members and workspace content" },
  { value: "manager", label: "Manager", description: "Can manage prospects and team assignments" },
  { value: "sales", label: "Sales", description: "Can create, edit, and assign prospects" },
  { value: "viewer", label: "Viewer", description: "Read-only access with commenting" },
];

export function InviteMemberModal({ open, onOpenChange }: InviteMemberModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrganizationRole>("sales");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      setError(null);
      setSuccess(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onOpenChange(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onOpenChange]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await createInvitationAction(email, role);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      setEmail("");
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm"
            aria-hidden="true"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-label="Invite member"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Invite Team Member</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Bring teammates into your workspace</p>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors duration-150"
                  aria-label="Close dialog"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="px-6 py-5">
                <Input
                  label="Email Address"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  required
                />

                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Role
                  </label>
                  <div className="space-y-2">
                    {ROLE_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-all duration-150 ${
                          role === option.value
                            ? "border-blue-300 bg-blue-50/60 ring-1 ring-blue-200"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="role"
                          value={option.value}
                          checked={role === option.value}
                          onChange={() => setRole(option.value)}
                          className="mt-0.5"
                        />
                        <div>
                          <p className={`text-sm font-medium ${role === option.value ? "text-blue-900" : "text-slate-900"}`}>
                            {option.label}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">{option.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600" role="alert">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700" role="status">
                    Invitation sent successfully. They'll receive an email to join.
                  </div>
                )}

                <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                  <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isPending}>
                    Cancel
                  </Button>
                  <Button type="submit" loading={isPending} disabled={!email.trim() || !email.includes("@")}>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="16" y1="13" x2="16" y2="21" /><line x1="8" y1="13" x2="8" y2="21" /><line x1="4" y1="21" x2="20" y2="21" /><line x1="13" y1="3" x2="7" y2="14" /><line x1="11" y1="3" x2="17" y2="14" /></svg>
                    Send Invite
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
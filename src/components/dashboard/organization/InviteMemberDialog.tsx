"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteMemberDialog({ open, onOpenChange }: InviteMemberDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");

  useEffect(() => {
    if (open) { document.body.style.overflow = "hidden"; } else { document.body.style.overflow = ""; }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) { if (e.key === "Escape" && open) onOpenChange(false); }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onOpenChange]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={() => onOpenChange(false)} className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm" aria-hidden="true" />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl" role="dialog" aria-modal="true" aria-label="Invite member">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Invite Member</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Invite teammates to your workspace</p>
                </div>
                <button onClick={() => onOpenChange(false)} className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors duration-150" aria-label="Close dialog">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <Input label="Email Address" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@company.com" autoFocus />
                <Select label="Role" name="role" value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                  <option value="viewer">Viewer (future)</option>
                </Select>
                <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                    <div>
                      <p className="text-xs font-semibold text-blue-900">Coming Soon</p>
                      <p className="text-xs text-blue-700 mt-0.5">Email invitations are being prepared. This dialog is ready for the future invitation flow.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100">
                <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="button" disabled>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="16" y1="13" x2="16" y2="21" /><line x1="8" y1="13" x2="8" y2="21" /><line x1="4" y1="21" x2="20" y2="21" /><line x1="13" y1="3" x2="7" y2="14" /><line x1="11" y1="3" x2="17" y2="14" /></svg>
                  Send Invite
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

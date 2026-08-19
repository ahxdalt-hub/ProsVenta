"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { leaveOrganizationAction, deleteOrganizationAction } from "@/features/organization/actions/organization";
import { InviteMemberDialog } from "./InviteMemberDialog";

interface WorkspaceActionsProps {
  isOwner: boolean;
}

export function WorkspaceActions({ isOwner }: WorkspaceActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleLeave() {
    setError(null);
    startTransition(async () => {
      const result = await leaveOrganizationAction();
      if (result.error) setError(result.error);
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteOrganizationAction();
      if (result.error) setError(result.error);
    });
  }

  const actions = [
    {
      label: "Edit Workspace",
      description: "Update your organization profile, logo, and details.",
      icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
      action: "Scroll to the Organization Profile section above to edit your workspace.",
      href: "#profile",
    },
    {
      label: "Invite Member",
      description: "Bring teammates into your workspace to collaborate.",
      icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>,
      action: "open-invite",
    },
    {
      label: "View Members",
      description: "See all members of your organization and their roles.",
      icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
      action: "View all members of your workspace.",
      href: "/dashboard/organization/members",
    },
    {
      label: "Transfer Ownership",
      description: "Transfer workspace ownership to another member.",
      icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" /><polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" /><line x1="4" y1="4" x2="9" y2="9" /></svg>,
      action: "future",
      future: true,
    },
  ];

  return (
    <>
      <Card>
        <CardHeader
          title="Workspace Actions"
          description="Quick actions for managing your workspace"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
          }
        />
        <div className="p-6 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {actions.map((action) => (
            <div key={action.label} className="rounded-lg border border-slate-200 p-4 hover:border-slate-300 hover:shadow-sm transition-all duration-150">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-50 text-slate-600 shrink-0">{action.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-slate-900">{action.label}</h4>
                    {action.future && <Badge variant="warning">Future</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{action.description}</p>
                  <div className="mt-2">
                    {action.action === "open-invite" ? (
                      <button onClick={() => setInviteOpen(true)} className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline">Open invite dialog</button>
                    ) : action.action === "future" ? (
                      <span className="text-xs text-slate-400">Coming soon</span>
                    ) : action.href?.startsWith("#") ? (
                      <a href={action.href} className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline">{action.action}</a>
                    ) : action.href ? (
                      <Link href={action.href} className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline">{action.action}</Link>
                    ) : (
                      <span className="text-xs text-slate-400">{action.action}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="border-red-200">
        <CardHeader
          title="Danger Zone"
          description="Irreversible and destructive actions"
          icon={
            <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
          }
        />
        <div className="p-6 pt-4 space-y-3">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Leave Workspace</h4>
              <p className="mt-0.5 text-xs text-slate-500">Remove yourself from this organization.</p>
            </div>
            {isOwner ? (
              <Badge variant="warning">Owner cannot leave</Badge>
            ) : (
              <Button variant="danger" size="sm" onClick={() => setConfirmLeave(true)} disabled={isPending}>Leave</Button>
            )}
          </div>
          {isOwner && (
            <div className="flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50/30 p-4">
              <div>
                <h4 className="text-sm font-semibold text-red-900">Delete Workspace</h4>
                <p className="mt-0.5 text-xs text-red-600">Permanently delete this organization and all its data.</p>
              </div>
              <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)} disabled={isPending}>Delete</Button>
            </div>
          )}
          {error && (<div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">{error}</div>)}
        </div>
      </Card>

      <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} />

      <AnimatePresence>
        {confirmLeave && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={() => setConfirmLeave(false)} className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm" />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }} className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-2xl p-6" role="dialog" aria-modal="true">
                <h3 className="text-base font-semibold text-slate-900">Leave Workspace?</h3>
                <p className="mt-2 text-sm text-slate-500">You will lose access to all prospects, lists, and data in this workspace. This action cannot be undone.</p>
                <div className="mt-5 flex items-center justify-end gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setConfirmLeave(false)}>Cancel</Button>
                  <Button variant="danger" size="sm" onClick={handleLeave} loading={isPending}>Leave Workspace</Button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDelete && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={() => setConfirmDelete(false)} className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm" />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }} className="w-full max-w-sm rounded-2xl border border-red-200 bg-white shadow-2xl p-6" role="dialog" aria-modal="true">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-50 text-red-500 shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">Delete Workspace?</h3>
                </div>
                <p className="mt-3 text-sm text-slate-500">This will permanently delete the organization and all associated data, including prospects, lists, and members. This action is irreversible.</p>
                <div className="mt-5 flex items-center justify-end gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                  <Button variant="danger" size="sm" onClick={handleDelete} loading={isPending}>Delete Permanently</Button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

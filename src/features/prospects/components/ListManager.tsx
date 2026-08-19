"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  createSavedListAction,
  updateSavedListAction,
  deleteSavedListAction,
} from "@/features/prospects/actions/lists";
import type { SavedList } from "@/types/database";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";

interface ListManagerProps {
  lists: SavedList[];
}

export function ListManager({ lists }: ListManagerProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function handleCreate(formData: FormData) {
    setError(null);
    setSuccess(null);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    startTransition(async () => {
      const result = await createSavedListAction(name ?? "", description ?? "");
      if (result.error) {
        setError(result.error);
        return;
      }
      setNewName("");
      setNewDescription("");
      setShowCreateForm(false);
      setSuccess("List created successfully");
      setTimeout(() => setSuccess(null), 3000);
    });
  }

  function startEdit(list: SavedList) {
    setEditingId(list.id);
    setEditName(list.name);
    setEditDescription(list.description ?? "");
  }

  function saveEdit(listId: string) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await updateSavedListAction(listId, editName, editDescription);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEditingId(null);
      setSuccess("List updated");
      setTimeout(() => setSuccess(null), 3000);
    });
  }

  function handleDelete(listId: string) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await deleteSavedListAction(listId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setConfirmDeleteId(null);
      setSuccess("List deleted");
      setTimeout(() => setSuccess(null), 3000);
    });
  }

  return (
    <div>
      {/* Create form - collapsible */}
      <div className="mb-8">
        {showCreateForm ? (
          <motion.form
            action={handleCreate}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-xl border border-slate-200 bg-white shadow-sm p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900">Create a new list</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors duration-150"
                aria-label="Cancel"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                name="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. UK SaaS Companies"
                aria-label="List name"
                helper="Give your list a memorable name."
                autoFocus
              />
              <Input
                name="description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Description (optional)"
                aria-label="List description"
                helper="Describe what this list is for."
              />
            </div>
            <div className="flex items-center justify-between mt-5">
              {success && (
                <span className="text-sm text-green-600 flex items-center gap-1.5" role="status">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {success}
                </span>
              )}
              {error && <span className="text-sm text-red-600" role="alert">{error}</span>}
              <div className="flex gap-2 ml-auto">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={isPending}
                  disabled={!newName.trim()}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Create List
                </Button>
              </div>
            </div>
          </motion.form>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Organize your prospects into targeted groups.
            </p>
            <Button
              onClick={() => setShowCreateForm(true)}
              size="sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New List
            </Button>
          </div>
        )}
      </div>

      {/* Success toast */}
      <AnimatePresence>
        {success && !showCreateForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-center gap-2"
            role="status"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {confirmDeleteId && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label="Confirm delete"
          >
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setConfirmDeleteId(null)} aria-hidden="true" />
            <motion.div
              className="relative w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-2xl"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-50 text-red-600">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Delete list?</h3>
                  <p className="text-sm text-slate-500 mt-0.5">This action cannot be undone.</p>
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setConfirmDeleteId(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  loading={isPending}
                  onClick={() => handleDelete(confirmDeleteId)}
                >
                  Delete
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lists - enterprise grid */}
      {lists.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm animate-fade-up">
          <EmptyState
            title="No lists created yet"
            description="Create your first list to start organizing prospects into targeted groups."
            icon={
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            }
            action={{
              label: "Create Your First List",
              onClick: () => setShowCreateForm(true),
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          <AnimatePresence>
            {lists.map((list) => (
              <motion.div
                key={list.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="card-hover group relative rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
              >
                {editingId === list.id ? (
                  <div className="p-5 space-y-3">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      aria-label="Edit list name"
                      autoFocus
                    />
                    <Input
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Description (optional)"
                      aria-label="Edit list description"
                    />
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={() => saveEdit(list.id)}
                        loading={isPending}
                        disabled={!editName.trim()}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
<Link href={`/dashboard/saved-lists/${list.id}`} className="block p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 shrink-0">
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                          </svg>
                        </div>
                        <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all duration-150" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-700 transition-colors duration-150">
                        {list.name}
                      </h3>
                      {list.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {list.description}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 mt-3">
                        Created {new Date(list.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </Link>
                    {/* Actions - visible on hover */}
                    <div className="absolute top-12 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <button
                        onClick={() => startEdit(list)}
                        className="flex items-center justify-center w-7 h-7 rounded-md bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 shadow-sm transition-colors duration-150"
                        aria-label={`Rename ${list.name}`}
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(list.id)}
                        disabled={isPending}
                        className="flex items-center justify-center w-7 h-7 rounded-md bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 shadow-sm transition-colors duration-150 disabled:opacity-50"
                        aria-label={`Delete ${list.name}`}
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
                        </svg>
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
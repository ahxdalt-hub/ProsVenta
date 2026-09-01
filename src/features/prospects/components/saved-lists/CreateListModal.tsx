"use client";

// ============================================================================
// Prosventa Saved Lists — Create List modal (Phase 2 rebuild)
// ============================================================================
// Uses the EXISTING Modal primitive + the EXISTING createSavedListAction
// server action (plan limits + RLS authoritative). No fake creation, no page
// navigation: on success the caller refreshes and the list appears instantly.
// ============================================================================

import { useEffect, useState } from "react";
import { ActionWindow } from "@/components/action-window";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { createSavedListAction } from "@/features/prospects/actions/lists";

interface CreateListModalProps {
  open: boolean;
  onClose: () => void;
  /** Called after a real server-side creation (caller refreshes data). */
  onCreated?: () => void;
}

export function CreateListModal({ open, onClose, onCreated }: CreateListModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset for a fresh form every time the window opens.
  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setError(null);
      setSaving(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("List name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await createSavedListAction(name.trim(), description.trim() || undefined);
    if (result.error || !result.id) {
      setError(result.error ?? "The list could not be created.");
      setSaving(false);
      return;
    }
    setSaving(false);
    onClose();
    onCreated?.();
  };

  return (
    <ActionWindow
      open={open}
      onClose={onClose}
      title="Create list"
      description="Group related prospects so they are easy to research and reach out to."
      // Minimize keeps the draft; closing asks only when something was typed.
      dirty={name.trim().length > 0 || description.trim().length > 0}
      busy={saving}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={saving}>
            Create list
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="space-y-4"
      >
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <Input
          id="create-list-name"
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Q3 outreach"
          maxLength={80}
          disabled={saving}
          autoFocus
          required
        />
        <Textarea
          id="create-list-description"
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this list focused on?"
          rows={3}
          maxLength={280}
          disabled={saving}
        />
        {/* Hidden submit lets Enter submit while keeping the visual footer button */}
        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true">
          Submit
        </button>
      </form>
    </ActionWindow>
  );
}

"use client";

import { useRef, useState, useTransition } from "react";
import { addProspectNote, removeProspectNote } from "@/features/prospects/actions/manage";
import type { ProspectNote } from "@/types/database";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";

interface NotesPanelProps {
  prospectId: string;
  notes: ProspectNote[];
  currentUserId: string;
}

export function NotesPanel({ prospectId, notes, currentUserId }: NotesPanelProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleAdd(formData: FormData) {
    setError(null);
    const content = formData.get("content") as string;
    startTransition(async () => {
      const result = await addProspectNote(prospectId, content ?? "");
      if (result.error) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
    });
  }

  function handleDelete(noteId: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeProspectNote(noteId, prospectId);
      if (result.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div>
      <h3 className="text-base font-semibold text-slate-900 mb-4">Notes</h3>

      {/* Add note form */}
      <form ref={formRef} action={handleAdd} className="mb-6">
        <Textarea
          name="content"
          rows={3}
          placeholder="Add a note about this prospect..."
          aria-label="Add a note"
        />
        <div className="flex items-center justify-between mt-2">
          {error ? (
            <p className="text-sm text-red-600" role="alert">{error}</p>
          ) : (
            <span className="text-xs text-slate-400">
              Notes are visible to all members of your organization.
            </span>
          )}
          <Button
            type="submit"
            size="sm"
            loading={isPending}
          >
            {isPending ? "Adding…" : "Add Note"}
          </Button>
        </div>
      </form>

      {/* Notes list */}
      {notes.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">
          No notes yet. Add the first note above.
        </p>
      ) : (
        <ul className="space-y-4">
          {notes.map((note) => (
            <li
              key={note.id}
              className="rounded-lg border border-slate-200 bg-slate-50/50 p-4"
            >
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {note.content}
              </p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-slate-400">
                  {new Date(note.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                {note.user_id === currentUserId && (
                  <button
                    onClick={() => handleDelete(note.id)}
                    disabled={isPending}
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-red-600 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-red-500 rounded disabled:opacity-50"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
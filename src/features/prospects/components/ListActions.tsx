"use client";

import { useState, useTransition } from "react";
import { saveProspectToList, removeProspectFromList } from "@/features/prospects/actions/manage";
import type { SavedList } from "@/types/database";
import { cn } from "@/lib/utils";

interface ListActionsProps {
  prospectId: string;
  savedLists: SavedList[];
  memberListIds: string[];
}

export function ListActions({ prospectId, savedLists, memberListIds }: ListActionsProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingListId, setPendingListId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const memberSet = new Set(memberListIds);
  const inList = (listId: string) => memberSet.has(listId);

  function handleToggle(listId: string, isMember: boolean) {
    setError(null);
    setSuccess(null);
    setPendingListId(listId);
    startTransition(async () => {
      const result = isMember
        ? await removeProspectFromList(listId, prospectId)
        : await saveProspectToList(listId, prospectId);

      setPendingListId(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess(isMember ? "Removed from list." : "Added to list.");
    });
  }

  return (
    <div>
      <h3 className="text-base font-semibold text-slate-900 mb-4">Lists</h3>

      {savedLists.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">
          No saved lists yet. Create lists from the Lists page to organize this prospect.
        </p>
      ) : (
        <ul className="space-y-2">
          {savedLists.map((list) => {
            const isMember = inList(list.id);
            const isBusy = pendingListId === list.id;
            return (
              <li key={list.id}>
                <button
                  onClick={() => handleToggle(list.id, isMember)}
                  disabled={isPending}
                  aria-pressed={isMember}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-all duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none disabled:opacity-60",
                    isMember
                      ? "border-blue-200 bg-blue-50/60 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  <span className={cn("flex items-center justify-center w-5 h-5 rounded border transition-colors duration-150", isMember ? "bg-blue-600 border-blue-600" : "border-slate-300")}>
                    {isMember && (
                      <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                  <span className="flex-1 text-left font-medium">{list.name}</span>
                  {isBusy && (
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}
      {success && <p className="mt-3 text-sm text-green-600">{success}</p>}
    </div>
  );
}
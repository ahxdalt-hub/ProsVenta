"use client";

// ============================================================================
// Prosventa Intelligence Workspace — Priority Row Actions (Phase 4)
// ============================================================================
// One obvious PRIMARY action ("Open prospect") plus a quiet overflow menu for
// secondary actions. Every action reuses EXISTING infrastructure:
//   • Open prospect  → the existing ProspectDetailPanel slide-over
//   • Enrich / Research → the existing Intelligence action window
//     (credit-aware, server-enforced billing — never reimplemented here)
//   • Mark reviewed / Dismiss → the existing recommendation lifecycle server
//     actions (org-verified, transition-guarded)
// Feedback uses the global toast system. No placeholder actions.
// ============================================================================

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/Spinner";
import { useIntelligenceActionWindow } from "@/features/intelligence/action-window";
import {
  viewRecommendation,
  dismissRecommendation,
} from "@/features/intelligence/recommendations/actions";
import type { PriorityRecord } from "./priority-logic";

const MENU_ITEM =
  "flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus-visible:bg-slate-50 focus-visible:text-slate-900";

export function PriorityRowActions({
  record,
  onOpenProspect,
}: {
  record: PriorityRecord;
  onOpenProspect: (prospectId: string) => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const { openIntelligenceAction } = useIntelligenceActionWindow();
  const [menuOpen, setMenuOpen] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Close the overflow menu on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const targetContext = record.prospectId
    ? {
        targetId: record.prospectId,
        targetName: record.displayName,
        targetSub: record.contextLine ?? "",
      }
    : undefined;

  function openActionWindow(type: "enrich_prospect" | "research_prospect") {
    setMenuOpen(false);
    if (!targetContext) return;
    openIntelligenceAction({ type, context: targetContext });
  }

  async function markReviewed() {
    setMenuOpen(false);
    setStatusBusy(true);
    try {
      const ok = await viewRecommendation(record.id);
      if (ok) {
        toast.success("Priority marked as reviewed.");
        startTransition(() => router.refresh());
      } else {
        toast.error("Couldn't complete that action. Please try again.");
      }
    } catch {
      toast.error("Couldn't complete that action. Please try again.");
    } finally {
      setStatusBusy(false);
    }
  }

  async function dismiss() {
    setMenuOpen(false);
    setStatusBusy(true);
    try {
      const ok = await dismissRecommendation(record.id);
      if (ok) {
        toast.success("Priority dismissed.");
        startTransition(() => router.refresh());
      } else {
        toast.error("Couldn't complete that action. Please try again.");
      }
    } catch {
      toast.error("Couldn't complete that action. Please try again.");
    } finally {
      setStatusBusy(false);
    }
  }

  const busy = statusBusy || isPending;

  return (
    <div className="flex items-center gap-2">
      {record.prospectId ? (
        <button
          type="button"
          onClick={() => onOpenProspect(record.prospectId as string)}
          aria-label={`Open prospect ${record.displayName}`}
          className="btn-press inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all duration-150 hover:bg-navy-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Open prospect
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      ) : null}

      <div className="relative" ref={menuRef}>
        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          disabled={busy}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={`More actions for ${record.displayName}`}
          className="rounded p-1 text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? (
            <Spinner size="sm" className="h-3.5 w-3.5" />
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="5" cy="12" r="1.6" />
              <circle cx="12" cy="12" r="1.6" />
              <circle cx="19" cy="12" r="1.6" />
            </svg>
          )}
        </button>

        {menuOpen && (
          <div
            role="menu"
            aria-label={`Actions for ${record.displayName}`}
            className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          >
            {record.prospectId && (
              <>
                <button role="menuitem" type="button" className={MENU_ITEM} onClick={() => openActionWindow("enrich_prospect")}>
                  Enrich prospect
                </button>
                <button role="menuitem" type="button" className={MENU_ITEM} onClick={() => openActionWindow("research_prospect")}>
                  Research prospect
                </button>
                <div className="my-1 border-t border-slate-100" aria-hidden="true" />
              </>
            )}
            {record.status === "new" && (
              <button role="menuitem" type="button" className={MENU_ITEM} onClick={markReviewed}>
                Mark reviewed
              </button>
            )}
            <button
              role="menuitem"
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-red-600 transition-colors duration-150 hover:bg-red-50 focus:outline-none focus-visible:bg-red-50"
              onClick={dismiss}
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


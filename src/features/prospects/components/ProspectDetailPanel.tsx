"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import type { Prospect, ProspectNote, SavedList, ProspectStatus, ProspectPriority } from "@/types/database";
import { getProspectWithDetails } from "@/lib/db/prospects";
import {
  changeProspectStatus,
  changeProspectPriority,
  updateProspectTags,
  updateProspectContact,
  addProspectNote,
  removeProspectNote,
  saveProspectToList,
  removeProspectFromList,
  deleteProspectAction,
} from "@/features/prospects/actions/manage";
import { toggleProspectFavoriteAction } from "@/features/prospects/actions/saved-views";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { StatusBadge, TagBadge, IcpScoreBadge } from "./ProspectBadges";
import type { ScoreCategory } from "@/features/intelligence/scoring/types";
import { ProspectTimeline, type TimelineEvent } from "./ProspectTimeline";
import { STATUS_OPTIONS, STATUS_LABELS, STATUS_STYLES, PRIORITY_OPTIONS, PRIORITY_LABELS, PRIORITY_STYLES } from "./status-config";
import { CompanyEnrichmentSection } from "@/features/intelligence/company-enrichment/components/CompanyEnrichmentSection";
import { PersonEnrichmentSection } from "@/features/intelligence/person-enrichment/components/PersonEnrichmentSection";
import { EnrichProspectWindow } from "@/features/enrichment/components/EnrichProspectWindow";
import { CompanyResearchSection } from "@/features/intelligence/components/CompanyResearchSection";
import { ProspectResearchSection } from "@/features/intelligence/components/ProspectResearchSection";
import { ScoreSection } from "@/features/intelligence/components/ScoreSection";
import { SignalSection } from "@/features/intelligence/components/SignalSection";
import { RecommendationSection } from "@/features/intelligence/components/RecommendationSection";
import { SignalsTab } from "@/features/intelligence/signals/components/SignalsTab";
import { toCompanyKey } from "@/features/intelligence/signals/components/signal-display";
import { IntelligencePanel } from "@/features/intelligence/reasoning/components/IntelligencePanel";
import { IntelligenceSummaryCard } from "@/features/intelligence/reasoning/components/IntelligenceSummaryCard";

// ============================================================================
// Motion tokens — GPU-friendly transform slide using Prosventa easing.
// Transform for movement; no scale, no bounce, no backdrop effects.
// ============================================================================

const PANEL_EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];
const PANEL_EXIT_EASE = [0.65, 0, 0.35, 1] as [number, number, number, number];

interface ProspectDetailPanelProps {
  prospectId: string | null;
  onClose: () => void;
  savedLists: SavedList[];
  /** Called after a prospect is deleted — closes the panel and refreshes the table. */
  onDeleted?: () => void;
}

type PanelTab = "overview" | "signals" | "activity" | "notes" | "lists" | "intelligence";

const TABS: { id: PanelTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "signals", label: "Signals" },
  { id: "activity", label: "Activity" },
  { id: "notes", label: "Notes" },
  { id: "lists", label: "Lists" },
  { id: "intelligence", label: "Intelligence" },
];

export function ProspectDetailPanel({ prospectId, onClose, savedLists, onDeleted }: ProspectDetailPanelProps) {
  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [notes, setNotes] = useState<ProspectNote[]>([]);
  const [listIds, setListIds] = useState<string[]>([]);
  const [storedScore, setStoredScore] = useState<{ score: number; category: ScoreCategory } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Distinguishes "the database confirmed this prospect doesn't exist/isn't
  // accessible" from "still loading" and from "the load failed". Only a
  // completed query returning null may show the not-found state.
  const [notFound, setNotFound] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [noteContent, setNoteContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PanelTab>("overview");
  const [tagInput, setTagInput] = useState("");
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [contactDraft, setContactDraft] = useState({ contact_name: "", contact_email: "", contact_phone: "" });
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Phase-2 single-prospect enrichment window + reload signal after success.
  const [showEnrich, setShowEnrich] = useState(false);
  const [enrichTick, setEnrichTick] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch prospect details when prospectId changes.
  // Only loads stored/cached intelligence — never triggers provider calls.
  useEffect(() => {
    if (!prospectId) {
      setProspect(null);
      setNotes([]);
      setListIds([]);
      setStoredScore(null);
      setActiveTab("overview");
      setTagInput("");
      setIsEditingContact(false);
      setConfirmDelete(false);
      setError(null);
      setNotFound(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setNotFound(false);
    setConfirmDelete(false);

    // DEV-ONLY: trace the id used for the detail query (Phase 3 diagnostics).
    if (process.env.NODE_ENV === "development") {
      console.log("[DETAIL-PANEL] detail query prospectId:", JSON.stringify(prospectId));
    }

    getProspectWithDetails(prospectId)
      .then(async (data) => {
        if (cancelled) return;
        setProspect(data.prospect);
        // Only a completed query that genuinely returned no row means
        // "not found" — never an in-flight or failed load.
        setNotFound(!data.prospect);
        setNotes(data.notes);
        setListIds(data.listIds);
        setStoredScore(
          data.score ? { score: data.score.score, category: data.score.category } : null
        );
        if (data.prospect) {
          setContactDraft({
            contact_name: data.prospect.contact_name ?? "",
            contact_email: data.prospect.contact_email ?? "",
            contact_phone: data.prospect.contact_phone ?? "",
          });
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load prospect details.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [prospectId, enrichTick]);

  // Lock body scroll while open so the table behind stays stable.
  // Compensate for the disappearing scrollbar with padding so the page
  // doesn't shift horizontally when the panel opens/closes.
  useEffect(() => {
    if (!prospectId) return;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [prospectId]);

  // Close on Escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && prospectId) {
        onClose();
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [prospectId, onClose]);

  // Focus panel on open
  useEffect(() => {
    if (prospectId && panelRef.current) {
      panelRef.current.focus();
    }
  }, [prospectId]);

  // Reset scroll position when switching prospects or tabs
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [prospectId, activeTab]);

  // ------------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------------

  const handleToggleFavorite = useCallback(() => {
    if (!prospect) return;
    const next = !prospect.is_favorite;
    setProspect({ ...prospect, is_favorite: next });
    startTransition(async () => {
      const result = await toggleProspectFavoriteAction(prospect.id, next);
      if (result.error) {
        setError(result.error);
        setProspect({ ...prospect, is_favorite: !next });
      }
    });
  }, [prospect]);

  const handleStatusChange = useCallback((status: ProspectStatus) => {
    if (!prospect) return;
    setError(null);
    startTransition(async () => {
      const result = await changeProspectStatus(prospect.id, status);
      if (result.error) {
        setError(result.error);
        return;
      }
      setProspect({ ...prospect, status });
    });
  }, [prospect]);

  const handlePriorityChange = useCallback((priority: ProspectPriority) => {
    if (!prospect) return;
    setError(null);
    startTransition(async () => {
      const result = await changeProspectPriority(prospect.id, priority);
      if (result.error) {
        setError(result.error);
        return;
      }
      setProspect({ ...prospect, priority });
    });
  }, [prospect]);

  const handleAddTag = useCallback(() => {
    if (!prospect || !tagInput.trim()) return;
    const newTag = tagInput.trim().toLowerCase();
    if (prospect.tags?.includes(newTag)) {
      setTagInput("");
      return;
    }
    const newTags = [...(prospect.tags ?? []), newTag];
    setError(null);
    startTransition(async () => {
      const result = await updateProspectTags(prospect.id, newTags);
      if (result.error) {
        setError(result.error);
        return;
      }
      setProspect({ ...prospect, tags: newTags });
      setTagInput("");
    });
  }, [prospect, tagInput]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    if (!prospect) return;
    const newTags = (prospect.tags ?? []).filter((t) => t !== tagToRemove);
    setError(null);
    startTransition(async () => {
      const result = await updateProspectTags(prospect.id, newTags);
      if (result.error) {
        setError(result.error);
        return;
      }
      setProspect({ ...prospect, tags: newTags });
    });
  }, [prospect]);

  const handleSaveContact = useCallback(() => {
    if (!prospect) return;
    setError(null);
    startTransition(async () => {
      const result = await updateProspectContact(prospect.id, {
        contact_name: contactDraft.contact_name || null,
        contact_email: contactDraft.contact_email || null,
        contact_phone: contactDraft.contact_phone || null,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setProspect({
        ...prospect,
        contact_name: contactDraft.contact_name || null,
        contact_email: contactDraft.contact_email || null,
        contact_phone: contactDraft.contact_phone || null,
      });
      setIsEditingContact(false);
    });
  }, [prospect, contactDraft]);

  const handleAddNote = useCallback(() => {
    if (!prospect || !noteContent.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await addProspectNote(prospect.id, noteContent);
      if (result.error) {
        setError(result.error);
        return;
      }
      setNoteContent("");
      const data = await getProspectWithDetails(prospect.id);
      setNotes(data.notes);
    });
  }, [prospect, noteContent]);

  const handleDeleteNote = useCallback((noteId: string) => {
    if (!prospect) return;
    setError(null);
    startTransition(async () => {
      const result = await removeProspectNote(noteId, prospect.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    });
  }, [prospect]);

  const handleToggleList = useCallback((listId: string, isMember: boolean) => {
    if (!prospect) return;
    setError(null);
    startTransition(async () => {
      const result = isMember
        ? await removeProspectFromList(listId, prospect.id)
        : await saveProspectToList(listId, prospect.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setListIds((prev) =>
        isMember
          ? prev.filter((id) => id !== listId)
          : [...prev, listId]
      );
    });
  }, [prospect]);

  // Stage 6 - Phase 3: person enrichment lives in PersonEnrichmentSection
  // (identity resolution, capability gating, provenance, relevance).

  const handleDelete = useCallback(() => {
    if (!prospect || isPending) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteProspectAction(prospect.id);
      if (result.error) {
        setError(result.error);
        setConfirmDelete(false);
        return;
      }
      onDeleted?.();
    });
  }, [prospect, isPending, onDeleted]);

  // Build timeline events from real prospect data
  const timelineEvents = useMemo<TimelineEvent[]>(() => {
    if (!prospect) return [];

    const events: TimelineEvent[] = [
      {
        id: `created-${prospect.id}`,
        type: "created",
        title: "Prospect created",
        description: `Added via ${prospect.source}`,
        timestamp: prospect.created_at,
      },
    ];

    notes.forEach((note) => {
      events.push({
        id: `note-${note.id}`,
        type: "note_added",
        title: "Note added",
        description: note.content.length > 80 ? `${note.content.slice(0, 80)}...` : note.content,
        timestamp: note.created_at,
      });
    });

    if (prospect.last_contacted_at) {
      events.push({
        id: `contacted-${prospect.id}`,
        type: "contacted",
        title: "Prospect contacted",
        timestamp: prospect.last_contacted_at,
      });
    }

    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [prospect, notes]);

  const isOpen = prospectId !== null;
  const companyName = prospect?.company_name || prospect?.name || "Unknown";
  const hasDomain = Boolean(prospect?.domain || prospect?.website);
  const hasContactData = Boolean(
    prospect?.contact_name || prospect?.name || prospect?.contact_email || prospect?.company_name
  );

  return (
    <AnimatePresence>
      {isOpen && (
        /* Keyed because AnimatePresence tracks its DIRECT children by key
           (child.key || ""). An unkeyed subtree here paired with the other
           unkeyed sibling below (<EnrichProspectWindow />) yielded two
           presence children with key "" — React's duplicate-empty-key
           warning. Keying them fixes it without touching the animation. */
        <Fragment key="detail-panel">
          {/* Lightweight mobile-only scrim — tap to dismiss. No blur, no desktop dimming. */}
          <motion.div
            key="panel-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-slate-900/25 md:hidden"
            aria-hidden="true"
          />

          {/* Panel — slides in from the right */}
          <motion.div
            key="panel-body"
            ref={panelRef}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%", transition: { duration: 0.18, ease: PANEL_EXIT_EASE } }}
            transition={{ duration: 0.25, ease: PANEL_EASE }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-xl focus:outline-none"
            role="dialog"
            aria-modal="true"
            aria-label={`${companyName} details`}
            tabIndex={-1}
          >
            {/* Compact sticky header — identity, status, favorite, close */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 text-sm font-bold text-blue-700">
                  {isLoading ? <Skeleton className="h-5 w-5 rounded" /> : companyName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold leading-tight text-slate-900">
                    {isLoading ? <Skeleton className="h-4 w-36" /> : companyName}
                  </h2>
                  <div className="mt-1 flex min-w-0 items-center gap-2">
                    {prospect ? (
                      <>
                        <StatusBadge status={prospect.status} />
                        <IcpScoreBadge
                          score={storedScore?.score ?? null}
                          category={storedScore?.category ?? null}
                        />
                      </>
                    ) : (
                      <Skeleton className="h-5 w-16 rounded-full" />
                    )}
                    {!isLoading && prospect?.domain && (
                      <span className="truncate text-xs text-slate-400">{prospect.domain}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {prospect && (
                  <button
                    onClick={() => setShowEnrich(true)}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors duration-150 hover:bg-blue-50 hover:text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                    aria-label={`Enrich ${companyName}`}
                    title="Enrich Prospect"
                  >
                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
                      <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" />
                    </svg>
                  </button>
                )}
                {prospect && (
                  <button
                    onClick={handleToggleFavorite}
                    disabled={isPending}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none disabled:opacity-50",
                      prospect.is_favorite
                        ? "text-amber-500 hover:bg-amber-50"
                        : "text-slate-300 hover:text-amber-500 hover:bg-amber-50/60"
                    )}
                    aria-label={prospect.is_favorite ? `Remove ${companyName} from favorites` : `Add ${companyName} to favorites`}
                    aria-pressed={prospect.is_favorite}
                  >
                    <svg
                      className="h-[18px] w-[18px]"
                      viewBox="0 0 24 24"
                      fill={prospect.is_favorite ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                  aria-label="Close panel"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Independently scrolling content — ps-scroll gives it the same
                thin Prosventa scrollbar as the table and Saved Lists areas.
                The panel is fixed inset-y-0 and flex-col, so the header above
                stays stable while only this region scrolls. */}
            <div ref={scrollRef} className="ps-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {isLoading || (!prospect && !notFound && !error) ? (
                /* Skeleton covers both the in-flight fetch AND the brief
                   window after opening before the effect runs — the panel
                   must never flash "Prospect not found" for a pending load. */
                <DetailSkeleton />
              ) : prospect ? (
                <>
                  {/* Tabs */}
                  <div className="sticky top-0 z-10 border-b border-slate-100 bg-white px-4 pb-2 pt-3 sm:px-5">
                    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/60 p-1" role="tablist" aria-label="Prospect sections">
                      {TABS.map((tab) => (
                        <button
                          key={tab.id}
                          role="tab"
                          aria-selected={activeTab === tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={cn(
                            "flex-1 rounded-md px-1 py-1.5 text-[13px] font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none",
                            activeTab === tab.id
                              ? "bg-white text-slate-900 shadow-sm"
                              : "text-slate-500 hover:text-slate-700"
                          )}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {error && (
                    <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 sm:mx-5" role="alert">
                      {error}
                    </div>
                  )}

                  <div className="px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-1 sm:px-5">
                    {/* ------------------------------------------------ */}
                    {/* Overview                                          */}
                    {/* ------------------------------------------------ */}
                    {activeTab === "overview" && prospect && (
                      <div>
                        <div className="pt-4">
                          <IntelligenceSummaryCard prospectId={prospect.id} />
                        </div>

                        <Section title="Details">
                          {prospect.website && (
                            <a
                              href={prospect.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mb-3 inline-flex items-center gap-1.5 text-sm text-blue-600 transition-colors duration-150 hover:text-blue-700"
                            >
                              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                <polyline points="15 3 21 3 21 9" />
                                <line x1="10" y1="14" x2="21" y2="3" />
                              </svg>
                              Visit website
                            </a>
                          )}
                          {prospect.description && (
                            <p className="mb-4 text-sm leading-relaxed text-slate-600">
                              {prospect.description}
                            </p>
                          )}
                          <dl className="divide-y divide-slate-50">
                            <MetaRow label="Industry" value={prospect.industry} />
                            <MetaRow
                              label="Location"
                              value={[prospect.city, prospect.country].filter(Boolean).join(", ") || prospect.location}
                            />
                            {prospect.employee_count !== null && (
                              <MetaRow label="Employees" value={prospect.employee_count.toLocaleString()} />
                            )}
                            <MetaRow label="Source" value={prospect.source} capitalize />
                            <MetaRow label="Added" value={formatDate(prospect.created_at)} />
                            {prospect.last_contacted_at && (
                              <MetaRow label="Last contacted" value={formatDate(prospect.last_contacted_at)} />
                            )}
                          </dl>
                        </Section>

                        <Section title="Contact">
                          {isEditingContact ? (
                            <div className="space-y-2.5">
                              <input
                                type="text"
                                value={contactDraft.contact_name}
                                onChange={(e) => setContactDraft({ ...contactDraft, contact_name: e.target.value })}
                                placeholder="Contact name"
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-all duration-150 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                                aria-label="Contact name"
                              />
                              <input
                                type="email"
                                value={contactDraft.contact_email}
                                onChange={(e) => setContactDraft({ ...contactDraft, contact_email: e.target.value })}
                                placeholder="Email address"
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-all duration-150 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                                aria-label="Contact email"
                              />
                              <input
                                type="tel"
                                value={contactDraft.contact_phone}
                                onChange={(e) => setContactDraft({ ...contactDraft, contact_phone: e.target.value })}
                                placeholder="Phone number"
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-all duration-150 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                                aria-label="Contact phone"
                              />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={handleSaveContact} loading={isPending}>
                                  Save
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setIsEditingContact(false)}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <ContactRow
                                icon={
                                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                  </svg>
                                }
                                value={prospect.contact_name}
                                placeholder="No contact name"
                              />
                              <ContactRow
                                icon={
                                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                    <polyline points="22,6 12,13 2,6" />
                                  </svg>
                                }
                                value={prospect.contact_email}
                                placeholder="No email"
                              />
                              <ContactRow
                                icon={
                                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                                  </svg>
                                }
                                value={prospect.contact_phone}
                                placeholder="No phone"
                              />
                              <Button size="sm" variant="secondary" onClick={() => setIsEditingContact(true)}>
                                Edit Contact
                              </Button>
                            </div>
                          )}
                        </Section>

                        <Section title="Pipeline">
                          <div className="space-y-4">
                            <div>
                              <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-400">Status</p>
                              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Prospect status">
                                {STATUS_OPTIONS.map((option) => (
                                  <button
                                    key={option}
                                    onClick={() => handleStatusChange(option)}
                                    disabled={isPending}
                                    aria-pressed={prospect.status === option}
                                    className={cn(
                                      "rounded-full border px-2.5 py-1.5 text-xs font-semibold transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none disabled:opacity-50",
                                      prospect.status === option
                                        ? STATUS_STYLES[option]
                                        : "border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                                    )}
                                  >
                                    {STATUS_LABELS[option]}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-400">Priority</p>
                              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Prospect priority">
                                {PRIORITY_OPTIONS.map((option) => (
                                  <button
                                    key={option}
                                    onClick={() => handlePriorityChange(option)}
                                    disabled={isPending}
                                    aria-pressed={prospect.priority === option}
                                    className={cn(
                                      "rounded-full border px-2.5 py-1.5 text-xs font-semibold capitalize transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none disabled:opacity-50",
                                      prospect.priority === option
                                        ? PRIORITY_STYLES[option]
                                        : "border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                                    )}
                                  >
                                    {PRIORITY_LABELS[option]}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </Section>

                        <Section title="Tags">
                          {(prospect.tags ?? []).length > 0 && (
                            <div className="mb-2.5 flex flex-wrap gap-1.5">
                              {Array.from(new Set((prospect.tags ?? []).filter((t) => t.trim() !== ""))).map((tag) => (
                                <span key={tag} className="inline-flex items-center gap-1">
                                  <TagBadge tag={tag} />
                                  <button
                                    onClick={() => handleRemoveTag(tag)}
                                    disabled={isPending}
                                    className="rounded text-slate-300 transition-colors duration-150 hover:text-red-500 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none disabled:opacity-50"
                                    aria-label={`Remove tag ${tag}`}
                                  >
                                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                      <line x1="18" y1="6" x2="6" y2="18" />
                                      <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={tagInput}
                              onChange={(e) => setTagInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddTag();
                                }
                              }}
                              placeholder="Add a tag..."
                              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm transition-all duration-150 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                              aria-label="Add a tag"
                            />
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={handleAddTag}
                              disabled={!tagInput.trim() || isPending}
                            >
                              Add
                            </Button>
                          </div>
                        </Section>

                        <Section title="Delete Prospect">
                          {confirmDelete ? (
                            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                              <p className="text-sm text-red-700">
                                Delete this prospect permanently? This cannot be undone.
                              </p>
                              <div className="mt-3 flex gap-2">
                                <Button size="sm" variant="danger" onClick={handleDelete} loading={isPending}>
                                  Delete
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => setConfirmDelete(true)}
                              disabled={isPending}
                            >
                              Delete prospect
                            </Button>
                          )}
                        </Section>
                      </div>
                    )}

                    {/* ------------------------------------------------ */}
                    {/* Signals (Feature 3 — Phase 3)                     */}
                    {/* ------------------------------------------------ */}
                    {activeTab === "signals" && prospect && (
                      <SignalsTab
                        prospectId={prospect.id}
                        companyKey={toCompanyKey(prospect.domain ?? prospect.website)}
                      />
                    )}

                    {/* ------------------------------------------------ */}
                    {/* Activity                                          */}
                    {/* ------------------------------------------------ */}
                    {activeTab === "activity" && (
                      <div className="pt-4">
                        {timelineEvents.length === 0 ? (
                          <EmptyBlock
                            title="No activity yet"
                            description="Updates will appear here as you work this prospect — notes, status changes, and outreach."
                          />
                        ) : (
                          <ProspectTimeline events={timelineEvents} />
                        )}
                      </div>
                    )}

                    {/* ------------------------------------------------ */}
                    {/* Notes                                             */}
                    {/* ------------------------------------------------ */}
                    {activeTab === "notes" && (
                      <div className="pt-4">
                        <div className="mb-4">
                          <Textarea
                            value={noteContent}
                            onChange={(e) => setNoteContent(e.target.value)}
                            rows={3}
                            placeholder="Add a note about this prospect..."
                            aria-label="Add a note"
                          />
                          <div className="mt-2 flex justify-end">
                            <Button
                              size="sm"
                              onClick={handleAddNote}
                              loading={isPending}
                              disabled={!noteContent.trim()}
                            >
                              Add Note
                            </Button>
                          </div>
                        </div>

                        {notes.length === 0 ? (
                          <EmptyBlock
                            title="No notes yet"
                            description="Notes you add here stay attached to this prospect for your whole team."
                          />
                        ) : (
                          <ul className="space-y-2.5">
                            {notes.map((note) => (
                              <li
                                key={note.id}
                                className="rounded-lg border border-slate-200 bg-slate-50/50 p-3"
                              >
                                <p className="whitespace-pre-wrap text-sm text-slate-700">
                                  {note.content}
                                </p>
                                <div className="mt-2 flex items-center justify-between">
                                  <span className="text-xs text-slate-400">
                                    {formatDate(note.created_at)}
                                  </span>
                                  <button
                                    onClick={() => handleDeleteNote(note.id)}
                                    disabled={isPending}
                                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 transition-colors duration-150 hover:text-red-600 disabled:opacity-50"
                                  >
                                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                      <polyline points="3 6 5 6 21 6" />
                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    </svg>
                                    Delete
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {/* ------------------------------------------------ */}
                    {/* Lists                                             */}
                    {/* ------------------------------------------------ */}
                    {activeTab === "lists" && (
                      <div className="pt-4">
                        {savedLists.length === 0 ? (
                          <EmptyBlock
                            title="No saved lists yet"
                            description="Create lists from the Saved Lists page, then organize this prospect into them."
                          />
                        ) : (
                          <div className="space-y-1.5">
                            {savedLists.map((list) => {
                              const isMember = listIds.includes(list.id);
                              return (
                                <button
                                  key={list.id}
                                  onClick={() => handleToggleList(list.id, isMember)}
                                  disabled={isPending}
                                  aria-pressed={isMember}
                                  className={cn(
                                    "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none disabled:opacity-60",
                                    isMember
                                      ? "border-blue-200 bg-blue-50/60 text-blue-700"
                                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                  )}
                                >
                                  <span className={cn("flex h-5 w-5 items-center justify-center rounded border transition-colors duration-150", isMember ? "border-blue-600 bg-blue-600" : "border-slate-300")}>
                                    {isMember && (
                                      <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <polyline points="20 6 9 17 4 12" />
                                      </svg>
                                    )}
                                  </span>
                                  <span className="min-w-0 flex-1 truncate font-medium">{list.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ------------------------------------------------ */}
                    {/* Intelligence — real pipeline data only            */}
                    {/* ------------------------------------------------ */}
                    {activeTab === "intelligence" && prospect && (
                      <div className="pt-4">
                        <IntelligencePanel scope="prospect" prospectId={prospect.id} />

                        <div className="mt-6 border-t border-slate-100 pt-5">
                          <p className="mb-4 text-xs font-medium uppercase tracking-wider text-slate-400">
                            Detailed research
                          </p>
                        </div>

                        <Section title="ICP Match Score">
                          {/* Distinct meaning: this is the deterministic ICP match
                              percentage — NOT the Intelligence overall priority. */}
                          <ScoreSection prospectId={prospect.id} />
                        </Section>

                        <Section title="Buying Signals">
                          <SignalSection prospectId={prospect.id} />
                        </Section>

                        <Section title="Recommended Actions">
                          <RecommendationSection prospectId={prospect.id} />
                        </Section>

                        <Section title="Research">
                          <div className="space-y-5">
                            <CompanyResearchSection
                              prospectId={prospect.id}
                              hasDomain={hasDomain}
                            />
                            <div className="border-t border-slate-100 pt-5">
                              <ProspectResearchSection
                                prospectId={prospect.id}
                                hasData={hasContactData}
                              />
                            </div>
                          </div>
                        </Section>

                        <Section title="Company Profile">
                          <CompanyEnrichmentSection
                            prospectId={prospect.id}
                            hasDomain={hasDomain}
                          />
                        </Section>

                        <Section title="Person Intelligence">
                          <PersonEnrichmentSection
                            prospectId={prospect.id}
                            hasIdentity={hasContactData || hasDomain}
                          />
                        </Section>
                      </div>
                    )}
                  </div>
                </>
              ) : error ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-8">
                  <p className="text-sm text-slate-500">{error}</p>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setEnrichTick((t) => t + 1)}
                  >
                    Try again
                  </Button>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center p-8">
                  <p className="text-sm text-slate-400">Prospect not found.</p>
                </div>
              )}
            </div>
          </motion.div>
        </Fragment>
      )}

      {/* Phase-2 single-prospect enrichment window — opens over the panel
          without navigation; on success the panel reloads its stored data.
          Keyed: it is a DIRECT child of AnimatePresence, which derives its
          tracking key from child.key || "" (see note above). */}
      {prospectId && (
        <EnrichProspectWindow
          key="enrich-prospect-window"
          prospectId={prospectId}
          open={showEnrich}
          onClose={() => setShowEnrich(false)}
          onCompleted={() => setEnrichTick((t) => t + 1)}
        />
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// Shared building blocks
// ============================================================================

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-slate-100 py-5 first:border-t-0 first:pt-0 last:pb-2">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">{title}</h3>
      {children}
    </section>
  );
}

function MetaRow({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string | null | undefined;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="shrink-0 text-xs font-medium uppercase tracking-wider text-slate-400">
        {label}
      </dt>
      <dd className={cn("truncate text-right text-sm text-slate-700", capitalize && "capitalize")}>
        {value || "—"}
      </dd>
    </div>
  );
}

function ContactRow({
  icon,
  value,
  placeholder,
}: {
  icon: React.ReactNode;
  value: string | null;
  placeholder: string;
}) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <span className="shrink-0 text-slate-400">{icon}</span>
      <span className={cn("truncate", value ? "text-slate-700" : "text-slate-400")}>
        {value ?? placeholder}
      </span>
    </div>
  );
}

function EmptyBlock({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">
      <p className="text-sm font-medium text-slate-600">{title}</p>
      <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-slate-400">
        {description}
      </p>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="px-4 py-5 sm:px-5">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <div className="mt-6 space-y-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>
      <Skeleton className="mt-6 h-9 w-full rounded-lg" />
    </div>
  );
}

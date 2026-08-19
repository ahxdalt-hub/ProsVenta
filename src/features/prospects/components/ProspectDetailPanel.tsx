"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
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
} from "@/features/prospects/actions/manage";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { StatusBadge, TagBadge } from "./ProspectBadges";
import { ProspectTimeline, type TimelineEvent } from "./ProspectTimeline";
import { STATUS_OPTIONS, STATUS_LABELS, STATUS_STYLES, PRIORITY_OPTIONS, PRIORITY_LABELS, PRIORITY_STYLES } from "./status-config";
import { AIIntelligenceSection, getActiveProvider } from "@/features/prospects/ai";
import type { AIProspectIntelligence } from "@/features/prospects/ai";
import { enrichProspectContact, getProspectIntelligenceAction } from "@/features/intelligence/actions/enrich";
import type { ProspectEnrichmentOperationResult, ProspectIntelligence } from "@/features/intelligence/types";
import { CompanyEnrichmentSection } from "@/features/intelligence/company-enrichment/components/CompanyEnrichmentSection";
import { CompanyResearchSection } from "@/features/intelligence/components/CompanyResearchSection";
import { ProspectResearchSection } from "@/features/intelligence/components/ProspectResearchSection";
import { ScoreSection } from "@/features/intelligence/components/ScoreSection";
import { SignalSection } from "@/features/intelligence/components/SignalSection";
import { RecommendationSection } from "@/features/intelligence/components/RecommendationSection";

interface ProspectDetailPanelProps {
  prospectId: string | null;
  onClose: () => void;
  savedLists: SavedList[];
}

type PanelTab = "overview" | "activity";

export function ProspectDetailPanel({ prospectId, onClose, savedLists }: ProspectDetailPanelProps) {
  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [notes, setNotes] = useState<ProspectNote[]>([]);
  const [listIds, setListIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [noteContent, setNoteContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PanelTab>("overview");
  const [tagInput, setTagInput] = useState("");
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [contactDraft, setContactDraft] = useState({ contact_name: "", contact_email: "", contact_phone: "" });
  const [aiIntelligence, setAiIntelligence] = useState<AIProspectIntelligence | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isAiRefreshing, setIsAiRefreshing] = useState(false);
  const [prospectIntel, setProspectIntel] = useState<ProspectIntelligence | null>(null);
  const [isProspectEnriching, setIsProspectEnriching] = useState(false);
  const [prospectEnrichment, setProspectEnrichment] = useState<ProspectEnrichmentOperationResult | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch prospect details when prospectId changes
  useEffect(() => {
    if (!prospectId) {
      setProspect(null);
      setNotes([]);
      setListIds([]);
      setActiveTab("overview");
      setTagInput("");
      setIsEditingContact(false);
      setAiIntelligence(null);
      setIsAiLoading(false);
      setIsAiRefreshing(false);
      setProspectIntel(null);
      setIsProspectEnriching(false);
      setProspectEnrichment(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setAiIntelligence(null);
    setIsAiLoading(true);
    setProspectIntel(null);
    setProspectEnrichment(null);

    getProspectWithDetails(prospectId)
      .then(async (data) => {
        if (cancelled) return;
        setProspect(data.prospect);
        setNotes(data.notes);
        setListIds(data.listIds);
        if (data.prospect) {
          setContactDraft({
            contact_name: data.prospect.contact_name ?? "",
            contact_email: data.prospect.contact_email ?? "",
            contact_phone: data.prospect.contact_phone ?? "",
          });
          // Load stored prospect intelligence (does not call provider)
          const intelResult = await getProspectIntelligenceAction(data.prospect.id).catch(() => null);
          if (!cancelled && intelResult) {
            setProspectIntel(intelResult);
          }
          // Generate AI intelligence for the prospect
          const provider = getActiveProvider();
          const result = provider.generate(data.prospect);
          if (result instanceof Promise) {
            result.then((intel) => {
              if (!cancelled) {
                setAiIntelligence(intel);
                setIsAiLoading(false);
              }
            });
          } else {
            if (!cancelled) {
              setAiIntelligence(result);
              setIsAiLoading(false);
            }
          }
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
  }, [prospectId]);

  // Handle AI refresh / regenerate
  const handleAiRefresh = useCallback(() => {
    if (!prospect || isAiRefreshing) return;
    setIsAiRefreshing(true);
    const provider = getActiveProvider();
    const result = provider.generate(prospect, { seed: Date.now() });
    if (result instanceof Promise) {
      result.then((intel) => {
        setAiIntelligence(intel);
        setIsAiRefreshing(false);
      });
    } else {
      setAiIntelligence(result);
      setIsAiRefreshing(false);
    }
  }, [prospect, isAiRefreshing]);

  const handleAiGenerate = useCallback(() => {
    if (!prospect || isAiRefreshing) return;
    setIsAiRefreshing(true);
    const provider = getActiveProvider();
    const result = provider.generate(prospect);
    if (result instanceof Promise) {
      result.then((intel) => {
        setAiIntelligence(intel);
        setIsAiRefreshing(false);
      });
    } else {
      setAiIntelligence(result);
      setIsAiRefreshing(false);
    }
  }, [prospect, isAiRefreshing]);

  // Prospect / Contact enrichment
  const handleProspectEnrich = useCallback(async (refresh = false) => {
    if (!prospect || isProspectEnriching) return;
    setIsProspectEnriching(true);
    setProspectEnrichment(null);
    try {
      const result = await enrichProspectContact(prospect.id, { refresh });
      setProspectEnrichment(result);
      // Refresh stored intelligence display
      const intel = await getProspectIntelligenceAction(prospect.id).catch(() => null);
      if (intel) setProspectIntel(intel);
    } catch {
      setProspectEnrichment({
        status: "failed",
        message: "Unexpected error during prospect enrichment.",
        data: null,
        provider: "prospect-enrichment",
        enrichedAt: null,
        identityUsed: null,
      });
    } finally {
      setIsProspectEnriching(false);
    }
  }, [prospect, isProspectEnriching]);

  // Lock body scroll when open
  useEffect(() => {
    if (prospectId) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
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
      // Refresh notes
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

  // Build timeline events from prospect data
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

    // Add note events
    notes.forEach((note) => {
      events.push({
        id: `note-${note.id}`,
        type: "note_added",
        title: "Note added",
        description: note.content.length > 80 ? `${note.content.slice(0, 80)}...` : note.content,
        timestamp: note.created_at,
      });
    });

    // Add last contacted event
    if (prospect.last_contacted_at) {
      events.push({
        id: `contacted-${prospect.id}`,
        type: "contacted",
        title: "Prospect contacted",
        timestamp: prospect.last_contacted_at,
      });
    }

    // Sort by timestamp descending (newest first)
    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [prospect, notes]);

  const isOpen = prospectId !== null;
  const companyName = prospect?.company_name || prospect?.name || "Unknown";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-lg overflow-y-auto bg-white shadow-2xl focus:outline-none"
            role="dialog"
            aria-modal="true"
            aria-label={`${companyName} details`}
            tabIndex={-1}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/90 backdrop-blur-sm px-5 py-4">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900">
                  Prospect Details
                </h2>
                {prospect && (
                  <StatusBadge status={prospect.status} />
                )}
              </div>
              <button
                onClick={onClose}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                aria-label="Close panel"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="px-5 py-5 space-y-6">
              {isLoading ? (
                <DetailSkeleton />
              ) : prospect ? (
                <>
                  {/* Company Profile */}
                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 text-lg font-bold shrink-0">
                      {companyName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-bold text-slate-900 leading-tight">
                        {companyName}
                      </h3>
                      {prospect.domain && (
                        <p className="text-sm text-slate-400 truncate mt-0.5">
                          {prospect.domain}
                        </p>
                      )}
                      {prospect.website && (
                        <a
                          href={prospect.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-1.5 text-sm text-blue-600 hover:text-blue-700 transition-colors duration-150"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                          Visit website
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/50 p-1" role="tablist" aria-label="Prospect sections">
                    {(["overview", "activity"] as PanelTab[]).map((tab) => (
                      <button
                        key={tab}
                        role="tab"
                        aria-selected={activeTab === tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                          "flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none capitalize",
                          activeTab === tab
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                        )}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {activeTab === "overview" ? (
                    <>
                      {/* AI Intelligence — First Section */}
                      <AIIntelligenceSection
                        intelligence={aiIntelligence}
                        isLoading={isAiLoading}
                        isRefreshing={isAiRefreshing}
                        onRefresh={handleAiRefresh}
                        onGenerate={handleAiGenerate}
                      />

                      {/* Company Enrichment */}
                      <Section label="Company Intelligence">
                        <CompanyEnrichmentSection
                          prospectId={prospect.id}
                          hasDomain={Boolean(prospect.domain || prospect.website)}
                        />
                      </Section>

                      {/* AI Company Research */}
                      <Section label="Company Research">
                        <CompanyResearchSection
                          prospectId={prospect.id}
                          hasDomain={Boolean(prospect.domain || prospect.website)}
                        />
                      </Section>

                      {/* AI Prospect Research */}
                      <Section label="Prospect Research">
                        <ProspectResearchSection
                          prospectId={prospect.id}
                          hasData={Boolean(
                            prospect.contact_name ||
                            prospect.name ||
                            prospect.contact_email ||
                            prospect.company_name
                          )}
                        />
                      </Section>

                      {/* ICP Score */}
                      <Section label="ICP Score">
                        <ScoreSection prospectId={prospect.id} />
                      </Section>

                      {/* Recommended Actions */}
                      <Section label="Recommended Actions">
                        <RecommendationSection prospectId={prospect.id} />
                      </Section>

                      {/* Buying & Intent Signals */}
                      <Section label="Signals">
                        <SignalSection prospectId={prospect.id} />
                      </Section>

                      {/* Prospect / Contact Intelligence */}
                      <Section label="Prospect Intelligence">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleProspectEnrich(false)}
                              loading={isProspectEnriching}
                            >
                              {isProspectEnriching ? "Enriching..." : "Enrich"}
                            </Button>
                            {prospectIntel && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleProspectEnrich(true)}
                                disabled={isProspectEnriching}
                              >
                                Refresh
                              </Button>
                            )}
                          </div>

                          {isProspectEnriching && (
                            <p className="text-sm text-slate-500">
                              Fetching professional information... this may take a moment.
                            </p>
                          )}

                          {prospectIntel && (
                            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-3">
                              {/* Professional Information */}
                              <div>
                                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                                  Professional Information
                                </p>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  {prospectIntel.jobTitle?.enriched && (
                                    <div>
                                      <span className="text-slate-400">Job title: </span>
                                      <span className="text-slate-700">{prospectIntel.jobTitle.enriched}</span>
                                    </div>
                                  )}
                                  {prospectIntel.department?.enriched && (
                                    <div>
                                      <span className="text-slate-400">Department: </span>
                                      <span className="text-slate-700">{prospectIntel.department.enriched}</span>
                                    </div>
                                  )}
                                  {prospectIntel.seniority?.enriched && (
                                    <div>
                                      <span className="text-slate-400">Seniority: </span>
                                      <span className="text-slate-700">{prospectIntel.seniority.enriched}</span>
                                    </div>
                                  )}
                                  {prospectIntel.location?.enriched && (
                                    <div>
                                      <span className="text-slate-400">Location: </span>
                                      <span className="text-slate-700">{prospectIntel.location.enriched}</span>
                                    </div>
                                  )}
                                  {prospectIntel.linkedin?.enriched && (
                                    <div className="col-span-2">
                                      <span className="text-slate-400">LinkedIn: </span>
                                      <a
                                        href={prospectIntel.linkedin.enriched}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-700"
                                      >
                                        View profile
                                      </a>
                                    </div>
                                  )}
                                  {prospectIntel.workEmail?.enriched && (
                                    <div className="col-span-2">
                                      <span className="text-slate-400">Email: </span>
                                      <span className="text-slate-700">{prospectIntel.workEmail.enriched}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Company Information */}
                              {(prospectIntel.company?.enriched || prospectIntel.companyDomain?.enriched) && (
                                <div>
                                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                                    Company Information
                                  </p>
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    {prospectIntel.company?.enriched && (
                                      <div>
                                        <span className="text-slate-400">Company: </span>
                                        <span className="text-slate-700">{prospectIntel.company.enriched}</span>
                                      </div>
                                    )}
                                    {prospectIntel.companyDomain?.enriched && (
                                      <div>
                                        <span className="text-slate-400">Domain: </span>
                                        <span className="text-slate-700">{prospectIntel.companyDomain.enriched}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Source Information */}
                              <p className="text-xs text-slate-400">
                                Source: {prospectIntel.provider}
                                {prospectIntel.enrichedAt && ` · Last enriched: ${formatDate(prospectIntel.enrichedAt)}`}
                                {prospectIntel.confidence !== null && ` · Confidence: ${prospectIntel.confidence}%`}
                              </p>
                            </div>
                          )}

                          {prospectEnrichment?.status === "completed" && !prospectIntel && (
                            <p className="text-sm text-slate-500">
                              {prospectEnrichment.message}
                            </p>
                          )}

                          {prospectEnrichment?.status === "failed" && (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
                              {prospectEnrichment.message}
                            </div>
                          )}
                        </div>
                      </Section>

                      {/* Status Selector */}
                      <Section label="Status">
                        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Prospect status">
                          {STATUS_OPTIONS.map((option) => (
                            <button
                              key={option}
                              onClick={() => handleStatusChange(option)}
                              disabled={isPending}
                              aria-pressed={prospect.status === option}
                              className={cn(
                                "px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none disabled:opacity-50",
                                prospect.status === option
                                  ? STATUS_STYLES[option]
                                  : "border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                              )}
                            >
                              {STATUS_LABELS[option]}
                            </button>
                          ))}
                        </div>
                      </Section>

                      {/* Priority Selector */}
                      <Section label="Priority">
                        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Prospect priority">
                          {PRIORITY_OPTIONS.map((option) => (
                            <button
                              key={option}
                              onClick={() => handlePriorityChange(option)}
                              disabled={isPending}
                              aria-pressed={prospect.priority === option}
                              className={cn(
                                "px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none disabled:opacity-50 capitalize",
                                prospect.priority === option
                                  ? PRIORITY_STYLES[option]
                                  : "border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                              )}
                            >
                              {PRIORITY_LABELS[option]}
                            </button>
                          ))}
                        </div>
                      </Section>

                      {/* Tags */}
                      <Section label="Tags">
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {(prospect.tags ?? []).map((tag) => (
                            <span key={tag} className="inline-flex items-center gap-1">
                              <TagBadge tag={tag} />
                              <button
                                onClick={() => handleRemoveTag(tag)}
                                disabled={isPending}
                                className="text-slate-300 hover:text-red-500 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none rounded"
                                aria-label={`Remove tag ${tag}`}
                              >
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="18" y1="6" x2="6" y2="18" />
                                  <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                              </button>
                            </span>
                          ))}
                        </div>
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
                            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition-all duration-150 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-slate-300"
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

                      {/* Contact */}
                      <Section label="Contact">
                        {isEditingContact ? (
                          <div className="space-y-2.5">
                            <input
                              type="text"
                              value={contactDraft.contact_name}
                              onChange={(e) => setContactDraft({ ...contactDraft, contact_name: e.target.value })}
                              placeholder="Contact name"
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition-all duration-150 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-slate-300"
                              aria-label="Contact name"
                            />
                            <input
                              type="email"
                              value={contactDraft.contact_email}
                              onChange={(e) => setContactDraft({ ...contactDraft, contact_email: e.target.value })}
                              placeholder="Email address"
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition-all duration-150 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-slate-300"
                              aria-label="Contact email"
                            />
                            <input
                              type="tel"
                              value={contactDraft.contact_phone}
                              onChange={(e) => setContactDraft({ ...contactDraft, contact_phone: e.target.value })}
                              placeholder="Phone number"
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition-all duration-150 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-slate-300"
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
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                  <circle cx="12" cy="7" r="4" />
                                </svg>
                              }
                              value={prospect.contact_name}
                              placeholder="No contact name"
                            />
                            <ContactRow
                              icon={
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                  <polyline points="22,6 12,13 2,6" />
                                </svg>
                              }
                              value={prospect.contact_email}
                              placeholder="No email"
                            />
                            <ContactRow
                              icon={
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

                      {/* Information Cards */}
                      <div className="grid grid-cols-2 gap-3">
                        <InfoCard label="Industry" value={prospect.industry} />
                        <InfoCard label="Location" value={[prospect.city, prospect.country].filter(Boolean).join(", ") || prospect.location} />
                        <InfoCard label="Source" value={prospect.source} capitalize />
                        <InfoCard label="Created" value={formatDate(prospect.created_at)} />
                        {prospect.employee_count !== null && (
                          <InfoCard label="Employees" value={prospect.employee_count?.toLocaleString()} />
                        )}
                        {prospect.description && (
                          <div className="col-span-2">
                            <InfoCard label="Description" value={prospect.description} full />
                          </div>
                        )}
                      </div>

                      {/* Saved Lists */}
                      <Section label="Saved Lists">
                        {savedLists.length === 0 ? (
                          <p className="text-sm text-slate-400">
                            No saved lists yet. Create lists from the Saved Lists page.
                          </p>
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
                                  <span className="flex-1 text-left font-medium truncate">{list.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </Section>
                    </>
                  ) : (
                    <>
                      {/* Timeline / Activity */}
                      <Section label="Activity Timeline">
                        <ProspectTimeline events={timelineEvents} />
                      </Section>
                    </>
                  )}

                  {/* Notes */}
                  <Section label="Notes">
                    <div className="mb-3">
                      <Textarea
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        rows={3}
                        placeholder="Add a note about this prospect..."
                        aria-label="Add a note"
                      />
                      <div className="flex justify-end mt-2">
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
                      <p className="text-sm text-slate-400 text-center py-4">
                        No notes yet.
                      </p>
                    ) : (
                      <ul className="space-y-2.5">
                        {notes.map((note) => (
                          <li
                            key={note.id}
                            className="rounded-lg border border-slate-200 bg-slate-50/50 p-3"
                          >
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">
                              {note.content}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-slate-400">
                                {formatDate(note.created_at)}
                              </span>
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                disabled={isPending}
                                className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-red-600 transition-colors duration-150 disabled:opacity-50"
                              >
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
                  </Section>

                  {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
                      {error}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-sm text-slate-400">Prospect not found.</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-900 mb-3">{label}</h4>
      {children}
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
      <span className="text-slate-400 shrink-0">{icon}</span>
      <span className={cn("truncate", value ? "text-slate-700" : "text-slate-400")}>
        {value ?? placeholder}
      </span>
    </div>
  );
}

function InfoCard({
  label,
  value,
  capitalize,
  full,
}: {
  label: string;
  value: string | null | undefined;
  capitalize?: boolean;
  full?: boolean;
}) {
  return (
    <div className={cn("rounded-lg border border-slate-100 bg-slate-50/50 p-3", full && "col-span-2")}>
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
        {label}
      </p>
      <p className={cn("text-sm text-slate-700 mt-1", capitalize && "capitalize")}>
        {value ?? "—"}
      </p>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Skeleton className="w-14 h-14 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-24 mt-2" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    </div>
  );
}
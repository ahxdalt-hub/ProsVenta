"use client";

// ============================================================================
// Prosventa Find Matching Leads — Workspace
// ============================================================================
// Phase 2: real provider-backed lead discovery.
// - Active ICP context + targeting controls prefilled from ICP defaults
//   (searches never modify the saved ICP)
// - Normalized LeadSearchRequest sent to searchMatchingLeadsAction; the
//   provider is reached only through the server-side discovery service
// - Results workspace: explainable ICP scores, sorting, cursor pagination,
//   deduplication, in-place save to Prospects with persistent Saved state
// - Polished loading / empty / error states; stale responses ignored;
//   duplicate concurrent searches prevented
// ============================================================================

import { useCallback, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Building2,
  CheckSquare,
  ListChecks,
  Target,
  X,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { fadeUp, staggerContainer } from "@/lib/motion";
import type {
  LeadSearchRequest,
  LeadSortOption,
  ScoredLead,
} from "@/features/prospects/types/discovery";
import {
  searchMatchingLeadsAction,
  saveDiscoveredProspectAction,
  type DiscoveryActionError,
} from "@/features/prospects/actions/discovery";
import { ActiveIcpCard } from "./ActiveIcpCard";
import { LeadResultCard, type SaveState } from "./LeadResultCard";
import { LeadDetailWindow } from "./LeadDetailWindow";
import {
  DiscoveryErrorState,
  EmptyResults,
  LeadResultsSkeleton,
} from "./LeadSearchStates";
import type { ActiveIcpSummary } from "./icp-summary";
import type { DiscoveryDefaults } from "./discovery-defaults";

import { STRONG_MATCH_THRESHOLD, isStrongMatch } from "./match-explain";
import type { LeadSearchResult } from "@/features/prospects/services/discovery";

const COMPANY_SIZE_OPTIONS = [
  { value: "", label: "Any size" },
  { value: "1-10", label: "1–10 employees" },
  { value: "11-50", label: "11–50 employees" },
  { value: "51-200", label: "51–200 employees" },
  { value: "201-500", label: "201–500 employees" },
  { value: "501-1000", label: "501–1,000 employees" },
  { value: "1001-5000", label: "1,001–5,000 employees" },
  { value: "5001+", label: "5,000+ employees" },
];

const SORT_OPTIONS = [
  { value: "best-match", label: "Best match" },
  { value: "company-size", label: "Company size" },
  { value: "company-name", label: "Company name (A–Z)" },
];

/** Client-side result views — only views backed by actual result data. */
type ResultFilter = "all" | "strong" | "saved";

const RESULT_FILTERS: { value: ResultFilter; label: string }[] = [
  { value: "all", label: "All results" },
  { value: "strong", label: `Strong matches (${STRONG_MATCH_THRESHOLD}%+)` },
  { value: "saved", label: "Saved" },
];

/** Short-lived client cache so repeat/back-forward requests never re-hit the provider. */
const CACHE_TTL_MS = 90_000;

interface BulkSaveProgress {
  done: number;
  total: number;
  saved: number;
  skipped: number;
  failed: number;
}

// deriveDiscoveryDefaults / DiscoveryDefaults live in the shared server-safe
// module ./discovery-defaults — the server page calls it directly.

interface FindLeadsWorkspaceProps {
  icp: ActiveIcpSummary | null;
  defaults: DiscoveryDefaults;
}


/** Client-side resorting of the loaded page — mirrors the service ordering. */
function sortLocally(leads: ScoredLead[], sortBy: LeadSortOption): ScoredLead[] {
  const sorted = [...leads];
  if (sortBy === "company-size") {
    sorted.sort((a, b) => (b.lead.employeeCount ?? -1) - (a.lead.employeeCount ?? -1));
  } else if (sortBy === "company-name") {
    sorted.sort((a, b) =>
      (a.lead.companyName ?? a.lead.personName ?? "")
        .toLowerCase()
        .localeCompare((b.lead.companyName ?? b.lead.personName ?? "").toLowerCase())
    );
  } else {
    sorted.sort((a, b) => b.match.score - a.match.score);
  }
  return sorted;
}


export function FindLeadsWorkspace({ icp, defaults }: FindLeadsWorkspaceProps) {
  const [form, setForm] = useState({
    keywords: "",
    industry: defaults.industry,
    location: defaults.location,
    companySize: defaults.companySize,
    role: defaults.role,
  });

  // ---- Search state ---------------------------------------------------------
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<ScoredLead[] | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  /** Cursor stack for previous-page support (index = current page). */
  const cursorHistoryRef = useRef<(string | null)[]>([null]);
  const [canGoPrevious, setCanGoPrevious] = useState(false);
  const [sortBy, setSortBy] = useState<LeadSortOption>("best-match");
  const [errorState, setErrorState] = useState<DiscoveryActionError | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [usedIcpDefaults, setUsedIcpDefaults] = useState(false);
  const [savedMap, setSavedMap] = useState<Map<string, SaveState>>(new Map());

  // ---- Phase 3: selection / detail window / result views ---------------------
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [resultFilter, setResultFilter] = useState<ResultFilter>("all");
  const [bulkProgress, setBulkProgress] = useState<BulkSaveProgress | null>(null);
  const [bulkReport, setBulkReport] = useState<BulkSaveProgress | null>(null);

  /** Session cache: org-scoped server-side; key includes all search criteria. */
  const pageCacheRef = useRef<Map<string, { at: number; result: LeadSearchResult }>>(new Map());

  /** Monotonic request id — stale responses are ignored. */
  const requestIdRef = useRef(0);

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function buildRequest(cursor: string | null): LeadSearchRequest {
    const seniority =
      icp?.seniorityLevels?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
    return {
      query: form.keywords.trim() || undefined,
      industries: form.industry.trim() ? [form.industry.trim()] : undefined,
      locations: form.location.trim() ? [form.location.trim()] : undefined,
      companySize: form.companySize || undefined,
      jobTitles: form.role.trim() ? [form.role.trim()] : undefined,
      seniority: seniority.length > 0 ? seniority : undefined,
      icpId: icp?.id,
      sortBy,
      cursor,
      limit: 25,
    };
  }

  const executeSearch = useCallback(
    async (cursor: string | null) => {
      if (isSearching) return; // prevent duplicate simultaneous searches

      const query = form.keywords.trim();
      const industry = form.industry.trim();
      const location = form.location.trim();
      const role = form.role.trim();
      if (!query && !industry && !location && !role) {
        setValidationError(
          "Provide a search query or at least one filter (industry, location, or role) to search."
        );
        return;
      }
      setValidationError(null);
      setErrorState(null);
      setIsSearching(true);

      const thisRequest = ++requestIdRef.current;

      // ---- Duplicate-request prevention -------------------------------------
      // Same criteria + cursor within the TTL is served from the session cache;
      // keys never contain organization data because the server resolves the
      // organization from the authenticated session itself.
      const requestForCache = buildRequest(cursor);
      const cacheKey = `${JSON.stringify({
        query: requestForCache.query ?? null,
        industries: requestForCache.industries ?? null,
        locations: requestForCache.locations ?? null,
        companySize: requestForCache.companySize ?? null,
        jobTitles: requestForCache.jobTitles ?? null,
        seniority: requestForCache.seniority ?? null,
        icpId: requestForCache.icpId ?? null,
        sortBy: requestForCache.sortBy ?? null,
        cursor: requestForCache.cursor ?? null,
      })}`;
      const cached = pageCacheRef.current.get(cacheKey);
      if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
        applyPageResult(cached.result, null, thisRequest);
        return;
      }

      try {
        const { error, result } = await searchMatchingLeadsAction(requestForCache);
        if (!error && result) pageCacheRef.current.set(cacheKey, { at: Date.now(), result });
        applyPageResult(result ?? null, error ?? null, thisRequest);
      } catch {
        if (thisRequest !== requestIdRef.current) return; // stale — ignore
        setErrorState({ code: "UNKNOWN", message: "Something went wrong. Please try again." });
        setResults(null);
      } finally {
        if (thisRequest === requestIdRef.current) setIsSearching(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isSearching, form.keywords, form.industry, form.location, form.companySize, form.role, sortBy]
  );

  /** Applies one provider page to UI state — shared by live and cached paths. */
  function applyPageResult(
    result: LeadSearchResult | null,
    error: DiscoveryActionError | null,
    thisRequest: number
  ) {
    if (thisRequest !== requestIdRef.current) return; // stale — ignore

    if (error || !result) {
      setErrorState(error ?? { code: "UNKNOWN", message: "Search failed. Please try again." });
      setResults(null);
      return;
    }

    setErrorState(null);
    setResults(result.leads);
    setTotal(result.total);
    setNextCursor(result.nextCursor);
    setUsedIcpDefaults(result.usedIcpDefaults);
    setSavedMap((prev) => {
      // Preserve Saved state across pages/searches by dedupe key.
      return prev.size > 0
        ? new Map([...prev].filter(([k]) => result.leads.some((l) => l.dedupeKey === k)))
        : prev;
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    cursorHistoryRef.current = [null];
    setCanGoPrevious(false);
    void executeSearch(null);
  }

  function handleNextPage() {
    if (!nextCursor) return;
    cursorHistoryRef.current.push(nextCursor);
    setCanGoPrevious(true);
    void executeSearch(nextCursor);
  }

  function handlePreviousPage() {
    if (cursorHistoryRef.current.length <= 1) return;
    cursorHistoryRef.current.pop();
    const previous = cursorHistoryRef.current[cursorHistoryRef.current.length - 1];
    setCanGoPrevious(cursorHistoryRef.current.length > 1);
    void executeSearch(previous);
  }

  function broadenSearch() {
    setForm((f) => ({ ...f, companySize: "", location: "" }));
  }

  function handleSortChange(value: LeadSortOption) {
    setSortBy(value);
    setResults((prev) => (prev ? sortLocally(prev, value) : prev));
  }

  async function handleSave(scored: ScoredLead) {
    const key = scored.dedupeKey;
    if (savedMap.get(key) === "saving" || savedMap.get(key) === "saved" || savedMap.get(key) === "already-saved") {
      return; // repeated clicks never create duplicates
    }
    setSavedMap((m) => new Map(m).set(key, "saving"));
    try {
      const res = await saveDiscoveredProspectAction({ lead: scored.lead });
      if (res.status === "failed") {
        setSavedMap((m) => new Map(m).set(key, "failed"));
        return;
      }
      setSavedMap((m) => new Map(m).set(key, res.status === "already-saved" ? "already-saved" : "saved"));
    } catch {
      setSavedMap((m) => new Map(m).set(key, "failed"));
    }
  }

  // ---- Phase 3: selection -----------------------------------------------------
  function toggleSelect(key: string, selected: boolean) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (selected) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function selectVisible() {
    if (!shownResults) return;
    setSelectedKeys(new Set(shownResults.map((s) => s.dedupeKey)));
  }

  function clearSelection() {
    setSelectedKeys(new Set());
    setBulkReport(null);
  }

  /**
   * Bulk save — sequential, duplicate-safe, with real progress and an honest
   * report of saved / skipped / failed records.
   */
  async function bulkSaveSelected() {
    if (!shownResults || selectedKeys.size === 0 || bulkProgress) return;
    const targets = shownResults.filter((s) => selectedKeys.has(s.dedupeKey));
    const progress: BulkSaveProgress = { done: 0, total: targets.length, saved: 0, skipped: 0, failed: 0 };
    setBulkProgress({ ...progress });

    for (const scored of targets) {
      const key = scored.dedupeKey;
      const current = savedMap.get(key);
      try {
        if (current === "saved" || current === "already-saved") {
          progress.skipped += 1; // already in Prospects — never duplicate
        } else {
          setSavedMap((m) => new Map(m).set(key, "saving"));
          const res = await saveDiscoveredProspectAction({ lead: scored.lead });
          if (res.status === "failed") {
            setSavedMap((m) => new Map(m).set(key, "failed"));
            progress.failed += 1;
          } else {
            setSavedMap((m) =>
              new Map(m).set(key, res.status === "already-saved" ? "already-saved" : "saved")
            );
            progress.skipped += res.status === "already-saved" ? 1 : 0;
            progress.saved += res.status === "already-saved" ? 0 : 1;
          }
        }
      } catch {
        setSavedMap((m) => new Map(m).set(key, "failed"));
        progress.failed += 1;
      }
      progress.done += 1;
      setBulkProgress({ ...progress });
    }

    setBulkReport(progress);
    setBulkProgress(null);
  }

  const hasIcpCriteria = (icp?.criteriaCount ?? 0) > 0;
  const sortedResults = useMemo(
    () => (results ? sortLocally(results, sortBy) : null),
    [results, sortBy]
  );

  // ---- Phase 3: summaries + filtered views -----------------------------------
  const strongCount = useMemo(
    () => sortedResults?.filter((s) => isStrongMatch(s.match.score)).length ?? 0,
    [sortedResults]
  );
  const savedCount = useMemo(
    () => sortedResults?.filter((s) => {
      const st = savedMap.get(s.dedupeKey);
      return st === "saved" || st === "already-saved";
    }).length ?? 0,
    [sortedResults, savedMap]
  );
  const shownResults = useMemo(() => {
    if (!sortedResults) return null;
    if (resultFilter === "strong") return sortedResults.filter((s) => isStrongMatch(s.match.score));
    if (resultFilter === "saved")
      return sortedResults.filter((s) => {
        const st = savedMap.get(s.dedupeKey);
        return st === "saved" || st === "already-saved";
      });
    return sortedResults;
  }, [sortedResults, resultFilter, savedMap]);

  // Detail lookup uses the full sorted set so an open window survives filtering.
  const detailLead = useMemo(
    () => sortedResults?.find((s) => s.dedupeKey === detailKey) ?? null,
    [sortedResults, detailKey]
  );

  return (
    <div className="space-y-6">
      {/* ---- Page heading ---------------------------------------------------- */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Find Matching Leads</h1>
        <p className="mt-1 text-sm text-slate-500">
          Find prospects that closely match your ideal customer profile.
        </p>
      </motion.div>

      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
        {/* ---- Active ICP ---------------------------------------------------- */}
        <motion.div variants={fadeUp}>
          <ActiveIcpCard icp={icp} />
        </motion.div>

        {/* ---- Discovery workspace (primary area) ---------------------------- */}
        <motion.div variants={fadeUp}>
          <Card>
            <CardHeader
              title="Find prospects"
              description="Your ICP is prefilled. Adjust the targeting before searching."
              icon={<Search size={18} aria-hidden="true" />}
              action={
                icp && hasIcpCriteria ? (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                    title={`Targeting defaults come from your ${icp.name} ICP`}
                  >
                    <Target size={12} aria-hidden="true" />
                    Using {icp.name}
                  </span>
                ) : null
              }
            />

            <form onSubmit={handleSubmit} className="p-6 pt-5">
              {/* Keywords — visually primary control */}
              <div className="relative">
                <Search
                  size={18}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-[2.35rem] text-slate-400"
                />
                <Input
                  name="keywords"
                  label="Keywords"
                  placeholder="Search companies, roles, or topics..."
                  className="py-3 pl-10 text-base font-medium"
                  value={form.keywords}
                  onChange={(e) => update("keywords", e.target.value)}
                />
              </div>

              {/* Targeting filters — compact wide layout, logically grouped */}
              <div role="group" aria-label="Company filters" className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <p className="sr-only">Company</p>
                <Input
                  name="industry"
                  label="Industry"
                  placeholder="Any industry"
                  value={form.industry}
                  onChange={(e) => update("industry", e.target.value)}
                />

                <Input
                  name="location"
                  label="Location"
                  placeholder="Any location"
                  value={form.location}
                  onChange={(e) => update("location", e.target.value)}
                />

                <Select
                  name="companySize"
                  label="Company size"
                  value={COMPANY_SIZE_OPTIONS.some((o) => o.value === form.companySize) ? form.companySize : ""}
                  onChange={(e) => update("companySize", e.target.value)}
                >
                  {COMPANY_SIZE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div role="group" aria-label="People filters" className="mt-4">
                <p className="sr-only">People</p>
                <Input
                  name="role"
                  label="Role / title focus"
                  placeholder="Any role (used to prioritize matching contacts)"
                  value={form.role}
                  onChange={(e) => update("role", e.target.value)}
                />
              </div>

              {(validationError || errorState?.code === "INVALID_REQUEST") && (
                <p role="alert" className="mt-4 text-sm font-medium text-red-600">
                  {validationError ?? errorState?.message}
                </p>
              )}

              {/* Primary CTA */}
              <div className="mt-6 flex items-center justify-end border-t border-slate-100 pt-5">
                <Button type="submit" size="lg" loading={isSearching} className="px-8">
                  {!isSearching && <Search size={16} aria-hidden="true" />}
                  Find Matching Leads
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>

        {/* ---- Results workspace ------------------------------------------------ */}
        <motion.div variants={fadeUp}>
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Building2 size={18} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-slate-900">
                    {isSearching
                      ? "Finding matching prospects…"
                      : total != null
                        ? `${total.toLocaleString()} matching prospects`
                        : shownResults && shownResults.length > 0
                          ? `${shownResults.length} matching prospects`
                          : shownResults
                            ? "No matching prospects"
                            : "Matching leads"}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {isSearching
                      ? "Searching…"
                      : !shownResults
                        ? "Run a search to discover prospects matching your ICP."
                        : [
                            icp && hasIcpCriteria ? `Based on your ${icp.name} ICP` : null,
                            shownResults.length > 0 && strongCount > 0
                              ? `${strongCount} strong match${strongCount === 1 ? "" : "es"}`
                              : shownResults.length > 0
                                ? "No strong matches on this page yet — try broadening your search"
                                : null,
                            usedIcpDefaults ? `ICP criteria applied` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "\u00A0"}
                  </p>
                </div>
              </div>

              {shownResults && shownResults.length > 0 && !isSearching && (
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {/* Result views — only data-backed filters */}
                  <div role="group" aria-label="Filter results" className="flex rounded-lg border border-slate-200 p-0.5">
                    {RESULT_FILTERS.map((opt) => {
                      const count =
                        opt.value === "strong"
                          ? strongCount
                          : opt.value === "saved"
                            ? savedCount
                            : sortedResults?.length ?? 0;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setResultFilter(opt.value)}
                          aria-pressed={resultFilter === opt.value}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                            resultFilter === opt.value
                              ? "bg-slate-900 text-white"
                              : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                          }`}
                        >
                          {opt.label}
                          <span className="ml-1 tabular-nums opacity-70">{count}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="w-44">
                    <label htmlFor="lead-sort" className="sr-only">Sort results</label>
                    <Select
                    id="lead-sort"
                    name="sortBy"
                    value={sortBy}
                    onChange={(e) => handleSortChange(e.target.value as LeadSortOption)}
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6">
              {validationError && (
                <p role="alert" className="mb-4 text-sm font-medium text-red-600">
                  {validationError}
                </p>
              )}

              {/* Loading — stable skeleton layout, page shell stays visible */}
              {isSearching && <LeadResultsSkeleton />}

              {/* Error */}
              {!isSearching && errorState && results === null && (
                <DiscoveryErrorState
                  code={errorState.code}
                  message={errorState.message}
                  onRetry={() => void executeSearch(cursorHistoryRef.current[cursorHistoryRef.current.length - 1])}
                />
              )}

              {/* Empty */}
              {!isSearching && !errorState && shownResults && shownResults.length === 0 && (
                <EmptyResults onBroaden={broadenSearch} hasIcp={hasIcpCriteria} />
              )}

              {/* Results */}
              {!isSearching && shownResults && shownResults.length > 0 && (
                <>
                  {/* Selection + bulk action bar */}
                  {selectedKeys.size > 0 ? (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50/70 px-4 py-2.5"
                    >
                      <p className="text-sm font-medium text-blue-900" aria-live="polite">
                        {selectedKeys.size} selected
                        {bulkProgress &&
                          ` · Saving ${bulkProgress.done}/${bulkProgress.total}…`}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {bulkReport ? (
                          <p className="text-xs text-blue-800" role="status">
                            {bulkReport.saved} saved
                            {bulkReport.skipped > 0 && ` · ${bulkReport.skipped} skipped (already saved)`}
                            {bulkReport.failed > 0 && ` · ${bulkReport.failed} failed`}
                          </p>
                        ) : null}
                        <Button
                          size="sm"
                          onClick={() => void bulkSaveSelected()}
                          loading={bulkProgress !== null}
                          disabled={bulkProgress !== null}
                        >
                          <ListChecks size={13} aria-hidden="true" />
                          Save selected
                        </Button>
                        <Button size="sm" variant="secondary" onClick={clearSelection}>
                          <X size={13} aria-hidden="true" />
                          Clear selection
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="mb-4 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={selectVisible}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded"
                      >
                        <CheckSquare size={13} aria-hidden="true" />
                        Select visible results
                      </button>
                      {bulkReport && (
                        <p className="text-xs text-slate-500" role="status">
                          Last bulk save: {bulkReport.saved} saved
                          {bulkReport.skipped > 0 && `, ${bulkReport.skipped} skipped`}
                          {bulkReport.failed > 0 && `, ${bulkReport.failed} failed`}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-4">
                    {shownResults.map((scored, i) => (
                      <LeadResultCard
                        key={scored.dedupeKey}
                        scored={scored}
                        index={i}
                        saveState={savedMap.get(scored.dedupeKey) ?? "idle"}
                        onSave={() => void handleSave(scored)}
                        onView={() => setDetailKey(scored.dedupeKey)}
                        selected={selectedKeys.has(scored.dedupeKey)}
                        onToggleSelect={(sel) => toggleSelect(scored.dedupeKey, sel)}
                      />
                    ))}
                  </div>

                  {/* Pagination — cursor-based; state preserved across pages */}
                  <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handlePreviousPage}
                      disabled={!canGoPrevious || isSearching}
                    >
                      <ChevronLeft size={14} aria-hidden="true" />
                      Previous
                    </Button>
                    <span className="text-xs text-slate-400">
                      {total != null
                        ? `Page ${cursorHistoryRef.current.length} of up to ${Math.ceil(total / 25).toLocaleString()}`
                        : `Page ${cursorHistoryRef.current.length}`}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleNextPage}
                      disabled={!nextCursor || isSearching}
                    >
                      Next
                      <ChevronRight size={14} aria-hidden="true" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* Prospect detail minimized window — no page navigation, no minimize "-" */}
      <LeadDetailWindow
        scored={detailLead}
        onClose={() => setDetailKey(null)}
        saveState={detailLead ? (savedMap.get(detailLead.dedupeKey) ?? "idle") : "idle"}
        onSave={() => detailLead && void handleSave(detailLead)}
      />
    </div>
  );
}

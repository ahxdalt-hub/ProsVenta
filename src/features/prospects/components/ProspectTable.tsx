"use client";

import { memo, useCallback, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { AnchoredPopover } from "@/components/ui/AnchoredPopover";
import type { Prospect } from "@/types/database";
import type { ProspectWithScore } from "@/features/prospects/types/prospect";
import type { ProspectSortField, SortOrder } from "@/features/prospects/types/query";
import { StatusBadge, PriorityBadge, TagBadge, IcpScoreBadge, RecommendationIndicator } from "./ProspectBadges";
import { toggleProspectFavoriteAction } from "@/features/prospects/actions/saved-views";

interface ProspectSelection {
  selectedIds: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  allSelected: boolean;
  someSelected: boolean;
}

interface ProspectTableProps {
  prospects: ProspectWithScore[];
  onRowClick: (prospectId: string) => void;
  /**
   * Optional column sorting. The Prospects page no longer uses it (the broken
   * search/filter/sort implementation was removed), but the Saved Lists
   * detail view still relies on client-side sorting over its loaded rows.
   */
  currentSort?: ProspectSortField;
  currentOrder?: SortOrder;
  onSort?: (field: ProspectSortField) => void;
  onToggleFavorite?: (prospectId: string, isFavorite: boolean) => void;
  /** Automatic intelligence job states keyed by prospect id (Stage 5 Task 4). */
  scoreStates?: Record<string, "pending" | "processing" | "failed">;
  onRetryIntelligence?: (prospectId: string) => void;
  /** Row selection state (bulk actions). Optional for backwards safety. */
  selection?: ProspectSelection;
  /** Opens the existing Intelligence action window for this prospect. */
  onEnrich?: (prospectId: string) => void;
  onResearch?: (prospectId: string) => void;
  /** Adds a single prospect to a list via the Save-to-List dialog. */
  onSaveToList?: (prospectId: string) => void;
  /**
   * Optional column configuration (Prospect Database workspace). When omitted
   * every standard column renders — existing pages are unaffected.
   */
  visibleColumns?: ReadonlySet<ProspectSortField>;
}

const columns: { key: ProspectSortField; label: string }[] = [
  { key: "company_name", label: "Company" },
  { key: "industry", label: "Industry" },
  { key: "location", label: "Location" },
  { key: "website", label: "Website" },
  { key: "status", label: "Status" },
  { key: "icp_score", label: "ICP Score" },
  { key: "priority", label: "Priority" },
  { key: "source", label: "Source" },
  { key: "created_at", label: "Created" },
];

/** Every standard column key — the default when no configuration is given. */
export const ALL_PROSPECT_TABLE_COLUMNS: ReadonlySet<ProspectSortField> = new Set(
  columns.map((c) => c.key)
);

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 0 || !words[0]) return "?";
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = [
    "bg-blue-100 text-blue-700",
    "bg-green-100 text-green-700",
    "bg-amber-100 text-amber-700",
    "bg-purple-100 text-purple-700",
    "bg-pink-100 text-pink-700",
    "bg-indigo-100 text-indigo-700",
    "bg-teal-100 text-teal-700",
    "bg-orange-100 text-orange-700",
  ];
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

function getLocation(prospect: Prospect): string {
  const parts = [prospect.city, prospect.country].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  return prospect.location ?? "—";
}

// Optional sort indicator — only rendered when the parent provides onSort
// (Saved Lists detail view). The Prospects page renders plain headers.
function SortIcon({ active, order }: { active: boolean; order?: SortOrder }) {
  if (!active) {
    return (
      <svg className="w-3 h-3 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="8 9 12 5 16 9" />
        <polyline points="8 15 12 19 16 15" />
      </svg>
    );
  }
  return (
    <svg
      className={cn("w-3 h-3 text-blue-500 transition-transform duration-150", order === "desc" && "rotate-180")}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="8 9 12 5 16 9" />
    </svg>
  );
}

// Shared checkbox renderer — one accessible style for header/rows/cards.
function SelectCheckbox({
  checked,
  indeterminate,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      onKeyDown={(e) => e.stopPropagation()}
      className={cn(
        "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        checked || indeterminate
          ? "border-navy-900 bg-navy-900 text-white"
          : "border-slate-300 bg-white hover:border-slate-400"
      )}
    >
      {checked ? (
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : indeterminate ? (
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      ) : null}
    </button>
  );
}

// Memoized row component for performance
const ProspectRow = memo(function ProspectRow({
  prospect,
  index,
  onRowClick,
  onToggleFavorite,
  scoreState,
  onRetryIntelligence,
  selection,
  onEnrich,
  onResearch,
  onSaveToList,
  visibleColumns,
}: {
  prospect: ProspectWithScore;
  index: number;
  onRowClick: (id: string) => void;
  onToggleFavorite?: (id: string, isFavorite: boolean) => void;
  scoreState?: "pending" | "processing" | "failed" | null;
  onRetryIntelligence?: (prospectId: string) => void;
  selection?: ProspectSelection;
  onEnrich?: (prospectId: string) => void;
  onResearch?: (prospectId: string) => void;
  onSaveToList?: (prospectId: string) => void;
  visibleColumns?: ReadonlySet<ProspectSortField>;
}) {
  const companyName = prospect.company_name || prospect.name || "Unknown";
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorite, setIsFavorite] = useState(prospect.is_favorite);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuAnchorRef = useRef<HTMLDivElement>(null);
  const isSelected = selection?.selectedIds.has(prospect.id) ?? false;

  const handleToggleSelect = useCallback(() => {
    selection?.onToggle(prospect.id);
  }, [selection, prospect.id]);

  const menuItems = [
    { label: "View details", action: () => onRowClick(prospect.id) },
    onEnrich ? { label: "Enrich", action: () => onEnrich(prospect.id) } : null,
    onResearch ? { label: "Research", action: () => onResearch(prospect.id) } : null,
    onSaveToList ? { label: "Save to list", action: () => onSaveToList(prospect.id) } : null,
  ].filter((item): item is { label: string; action: () => void } => item !== null);

  const devLabel = `${prospect.company_name ?? prospect.name ?? "Unknown"}`;
  // Column visibility (Prospect Database workspace). Company is always shown;
  // every other standard column can be hidden via the configuration.
  const show = useCallback(
    (key: ProspectSortField) => !visibleColumns || visibleColumns.has(key),
    [visibleColumns]
  );
  // DEV-ONLY: trace the exact id passed to onRowClick (Phase 3 diagnostics).
  const handleClick = useCallback(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("[PROSPECT-ROW] clicked prospect id:", JSON.stringify(prospect.id), "company:", devLabel);
    }
    onRowClick(prospect.id);
  }, [prospect.id, onRowClick, devLabel]);

  const handleToggleFavorite = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const next = !isFavorite;
      setIsFavorite(next);
      if (onToggleFavorite) {
        onToggleFavorite(prospect.id, next);
      } else {
        toggleProspectFavoriteAction(prospect.id, next);
      }
    },
    [isFavorite, prospect.id, onToggleFavorite]
  );

  return (
    <motion.tr
      key={prospect.id}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, delay: Math.min(index * 0.02, 0.2) }}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      tabIndex={0}
      role="button"
      aria-label={`View ${companyName} details`}
      className={cn(
        "group cursor-pointer transition-colors duration-150 hover:bg-blue-50/40 focus-visible:bg-blue-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset",
        isSelected && "bg-blue-50/60"
      )}
    >
      {/* Selection */}
      {selection && (
        <td className="w-10 px-3 py-4">
          <SelectCheckbox
            checked={isSelected}
            onChange={handleToggleSelect}
            label={`Select ${companyName}`}
          />
        </td>
      )}

      {/* Favorite star */}
      <td className="px-3 py-4 w-10">
        <button
          onClick={handleToggleFavorite}
          className={cn(
            "flex items-center justify-center w-7 h-7 rounded-full transition-all duration-150 btn-press",
            isFavorite
              ? "text-amber-500 hover:bg-amber-50"
              : "text-slate-300 hover:text-amber-500 hover:bg-amber-50/50"
          )}
          aria-label={isFavorite ? `Remove ${companyName} from favorites` : `Add ${companyName} to favorites`}
          aria-pressed={isFavorite}
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill={isFavorite ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      </td>

      {/* Company */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className={cn("flex items-center justify-center w-9 h-9 rounded-lg text-xs font-bold shrink-0 transition-transform duration-150", getAvatarColor(companyName), isHovered && "scale-105")}>
            {getInitials(companyName)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-blue-700 transition-colors duration-150">
              {companyName}
            </p>
            {prospect.domain && (
              <p className="text-xs text-slate-400 truncate">{prospect.domain}</p>
            )}
          </div>
        </div>
      </td>

      {/* Industry */}
      {show("industry") && (
      <td className="px-5 py-4">
        <span className="text-sm text-slate-600">
          {prospect.industry ?? "—"}
        </span>
      </td>
      )}

      {/* Location */}
      {show("location") && (
      <td className="px-5 py-4">
        <span className="text-sm text-slate-600">
          {getLocation(prospect)}
        </span>
      </td>
      )}

      {/* Website */}
      {show("website") && (
      <td className="px-5 py-4">
        {prospect.website ? (
          <a
            href={prospect.website}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors duration-150"
          >
            <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            <span className="truncate max-w-[120px]">
              {prospect.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            </span>
          </a>
        ) : (
          <span className="text-sm text-slate-400">—</span>
        )}
      </td>
      )}

      {/* Status */}
      {show("status") && (
      <td className="px-5 py-4">
        <StatusBadge status={prospect.status} />
      </td>
      )}

      {/* ICP Score */}
      {show("icp_score") && (
      <td className="px-5 py-4">
        <div className="flex items-center gap-1.5">
          <IcpScoreBadge
            score={prospect.prospect_scores?.score ?? null}
            category={prospect.prospect_scores?.category ?? null}
            state={
              scoreState === "pending" || scoreState === "processing"
                ? "calculating"
                : scoreState === "failed"
                  ? "failed"
                  : null
            }
            onRetry={onRetryIntelligence ? () => onRetryIntelligence(prospect.id) : undefined}
          />
          <RecommendationIndicator recommendations={prospect.active_recommendations} />
        </div>
      </td>
      )}

      {/* Priority */}
      {show("priority") && (
      <td className="px-5 py-4">
        <PriorityBadge priority={prospect.priority ?? "medium"} />
      </td>
      )}

      {/* Source */}
      {show("source") && (
      <td className="px-5 py-4">
        <span className="text-sm text-slate-500 capitalize">
          {prospect.source}
        </span>
      </td>
      )}

      {/* Created */}
      {show("created_at") && (
      <td className="px-5 py-4">
        <span className="text-sm text-slate-500">
          {formatDate(prospect.created_at)}
        </span>
      </td>
      )}

      {/* Row actions */}
      <td className="w-12 px-2 py-4 text-right">
        <div ref={menuAnchorRef} className="inline-block">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            aria-label={`Actions for ${companyName}`}
            aria-expanded={menuOpen}
            className="rounded-lg p-1.5 text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 opacity-0 group-hover:opacity-100 focus:opacity-100 data-[open=true]:opacity-100"
            data-open={menuOpen}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="5" cy="12" r="1.8" />
              <circle cx="12" cy="12" r="1.8" />
              <circle cx="19" cy="12" r="1.8" />
            </svg>
          </button>
          <AnchoredPopover open={menuOpen} onClose={() => setMenuOpen(false)} anchorRef={menuAnchorRef} width={180}>
            <div role="menu" aria-label={`Actions for ${companyName}`} className="py-1">
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    item.action();
                  }}
                  className="flex w-full items-center px-3.5 py-2 text-left text-sm text-slate-700 transition-colors duration-150 hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </AnchoredPopover>
        </div>
      </td>
    </motion.tr>
  );
});

// Memoized mobile card component
const ProspectMobileCard = memo(function ProspectMobileCard({
  prospect,
  index,
  onRowClick,
  selection,
}: {
  prospect: ProspectWithScore;
  index: number;
  onRowClick: (id: string) => void;
  selection?: ProspectSelection;
}) {
  const companyName = prospect.company_name || prospect.name || "Unknown";
  const isSelected = selection?.selectedIds.has(prospect.id) ?? false;

  return (
    <motion.div
      key={prospect.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, delay: Math.min(index * 0.03, 0.3) }}
      onClick={() => onRowClick(prospect.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onRowClick(prospect.id);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`View ${companyName} details`}
      className={cn(
        "premium-card p-4 cursor-pointer active:scale-[0.99] transition-transform duration-100 hover:border-blue-200 hover:shadow-md",
        isSelected && "border-blue-300 bg-blue-50/40"
      )}
    >
      {/* Top row: select + avatar + company + status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {selection && (
            <SelectCheckbox
              checked={isSelected}
              onChange={() => selection.onToggle(prospect.id)}
              label={`Select ${companyName}`}
            />
          )}
          <div className={cn("flex items-center justify-center w-10 h-10 rounded-lg text-sm font-bold shrink-0", getAvatarColor(companyName))}>
            {getInitials(companyName)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {companyName}
            </p>
            {prospect.domain && (
              <p className="text-xs text-slate-400 truncate">{prospect.domain}</p>
            )}
          </div>
        </div>
        <StatusBadge status={prospect.status} />
      </div>

      {/* Tags — dedupe + drop empty entries; tags can contain duplicates or
          empty strings (imports / legacy rows) which produced duplicate React
          keys (`key={tag}`). */}
      {prospect.tags && prospect.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {Array.from(new Set(prospect.tags.filter((t) => t.trim() !== ""))).slice(0, 3).map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
          {prospect.tags.length > 3 && (
            <span className="text-xs text-slate-400">+{prospect.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Details grid */}
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <p className="text-slate-400">Industry</p>
          <p className="text-slate-700 font-medium truncate">{prospect.industry ?? "—"}</p>
        </div>
        <div>
          <p className="text-slate-400">Location</p>
          <p className="text-slate-700 font-medium truncate">{getLocation(prospect)}</p>
        </div>
        <div>
          <p className="text-slate-400">Priority</p>
          <PriorityBadge priority={prospect.priority ?? "medium"} />
        </div>
        <div>
          <p className="text-slate-400">Source</p>
          <p className="text-slate-700 font-medium capitalize">{prospect.source}</p>
        </div>
        <div>
          <p className="text-slate-400">ICP Score</p>
          <div className="flex items-center gap-1.5">
            <IcpScoreBadge
              score={prospect.prospect_scores?.score ?? null}
              category={prospect.prospect_scores?.category ?? null}
            />
            <RecommendationIndicator recommendations={prospect.active_recommendations} />
          </div>
        </div>
      </div>

      {/* Website link */}
      {prospect.website && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <a
            href={prospect.website}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors duration-150"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            {prospect.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          </a>
        </div>
      )}
    </motion.div>
  );
});

export function ProspectTable({
  prospects,
  onRowClick,
  currentSort,
  currentOrder,
  onSort,
  onToggleFavorite,
  scoreStates,
  onRetryIntelligence,
  selection,
  onEnrich,
  onResearch,
  onSaveToList,
  visibleColumns,
}: ProspectTableProps) {
  const handleRowClick = useCallback((id: string) => onRowClick(id), [onRowClick]);
  // Configurable columns (Prospect Database workspace). Undefined = all shown.
  const activeColumns = useMemo(
    () => (visibleColumns ? columns.filter((c) => visibleColumns.has(c.key)) : columns),
    [visibleColumns]
  );

  return (
    <>
      {/* Desktop Table — the card is the fixed-height region; the inner
          ps-scroll div is the ONLY scroll container (vertical + horizontal),
          so rows never stretch the page and no second page scrollbar appears. */}
      <div className="premium-card overflow-hidden hidden md:flex md:flex-col flex-1 min-h-0">
        <div className="ps-scroll min-h-0 flex-1 overflow-x-auto overflow-y-auto">
          {/* min-width lets narrow viewports scroll horizontally INSIDE this
              container instead of squishing columns or overflowing the page. */}
          <table className="w-full min-w-[1140px]">
            <thead>
              <tr>
                {/* Sticky header: solid bg + border travel with each th so
                    rows scroll cleanly underneath without visual overlap. */}
                {selection && (
                  <th className="sticky top-0 z-10 w-10 border-b border-slate-200 bg-slate-50 px-3 py-3.5">
                    <SelectCheckbox
                      checked={selection.allSelected}
                      indeterminate={selection.someSelected && !selection.allSelected}
                      onChange={selection.onToggleAll}
                      label="Select all prospects on this page"
                    />
                  </th>
                )}
                {activeColumns.map((col) => (
                  <th
                    key={col.key}
                    className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                  >
                    {onSort ? (
                      <button
                        type="button"
                        onClick={() => onSort(col.key)}
                        className="inline-flex items-center gap-1.5 hover:text-slate-700 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none rounded"
                        aria-label={`Sort by ${col.label}`}
                      >
                        {col.label}
                        <SortIcon active={currentSort === col.key || (!currentSort && col.key === "created_at")} order={currentOrder} />
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                ))}
                <th className="sticky top-0 z-10 w-12 border-b border-slate-200 bg-slate-50 px-2 py-3.5" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {prospects.map((prospect, index) => (
                              <ProspectRow
                                key={prospect.id || `fallback-${index}`}
                                prospect={prospect}
                                index={index}
                  onRowClick={handleRowClick}
                  onToggleFavorite={onToggleFavorite}
                  scoreState={scoreStates?.[prospect.id] ?? null}
                  onRetryIntelligence={onRetryIntelligence}
                  selection={selection}
                  onEnrich={onEnrich}
                  onResearch={onResearch}
                  onSaveToList={onSaveToList}
                  visibleColumns={visibleColumns}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {prospects.map((prospect, index) => (
                  <ProspectMobileCard
                    key={prospect.id || `fallback-${index}`}
                    prospect={prospect}
                    index={index}
            onRowClick={handleRowClick}
            selection={selection}
          />
        ))}
      </div>
    </>
  );
}
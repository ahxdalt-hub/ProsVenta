"use client";

import { memo, useCallback, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import type { Prospect } from "@/types/database";
import type { ProspectSortField, SortOrder } from "@/features/prospects/types/query";
import { StatusBadge, PriorityBadge, TagBadge } from "./ProspectBadges";
import { toggleProspectFavoriteAction } from "@/features/prospects/actions/saved-views";

interface ProspectTableProps {
  prospects: Prospect[];
  onRowClick: (prospectId: string) => void;
  currentSort?: ProspectSortField;
  currentOrder?: SortOrder;
  onSort: (field: ProspectSortField) => void;
  onToggleFavorite?: (prospectId: string, isFavorite: boolean) => void;
}

const columns: { key: ProspectSortField; label: string; sortable: boolean }[] = [
  { key: "company_name", label: "Company", sortable: true },
  { key: "industry", label: "Industry", sortable: true },
  { key: "location", label: "Location", sortable: true },
  { key: "website", label: "Website", sortable: true },
  { key: "status", label: "Status", sortable: true },
  { key: "priority", label: "Priority", sortable: true },
  { key: "source", label: "Source", sortable: true },
  { key: "created_at", label: "Created", sortable: true },
];

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

// Memoized row component for performance
const ProspectRow = memo(function ProspectRow({
  prospect,
  index,
  onRowClick,
  onToggleFavorite,
}: {
  prospect: Prospect;
  index: number;
  onRowClick: (id: string) => void;
  onToggleFavorite?: (id: string, isFavorite: boolean) => void;
}) {
  const companyName = prospect.company_name || prospect.name || "Unknown";
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorite, setIsFavorite] = useState(prospect.is_favorite);

  const handleClick = useCallback(() => onRowClick(prospect.id), [prospect.id, onRowClick]);

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
      className="group cursor-pointer transition-colors duration-150 hover:bg-blue-50/40 focus-visible:bg-blue-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset"
    >
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
      <td className="px-5 py-4">
        <span className="text-sm text-slate-600">
          {prospect.industry ?? "—"}
        </span>
      </td>

      {/* Location */}
      <td className="px-5 py-4">
        <span className="text-sm text-slate-600">
          {getLocation(prospect)}
        </span>
      </td>

      {/* Website */}
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

      {/* Status */}
      <td className="px-5 py-4">
        <StatusBadge status={prospect.status} />
      </td>

      {/* Priority */}
      <td className="px-5 py-4">
        <PriorityBadge priority={prospect.priority ?? "medium"} />
      </td>

      {/* Source */}
      <td className="px-5 py-4">
        <span className="text-sm text-slate-500 capitalize">
          {prospect.source}
        </span>
      </td>

      {/* Created */}
      <td className="px-5 py-4">
        <span className="text-sm text-slate-500">
          {formatDate(prospect.created_at)}
        </span>
      </td>
    </motion.tr>
  );
});

// Memoized mobile card component
const ProspectMobileCard = memo(function ProspectMobileCard({
  prospect,
  index,
  onRowClick,
}: {
  prospect: Prospect;
  index: number;
  onRowClick: (id: string) => void;
}) {
  const companyName = prospect.company_name || prospect.name || "Unknown";

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
      className="premium-card p-4 cursor-pointer active:scale-[0.99] transition-transform duration-100 hover:border-blue-200 hover:shadow-md"
    >
      {/* Top row: avatar + company + status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
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

      {/* Tags */}
      {prospect.tags && prospect.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {prospect.tags.slice(0, 3).map((tag) => (
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
}: ProspectTableProps) {
  const handleRowClick = useCallback((id: string) => onRowClick(id), [onRowClick]);

  return (
    <>
      {/* Desktop Table */}
      <div className="premium-card overflow-hidden hidden md:flex md:flex-col flex-1">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="sticky top-0 z-10 bg-slate-50/80 backdrop-blur-sm px-3 py-3.5 w-10" aria-label="Favorite" />
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="sticky top-0 z-10 bg-slate-50/80 backdrop-blur-sm px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                  >
                    {col.sortable ? (
                      <button
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {prospects.map((prospect, index) => (
                <ProspectRow
                  key={prospect.id}
                  prospect={prospect}
                  index={index}
                  onRowClick={handleRowClick}
                  onToggleFavorite={onToggleFavorite}
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
            key={prospect.id}
            prospect={prospect}
            index={index}
            onRowClick={handleRowClick}
          />
        ))}
      </div>
    </>
  );
}
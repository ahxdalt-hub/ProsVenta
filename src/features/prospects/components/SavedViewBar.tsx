"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { SavedView } from "@/types/database";
import type { DefaultView } from "@/features/prospects/types/query";

interface SavedViewBarProps {
  views: SavedView[];
  defaultViews: DefaultView[];
  activeViewId: string | null;
  onSelectView: (viewId: string | null) => void;
  onSaveView: (name: string) => void;
  onRenameView: (viewId: string, name: string) => void;
  onDeleteView: (viewId: string) => void;
  onDuplicateView: (viewId: string) => void;
  onTogglePin: (viewId: string, isPinned: boolean) => void;
  hasUnsavedChanges: boolean;
}

const VIEW_COLORS: Record<string, string> = {
  slate: "bg-slate-500",
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  violet: "bg-violet-500",
  red: "bg-red-500",
  teal: "bg-teal-500",
  indigo: "bg-indigo-500",
};

function ViewIcon({ name }: { name: string }) {
  const common = {
    className: "w-3.5 h-3.5",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "layers":
      return (
        <svg {...common}>
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      );
    case "user":
      return (
        <svg {...common}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case "zap":
      return (
        <svg {...common}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case "star":
      return (
        <svg {...common}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
      );
  }
}

export function SavedViewBar({
  views,
  defaultViews,
  activeViewId,
  onSelectView,
  onSaveView,
  onRenameView,
  onDeleteView,
  onDuplicateView,
  onTogglePin,
  hasUnsavedChanges,
}: SavedViewBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [showViewMenu, setShowViewMenu] = useState<string | null>(null);
  const [renamingView, setRenamingView] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [newViewName, setNewViewName] = useState("");
  const saveMenuRef = useRef<HTMLDivElement>(null);
  const viewMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  const handleOutsideClick = useCallback((e: MouseEvent) => {
    if (saveMenuRef.current && !saveMenuRef.current.contains(e.target as Node)) {
      setShowSaveMenu(false);
    }
    if (viewMenuRef.current && !viewMenuRef.current.contains(e.target as Node)) {
      setShowViewMenu(null);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [handleOutsideClick]);

  const handleSelect = useCallback(
    (viewId: string | null) => {
      setShowViewMenu(null);
      onSelectView(viewId);
    },
    [onSelectView]
  );

  const handleScroll = useCallback((direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = direction === "left" ? -200 : 200;
    el.scrollBy({ left: amount, behavior: "smooth" });
  }, []);

  const handleSaveNewView = useCallback(() => {
    if (newViewName.trim()) {
      onSaveView(newViewName.trim());
      setNewViewName("");
      setShowSaveMenu(false);
    }
  }, [newViewName, onSaveView]);

  const handleRenameSubmit = useCallback(
    (viewId: string) => {
      if (renameValue.trim()) {
        onRenameView(viewId, renameValue.trim());
      }
      setRenamingView(null);
      setRenameValue("");
    },
    [renameValue, onRenameView]
  );

  return (
    <div className="flex items-center gap-2">
      {/* Horizontal scroll container */}
      <div className="flex-1 min-w-0 relative">
        {/* Left fade */}
        <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white to-transparent pointer-events-none z-10" />
        
        <div
          ref={scrollRef}
          className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 px-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {/* Default views */}
          {defaultViews.map((view) => {
            const isActive = activeViewId === view.id;
            return (
              <motion.button
                key={view.id}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleSelect(isActive ? null : view.id)}
                className={cn(
                  "relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                  isActive
                    ? "text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
                aria-pressed={isActive}
                role="tab"
              >
                {isActive && (
                  <motion.span
                    layoutId="view-active-bg"
                    className={cn(
                      "absolute inset-0 rounded-lg",
                      VIEW_COLORS[view.color] ?? "bg-blue-500"
                    )}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  />
                )}
                <span className="relative z-10">
                  <ViewIcon name={view.icon} />
                </span>
                <span className="relative z-10">{view.name}</span>
              </motion.button>
            );
          })}

          {/* Divider between default and saved views */}
          {views.length > 0 && (
            <div className="mx-1.5 w-px h-4 bg-slate-200 shrink-0" />
          )}

          {/* Saved custom views */}
          {views.map((view) => {
            const isActive = activeViewId === view.id;
            return (
              <div key={view.id} className="relative shrink-0">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleSelect(isActive ? null : view.id)}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                    isActive
                      ? "text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                  aria-pressed={isActive}
                  role="tab"
                >
                  {isActive && (
                    <motion.span
                      layoutId="view-active-bg"
                      className={cn(
                        "absolute inset-0 rounded-lg",
                        view.color ? VIEW_COLORS[view.color] ?? "bg-blue-500" : "bg-blue-500"
                      )}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )}
                  {view.is_pinned && (
                    <span className="relative z-10 text-amber-400">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 17v5" />
                        <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1z" />
                      </svg>
                    </span>
                  )}
                  <span className="relative z-10">{view.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowViewMenu(isActive ? null : view.id);
                    }}
                    className={cn(
                      "relative z-10 flex items-center justify-center w-4 h-4 rounded-full transition-colors duration-150",
                      isActive
                        ? "text-white/70 hover:text-white hover:bg-white/20"
                        : "text-slate-300 hover:text-slate-600 hover:bg-slate-200"
                    )}
                    aria-label={`View options for ${view.name}`}
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <circle cx="12" cy="5" r="1.5" />
                      <circle cx="12" cy="12" r="1.5" />
                      <circle cx="12" cy="19" r="1.5" />
                    </svg>
                  </button>
                </motion.button>

                {/* View dropdown menu */}
                <AnimatePresence>
                  {showViewMenu === view.id && (
                    <motion.div
                      ref={viewMenuRef}
                      initial={{ opacity: 0, y: -4, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.97 }}
                      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute left-0 top-full mt-1.5 w-44 rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50 py-1 z-50"
                      role="menu"
                    >
                      <button
                        onClick={() => {
                          setRenamingView(view.id);
                          setRenameValue(view.name);
                          setShowViewMenu(null);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors duration-100"
                        role="menuitem"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Rename
                      </button>
                      <button
                        onClick={() => {
                          onDuplicateView(view.id);
                          setShowViewMenu(null);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors duration-100"
                        role="menuitem"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <rect x="9" y="9" width="13" height="13" rx="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        Duplicate
                      </button>
                      <button
                        onClick={() => {
                          onTogglePin(view.id, !view.is_pinned);
                          setShowViewMenu(null);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors duration-100"
                        role="menuitem"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M12 17v5" />
                          <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1z" />
                        </svg>
                        {view.is_pinned ? "Unpin" : "Pin"}
                      </button>
                      <div className="my-1 h-px bg-slate-100" />
                      <button
                        onClick={() => {
                          onDeleteView(view.id);
                          setShowViewMenu(null);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-100"
                        role="menuitem"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        Delete
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Inline rename input */}
                {renamingView === view.id && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    className="absolute left-0 top-full mt-1.5 w-44 rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50 p-2 z-50"
                  >
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRenameSubmit(view.id);
                        if (e.key === "Escape") setRenamingView(null);
                      }}
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="View name"
                      aria-label="Rename view"
                    />
                  </motion.div>
                )}
              </div>
            );
          })}

          {/* Save current filters as view */}
          <div className="relative shrink-0" ref={saveMenuRef}>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowSaveMenu(!showSaveMenu)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                hasUnsavedChanges
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              )}
              aria-expanded={showSaveMenu}
              aria-label="Save current view"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              <span className="hidden sm:inline">Save View</span>
              {hasUnsavedChanges && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" aria-hidden="true" />
              )}
            </motion.button>

            <AnimatePresence>
              {showSaveMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute right-0 top-full mt-1.5 w-64 rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50 p-2 z-50"
                  role="dialog"
                  aria-label="Save new view"
                >
                  <div className="px-2 pt-1 pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Save current filters
                  </div>
                  <input
                    autoFocus
                    value={newViewName}
                    onChange={(e) => setNewViewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveNewView();
                      if (e.key === "Escape") setShowSaveMenu(false);
                    }}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="View name (e.g. German SaaS)"
                    aria-label="New view name"
                  />
                  <button
                    onClick={handleSaveNewView}
                    disabled={!newViewName.trim()}
                    className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-lg bg-navy-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-navy-800 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Create View
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right fade */}
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white to-transparent pointer-events-none z-10" />
      </div>

      {/* Scroll buttons */}
      <div className="hidden sm:flex items-center gap-1 shrink-0">
        <button
          onClick={() => handleScroll("left")}
          className="flex items-center justify-center w-7 h-7 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all duration-150"
          aria-label="Scroll views left"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button
          onClick={() => handleScroll("right")}
          className="flex items-center justify-center w-7 h-7 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all duration-150"
          aria-label="Scroll views right"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
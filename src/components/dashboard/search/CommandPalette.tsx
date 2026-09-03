"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTheme } from "../settings/ThemeProvider";
import { useRouteTransition } from "@/components/transitions/RouteTransitionProvider";
import { DashboardIcon } from "../navigation/icons";
import { cn } from "@/lib/utils";
import {
  COMMAND_SECTIONS,
  COMMAND_LIST,
  type PaletteCommand,
  type CommandSection,
  scoreCommand,
} from "./command-palette-items";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const { navigate } = useRouteTransition();
  const reduce = useReducedMotion();
  const { reducedMotion } = useTheme();

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  // Platform-aware modifier label for the footer hint (Cmd on macOS, Ctrl elsewhere).
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad|iPod/i.test(navigator.platform ?? ""));
  }, []);
  const shortcutLabel = `${isMac ? "⌘" : "Ctrl"}K`;

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const useReduced = reduce || reducedMotion;

  // Filter commands by score when query present
  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return COMMAND_LIST;
    const scored = COMMAND_LIST.map((c) => ({ c, s: scoreCommand(c, q) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s);
    return scored.map((x) => x.c);
  }, [query]);

  // Group filtered commands by section preserving section order
  const groupedSections = useMemo(() => {
    const map = new Map<CommandSection, PaletteCommand[]>();
    for (const section of COMMAND_SECTIONS) {
      const items = filtered.filter((c) => c.section === section);
      if (items.length > 0) map.set(section, items);
    }
    return Array.from(map.entries());
  }, [filtered]);

  // Reset state on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      // Clear stale item refs
      itemRefs.current = [];
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      // Wait for mount + frame before focusing
      requestAnimationFrame(() => requestAnimationFrame(() => inputRef.current?.focus()));
    }
  }, [open]);

  // Reset selection when filtered list shrinks
  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedIndex(0);
      return;
    }
    if (selectedIndex >= filtered.length) {
      setSelectedIndex(0);
    }
  }, [filtered.length, selectedIndex]);

  // Scroll active item into view
  useEffect(() => {
    const el = itemRefs.current[selectedIndex];
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Restore focus on close
  useEffect(() => {
    if (!open) {
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    }
  }, [open]);

  // Focus trap — keep Tab within the dialog
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(filtered.length, 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + Math.max(filtered.length, 1)) % Math.max(filtered.length, 1));
        return;
      }
      if (e.key === "Home") {
        e.preventDefault();
        setSelectedIndex(0);
        return;
      }
      if (e.key === "End") {
        e.preventDefault();
        setSelectedIndex(Math.max(filtered.length - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        const item = filtered[selectedIndex];
        if (item) {
          e.preventDefault();
          handleNavigate(item);
        }
        return;
      }

      // Focus trap — prevent Tab from leaving
      if (e.key === "Tab") {
        const focusable = panelRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), [href], input');
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtered, selectedIndex, onClose]
  );

  const handleNavigate = useCallback(
    (command: PaletteCommand) => {
      onClose();
      // Small delay for instant palette close before route transition
      setTimeout(() => navigate(command.href), useReduced ? 0 : 40);
    },
    [navigate, onClose, useReduced]
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9998]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={useReduced ? { duration: 0 } : { duration: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Palette panel */}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            aria-describedby="command-palette-description"
            className="absolute inset-x-4 top-[10vh] mx-auto w-full max-w-lg sm:inset-x-6 sm:top-[14vh]"
            initial={useReduced ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 4 }}
            animate={useReduced ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={useReduced ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 4 }}
            transition={useReduced ? { duration: 0 } : { duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            onKeyDown={handleKeyDown}
          >
            <p id="command-palette-description" className="sr-only">
              Search and navigate to pages in your workspace. Use arrow keys to navigate, Enter to select, Escape to close.
            </p>

            <div
              className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/95 shadow-2xl shadow-slate-900/20 backdrop-blur-xl"
              style={{ willChange: "transform, opacity" }}
            >
              {/* ── Search field ─────────────────────────────── */}
              <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5">
                <DashboardIcon
                  name="search"
                  size={17}
                  className="shrink-0 text-slate-400"
                />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search pages, settings, prospects..."
                  className="min-w-0 flex-1 bg-transparent text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  aria-label="Search commands and pages"
                  autoComplete="off"
                  spellCheck={false}
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors duration-100 hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Clear search"
                  >
                    <DashboardIcon name="x" size={13} />
                  </button>
                ) : (
                  <kbd className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-sans text-[10px] font-medium text-slate-400">
                    ESC
                  </kbd>
                )}
              </div>

              {/* ── Result list ──────────────────────────────── */}
              <div
                ref={listRef}
                className="max-h-[46vh] overflow-y-auto overscroll-contain p-2"
                role="listbox"
                aria-label="Results"
              >
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
                    <DashboardIcon name="search" size={28} className="text-slate-300" />
                    <p className="text-sm font-medium text-slate-600">
                      No results for &ldquo;{query}&rdquo;
                    </p>
                    <p className="text-xs text-slate-400">Try a different search term</p>
                  </div>
                ) : (
                  groupedSections.map(([section, commands]) => (
                    <div key={section} role="group" aria-label={section}>
                      <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        {section}
                      </p>
                      <div className="flex flex-col gap-0.5">
                        {commands.map((command) => {
                          const globalIndex = filtered.indexOf(command);
                          const isActive = globalIndex === selectedIndex;
                          return (
                            <button
                              key={command.id}
                              ref={(el) => {
                                itemRefs.current[globalIndex] = el;
                              }}
                              type="button"
                              role="option"
                              aria-selected={isActive}
                              onClick={() => handleNavigate(command)}
                              onMouseEnter={() => setSelectedIndex(globalIndex)}
                              className={cn(
                                "group flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-left transition-colors duration-75",
                                isActive
                                  ? "border-blue-100 bg-blue-50/80"
                                  : "hover:bg-slate-50"
                              )}
                            >
                              <div
                                className={cn(
                                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-75",
                                  isActive
                                    ? "bg-blue-100 text-blue-600"
                                    : "bg-slate-100 text-slate-500 group-hover:bg-slate-200/60 group-hover:text-slate-600"
                                )}
                              >
                                <DashboardIcon name={command.icon} size={15} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className={cn("text-sm font-medium", isActive ? "text-slate-900" : "text-slate-700")}>
                                  {command.label}
                                </p>
                                {command.description && (
                                  <p className="truncate text-xs text-slate-400">
                                    {command.description}
                                  </p>
                                )}
                              </div>
                              {query.trim() && command.keywords && (
                                <span className="hidden items-center gap-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-300 sm:flex">
                                  {command.keywords.slice(0, 2).join(" · ")}
                                </span>
                              )}
                              {isActive && (
                                <DashboardIcon name="chevron-down" size={14} className="shrink-0 -rotate-90 text-blue-500" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* ── Footer hints ─────────────────────────────── */}
              <div className="flex items-center gap-4 border-t border-slate-100 bg-slate-50/50 px-4 py-2.5">
                <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-sans text-[10px] font-medium">↑</kbd>
                  <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-sans text-[10px] font-medium">↓</kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-sans text-[10px] font-medium">↵</kbd>
                  select
                </span>
                <span className="ml-auto flex items-center gap-1.5 text-[11px] text-slate-400">
                  <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-sans text-[10px] font-medium">{shortcutLabel}</kbd>
                  toggle
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
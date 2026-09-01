"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { DashboardIcon } from "@/components/dashboard/navigation/icons";
import {
  getImplementedNavGroups,
  settingsHref,
  type SettingsNavItem,
} from "@/lib/settings/navigation";
import { transitions, EASE_OUT, DURATION } from "@/lib/motion";

// ============================================================================
// SettingsNavigation
// ============================================================================
// Route-based settings navigation driven by the central IA config.
// - Desktop (lg+): persistent sidebar.
// - Mobile / tablet: collapsible disclosure panel above the content —
//   touch-friendly targets, not a squeezed-down sidebar.
// ============================================================================

const NAV_GROUPS = getImplementedNavGroups();

/** Flat list of implemented items, used to resolve the active item. */
const ALL_NAV_ITEMS: SettingsNavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export function SettingsNavigation() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeItem =
    ALL_NAV_ITEMS.find((item) => pathname === settingsHref(item.id)) ?? null;

  // Collapse the mobile panel whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function renderItems() {
    return (
      <nav aria-label="Settings navigation" className="space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.id}>
            <p className="dashboard-nav-group-label">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const href = settingsHref(item.id);
                const isActive = activeItem?.id === item.id;
                return (
                  <Link
                    key={item.id}
                    href={href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "settings-nav-item relative",
                      isActive && "settings-nav-item-active"
                    )}
                  >
                    {/* Animated active indicator */}
                    {isActive && (
                      <motion.span
                        layoutId="settings-nav-active"
                        transition={{ duration: DURATION.base, ease: EASE_OUT }}
                        className="absolute inset-0 rounded-lg bg-slate-100"
                        aria-hidden="true"
                      />
                    )}
                    <span className="settings-nav-icon shrink-0 relative z-10">
                      <DashboardIcon name={item.icon} size={16} />
                    </span>
                    <span className="relative z-10">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    );
  }

  return (
    <>
      {/* Desktop / large tablet: persistent sidebar */}
      <aside className="hidden lg:block lg:sticky lg:top-20 h-fit">
        {renderItems()}
      </aside>

      {/* Mobile / small tablet: collapsible section picker */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-expanded={mobileOpen}
          aria-controls="settings-mobile-nav"
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition-colors duration-150 hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <span className="text-slate-500 shrink-0">
              {activeItem ? <DashboardIcon name={activeItem.icon} size={16} /> : null}
            </span>
            <span className="truncate">
              {activeItem ? activeItem.label : "Settings"}
            </span>
          </span>
          <motion.span
            animate={{ rotate: mobileOpen ? 180 : 0 }}
            transition={transitions.fast}
            className="text-slate-400 shrink-0"
            aria-hidden="true"
          >
            <DashboardIcon name="chevron-down" size={16} />
          </motion.span>
        </button>

        <AnimatePresence initial={false}>
          {mobileOpen && (
            <motion.div
              id="settings-mobile-nav"
              key="panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: DURATION.base, ease: EASE_OUT }}
              className="overflow-hidden"
            >
              <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                {renderItems()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

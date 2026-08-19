"use client";

import { usePathname } from "next/navigation";
import { useEffect, memo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { SidebarContent, ProsventaLogo } from "./sidebar-nav";
import { DashboardIcon } from "../navigation/icons";
import { cn } from "@/lib/utils";
import { transitions } from "@/lib/motion";

/* Desktop sidebar — fixed, visible on lg+ */

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar = memo(function Sidebar({ collapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 50);
    return () => clearTimeout(t);
  }, []);

  const widthClass = collapsed ? "w-[72px]" : "w-64";

  if (reduce) {
    return (
      <aside className={cn("fixed inset-y-0 left-0 z-40 hidden lg:flex", widthClass)}>
        <div className="dashboard-sidebar w-full overflow-hidden">
          <SidebarHeader collapsed={collapsed} onToggleCollapse={onToggleCollapse} />
          <div className="min-h-0 flex-1 overflow-y-auto py-3">
            <SidebarContent pathname={pathname} collapsed={collapsed} />
          </div>
          <SidebarFooter collapsed={collapsed} onToggleCollapse={onToggleCollapse} />
        </div>
      </aside>
    );
  }

  return (
    <motion.aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden lg:flex dashboard-sidebar-transition",
        widthClass
      )}
      initial={{ opacity: 0, x: -8 }}
      animate={entered ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
      transition={transitions.slow}
    >
      <div className="dashboard-sidebar w-full overflow-hidden">
        <SidebarHeader collapsed={collapsed} onToggleCollapse={onToggleCollapse} />
        <div className="min-h-0 flex-1 overflow-y-auto py-3">
          <SidebarContent pathname={pathname} collapsed={collapsed} />
        </div>
        <SidebarFooter collapsed={collapsed} onToggleCollapse={onToggleCollapse} />
      </div>
    </motion.aside>
  );
});

/* Sidebar header — logo + collapse button */

interface SidebarHeaderProps {
  collapsed: boolean;
  onToggleCollapse?: () => void;
}

function SidebarHeader({ collapsed, onToggleCollapse }: SidebarHeaderProps) {
  return (
    <div className="flex h-14 items-center border-b border-slate-200/70 px-3">
      {collapsed ? (
        /* Collapsed: center logo only */
        <div className="flex w-full items-center justify-center">
          <ProsventaLogo />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2.5 overflow-hidden">
            <ProsventaLogo />
            <span className="whitespace-nowrap text-[15px] font-semibold tracking-tight text-slate-900">
              Prosventa
            </span>
          </div>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="dashboard-topbar-btn dashboard-collapse-btn ml-auto"
            aria-label="Collapse sidebar"
            aria-expanded={!collapsed}
            aria-controls="dashboard-sidebar"
            title="Collapse sidebar"
          >
            <DashboardIcon name="panel-left" size={18} />
          </button>
        </>
      )}
    </div>
  );
}

/* Sidebar footer — workspace info (hidden when collapsed) */

function SidebarFooter({ collapsed, onToggleCollapse }: { collapsed: boolean; onToggleCollapse?: () => void }) {
  if (collapsed) {
    return (
      <div className="border-t border-slate-200/70 px-3 py-3">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="dashboard-topbar-btn dashboard-collapse-btn mx-auto flex"
          aria-label="Expand sidebar"
          aria-expanded={!collapsed}
          aria-controls="dashboard-sidebar"
          title="Expand sidebar"
        >
          <DashboardIcon name="panel-left" size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-slate-200/70 px-5 py-4">
      <p className="text-[11px] text-slate-400">
        {new Date().getFullYear()} Prosventa
        <span className="mt-0.5 block font-medium text-slate-500">
          Production Ready
        </span>
      </p>
    </div>
  );
}

/* Mobile drawer — controlled by the shell via [open, setOpen] props */

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  const pathname = usePathname();

  // Close on route change (only when open)
  useEffect(() => {
    if (open) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Lock body scroll & close on Escape — only on mobile viewports
  useEffect(() => {
    if (!open) return;

    // Only lock scroll on mobile (below lg breakpoint)
    const isMobile = window.matchMedia("(max-width: 1023px)").matches;
    if (!isMobile) return;

    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-sm transition-opacity duration-200 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer surface */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Dashboard navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] transform transition-transform duration-250 ease-out lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="dashboard-sidebar w-full overflow-hidden">
          <div className="flex h-14 items-center justify-between border-b border-slate-200/70 px-4">
            <div className="flex items-center gap-2.5">
              <ProsventaLogo />
              <span className="text-[15px] font-semibold tracking-tight text-slate-900">
                Prosventa
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="dashboard-topbar-btn"
              aria-label="Close navigation menu"
            >
              <DashboardIcon name="x" size={18} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto py-3">
            <SidebarContent pathname={pathname} onNavigate={onClose} />
          </div>
          <div className="border-t border-slate-200/70 px-5 py-4">
            <p className="text-[11px] text-slate-400">
              {new Date().getFullYear()} Prosventa
              <span className="mt-0.5 block font-medium text-slate-500">
                Production Ready
              </span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
"use client";

import { useCallback, useEffect, useRef, useState, lazy, Suspense } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Sidebar, MobileDrawer } from "./Sidebar";
import { Topbar } from "./Topbar";
import { CommandPalette } from "../search/CommandPalette";
import { WorkspaceContent } from "@/components/loading/WorkspaceContent";
import { transitions } from "@/lib/motion";
import { useSidebarCollapse } from "./use-sidebar-collapse";
import { useShellData } from "./ShellDataProvider";
import { cn } from "@/lib/utils";
import type { AIQuickAction } from "@/features/assistant";

// Lazy-load the AI Assistant panel so it never blocks the main UI
const AIAssistant = lazy(() =>
  import("@/features/assistant").then((mod) => ({ default: mod.AIAssistant }))
);

interface DashboardShellProps {
  children: React.ReactNode;
  workspaceName: string;
  userEmail: string;
  userName: string;
  avatarUrl: string | null;
  jobRole: string | null;
}

export function DashboardShell({
  children,
  workspaceName,
  userEmail,
  userName,
  avatarUrl,
  jobRole,
}: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [entered, setEntered] = useState(false);
  const searchOpenRef = useRef(false);
  const reduce = useReducedMotion();
  const { collapsed, toggle } = useSidebarCollapse();

  // Shared identity source — Topbar/ProfileMenu read from here so avatar and
  // name updates (Settings uploads) propagate to the shell without a reload.
  const { data: shellData } = useShellData();
  const identityName = shellData.userName ?? userName;
  const identityAvatarUrl = shellData.avatarUrl;

  // Workspace entrance animation
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Keep ref in sync for stable keydown handler
  useEffect(() => {
    searchOpenRef.current = searchOpen;
  }, [searchOpen]);

  // Global keyboard shortcut: Cmd+K / Ctrl+K (toggle), Escape (close)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
        return;
      }
      // Also close on Escape if palette is open
      if (e.key === "Escape" && searchOpenRef.current) {
        setSearchOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleSearchOpen = useCallback(() => setSearchOpen(true), []);
  const handleSearchClose = useCallback(() => setSearchOpen(false), []);
  const handleMobileClose = useCallback(() => setMobileOpen(false), []);
  const handleAssistantOpenChange = useCallback((open: boolean) => {
    setAssistantOpen(open);
  }, []);
  const handleAssistantAction = useCallback((_action: AIQuickAction) => {
    // Future: wire up action handlers (assign, schedule, create task, etc.)
    // Intentionally left empty — actions will be wired in a future phase.
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar (handles its own entrance animation) */}
      <Sidebar collapsed={collapsed} onToggleCollapse={toggle} />

      {/* Mobile drawer */}
      <MobileDrawer open={mobileOpen} onClose={handleMobileClose} />

      {/* Global command palette (Cmd+K) */}
      <CommandPalette open={searchOpen} onClose={handleSearchClose} />

      {/* AI Sales Assistant (lazy-loaded, non-blocking) */}
      <Suspense fallback={null}>
        <AIAssistant
          open={assistantOpen}
          onOpenChange={handleAssistantOpenChange}
          onAction={handleAssistantAction}
        />
      </Suspense>

      {/* Main column — expands when sidebar collapses */}
      <div
        className={cn(
          "dashboard-main-transition",
          collapsed ? "lg:pl-[72px]" : "lg:pl-64"
        )}
      >
        <Topbar
          workspaceName={workspaceName}
          userEmail={userEmail}
          userName={identityName}
          avatarUrl={identityAvatarUrl}
          jobRole={jobRole}
          onMenuOpen={() => setMobileOpen(true)}
          onSearchOpen={handleSearchOpen}
        />

        <main
          id="main-content"
          className="dashboard-canvas mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
        >
          {/* WorkspaceContent wraps the page content so it re-mounts on every
              route change, signaling the overlay that the new page has
              finished rendering beneath it. */}
          <WorkspaceContent>
            {reduce ? (
              children
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={entered ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                transition={transitions.base}
              >
                {children}
              </motion.div>
            )}
          </WorkspaceContent>
        </main>
      </div>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ProsventaLogo } from "./sidebar-nav";
import { DashboardIcon } from "../navigation/icons";
import { ProfileMenu } from "./ProfileMenu";
import { NotificationPopover } from "./NotificationPopover";
import { transitions } from "@/lib/motion";

interface TopbarProps {
  workspaceName: string;
  userEmail: string;
  userName: string;
  avatarUrl: string | null;
  jobRole: string | null;
  onMenuOpen: () => void;
  onSearchOpen: () => void;
}

export function Topbar({ workspaceName, userEmail, userName, avatarUrl, jobRole, onMenuOpen, onSearchOpen }: TopbarProps) {
  const reduce = useReducedMotion();
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 100);
    return () => clearTimeout(t);
  }, []);

  if (reduce) {
    return (
      <header className="dashboard-topbar">
        <button
          type="button"
          onClick={onMenuOpen}
          className="dashboard-topbar-btn lg:hidden"
          aria-label="Open navigation menu"
        >
          <DashboardIcon name="menu" size={18} />
        </button>

        <div className="flex items-center gap-2 lg:hidden">
          <ProsventaLogo />
          <span className="text-sm font-semibold tracking-tight text-slate-900">
            {workspaceName}
          </span>
        </div>

        <span className="hidden text-sm font-medium text-slate-600 lg:inline">
          {workspaceName}
        </span>

        <button
          type="button"
          onClick={onSearchOpen}
          className="ml-auto hidden h-9 w-56 items-center rounded-lg border border-slate-200 bg-slate-50/80 pl-3 pr-2 text-sm text-slate-400 transition-colors duration-150 hover:border-slate-300 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:flex"
          aria-label="Open search (Command K)"
        >
          <DashboardIcon name="search" size={15} className="mr-2 text-slate-400" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-sans text-[10px] font-medium text-slate-400">
            ⌘K
          </kbd>
        </button>

        <button
          type="button"
          onClick={onSearchOpen}
          className="dashboard-topbar-btn sm:hidden"
          aria-label="Open search"
        >
          <DashboardIcon name="search" size={17} />
        </button>

        <NotificationPopover />

        <ProfileMenu
          userName={userName}
          userEmail={userEmail}
          avatarUrl={avatarUrl}
          jobRole={jobRole}
          organizationName={workspaceName}
        />
      </header>
    );
  }

  return (
    <motion.header
      className="dashboard-topbar"
      initial={{ opacity: 0, y: -6 }}
      animate={entered ? { opacity: 1, y: 0 } : { opacity: 0, y: -6 }}
      transition={transitions.fast}
    >
      <button
        type="button"
        onClick={onMenuOpen}
        className="dashboard-topbar-btn lg:hidden"
        aria-label="Open navigation menu"
      >
        <DashboardIcon name="menu" size={18} />
      </button>

      {/* Workspace name (mobile) */}
      <div className="flex items-center gap-2 lg:hidden">
        <ProsventaLogo />
        <span className="text-sm font-semibold tracking-tight text-slate-900">
          {workspaceName}
        </span>
      </div>

      {/* Workspace name (desktop) */}
      <span className="hidden text-sm font-medium text-slate-600 lg:inline">
        {workspaceName}
      </span>

      {/* Search trigger */}
      <button
        type="button"
        onClick={onSearchOpen}
        className="ml-auto hidden h-9 w-56 items-center rounded-lg border border-slate-200 bg-slate-50/80 pl-3 pr-2 text-sm text-slate-400 transition-colors duration-150 hover:border-slate-300 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:flex"
        aria-label="Open search (Command K)"
      >
        <DashboardIcon name="search" size={15} className="mr-2 text-slate-400" />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-sans text-[10px] font-medium text-slate-400">
          ⌘K
        </kbd>
      </button>

      {/* Mobile search icon */}
      <button
        type="button"
        onClick={onSearchOpen}
        className="dashboard-topbar-btn sm:hidden"
        aria-label="Open search"
      >
        <DashboardIcon name="search" size={17} />
      </button>

      {/* Notifications popover */}
      <NotificationPopover />

      {/* User profile menu */}
      <ProfileMenu
        userName={userName}
        userEmail={userEmail}
        avatarUrl={avatarUrl}
        jobRole={jobRole}
        organizationName={workspaceName}
      />
    </motion.header>
  );
}
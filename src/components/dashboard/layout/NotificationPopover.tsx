"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardIcon } from "@/components/dashboard/navigation/icons";
import { EASE_OUT } from "@/lib/motion";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Notification, NotificationType } from "@/types/database";

/**
 * Dropdown animation variants — matches ProfileMenu exactly.
 * Uses only opacity + transform (scale + translateY) for 60 FPS GPU-accelerated animation.
 * - Opening: fade in + scale 0.97 → 1 + slight translate down (200ms)
 * - Closing: smooth fade out (150ms)
 */
const dropdownVariants = {
  hidden: { opacity: 0, scale: 0.97, y: -4 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.2, ease: EASE_OUT },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: -4,
    transition: { duration: 0.15, ease: EASE_OUT },
  },
};

/**
 * Maps a notification type to its destination route.
 * Used when clicking a notification to navigate to the relevant page.
 */
function getNotificationDestination(notification: Notification): string {
  switch (notification.type) {
    case "prospect_assigned":
    case "prospect_mentioned":
    case "prospect_updated":
    case "comment_reply":
      return "/dashboard/prospects";
    case "import_completed":
      return "/dashboard/import";
    case "export_completed":
      return "/dashboard/export";
    case "member_joined":
      return "/dashboard/team";
    case "signal_detected":
      return "/dashboard/prospects";
    case "system_alert":
    default:
      return "/dashboard/notifications";
  }
}

/**
 * Type-based icon mapping with distinct colors for visual scannability.
 */
const TYPE_ICONS: Record<
  NotificationType,
  { icon: React.ReactNode; className: string }
> = {
  prospect_assigned: {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>
    ),
    className: "bg-blue-50 text-blue-600",
  },
  prospect_mentioned: {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
    ),
    className: "bg-violet-50 text-violet-600",
  },
  prospect_updated: {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34" /><polygon points="18 2 22 6 12 16 8 16 8 12 18 2" /></svg>
    ),
    className: "bg-amber-50 text-amber-600",
  },
  comment_reply: {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
    ),
    className: "bg-emerald-50 text-emerald-600",
  },
  import_completed: {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
    ),
    className: "bg-sky-50 text-sky-600",
  },
  export_completed: {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
    ),
    className: "bg-teal-50 text-teal-600",
  },
  member_joined: {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
    ),
    className: "bg-rose-50 text-rose-600",
  },
  system_alert: {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
    ),
    className: "bg-slate-100 text-slate-600",
  },
  signal_detected: {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
    ),
    className: "bg-indigo-50 text-indigo-600",
  },
};

/**
 * Formats a timestamp as a relative string (e.g. "Just now", "5m ago", "3h ago").
 */
function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Formats the unread badge count — shows "99+" when above 99.
 */
function formatBadgeCount(count: number): string {
  return count > 99 ? "99+" : String(count);
}

/**
 * NotificationPopover — premium B2B SaaS notification dropdown.
 *
 * Replaces the previous full-page navigation with a floating popover
 * that matches the ProfileMenu's animation and design language.
 *
 * Features:
 * - Bell button with red unread badge (shows "99+" when above 99)
 * - Animated open/close (opacity + scale + translate, 150–200ms)
 * - Click-outside and Escape-to-close behavior
 * - Type-based icons with distinct colors
 * - Relative timestamps, unread indicators, hover animations
 * - Clicking a notification marks it read and navigates to its destination
 * - Empty state with centered bell illustration
 * - Footer with "Mark all as read" and "View all notifications"
 */
export function NotificationPopover() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // ------------------------------------------------------------------------
  // Fetch notifications + unread count from the browser client
  // ------------------------------------------------------------------------
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [notifResult, countResult] = await Promise.all([
        supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_read", false),
      ]);

      setNotifications((notifResult.data ?? []) as Notification[]);
      setUnreadCount(countResult.count ?? 0);
    } catch {
      // Silently fail — popover will show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount and whenever the popover opens
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // ------------------------------------------------------------------------
  // Close on outside click
  // ------------------------------------------------------------------------
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // ------------------------------------------------------------------------
  // Close on Escape key
  // ------------------------------------------------------------------------
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // ------------------------------------------------------------------------
  // Mark a single notification as read (optimistic update)
  // ------------------------------------------------------------------------
  const handleMarkRead = useCallback(
    async (notification: Notification) => {
      // Optimistically update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
      );
      if (!notification.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      try {
        const supabase = createClient();
        await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("id", notification.id);
      } catch {
        // Revert on failure
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, is_read: notification.is_read } : n
          )
        );
        if (!notification.is_read) {
          setUnreadCount((prev) => prev + 1);
        }
      }
    },
    []
  );

  // ------------------------------------------------------------------------
  // Click a notification — mark read + navigate to destination
  // ------------------------------------------------------------------------
  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      setOpen(false);
      if (!notification.is_read) {
        handleMarkRead(notification);
      }
      router.push(getNotificationDestination(notification));
    },
    [handleMarkRead, router]
  );

  // ------------------------------------------------------------------------
  // Mark all as read (optimistic update)
  // ------------------------------------------------------------------------
  const handleMarkAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id);
    } catch {
      // Revert on failure
      fetchNotifications();
    }
  }, [fetchNotifications]);

  // ------------------------------------------------------------------------
  // Navigate to the full notification center
  // ------------------------------------------------------------------------
  const handleViewAll = useCallback(() => {
    setOpen(false);
    router.push("/dashboard/notifications");
  }, [router]);

  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <div ref={ref} className="relative isolate">
      {/* ================================================================
          Bell Button with Badge
          ================================================================ */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        className={cn(
          "btn-press dashboard-topbar-btn relative",
          open && "bg-slate-100 text-slate-700"
        )}
      >
        <DashboardIcon name="bell" size={17} />

        {/* Unread badge — red, shows count, "99+" when above 99 */}
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white shadow-sm ring-2 ring-white">
            {formatBadgeCount(unreadCount)}
          </span>
        )}
      </button>

      {/* ================================================================
          Dropdown Popover
          ================================================================ */}
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Notifications"
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute right-0 top-full z-50 mt-2 w-[380px] max-w-[calc(100vw-2rem)] origin-top-right overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl ring-1 ring-black/5"
          >
            {/* ----------------------------------------------------------
                Header — title + unread count
                ---------------------------------------------------------- */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-900">
                  Notifications
                </h2>
                {unread > 0 && (
                  <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">
                    {unread} new
                  </span>
                )}
              </div>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-xs font-medium text-blue-600 transition-colors duration-150 hover:text-blue-700 hover:underline focus:outline-none focus-visible:underline"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {/* ----------------------------------------------------------
                Body — notification list or empty state
                ---------------------------------------------------------- */}
            <div className="max-h-[500px] overflow-y-auto overscroll-contain">
              {loading ? (
                /* Loading skeleton */
                <div className="space-y-1 p-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex gap-3 rounded-lg p-3">
                      <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-slate-100" />
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
                        <div className="h-2.5 w-1/2 animate-pulse rounded bg-slate-50" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                /* Empty state — centered bell illustration */
                <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-300">
                    <svg
                      className="h-7 w-7"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    You&rsquo;re all caught up!
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    No new notifications.
                  </p>
                </div>
              ) : (
                /* Notification list */
                <div className="divide-y divide-slate-50 p-1.5">
                  {notifications.map((notification) => {
                    const typeConfig =
                      TYPE_ICONS[notification.type] ?? TYPE_ICONS.system_alert;
                    return (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => handleNotificationClick(notification)}
                        className={cn(
                          "group flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                          notification.is_read
                            ? "hover:bg-slate-50"
                            : "bg-blue-50/40 hover:bg-blue-50"
                        )}
                      >
                        {/* Type icon */}
                        <span
                          className={cn(
                            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform duration-150 group-hover:scale-105",
                            typeConfig.className
                          )}
                        >
                          <span className="h-4 w-4">{typeConfig.icon}</span>
                        </span>

                        {/* Content */}
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-2">
                            <span
                              className={cn(
                                "line-clamp-1 text-sm",
                                notification.is_read
                                  ? "font-medium text-slate-600"
                                  : "font-semibold text-slate-900"
                              )}
                            >
                              {notification.title}
                            </span>
                            {/* Unread indicator */}
                            {!notification.is_read && (
                              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                            )}
                          </span>
                          {notification.body && (
                            <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-slate-500">
                              {notification.body}
                            </span>
                          )}
                          <span className="mt-1.5 block text-[11px] font-medium text-slate-400">
                            {formatRelativeTime(notification.created_at)}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ----------------------------------------------------------
                Footer — view all notifications
                ---------------------------------------------------------- */}
            <div className="border-t border-slate-100 p-1.5">
              <button
                type="button"
                onClick={handleViewAll}
                className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus-visible:bg-slate-50"
              >
                View all notifications
                <DashboardIcon name="chevron-down" size={14} className="-rotate-90 text-slate-400" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
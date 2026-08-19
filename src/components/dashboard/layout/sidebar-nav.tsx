"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { NAV_GROUPS, type NavItem } from "../navigation/config";
import { DashboardIcon } from "../navigation/icons";
import { cn } from "@/lib/utils";
import { useRouteTransition } from "@/components/transitions/RouteTransitionProvider";
import { BrandLogo } from "@/components/branding/BrandLogo";

/* Shared nav link (used by desktop sidebar & mobile drawer) */

interface SidebarNavLinkProps {
  item: NavItem;
  isActive: boolean;
  onNavigate?: () => void;
  collapsed?: boolean;
}

function SidebarNavLink({ item, isActive, onNavigate, collapsed }: SidebarNavLinkProps) {
  const [pressed, setPressed] = useState(false);
  const { navigate, isTransitioning } = useRouteTransition();

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      // Allow cmd/ctrl+click or middle-click for new tab
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;

      e.preventDefault();
      if (isTransitioning) return;

      setPressed(true);
      // Small tactile delay to let the press animation register
      setTimeout(() => {
        onNavigate?.();
        navigate(item.href);
      }, 80);
    },
    [isTransitioning, item.href, navigate, onNavigate]
  );

  // Larger icons when collapsed (16px → 19px, ~19% larger)
  const iconSize = collapsed ? 19 : 16;

  if (item.disabled) {
    return (
      <span
        className={cn(
          "dashboard-nav-item dashboard-nav-item-disabled text-sm",
          collapsed && "dashboard-nav-item-collapsed"
        )}
        aria-disabled="true"
        title={collapsed ? item.label : undefined}
      >
        <DashboardIcon name={item.icon as never} size={iconSize} className="dashboard-nav-icon" />
        <span className={cn("dashboard-nav-label", collapsed && "dashboard-nav-label-hidden")}>
          {item.label}
        </span>
        {!collapsed && (
          <span className="ml-auto text-[10px] font-medium uppercase tracking-wide text-slate-400">
            Soon
          </span>
        )}
        {collapsed && (
          <span className="dashboard-nav-tooltip" role="tooltip">
            {item.label}
          </span>
        )}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      prefetch={true}
      onClick={handleClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setTimeout(() => setPressed(false), 80)}
      onMouseLeave={() => setPressed(false)}
      className={cn(
        "dashboard-nav-item text-sm",
        isActive && "dashboard-nav-item-active",
        pressed && "scale-[0.98]",
        collapsed && "dashboard-nav-item-collapsed"
      )}
      aria-current={isActive ? "page" : undefined}
      title={collapsed ? item.label : undefined}
    >
      {isActive && <span className="dashboard-nav-indicator" aria-hidden="true" />}
      <DashboardIcon name={item.icon as never} size={iconSize} className="dashboard-nav-icon" />
      <span className={cn("dashboard-nav-label", collapsed && "dashboard-nav-label-hidden")}>
        {item.label}
      </span>
      {collapsed && (
        <span className="dashboard-nav-tooltip" role="tooltip">
          {item.label}
        </span>
      )}
    </Link>
  );
}

/* Sidebar content (shared between desktop & mobile) */

interface SidebarContentProps {
  pathname: string;
  onNavigate?: () => void;
  collapsed?: boolean;
}

export function SidebarContent({ pathname, onNavigate, collapsed }: SidebarContentProps) {
  return (
    <nav
      className={cn(
        "flex flex-1 flex-col gap-0.5 px-3 pt-2",
        collapsed && "dashboard-nav-collapsed"
      )}
      aria-label="Dashboard navigation"
    >
      {NAV_GROUPS.map((group, groupIndex) => (
        <div key={group.label}>
          <p
            className={cn(
              "dashboard-nav-group-label",
              collapsed && "dashboard-nav-group-label-hidden"
            )}
          >
            {group.label}
          </p>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <SidebarNavLink
                  key={item.href}
                  item={item}
                  isActive={isActive}
                  onNavigate={onNavigate}
                  collapsed={collapsed}
                />
              );
            })}
          </div>
          {groupIndex < NAV_GROUPS.length - 1 && (
            <div
              className={cn(
                "mt-4 mb-1 border-b border-slate-200/70",
                collapsed ? "mx-2" : "mx-3"
              )}
              aria-hidden="true"
            />
          )}
        </div>
      ))}
    </nav>
  );
}

/* Prosventa logo mark — centralized via BrandLogo */
export function ProsventaLogo() {
  return <BrandLogo size="sm" strokeWidth={2.2} shadow />;
}
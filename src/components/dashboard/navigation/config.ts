import type { FeatureId } from "@/features/entitlement";

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  disabled?: boolean;
  featureId?: FeatureId;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Main",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "dashboard", featureId: "dashboard" },
      { label: "Intelligence", href: "/dashboard/intelligence", icon: "intelligence", featureId: "company_research" },
      { label: "Prospects", href: "/dashboard/prospects", icon: "prospects", featureId: "prospects" },
      { label: "Find Leads", href: "/dashboard/find-leads", icon: "search", featureId: "prospects" },
      { label: "Saved Lists", href: "/dashboard/saved-lists", icon: "lists", featureId: "saved_lists" },
      { label: "Import", href: "/dashboard/import", icon: "import", featureId: "import" },
      { label: "Analytics", href: "/dashboard/analytics", icon: "analytics" },
    ],
  },
  {
    label: "Workspace",
    items: [
      // Members management is contextual inside Organization:
      // no standalone navigation item — the in-page Members window handles
      // all member management. The legacy /dashboard/organization/members
      // route redirects back to /dashboard/organization.
      { label: "Automation", href: "/dashboard/automation", icon: "automation" },
      { label: "Organization", href: "/dashboard/settings?section=workspace", icon: "organization" },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "Settings", href: "/dashboard/settings", icon: "settings" },
      { label: "Help", href: "/dashboard/help", icon: "help" },
    ],
  },
];
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
      { label: "Saved Lists", href: "/dashboard/saved-lists", icon: "lists", featureId: "saved_lists" },
      { label: "Analytics", href: "/dashboard/analytics", icon: "analytics", featureId: "advanced_analytics" },
      { label: "Automation", href: "/dashboard/automation", icon: "automation", featureId: "automation" },
      { label: "Import", href: "/dashboard/import", icon: "import", featureId: "import" },
      { label: "Export", href: "/dashboard/export", icon: "export", featureId: "export" },
    ],
  },
  {
    label: "Team",
    items: [
      { label: "Team Dashboard", href: "/dashboard/team", icon: "members", featureId: "team_collaboration" },
      { label: "Notifications", href: "/dashboard/notifications", icon: "bell" },
    ],
  },
  {
    label: "Workspace",
    items: [
      { label: "Organization", href: "/dashboard/organization", icon: "organization" },
      { label: "Members", href: "/dashboard/organization/members", icon: "members", featureId: "team_collaboration" },
      { label: "Billing", href: "/dashboard/billing", icon: "billing" },
      { label: "Integrations", href: "/dashboard/integrations", icon: "integrations" },
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
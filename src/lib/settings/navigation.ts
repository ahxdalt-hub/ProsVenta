// ============================================================================
// Settings Information Architecture
// ============================================================================
// Single source of truth for the Settings navigation and page metadata.
// Sections whose functionality is not yet implemented are declared here with
// `implemented: false` so later phases can enable them without inventing fake
// controls. The navigation only ever renders implemented sections.
// ============================================================================

import type { IconName } from "@/components/dashboard/navigation/icons";

export type SettingsSectionId =
  | "profile"
  | "workspace"
  | "icp"
  | "ai"
  | "notifications"
| "credits"
  | "plan-billing"
  | "purchases"
  | "security"
  | "sessions"
  | "api"
  | "support";

export interface SettingsNavItem {
  id: SettingsSectionId;
  label: string;
  /** Page title shown in the page header (falls back to label). */
  title?: string;
  description: string;
  /** Shorter copy used on the Settings landing card (falls back to description). */
  landingDescription?: string;
  icon: IconName;
  /**
   * Whether a real settings page exists for this section today.
   * Unimplemented sections are hidden from navigation and their routes 404.
   */
  implemented: boolean;
}

export interface SettingsNavGroup {
  id: string;
  label: string;
  items: SettingsNavItem[];
}

export const SETTINGS_NAV_GROUPS: SettingsNavGroup[] = [
  {
    id: "general",
    label: "General",
    items: [
      {
        id: "profile",
        label: "Profile",
        description: "Manage your personal identity and account details.",
        landingDescription: "Personal identity and account details.",
        icon: "user",
        implemented: true,
      },
      {
        id: "workspace",
        label: "Organization",
        title: "Organization",
        description: "Manage your workspace, team, and organization details.",
        landingDescription: "Workspace, team, and organization details.",
        icon: "organization",
        implemented: true,
      },
    ],
  },
  {
    id: "intelligence",
    label: "Intelligence",
    items: [
      {
        id: "icp",
        label: "ICP",
        title: "Ideal Customer Profile",
        description: "Define who your best customers look like.",
        icon: "target",
        implemented: true,
      },
      {
        id: "ai",
        label: "AI & Intelligence",
        description:
          "Understand and control Prosventa's research, enrichment, signals, and intelligence.",
        landingDescription: "Research, enrichment, signals, and intelligence controls.",
        icon: "sparkles",
        implemented: true,
      },
    ],
  },
  {
    id: "notifications",
    label: "Notifications",
    items: [
      {
        id: "notifications",
        label: "Notifications",
        description: "Choose what Prosventa should keep you informed about.",
        icon: "bell",
        implemented: true,
      },
    ],
  },
  {
    id: "billing",
    label: "Billing",
    items: [
      {
        id: "credits",
        label: "Credits & Usage",
        title: "Credits & Usage",
        description: "Track Credits, usage, and intelligence activity.",
        landingDescription: "Track Credits and intelligence usage.",
        icon: "credits",
        implemented: true,
      },
      {
        id: "plan-billing",
        label: "Plan & Billing",
        description: "Manage your plan and billing settings.",
        landingDescription: "Manage your plan and billing.",
        icon: "billing",
        implemented: true,
      },
      {
        id: "purchases",
        label: "Purchases",
        description: "View your credit purchases and payment history.",
        landingDescription: "View credit purchases and payment history.",
        icon: "receipt",
        implemented: true,
      },
    ],
  },
  {
    id: "security",
    label: "Security",
    items: [
      {
        id: "security",
        label: "Security",
        description: "Protect your account and manage security controls.",
        icon: "shield",
        implemented: true,
      },
      {
        id: "sessions",
        label: "Sessions",
        description:
          "Active sessions and session management where supported by the authentication provider.",
        icon: "clock",
        // Intentionally not implemented: the auth provider does not expose a
        // session list or remote-revocation API, so no honest UI can be built.
        implemented: false,
      },
    ],
  },
  {
    id: "developer",
    label: "Developer",
    items: [
      {
        id: "api",
        label: "API Access",
        description:
          "API access and developer configuration where supported by the backend.",
        icon: "key",
        // Intentionally not implemented: no API key infrastructure exists yet,
        // so no keys can be listed, created, or revoked honestly.
        implemented: false,
      },
    ],
  },
  {
    id: "support",
    label: "Support",
    items: [
      {
        id: "support",
        label: "Help & Support",
        description: "Find answers, troubleshoot issues, and get help.",
        icon: "help",
        implemented: true,
      },
    ],
  },
];

/** All nav items across groups, keyed by section id. */
const ALL_ITEMS = Object.fromEntries(
  SETTINGS_NAV_GROUPS.flatMap((g) => g.items).map((item) => [item.id, item])
) as Record<SettingsSectionId, SettingsNavItem>;

/** Groups filtered down to sections that are actually implemented. */
export function getImplementedNavGroups(): SettingsNavGroup[] {
  return SETTINGS_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.implemented),
  })).filter((group) => group.items.length > 0);
}

/** Look up a section by id. Returns null for unknown ids. */
export function getSettingsSection(id: string): SettingsNavItem | null {
  return (ALL_ITEMS as Record<string, SettingsNavItem>)[id] ?? null;
}

export function isSettingsSectionImplemented(id: string): boolean {
  return getSettingsSection(id)?.implemented ?? false;
}

/** Base href for all settings pages. */
export const SETTINGS_BASE_PATH = "/dashboard/settings";

export function settingsHref(id: SettingsSectionId): string {
  return `${SETTINGS_BASE_PATH}/${id}`;
}

"use client";

import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export type SettingsSection =
  | "profile"
  | "appearance"
  | "notifications"
  | "security"
  | "workspace"
  | "billing"
  | "integrations"
  | "accessibility"
  | "about"
  | "support"
  | "icp";

interface NavItem {
  id: SettingsSection;
  label: string;
  icon: React.ReactNode;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

// ============================================================================
// Navigation Config
// ============================================================================
// Organised like Linear/Stripe/Notion settings:
// Profile → Account → Organization → Preferences → Security
// ============================================================================

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Profile",
    items: [
      {
        id: "profile",
        label: "Profile",
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        ),
      },
      {
        id: "security",
        label: "Security",
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Organization",
    items: [
      {
        id: "workspace",
        label: "Workspace",
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="2" width="16" height="20" rx="2" />
            <path d="M9 22v-4h6v4" />
          </svg>
        ),
      },
      {
        id: "icp",
        label: "Ideal Customer Profile",
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
        ),
      },
      {
        id: "billing",
        label: "Billing",
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
        ),
      },
      {
        id: "integrations",
        label: "Integrations",
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Preferences",
    items: [
      {
        id: "appearance",
        label: "Appearance",
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        ),
      },
      {
        id: "notifications",
        label: "Notifications",
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        ),
      },
      {
        id: "accessibility",
        label: "Accessibility",
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M4.93 4.93l4.24 4.24M14.83 9.17l4.24-4.24M14.83 14.83l4.24 4.24M9.17 14.83l-4.24 4.24" />
            <circle cx="12" cy="12" r="4" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Help & Support",
    items: [
      {
        id: "about",
        label: "About",
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        ),
      },
      {
        id: "support",
        label: "Support",
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        ),
      },
    ],
  },
];

// ============================================================================
// Component
// ============================================================================

interface SettingsNavProps {
  active: SettingsSection;
  onChange: (section: SettingsSection) => void;
}

export function SettingsNav({ active, onChange }: SettingsNavProps) {
  return (
    <nav className="space-y-1" aria-label="Settings navigation">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="dashboard-nav-group-label">{group.label}</p>
          <div className="space-y-0.5">
            {group.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onChange(item.id)}
                aria-current={active === item.id ? "page" : undefined}
                className={cn(
                  "settings-nav-item",
                  active === item.id && "settings-nav-item-active"
                )}
              >
                <span className="settings-nav-icon shrink-0">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
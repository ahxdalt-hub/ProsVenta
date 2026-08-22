"use client";

import { useState, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SettingsNav, type SettingsSection } from "./SettingsNav";
import { ProfileSection } from "./sections/ProfileSection";
import { AppearanceSection } from "./sections/AppearanceSection";
import { NotificationsSection } from "./sections/NotificationsSection";
import { SecuritySection } from "./sections/SecuritySection";
import { AccessibilitySection } from "./sections/AccessibilitySection";
import { AboutSection } from "./sections/AboutSection";
import { SupportSection } from "./sections/SupportSection";
import { IcpSection } from "./sections/IcpSection";
import type { SettingsData } from "@/lib/db/settings";
import type { Organization } from "@/types/database";

// Lazy-load the workspace section (heavier due to form)
const WorkspaceSection = lazy(() =>
  import("./sections/WorkspaceSection").then((m) => ({ default: m.WorkspaceSection }))
);

// ============================================================================
// Section metadata
// ============================================================================

const SECTION_META: Record<SettingsSection, { title: string; description: string }> = {
  profile: {
    title: "Profile",
    description: "Manage your personal information, photo, and identity",
  },
  appearance: {
    title: "Appearance",
    description: "Customize how Prosventa looks and feels for you",
  },
  notifications: {
    title: "Notifications",
    description: "Control which updates we send to your inbox",
  },
  security: {
    title: "Security",
    description: "Protect your account with strong security controls",
  },
  workspace: {
    title: "Workspace",
    description: "Update your organization and workspace details",
  },
  icp: {
    title: "Ideal Customer Profile",
    description: "Define the characteristics of your ideal customer",
  },
  accessibility: {
    title: "Accessibility",
    description: "Adjust the interface to suit your needs",
  },
  about: {
    title: "About",
    description: "Application information, versions, and legal details",
  },
  support: {
    title: "Support",
    description: "Get help and share feedback with the Prosventa team",
  },
};

// ============================================================================
// Props
// ============================================================================

interface SettingsShellProps {
  data: SettingsData;
  organization: Organization | null;
  isOwner: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function SettingsShell({ data, organization, isOwner }: SettingsShellProps) {
  const [active, setActive] = useState<SettingsSection>("profile");
  const meta = SECTION_META[active];

  function renderSection() {
    switch (active) {
      case "profile":
        return <ProfileSection data={data} organizationName={organization?.name ?? null} />;
      case "appearance":
        return <AppearanceSection settings={data.settings} />;
      case "notifications":
        return <NotificationsSection settings={data.settings} />;
      case "security":
        return <SecuritySection data={data} />;
      case "workspace":
        return (
          <Suspense fallback={<SectionSkeleton />}>
            <WorkspaceSection organization={organization} isOwner={isOwner} />
          </Suspense>
        );
      case "icp":
        return <IcpSection />;
      case "accessibility":
        return <AccessibilitySection settings={data.settings} />;
      case "about":
        return <AboutSection />;
      case "support":
        return <SupportSection />;
      default:
        return null;
    }
  }

  return (
    <div className="space-y-8">
      {/* Page title — premium hierarchy */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-slate-900 leading-tight">
          Settings
        </h1>
        <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
          Manage your account, preferences, and workspace configuration.
        </p>
      </motion.div>

      {/* Settings layout: nav + content */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 lg:gap-10">
        {/* Left navigation */}
        <motion.aside
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
          className="lg:sticky lg:top-20 h-fit"
        >
          <SettingsNav active={active} onChange={setActive} />
        </motion.aside>

        {/* Right content */}
        <div className="min-w-0">
          {/* Section header */}
          <motion.div
            key={`${active}-header`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="mb-6"
          >
            <h2 className="text-lg font-semibold tracking-tight text-slate-900 leading-snug">
              {meta.title}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">
              {meta.description}
            </p>
          </motion.div>

          {/* Section content with smooth transition */}
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              {renderSection()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Skeleton
// ============================================================================

function SectionSkeleton() {
  return (
    <div className="space-y-6">
      <div className="premium-card p-6 sm:p-7">
        <div className="premium-skeleton h-6 w-48 mb-5" />
        <div className="premium-skeleton h-10 w-full mb-4" />
        <div className="premium-skeleton h-10 w-full mb-4" />
        <div className="premium-skeleton h-10 w-2/3" />
      </div>
    </div>
  );
}
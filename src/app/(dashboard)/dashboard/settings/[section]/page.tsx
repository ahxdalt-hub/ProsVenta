import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getSettingsSection,
  isSettingsSectionImplemented,
} from "@/lib/settings/navigation";
import { getSettingsData } from "@/lib/db/settings";
import { SettingsPageHeader } from "@/components/dashboard/settings/SettingsPage";
import {
  SettingsShell,
  SettingsPageTransition,
} from "@/components/dashboard/settings/SettingsShell";
import { ProfileSection } from "@/components/dashboard/settings/sections/ProfileSection";
import { NotificationsSection } from "@/components/dashboard/settings/sections/NotificationsSection";
import { SecuritySection } from "@/components/dashboard/settings/sections/SecuritySection";
import { SupportSection } from "@/components/dashboard/settings/sections/SupportSection";
import { IcpSection } from "@/components/dashboard/settings/sections/IcpSection";
import {
  WorkspaceSection,
} from "@/components/dashboard/settings/sections/WorkspaceSection";
import { CreditsSection } from "@/components/dashboard/settings/sections/CreditsSection";
import { PlanBillingSection } from "@/components/dashboard/settings/sections/PlanBillingSection";
import { PurchasesSection } from "@/components/dashboard/settings/sections/PurchasesSection";
import { AiIntelligenceSection } from "@/components/dashboard/settings/sections/AiIntelligenceSection";
import { loadAiIntelligenceViewModel } from "@/lib/db/ai-settings";

interface SettingsSectionPageProps {
  params: Promise<{ section: string }>;
}

/**
 * Routed settings page. Validates the section against the central IA config,
 * fetches only the data the requested section needs, and renders the
 * corresponding (already functional) section component.
 */
export default async function SettingsSectionPage({
  params,
}: SettingsSectionPageProps) {
  const { section: sectionId } = await params;
  const section = getSettingsSection(sectionId);

  if (!section || !isSettingsSectionImplemented(sectionId)) {
    notFound();
  }

  switch (section.id) {
    case "profile":
      // Presentation cleared in Phase 1; rebuilt in Phase 2 on the preserved
      // backend (profile queries, update actions, avatar storage untouched).
      return renderPage(section, <ProfileSection />);
    case "workspace":
      // Organization settings rebuilt in Phase 2 on the preserved backend
      // (queries, actions, RLS untouched). WorkspaceSection fetches its own data.
      return renderPage(section, <WorkspaceSection />);
    case "icp":
      return renderPage(section, <IcpSection />);
    case "ai":
      // AI & Intelligence rebuilt from scratch on real backend state only:
      // provider-derived capability availability + usage-record activity.
      return renderPage(section, (
        <AiIntelligenceSection vm={await loadAiIntelligenceViewModel()} />
      ));
    case "credits":
      return renderPage(section, <CreditsSection />);
    case "plan-billing":
      return renderPage(section, <PlanBillingSection />);
    case "purchases":
      return renderPage(section, <PurchasesSection />);
    case "notifications": {
      const data = await getSettingsData();
      return renderPage(section, <NotificationsSection settings={data.settings} />);
    }
    case "security":
      // Presentation cleared in Phase 1; rebuilt in Phase 2.
      return renderPage(section, <SecuritySection />);
    case "support":
      return renderPage(section, <SupportSection />);
    default:
      notFound();
  }
}

function renderPage(
  section: NonNullable<ReturnType<typeof getSettingsSection>>,
  children: React.ReactNode
) {
  return (
    <SettingsShell>
      <SettingsPageTransition routeKey={section.id}>
        <div className="mb-6 flex items-center gap-2 text-[13px] text-slate-400">
          <Link
            href="/dashboard/settings"
            className="hover:text-slate-600 transition-colors duration-150"
          >
            Settings
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-slate-500 font-medium">{section.label}</span>
        </div>
        <SettingsPageHeader
          title={section.title ?? section.label}
          description={section.description}
        />
        {children}
      </SettingsPageTransition>
    </SettingsShell>
  );
}

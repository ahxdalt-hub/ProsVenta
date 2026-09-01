import { SettingsLanding } from "@/components/dashboard/settings/SettingsLanding";
import { loadProfileViewModel } from "@/components/dashboard/settings/sections/ProfileSection";
import { loadWorkspaceViewModel } from "@/components/dashboard/settings/sections/WorkspaceSection";
import { loadIcpViewModel } from "@/components/dashboard/settings/sections/IcpSection";
import { getSettingsData } from "@/lib/db/settings";
import { loadAiIntelligenceViewModel } from "@/lib/db/ai-settings";

/**
 * /dashboard/settings — wide Settings control center landing page.
 * Category-grouped navigation cards; individual sections live at
 * /dashboard/settings/[section]. Phase 2: ALL implemented sections open their
 * existing content inside a detail panel overlay. Panel data is preloaded
 * here (server-side, on the preserved backend) so no section is fetched twice
 * and no logic is duplicated. Any preload failure degrades that card to its
 * plain link — direct routes always keep working.
 */
export default async function DashboardSettingsIndexPage() {
  // Parallel preload. userSettings powers Notifications; email/emailConfirmed
  // power Security (single getSettingsData call, reused — not duplicated).
  const [profile, workspace, icp, settingsData, ai] = await Promise.allSettled([
    loadProfileViewModel(),
    loadWorkspaceViewModel(),
    loadIcpViewModel(),
    getSettingsData(),
    loadAiIntelligenceViewModel(),
  ]);

  const settings =
    settingsData.status === "fulfilled" ? settingsData.value : null;

  return (
    <SettingsLanding
      panels={{
        profile: profile.status === "fulfilled" ? profile.value : null,
        workspace: workspace.status === "fulfilled" ? workspace.value : null,
        icp: icp.status === "fulfilled" ? icp.value : null,
        userSettings: settings?.settings ?? null,
        ai: ai.status === "fulfilled" ? ai.value : null,
        security: settings
          ? {
              email: settings.email,
              emailConfirmed: settings.emailConfirmed,
            }
          : undefined,
      }}
    />
  );
}


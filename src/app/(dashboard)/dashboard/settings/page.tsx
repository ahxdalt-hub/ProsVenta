import { getSettingsData } from "@/lib/db/settings";
import { getOrganizationDetails } from "@/lib/db/organizations";
import { SettingsShell } from "@/components/dashboard/settings/SettingsShell";

export default async function DashboardSettingsPage() {
  // Fetch settings data and organization details in parallel
  const [settingsData, orgDetails] = await Promise.all([
    getSettingsData(),
    getOrganizationDetails(),
  ]);

  return (
    <SettingsShell
      data={settingsData}
      organization={orgDetails.organization}
      isOwner={orgDetails.isOwner}
    />
  );
}
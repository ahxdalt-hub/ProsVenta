import { createClient } from "@/lib/supabase/server";
import { getDashboardOverview } from "@/lib/db/dashboard";
import { WelcomeSection, QuickActionsSection } from "@/components/dashboard/home/WelcomeQuickActions";
import { OverviewSection } from "@/components/dashboard/home/OverviewSection";
import { ActivitySection } from "@/components/dashboard/home/ActivitySection";
import { GettingStartedSection } from "@/components/dashboard/home/GettingStartedSection";

export default async function DashboardHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, company_name")
    .eq("id", user?.id ?? "")
    .single();

  const overview = await getDashboardOverview();

  const firstName = profile?.full_name?.split(" ")[0] || "there";
  const workspaceName = profile?.company_name || "Prosventa";

  return (
    <div className="space-y-10">
      <WelcomeSection firstName={firstName} workspaceName={workspaceName} />
      <QuickActionsSection />
      <OverviewSection
        prospectCount={overview.prospectCount}
        savedListCount={overview.savedListCount}
        memberCount={overview.memberCount}
      />
      <ActivitySection />
      <GettingStartedSection
        profileComplete={overview.profileComplete}
        hasOrganization={overview.hasOrganization}
        hasProspects={overview.hasProspects}
        hasLists={overview.hasLists}
      />
    </div>
  );
}

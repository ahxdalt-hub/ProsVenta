import { createClient } from "@/lib/supabase/server";
import { getOrganizationDetails, getOrganizationMembers } from "@/lib/db/organizations";
import { getInvitations } from "@/lib/db/collaboration";
import { OrganizationOverview } from "@/components/dashboard/organization/OrganizationOverview";
import type { OrganizationRole } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function DashboardOrganizationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const [details, members, invitations] = await Promise.all([
    getOrganizationDetails(),
    getOrganizationMembers(),
    getInvitations(),
  ]);

  // Get current user's role
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", user.id)
    .single();

  const currentUserRole = membership?.role as OrganizationRole | null;

  return (
    <OrganizationOverview
      details={details}
      members={members}
      invitations={invitations}
      currentUserId={user.id}
      currentUserRole={currentUserRole}
    />
  );
}

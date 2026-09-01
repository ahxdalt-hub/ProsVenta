import { getOrganizationDetails, getOrganizationMembers } from "@/lib/db/organizations";
import { getInvitations } from "@/lib/db/collaboration";
import { OrganizationOverview } from "@/components/dashboard/organization/OrganizationOverview";

export const dynamic = "force-dynamic";

export default async function DashboardOrganizationPage() {
  const [details, members, invitations] = await Promise.all([
    getOrganizationDetails(),
    getOrganizationMembers(),
    getInvitations(),
  ]);

  return (
    <OrganizationOverview
      details={details}
      members={members}
      invitations={invitations}
      currentUserId={details.membership?.user_id ?? null}
      currentUserRole={details.currentUserRole}
    />
  );
}
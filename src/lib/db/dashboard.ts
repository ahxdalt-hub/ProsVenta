"use server";

import { createClient } from "@/lib/supabase/server";
import { getProspectCount } from "@/lib/db/prospects";
import { getSavedListCount } from "@/lib/db/lists";

export interface DashboardOverviewData {
  prospectCount: number;
  savedListCount: number;
  memberCount: number;
  profileComplete: boolean;
  hasOrganization: boolean;
  hasProspects: boolean;
  hasLists: boolean;
  /** True when the workspace has an ICP configuration (powers scoring). */
  hasIcp: boolean;
}

/**
 * Aggregates real workspace metrics for the dashboard home.
 * Uses RLS-protected queries — no fake data.
 */
export async function getDashboardOverview(): Promise<DashboardOverviewData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      prospectCount: 0,
      savedListCount: 0,
      memberCount: 0,
      profileComplete: false,
      hasOrganization: false,
      hasProspects: false,
      hasLists: false,
      hasIcp: false,
    };
  }

  // Profile completeness
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, company_name, industry, company_size, job_role")
    .eq("id", user.id)
    .single();

  const profileComplete = Boolean(
    profile?.full_name &&
      profile?.company_name &&
      profile?.industry &&
      profile?.company_size &&
      profile?.job_role
  );

  // Organization membership
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  const hasOrganization = Boolean(membership?.organization_id);

  // Member count (only if in an organization)
  let memberCount = 0;
  if (membership?.organization_id) {
    const { count } = await supabase
      .from("organization_members")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", membership.organization_id);
    memberCount = count ?? 0;
  }

  // Real counts
  const [prospectCount, savedListCount, icpConfig] = await Promise.all([
    getProspectCount(),
    getSavedListCount(),
    membership?.organization_id
      ? supabase
          .from("icp_configurations")
          .select("id")
          .eq("organization_id", membership.organization_id)
          .maybeSingle()
      : Promise.resolve({ data: null } as { data: unknown }),
  ]);

  return {
    prospectCount,
    savedListCount,
    memberCount,
    profileComplete,
    hasOrganization,
    hasProspects: prospectCount > 0,
    hasLists: savedListCount > 0,
    hasIcp: Boolean((icpConfig as { data: { id: string } | null }).data?.id),
  };
}
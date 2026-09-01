import { getSettingsData } from "@/lib/db/settings";
import { getOrganizationDetails } from "@/lib/db/organizations";
import { ProfileClient } from "./ProfileClient";

/**
 * Serializable props for ProfileClient, produced server-side.
 * Phase 1 detail-panel architecture: loadProfileViewModel() lets
 * /dashboard/settings preload the SAME data for the detail panel, while
 * ProfileClient stays the single interactive implementation (avatar upload,
 * editing, server actions).
 */
export type ProfileViewModel = Parameters<typeof ProfileClient>[0];

/**
 * Loads the profile view model on the preserved backend (profiles table,
 * updateProfileAction, avatar storage actions untouched). Returns null when
 * no profile exists.
 */
export async function loadProfileViewModel(): Promise<ProfileViewModel | null> {
  const [settingsData, orgDetails] = await Promise.all([
    getSettingsData(),
    getOrganizationDetails(),
  ]);

  const profile = settingsData.profile;
  if (!profile) return null;

  return {
    profile: {
      fullName: profile.full_name,
      avatarUrl: profile.avatar_url,
      jobRole: profile.job_role,
      companyName: profile.company_name,
      memberSince: profile.created_at,
    },
    email: settingsData.email,
    workspaceName: orgDetails.organization?.name ?? null,
    role: orgDetails.currentUserRole,
  };
}

export async function ProfileSection() {
  const vm = await loadProfileViewModel();

  if (!vm) {
    return (
      <div className="premium-card p-6 sm:p-7">
        <h3 className="text-[15px] font-semibold tracking-tight text-slate-900">
          Your profile isn&apos;t available right now
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          We couldn&apos;t load your account details. Refresh the page to try
          again - if this keeps happening, reach us from Help &amp; Support.
        </p>
      </div>
    );
  }

  return <ProfileClient {...vm} />;
}
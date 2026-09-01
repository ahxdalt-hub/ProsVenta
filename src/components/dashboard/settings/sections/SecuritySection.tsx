import { getSettingsData } from "@/lib/db/settings";
import { SettingsCard } from "../SettingsCard";
import { SecurityClient } from "./SecurityClient";

// ============================================================================
// SecuritySection - Settings > Security
// ============================================================================
// Phase 2 rebuild: a simple account-protection center built only on what the
// authentication system actually supports - password change (with current
// password re-authentication), global sign-out of all devices, and the real
// email-verification status. No fabricated sessions, scores or controls.
// ============================================================================

export async function SecuritySection() {
  const data = await getSettingsData();

  if (!data.email) {
    return (
      <SettingsCard>
        <h3 className="text-[15px] font-semibold tracking-tight text-slate-900">
          Sign in to manage your security
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Your session has ended. Sign in again to review your account
          protection settings.
        </p>
      </SettingsCard>
    );
  }

  return <SecurityClient email={data.email} emailConfirmed={data.emailConfirmed} />;
}

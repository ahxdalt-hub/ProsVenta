import { redirect } from "next/navigation";

// ============================================================================
// /dashboard/team — legacy standalone Team dashboard
// ============================================================================
// Retired alongside the old settings/organization pages. Redirects to the
// Settings → Organization section so the workspace experience lives in one
// place. Old bookmarks keep working via this redirect.
// ============================================================================

export const dynamic = "force-dynamic";

export default function TeamDashboardPage() {
  redirect("/dashboard/settings?section=workspace");
}

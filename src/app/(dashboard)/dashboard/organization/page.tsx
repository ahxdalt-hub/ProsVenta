import { redirect } from "next/navigation";

// ============================================================================
// /dashboard/organization — legacy standalone Organization page
// ============================================================================
// The Settings rebuild consolidates organization management under the wide
// Settings hub (Settings → Organization). This legacy route is retired: all
// ORIGINAL Organization entry points now deep-link into Settings with the
// section-card highlight. Direct visits to the old URL are redirected so no
// stale bookmarks 404 and no user is stranded.
// ============================================================================

export const dynamic = "force-dynamic";

export default function DashboardOrganizationPage() {
  redirect("/dashboard/settings?section=workspace");
}
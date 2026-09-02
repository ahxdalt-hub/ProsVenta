import { redirect } from "next/navigation";

// ============================================================================
// /dashboard/notifications — legacy standalone Notifications center
// ============================================================================
// Retired so the notifications experience lives under Settings (Settings →
// Notifications). Direct visits to the old page redirect there.
// ============================================================================

export const dynamic = "force-dynamic";

export default function NotificationsPage() {
  redirect("/dashboard/settings?section=notifications");
}

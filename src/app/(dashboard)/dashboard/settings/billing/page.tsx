// ============================================================================
// Billing & Credits — Stage 8 Phase 5 · Settings rebuild Phase 4
// ============================================================================
// The Settings rebuild owns the credits/billing experience under the central
// Settings IA. This legacy entry point now redirects to Settings › Credits &
// Usage. The checkout RETURN route (/dashboard/settings/billing/return) is
// untouched — Stripe success/cancel URLs depend on it.
// ============================================================================

import { redirect } from "next/navigation";
import { settingsHref } from "@/lib/settings/navigation";

export const dynamic = "force-dynamic";

export default function BillingPage() {
  redirect(settingsHref("credits"));
}

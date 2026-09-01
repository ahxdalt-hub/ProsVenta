"use server";

// ============================================================================
// Prosventa Provider Usage Recorder (credits preparation)
// Stage 2 — Phase 8: Real Lead Discovery
// ============================================================================
// Persists one measurable record per provider operation so the future credit
// engine can account for usage. No credits are charged in this phase.
// Organization isolation is enforced by RLS on provider_usage_log.
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import type { ProviderUsageRecord } from "@/features/prospects/types/discovery";

/**
 * Records a provider operation. Failures are logged and swallowed — usage
 * accounting must never break the user-facing discovery flow.
 */
export async function recordProviderUsage(
  usage: ProviderUsageRecord
): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from("provider_usage_log").insert({
      organization_id: usage.organizationId,
      user_id: usage.userId,
      operation: usage.operation,
      provider: usage.provider,
      provider_request_id: usage.providerRequestId,
      estimated_cost: usage.estimatedCost,
      actual_cost: usage.actualCost,
      status: usage.status,
    });
  } catch (error) {
    console.error("[provider-usage] failed to record usage:", error);
  }
}

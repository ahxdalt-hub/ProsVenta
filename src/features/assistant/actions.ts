// ============================================================================
// Prosventa AI Assistant — Workspace Context Action
// ============================================================================
// Server-side data access for the assistant. Reuses the existing RLS-scoped
// prospect query so every assistant answer is grounded in the signed-in
// user's real organization data. No new tables, no new permissions — the
// exact same data access path as the Prospects page.
// ============================================================================

"use server";

import { getProspects } from "@/lib/db/prospects";
import type { AIAssistantInput } from "./types";

/** Compact prospect snapshot consumed by the assistant engine. */
export type AssistantProspectSnapshot = NonNullable<AIAssistantInput["prospects"]>;

// Keep the payload light — the engine only ever surfaces the top handful of
// prospects per response, so a bounded snapshot is plenty.
const MAX_SNAPSHOT_SIZE = 200;

/**
 * Loads a lightweight snapshot of the organization's prospects for the
 * assistant engine. Runs entirely under the caller's Supabase session and
 * RLS policies — identical data access to the Prospects page.
 */
export async function getAssistantWorkspaceContext(): Promise<AssistantProspectSnapshot> {
  const rows = await getProspects();

  return rows.slice(0, MAX_SNAPSHOT_SIZE).map((p) => ({
    id: p.id,
    name: p.name,
    companyName: p.company_name,
    status: p.status,
    priority: p.priority,
    lastContactedAt: p.last_contacted_at,
    contactEmail: p.contact_email,
    leadScore: p.lead_score,
    aiFitScore: p.ai_fit_score,
    buyingIntent: p.buying_intent,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }));
}
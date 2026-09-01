// ============================================================================
// Prosventa Workflow Trigger & Event Engine — DB Layer
// Stage 7 — Phase 2
// ============================================================================
"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  WorkflowEventRecord,
  WorkflowEventStatus,
  WorkflowEventType,
} from "@/features/intelligence/workflows/triggers/types";

/**
 * Inserts an event row. Deduplication happens at the database level via the
 * UNIQUE (organization_id, event_key) constraint: if the same occurrence was
 * already recorded, the existing row is returned instead (outcome "duplicate").
 */
export async function insertWorkflowEvent(input: {
  organizationId: string;
  eventType: WorkflowEventType;
  targetType: string | null;
  targetId: string | null;
  payload: Record<string, unknown>;
  occurredAt: string;
  eventKey: string;
  metadata: Record<string, unknown>;
}): Promise<{ record: WorkflowEventRecord | null; duplicate: boolean; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workflow_events")
    .upsert(
      {
        organization_id: input.organizationId,
        event_type: input.eventType,
        target_type: input.targetType,
        target_id: input.targetId,
        payload: input.payload,
        occurred_at: input.occurredAt,
        event_key: input.eventKey,
        status: "received" as WorkflowEventStatus,
        metadata: input.metadata,
      },
      { onConflict: "organization_id,event_key", ignoreDuplicates: false }
    )
    .select("*")
    .single();

  // Unique violation → already recorded; fetch the existing row.
  if (error) {
    if (error.code === "23505") {
      const { data: existing } = await supabase
        .from("workflow_events")
        .select("*")
        .eq("organization_id", input.organizationId)
        .eq("event_key", input.eventKey)
        .maybeSingle();
      return { record: (existing as WorkflowEventRecord) ?? null, duplicate: true, error: null };
    }
    return { record: null, duplicate: false, error: error.message };
  }

  return { record: data as WorkflowEventRecord, duplicate: false, error: null };
}

export async function updateWorkflowEventStatus(
  eventId: string,
  status: WorkflowEventStatus,
  extra?: { skipReason?: string; processingError?: string }
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("workflow_events")
    .update({
      status,
      skip_reason: extra?.skipReason ?? null,
      processing_error: extra?.processingError ?? null,
      processed_at: new Date().toISOString(),
    })
    .eq("id", eventId);
}

export async function getWorkflowEventById(eventId: string): Promise<WorkflowEventRecord | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workflow_events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();
  return (data as WorkflowEventRecord) ?? null;
}

/** Recent org events for debugging/audit surfaces. */
export async function getRecentWorkflowEvents(limit = 50): Promise<WorkflowEventRecord[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workflow_events")
    .select("*")
    .order("occurred_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as WorkflowEventRecord[];
}

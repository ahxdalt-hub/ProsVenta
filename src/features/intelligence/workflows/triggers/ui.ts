// ============================================================================
// Prosventa Workflow Trigger & Event Engine — UI Support
// Stage 7 — Phase 2
// ============================================================================
// Server-side data for the trigger selector / condition UI. Customers see
// friendly labels ("When: Prospect score changes"), never raw event IDs as
// primary copy. Only enabled events with real producers are offered.
// ============================================================================

import "server-only";
import { getEnabledEventDefinitions } from "./registry";

export interface TriggerSelectorOption {
  /** Raw event ID — stored on the workflow as trigger_type. */
  value: string;
  /** Friendly display copy. */
  label: string;
  description: string;
  conditionFields: Array<{ field: string; label: string }>;
}

export async function getTriggerSelectorOptions(): Promise<TriggerSelectorOption[]> {
  return getEnabledEventDefinitions().map((def) => ({
    value: def.id,
    label: def.label,
    description: def.description,
    conditionFields: def.conditionFields,
  }));
}

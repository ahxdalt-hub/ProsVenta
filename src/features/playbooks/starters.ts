// ============================================================================
// Prosventa Playbook Engine — Starter Playbooks
// Stage 7 — Phase 3
// ============================================================================
// A small set of genuine starter playbooks built ONLY from currently
// operational Phase 1 actions. They are clearly marked as "Starter Playbook" —
// never presented as AI-powered automation, and no outcomes are fabricated.
//
// Starters are seeded per organization as DRAFT: nothing runs automatically
// until a user explicitly activates the playbook.
// ============================================================================

import type { IntelligenceCondition } from "@/features/intelligence/workflows/types";
import type { PlaybookDefinitionInput } from "./types";

export interface StarterPlaybookDefinition extends PlaybookDefinitionInput {
  icon: string;
  steps: NonNullable<PlaybookDefinitionInput["steps"]>;
}

export const STARTER_PLAYBOOKS: StarterPlaybookDefinition[] = [
  {
    name: "New Prospect Review",
    description:
      "Makes sure every new prospect gets an owner's attention: a review task is created and you are notified.",
    category: "new_prospect",
    icon: "👋",
    trigger_type: "prospect.created",
    conditions: [],
    steps: [
      {
        action_type: "create_task",
        title: "Review new prospect",
        description: "Creates a follow-up task so someone reviews this prospect.",
        config: { title: "Review new prospect", priority: "medium" },
      },
      {
        action_type: "create_notification",
        title: "Notify about the new prospect",
        config: { title: "New prospect added", body: "A review task was created for a newly added prospect." },
      },
    ],
  },
  {
    name: "High Intent Review",
    description:
      "When a prospect's ICP score reaches 75 or higher, Prosventa records context on their timeline, creates a follow-up task and notifies you.",
    category: "high_intent",
    icon: "🔥",
    trigger_type: "score_threshold_crossed",
    conditions: [
      { field: "icp_score", operator: "greater_than_or_equal", value: 75 },
    ] satisfies IntelligenceCondition[],
    steps: [
      {
        action_type: "create_internal_note",
        title: "Record high-intent context",
        description: "Adds a note to the prospect's timeline explaining the high intent.",
        config: { note: "High-intent prospect: ICP score crossed 75. Worth reviewing now." },
      },
      {
        action_type: "create_task",
        title: "Follow up on high-intent prospect",
        config: { title: "Follow up on high-intent prospect", priority: "high" },
      },
      {
        action_type: "create_notification",
        title: "Notify about the high-intent prospect",
        config: { title: "High-intent prospect detected", body: "A prospect's ICP score reached 75 or higher." },
      },
    ],
  },
  {
    name: "Priority Recommendation Follow-up",
    description:
      "When a high-priority recommendation is generated, a follow-up task is created and you are notified.",
    category: "follow_up_preparation",
    icon: "🎯",
    trigger_type: "recommendation_priority_high",
    conditions: [],
    steps: [
      {
        action_type: "create_task",
        title: "Act on the recommendation",
        description: "Creates a task to act on this recommendation.",
        config: { title: "Act on high-priority recommendation", priority: "high" },
      },
      {
        action_type: "create_notification",
        title: "Notify about the recommendation",
        config: { title: "New high-priority recommendation", body: "A follow-up task was created for this recommendation." },
      },
    ],
  },
];

// ============================================================================
// Prosventa AI Sales Assistant — Conversation Engine
// Stage 3 — Phase 8: AI-Powered Sales Workspace
// ============================================================================
// Heuristic conversation engine that classifies user intent and generates
// intelligent, context-aware responses. Provider-agnostic — can be swapped
// for an LLM-backed provider later without changing the UI contract.
// ============================================================================

import type {
  AIAssistantInput,
  AIAssistantResponse,
  AIAssistantProvider,
  AIConversationContext,
  AIMessage,
  AIIntent,
  AIProspectSummary,
  AISuggestion,
  AIRiskItem,
  AITimelineSummary,
  AIQuickAction,
  AIQuickActionType,
} from "./types";

// ============================================================================
// Helpers
// ============================================================================

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDays(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? "s" : ""} ago`;
  return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? "s" : ""} ago`;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    new: "New",
    contacted: "Contacted",
    qualified: "Qualified",
    proposal_sent: "Proposal Sent",
    negotiation: "Negotiation",
    won: "Won",
    lost: "Lost",
  };
  return labels[status] ?? status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function priorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
    urgent: "Urgent",
  };
  return labels[priority] ?? priority;
}

// ============================================================================
// Intent Classification
// ============================================================================

function classifyIntent(query: string, context?: AIConversationContext): AIIntent {
  const q = query.toLowerCase().trim();

  // Greeting
  if (/^(hi|hello|hey|good (morning|afternoon|evening))\b/.test(q)) return "greeting";

  // Help
  if (/\b(help|what can you do|how do you work|capabilities)\b/.test(q)) return "help";

  // Summarize prospect
  if (/\b(summarize|summary|overview|brief|recap)\b/.test(q) && /\b(prospect|company|this|them|it)\b/.test(q)) return "summarize_prospect";

  // Explain company
  if (/\b(explain|tell me about|describe|who are|what is)\b/.test(q) && /\b(company|them|this|prospect|business)\b/.test(q)) return "explain_company";

  // Next steps
  if (/\b(next steps?|what should i do|what next|action|move forward|prioritize)\b/.test(q)) return "next_steps";

  // Important info
  if (/\b(important|key|critical|highlight|show me|what matters)\b/.test(q) && /\b(info|information|details|facts|things)\b/.test(q)) return "important_info";

  // Follow-up ideas
  if (/\b(follow[- ]?up|re-?engage|outreach|email ideas|message ideas)\b/.test(q)) return "follow_up_ideas";

  // Highlight risks
  if (/\b(risk|risks|danger|concern|warning|red flag|problem)\b/.test(q)) return "highlight_risks";

  // Timeline summary
  if (/\b(timeline|history|activity|log|events|what happened)\b/.test(q)) return "timeline_summary";

  // Which prospect today
  if (/\b(which|who|what)\b/.test(q) && /\b(prospect|lead|company|account)\b/.test(q) && /\b(today|now|next|should i contact|reach out)\b/.test(q)) return "which_prospect_today";

  // High priority
  if (/\b(high priority|priority|important|top|best)\b/.test(q) && /\b(prospect|lead|company|account|deals?)\b/.test(q)) return "high_priority";

  // Cold leads
  if (/\b(cold|stale|inactive|going cold|getting cold|no activity)\b/.test(q)) return "cold_leads";

  // Not contacted
  if (/\b(not contacted|hasn'?t been contacted|never contacted|no follow[- ]?up|haven'?t reached)\b/.test(q)) return "not_contacted";

  // Recommendations
  if (/\b(recommend|suggest|advice|best action|what should)\b/.test(q)) return "recommendations";

  // To-do
  if (/\b(to[- ]?do|task|todo|create task|add task)\b/.test(q)) return "to_do";

  // Context-aware fallback: if user references "it" or "this" and we have a prospect
  if (context?.lastProspectId && /\b(it|this|them|they|the prospect|the company)\b/.test(q)) {
    return "summarize_prospect";
  }

  return "unknown";
}

// ============================================================================
// Quick Action Builders
// ============================================================================

function buildQuickActions(prospectId: string | null | undefined): AIQuickAction[] {
  const actions: AIQuickAction[] = [
    {
      id: generateId("qa"),
      type: "open_prospect",
      label: "Open Prospect",
      prospectId: prospectId ?? null,
      disabled: !prospectId,
    },
    {
      id: generateId("qa"),
      type: "schedule_followup",
      label: "Schedule Follow-up",
      prospectId: prospectId ?? null,
      disabled: !prospectId,
    },
    {
      id: generateId("qa"),
      type: "create_task",
      label: "Create Task",
      prospectId: prospectId ?? null,
      disabled: !prospectId,
    },
    {
      id: generateId("qa"),
      type: "mark_qualified",
      label: "Mark Qualified",
      prospectId: prospectId ?? null,
      disabled: !prospectId,
    },
    {
      id: generateId("qa"),
      type: "assign",
      label: "Assign",
      prospectId: prospectId ?? null,
      disabled: !prospectId,
    },
  ];
  return actions;
}

// ============================================================================
// Prospect Summary Builder
// ============================================================================

function buildProspectSummary(
  prospect: AIAssistantInput["prospect"],
  notes: AIAssistantInput["notes"]
): AIProspectSummary {
  if (!prospect) {
    return {
      companyOverview: "No prospect selected. Select a prospect to see a detailed summary.",
      industry: null,
      leadQuality: "Unknown",
      importantNotes: [],
      recentActivity: "No activity recorded.",
      suggestedNextStep: "Select a prospect to get started.",
    };
  }

  const companyOverview = `${prospect.companyName} is a prospect in your pipeline.`;
  const leadQuality = prospect.companyName ? "Qualified lead" : "New lead";
  const importantNotes = (notes ?? []).slice(0, 3).map((n) => n.content);
  const recentActivity = notes && notes.length > 0
    ? `Last note added ${formatDays(daysSince(notes[0].createdAt) ?? 0)}.`
    : "No notes recorded yet.";

  const suggestedNextStep = "Follow up with a personalized message to move the conversation forward.";

  return {
    companyOverview,
    industry: null,
    leadQuality,
    importantNotes,
    recentActivity,
    suggestedNextStep,
  };
}

// ============================================================================
// Recommendations Builder
// ============================================================================

function buildRecommendations(
  prospects: AIAssistantInput["prospects"],
  prospect: AIAssistantInput["prospect"]
): AISuggestion[] {
  const suggestions: AISuggestion[] = [];
  const all = prospects ?? [];

  // If we have a specific prospect, generate recommendations for it
  if (prospect) {
    const p = all.find((x) => x.id === prospect.id);
    if (p) {
      const days = daysSince(p.lastContactedAt);
      if (days === null) {
        suggestions.push({
          id: generateId("sug"),
          title: "Send Intro Email",
          description: `${p.companyName} hasn't been contacted yet. Introduce your platform with a personalized value statement.`,
          priority: "high",
          action: "send_email",
          prospectId: p.id,
        });
      } else if (days >= 14) {
        suggestions.push({
          id: generateId("sug"),
          title: "Re-engage Prospect",
          description: `${p.companyName} hasn't been contacted in ${formatDays(days)}. A value-driven follow-up could restart the conversation.`,
          priority: "high",
          action: "schedule_followup",
          prospectId: p.id,
        });
      } else {
        suggestions.push({
          id: generateId("sug"),
          title: "Schedule Demo",
          description: `${p.companyName} was recently engaged. Book a live walkthrough while interest is fresh.`,
          priority: "medium",
          action: "schedule_followup",
          prospectId: p.id,
        });
      }

      if (!p.contactEmail) {
        suggestions.push({
          id: generateId("sug"),
          title: "Find Contact Email",
          description: `No email on file for ${p.companyName}. Research the decision maker to enable outreach.`,
          priority: "medium",
          action: "research",
          prospectId: p.id,
        });
      }

      if (p.status === "qualified" || p.status === "proposal_sent") {
        suggestions.push({
          id: generateId("sug"),
          title: "Accelerate Deal",
          description: `${p.companyName} is in ${statusLabel(p.status)} stage. Push for a decision or next milestone.`,
          priority: "high",
          action: "mark_qualified",
          prospectId: p.id,
        });
      }
    }
  }

  // Pipeline-wide recommendations
  if (all.length > 0) {
    const cold = all.filter((p) => {
      const days = daysSince(p.lastContactedAt);
      return days !== null && days >= 14;
    });
    if (cold.length > 0) {
      suggestions.push({
        id: generateId("sug"),
        title: `${cold.length} Cold Prospect${cold.length > 1 ? "s" : ""}`,
        description: `${cold.slice(0, 3).map((p) => p.companyName).join(", ")} ${cold.length > 3 ? "and more" : ""} haven't been contacted in 14+ days.`,
        priority: "high",
        action: "schedule_followup",
      });
    }

    const highIntent = all.filter((p) => p.buyingIntent === "high" && p.status !== "won");
    if (highIntent.length > 0) {
      suggestions.push({
        id: generateId("sug"),
        title: `${highIntent.length} High-Intent Prospect${highIntent.length > 1 ? "s" : ""}`,
        description: `${highIntent.slice(0, 3).map((p) => p.companyName).join(", ")} show strong buying signals. Prioritize outreach.`,
        priority: "high",
        action: "call",
      });
    }
  }

  return suggestions.slice(0, 5);
}

// ============================================================================
// Risk Detection Builder
// ============================================================================

function buildRisks(
  prospects: AIAssistantInput["prospects"],
  prospect: AIAssistantInput["prospect"]
): AIRiskItem[] {
  const risks: AIRiskItem[] = [];
  const all = prospects ?? [];

  if (prospect) {
    const p = all.find((x) => x.id === prospect.id);
    if (p) {
      if (!p.contactEmail) {
        risks.push({
          id: generateId("risk"),
          title: "Missing Contact Email",
          description: `${p.companyName} has no email on file, making outreach difficult.`,
          severity: "high",
        });
      }

      const days = daysSince(p.lastContactedAt);
      if (days !== null && days >= 14) {
        risks.push({
          id: generateId("risk"),
          title: "Inactive Prospect",
          description: `${p.companyName} hasn't been contacted in ${formatDays(days)}. The lead may be going cold.`,
          severity: "high",
        });
      }

      if (p.status === "new" && days === null) {
        risks.push({
          id: generateId("risk"),
          title: "Unengaged Lead",
          description: `${p.companyName} has never been contacted. Early outreach is critical.`,
          severity: "medium",
        });
      }
    }
  }

  // Pipeline-wide risks
  if (all.length > 0) {
    const missingEmail = all.filter((p) => !p.contactEmail);
    if (missingEmail.length > 0) {
      risks.push({
        id: generateId("risk"),
        title: `${missingEmail.length} Prospect${missingEmail.length > 1 ? "s" : ""} Missing Email`,
        description: `${missingEmail.slice(0, 3).map((p) => p.companyName).join(", ")} ${missingEmail.length > 3 ? "and more" : ""} lack contact emails.`,
        severity: "medium",
      });
    }

    const inactive = all.filter((p) => {
      const d = daysSince(p.lastContactedAt);
      return d !== null && d >= 14;
    });
    if (inactive.length > 0) {
      risks.push({
        id: generateId("risk"),
        title: `${inactive.length} Stale Lead${inactive.length > 1 ? "s" : ""}`,
        description: `${inactive.length} prospect${inactive.length > 1 ? "s" : ""} haven't been contacted in 14+ days.`,
        severity: "high",
      });
    }
  }

  return risks.slice(0, 4);
}

// ============================================================================
// Timeline Summary Builder
// ============================================================================

function buildTimelineSummary(
  prospect: AIAssistantInput["prospect"],
  notes: AIAssistantInput["notes"]
): AITimelineSummary {
  const events = (notes ?? []).map((n) => ({
    date: n.createdAt,
    type: "note",
    description: n.content,
  }));

  const text = events.length === 0
    ? "No activity recorded for this prospect yet."
    : events.length === 1
      ? "Prospect has one recorded activity."
      : `Prospect has ${events.length} recorded activities.`;

  return { text, events };
}

// ============================================================================
// Response Builders per Intent
// ============================================================================

function buildGreetingResponse(): AIMessage {
  return {
    id: generateId("msg"),
    role: "assistant",
    type: "text",
    content:
      "Hi! I'm your AI Sales Assistant. I can help you summarize prospects, identify risks, generate follow-up ideas, and prioritize your pipeline. Try asking:\n\n• \"Summarize this prospect\"\n• \"Which prospect should I contact today?\"\n• \"Show me high priority companies\"\n• \"Which leads are getting cold?\"",
    timestamp: new Date().toISOString(),
    actions: [
      { id: generateId("qa"), type: "create_task", label: "Create Task" },
      { id: generateId("qa"), type: "research", label: "Research" },
    ],
  };
}

function buildHelpResponse(): AIMessage {
  return {
    id: generateId("msg"),
    role: "assistant",
    type: "text",
    content:
      "Here's what I can help you with:\n\n• **Summarize** — Get a concise overview of any prospect\n• **Explain** — Understand a company's profile and context\n• **Next Steps** — Get actionable recommendations\n• **Risks** — Identify potential issues in your pipeline\n• **Timeline** — Summarize activity history\n• **Prioritize** — Find high-priority or cold leads\n\nJust ask in natural language and I'll do the rest.",
    timestamp: new Date().toISOString(),
    actions: [
      { id: generateId("qa"), type: "create_task", label: "Create Task" },
      { id: generateId("qa"), type: "research", label: "Research" },
    ],
  };
}

function buildSummarizeResponse(
  input: AIAssistantInput
): AIMessage {
  const { prospect, notes } = input;
  const summary = buildProspectSummary(prospect, notes);

  return {
    id: generateId("msg"),
    role: "assistant",
    type: "summary",
    content: prospect
      ? `Here's a summary of ${prospect.companyName}:`
      : "Select a prospect to see a detailed summary.",
    summary,
    timestamp: new Date().toISOString(),
    prospectId: prospect?.id ?? null,
    actions: buildQuickActions(prospect?.id),
  };
}

function buildExplainCompanyResponse(
  input: AIAssistantInput
): AIMessage {
  const { prospect } = input;
  if (!prospect) {
    return {
      id: generateId("msg"),
      role: "assistant",
      type: "text",
      content: "Select a prospect to learn more about their company.",
      timestamp: new Date().toISOString(),
      actions: buildQuickActions(null),
    };
  }

  return {
    id: generateId("msg"),
    role: "assistant",
    type: "text",
    content: `${prospect.companyName} is a company in your pipeline. Based on available data, it appears to be a ${prospect.companyName ? "B2B" : "unknown"} organization. I recommend reviewing the full prospect profile for more details on industry, size, and engagement signals.`,
    timestamp: new Date().toISOString(),
    prospectId: prospect.id,
    actions: buildQuickActions(prospect.id),
  };
}

function buildNextStepsResponse(
  input: AIAssistantInput
): AIMessage {
  const { prospect, prospects } = input;
  const suggestions = buildRecommendations(prospects, prospect);

  return {
    id: generateId("msg"),
    role: "assistant",
    type: "recommendations",
    content: prospect
      ? `Here are my recommended next steps for ${prospect.companyName}:`
      : "Here are my recommended next steps for your pipeline:",
    suggestions,
    timestamp: new Date().toISOString(),
    prospectId: prospect?.id ?? null,
    actions: buildQuickActions(prospect?.id),
  };
}

function buildImportantInfoResponse(
  input: AIAssistantInput
): AIMessage {
  const { prospect, prospects } = input;
  const p = prospect ? (prospects ?? []).find((x) => x.id === prospect.id) : null;

  if (!p) {
    return {
      id: generateId("msg"),
      role: "assistant",
      type: "text",
      content: "Select a prospect to see their key information.",
      timestamp: new Date().toISOString(),
      actions: buildQuickActions(null),
    };
  }

  const days = daysSince(p.lastContactedAt);
  const infoLines = [
    `**${p.companyName}** — ${statusLabel(p.status)}`,
    `Priority: ${priorityLabel(p.priority)}`,
    p.leadScore !== null ? `Lead Score: ${p.leadScore}/100` : "Lead Score: Not scored",
    p.aiFitScore !== null ? `Fit Score: ${p.aiFitScore}/100` : "Fit Score: Not scored",
    `Buying Intent: ${p.buyingIntent.charAt(0).toUpperCase() + p.buyingIntent.slice(1)}`,
    p.contactEmail ? `Contact: ${p.contactEmail}` : "Contact: No email on file",
    days !== null ? `Last Contacted: ${formatDays(days)}` : "Last Contacted: Never",
  ];

  return {
    id: generateId("msg"),
    role: "assistant",
    type: "text",
    content: `Here are the key details for ${p.companyName}:\n\n${infoLines.join("\n")}`,
    timestamp: new Date().toISOString(),
    prospectId: p.id,
    actions: buildQuickActions(p.id),
  };
}

function buildFollowUpIdeasResponse(
  input: AIAssistantInput
): AIMessage {
  const { prospect, prospects } = input;
  const p = prospect ? (prospects ?? []).find((x) => x.id === prospect.id) : null;

  const ideas = [
    {
      id: generateId("idea"),
      title: "Value-Driven Check-In",
      description: "Share a relevant industry insight or case study that addresses their specific pain points.",
      priority: "high" as const,
      action: "send_email" as AIQuickActionType,
      prospectId: p?.id ?? null,
    },
    {
      id: generateId("idea"),
      title: "Personalized Demo Invite",
      description: "Offer a tailored walkthrough focused on their use case to demonstrate immediate value.",
      priority: "medium" as const,
      action: "schedule_followup" as AIQuickActionType,
      prospectId: p?.id ?? null,
    },
    {
      id: generateId("idea"),
      title: "Decision-Maker Research",
      description: "Identify the economic buyer and map the internal champion before your next touchpoint.",
      priority: "medium" as const,
      action: "research" as AIQuickActionType,
      prospectId: p?.id ?? null,
    },
  ];

  return {
    id: generateId("msg"),
    role: "assistant",
    type: "suggestions",
    content: p
      ? `Here are some follow-up ideas for ${p.companyName}:`
      : "Here are some follow-up ideas for your prospects:",
    suggestions: ideas,
    timestamp: new Date().toISOString(),
    prospectId: p?.id ?? null,
    actions: buildQuickActions(p?.id),
  };
}

function buildRisksResponse(
  input: AIAssistantInput
): AIMessage {
  const { prospect, prospects } = input;
  const risks = buildRisks(prospects, prospect);

  return {
    id: generateId("msg"),
    role: "assistant",
    type: "risks",
    content: prospect
      ? `Here are the risks I've identified for ${prospect.companyName}:`
      : "Here are the risks I've identified across your pipeline:",
    risks,
    timestamp: new Date().toISOString(),
    prospectId: prospect?.id ?? null,
    actions: buildQuickActions(prospect?.id),
  };
}

function buildTimelineResponse(
  input: AIAssistantInput
): AIMessage {
  const { prospect, notes } = input;
  const timeline = buildTimelineSummary(prospect, notes);

  return {
    id: generateId("msg"),
    role: "assistant",
    type: "timeline",
    content: prospect
      ? `Here's the activity history for ${prospect.companyName}:`
      : "Here's the activity history:",
    timeline,
    timestamp: new Date().toISOString(),
    prospectId: prospect?.id ?? null,
    actions: buildQuickActions(prospect?.id),
  };
}

function buildWhichProspectTodayResponse(
  input: AIAssistantInput
): AIMessage {
  const { prospects } = input;
  const all = prospects ?? [];

  if (all.length === 0) {
    return {
      id: generateId("msg"),
      role: "assistant",
      type: "text",
      content: "You don't have any prospects in your pipeline yet. Add prospects to get personalized recommendations.",
      timestamp: new Date().toISOString(),
      actions: buildQuickActions(null),
    };
  }

  // Score prospects: high priority + high intent + not contacted recently
  const scored = all
    .map((p) => {
      const days = daysSince(p.lastContactedAt);
      let score = 0;
      if (p.priority === "urgent") score += 30;
      else if (p.priority === "high") score += 20;
      else if (p.priority === "medium") score += 10;
      if (p.buyingIntent === "high") score += 25;
      else if (p.buyingIntent === "medium") score += 10;
      if (days === null) score += 20;
      else if (days >= 7) score += 15;
      else if (days >= 3) score += 5;
      if (p.status === "qualified" || p.status === "proposal_sent") score += 15;
      return { ...p, score, days };
    })
    .sort((a, b) => b.score - a.score);

  const top = scored.slice(0, 3);
  const lines = top.map((p, i) => {
    const contact = p.days === null ? "never contacted" : `last contacted ${formatDays(p.days)}`;
    return `${i + 1}. **${p.companyName}** — ${statusLabel(p.status)}, ${priorityLabel(p.priority)} priority, ${contact}`;
  });

  return {
    id: generateId("msg"),
    role: "assistant",
    type: "recommendations",
    content: `Based on priority, buying intent, and engagement, here are the prospects I recommend contacting today:\n\n${lines.join("\n")}`,
    suggestions: top.map((p) => ({
      id: generateId("sug"),
      title: p.companyName,
      description: `${statusLabel(p.status)} · ${priorityLabel(p.priority)} priority · ${p.days === null ? "Never contacted" : `Last contact ${formatDays(p.days)}`}`,
      priority: p.score >= 50 ? "high" : p.score >= 30 ? "medium" : "low",
      action: "call" as AIQuickActionType,
      prospectId: p.id,
    })),
    timestamp: new Date().toISOString(),
    actions: buildQuickActions(top[0]?.id),
  };
}

function buildHighPriorityResponse(
  input: AIAssistantInput
): AIMessage {
  const { prospects } = input;
  const all = prospects ?? [];
  const high = all
    .filter((p) => p.priority === "high" || p.priority === "urgent")
    .sort((a, b) => {
      const scoreA = (a.aiFitScore ?? 0) + (a.leadScore ?? 0);
      const scoreB = (b.aiFitScore ?? 0) + (b.leadScore ?? 0);
      return scoreB - scoreA;
    })
    .slice(0, 5);

  if (high.length === 0) {
    return {
      id: generateId("msg"),
      role: "assistant",
      type: "text",
      content: "You don't have any high-priority prospects right now. Consider marking important accounts as high priority to get better recommendations.",
      timestamp: new Date().toISOString(),
      actions: buildQuickActions(null),
    };
  }

  return {
    id: generateId("msg"),
    role: "assistant",
    type: "recommendations",
    content: `Here are your high-priority prospects, ranked by fit and lead scores:`,
    suggestions: high.map((p) => ({
      id: generateId("sug"),
      title: p.companyName,
      description: `${statusLabel(p.status)} · Fit ${p.aiFitScore ?? "—"} · Lead ${p.leadScore ?? "—"} · ${p.buyingIntent} intent`,
      priority: p.priority === "urgent" ? "high" : "medium",
      action: "open_prospect" as AIQuickActionType,
      prospectId: p.id,
    })),
    timestamp: new Date().toISOString(),
    actions: buildQuickActions(high[0]?.id),
  };
}

function buildColdLeadsResponse(
  input: AIAssistantInput
): AIMessage {
  const { prospects } = input;
  const all = prospects ?? [];
  const cold = all
    .filter((p) => {
      const days = daysSince(p.lastContactedAt);
      return days !== null && days >= 14;
    })
    .sort((a, b) => {
      const da = daysSince(a.lastContactedAt) ?? 0;
      const db = daysSince(b.lastContactedAt) ?? 0;
      return db - da;
    })
    .slice(0, 5);

  if (cold.length === 0) {
    return {
      id: generateId("msg"),
      role: "assistant",
      type: "text",
      content: "Great news — no prospects are going cold right now. All your leads have been contacted within the last 14 days.",
      timestamp: new Date().toISOString(),
      actions: buildQuickActions(null),
    };
  }

  return {
    id: generateId("msg"),
    role: "assistant",
    type: "risks",
    content: `I found ${cold.length} prospect${cold.length > 1 ? "s" : ""} that ${cold.length > 1 ? "are" : "is"} going cold (no contact in 14+ days):`,
    risks: cold.map((p) => ({
      id: generateId("risk"),
      title: p.companyName,
      description: `Last contacted ${formatDays(daysSince(p.lastContactedAt) ?? 0)}. Re-engage to prevent the lead from going stale.`,
      severity: (daysSince(p.lastContactedAt) ?? 0) >= 30 ? "high" : "medium",
    })),
    timestamp: new Date().toISOString(),
    actions: buildQuickActions(cold[0]?.id),
  };
}

function buildNotContactedResponse(
  input: AIAssistantInput
): AIMessage {
  const { prospects } = input;
  const all = prospects ?? [];
  const notContacted = all
    .filter((p) => !p.lastContactedAt)
    .slice(0, 5);

  if (notContacted.length === 0) {
    return {
      id: generateId("msg"),
      role: "assistant",
      type: "text",
      content: "All your prospects have been contacted at least once. Great job staying on top of your pipeline!",
      timestamp: new Date().toISOString(),
      actions: buildQuickActions(null),
    };
  }

  return {
    id: generateId("msg"),
    role: "assistant",
    type: "recommendations",
    content: `Here are ${notContacted.length} prospect${notContacted.length > 1 ? "s" : ""} that haven't been contacted yet:`,
    suggestions: notContacted.map((p) => ({
      id: generateId("sug"),
      title: p.companyName,
      description: `${statusLabel(p.status)} · Never contacted · ${p.buyingIntent} intent`,
      priority: p.priority === "high" || p.priority === "urgent" ? "high" : "medium",
      action: "send_email" as AIQuickActionType,
      prospectId: p.id,
    })),
    timestamp: new Date().toISOString(),
    actions: buildQuickActions(notContacted[0]?.id),
  };
}

function buildRecommendationsResponse(
  input: AIAssistantInput
): AIMessage {
  return buildNextStepsResponse(input);
}

function buildToDoResponse(
  input: AIAssistantInput
): AIMessage {
  const { prospects, prospect } = input;
  const suggestions = buildRecommendations(prospects, prospect);

  return {
    id: generateId("msg"),
    role: "assistant",
    type: "suggestions",
    content: "Here are some smart actions I recommend adding to your to-do list:",
    suggestions: suggestions.map((s) => ({
      ...s,
      title: s.title,
      description: s.description,
    })),
    timestamp: new Date().toISOString(),
    prospectId: prospect?.id ?? null,
    actions: buildQuickActions(prospect?.id),
  };
}

function buildUnknownResponse(
  input: AIAssistantInput
): AIMessage {
  return {
    id: generateId("msg"),
    role: "assistant",
    type: "text",
    content:
      "I'm not sure I understood that. Here are some things you can ask me:\n\n• \"Summarize this prospect\"\n• \"What should I do next?\"\n• \"Highlight risks\"\n• \"Which prospect should I contact today?\"\n• \"Show me high priority companies\"\n• \"Which leads are getting cold?\"",
    timestamp: new Date().toISOString(),
    actions: buildQuickActions(input.prospect?.id),
  };
}

// ============================================================================
// Main Engine
// ============================================================================

function respond(input: AIAssistantInput): AIAssistantResponse {
  const intent = classifyIntent(input.query, input.context);
  const context: AIConversationContext = {
    messages: input.context?.messages ?? [],
    lastProspectId: input.prospect?.id ?? input.context?.lastProspectId ?? null,
    lastProspectName: input.prospect?.companyName ?? input.context?.lastProspectName ?? null,
    lastIntent: intent,
    lastQuery: input.query,
  };

  let message: AIMessage;
  switch (intent) {
    case "greeting":
      message = buildGreetingResponse();
      break;
    case "help":
      message = buildHelpResponse();
      break;
    case "summarize_prospect":
      message = buildSummarizeResponse(input);
      break;
    case "explain_company":
      message = buildExplainCompanyResponse(input);
      break;
    case "next_steps":
      message = buildNextStepsResponse(input);
      break;
    case "important_info":
      message = buildImportantInfoResponse(input);
      break;
    case "follow_up_ideas":
      message = buildFollowUpIdeasResponse(input);
      break;
    case "highlight_risks":
      message = buildRisksResponse(input);
      break;
    case "timeline_summary":
      message = buildTimelineResponse(input);
      break;
    case "which_prospect_today":
      message = buildWhichProspectTodayResponse(input);
      break;
    case "high_priority":
      message = buildHighPriorityResponse(input);
      break;
    case "cold_leads":
      message = buildColdLeadsResponse(input);
      break;
    case "not_contacted":
      message = buildNotContactedResponse(input);
      break;
    case "recommendations":
      message = buildRecommendationsResponse(input);
      break;
    case "to_do":
      message = buildToDoResponse(input);
      break;
    default:
      message = buildUnknownResponse(input);
  }

  // Add user message to context
  const userMessage: AIMessage = {
    id: generateId("msg"),
    role: "user",
    type: "text",
    content: input.query,
    timestamp: new Date().toISOString(),
    prospectId: input.prospect?.id ?? null,
  };

  context.messages = [...context.messages, userMessage, message];

  return { message, context };
}

// ============================================================================
// Provider Registry (Future-Ready)
// ============================================================================

export const assistantProviderRegistry: { providers: AIAssistantProvider[]; activeId: string } = {
  providers: [
    {
      id: "heuristic-v1",
      name: "Prosventa Sales Assistant v1",
      respond,
    },
  ],
  activeId: "heuristic-v1",
};

export function getActiveAssistantProvider(): AIAssistantProvider {
  return (
    assistantProviderRegistry.providers.find(
      (p) => p.id === assistantProviderRegistry.activeId
    ) ?? assistantProviderRegistry.providers[0]
  );
}
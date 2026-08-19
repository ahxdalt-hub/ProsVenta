// ============================================================================
// Prosventa AI Prospect Intelligence Generator
// Stage 3 — Phase 2: AI-Powered Prospect Intelligence Platform
// ============================================================================
// Heuristic intelligence engine that synthesizes prospect data into
// meaningful, human-readable insights. This provider-agnostic engine can
// later be swapped for or augmented with LLM-based providers without
// changing the UI contract.
// ============================================================================

import type { Prospect } from "@/types/database";
import type {
  AIProspectIntelligence,
  AICompanySummary,
  AICompanyInfo,
  AIScore,
  AIBuyingIntent,
  AIRecommendation,
  AIRisk,
  AIOpportunity,
  AIConfidence,
  ConfidenceLevel,
  BuyingIntentLevel,
  RecommendationAction,
  RiskSeverity,
  OpportunityImpact,
  RecommendationPriority,
} from "./types";

// ============================================================================
// Industry & Size Heuristics
// ============================================================================

const INDUSTRY_PROFILES: Record<string, { label: string; size: string; revenue: string }> = {
  software: { label: "SaaS", size: "Mid-sized", revenue: "$5M–$20M" },
  saas: { label: "SaaS", size: "Mid-sized", revenue: "$5M–$20M" },
  technology: { label: "Technology", size: "Mid-sized", revenue: "$10M–$50M" },
  fintech: { label: "Fintech", size: "Growth-stage", revenue: "$20M–$100M" },
  healthcare: { label: "Healthcare", size: "Enterprise", revenue: "$50M–$500M" },
  hr: { label: "HR Technology", size: "Mid-sized", revenue: "$5M–$20M" },
  "hr automation": { label: "HR Automation", size: "Rapidly growing", revenue: "$2M–$10M" },
  marketing: { label: "Marketing Technology", size: "Mid-sized", revenue: "$5M–$25M" },
  sales: { label: "Sales Technology", size: "Growth-stage", revenue: "$10M–$40M" },
  ecommerce: { label: "E-commerce", size: "Mid-sized", revenue: "$10M–$100M" },
  finance: { label: "Financial Services", size: "Enterprise", revenue: "$100M+" },
  manufacturing: { label: "Manufacturing", size: "Enterprise", revenue: "$100M–$1B" },
  logistics: { label: "Logistics", size: "Enterprise", revenue: "$50M–$500M" },
  education: { label: "Education Technology", size: "Mid-sized", revenue: "$5M–$25M" },
  realestate: { label: "Real Estate", size: "Mid-sized", revenue: "$10M–$50M" },
  energy: { label: "Energy", size: "Enterprise", revenue: "$500M+" },
};

const DEFAULT_INDUSTRY_PROFILE = { label: "B2B", size: "Mid-sized", revenue: "$5M–$50M" };

const EMPLOYEE_RANGES: { min: number; max: number; label: string }[] = [
  { min: 1, max: 10, label: "1–10" },
  { min: 11, max: 50, label: "11–50" },
  { min: 51, max: 200, label: "51–200" },
  { min: 201, max: 500, label: "201–500" },
  { min: 501, max: 1000, label: "501–1,000" },
  { min: 1001, max: 5000, label: "1,001–5,000" },
  { min: 5001, max: Infinity, label: "5,000+" },
];

function employeeRangeLabel(count: number | null): string {
  if (count === null) return "Unknown";
  const range = EMPLOYEE_RANGES.find((r) => count >= r.min && count <= r.max);
  return range?.label ?? "Unknown";
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededPick<T>(items: T[], seed: number): T {
  return items[seed % items.length];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundToNearest(value: number, step = 5): number {
  return Math.round(value / step) * step;
}

// ============================================================================
// Confidence Builder
// ============================================================================

function buildConfidence(score: number): AIConfidence {
  const clamped = clamp(score, 0, 100);
  const level: ConfidenceLevel = clamped >= 80 ? "high" : clamped >= 55 ? "medium" : "low";
  const label = level === "high" ? "High" : level === "medium" ? "Medium" : "Low";
  return { score: clamped, level, label };
}

// ============================================================================
// Score Label Helpers
// ============================================================================

function fitLabel(score: number): string {
  if (score >= 85) return "Excellent Fit";
  if (score >= 70) return "Good Fit";
  if (score >= 45) return "Average";
  return "Low Fit";
}

function leadLabel(score: number): string {
  if (score >= 85) return "Very High Intent";
  if (score >= 70) return "High Intent";
  if (score >= 45) return "Moderate Intent";
  return "Low Intent";
}

// ============================================================================
// Company Summary
// ============================================================================

function buildSummary(prospect: Prospect): AICompanySummary {
  const industryProfile = INDUSTRY_PROFILES[prospect.industry?.toLowerCase() ?? ""] ?? DEFAULT_INDUSTRY_PROFILE;
  const segments: string[] = [];

  segments.push(`${industryProfile.size} ${industryProfile.label} company`);

  if (prospect.description) {
    const trimmed = prospect.description.trim();
    const firstSentence = trimmed.split(/[.!?]/)[0].trim();
    if (firstSentence.length > 0 && firstSentence.length < 100) {
      segments.push(`focused on ${firstSentence.charAt(0).toLowerCase() + firstSentence.slice(1)}`);
    }
  }

  const desc = (prospect.description ?? "").toLowerCase();
  const hiringSignals = ["hiring", "growing", "expansion", "scale", "recruit"];
  const enterpriseSignals = ["enterprise", "fortune", "global", "international"];
  const hasHiringSignal = hiringSignals.some((s) => desc.includes(s));
  const hasEnterpriseSignal = enterpriseSignals.some((s) => desc.includes(s));

  if (hasHiringSignal) segments.push("with rapid hiring growth");
  if (hasEnterpriseSignal) segments.push("and increasing enterprise adoption");

  if (segments.length === 1) {
    const fallbacks = [
      "with a growing customer base",
      "and an expanding product footprint",
      "with strong market momentum in its segment",
    ];
    segments.push(seededPick(fallbacks, hashString(prospect.company_name)));
  }

  const confidenceScore = prospect.description ? 86 : 68;
  return {
    text: segments.join(" "),
    confidence: buildConfidence(confidenceScore),
  };
}

// ============================================================================
// Company Information
// ============================================================================

function buildCompanyInfo(prospect: Prospect): AICompanyInfo {
  const industryProfile = INDUSTRY_PROFILES[prospect.industry?.toLowerCase() ?? ""] ?? DEFAULT_INDUSTRY_PROFILE;
  const employeeLabel = employeeRangeLabel(prospect.employee_count);
  const seed = hashString(prospect.company_name || prospect.name);

  const revenue = prospect.employee_count !== null
    ? prospect.employee_count < 50 ? "$1M–$5M" :
      prospect.employee_count < 200 ? "$5M–$20M" :
      prospect.employee_count < 1000 ? "$20M–$100M" : "$100M+"
    : industryProfile.revenue;

  const foundedYear = 1995 + (seed % 28);
  const headquarters = [prospect.city, prospect.country].filter(Boolean).join(", ") || null;
  const website = prospect.website || (prospect.domain ? `https://${prospect.domain}` : null);
  const linkedin = prospect.domain ? `https://linkedin.com/company/${prospect.domain.replace("www.", "").split(".")[0]}` : null;

  const dataPoints = [
    prospect.industry,
    prospect.employee_count,
    headquarters,
    website,
    prospect.description,
    prospect.location,
  ].filter(Boolean).length;

  return {
    industry: industryProfile.label,
    companySize: industryProfile.size,
    estimatedEmployees: employeeLabel,
    estimatedRevenue: revenue,
    headquarters,
    foundedYear,
    website,
    linkedin,
    confidence: buildConfidence(58 + dataPoints * 7),
  };
}

// ============================================================================
// Fit Score
// ============================================================================

function buildFitScore(prospect: Prospect): AIScore {
  let score = 50;
  const reasons: string[] = [];

  if (prospect.industry) {
    score += 18;
    reasons.push(`Strong alignment with ${prospect.industry} segment`);
  }
  if (prospect.employee_count !== null && prospect.employee_count >= 50) {
    score += 15;
    reasons.push("Ideal company size with established teams");
  } else if (prospect.employee_count === null) {
    score -= 5;
  }
  if (prospect.website || prospect.domain) {
    score += 8;
    reasons.push("Active web presence signals operating business");
  }
  if (prospect.contact_email) score += 4;
  if (prospect.description) {
    score += 6;
    reasons.push("Detailed profile suggests research-ready account");
  }
  if (prospect.location) score += 3;

  score = roundToNearest(clamp(score, 15, 97));

  const explanation = reasons.length > 0
    ? reasons.slice(0, 2).join(". ") + "."
    : "Limited profile data available; additional research recommended.";

  return {
    value: score,
    label: fitLabel(score),
    explanation,
    confidence: buildConfidence(prospect.industry && prospect.employee_count ? 92 : 74),
  };
}

// ============================================================================
// Lead Score
// ============================================================================

function buildLeadScore(prospect: Prospect): AIScore {
  let score = 40;
  const reasons: string[] = [];

  if (prospect.last_contacted_at) {
    score += 15;
    reasons.push("Previously engaged — warm relationship");
  } else {
    score += 3;
    reasons.push("Untouched prospect with fresh potential");
  }

  if (prospect.status === "qualified" || prospect.status === "proposal_sent" || prospect.status === "negotiation") {
    score += 18;
    reasons.push("Active deal progression in pipeline");
  } else if (prospect.status === "contacted") {
    score += 8;
  } else if (prospect.status === "new") {
    score += 5;
  }

  if (prospect.contact_name && prospect.contact_email) {
    score += 14;
    reasons.push("Decision-maker contact available");
  } else if (prospect.contact_email) {
    score += 8;
  }

  if (prospect.priority === "high" || prospect.priority === "urgent") {
    score += 10;
    reasons.push("Flagged as high priority");
  }

  if (prospect.website || prospect.domain) score += 5;

  score = roundToNearest(clamp(score, 12, 96));

  const explanation = reasons.length > 0
    ? reasons.slice(0, 2).join(". ") + "."
    : "No engagement signals yet; early-stage opportunity.";

  return {
    value: score,
    label: leadLabel(score),
    explanation,
    confidence: buildConfidence(prospect.contact_email || prospect.last_contacted_at ? 88 : 70),
  };
}

// ============================================================================
// Buying Intent
// ============================================================================

function buildBuyingIntent(prospect: Prospect): AIBuyingIntent {
  const seed = hashString((prospect.company_name || prospect.name) + prospect.status);

  let level: BuyingIntentLevel = "medium";
  let explanation = "Company shows moderate engagement signals consistent with an active evaluation.";

  if (prospect.status === "qualified" || prospect.status === "proposal_sent") {
    level = "high";
    explanation = "Prospect has passed qualification and is actively evaluating solutions.";
  } else if (prospect.status === "negotiation") {
    level = "very_high";
    explanation = "Active negotiation stage indicates strong intent to purchase.";
  } else if (prospect.status === "contacted" && prospect.last_contacted_at) {
    level = "high";
    explanation = "Recent engagement with the account suggests elevated interest.";
  } else if (prospect.status === "new" && !prospect.last_contacted_at) {
    level = "low";
    explanation = "No engagement yet; intent will clarify after first outreach.";
  } else if (seed % 3 === 0) {
    level = "high";
    explanation = "Profile characteristics align with buyers seeking the offered solutions.";
  }

  const confidenceScore = prospect.last_contacted_at || prospect.status !== "new" ? 82 : 58;
  const labels: Record<BuyingIntentLevel, string> = {
    very_high: "Very High",
    high: "High",
    medium: "Medium",
    low: "Low",
  };

  return {
    level,
    label: labels[level],
    explanation,
    confidence: buildConfidence(confidenceScore),
  };
}

// ============================================================================
// Recommendations
// ============================================================================

const RECOMMENDATION_TEMPLATES: Record<RecommendationAction, { title: string; description: string }> = {
  send_intro_email: {
    title: "Send Intro Email",
    description: "Introduce the platform with a personalized value statement aligned to their segment.",
  },
  connect_linkedin: {
    title: "Connect on LinkedIn",
    description: "Build rapport with the key contact before pushing a meeting request.",
  },
  schedule_demo: {
    title: "Schedule Demo",
    description: "The account shows strong readiness — book a live walkthrough this week.",
  },
  follow_up: {
    title: "Follow Up",
    description: "Re-engage with a concise, value-driven follow-up to restart the conversation.",
  },
  research_decision_maker: {
    title: "Research Decision Maker",
    description: "Identify the economic buyer and map the internal champion before outreach.",
  },
};

function buildRecommendations(prospect: Prospect): AIRecommendation[] {
  const seed = hashString(prospect.company_name || prospect.name);
  const recommendations: AIRecommendation[] = [];
  let id = 0;
  const nextId = () => `rec-${seed}-${id++}`;

  const hasContact = Boolean(prospect.contact_name || prospect.contact_email);
  const hasBeenContacted = Boolean(prospect.last_contacted_at);
  const isAdvanced = ["qualified", "proposal_sent", "negotiation"].includes(prospect.status);
  const isNew = prospect.status === "new";

  const priority = (s: number): RecommendationPriority =>
    s >= 75 ? "high" : s >= 50 ? "medium" : "low";

  const confidence = (s: number) => buildConfidence(s);

  if (isAdvanced) {
    recommendations.push({
      id: nextId(),
      action: "schedule_demo",
      ...RECOMMENDATION_TEMPLATES.schedule_demo,
      priority: "high",
      confidence: confidence(90),
    });
  }

  if (isNew && !hasBeenContacted) {
    recommendations.push({
      id: nextId(),
      action: "send_intro_email",
      ...RECOMMENDATION_TEMPLATES.send_intro_email,
      priority: "high",
      confidence: confidence(86),
    });
  }

  if (!hasContact && !isAdvanced) {
    recommendations.push({
      id: nextId(),
      action: "research_decision_maker",
      ...RECOMMENDATION_TEMPLATES.research_decision_maker,
      priority: "medium",
      confidence: confidence(72),
    });
  }

  if (hasBeenContacted && !isAdvanced) {
    recommendations.push({
      id: nextId(),
      action: "follow_up",
      ...RECOMMENDATION_TEMPLATES.follow_up,
      priority: "medium",
      confidence: confidence(78),
    });
  }

  recommendations.push({
    id: nextId(),
    action: "connect_linkedin",
    ...RECOMMENDATION_TEMPLATES.connect_linkedin,
    priority: priority(55 + (seed % 20)),
    confidence: confidence(62),
  });

  return recommendations.slice(0, 3);
}

// ============================================================================
// Risks
// ============================================================================

function buildRisks(prospect: Prospect): AIRisk[] {
  const risks: AIRisk[] = [];
  let id = 0;
  const nextId = () => `risk-${hashString(prospect.company_name || prospect.name)}-${id++}`;
  const confidence = (s: number) => buildConfidence(s);

  const hasGrowthSignal = (prospect.description ?? "").toLowerCase().includes("shrink") || prospect.status === "lost";
  const hasContact = Boolean(prospect.contact_name || prospect.contact_email);
  const hasWebsite = Boolean(prospect.website || prospect.domain);
  const isSmall = prospect.employee_count !== null && prospect.employee_count < 25;
  const isNew = prospect.status === "new";

  if (hasGrowthSignal) {
    risks.push({
      id: nextId(),
      title: "Company shrinking",
      description: "Signals indicate potential contraction — verify current trajectory before investing heavily.",
      severity: "high" as RiskSeverity,
      confidence: confidence(74),
    });
  }

  if (isNew && !hasContact) {
    risks.push({
      id: nextId(),
      title: "Unknown decision maker",
      description: "No contact identified yet; outreach may stall without a target persona.",
      severity: "medium" as RiskSeverity,
      confidence: confidence(82),
    });
  }

  if (!hasWebsite) {
    risks.push({
      id: nextId(),
      title: "No website",
      description: "Missing web presence reduces credibility and makes research harder.",
      severity: "medium" as RiskSeverity,
      confidence: confidence(88),
    });
  }

  if (isSmall) {
    risks.push({
      id: nextId(),
      title: "Small budget",
      description: "Limited headcount may constrain available annual spend.",
      severity: "medium" as RiskSeverity,
      confidence: confidence(70),
    });
  }

  if (!hasContact && !isNew) {
    risks.push({
      id: nextId(),
      title: "Missing contact",
      description: "No direct contact on file — require sourcing before deep engagement.",
      severity: "low" as RiskSeverity,
      confidence: confidence(80),
    });
  }

  if (isNew && !prospect.last_contacted_at && risks.length === 0) {
    risks.push({
      id: nextId(),
      title: "Low engagement",
      description: "No engagement history yet; prioritizing this account may require validation.",
      severity: "low" as RiskSeverity,
      confidence: confidence(66),
    });
  }

  return risks.slice(0, 4);
}

// ============================================================================
// Opportunities
// ============================================================================

function buildOpportunities(prospect: Prospect): AIOpportunity[] {
  const opportunities: AIOpportunity[] = [];
  let id = 0;
  const nextId = () => `opp-${hashString(prospect.company_name || prospect.name)}-${id++}`;
  const confidence = (s: number) => buildConfidence(s);

  const desc = (prospect.description ?? "").toLowerCase();
  const hasHiringSignal = ["hiring", "growing", "expansion", "scale", "recruit"].some((s) => desc.includes(s));
  const hasEnterpriseSignal = ["enterprise", "fortune", "global", "international"].some((s) => desc.includes(s));
  const hasSalesSignal = ["sales", "revenue", "gtm"].some((s) => desc.includes(s));
  const hasLargeTeam = prospect.employee_count !== null && prospect.employee_count >= 200;

  if (hasHiringSignal || hasLargeTeam) {
    opportunities.push({
      id: nextId(),
      title: "Growing rapidly",
      description: "Team expansion signals increasing budget and a need for scalable solutions.",
      impact: "high" as OpportunityImpact,
      confidence: confidence(84),
    });
  }

  if (hasSalesSignal) {
    opportunities.push({
      id: nextId(),
      title: "Hiring sales team",
      description: "Sales investment suggests aggressive revenue goals and CRM-ready processes.",
      impact: "high" as OpportunityImpact,
      confidence: confidence(80),
    });
  }

  if (hasEnterpriseSignal) {
    opportunities.push({
      id: nextId(),
      title: "Enterprise-ready",
      description: "Global presence and enterprise adoption indicate larger deal potential.",
      impact: "high" as OpportunityImpact,
      confidence: confidence(76),
    });
  }

  if (prospect.status === "qualified") {
    opportunities.push({
      id: nextId(),
      title: "Recently qualified",
      description: "Account has passed early qualification — prime for acceleration.",
      impact: "medium" as OpportunityImpact,
      confidence: confidence(86),
    });
  }

  if (prospect.contact_email) {
    opportunities.push({
      id: nextId(),
      title: "Direct line to contact",
      description: "Verified email available enables immediate, personalized outreach.",
      impact: "medium" as OpportunityImpact,
      confidence: confidence(92),
    });
  }

  if (opportunities.length === 0) {
    opportunities.push({
      id: nextId(),
      title: "Early entry advantage",
      description: "Limited competitive activity detected; first-mover positioning available.",
      impact: "medium" as OpportunityImpact,
      confidence: confidence(58),
    });
  }

  return opportunities.slice(0, 4);
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Generate a full AI intelligence bundle for a prospect.
 * Provider-agnostic: this heuristic engine can be replaced with an
 * LLM-backed provider later without changing the UI contract.
 */
export function generateProspectIntelligence(
  prospect: Prospect,
  context?: { seed?: number }
): AIProspectIntelligence {
  return {
    summary: buildSummary(prospect),
    companyInfo: buildCompanyInfo(prospect),
    fitScore: buildFitScore(prospect),
    leadScore: buildLeadScore(prospect),
    buyingIntent: buildBuyingIntent(prospect),
    recommendations: buildRecommendations(prospect),
    risks: buildRisks(prospect),
    opportunities: buildOpportunities(prospect),
    generatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// Provider Registry (Future-Ready)
// ============================================================================

export interface AIProvider {
  id: string;
  name: string;
  generate(prospect: Prospect, context?: { seed?: number }): Promise<AIProspectIntelligence> | AIProspectIntelligence;
}

/**
 * Registry of AI providers. Currently uses the deterministic heuristic
 * engine, but future providers (LLM APIs, enrichment services) can be
 * registered here without touching the UI layer.
 */
export const aiProviderRegistry: { providers: AIProvider[]; activeId: string } = {
  providers: [
    {
      id: "heuristic-v1",
      name: "Prosventa Intelligence Engine v1",
      generate: (prospect, context) => generateProspectIntelligence(prospect, context),
    },
  ],
  activeId: "heuristic-v1",
};

export function getActiveProvider(): AIProvider {
  return aiProviderRegistry.providers.find((p) => p.id === aiProviderRegistry.activeId) ?? aiProviderRegistry.providers[0];
}

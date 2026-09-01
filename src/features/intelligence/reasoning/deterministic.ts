// ============================================================================
// Prosventa Intelligence — Deterministic Analysis Engine
// Feature 4 — Phase 2: Intelligence Engine, Scoring & Evidence-Grounded
// Reasoning
// ============================================================================
// Everything that can be calculated OBJECTIVELY is calculated here WITHOUT AI:
//   * ICP factor matching (industry / location / size / role / seniority)
//   * unknown ≠ mismatch (unknown data is never coerced into a low score)
//   * negative factors for disqualifying evidence (e.g. size far above range)
//   * signal recency + canonical importance weighting
//   * signal combinations ("may indicate…" language, never causal proof)
//   * evidence strength (quality over quantity — 5 weak records ≠ 1 verified)
//   * overall priority (transparent weighted combination of the dimensions)
//   * confidence (evidence quality — INDEPENDENT of priority)
//
// AI (when a model provider is configured) is used ONLY to interpret and
// explain; it can never override these scores or invent a priority.
//
// ICP weights REUSE the existing Find Matching Leads model exactly
// (features/prospects/services/icp-match.ts):
//   industry 25 · location 20 · companySize 20 · jobTitle 20 · seniority 15
// so Intelligence and Discovery never produce contradictory scores.
// ============================================================================

import type { IcpCriteria } from "../scoring/types";
import type {
  AiIntelligenceOutput,
  OutputDimension,
  OutputFactor,
} from "./schema";
import type {
  ConfidenceBreakdown,
  DimensionAssessment,
  IntelligenceDimension,
  IntelligenceFactor,
} from "./types";
import type { ReasoningFact, ReasoningInput, ReasoningSignal } from "./context";
import { isFactKnown } from "./context";

// ============================================================================
// Documented weights (Phase 2)
// ============================================================================

/** Same model as Find Matching Leads — do not diverge. */
export const ICP_FACTOR_WEIGHTS = {
  industry: 25,
  location: 20,
  companySize: 20,
  jobTitle: 20,
  seniority: 15,
} as const;

/**
 * Overall priority combination. Transparent by design: priority derives from
 * the four structured dimensions; missing (null) dimensions have their weight
 * redistributed proportionally instead of silently counting as zero.
 */
export const PRIORITY_DIMENSION_WEIGHTS = {
  icp_fit: 0.35,
  business_relevance: 0.25,
  timing: 0.2,
  evidence_strength: 0.2,
} as const;

export const PRIORITY_CATEGORIES = [
  "very_low",
  "low",
  "medium",
  "high",
  "very_high",
] as const;
export type PriorityCategory = (typeof PRIORITY_CATEGORIES)[number];

export interface OverallPriorityAssessment {
  score: number | null;
  category: PriorityCategory | "unknown";
}

export interface DeterministicAnalysis {
  /** Passes validateAiIntelligenceOutput() against the same input. */
  output: AiIntelligenceOutput;
  dimensionScores: Partial<Record<IntelligenceDimension, number | null>>;
  overallPriority: OverallPriorityAssessment;
  confidence: ConfidenceBreakdown;
  /** Same-key facts with conflicting values across sources (§28). */
  conflicts: string[];
}

// ============================================================================
// Small pure helpers (mirroring icp-match semantics)
// ============================================================================

function norm(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function fuzzyIncludes(a: string, b: string): boolean {
  return a.includes(b) || b.includes(a);
}

function anyMatch(values: string[], candidates: string[]): string | null {
  for (const candidate of candidates) {
    const c = norm(candidate);
    if (!c) continue;
    for (const value of values) {
      const v = norm(value);
      if (!v) continue;
      if (fuzzyIncludes(v, c)) return candidate;
    }
  }
  return null;
}

function employeeRangeForSize(size: string): [number, number] | null {
  const m = /^(\d+)\s*[-–+]?\s*(\d*)$/.exec(size.trim());
  if (!m) return null;
  return [parseInt(m[1], 10), m[2] ? parseInt(m[2], 10) : Number.MAX_SAFE_INTEGER];
}

function fact(input: ReasoningInput, key: string): ReasoningFact | undefined {
  return [...input.companyFacts, ...input.prospectFacts].find((f) => f.key === key);
}

function factValue(input: ReasoningInput, key: string): string | number | boolean | null {
  const f = fact(input, key);
  return f && isFactKnown(f) ? f.value : null;
}

function factRefId(input: ReasoningInput, key: string): string | null {
  const f = fact(input, key);
  return f?.sourceRecordId ?? null;
}

/** Prosventa product activity is NOT buying intent and never drives timing/relevance. */
const ACTIVITY_SIGNAL_TYPES = new Set([
  "prospect_imported",
  "company_enriched",
  "prospect_researched",
  "score_changed",
  "prospect_saved",
]);

function businessSignals(signals: ReasoningSignal[]): ReasoningSignal[] {
  return signals.filter((s) => !ACTIVITY_SIGNAL_TYPES.has(s.signalType));
}

function importanceWeight(importance: string | null | undefined): number {
  switch (importance) {
    case "critical":
      return 1;
    case "high":
      return 0.85;
    case "medium":
      return 0.6;
    case "low":
      return 0.4;
    default:
      return 0.5; // unknown importance → neutral, never invented
  }
}

function freshnessWeight(freshness: string | null): number {
  switch (freshness) {
    case "recent":
      return 1;
    case "aging":
      return 0.6;
    case "historical":
      return 0.3;
    default:
      return 0.3;
  }
}

// ============================================================================
// Conflicting evidence detection (§28)
// ============================================================================

/**
 * Detects same-key facts whose values disagree across DIFFERENT source records
 * (e.g. provider A says 120 employees, provider B says 1,200). Returns the
 * conflicting fact keys.
 */
export function detectConflicts(input: ReasoningInput): string[] {
  const byKey = new Map<string, { value: unknown; recordId: string | null }[]>();
  for (const f of [...input.companyFacts, ...input.prospectFacts]) {
    if (!isFactKnown(f)) continue;
    const list = byKey.get(f.key) ?? [];
    list.push({ value: f.value, recordId: f.sourceRecordId });
    byKey.set(f.key, list);
  }
  const conflicts: string[] = [];
  for (const [key, entries] of byKey) {
    if (entries.length < 2) continue;
    const distinctRecords = new Set(entries.map((e) => e.recordId));
    if (distinctRecords.size < 2) continue; // same record restated — no conflict
    const first = JSON.stringify(entries[0].value);
    if (entries.some((e) => JSON.stringify(e.value) !== first)) conflicts.push(key);
  }
  return conflicts.sort();
}

// ============================================================================
// ICP Fit (§5–§8) — unknown is NEVER mismatch
// ============================================================================

interface FactorOutcome {
  label: string;
  weight: number;
  evaluable: boolean;
  matched: boolean;
  detail: string;
  refId: string | null;
}

interface IcpFitResult {
  assessment: DimensionAssessment;
  outcomes: FactorOutcome[];
  evaluableSharePct: number;
}

function pushIcpFactor(
  target: { positive: IntelligenceFactor[]; negative: IntelligenceFactor[] },
  idPrefix: string,
  outcome: FactorOutcome,
  matched: boolean
): void {
  const factor: IntelligenceFactor = {
    id: `${idPrefix}.${matched ? "match" : "mismatch"}`,
    label: outcome.label,
    detail: outcome.detail,
    polarity: matched ? "positive" : "negative",
    status: matched ? "match" : "mismatch",
    evidenceRefIds: outcome.refId ? [outcome.refId] : [],
  };
  (matched ? target.positive : target.negative).push(factor);
}

function assessIndustry(
  input: ReasoningInput,
  criteria: IcpCriteria | null,
  buckets: { positive: IntelligenceFactor[]; negative: IntelligenceFactor[] },
  unknownFields: string[],
  outcomes: FactorOutcome[]
): void {
  const targets = criteria?.company.targetIndustries ?? [];
  const excluded = criteria?.company.excludedIndustries ?? [];
  const raw = factValue(input, "company.industry");
  const refId = factRefId(input, "company.industry");
  let outcome: FactorOutcome;
  if (targets.length === 0 && excluded.length === 0) {
    outcome = { label: "Industry", weight: ICP_FACTOR_WEIGHTS.industry, evaluable: false, matched: false, detail: "No target industries configured in your ICP.", refId: null };
    unknownFields.push("icp.targetIndustries");
  } else if (raw == null) {
    // Unknown company industry is UNKNOWN, not a mismatch.
    outcome = { label: "Industry", weight: ICP_FACTOR_WEIGHTS.industry, evaluable: false, matched: false, detail: "Company industry could not be verified.", refId: null };
    unknownFields.push("company.industry");
  } else {
    const excludedHit = anyMatch([String(raw)], excluded);
    const hit = excludedHit ? null : anyMatch([String(raw)], targets);
    if (hit || (!excludedHit && targets.length === 0)) {
      outcome = { label: "Industry", weight: ICP_FACTOR_WEIGHTS.industry, evaluable: true, matched: true, detail: String(raw), refId };
      pushIcpFactor(buckets, "icp.industry", outcome, true);
    } else if (excludedHit) {
      outcome = { label: "Industry", weight: ICP_FACTOR_WEIGHTS.industry, evaluable: true, matched: false, detail: `${raw} is an explicitly excluded industry`, refId };
      pushIcpFactor(buckets, "icp.industry", outcome, false);
    } else {
      outcome = { label: "Industry", weight: ICP_FACTOR_WEIGHTS.industry, evaluable: true, matched: false, detail: `${raw} differs from your target industries`, refId };
      pushIcpFactor(buckets, "icp.industry", outcome, false);
    }
  }
  outcomes.push(outcome);
}

function assessLocation(
  input: ReasoningInput,
  criteria: IcpCriteria | null,
  buckets: { positive: IntelligenceFactor[]; negative: IntelligenceFactor[] },
  unknownFields: string[],
  outcomes: FactorOutcome[]
): void {
  const targets = criteria?.company.targetCountries ?? [];
  const raw = factValue(input, "company.location");
  const refId = factRefId(input, "company.location");
  let outcome: FactorOutcome;
  if (targets.length === 0) {
    outcome = { label: "Location", weight: ICP_FACTOR_WEIGHTS.location, evaluable: false, matched: false, detail: "No target locations configured in your ICP.", refId: null };
    unknownFields.push("icp.targetCountries");
  } else if (raw == null) {
    outcome = { label: "Location", weight: ICP_FACTOR_WEIGHTS.location, evaluable: false, matched: false, detail: "Company location could not be verified.", refId: null };
    unknownFields.push("company.location");
  } else {
    const hit = anyMatch([String(raw)], targets);
    outcome = hit
      ? { label: "Location", weight: ICP_FACTOR_WEIGHTS.location, evaluable: true, matched: true, detail: String(raw), refId }
      : { label: "Location", weight: ICP_FACTOR_WEIGHTS.location, evaluable: true, matched: false, detail: `${raw} is outside your target locations`, refId };
    pushIcpFactor(buckets, "icp.location", outcome, Boolean(hit));
  }
  outcomes.push(outcome);
}

function assessSize(
  input: ReasoningInput,
  criteria: IcpCriteria | null,
  buckets: { positive: IntelligenceFactor[]; negative: IntelligenceFactor[] },
  unknownFields: string[],
  outcomes: FactorOutcome[]
): void {
  const sizeTargets = criteria?.company.targetCompanySizes ?? [];
  const min = criteria?.company.minEmployees ?? null;
  const max = criteria?.company.maxEmployees ?? null;
  const hasBounds = min != null || max != null;
  const countRaw = factValue(input, "company.employee_count");
  const refId = factRefId(input, "company.employee_count");
  let outcome: FactorOutcome;
  if (sizeTargets.length === 0 && !hasBounds) {
    outcome = { label: "Company size", weight: ICP_FACTOR_WEIGHTS.companySize, evaluable: false, matched: false, detail: "No company size range configured in your ICP.", refId: null };
    unknownFields.push("icp.companySize");
  } else if (typeof countRaw !== "number") {
    outcome = { label: "Company size", weight: ICP_FACTOR_WEIGHTS.companySize, evaluable: false, matched: false, detail: "Employee count could not be verified.", refId: null };
    unknownFields.push("company.employee_count");
  } else {
    let sizeMatch = false;
    let rangeLabel = "";
    if (hasBounds) {
      const lo = min ?? 0;
      sizeMatch = max != null ? countRaw >= lo && countRaw <= max : countRaw >= lo;
      rangeLabel = `${lo.toLocaleString()}–${max != null ? max.toLocaleString() : "+"}`;
    } else {
      for (const target of sizeTargets) {
        const range = employeeRangeForSize(target);
        rangeLabel = rangeLabel || target;
        if (range && countRaw >= range[0] && countRaw <= range[1]) {
          sizeMatch = true;
          break;
        }
      }
    }
    const countLabel = `${countRaw.toLocaleString()} employees`;
    outcome = sizeMatch
      ? { label: "Company size", weight: ICP_FACTOR_WEIGHTS.companySize, evaluable: true, matched: true, detail: `${countLabel} fits your range`, refId }
      : { label: "Company size", weight: ICP_FACTOR_WEIGHTS.companySize, evaluable: true, matched: false, detail: `${countLabel} is outside your ICP range (${rangeLabel})`, refId };
    pushIcpFactor(buckets, "icp.size", outcome, sizeMatch);
  }
  outcomes.push(outcome);
}

function assessRoleAndSeniority(
  input: ReasoningInput,
  criteria: IcpCriteria | null,
  buckets: { positive: IntelligenceFactor[]; negative: IntelligenceFactor[] },
  unknownFields: string[],
  outcomes: FactorOutcome[]
): void {
  const roleTargets = criteria?.prospect.targetJobTitles ?? [];
  const seniorityTargets = criteria?.prospect.targetSeniorityLevels ?? [];
  const excludedRoles = criteria?.prospect.excludedRoles ?? [];
  const titleRaw = factValue(input, "prospect.job_title");
  const titleRefId = factRefId(input, "prospect.job_title");

  // ---- Role ---------------------------------------------------------------
  {
    let outcome: FactorOutcome;
    if (roleTargets.length === 0) {
      outcome = { label: "Role", weight: ICP_FACTOR_WEIGHTS.jobTitle, evaluable: false, matched: false, detail: "No target roles configured in your ICP.", refId: null };
      unknownFields.push("icp.targetJobTitles");
    } else if (typeof titleRaw !== "string") {
      outcome = { label: "Role", weight: ICP_FACTOR_WEIGHTS.jobTitle, evaluable: false, matched: false, detail: "Prospect role could not be verified.", refId: null };
      unknownFields.push("prospect.job_title");
    } else {
      const excludedHit = anyMatch([titleRaw], excludedRoles);
      const hit = excludedHit ? null : anyMatch([titleRaw], roleTargets);
      if (excludedHit) {
        outcome = { label: "Role", weight: ICP_FACTOR_WEIGHTS.jobTitle, evaluable: true, matched: false, detail: `${titleRaw} matches an excluded role`, refId: titleRefId };
        pushIcpFactor(buckets, "icp.role", outcome, false);
      } else if (hit) {
        outcome = { label: "Role", weight: ICP_FACTOR_WEIGHTS.jobTitle, evaluable: true, matched: true, detail: titleRaw, refId: titleRefId };
        pushIcpFactor(buckets, "icp.role", outcome, true);
      } else {
        outcome = { label: "Role", weight: ICP_FACTOR_WEIGHTS.jobTitle, evaluable: true, matched: false, detail: `${titleRaw} is outside your target roles`, refId: titleRefId };
        pushIcpFactor(buckets, "icp.role", outcome, false);
      }
    }
    outcomes.push(outcome);
  }

  // ---- Seniority ------------------------------------------------------------
  {
    let outcome: FactorOutcome;
    if (seniorityTargets.length === 0) {
      outcome = { label: "Seniority", weight: ICP_FACTOR_WEIGHTS.seniority, evaluable: false, matched: false, detail: "No seniority levels configured in your ICP.", refId: null };
      unknownFields.push("icp.targetSeniorityLevels");
    } else if (typeof titleRaw !== "string") {
      outcome = { label: "Seniority", weight: ICP_FACTOR_WEIGHTS.seniority, evaluable: false, matched: false, detail: "Seniority could not be determined.", refId: null };
      unknownFields.push("prospect.seniority");
    } else {
      const hit = anyMatch([titleRaw], seniorityTargets);
      outcome = hit
        ? { label: "Seniority", weight: ICP_FACTOR_WEIGHTS.seniority, evaluable: true, matched: true, detail: hit, refId: titleRefId }
        : { label: "Seniority", weight: ICP_FACTOR_WEIGHTS.seniority, evaluable: false, matched: false, detail: "Could not determine seniority from the available information.", refId: titleRefId };
      if (hit) pushIcpFactor(buckets, "icp.seniority", outcome, true);
    }
    outcomes.push(outcome);
  }
}

function assessIcpFit(input: ReasoningInput, criteria: IcpCriteria | null): IcpFitResult {
  const buckets = { positive: [] as IntelligenceFactor[], negative: [] as IntelligenceFactor[] };
  const unknownFields: string[] = [];
  const outcomes: FactorOutcome[] = [];

  assessIndustry(input, criteria, buckets, unknownFields, outcomes);
  assessLocation(input, criteria, buckets, unknownFields, outcomes);
  assessSize(input, criteria, buckets, unknownFields, outcomes);
  assessRoleAndSeniority(input, criteria, buckets, unknownFields, outcomes);

  // ---- Score: earned ÷ EVALUABLE weight × 100 -----------------------------
  // Unknown factors are removed from the denominator rather than scored as
  // failures — incomplete evidence lowers coverage, it never fabricates a
  // mismatch (§7).
  let earned = 0;
  let evaluableWeight = 0;
  for (const o of outcomes) {
    if (o.evaluable) {
      evaluableWeight += o.weight;
      if (o.matched) earned += o.weight;
    }
  }
  const totalWeight = Object.values(ICP_FACTOR_WEIGHTS).reduce((a, b) => a + b, 0);
  const score = evaluableWeight > 0 ? Math.round((earned / evaluableWeight) * 100) : null;

  const hasMismatch = outcomes.some((o) => o.evaluable && !o.matched);
  const status: DimensionAssessment["status"] =
    score === null ? "unknown" : hasMismatch && score < 60 ? "mismatch" : "match";

  const summary =
    score === null
      ? "ICP fit could not be evaluated with the available configuration and data."
      : `ICP fit ${score}/100 based on ${Math.round((evaluableWeight / totalWeight) * 100)}% of ICP criteria being evaluable.`;

  return {
    assessment: { dimension: "icp_fit", score, status, summary, positiveFactors: buckets.positive, negativeFactors: buckets.negative, unknownFields },
    outcomes,
    evaluableSharePct: Math.round((evaluableWeight / totalWeight) * 100),
  };
}

// ============================================================================
// Timing (§10, §14) — recency × canonical importance; recent-but-weak stays weak
// ============================================================================

function assessTiming(signals: ReasoningSignal[]): DimensionAssessment {
  const relevant = businessSignals(signals);
  if (relevant.length === 0) {
    return {
      dimension: "timing",
      score: null,
      status: "unknown",
      summary: "No relevant business signals were detected — timing cannot be assessed.",
      positiveFactors: [],
      negativeFactors: [],
      unknownFields: ["signals"],
    };
  }

  const strengths = relevant.map((s) => ({
    signal: s,
    strength: Math.round(100 * freshnessWeight(s.freshness) * importanceWeight(s.importance)),
  }));
  strengths.sort((a, b) => b.strength - a.strength);

  // Top-3 average keeps one old critical event from dominating forever while
  // still letting multiple aligned recent events reinforce each other.
  const top = strengths.slice(0, 3);
  let score = Math.round(top.reduce((sum, t) => sum + t.strength, 0) / top.length);

  const strongRecent = strengths.filter((s) => s.signal.freshness === "recent" && s.strength >= 50);
  if (strongRecent.length >= 2) {
    // Multiple recent meaningful events may compound timing relevance (§13).
    score = Math.min(100, score + 10);
  }

  const positives: IntelligenceFactor[] = top.slice(0, 3).map((t) => ({
    id: `timing.${t.signal.signalId}`,
    label: t.signal.title,
    detail:
      (t.signal.freshness === "recent" ? "Recent" : t.signal.freshness === "aging" ? "Aging" : "Historical") +
      ` ${t.signal.signalType.replace(/_/g, " ")} signal`,
    polarity: "positive",
    status: "match",
    evidenceRefIds: [t.signal.signalId],
  }));

  return {
    dimension: "timing",
    score,
    status: score >= 40 ? "match" : "unknown",
    summary:
      score >= 70
        ? "Recent, meaningful signals suggest elevated timing relevance."
        : score >= 40
          ? "Some signals are relevant but not strongly recent."
          : "Detected signals are older or lower-importance — limited timing relevance.",
    positiveFactors: positives,
    negativeFactors: [],
    unknownFields: [],
  };
}

// ============================================================================
// Business relevance (§9, §12, §13) — cautious, combination-aware
// ============================================================================

interface SignalCombo {
  id: string;
  types: [string, string];
  interpretation: string;
}

const SIGNAL_COMBINATIONS: SignalCombo[] = [
  {
    id: "leadership_plus_hiring",
    types: ["leadership_change", "hiring_activity"],
    interpretation: "New sales leadership combined with sales hiring may indicate increased focus on customer acquisition.",
  },
  {
    id: "funding_plus_hiring",
    types: ["funding_event", "hiring_activity"],
    interpretation: "A funding event combined with active hiring may indicate capacity to invest in growth.",
  },
  {
    id: "expansion_plus_hiring",
    types: ["company_expansion", "hiring_activity"],
    interpretation: "Expansion activity combined with hiring may indicate an organisation in transition.",
  },
];

function assessBusinessRelevance(
  input: ReasoningInput,
  icpFitScore: number | null
): DimensionAssessment {
  const relevant = businessSignals(input.signals);
  if (relevant.length === 0) {
    return {
      dimension: "business_relevance",
      score: null,
      status: "unknown",
      summary: "No relevant verified signals were detected — business relevance cannot be assessed beyond basic ICP fit.",
      positiveFactors: [],
      negativeFactors: [],
      unknownFields: ["signals"],
    };
  }

  const positiveFactors: IntelligenceFactor[] = [];
  const negativeFactors: IntelligenceFactor[] = [];
  let score = 35; // baseline when ANY relevant signal exists at all

  // Signal combinations (§13): cautious "may indicate" language only.
  const typeSet = new Set(relevant.map((s) => s.signalType));
  for (const combo of SIGNAL_COMBINATIONS) {
    if (combo.types.every((t) => typeSet.has(t))) {
      score += 20;
      positiveFactors.push({
        id: `relevance.combo.${combo.id}`,
        label: "Related signals observed together",
        detail: combo.interpretation,
        polarity: "positive",
        status: "match",
        evidenceRefIds: relevant.filter((s) => combo.types.includes(s.signalType)).map((s) => s.signalId),
      });
    }
  }

  // Individual notable events contribute modestly — one event alone must not
  // manufacture extreme relevance (§12).
  const notableSingle = relevant.filter((s) =>
    ["leadership_change", "funding_event", "hiring_activity", "company_growth"].includes(s.signalType)
  );
  if (notableSingle.length > 0 && positiveFactors.length === 0) {
    score += 15;
    positiveFactors.push({
      id: "relevance.notable_events",
      label: "Notable business event detected",
      detail: `Recent ${notableSingle.map((s) => s.signalType.replace(/_/g, " ")).join(", ")} may be relevant to this prospect's context.`,
      polarity: "positive",
      status: "match",
      evidenceRefIds: notableSingle.slice(0, 3).map((s) => s.signalId),
    });
  }

  // ICP alignment contextualises activity: activity does not erase a poor fit
  // (Scenario C), but strengthens relevance for a good fit (Scenario A).
  if (icpFitScore != null && icpFitScore >= 70) score += 15;

  // Verified signals carry more evidential weight than unverified ones.
  const verifiedCount = relevant.filter((s) => s.status === "verified").length;
  if (verifiedCount === 0) {
    score -= 10;
    negativeFactors.push({
      id: "relevance.unverified_signals",
      label: "Signals are not yet verified",
      detail: "Detected signals have not been verified — interpret with caution.",
      polarity: "negative",
      status: "unknown",
      evidenceRefIds: relevant.slice(0, 3).map((s) => s.signalId),
    });
  }

  score = Math.max(5, Math.min(100, score));

  return {
    dimension: "business_relevance",
    score,
    status: score >= 45 ? "match" : "unknown",
    summary:
      score >= 65
        ? "Multiple aligned signals suggest current business activity relevant to your target market."
        : score >= 45
          ? "Some evidence of business activity that may be relevant."
          : "Limited evidence of business activity relevant to your offering.",
    positiveFactors,
    negativeFactors,
    unknownFields: [],
  };
}

// ============================================================================
// Evidence strength (§11) — quality over quantity
// ============================================================================

function assessEvidenceStrength(input: ReasoningInput): DimensionAssessment {
  const relevant = businessSignals(input.signals);
  const knownFacts = [...input.companyFacts, ...input.prospectFacts].filter(isFactKnown);
  const conflicts = detectConflicts(input);

  if (relevant.length === 0 && knownFacts.length === 0) {
    return {
      dimension: "evidence_strength",
      score: null,
      status: "unknown",
      summary: "No evidence is available.",
      positiveFactors: [],
      negativeFactors: [],
      unknownFields: ["evidence"],
    };
  }

  // Quality: verification status dominates raw counts.
  let quality = 40; // base: user-entered prospect/company data exists
  if (relevant.length > 0) {
    const qualityByStatus = relevant.map((s) =>
      s.status === "verified" ? 100 : s.status === "detected" || s.status === "unverified" ? 40 : 55
    );
    const confidenceBoost = relevant.some((s) => s.confidence === "high") ? 5 : 0;
    quality = Math.min(100, Math.round(qualityByStatus.reduce((a, b) => a + b, 0) / qualityByStatus.length) + confidenceBoost);
  }

  // Quantity: sublinear — five weak records never beat one reliable source.
  const quantity = Math.min(100, 30 + relevant.length * 10 + knownFacts.length * 4);

  // Cross-source confirmation.
  const distinctSources = new Set(relevant.map((s) => s.source).filter(Boolean));
  const crossSource = distinctSources.size >= 2 ? 85 : relevant.length > 0 ? 55 : 60;

  // Freshness of the evidence base.
  const freshShare =
    relevant.length > 0
      ? relevant.filter((s) => s.freshness === "recent").length / relevant.length
      : 0.5;
  const freshnessScore = Math.round(40 + freshShare * 55);

  // Completeness: enrichment availability improves evidential completeness.
  let completeness = 50;
  if (input.enrichment.hasCompanyEnrichment) completeness += 20;
  if (input.enrichment.hasProspectEnrichment) completeness += 20;
  completeness = Math.min(100, completeness);

  const score = Math.round(
    quality * 0.3 + quantity * 0.2 + crossSource * 0.2 + freshnessScore * 0.15 + completeness * 0.15
  );

  const negatives: IntelligenceFactor[] = [];
  if (conflicts.length > 0) {
    negatives.push({
      id: "evidence.conflict",
      label: "Conflicting evidence detected",
      detail: `Data providers disagree on: ${conflicts.join(", ")}. Confidence reduced until resolved.`,
      polarity: "negative",
      status: "unknown",
      evidenceRefIds: conflicts
        .map((key) => fact(input, key)?.sourceRecordId)
        .filter((id): id is string => Boolean(id)),
    });
  }
  const unverifiedCount = relevant.filter((s) => s.status !== "verified").length;
  if (unverifiedCount > 0) {
    negatives.push({
      id: "evidence.unverified",
      label: `${unverifiedCount} unverified signal${unverifiedCount === 1 ? "" : "s"}`,
      detail: "Some signals have not completed verification.",
      polarity: "negative",
      status: "unknown",
      evidenceRefIds: relevant.filter((s) => s.status !== "verified").slice(0, 3).map((s) => s.signalId),
    });
  }

  const positives: IntelligenceFactor[] = [];
  const verifiedCount = relevant.filter((s) => s.status === "verified").length;
  if (verifiedCount > 0) {
    positives.push({
      id: "evidence.verified",
      label: `${verifiedCount} verified signal${verifiedCount === 1 ? "" : "s"}`,
      detail: "Verified signals provide a reliable evidence base.",
      polarity: "positive",
      status: "match",
      evidenceRefIds: relevant.filter((s) => s.status === "verified").slice(0, 3).map((s) => s.signalId),
    });
  }
  if (distinctSources.size >= 2) {
    positives.push({
      id: "evidence.cross_source",
      label: "Cross-provider confirmation",
      detail: `Evidence comes from ${distinctSources.size} independent sources.`,
      polarity: "positive",
      status: "match",
      evidenceRefIds: [],
    });
  }

  return {
    dimension: "evidence_strength",
    score,
    status: conflicts.length > 0 ? "unknown" : score >= 45 ? "match" : "unknown",
    summary:
      conflicts.length > 0
        ? "Evidence contains conflicts that reduce reliability."
        : score >= 65
          ? "Evidence base is solid relative to what has been collected."
          : "Evidence base exists but is limited in verification, breadth or freshness.",
    positiveFactors: positives,
    negativeFactors: negatives,
    unknownFields: [],
  };
}

// ============================================================================
// Overall priority (§25–26) — bounded, transparent combination
// ============================================================================

export function computeOverallPriority(
  scores: Partial<Record<IntelligenceDimension, number | null>>
): OverallPriorityAssessment {
  let weighted = 0;
  let totalWeight = 0;
  for (const [dim, weight] of Object.entries(PRIORITY_DIMENSION_WEIGHTS) as [
    IntelligenceDimension,
    number
  ][]) {
    const score = scores[dim];
    if (typeof score === "number") {
      weighted += score * weight;
      totalWeight += weight;
    }
  }
  if (totalWeight === 0) return { score: null, category: "unknown" };
  const score = Math.round(weighted / totalWeight);
  const category: PriorityCategory =
    score >= 80 ? "very_high" : score >= 60 ? "high" : score >= 40 ? "medium" : score >= 20 ? "low" : "very_low";
  return { score, category };
}

// ============================================================================
// Confidence (§27) — evidence quality; independent of priority
// ============================================================================

export function computeConfidence(
  input: ReasoningInput,
  conflicts: string[]
): ConfidenceBreakdown {
  const relevant = businessSignals(input.signals);
  const knownFacts = [...input.companyFacts, ...input.prospectFacts].filter(isFactKnown);

  const evidenceQuantity = Math.min(100, relevant.length * 18 + knownFacts.length * 6);

  let evidenceQuality: number | null = null;
  if (relevant.length > 0) {
    evidenceQuality = Math.round(
      relevant.reduce(
        (sum, s) => sum + (s.status === "verified" ? 100 : s.status === "detected" ? 40 : 55),
        0
      ) / relevant.length
    );
  } else if (knownFacts.length > 0) {
    evidenceQuality = 50; // only self-entered data — neutral quality
  }

  let sourceReliability: number | null = null;
  const sources = new Set(relevant.map((s) => s.source).filter(Boolean));
  if (relevant.length > 0) {
    sourceReliability = Math.min(100, 45 + sources.size * 20);
  } else if (knownFacts.length > 0) {
    sourceReliability = 45;
  }

  const freshShare =
    relevant.length > 0
      ? relevant.filter((s) => s.freshness !== "historical").length / relevant.length
      : null;

  const consistency =
    conflicts.length > 0
      ? Math.max(10, 90 - conflicts.length * 35)
      : knownFacts.length > 0
        ? 95
        : null;

  const components: ConfidenceBreakdown["components"] = {
    evidence_quality: { value: evidenceQuality, note: evidenceQuality === null ? "No external evidence collected yet." : null },
    evidence_quantity: { value: evidenceQuantity === 0 ? null : evidenceQuantity, note: evidenceQuantity === 0 ? "No evidence records." : null },
    source_reliability: { value: sourceReliability, note: sources.size >= 2 ? "Multiple independent sources." : null },
    freshness: { value: freshShare === null ? null : Math.round(freshShare * 100), note: freshShare === null ? "Freshness not applicable without signals." : null },
    consistency: { value: consistency, note: conflicts.length > 0 ? "Providers report conflicting values." : null },
  };

  const values = [
    components.evidence_quality.value,
    components.evidence_quantity.value,
    components.source_reliability.value,
    components.freshness.value,
    components.consistency.value,
  ].filter((v): v is number => typeof v === "number");
  const overall =
    values.length >= 2 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
  const level: ConfidenceBreakdown["level"] =
    overall === null ? "unknown" : overall >= 70 ? "high" : overall >= 45 ? "medium" : "low";

  return { overall, level, components };
}

// ============================================================================
// Assembly — structured output that passes the Phase 1 schema validation
// ============================================================================

function toOutputFactor(f: IntelligenceFactor): OutputFactor {
  return {
    id: f.id,
    label: f.label,
    polarity: f.polarity,
    status: f.status,
    detail: f.detail ?? null,
    grounding: (f.evidenceRefIds ?? []).filter(Boolean).map((refId) => ({ refId })),
  };
}

function toOutputDimension(a: DimensionAssessment): OutputDimension {
  return {
    dimension: a.dimension,
    score: a.score,
    status: a.status,
    summary: a.summary,
    positive_factors: a.positiveFactors.map(toOutputFactor),
    negative_factors: a.negativeFactors.map(toOutputFactor),
    unknown_fields: a.unknownFields,
  };
}

/**
 * Runs the full deterministic analysis. The returned output passes
 * validateAiIntelligenceOutput(input) — the deterministic engine obeys the
 * exact same strict contract as AI providers.
 */
export function runDeterministicAnalysis(input: ReasoningInput): DeterministicAnalysis {
  const icp = assessIcpFit(input, input.icp?.criteria ?? null);
  const timing = assessTiming(input.signals);
  const relevance = assessBusinessRelevance(input, icp.assessment.score ?? null);
  const evidence = assessEvidenceStrength(input);
  const conflicts = detectConflicts(input);

  const assessments: DimensionAssessment[] = [icp.assessment, relevance, timing, evidence];

  const dimensionScores: Partial<Record<IntelligenceDimension, number | null>> = {};
  for (const a of assessments) dimensionScores[a.dimension] = a.score;
  const priority = computeOverallPriority(dimensionScores);
  dimensionScores.overall_priority = priority.score;

  const prioritySummary =
    priority.score === null
      ? "Overall priority could not be computed from the available evidence."
      : `Overall priority ${priority.category.replace("_", " ")} (${priority.score}/100), combining ICP fit, business relevance, timing and evidence strength.`;

  const priorityAssessment: DimensionAssessment = {
    dimension: "overall_priority",
    score: priority.score,
    status: priority.score === null ? "unknown" : priority.score >= 60 ? "match" : "unknown",
    summary: prioritySummary,
    positiveFactors: [],
    negativeFactors: [],
    unknownFields: [],
  };

  const all = [...assessments, priorityAssessment];

  // Key factors: strongest positives across dimensions (concise, §45).
  const keyFactors: OutputFactor[] = all
    .flatMap((a) => a.positiveFactors.map(toOutputFactor))
    .slice(0, 4);

  // Concerns: genuine negatives + material unknowns — never manufactured (§24).
  const concernFactors: OutputFactor[] = all.flatMap((a) =>
    a.negativeFactors.map(toOutputFactor)
  );
  for (const field of icp.assessment.unknownFields) {
    if (field.startsWith("company.") || field.startsWith("prospect.")) {
      concernFactors.push({
        id: `concern.unknown.${field}`,
        label: "Unverified information",
        detail: `${field.split(".")[1].replace(/_/g, " ")} could not be verified — treated as unknown, not as a mismatch.`,
        polarity: "negative",
        status: "unknown",
        grounding: [],
      });
    }
  }

  // Concise explanation (§45): facts first, cautious language throughout.
  const explanationParts: string[] = [];
  const companyName = input.subject.companyName ?? "This company";
  if (icp.assessment.score !== null) {
    explanationParts.push(
      `${companyName} scores ${icp.assessment.score}/100 on your ICP` +
        (icp.evaluableSharePct < 100 ? ` (based on the ${icp.evaluableSharePct}% of criteria that could be evaluated)` : "") +
        "."
    );
  } else {
    explanationParts.push(`${companyName} could not be evaluated against your ICP with the available data.`);
  }
  if (input.signals.length === 0) {
    explanationParts.push("No relevant verified signals were detected.");
  } else if ((timing.score ?? 0) >= 60) {
    explanationParts.push("Recent signals suggest elevated timing relevance.");
  }
  if (conflicts.length > 0) {
    explanationParts.push(`Note: data sources disagree on ${conflicts.join(", ")}.`);
  }
  if (priority.score !== null) {
    explanationParts.push(`Combined assessment: ${priority.category.replace("_", " ")} priority (${priority.score}/100).`);
  }

  const output: AiIntelligenceOutput = {
    dimensions: Object.fromEntries(
      all.map((a) => [a.dimension, toOutputDimension(a)])
    ) as AiIntelligenceOutput["dimensions"],
    key_factors: keyFactors,
    concerns: concernFactors.slice(0, 5),
    explanation: explanationParts.join(" "),
  };

  return {
    output,
    dimensionScores,
    overallPriority: priority,
    confidence: computeConfidence(input, conflicts),
    conflicts,
  };
}








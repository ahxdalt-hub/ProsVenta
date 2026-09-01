// ============================================================================
// Prosventa Signals — Leadership Role Normalization
// Feature 3 — Phase 2: Real Signal Detection
// ============================================================================
// Title variations that describe the SAME real-world role map to ONE
// normalized category:
//   "Vice President of Sales" / "VP Sales" / "VP, Sales" / "Head of Sales"
//       → vp_sales
//
// This prevents every title spelling from becoming a separate signal type.
// Unknown titles normalize to "other_executive" — never dropped silently and
// never invented.
// ============================================================================

export type NormalizedLeadershipRole =
  | "ceo"
  | "cro"
  | "coo"
  | "cfo"
  | "cmo"
  | "cto"
  | "vp_sales"
  | "head_of_sales"
  | "vp_marketing"
  | "head_of_growth"
  | "other_executive";

const ROLE_RULES: Array<{ role: NormalizedLeadershipRole; patterns: RegExp[] }> = [
  { role: "ceo", patterns: [/\bchief executive officer\b/i, /^ceo\b|\bceo\b/i] },
  { role: "cro", patterns: [/\bchief revenue officer\b/i, /\bcro\b/i] },
  { role: "coo", patterns: [/\bchief operating officer\b/i, /\bcoo\b/i] },
  { role: "cfo", patterns: [/\bchief financial officer\b/i, /\bcfo\b/i] },
  { role: "cmo", patterns: [/\bchief marketing officer\b/i, /\bcmo\b/i] },
  { role: "cto", patterns: [/\bchief technology officer\b/i, /\bcto\b/i] },
  {
    role: "vp_sales",
    patterns: [
      /\bvice president of sales\b/i,
      /\bvp[.,\s]+sales\b/i,
      /\bvp of sales\b/i,
      /\bsales director\b/i,
    ],
  },
  {
    role: "head_of_sales",
    patterns: [/\bhead of sales\b/i],
  },
  {
    role: "vp_marketing",
    patterns: [
      /\bvice president of marketing\b/i,
      /\bvp[.,\s]+marketing\b/i,
      /\bvp of marketing\b/i,
    ],
  },
  {
    role: "head_of_growth",
    patterns: [/\bhead of growth\b/i, /\bgrowth lead\b/i],
  },
];

/**
 * Normalizes a raw job title into a leadership role category.
 * Returns null for empty input — callers decide how to treat unknown titles.
 */
export function normalizeLeadershipRole(titleRaw: string | null | undefined): NormalizedLeadershipRole | null {
  if (!titleRaw || !titleRaw.trim()) return null;
  for (const rule of ROLE_RULES) {
    if (rule.patterns.some((p) => p.test(titleRaw))) return rule.role;
  }
  return titleLooksExecutive(titleRaw) ? "other_executive" : null;
}

function titleLooksExecutive(title: string): boolean {
  return /\b(chief|president|vp|vice president|director|head of)\b/i.test(title);
}

/** Whether a signal type's person/role requirements are met by this role. */
export function isSalesRelevantRole(role: NormalizedLeadershipRole): boolean {
  return (
    role === "vp_sales" ||
    role === "head_of_sales" ||
    role === "cro" ||
    role === "vp_marketing" ||
    role === "head_of_growth" ||
    role === "ceo"
  );
}

export const NORMALIZED_ROLE_LABELS: Record<NormalizedLeadershipRole, string> = {
  ceo: "Chief Executive Officer",
  cro: "Chief Revenue Officer",
  coo: "Chief Operating Officer",
  cfo: "Chief Financial Officer",
  cmo: "Chief Marketing Officer",
  cto: "Chief Technology Officer",
  vp_sales: "VP Sales",
  head_of_sales: "Head of Sales",
  vp_marketing: "VP Marketing",
  head_of_growth: "Head of Growth",
  other_executive: "Executive",
};

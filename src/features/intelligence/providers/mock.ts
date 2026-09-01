// Prosventa Development Mock Intelligence Provider
// Stage 5 - Phase 1: Intelligence Foundation
//
// DEV-ONLY: Returns deterministic sample data so the UI and service layer can
// be tested WITHOUT spending API credits. Never enabled in production.
//
// Enable in development: INTELLIGENCE_ENABLE_MOCK=true
// Registration is explicit and idempotent (see registerMockProviderIfEnabled).

import type {
  IntelligenceProvider,
  IntelligenceProviderConfig,
  CompanyEnrichmentInput,
  CompanyEnrichmentResult,
  ProspectEnrichmentInput,
  ProspectEnrichmentResult,
  CompanyResearchInput,
  ProspectResearchInput,
  ProspectResearchResult,
  SignalsInput,
  SignalsResult,
} from "../types";
import type { CompanyResearchResult } from "../research/types";
import { isMockProviderEnabled } from "../config";
import { intelligenceProviderRegistry } from "./registry";

export const MOCK_PROVIDER_ID = "mock";

const MOCK_CONFIG: IntelligenceProviderConfig = {
  id: MOCK_PROVIDER_ID,
  name: "Development Mock Provider",
  description:
    "Deterministic sample data for development/testing. Never enabled in production.",
  requiresApiKey: false,
  enabled: false,
  supportedOperations: [
    "company_enrichment",
    "prospect_enrichment",
    "company_research",
    "prospect_research",
    "signals",
  ],
  capabilities: [
    "company_enrichment",
    "person_enrichment",
    "company_research",
    "person_research",
    "technology_data",
    "contact_data",
    "business_signals",
  ],
};

const INDUSTRIES = [
  "Software",
  "Healthcare",
  "Financial Services",
  "Manufacturing",
  "Retail",
  "Logistics",
  "Energy",
  "Education",
];

const TECH_STACK = ["react", "node.js", "postgresql", "aws", "docker", "kubernetes"];

function seedFromDomain(domain: string): number {
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = (hash * 31 + domain.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pick<T>(items: T[], seed: number): T {
  return items[seed % items.length];
}

function domainToCompanyName(domain: string): string {
  const parts = domain.split(".");
  const root = parts.length > 1 ? parts[parts.length - 2] : parts[0];
  return root.charAt(0).toUpperCase() + root.slice(1);
}

class MockIntelligenceProvider implements IntelligenceProvider {
  getConfig(): IntelligenceProviderConfig {
    return MOCK_CONFIG;
  }

  async enrichCompany(input: CompanyEnrichmentInput): Promise<CompanyEnrichmentResult> {
    this.assertEnabled();
    const domain = input.domain.toLowerCase();
    const seed = seedFromDomain(domain);
    const name = input.companyName ?? domainToCompanyName(domain);

    return {
      companyName: name,
      domain,
      website: `https://${domain}`,
      description: `Mock company description for ${name}. Deterministic sample data for development.`,
      industry: pick(INDUSTRIES, seed),
      employeeCount: 50 + (seed % 450),
      employeeRange: "51-200",
      headquarters: pick(["San Francisco, CA", "New York, NY", "Austin, TX"], seed),
      country: "US",
      city: "San Francisco",
      companyType: "Private",
      foundedYear: 2000 + (seed % 24),
      logoUrl: null,
      linkedin: null,
      revenue: null,
      technologies: TECH_STACK.slice(0, 2 + (seed % 3)),
      confidence: 100,
    };
  }

  async enrichProspect(input: ProspectEnrichmentInput): Promise<ProspectEnrichmentResult> {
    this.assertEnabled();
    const seed = seedFromDomain(input.domain ?? input.contactEmail ?? "unknown");
    const company = input.companyName ?? "Mock Company";

    return {
      contactName: input.contactName ?? "Mock Contact",
      firstName: input.contactName?.split(" ")[0] ?? "Mock",
      lastName: input.contactName?.split(" ").slice(1).join(" ") ?? "Contact",
      contactEmail: input.contactEmail ?? `mock@${input.domain ?? "example.com"}`,
      contactPhone: null,
      jobTitle: pick(["VP of Sales", "Head of Marketing", "CTO"], seed),
      seniority: pick(["VP", "Director", "C-level"], seed),
      department: "Sales",
      companyName: company,
      companyDomain: input.domain ?? null,
      linkedin: null,
      profileUrl: null,
      location: "San Francisco, CA",
      country: "US",
      city: "San Francisco",
      summary: `Mock professional summary for ${company}. Deterministic sample data.`,
      confidence: 100,
    };
  }

  async researchCompany(input: CompanyResearchInput): Promise<CompanyResearchResult> {
    this.assertEnabled();
    const domain = input.domain.toLowerCase();
    const seed = seedFromDomain(domain);
    const name = input.companyName ?? domainToCompanyName(domain);

    return {
      overview: `Mock research overview for ${name}. Deterministic sample data for development.`,
      whatTheyDo: `Mock description of what ${name} does.`,
      productsServices: ["Mock Product A", "Mock Product B"],
      targetCustomers: "Mock target customers",
      industry: pick(INDUSTRIES, seed),
      businessModel: "B2B",
      companySize: "51-200",
      headquarters: "San Francisco, CA",
      businessContext: "Mock business context",
      notableInfo: ["Deterministic sample data"],
      salesRelevance: "Mock sales relevance",
      confidence: { score: 100, level: "high", label: "High" },
      sources: [
        {
          type: "enrichment",
          name: "Development Mock Provider",
          url: `https://${domain}`,
          retrievedAt: new Date().toISOString(),
          provider: MOCK_PROVIDER_ID,
        },
      ],
      researchedAt: new Date().toISOString(),
    };
  }

  async researchProspect(input: ProspectResearchInput): Promise<ProspectResearchResult> {
    this.assertEnabled();
    return {
      summary: `Mock research summary for ${input.contactName ?? "prospect"}. Deterministic sample data.`,
      highlights: ["Deterministic sample highlight"],
      confidence: 100,
    };
  }

  async getSignals(input: SignalsInput): Promise<SignalsResult> {
    this.assertEnabled();
    return {
      signals: [
        {
          type: "hiring",
          title: "Mock hiring signal",
          description: `Deterministic sample buying-intent signal for ${input.domain}.`,
          detectedAt: new Date().toISOString(),
          confidence: 100,
        },
      ],
      confidence: 100,
    };
  }

  private assertEnabled(): void {
    if (!isMockProviderEnabled()) {
      throw new Error(
        "Mock intelligence provider is disabled. Set INTELLIGENCE_ENABLE_MOCK=true in development."
      );
    }
  }
}

/**
 * Registers the mock provider when explicitly enabled for development.
 * Returns true when registered, false when skipped (production or disabled).
 */
export function registerMockProviderIfEnabled(): boolean {
  if (!isMockProviderEnabled()) return false;
  const existing = intelligenceProviderRegistry.getProvider(MOCK_PROVIDER_ID);
  if (!existing) {
    intelligenceProviderRegistry.register(new MockIntelligenceProvider());
  }
  return true;
}

export const mockIntelligenceProvider = new MockIntelligenceProvider();
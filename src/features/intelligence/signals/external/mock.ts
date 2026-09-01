// ============================================================================
// Prosventa Development Mock External Signal Provider
// Stage 6 - Phase 5: External Business Signal Engine
// ============================================================================
// DEV-ONLY. Deterministic sample events so the full external-signal pipeline
// can be exercised without spending API credits. Never enabled in production.
//
// TRUST RULES HONOURED:
//  - Every mock event is clearly labelled as development sample data.
//  - sourceUrl stays null (no fake URLs); evidence states it is not real data.
//  - It is never presented as real intelligence anywhere in the UI.
//
// Enable in development only: INTELLIGENCE_ENABLE_MOCK=true
// ============================================================================

import { isMockProviderEnabled } from "../../config";
import type {
  ExternalSignal,
  ExternalSignalDetectionRequest,
  ExternalSignalProvider,
  ExternalSignalProviderConfig,
} from "./types";

export const MOCK_EXTERNAL_SIGNALS_PROVIDER_ID = "mock-signals";

function seedFrom(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return hash;
}

class MockExternalSignalProvider implements ExternalSignalProvider {
  getConfig(): ExternalSignalProviderConfig {
    return {
      id: MOCK_EXTERNAL_SIGNALS_PROVIDER_ID,
      name: "Development Mock Signals",
      description:
        "Deterministic sample business signals for development/testing. Clearly labelled; never real intelligence.",
      capabilities: ["business_signals"],
    };
  }

  async detectExternalSignals(request: ExternalSignalDetectionRequest): Promise<ExternalSignal[]> {
    this.assertEnabled();

    const key = request.domain ?? request.companyName ?? "";
    if (!key) return [];

    const seed = seedFrom(key.toLowerCase());
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;

    // Deterministic small set: one recent event + one older event per company.
    const templates = [
      {
        providerSignalId: `mock-${seed}-hiring-1`,
        eventTypeRaw: "department_hiring",
        title: "Development sample: engineering hiring activity detected",
        description: `Sample hiring event for ${key}. Development mock data - NOT real intelligence.`,
        publishedAt: new Date(now - 2 * DAY).toISOString(),
        confidence: "medium" as const,
      },
      {
        providerSignalId: `mock-${seed}-funding-1`,
        eventTypeRaw: "funding_round",
        title: "Development sample: funding round reported",
        description: `Sample funding event for ${key}. Development mock data - NOT real intelligence.`,
        publishedAt: new Date(now - 45 * DAY).toISOString(),
        confidence: "low" as const,
      },
    ];

    return templates.map((t) => ({
      providerSignalId: t.providerSignalId,
      eventTypeRaw: t.eventTypeRaw,
      title: t.title,
      description: t.description,
      sourceUrl: null, // never invent URLs
      sourceName: `${MOCK_EXTERNAL_SIGNALS_PROVIDER_ID} (development sample data)`,
      publishedAt: t.publishedAt,
      retrievedAt: new Date(now).toISOString(),
      confidence: t.confidence,
      raw: { mock: true, seed },
    }));
  }

  private assertEnabled(): void {
    if (!isMockProviderEnabled()) {
      throw new Error(
        "Mock external signal provider is disabled. Set INTELLIGENCE_ENABLE_MOCK=true in development."
      );
    }
  }
}

export const mockExternalSignalProvider = new MockExternalSignalProvider();

import { registerExternalSignalProvider } from "./registry";

/** Registers the dev-only mock signals provider when explicitly enabled. */
export function registerMockSignalsProviderIfEnabled(): boolean {
  if (!isMockProviderEnabled()) return false;
  registerExternalSignalProvider(mockExternalSignalProvider);
  return true;
}

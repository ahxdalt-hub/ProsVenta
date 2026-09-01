// ============================================================================
// Prosventa Signals — Central Signal Type Registry
// Feature 3 — Phase 1: Signal Foundation & Data Architecture
// ============================================================================
// Single source of truth for what a signal TYPE is. Signal type names and their
// meaning live here — never scattered independently across components.
//
// A signal is a MEASURABLE, time-associated event or change connected to a
// prospect or company, supported by evidence from an actual data source. It is
// NOT an AI guess, an ICP score, a recommendation, a generic company
// description, a manually invented label, or a duplicate of enrichment data.
//
// Each type declares:
//   * category            → coarse grouping (company/prospect/activity change)
//   * displayName          → human label used in the UI
//   * description          → what this type means (grounding language)
//   * severity             → baseline importance (not certainty)
//   * supportedEntity      → the primary entity this type belongs to
//   * evidenceRequired     → what a provider must supply for type validity
//   * providerCapabilities → which provider capabilities can produce it
//
// New signal types are added here without rebuilding the rest of the UI.
// ============================================================================

import type { SignalType, SignalCategory, SignalImportance } from "./types";
import type { ProviderCapability } from "../capabilities";

export type SignalEntity = "prospect" | "company";

export interface SignalTypeDefinition {
  /** Canonical signal type id (union member in ./types) */
  signalType: SignalType;
  category: SignalCategory;
  displayName: string;
  description: string;
  /** Baseline severity/importance when the type is observed */
  severity: SignalImportance;
  /** The entity a signal of this type primarily belongs to */
  supportedEntity: SignalEntity;
  /** What evidence must be present for this type to be honest/valid */
  evidenceRequired: string[];
  /** Provider capabilities that can produce this type (empty = internal only) */
  providerCapabilities: ProviderCapability[];
}

// ============================================================================
// Canonical Definitions
// ============================================================================

export const SIGNAL_TYPE_DEFINITIONS: Record<SignalType, SignalTypeDefinition> = {
  // --------------------------------------------------------------------------
  // Company growth
  // --------------------------------------------------------------------------
  company_growth: {
    signalType: "company_growth",
    category: "company_change",
    displayName: "Company growth",
    description:
      "Observable growth in a company's operations or scale (e.g. headcount, revenue-stage change).",
    severity: "medium",
    supportedEntity: "company",
    evidenceRequired: ["A dated, cited growth metric from a real data source."],
    providerCapabilities: ["business_signals"],
  },
  hiring_activity: {
    signalType: "hiring_activity",
    category: "company_change",
    displayName: "Hiring activity",
    description:
      "Significant or relevant hiring activity by a company (surge, department hiring, open roles).",
    severity: "medium",
    supportedEntity: "company",
    evidenceRequired: ["Source record listing hiring jobs/roles with a date."],
    providerCapabilities: ["business_signals"],
  },

  // --------------------------------------------------------------------------
  // Leadership changes
  // --------------------------------------------------------------------------
  leadership_change: {
    signalType: "leadership_change",
    category: "company_change",
    displayName: "Leadership change",
    description:
      "A new executive or key leader (sales/marketing/founder/owner) — an appointment or departure.",
    severity: "high",
    supportedEntity: "company",
    evidenceRequired: [
      "A cited source (announcement/profile) naming the person and role.",
    ],
    providerCapabilities: ["business_signals"],
  },

  // --------------------------------------------------------------------------
  // Business/company events
  // --------------------------------------------------------------------------
  company_expansion: {
    signalType: "company_expansion",
    category: "company_change",
    displayName: "Company expansion",
    description:
      "Expansion activity such as new offices, markets, or lines of business, backed by a source.",
    severity: "medium",
    supportedEntity: "company",
    evidenceRequired: ["A source describing the expansion and its date."],
    providerCapabilities: ["business_signals"],
  },
  new_location: {
    signalType: "new_location",
    category: "company_change",
    displayName: "New location",
    description: "The company opened or announced a new office/location.",
    severity: "low",
    supportedEntity: "company",
    evidenceRequired: ["A source citing the new location and date."],
    providerCapabilities: ["business_signals"],
  },
  product_announcement: {
    signalType: "product_announcement",
    category: "company_change",
    displayName: "Product announcement",
    description:
      "A meaningful company announcement (product, major corporate event).",
    severity: "medium",
    supportedEntity: "company",
    evidenceRequired: ["A cited announcement with an event date."],
    providerCapabilities: ["business_signals", "technology_data"],
  },
  funding_event: {
    signalType: "funding_event",
    category: "company_change",
    displayName: "Funding event",
    description:
      "A funding round, investment, acquisition or merger — a major corporate event with a source.",
    severity: "high",
    supportedEntity: "company",
    evidenceRequired: [
      "A cited source naming the event, amount/stage, and date.",
    ],
    providerCapabilities: ["business_signals"],
  },

  // --------------------------------------------------------------------------
  // Person changes
  // --------------------------------------------------------------------------
  job_change: {
    signalType: "job_change",
    category: "professional_change",
    displayName: "Job change",
    description:
      "A prospect changed employers; a real move (from → to) with identity evidence.",
    severity: "medium",
    supportedEntity: "prospect",
    evidenceRequired: ["Source record tying the prospect to the new employer."],
    providerCapabilities: [],
  },
  role_change: {
    signalType: "role_change",
    category: "professional_change",
    displayName: "Role change",
    description:
      "A prospect received a new role or a promotion within a company.",
    severity: "medium",
    supportedEntity: "prospect",
    evidenceRequired: [
      "Source record showing the old and new role for the prospect.",
    ],
    providerCapabilities: [],
  },
  company_change: {
    signalType: "company_change",
    category: "professional_change",
    displayName: "Company change",
    description: "A prospect's associated company changed.",
    severity: "medium",
    supportedEntity: "prospect",
    evidenceRequired: ["Source record showing the company change and date."],
    providerCapabilities: [],
  },
  profile_update: {
    signalType: "profile_update",
    category: "professional_change",
    displayName: "Profile update",
    description:
      "The prospect's profile/identity updated, grounded in enrichment data.",
    severity: "low",
    supportedEntity: "prospect",
    evidenceRequired: ["Enrichment record reflecting the update."],
    providerCapabilities: [],
  },

  // --------------------------------------------------------------------------
  // Prosventa activity (product usage — NOT buying intent)
  // --------------------------------------------------------------------------
  prospect_imported: {
    signalType: "prospect_imported",
    category: "prosventa_activity",
    displayName: "Prospect imported",
    description: "A prospect was imported into Prosventa by the user.",
    severity: "low",
    supportedEntity: "prospect",
    evidenceRequired: ["Prosventa import activity record."],
    providerCapabilities: [],
  },
  company_enriched: {
    signalType: "company_enriched",
    category: "prosventa_activity",
    displayName: "Company enriched",
    description: "Company enrichment completed for a prospect's company.",
    severity: "low",
    supportedEntity: "company",
    evidenceRequired: ["Enrichment activity record."],
    providerCapabilities: [],
  },
  prospect_researched: {
    signalType: "prospect_researched",
    category: "prosventa_activity",
    displayName: "Prospect researched",
    description: "Research was performed on a prospect.",
    severity: "low",
    supportedEntity: "prospect",
    evidenceRequired: ["Research activity record."],
    providerCapabilities: ["person_research", "company_research"],
  },
  score_changed: {
    signalType: "score_changed",
    category: "prosventa_activity",
    displayName: "Score changed",
    description: "A prospect's score changed over time (ICP scoring).",
    severity: "low",
    supportedEntity: "prospect",
    evidenceRequired: ["Score history record."],
    providerCapabilities: [],
  },
  prospect_saved: {
    signalType: "prospect_saved",
    category: "prosventa_activity",
    displayName: "Prospect saved",
    description: "A prospect was saved to a list by the user.",
    severity: "low",
    supportedEntity: "prospect",
    evidenceRequired: ["Prosventa save activity record."],
    providerCapabilities: [],
  },
};

// ============================================================================
// Registry Helpers
// ============================================================================

/** Canonical list of all registered signal types. */
export function getRegisteredSignalTypes(): SignalType[] {
  return Object.keys(SIGNAL_TYPE_DEFINITIONS) as SignalType[];
}

/** Returns the definition for a type, or null if unknown/not registered. */
export function getSignalTypeDefinition(
  signalType: SignalType
): SignalTypeDefinition | null {
  return SIGNAL_TYPE_DEFINITIONS[signalType] ?? null;
}

/** Returns all signal types that belong to a given entity. */
export function getSignalTypesByEntity(entity: SignalEntity): SignalType[] {
  return getRegisteredSignalTypes().filter(
    (t) => SIGNAL_TYPE_DEFINITIONS[t].supportedEntity === entity
  );
}

/** Returns all signal types a given provider capability can produce. */
export function getSignalTypesByCapability(
  capability: ProviderCapability
): SignalType[] {
  return getRegisteredSignalTypes().filter((t) =>
    SIGNAL_TYPE_DEFINITIONS[t].providerCapabilities.includes(capability)
  );
}

/** Returns all signal types visible in a category. */
export function getSignalTypesByCategory(
  category: SignalCategory
): SignalType[] {
  return getRegisteredSignalTypes().filter(
    (t) => SIGNAL_TYPE_DEFINITIONS[t].category === category
  );
}

/** Whether a string is a registered signal type. */
export function isSignalTypeKnown(value: string): value is SignalType {
  return Object.prototype.hasOwnProperty.call(SIGNAL_TYPE_DEFINITIONS, value);
}
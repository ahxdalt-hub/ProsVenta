// ============================================================================
// Prosventa Prospect Feature
// Stage 2 — Phase 7/8/9: Discovery, Processing & Management
// ============================================================================
// Unified export point for the prospect discovery, processing, import,
// and management features.
// ============================================================================

// Discovery (Phase 7)
export * from "./types/discovery";
export * from "./providers/types";
export * from "./providers/registry";
export * from "./services/discovery";
export * from "./actions/discovery";

// Processing & Enrichment (Phase 8)
export * from "./types/prospect";
export * from "./services/prospect-normalizer";
export * from "./services/prospect-validator";
export * from "./services/prospect-processor";

// Import Foundation (Phase 8)
export * from "./imports";

// Search, Filtering & Management (Phase 9)
export * from "./types/query";
export * from "./actions/manage";
export * from "./actions/lists";
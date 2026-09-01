// ============================================================================
// Prosventa Intelligence — Reusable Action Window (public API)
// ============================================================================
export {
  IntelligenceActionHostProvider,
  useIntelligenceActionWindow,
} from "./host";
export { getIntelligenceActionConfig, getIntelligenceActionCost } from "./config";
export type {
  IntelligenceActionKind,
  IntelligenceActionRequest,
  IntelligenceActionContext,
  IntelligenceTarget,
  IntelligenceWindowPhase,
} from "./types";
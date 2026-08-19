// ============================================================================
// Prosventa AI Sales Assistant — Public API
// Stage 3 — Phase 8: AI-Powered Sales Workspace
// ============================================================================
// Centralized exports for the AI Sales Assistant feature.
// Future AI capabilities (voice, email writing, meeting summaries,
// proposal generation, CRM automation) can be added here.
// ============================================================================

export * from "./types";
export * from "./engine";
export { AIAssistant } from "./components/AIAssistant";
export {
  ActionButton,
  QuickActionsRow,
  SuggestionCard,
  RiskCard,
  SummaryCard,
  TimelineCard,
  RecommendationCard,
  RiskListCard,
  MessageContent,
  PriorityBadge,
  SeverityBadge,
} from "./components/cards";
export {
  SparkleIcon,
  SendIcon,
  RiskIcon,
  CheckIcon,
  WarningIcon,
  ClockIcon,
  TargetIcon,
  BuildingIcon,
  TrendIcon,
  CalendarIcon,
  UserIcon,
  MailIcon,
  PhoneIcon,
  SearchIcon,
  MiniCloseIcon,
  MinusIcon,
  MaximizeIcon,
} from "./components/icons";
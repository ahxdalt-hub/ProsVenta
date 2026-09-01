export {
  cleanValue,
  isValidEmail,
  isValidHttpUrl,
  parseEmployeeCount,
  normalizeEmployeeRange,
  normalizeCompanyName,
  companyNameIdentityKey,
  normalizeFoundedYear,
  normalizeTimestamp,
  isValidProviderId,
} from "./values";

export { normalizeCompanyPayload } from "./company";
export type { NormalizedCompany } from "./company";

export {
  normalizePersonPayload,
  normalizePersonName,
  normalizeSeniority,
  deriveSeniorityFromTitle,
  categorizeJobTitle,
} from "./person";
export type {
  NormalizedPerson,
  JobTitleCategory,
  SeniorityLevel,
} from "./person";

export {
  resolveConflict,
  detectCustomerProviderConflicts,
} from "./source-priority";
export type {
  ValueOrigin,
  SourcedValue,
  ConflictResolution,
  FieldConflict,
} from "./source-priority";

export {
  buildCompanyIdentity,
  compareCompanyIdentity,
  comparePersonIdentity,
  buildSafeMergePlan,
} from "./dedupe";
export type {
  CompanyIdentity,
  PersonIdentity,
  MatchStrength,
  SafeMergePlan,
  FieldMergeDecision,
} from "./dedupe";

export {
  computeDataQualityStatus,
  computeVerificationLevel,
  DATA_QUALITY_EXPLANATIONS,
  explainField,
  DEFAULT_DATA_QUALITY_MAX_AGE_MS,
} from "./status";
export type {
  DataQualityStatus,
  VerificationLevel,
  QualityStatusInput,
  FieldProvenanceExplanation,
} from "./status";


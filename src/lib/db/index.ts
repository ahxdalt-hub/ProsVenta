// ============================================================================
// Prosventa Database Helpers
// Stage 2 - Phase 6: Core Product Foundation & Prospect Workspace
// ============================================================================
// Re-exports all database helper functions for convenient imports.
// Example: import { getProfile, getProspects } from "@/lib/db";
// ============================================================================

export {
  getProfile,
  updateProfile,
  getProfileById,
} from "./profiles";

export {
  getUserSettings,
  updateUserSettings,
} from "./user-settings";

export {
  ensureOrganization,
  getOrganizationDetails,
  getOrganizationId,
  updateOrganization,
  getOrganizationMembers,
  updateMemberRole,
  removeMember,
  getMemberCount,
} from "./organizations";

export {
  getProspects,
  getProspect,
  queryProspects,
  getDistinctIndustries,
  getDistinctCountries,
  createProspect,
  createProspects,
  updateProspect,
  updateProspectStatus,
  deleteProspect,
  getProspectCount,
  updateProspectEnrichmentStatus,
} from "./prospects";

export {
  getSavedLists,
  getSavedList,
  createSavedList,
  updateSavedList,
  deleteSavedList,
  getSavedListItems,
  addToList,
  removeFromList,
  getSavedListCount,
  getSavedListWithProspects,
} from "./lists";

export {
  getProspectNotes,
  createProspectNote,
  deleteProspectNote,
} from "./notes";

export {
  getProspectSearches,
  getProspectSearch,
  createProspectSearch,
  updateProspectSearch,
  deleteProspectSearch,
  getProspectSearchCount,
} from "./prospect-searches";

export {
  createImportHistory,
  updateImportHistory,
  getImportHistory,
  deleteImportHistory,
  createExportHistory,
  updateExportHistory,
  getExportHistory,
  deleteExportHistory,
} from "./io";

export {
  getIntelligenceRecords,
  createIntelligenceRecord,
  createIntelligenceJob,
  updateIntelligenceJob,
  getIntelligenceJobs,
  recordIntelligenceUsage,
  getCompanyEnrichment,
  upsertCompanyEnrichment,
  updateCompanyEnrichment,
  getProspectEnrichment,
  upsertProspectEnrichment,
  updateProspectEnrichment,
} from "./intelligence";

export {
  getCompanyResearch,
  upsertCompanyResearch,
  updateCompanyResearch,
} from "./company-research";

export {
  getProspectResearch,
  upsertProspectResearch,
  updateProspectResearch,
} from "./prospect-research";

export {
  getIcpConfiguration,
  getIcpConfigurationById,
  createIcpConfiguration,
  updateIcpConfiguration,
  deleteIcpConfiguration,
  getProspectScore,
  upsertProspectScore,
  updateProspectScore,
  deleteProspectScore,
} from "./icp-scoring";

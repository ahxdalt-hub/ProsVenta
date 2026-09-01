// ============================================================================
// Prosventa Import & Export Center
// Stage 3 — Phase 6
// ============================================================================

export { default as ExportClient } from "./components/ExportClient";

export { parseFile, validateFile, objectToCSV } from "./import/parser";
export {
  exportProspects,
  generateCSV,
  generateExcel,
  openPDFExport,
  downloadBlob,
  buildExportFileName,
} from "./export/generator";

export {
  autoMapColumn,
  PROSPECT_FIELDS,
  FIELD_ALIASES,
} from "./types";

export type {
  ImportFileType,
  ImportStatus,
  DuplicateStrategy,
  ParsedFile,
  ImportRow,
  ImportError,
  ImportSummary,
  ImportProgress,
  ColumnMapping,
  ImportFileValidation,
  ExportFormat,
  ExportScope,
  ExportStatus,
  ExportOptions,
  ExportProgress,
  ExportResult,
  ImportHistoryRecord,
  ExportHistoryRecord,
} from "./types";

export {
  createImportHistory,
  updateImportHistory,
  getImportHistory,
  deleteImportHistory,
  createExportHistory,
  updateExportHistory,
  getExportHistory,
  deleteExportHistory,
} from "@/lib/db/io";
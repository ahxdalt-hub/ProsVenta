// ============================================================================
// Prosventa Import & Export Center Types
// Stage 3 — Phase 6: Import & Export Center
// ============================================================================

// ============================================================================
// Import Types
// ============================================================================

export type ImportFileType = "csv" | "xlsx" | "xls" | "google_sheets" | "notion" | "api";
export type ImportStatus = "processing" | "completed" | "failed" | "cancelled";
export type DuplicateStrategy = "skip" | "replace" | "update" | "keep_both";

export interface ParsedFile {
  fileName: string;
  fileSize: number;
  fileType: ImportFileType;
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
  /** Number of rows found inside the file that duplicated another row on a
   *  company/email/website key. These are dropped during parsing. */
  duplicateCount?: number;
  /** Up to 5 of the duplicate keys found, for user-friendly messaging. */
  duplicateSample?: string[];
}

export interface ImportRow {
  rowNumber: number;
  data: Record<string, string>;
  isValid: boolean;
  errors: string[];
}

export interface ImportError {
  row: number;
  message: string;
  column?: string;
}

export interface ImportSummary {
  imported: number;
  skipped: number;
  updated: number;
  failed: number;
  duplicates: number;
}

export interface ImportProgress {
  rowsImported: number;
  rowsRemaining: number;
  estimatedTime: number;
  errors: ImportError[];
  progress: number;
}

export interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  matched: boolean;
}

export interface ImportFileValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// Export Types
// ============================================================================

export type ExportFormat = "csv" | "xlsx" | "pdf" | "google_sheets" | "notion" | "crm";
export type ExportScope = "all" | "filtered" | "favorites" | "saved_view" | "selected";
export type ExportStatus = "processing" | "completed" | "failed";

export interface ExportOptions {
  format: ExportFormat;
  scope: ExportScope;
  savedViewId?: string;
  includeColumns?: string[];
}

export interface ExportProgress {
  stage: "preparing" | "generating" | "download_ready";
  progress: number;
  message: string;
}

export interface ExportResult {
  fileName: string;
  rows: number;
  format: ExportFormat;
  durationMs: number;
}

// ============================================================================
// History Types
// ============================================================================

export interface ImportHistoryRecord {
  id: string;
  organization_id: string;
  created_by: string;
  file_name: string;
  file_size: number;
  file_type: ImportFileType;
  status: ImportStatus;
  total_rows: number;
  imported_rows: number;
  skipped_rows: number;
  updated_rows: number;
  failed_rows: number;
  duplicate_rows: number;
  errors: ImportError[];
  column_mapping: Record<string, string>;
  duplicate_strategy: DuplicateStrategy;
  duration_ms: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface ExportHistoryRecord {
  id: string;
  organization_id: string;
  created_by: string;
  file_name: string;
  format: ExportFormat;
  status: ExportStatus;
  scope: ExportScope;
  saved_view_id: string | null;
  total_rows: number;
  duration_ms: number | null;
  created_at: string;
  completed_at: string | null;
}

// ============================================================================
// Prospect Fields for Mapping
// ============================================================================

export const PROSPECT_FIELDS: { value: string; label: string; required?: boolean }[] = [
  { value: "company_name", label: "Company", required: true },
  { value: "name", label: "Contact Name" },
  { value: "contact_email", label: "Email" },
  { value: "contact_phone", label: "Phone" },
  { value: "website", label: "Website" },
  { value: "industry", label: "Industry" },
  { value: "country", label: "Country" },
  { value: "city", label: "City" },
  { value: "description", label: "Description" },
  { value: "employee_count", label: "Employees" },
  { value: "status", label: "Status" },
  { value: "priority", label: "Priority" },
  { value: "tags", label: "Tags" },
  { value: "lead_score", label: "Lead Score" },
];

export const FIELD_ALIASES: Record<string, string> = {
  company: "company_name",
  company_name: "company_name",
  organization: "company_name",
  organization_name: "company_name",
  business: "company_name",
  contact: "name",
  contact_name: "name",
  name: "name",
  first_name: "name",
  full_name: "name",
  email: "contact_email",
  email_address: "contact_email",
  contact_email: "contact_email",
  phone: "contact_phone",
  phone_number: "contact_phone",
  contact_phone: "contact_phone",
  url: "website",
  site: "website",
  web: "website",
  website: "website",
  domain: "website",
  sector: "industry",
  vertical: "industry",
  industry: "industry",
  country: "country",
  nation: "country",
  city: "city",
  state: "city",
  location: "city",
  description: "description",
  about: "description",
  employees: "employee_count",
  employee_count: "employee_count",
  size: "employee_count",
  team_size: "employee_count",
  company_size: "employee_count",
  status: "status",
  stage: "status",
  priority: "priority",
  tags: "tags",
  labels: "tags",
  lead_score: "lead_score",
  score: "lead_score",
};

export function autoMapColumn(columnName: string): string | null {
  const normalized = columnName.toLowerCase().trim().replace(/\s+/g, "_");
  return FIELD_ALIASES[normalized] ?? null;
}
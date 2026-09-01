// ============================================================================
// Prosventa Import — Field definitions (Phase 3 rebuild)
// ============================================================================
// The ONLY prospect fields actually persisted by the import server action.
// Kept intentionally small and accurate: the backend's mapRowToInput maps
// exactly these columns into the prospect pipeline — never invent fields the
// backend can't write.
// ============================================================================

export interface ImportField {
  value: string;
  label: string;
  helper?: string;
  required?: boolean;
}

export const IMPORT_FIELDS: ImportField[] = [
  {
    value: "company_name",
    label: "Company",
    helper: "Required — each row needs a company name.",
    required: true,
  },
  { value: "website", label: "Website", helper: "Homepage URL for the company." },
  { value: "industry", label: "Industry" },
  { value: "country", label: "Country" },
  { value: "city", label: "City" },
  { value: "employee_count", label: "Employees", helper: "Company size as a number." },
  { value: "description", label: "Description", helper: "Short company overview." },
];

export const IMPORT_FIELD_ALIASES: Record<string, string> = {
  company: "company_name",
  company_name: "company_name",
  companyname: "company_name",
  organization: "company_name",
  organization_name: "company_name",
  business: "company_name",
  website: "website",
  url: "website",
  site: "website",
  web: "website",
  domain: "website",
  homepage: "website",
  industry: "industry",
  sector: "industry",
  vertical: "industry",
  country: "country",
  nation: "country",
  city: "city",
  state: "city",
  location: "city",
  employees: "employee_count",
  employee_count: "employee_count",
  employeecount: "employee_count",
  size: "employee_count",
  team_size: "employee_count",
  company_size: "employee_count",
  description: "description",
  about: "description",
};

/**
 * Returns the Prosventa field a column name most likely maps to, or null when
 * the column name isn't recognised. Only matches fields the backend persists.
 */
export function autoMapImportColumn(columnName: string): string | null {
  const normalized = columnName.toLowerCase().trim().replace(/\s+/g, "_");
  return IMPORT_FIELD_ALIASES[normalized] ?? null;
}

/** The set of steps shown in the stepper, in order. */
export type ImportStep = "upload" | "mapping" | "review" | "progress" | "results";
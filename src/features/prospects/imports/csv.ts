// ============================================================================
// Prosventa CSV Import Foundation
// Stage 2 — Phase 8: Prospect Data Processing & Enrichment Foundation
// ============================================================================
// CSV import service foundation. Parses CSV rows into ProspectInput records.
// No actual file import is performed yet — this is the parsing foundation
// for a future import feature.
// ============================================================================

import type { ProspectInput } from "@/features/prospects/types/prospect";

// ============================================================================
// Column mapping
// ============================================================================
// Maps "friendly" CSV column headers to the canonical prospect fields.
const CSV_COLUMN_ALIASES = new Set([
  "name",
  "company",
  "company_name",
  "website",
  "domain",
  "industry",
  "description",
  "country",
  "city",
  "employee_count",
  "employees",
  "size",
]);

/**
 * Parses a raw CSV string into an array of ProspectInput records.
 * Expects a header row as the first line.
 *
 * NOTE: This is the foundation for a future CSV import feature.
 * Actual file handling (uploads, storage, progress) is not implemented.
 */
export function parseCsvToProspectInputs(csv: string): ProspectInput[] {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const rows = lines.slice(1);

  const prospects: ProspectInput[] = [];

  for (const row of rows) {
    const cells = row.split(",").map((c) => c.trim());
    const record = parseRow(headers, cells);
    if (record.name) {
      prospects.push(record);
    }
  }

  return prospects;
}

/**
 * Parses a single CSV row into a ProspectInput.
 * Ignores unknown columns.
 */
function parseRow(headers: string[], cells: string[]): ProspectInput {
  const data: Record<string, string> = {};

  headers.forEach((header, index) => {
    if (CSV_COLUMN_ALIASES.has(header) && cells[index] !== undefined) {
      data[header] = cells[index];
    }
  });

  return {
    name: data["name"] || data["company"] || data["company_name"] || "",
    companyName: data["company_name"] || data["company"] || data["name"] || "",
    website: data["website"] || null,
    domain: data["domain"] || null,
    industry: data["industry"] || null,
    description: data["description"] || null,
    country: data["country"] || null,
    city: data["city"] || null,
    employeeCount: parseEmployeeCount(data["employees"] || data["size"] || data["employee_count"]) ?? null,
    source: "import",
  };
}

/**
 * Parses an employee count value from CSV text.
 */
function parseEmployeeCount(value: string | undefined): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[^0-9]/g, "");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}
// ============================================================================
// Prosventa Import Parser
// Stage 3 — Phase 6: Import & Export Center
// ============================================================================
// Handles file validation, parsing (CSV + Excel), and row sanitization.
// Security: rejects dangerous files, sanitizes all imported values.
// ============================================================================

import * as XLSX from "xlsx";
import type { ParsedFile, ImportFileValidation, ImportFileType } from "../types";

// ============================================================================
// Security Constants
// ============================================================================

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ROWS = 100_000;
const MAX_COLUMNS = 100;

const ALLOWED_EXTENSIONS = new Set([
  "csv",
  "xlsx",
  "xls",
]);

const DANGEROUS_PATTERNS = [
  /<script[\s>]/i,
  /javascript:/i,
  /vbscript:/i,
  /onerror\s*=/i,
  /onclick\s*=/i,
  /onload\s*=/i,
  /data:text\/html/i,
  /%3cscript/i,
];

const INVALID_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ============================================================================
// File Validation
// ============================================================================

export function validateFile(file: File): ImportFileValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    errors.push("Unsupported file format. Please upload a CSV or Excel (.xlsx) file.");
  }

  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File is too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
  }

  if (file.size === 0) {
    errors.push("The file is empty. Please upload a file with data.");
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ============================================================================
// CSV Parsing
// ============================================================================

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      switch (char) {
        case '"':
          inQuotes = true;
          break;
        case ",":
          row.push(current.trim());
          current = "";
          break;
        case "\n":
          row.push(current.trim());
          rows.push(row);
          row = [];
          current = "";
          break;
        case "\r":
          break;
        default:
          current += char;
      }
    }
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current.trim());
    rows.push(row);
  }

  return rows;
}

// ============================================================================
// Sanitization
// ============================================================================

function sanitizeValue(value: string): string {
  if (!value) return "";

  // Trim and collapse whitespace
  let cleaned = value.trim().replace(/\s+/g, " ");

  // Strip dangerous HTML/script patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Remove NULL bytes and control characters
  cleaned = cleaned.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");

  return cleaned.trim();
}

function isValidEmail(value: string): boolean {
  return INVALID_EMAIL_PATTERN.test(value);
}

function isValidWebsite(value: string): boolean {
  return /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/i.test(value);
}

// ============================================================================
// Row Validation
// ============================================================================

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

function validateRow(
  data: Record<string, string>,
  headers: string[]
): ValidationResult {
  const errors: string[] = [];

  // Check required fields based on common mappings
  const hasCompany = headers.some((h) => {
    const normalized = h.toLowerCase().trim().replace(/\s+/g, "_");
    return ["company", "company_name", "organization", "name"].includes(normalized);
  }) && data[headers.find((h) => {
    const normalized = h.toLowerCase().trim().replace(/\s+/g, "_");
    return ["company", "company_name", "organization", "name"].includes(normalized);
  }) ?? ""];

  if (!hasCompany) {
    // Individual rows can miss company if other identifiers exist
  }

  // Validate email if present
  const emailHeader = headers.find((h) => {
    const normalized = h.toLowerCase().trim().replace(/\s+/g, "_");
    return ["email", "email_address", "contact_email"].includes(normalized);
  });

  if (emailHeader && data[emailHeader] && !isValidEmail(data[emailHeader])) {
    errors.push("Invalid email address");
  }

  // Validate website if present
  const websiteHeader = headers.find((h) => {
    const normalized = h.toLowerCase().trim().replace(/\s+/g, "_");
    return ["website", "url", "domain", "site"].includes(normalized);
  });

  if (websiteHeader && data[websiteHeader] && !isValidWebsite(data[websiteHeader])) {
    errors.push("Invalid website URL");
  }

  return { isValid: errors.length === 0, errors };
}

// ============================================================================
// Main Parse Entry
// ============================================================================

export async function parseFile(file: File): Promise<ParsedFile | null> {
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.errors[0]);
  }

  const extension = file.name.split(".").pop()?.toLowerCase() as ImportFileType;
  const buffer = await file.arrayBuffer();
  const text = new TextDecoder("utf-8").decode(buffer);

  let rawRows: string[][];
  let headers: string[];

  if (extension === "csv") {
    rawRows = parseCSV(text);
  } else {
    // Excel parsing using xlsx
    try {
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) throw new Error("No worksheet found in the Excel file.");
      rawRows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false });
    } catch {
      throw new Error("Failed to read the Excel file. Please ensure it is a valid .xlsx file.");
    }
  }

  // Filter empty rows and limit
  rawRows = rawRows.filter((row) => row.some((cell) => cell?.trim().length > 0));
  rawRows = rawRows.slice(0, MAX_ROWS);

  if (rawRows.length < 2) {
    throw new Error("The file must contain at least a header row and one data row.");
  }

  headers = rawRows[0].map((h) => sanitizeValue(h));
  const missingHeaders = headers.filter((h) => !h);
  if (missingHeaders.length > 0) {
    throw new Error("One or more columns are missing a header name.");
  }

  if (headers.length > MAX_COLUMNS) {
    throw new Error(`Too many columns (${headers.length}). Maximum is ${MAX_COLUMNS}.`);
  }

  const rows: Record<string, string>[] = [];
  const seenValues = new Set<string>();
  let duplicateCount = 0;

  for (let i = 1; i < rawRows.length; i++) {
    const rawRow = rawRows[i];
    const rowData: Record<string, string> = {};

    headers.forEach((header, index) => {
      const value = rawRow[index] ?? "";
      rowData[header] = sanitizeValue(value);
    });

    // Duplicate detection on company/email/website keys
    const companyKey = (rowData["Company"] || rowData["company"] || rowData["Company Name"] || "").toLowerCase();
    const emailKey = (rowData["Email"] || rowData["email"] || rowData["Contact Email"] || "").toLowerCase();
    const websiteKey = (rowData["Website"] || rowData["website"] || rowData["URL"] || "").toLowerCase();
    const dedupeKey = companyKey || emailKey || websiteKey;

    if (dedupeKey && seenValues.has(dedupeKey)) {
      duplicateCount++;
      continue;
    }
    if (dedupeKey) {
      seenValues.add(dedupeKey);
    }

    const { isValid, errors } = validateRow(rowData, headers);
    // Skip invalid rows silently for now, they'll be shown in preview
    rows.push({
      ...rowData,
      _rowNumber: String(i + 1),
      _isValid: String(isValid),
      _errors: errors.join(" | "),
    });
  }

  return {
    fileName: file.name,
    fileSize: file.size,
    fileType: extension === "csv" ? "csv" : "xlsx",
    headers,
    rows,
    totalRows: rows.length,
  };
}

// ============================================================================
// Export CSV Helper
// ============================================================================

export function objectToCSV(data: Record<string, string>[]): string {
  if (data.length === 0) return "";
  const headers = Object.keys(data[0]).filter((h) => !h.startsWith("_"));
  const lines = [headers.join(",")];

  for (const row of data) {
    const values = headers.map((h) => {
      const val = row[h] ?? "";
      return `"${val.replace(/"/g, '""')}"`;
    });
    lines.push(values.join(","));
  }

  return lines.join("\n");
}
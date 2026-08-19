// ============================================================================
// Prosventa Export Generator
// Stage 3 — Phase 6: Import & Export Center
// ============================================================================
// Generates and downloads prospect data in CSV, Excel, and PDF formats.
// ============================================================================

import * as XLSX from "xlsx";
import type { Prospect } from "@/types/database";
import type { ExportFormat, ExportProgress } from "../types";

// ============================================================================
// Export Column Configuration
// ============================================================================

const EXPORT_COLUMNS: { key: string; label: string }[] = [
  { key: "company_name", label: "Company" },
  { key: "name", label: "Contact Name" },
  { key: "contact_email", label: "Email" },
  { key: "contact_phone", label: "Phone" },
  { key: "website", label: "Website" },
  { key: "industry", label: "Industry" },
  { key: "country", label: "Country" },
  { key: "city", label: "City" },
  { key: "status", label: "Status" },
  { key: "priority", label: "Priority" },
  { key: "source", label: "Source" },
  { key: "lead_score", label: "Lead Score" },
  { key: "ai_fit_score", label: "AI Fit Score" },
  { key: "buying_intent", label: "Buying Intent" },
  { key: "employee_count", label: "Employees" },
  { key: "tags", label: "Tags" },
  { key: "created_at", label: "Created" },
  { key: "updated_at", label: "Updated" },
];

function getColumnValue(prospect: Prospect, key: string): string {
  const value = (prospect as unknown as Record<string, unknown>)[key];
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

function buildExportRows(prospects: Prospect[]): (string | number)[][] {
  return prospects.map((p) =>
    EXPORT_COLUMNS.map((col) => {
      const value = getColumnValue(p, col.key);
      if (col.key === "lead_score" || col.key === "ai_fit_score" || col.key === "employee_count") {
        const num = Number(value);
        return Number.isFinite(num) && value !== "" ? num : "";
      }
      return value;
    })
  );
}

// ============================================================================
// CSV Export
// ============================================================================

export function generateCSV(prospects: Prospect[]): Blob {
  const headers = EXPORT_COLUMNS.map((c) => c.label);
  const rows = buildExportRows(prospects);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
}

// ============================================================================
// Excel Export
// ============================================================================

export function generateExcel(prospects: Prospect[]): Blob {
  const headers = EXPORT_COLUMNS.map((c) => c.label);
  const rows = buildExportRows(prospects);

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  worksheet["!cols"] = EXPORT_COLUMNS.map((c) => ({
    wch: Math.max(c.label.length + 2, 14),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Prospects");

  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

// ============================================================================
// PDF Export (print-friendly HTML)
// ============================================================================

export function openPDFExport(prospects: Prospect[], organizationName?: string | null): void {
  const container = document.createElement("div");
  container.id = "prosventa-export-report";
  container.style.cssText = "position:fixed;top:0;left:0;width:100%;z-index:-1;opacity:0;pointer-events:none;";

  const statusCounts = prospects.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    return acc;
  }, {});

  const exportDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  container.innerHTML = `
    <div style="font-family:Inter,system-ui,sans-serif;padding:40px;color:#0f172a;">
      <h1 style="font-size:24px;font-weight:700;margin:0;">Prosventa Prospect Export</h1>
      <p style="color:#64748b;font-size:14px;margin:4px 0 0;">
        ${organizationName ? `${organizationName} — ` : ""}${exportDate}
      </p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:32px;">
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;">
          <p style="font-size:12px;color:#64748b;margin:0;">Total Prospects</p>
          <p style="font-size:24px;font-weight:700;margin:4px 0 0;">${prospects.length}</p>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;">
          <p style="font-size:12px;color:#64748b;margin:0;">New</p>
          <p style="font-size:24px;font-weight:700;margin:4px 0 0;">${statusCounts.new ?? 0}</p>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;">
          <p style="font-size:12px;color:#64748b;margin:0;">Qualified</p>
          <p style="font-size:24px;font-weight:700;margin:4px 0 0;">${statusCounts.qualified ?? 0}</p>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;">
          <p style="font-size:12px;color:#64748b;margin:0;">Won</p>
          <p style="font-size:24px;font-weight:700;margin:4px 0 0;">${statusCounts.won ?? 0}</p>
        </div>
      </div>
      <h2 style="font-size:16px;font-weight:600;margin:0 0 12px;">Prospect List</h2>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;">
            ${["Company", "Contact", "Email", "Industry", "Country", "Status"].map((h) => `<th style="text-align:left;padding:8px 12px;color:#64748b;font-weight:600;">${h}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${prospects
            .slice(0, 100)
            .map(
              (p) => `
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:8px 12px;font-weight:500;">${p.company_name || p.name || "—"}</td>
                  <td style="padding:8px 12px;">${p.name || "—"}</td>
                  <td style="padding:8px 12px;">${p.contact_email || "—"}</td>
                  <td style="padding:8px 12px;">${p.industry || "—"}</td>
                  <td style="padding:8px 12px;">${p.country || "—"}</td>
                  <td style="padding:8px 12px;">${p.status}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
      ${prospects.length > 100 ? `<p style="color:#94a3b8;font-size:11px;margin-top:8px;">Showing first 100 of ${prospects.length} prospects.</p>` : ""}
    </div>
  `;

  document.body.appendChild(container);
  window.print();
  setTimeout(() => {
    document.body.removeChild(container);
  }, 1000);
}

// ============================================================================
// Download Helper
// ============================================================================

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function buildExportFileName(format: ExportFormat, scope: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const scopeLabel = scope.toLowerCase().replace(/\s+/g, "-");
  const ext = format === "xlsx" ? "xlsx" : format === "pdf" ? "pdf" : "csv";
  return `prosventa-${scopeLabel}-${date}.${ext}`;
}

// ============================================================================
// Main Export Entry
// ============================================================================

export async function exportProspects(
  prospects: Prospect[],
  format: ExportFormat,
  scope: string,
  onProgress: (progress: ExportProgress) => void,
  organizationName?: string | null
): Promise<void> {
  const fileName = buildExportFileName(format, scope);

  onProgress({ stage: "preparing", progress: 0.1, message: "Preparing export…" });
  await new Promise((r) => setTimeout(r, 300));

  onProgress({ stage: "generating", progress: 0.4, message: "Generating file…" });

  // Simulate generation for large datasets to keep UI smooth
  const chunkSize = 5000;
  if (prospects.length > chunkSize) {
    for (let i = 0; i < prospects.length; i += chunkSize) {
      await new Promise((r) => setTimeout(r, 0));
      const progress = Math.min(0.8, 0.4 + (i / prospects.length) * 0.4);
      onProgress({ stage: "generating", progress, message: `Processing ${Math.min(i + chunkSize, prospects.length)} of ${prospects.length} prospects…` });
    }
  }

  onProgress({ stage: "generating", progress: 0.85, message: "Finalizing file…" });

  let blob: Blob;
  if (format === "csv") {
    blob = generateCSV(prospects);
  } else if (format === "xlsx") {
    blob = generateExcel(prospects);
  } else {
    openPDFExport(prospects, organizationName);
    onProgress({ stage: "download_ready", progress: 1, message: "Export ready" });
    return;
  }

  onProgress({ stage: "download_ready", progress: 0.95, message: "Preparing download…" });
  await new Promise((r) => setTimeout(r, 200));

  downloadBlob(blob, fileName);
  onProgress({ stage: "download_ready", progress: 1, message: "Download ready" });
}
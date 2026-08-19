import type { AnalyticsProspect, AnalyticsSavedList } from "@/lib/db/analytics";

// ============================================================================
// Export Utilities
// ============================================================================

export type ExportFormat = "pdf" | "csv" | "excel";

interface ExportContext {
  prospects: AnalyticsProspect[];
  savedLists: AnalyticsSavedList[];
  organizationName: string | null;
  dateRangeLabel: string;
}

/**
 * Generates and downloads a report in the specified format.
 * CSV and Excel are generated client-side. PDF uses the browser's print dialog
 * with a formatted report view.
 */
export function exportReport(format: ExportFormat, context: ExportContext) {
  switch (format) {
    case "csv":
      exportCSV(context);
      break;
    case "excel":
      exportExcel(context);
      break;
    case "pdf":
      exportPDF(context);
      break;
  }
}

// ============================================================================
// CSV Export
// ============================================================================

function exportCSV({ prospects, dateRangeLabel }: ExportContext) {
  const headers = [
    "Company",
    "Name",
    "Industry",
    "Country",
    "City",
    "Status",
    "Source",
    "Priority",
    "Lead Score",
    "AI Fit Score",
    "Buying Intent",
    "Revenue",
    "Created",
    "Updated",
  ];

  const rows = prospects.map((p) => [
    p.company_name || p.name,
    p.name,
    p.industry || "",
    p.country || "",
    p.city || "",
    p.status,
    p.source,
    p.priority,
    p.lead_score?.toString() ?? "",
    p.ai_fit_score?.toString() ?? "",
    p.buying_intent,
    p.revenue?.toString() ?? "",
    p.created_at,
    p.updated_at,
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `prosventa-prospects-${dateRangeLabel.toLowerCase().replace(/\s+/g, "-")}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// Excel Export (CSV-compatible with .xls extension for Excel compatibility)
// ============================================================================

function exportExcel({ prospects, dateRangeLabel }: ExportContext) {
  const headers = [
    "Company",
    "Name",
    "Industry",
    "Country",
    "City",
    "Status",
    "Source",
    "Priority",
    "Lead Score",
    "AI Fit Score",
    "Buying Intent",
    "Revenue",
    "Created",
    "Updated",
  ];

  const rows = prospects.map((p) => [
    p.company_name || p.name,
    p.name,
    p.industry || "",
    p.country || "",
    p.city || "",
    p.status,
    p.source,
    p.priority,
    p.lead_score?.toString() ?? "",
    p.ai_fit_score?.toString() ?? "",
    p.buying_intent,
    p.revenue?.toString() ?? "",
    p.created_at,
    p.updated_at,
  ]);

  // Use HTML table format for Excel compatibility
  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head>
        <meta charset="UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Prospects</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
      </head>
      <body>
        <table>
          <thead>
            <tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) =>
                  `<tr>${row.map((cell) => `<td>${String(cell).replace(/</g, "<").replace(/>/g, ">")}</td>`).join("")}</tr>`
              )
              .join("")}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([html], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `prosventa-prospects-${dateRangeLabel.toLowerCase().replace(/\s+/g, "-")}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// PDF Export (print-friendly view)
// ============================================================================

function exportPDF({ prospects, organizationName, dateRangeLabel }: ExportContext) {
  // Create a hidden print container with a formatted report
  const container = document.createElement("div");
  container.id = "prosventa-print-report";
  container.style.cssText = "position:fixed;top:0;left:0;width:100%;z-index:-1;opacity:0;pointer-events:none;";

  const statusCounts = prospects.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    return acc;
  }, {});

  const totalRevenue = prospects.reduce((sum, p) => sum + (p.revenue ?? 0), 0);

  container.innerHTML = `
    <div style="font-family:Inter,system-ui,sans-serif;padding:40px;color:#0f172a;">
      <h1 style="font-size:24px;font-weight:700;margin:0;">Prosventa Analytics Report</h1>
      <p style="color:#64748b;font-size:14px;margin:4px 0 0;">
        ${organizationName ? `${organizationName} — ` : ""}${dateRangeLabel}
      </p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:32px;">
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;">
          <p style="font-size:12px;color:#64748b;margin:0;">Total Prospects</p>
          <p style="font-size:24px;font-weight:700;margin:4px 0 0;">${prospects.length}</p>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;">
          <p style="font-size:12px;color:#64748b;margin:0;">Won</p>
          <p style="font-size:24px;font-weight:700;margin:4px 0 0;">${statusCounts.won ?? 0}</p>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;">
          <p style="font-size:12px;color:#64748b;margin:0;">Qualified</p>
          <p style="font-size:24px;font-weight:700;margin:4px 0 0;">${statusCounts.qualified ?? 0}</p>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;">
          <p style="font-size:12px;color:#64748b;margin:0;">Pipeline Value</p>
          <p style="font-size:24px;font-weight:700;margin:4px 0 0;">$${totalRevenue.toLocaleString()}</p>
        </div>
      </div>
      <h2 style="font-size:16px;font-weight:600;margin:0 0 12px;">Prospect List</h2>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;">
            ${["Company", "Industry", "Country", "Status", "Lead Score", "Buying Intent", "Created"].map((h) => `<th style="text-align:left;padding:8px 12px;color:#64748b;font-weight:600;">${h}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${prospects
            .slice(0, 100)
            .map(
              (p) => `
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:8px 12px;font-weight:500;">${p.company_name || p.name}</td>
                  <td style="padding:8px 12px;">${p.industry || "—"}</td>
                  <td style="padding:8px 12px;">${p.country || "—"}</td>
                  <td style="padding:8px 12px;">${p.status}</td>
                  <td style="padding:8px 12px;">${p.lead_score ?? "—"}</td>
                  <td style="padding:8px 12px;">${p.buying_intent}</td>
                  <td style="padding:8px 12px;">${new Date(p.created_at).toLocaleDateString()}</td>
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

  // Trigger print
  window.print();

  // Clean up after print dialog closes
  setTimeout(() => {
    document.body.removeChild(container);
  }, 1000);
}
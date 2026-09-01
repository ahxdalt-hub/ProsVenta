// ============================================================================
// Prosventa Prospect Database — Advanced workspace (Phase 4)
// ============================================================================
// The ADVANCED database-management layer over the SAME prospect table the
// normal Prospects page uses. Nothing here duplicates the database or the
// prospect system: every query goes through the existing RLS-scoped
// lib/db/prospects functions, every action reuses the existing components
// (ProspectTable, ProspectDetailPanel, BulkActionBar, BulkEnrichWindow, …).
//
// Performance contract:
//   • The server shell loads ONE page (50 rows — the server-side cap) and the
//     filter option sets in parallel. The browser never receives the full
//     table; the client workspace appends further pages on demand
//     ("incremental loading") through the same server action.
//   • Search / filter / sort are URL-driven and applied SERVER-SIDE by
//     queryProspects, which runs on indexed columns
//     (status, industry, country, source, created_at, company_name, …).
//   • Selection, column configuration, and the credit-aware bulk windows are
//     client-side state only — no second data source is introduced.
// ============================================================================

import {
  queryProspects,
  getDistinctIndustries,
  getDistinctCountries,
  getDistinctSources,
} from "@/lib/db/prospects";
import { getSavedLists } from "@/lib/db/lists";
import { ensureOrganization } from "@/lib/db/organizations";
import { ProspectDatabaseWorkspace } from "@/features/prospects/components/database/ProspectDatabaseWorkspace";
import type { ProspectToolbarFilters } from "@/features/prospects/components/ProspectsToolbar";
import { IntelligenceActionHostProvider } from "@/features/intelligence/action-window";
import type {
  ProspectPriority,
  ProspectSource,
  ProspectStatus,
} from "@/types/database";
import type { ProspectSortField, SortOrder } from "@/features/prospects/types/query";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Prospect Database - Prosventa",
};

type ProspectPageData = Awaited<ReturnType<typeof queryProspects>>;

/** Page size for the database workspace — the server-side maximum. */
const DATABASE_PAGE_SIZE = 50;

const VALID_STATUSES: ProspectStatus[] = [
  "new",
  "contacted",
  "qualified",
  "proposal_sent",
  "negotiation",
  "won",
  "lost",
];
const VALID_SOURCES: ProspectSource[] = ["manual", "import", "discovery", "api"];
const VALID_PRIORITIES: ProspectPriority[] = ["low", "medium", "high", "urgent"];
const VALID_SORTS: ProspectSortField[] = [
  "icp_score",
  "created_at",
  "updated_at",
  "name",
  "company_name",
];

export default async function ProspectDatabasePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const sp = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      sp.set(key, value);
    } else if (Array.isArray(value) && value[0]) {
      sp.set(key, value[0]);
    }
  }

  await ensureOrganization();

  // ---- Search / filter / sort (URL-owned, applied server-side) --------------
  const search = sp.get("search")?.trim() || undefined;
  const status = VALID_STATUSES.includes(sp.get("status") as ProspectStatus)
    ? (sp.get("status") as ProspectStatus)
    : undefined;
  const priority = VALID_PRIORITIES.includes(sp.get("priority") as ProspectPriority)
    ? (sp.get("priority") as ProspectPriority)
    : undefined;
  const source = VALID_SOURCES.includes(sp.get("source") as ProspectSource)
    ? (sp.get("source") as ProspectSource)
    : undefined;
  const industry = sp.get("industry") || undefined;
  const country = sp.get("country") || undefined;
  const minEmployeesRaw = sp.get("min_employees");
  const minEmployees = minEmployeesRaw ? parseInt(minEmployeesRaw, 10) : undefined;
  const sort = VALID_SORTS.includes(sp.get("sort") as ProspectSortField)
    ? (sp.get("sort") as ProspectSortField)
    : undefined;
  const order: SortOrder = sp.get("order") === "asc" ? "asc" : "desc";

  const toolbarFilters: ProspectToolbarFilters = {
    status,
    priority,
    source,
    industry,
    country,
    minEmployees:
      minEmployees !== undefined && !Number.isNaN(minEmployees) ? minEmployees : undefined,
  };

  // First page + option sets in parallel — no waterfalls.
  let prospectsPage: ProspectPageData | undefined;
  let industries: string[] = [];
  let countries: string[] = [];
  let sources: string[] = [];
  let savedLists: Awaited<ReturnType<typeof getSavedLists>> = [];
  let loadError: string | null = null;

  try {
    [prospectsPage, industries, countries, sources, savedLists] = await Promise.all([
      queryProspects({
        page: 1,
        pageSize: DATABASE_PAGE_SIZE,
        search,
        status,
        priority,
        source,
        industry,
        country,
        employee_count: toolbarFilters.minEmployees,
        sort,
        order,
      }),
      getDistinctIndustries(),
      getDistinctCountries(),
      getDistinctSources(),
      getSavedLists(),
    ]);
  } catch {
    loadError = "We couldn't load your prospect database. Please try again.";
  }

  return (
    <IntelligenceActionHostProvider>
      <ProspectDatabaseWorkspace
        initialProspects={prospectsPage?.prospects ?? []}
        pageSize={prospectsPage?.pageSize ?? DATABASE_PAGE_SIZE}
        total={prospectsPage?.total ?? 0}
        industries={industries}
        countries={countries}
        sources={sources}
        savedLists={savedLists}
        search={search ?? ""}
        filters={toolbarFilters}
        sort={sort ?? ""}
        order={order}
        loadError={loadError}
      />
    </IntelligenceActionHostProvider>
  );
}

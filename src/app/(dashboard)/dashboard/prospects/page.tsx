// ============================================================================
// Prosventa Prospects - Primary prospecting workspace (Phase 1 rebuild)
// ============================================================================
// Server shell: loads ONE page of real organization-scoped prospects plus the
// filter option sets in parallel, then hands off to the client workspace.
// All data flows through RLS-scoped lib/db functions. The Intelligence
// action-window host is mounted here so row/bulk Enrich & Research actions
// reuse the EXISTING single window system.
//
// NOTE: search / filter / sort are URL-query driven (?search=&status=&industry=,
// &sort=&order=) and applied SERVER-SIDE by queryProspects — the browser never
// downloads the full dataset. The client toolbar only mutates the URL.
// ============================================================================

import { Suspense } from "react";
import {
  queryProspects,
  getDistinctIndustries,
  getDistinctCountries,
  getDistinctSources,
  getDistinctTags,
  getOrganizationMembers,
} from "@/lib/db/prospects";
import { getSavedLists } from "@/lib/db/lists";
import { ensureOrganization } from "@/lib/db/organizations";
import { ProspectsWorkspace } from "@/features/prospects/components/ProspectsWorkspace";
import type { ProspectToolbarFilters } from "@/features/prospects/components/ProspectsToolbar";
import { ProspectTableSkeleton } from "@/components/ui/Skeleton";
import { IntelligenceActionHostProvider } from "@/features/intelligence/action-window";
import type {
  ProspectPriority,
  ProspectSource,
  ProspectStatus,
} from "@/types/database";
import type { ProspectSortField, SortOrder } from "@/features/prospects/types/query";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Prospects - Prosventa",
};

type ProspectPageData = Awaited<ReturnType<typeof queryProspects>>;

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

export default async function DashboardProspectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const sp = new URLSearchParams();

  // Normalize searchParams (string | string[] | undefined) into URLSearchParams
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      sp.set(key, value);
    } else if (Array.isArray(value) && value[0]) {
      sp.set(key, value[0]);
    }
  }

  await ensureOrganization();

  const page = sp.get("page") ? parseInt(sp.get("page")!, 10) : 1;

  // ---- Search / filter / sort state (URL-owned, applied server-side) --------
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

  // Prospects + every filter-option set load in parallel - no waterfalls.
  let prospectsPage: ProspectPageData | undefined;
  let industries: string[] = [];
  let countries: string[] = [];
  let sources: string[] = [];
  let tags: string[] = [];
  let owners: { id: string; full_name: string | null }[] = [];
  let savedLists: Awaited<ReturnType<typeof getSavedLists>> = [];
  let loadError: string | null = null;

  try {
    [
      prospectsPage,
      industries,
      countries,
      sources,
      tags,
      owners,
      savedLists,
    ] = await Promise.all([
      queryProspects({
        page,
        pageSize: 25,
        search,
        status,
        priority,
        source,
        industry,
        country,
        // queryProspects applies employee_count as a >= (gte) filter.
        employee_count: toolbarFilters.minEmployees,
        sort,
        order,
      }),
      getDistinctIndustries(),
      getDistinctCountries(),
      getDistinctSources(),
      getDistinctTags(),
      getOrganizationMembers(),
      getSavedLists(),
    ]);
  } catch {
    loadError = "We couldn't load your prospects. Please try again.";
  }

  return (
    <IntelligenceActionHostProvider>
      <Suspense fallback={<ProspectTableSkeleton />}>
        <ProspectsWorkspace
          initialProspects={prospectsPage?.prospects ?? []}
          total={prospectsPage?.total ?? 0}
          page={prospectsPage?.page ?? 1}
          pageSize={prospectsPage?.pageSize ?? 25}
          totalPages={prospectsPage?.totalPages ?? 1}
          industries={industries}
          countries={countries}
          tags={tags}
          owners={owners}
          sources={sources}
          savedLists={savedLists}
          search={search ?? ""}
          filters={toolbarFilters}
          sort={sort ?? ""}
          order={order}
          loadError={loadError}
        />
      </Suspense>
    </IntelligenceActionHostProvider>
  );
}

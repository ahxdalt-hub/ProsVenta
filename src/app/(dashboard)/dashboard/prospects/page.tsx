import { Suspense } from "react";
import { queryProspects, getDistinctIndustries, getDistinctCountries, getDistinctSources, getDistinctTags, getOrganizationMembers } from "@/lib/db/prospects";
import { getSavedLists } from "@/lib/db/lists";
import { getSavedViews } from "@/lib/db/saved-views";
import { parseProspectQuery } from "@/features/prospects/types/query";
import { ProspectsWorkspace } from "@/features/prospects/components/ProspectsWorkspace";
import { ProspectTableSkeleton } from "@/components/ui/Skeleton";
import type { ProspectSortField, SortOrder } from "@/features/prospects/types/query";

export const dynamic = "force-dynamic";

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

  const filters = parseProspectQuery(sp);
  const page = sp.get("page") ? parseInt(sp.get("page")!, 10) : 1;
  const sort = (sp.get("sort") as ProspectSortField) || undefined;
  const order = (sp.get("order") as SortOrder) || undefined;

  // Fetch prospects, filter options, saved lists, and saved views in parallel
  const [prospectsPage, industries, countries, sources, tags, owners, savedLists, savedViews] = await Promise.all([
    queryProspects({
      ...filters,
      page,
      sort,
      order,
      pageSize: 25,
    }),
    getDistinctIndustries(),
    getDistinctCountries(),
    getDistinctSources(),
    getDistinctTags(),
    getOrganizationMembers(),
    getSavedLists(),
    getSavedViews(),
  ]);

  return (
    <Suspense fallback={<ProspectTableSkeleton />}>
      <ProspectsWorkspace
        initialProspects={prospectsPage.prospects}
        total={prospectsPage.total}
        page={prospectsPage.page}
        pageSize={prospectsPage.pageSize}
        totalPages={prospectsPage.totalPages}
        industries={industries}
        countries={countries}
        tags={tags}
        owners={owners}
        sources={sources}
        savedLists={savedLists}
        savedViews={savedViews}
        currentFilters={filters}
        currentSort={sort}
        currentOrder={order}
      />
    </Suspense>
  );
}
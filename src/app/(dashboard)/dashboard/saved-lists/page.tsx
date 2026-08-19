import { getSavedLists } from "@/lib/db/lists";
import { ListManager } from "@/features/prospects/components/ListManager";

export const dynamic = "force-dynamic";

export default async function DashboardSavedListsPage() {
  const lists = await getSavedLists();

  return (
    <section className="dashboard-enter">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Saved Lists
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Organize prospects into reusable saved lists.
        </p>
      </div>
      <ListManager lists={lists} />
    </section>
  );
}
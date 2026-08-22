import { ROLE_DEFINITIONS } from "@/features/collaboration/permissions";
import type { OrganizationRole } from "@/types/database";

const ROLE_ORDER: OrganizationRole[] = ["owner", "admin", "manager", "sales", "viewer"];

/**
 * Compact reference card explaining each role in plain language.
 * This is reference information — kept small and out of the way.
 */
export function RolesInfo() {
  return (
    <section aria-labelledby="roles-heading" className="dashboard-enter" style={{ animationDelay: "180ms" }}>
      <h3 id="roles-heading" className="mb-3 text-sm font-semibold tracking-tight text-slate-900">
        Roles
      </h3>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <ul className="divide-y divide-slate-100">
          {ROLE_ORDER.map((role) => {
            const definition = ROLE_DEFINITIONS[role];
            return (
              <li key={role} className="flex items-start gap-3 px-4 py-2.5">
                <span className="mt-0.5 shrink-0 text-xs font-semibold capitalize text-slate-900">
                  {definition.label}
                </span>
                <span className="text-sm text-slate-500">{definition.description}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
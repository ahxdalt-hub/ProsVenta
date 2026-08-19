import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ROLE_DEFINITIONS } from "@/features/collaboration/permissions";
import type { OrganizationRole } from "@/types/database";

const ROLE_ORDER: OrganizationRole[] = ["owner", "admin", "manager", "sales", "viewer"];

export function RolesPermissions() {
  return (
    <Card>
      <CardHeader
        title="Roles & Permissions"
        description="Understand what each role can do"
        icon={
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        }
      />
      <div className="p-6 pt-4 space-y-4">
        {ROLE_ORDER.map((role) => {
          const definition = ROLE_DEFINITIONS[role];
          return (
            <div key={role} className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-2">
                <Badge variant={definition.badgeVariant}>{definition.label}</Badge>
              </div>
              <p className="mt-2 text-sm text-slate-500">{definition.description}</p>
              <ul className="mt-3 space-y-1.5">
                {definition.permissions.slice(0, 5).map((perm) => (
                  <li key={perm} className="flex items-center gap-2 text-xs text-slate-600">
                    <svg className="w-3.5 h-3.5 text-green-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {perm.replace(/_/g, " ")}
                  </li>
                ))}
                {definition.permissions.length > 5 && (
                  <li className="text-xs text-slate-400 pl-5">
                    +{definition.permissions.length - 5} more permissions
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

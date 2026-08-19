import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { Organization } from "@/types/database";

interface WorkspaceInfoProps {
  organization: Organization;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function WorkspaceInfo({ organization }: WorkspaceInfoProps) {
  return (
    <Card>
      <CardHeader
        title="Workspace Information"
        description="Technical details about your workspace"
        icon={
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        }
      />
      <div className="p-6 pt-4 space-y-3">
        <div className="flex items-center justify-between py-2 border-b border-slate-100">
          <span className="text-sm text-slate-500">Organization ID</span>
          <span className="text-sm font-mono font-semibold text-slate-900">{organization.id}</span>
        </div>
        <div className="flex items-center justify-between py-2 border-b border-slate-100">
          <span className="text-sm text-slate-500">Created Date</span>
          <span className="text-sm font-semibold text-slate-900">{formatDate(organization.created_at)}</span>
        </div>
        <div className="flex items-center justify-between py-2 border-b border-slate-100">
          <span className="text-sm text-slate-500">Current Plan</span>
          <Badge variant="neutral">Free</Badge>
        </div>
        <div className="flex items-center justify-between py-2 border-b border-slate-100">
          <span className="text-sm text-slate-500">Storage Usage</span>
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            Future
          </span>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-slate-500">API Usage</span>
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            Future
          </span>
        </div>
      </div>
    </Card>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ensureOrganization, getOrganizationMembers } from "@/lib/db/organizations";
import { getInvitations } from "@/lib/db/collaboration";
import { Button } from "@/components/ui/Button";
import { MembersClient } from "@/components/collaboration/MembersClient";
import type { OrganizationRole } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  await ensureOrganization();

  const [members, invitations] = await Promise.all([
    getOrganizationMembers(),
    getInvitations(),
  ]);

  // Get current user's role
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", user.id)
    .single();

  const currentUserRole = membership?.role as OrganizationRole | undefined;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between dashboard-enter">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
            <Link href="/dashboard/organization" className="hover:text-slate-600 transition-colors">Organization</Link>
            <span>/</span>
            <span className="text-slate-600">Members</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Team Members</h1>
          <p className="mt-1 text-sm text-slate-500">Manage who has access to your workspace.</p>
        </div>
      </div>

      {/* Members grid */}
      <div className="dashboard-enter" style={{ animationDelay: "60ms" }}>
        <MembersClient
          members={members}
          currentUserId={user.id}
          currentUserRole={currentUserRole}
          invitations={invitations}
        />
      </div>

      {/* Back link */}
      <div className="dashboard-enter" style={{ animationDelay: "120ms" }}>
        <Link href="/dashboard/organization">
          <Button variant="ghost" size="sm">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
            Back to Organization
          </Button>
        </Link>
      </div>
    </div>
  );
}
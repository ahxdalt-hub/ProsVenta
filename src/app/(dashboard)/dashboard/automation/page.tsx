import { createClient } from "@/lib/supabase/server";
import { ensureOrganization } from "@/lib/db/organizations";
import Link from "next/link";
import {
  getWorkflows,
  getWorkflowExecutions,
  getReminders,
  getAutomationSuggestions,
  getAutomationStats,
} from "@/lib/db/automation";
import { AutomationClient } from "@/features/automation/components/AutomationClient";
import IntelligenceWorkflowSection from "@/features/intelligence/workflows/components/IntelligenceWorkflowSection";

export const dynamic = "force-dynamic";

export default async function AutomationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  await ensureOrganization();

  const [workflows, executions, reminders, suggestions, stats] = await Promise.all([
    getWorkflows(),
    getWorkflowExecutions(50),
    getReminders(20),
    getAutomationSuggestions(),
    getAutomationStats(),
  ]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Link
          href="/dashboard/automation/control-center"
          className="block rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-navy-300 hover:shadow-sm"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden>🛰️</span>
            <div>
              <p className="text-sm font-semibold text-slate-900">Automation Control Center</p>
              <p className="text-xs text-slate-500">
                See what&apos;s running, why it ran, and recover what failed.
              </p>
            </div>
            <span className="ml-auto text-xs font-medium text-blue-700">Open →</span>
          </div>
        </Link>
        <Link
          href="/dashboard/automation/playbooks"
          className="block rounded-2xl border border-blue-100 bg-blue-50/60 p-5 transition hover:border-blue-200 hover:bg-blue-50"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden>📘</span>
            <div>
              <p className="text-sm font-semibold text-slate-900">Playbooks</p>
              <p className="text-xs text-slate-500">
                Repeatable processes for what to do next — preview, run manually, or let them run automatically.
              </p>
            </div>
            <span className="ml-auto text-xs font-medium text-blue-700">Open →</span>
          </div>
        </Link>
      </div>

      <AutomationClient
        workflows={workflows}
        executions={executions}
        reminders={reminders}
        suggestions={suggestions}
        stats={stats}
      />
      <div className="border-t border-gray-200 pt-8">
        <IntelligenceWorkflowSection />
      </div>
    </div>
  );
}

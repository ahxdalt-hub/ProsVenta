import { createClient } from "@/lib/supabase/server";
import { ensureOrganization } from "@/lib/db/organizations";
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
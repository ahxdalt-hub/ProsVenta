// ============================================================================
// Prosventa Intelligence-Powered Workflows — Server Component
// Stage 4 — Phase 9: Intelligence-Powered Workflows
// ============================================================================
import { getIntelligenceWorkflows } from "@/lib/db/intelligence-workflows";
import { getExecutionHistory } from "@/lib/db/intelligence-workflows";
import { getPendingApprovals } from "@/lib/db/intelligence-workflows";
import IntelligenceWorkflowClient from "./IntelligenceWorkflowClient";

export default async function IntelligenceWorkflowSection() {
  const [workflows, executions, approvals] = await Promise.all([
    getIntelligenceWorkflows(),
    getExecutionHistory(20),
    getPendingApprovals(),
  ]);

  return (
    <IntelligenceWorkflowClient
      workflows={workflows}
      initialExecutions={executions}
      initialApprovals={approvals}
    />
  );
}
-- ============================================================================
-- Prosventa — Stage 7 Phase 5: Automation Control Center
-- ============================================================================
-- Monitoring/management layer on top of the EXISTING Phase 4 orchestrator.
-- No new tables are created — the Control Center reads the existing
-- workflow_executions / workflow_action_executions records through RLS.
--
-- Adds only:
--   - One composite index matching the Control Center's dominant queries:
--       Running list       : org + status IN (queued,running,waiting) by recency
--       Needs Attention    : org + status IN (failed,paused) by recency
--       History pagination : org (+ optional status/playbook), newest first
--     Existing single-column indexes (org, status, created_at, playbook,
--     prospect) are reused; no speculative indexes are added.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_wf_exec_org_status_created
  ON public.workflow_executions(organization_id, status, created_at DESC);

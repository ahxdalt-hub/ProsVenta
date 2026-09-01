-- ============================================================================
-- Prosventa — Stage 7 Phase 1: Action & Workflow Foundation
-- ============================================================================
-- Extends the EXISTING workflow infrastructure (Stage 3 automation +
-- Stage 4 intelligence workflows). No second workflow system is created.
--
-- Adds:
--   - Structured condition groups on workflows (AND/OR semantics)
--   - Execution safeguards (execution_limit, max_actions_per_execution)
--   - 'partially_completed' execution status (partial failure preservation)
--   - Retry metadata + structured error categories on action executions
--   - 'waiting_approval' state on individual action executions
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. WORKFLOWS — condition groups + execution limits
-- ----------------------------------------------------------------------------

-- Structured condition groups. NULL/absent means: use flat `conditions` with
-- AND semantics (backwards compatible). When present, an array of groups:
--   [ { "mode": "all" | "any", "conditions": [ {field, operator, value} ] } ]
-- Groups are combined with AND. Only one nesting level is allowed — enforced
-- application-side during validation.
ALTER TABLE public.workflows
  ADD COLUMN IF NOT EXISTS condition_groups JSONB;

-- Safety valve: maximum total executions for this workflow.
-- NULL = unlimited (existing behaviour).
ALTER TABLE public.workflows
  ADD COLUMN IF NOT EXISTS execution_limit INTEGER;

-- Safety valve: maximum actions executed per single execution.
ALTER TABLE public.workflows
  ADD COLUMN IF NOT EXISTS max_actions_per_execution INTEGER NOT NULL DEFAULT 10
    CONSTRAINT workflows_max_actions_per_execution_positive CHECK (max_actions_per_execution > 0);

-- ----------------------------------------------------------------------------
-- 2. WORKFLOW EXECUTIONS — partial completion status
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  ALTER TABLE public.workflow_executions DROP CONSTRAINT IF EXISTS workflow_executions_status_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE public.workflow_executions
  ADD CONSTRAINT workflow_executions_status_check CHECK (
    status IN (
      'pending', 'running', 'waiting_approval', 'completed', 'partially_completed',
      'failed', 'cancelled', 'skipped', 'success'
    )
  );

-- ----------------------------------------------------------------------------
-- 3. ACTION EXECUTIONS — retry metadata + structured error categories
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  ALTER TABLE public.workflow_action_executions DROP CONSTRAINT IF EXISTS workflow_action_executions_status_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE public.workflow_action_executions
  ADD CONSTRAINT workflow_action_executions_status_check CHECK (
    status IN ('pending', 'running', 'waiting_approval', 'completed', 'failed', 'skipped', 'cancelled')
  );

-- How many times this action has been attempted (1 = first attempt).
ALTER TABLE public.workflow_action_executions
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 1
    CONSTRAINT wf_action_exec_attempt_positive CHECK (attempt_count > 0);

-- Structured error category (never a stack trace). One of:
--   validation_error | not_found | permission_denied | provider_unavailable |
--   capability_unsupported | limit_exceeded | internal_error | cancelled
ALTER TABLE public.workflow_action_executions
  ADD COLUMN IF NOT EXISTS error_category TEXT;

CREATE INDEX IF NOT EXISTS idx_wf_action_exec_error_category
  ON public.workflow_action_executions(error_category)
  WHERE error_category IS NOT NULL;

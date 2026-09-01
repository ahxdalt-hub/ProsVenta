-- ============================================================================
-- Prosventa — Stage 7 Phase 4: Automation Orchestrator
-- ============================================================================
-- Extends the EXISTING execution infrastructure. No second execution system.
--
-- Adds:
--   - Orchestration states on workflow_executions ('queued', 'waiting', 'paused')
--   - Resumable sequential execution (current_step_index + context checkpoint)
--   - Origin tracking (event + chain depth) for loop protection explainability
--   - Execution-level idempotency key (org+playbook+version+event+target)
--   - Cancellation metadata (who + why — completed results are preserved)
--   - Structured failure category at the execution level
--   - Step-level idempotency on workflow_action_executions (safe worker retries)
--
-- RLS: both tables are already organization-scoped by earlier migrations; no
-- new policies are needed because no new tables are introduced.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. WORKFLOW EXECUTIONS — orchestration states + resumability
-- ----------------------------------------------------------------------------

DO $$ BEGIN
  ALTER TABLE public.workflow_executions DROP CONSTRAINT IF EXISTS workflow_executions_status_check;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

ALTER TABLE public.workflow_executions
  ADD CONSTRAINT workflow_executions_status_check CHECK (
    status IN (
      'pending', 'queued', 'running', 'waiting', 'waiting_approval', 'paused',
      'completed', 'partially_completed', 'failed', 'cancelled', 'skipped', 'success'
    )
  );

-- Next step to execute when the runner resumes (0-based index into the
-- playbook/workflow action list). Completed steps are never re-run.
ALTER TABLE public.workflow_executions
  ADD COLUMN IF NOT EXISTS current_step_index INTEGER NOT NULL DEFAULT 0
    CONSTRAINT wf_exec_step_index_non_negative CHECK (current_step_index >= 0);

-- Normalized execution context passed between steps (small values only —
-- large data lives in its own domain tables and is referenced by ID).
ALTER TABLE public.workflow_executions
  ADD COLUMN IF NOT EXISTS execution_context JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Why this automation ran: the originating event row (workflow_events.id).
ALTER TABLE public.workflow_executions
  ADD COLUMN IF NOT EXISTS origin_event_id UUID;

-- Chain depth of workflow-originated events at creation time (loop protection).
ALTER TABLE public.workflow_executions
  ADD COLUMN IF NOT EXISTS origin_chain_depth INTEGER NOT NULL DEFAULT 0;

-- Deterministic identity: organization + playbook + version + event + target.
-- A UNIQUE partial index makes duplicate executions structurally impossible.
ALTER TABLE public.workflow_executions
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_wf_exec_org_idempotency_key
  ON public.workflow_executions(organization_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wf_exec_origin_event
  ON public.workflow_executions(origin_event_id)
  WHERE origin_event_id IS NOT NULL;

-- Cancellation honesty: who cancelled and why.
ALTER TABLE public.workflow_executions
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.workflow_executions
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- Structured failure category mirroring the action-level taxonomy:
--   validation_error | not_found | permission_denied | provider_unavailable |
--   capability_unsupported | limit_exceeded | loop_protection | internal_error | cancelled
ALTER TABLE public.workflow_executions
  ADD COLUMN IF NOT EXISTS failure_category TEXT;

-- ----------------------------------------------------------------------------
-- 2. ACTION EXECUTIONS — step identity + step-level idempotency
-- ----------------------------------------------------------------------------

-- The playbook step position this action record belongs to (0-based).
ALTER TABLE public.workflow_action_executions
  ADD COLUMN IF NOT EXISTS step_index INTEGER;

-- Identity of the attempt: execution + step. A worker crash between "action
-- done" and "result recorded" cannot cause a duplicate side effect because a
-- completed record with the same key short-circuits re-execution.
ALTER TABLE public.workflow_action_executions
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_action_exec_idempotency_key
  ON public.workflow_action_executions(execution_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_action_exec_step
  ON public.workflow_action_executions(execution_id, step_index);


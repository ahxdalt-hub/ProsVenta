-- ============================================================================
-- Prosventa Intelligence-Powered Workflows
-- Stage 4 — Phase 9: Intelligence-Powered Workflows
-- ============================================================================
-- Extends the existing automation engine (Stage 3) with intelligence-driven
-- workflows. This does NOT create a second automation engine — it extends the
-- existing `workflows` / `workflow_executions` infrastructure.
--
-- Adds:
--   - Intelligence trigger types (ICP score, signals, research, recommendations)
--   - Workflow status (draft/active/paused/archived) — new workflows default to draft
--   - Execution tracking with trigger_event_id for idempotency
--   - Per-action execution records (workflow_action_executions)
--   - Minimal internal task system (tasks)
--   - Approval gate records (workflow_approvals)
--
-- IMPORTANT:
--   - No autonomous external actions. All actions are internal to Prosventa.
--   - New workflows default to 'draft' — the user must explicitly activate them.
--   - Idempotency is enforced via (workflow_id, trigger_event_id) uniqueness.
-- ============================================================================

-- ============================================================================
-- 1. EXTEND WORKFLOWS TABLE
-- ============================================================================

-- Add a status column (draft/active/paused/archived).
-- New workflows default to 'draft' so they are never accidentally active.
ALTER TABLE public.workflows
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'
  CHECK (status IN ('draft', 'active', 'paused', 'archived'));

-- Backfill existing workflows: map is_active/is_paused to status.
UPDATE public.workflows
SET status = CASE
  WHEN is_paused = true THEN 'paused'
  WHEN is_active = true THEN 'active'
  ELSE 'draft'
END
WHERE status = 'draft';

-- Add approval gate flag. When true, workflow actions require explicit user approval.
ALTER TABLE public.workflows
  ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN NOT NULL DEFAULT false;

-- Add loop protection: max executions per trigger event (default 1).
ALTER TABLE public.workflows
  ADD COLUMN IF NOT EXISTS max_executions_per_event INTEGER NOT NULL DEFAULT 1;

-- Drop the old trigger_type CHECK constraint and add intelligence triggers.
DO $$
BEGIN
  ALTER TABLE public.workflows DROP CONSTRAINT IF EXISTS workflows_trigger_type_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE public.workflows
  ADD CONSTRAINT workflows_trigger_type_check CHECK (
    trigger_type IN (
      -- Existing Stage 3 triggers
      'prospect_created',
      'prospect_updated',
      'lead_qualified',
      'lead_lost',
      'lead_won',
      'import_finished',
      'task_completed',
      'status_changed',
      'tag_added',
      'note_added',
      -- Intelligence triggers (Phase 9)
      'high_icp_score',
      'score_threshold_crossed',
      'high_priority_signal',
      'new_company_signal',
      'prospect_role_changed',
      'company_research_updated',
      'prospect_research_updated',
      'recommendation_created',
      'recommendation_priority_high'
    )
  );

-- Index for status lookups.
CREATE INDEX IF NOT EXISTS idx_workflows_status ON public.workflows(status);

-- ============================================================================
-- 2. EXTEND WORKFLOW EXECUTIONS TABLE
-- ============================================================================

-- Add trigger_event_id for idempotency (the intelligence event that fired).
ALTER TABLE public.workflow_executions
  ADD COLUMN IF NOT EXISTS trigger_event_id TEXT;

-- Add execution context (structured event payload).
ALTER TABLE public.workflow_executions
  ADD COLUMN IF NOT EXISTS execution_context JSONB DEFAULT '{}';

-- Add started_at / completed_at timestamps.
ALTER TABLE public.workflow_executions
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE public.workflow_executions
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Add created_by (the user who triggered/owns the execution).
ALTER TABLE public.workflow_executions
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Extend the status CHECK to include waiting_approval and cancelled.
-- NOTE: 'success' is retained for backwards compatibility with the Stage 3
-- automation engine (src/lib/db/automation.ts) which still reads/writes
-- workflow execution statuses of 'success'.
DO $$
BEGIN
  ALTER TABLE public.workflow_executions DROP CONSTRAINT IF EXISTS workflow_executions_status_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE public.workflow_executions
  ADD CONSTRAINT workflow_executions_status_check CHECK (
    status IN ('pending', 'running', 'waiting_approval', 'completed', 'failed', 'cancelled', 'skipped', 'success')
  );

-- Idempotency: a workflow must not run twice for the same trigger event.
CREATE UNIQUE INDEX IF NOT EXISTS idx_workflow_exec_trigger_dedupe
  ON public.workflow_executions(workflow_id, trigger_event_id)
  WHERE trigger_event_id IS NOT NULL;

-- Index for trigger event lookups.
CREATE INDEX IF NOT EXISTS idx_workflow_exec_trigger_event ON public.workflow_executions(trigger_event_id);

-- ============================================================================
-- 3. WORKFLOW ACTION EXECUTIONS
-- ============================================================================
-- Tracks each individual action within a workflow execution for debugging.
CREATE TABLE IF NOT EXISTS public.workflow_action_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'running', 'completed', 'failed', 'skipped', 'cancelled')
  ),
  input JSONB DEFAULT '{}',
  output JSONB DEFAULT '{}',
  error TEXT,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.workflow_action_executions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view action executions in their org" ON public.workflow_action_executions;
DROP POLICY IF EXISTS "Members can create action executions" ON public.workflow_action_executions;
DROP POLICY IF EXISTS "Members can update action executions in their org" ON public.workflow_action_executions;

CREATE POLICY "Members can view action executions in their org"
  ON public.workflow_action_executions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = workflow_action_executions.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members can create action executions"
  ON public.workflow_action_executions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = workflow_action_executions.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members can update action executions in their org"
  ON public.workflow_action_executions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = workflow_action_executions.organization_id
    AND om.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = workflow_action_executions.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_wf_action_exec_execution_id ON public.workflow_action_executions(execution_id);
CREATE INDEX IF NOT EXISTS idx_wf_action_exec_org_id ON public.workflow_action_executions(organization_id);
CREATE INDEX IF NOT EXISTS idx_wf_action_exec_status ON public.workflow_action_executions(status);

-- ============================================================================
-- 4. TASKS (MINIMAL INTERNAL TASK SYSTEM)
-- ============================================================================
-- Minimal internal task capability required for this phase.
-- NOT a full project-management system.
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  prospect_id UUID REFERENCES public.prospects(id) ON DELETE SET NULL,
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE SET NULL,
  execution_id UUID REFERENCES public.workflow_executions(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view tasks in their org" ON public.tasks;
DROP POLICY IF EXISTS "Members can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Members can update tasks in their org" ON public.tasks;
DROP POLICY IF EXISTS "Members can delete tasks in their org" ON public.tasks;

CREATE POLICY "Members can view tasks in their org"
  ON public.tasks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = tasks.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members can create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = tasks.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members can update tasks in their org"
  ON public.tasks FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = tasks.organization_id
    AND om.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = tasks.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members can delete tasks in their org"
  ON public.tasks FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = tasks.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_tasks_org_id ON public.tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_prospect_id ON public.tasks(prospect_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);

-- ============================================================================
-- 5. WORKFLOW APPROVALS
-- ============================================================================
-- Records approval gates for potentially consequential workflow actions.
-- The user must explicitly approve before the action executes.
CREATE TABLE IF NOT EXISTS public.workflow_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  action_index INTEGER NOT NULL DEFAULT 0,
  action_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  decided_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  preview JSONB DEFAULT '{}',
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.workflow_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view approvals in their org" ON public.workflow_approvals;
DROP POLICY IF EXISTS "Members can create approvals" ON public.workflow_approvals;
DROP POLICY IF EXISTS "Members can update approvals in their org" ON public.workflow_approvals;

CREATE POLICY "Members can view approvals in their org"
  ON public.workflow_approvals FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = workflow_approvals.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members can create approvals"
  ON public.workflow_approvals FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = workflow_approvals.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members can update approvals in their org"
  ON public.workflow_approvals FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = workflow_approvals.organization_id
    AND om.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = workflow_approvals.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_wf_approvals_execution_id ON public.workflow_approvals(execution_id);
CREATE INDEX IF NOT EXISTS idx_wf_approvals_org_id ON public.workflow_approvals(organization_id);
CREATE INDEX IF NOT EXISTS idx_wf_approvals_status ON public.workflow_approvals(status);

-- ============================================================================
-- 6. TRIGGERS
-- ============================================================================
CREATE OR REPLACE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 7. FUNCTION: RECORD WORKFLOW ACTION EXECUTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.record_workflow_action_execution(
  p_execution_id UUID,
  p_organization_id UUID,
  p_action_type TEXT,
  p_status TEXT DEFAULT 'pending',
  p_input JSONB DEFAULT '{}',
  p_output JSONB DEFAULT '{}',
  p_error TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.workflow_action_executions (
    execution_id, organization_id, action_type, status, input, output, error, executed_at
  ) VALUES (
    p_execution_id, p_organization_id, p_action_type, p_status, p_input, p_output, p_error,
    CASE WHEN p_status IN ('completed', 'failed', 'cancelled') THEN NOW() ELSE NULL END
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. FUNCTION: CREATE TASK
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_task(
  p_organization_id UUID,
  p_created_by UUID,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_prospect_id UUID DEFAULT NULL,
  p_workflow_id UUID DEFAULT NULL,
  p_execution_id UUID DEFAULT NULL,
  p_assigned_to UUID DEFAULT NULL,
  p_priority TEXT DEFAULT 'medium',
  p_due_date TIMESTAMPTZ DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.tasks (
    organization_id, created_by, title, description, prospect_id, workflow_id,
    execution_id, assigned_to, priority, due_date
  ) VALUES (
    p_organization_id, p_created_by, p_title, p_description, p_prospect_id,
    p_workflow_id, p_execution_id, p_assigned_to, p_priority, p_due_date
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
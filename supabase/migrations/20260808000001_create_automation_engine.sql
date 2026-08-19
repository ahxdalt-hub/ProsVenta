-- ============================================================================
-- Prosventa Workflow Automation Engine
-- Stage 3 — Phase 9: Intelligent Sales Automation Platform
-- ============================================================================
-- This migration creates the automation infrastructure:
--   - Workflows (trigger → condition → action)
--   - Workflow executions / history
--   - Reminders
--   - Smart suggestions
--   - Recurring schedules
-- ============================================================================

-- ============================================================================
-- 1. WORKFLOWS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  trigger_type TEXT NOT NULL CHECK (
    trigger_type IN (
      'prospect_created',
      'prospect_updated',
      'lead_qualified',
      'lead_lost',
      'lead_won',
      'import_finished',
      'task_completed',
      'status_changed',
      'tag_added',
      'note_added'
    )
  ),
  trigger_config JSONB DEFAULT '{}',
  conditions JSONB NOT NULL DEFAULT '[]',
  actions JSONB NOT NULL DEFAULT '[]',
  schedule_type TEXT NOT NULL DEFAULT 'event' CHECK (
    schedule_type IN ('event', 'daily', 'weekly', 'monthly', 'custom')
  ),
  schedule_config JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_paused BOOLEAN NOT NULL DEFAULT false,
  execution_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  avg_duration_ms INTEGER NOT NULL DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Members can view workflows in their org" ON public.workflows;
DROP POLICY IF EXISTS "Members can create workflows" ON public.workflows;
DROP POLICY IF EXISTS "Members can update workflows" ON public.workflows;
DROP POLICY IF EXISTS "Members can delete workflows" ON public.workflows;

CREATE POLICY "Members can view workflows in their org"
  ON public.workflows
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = workflows.organization_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can create workflows"
  ON public.workflows
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = workflows.organization_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update workflows"
  ON public.workflows
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = workflows.organization_id
      AND om.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = workflows.organization_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can delete workflows"
  ON public.workflows
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = workflows.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflows_organization_id ON public.workflows(organization_id);
CREATE INDEX IF NOT EXISTS idx_workflows_trigger_type ON public.workflows(trigger_type);
CREATE INDEX IF NOT EXISTS idx_workflows_is_active ON public.workflows(is_active);
CREATE INDEX IF NOT EXISTS idx_workflows_created_at ON public.workflows(created_at);

-- ============================================================================
-- 2. WORKFLOW EXECUTIONS (AUTOMATION HISTORY)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  prospect_id UUID REFERENCES public.prospects(id) ON DELETE SET NULL,
  prospect_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'running', 'success', 'failed', 'skipped')
  ),
  error_message TEXT,
  duration_ms INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Members can view executions in their org" ON public.workflow_executions;
DROP POLICY IF EXISTS "Members can create executions" ON public.workflow_executions;
DROP POLICY IF EXISTS "Members can update executions" ON public.workflow_executions;

CREATE POLICY "Members can view executions in their org"
  ON public.workflow_executions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = workflow_executions.organization_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can create executions"
  ON public.workflow_executions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = workflow_executions.organization_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update executions"
  ON public.workflow_executions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = workflow_executions.organization_id
      AND om.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = workflow_executions.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_exec_workflow_id ON public.workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_exec_org_id ON public.workflow_executions(organization_id);
CREATE INDEX IF NOT EXISTS idx_workflow_exec_prospect_id ON public.workflow_executions(prospect_id);
CREATE INDEX IF NOT EXISTS idx_workflow_exec_status ON public.workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_exec_created_at ON public.workflow_executions(created_at);

-- ============================================================================
-- 3. REMINDERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  prospect_id UUID REFERENCES public.prospects(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT,
  reminder_type TEXT NOT NULL CHECK (
    reminder_type IN (
      'follow_up_tomorrow',
      'demo_today',
      'meeting_30_min',
      'lead_inactive',
      'custom'
    )
  ),
  scheduled_for TIMESTAMPTZ NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view their reminders" ON public.reminders;
DROP POLICY IF EXISTS "Users can create reminders" ON public.reminders;
DROP POLICY IF EXISTS "Users can update their reminders" ON public.reminders;
DROP POLICY IF EXISTS "Users can delete their reminders" ON public.reminders;

CREATE POLICY "Users can view their reminders"
  ON public.reminders
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create reminders"
  ON public.reminders
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = reminders.organization_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their reminders"
  ON public.reminders
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their reminders"
  ON public.reminders
  FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON public.reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_org_id ON public.reminders(organization_id);
CREATE INDEX IF NOT EXISTS idx_reminders_prospect_id ON public.reminders(prospect_id);
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled_for ON public.reminders(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_reminders_completed ON public.reminders(user_id, is_completed, is_dismissed);

-- ============================================================================
-- 4. SMART SUGGESTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.automation_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL CHECK (
    suggestion_type IN ('assign_owner', 'tag_company', 'move_stage', 'high_priority', 'create_reminder')
  ),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  conditions JSONB DEFAULT '[]',
  actions JSONB DEFAULT '[]',
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  is_created BOOLEAN NOT NULL DEFAULT false,
  confidence INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.automation_suggestions ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Members can view suggestions in their org" ON public.automation_suggestions;
DROP POLICY IF EXISTS "Members can create suggestions" ON public.automation_suggestions;
DROP POLICY IF EXISTS "Members can update suggestions" ON public.automation_suggestions;

CREATE POLICY "Members can view suggestions in their org"
  ON public.automation_suggestions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = automation_suggestions.organization_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can create suggestions"
  ON public.automation_suggestions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = automation_suggestions.organization_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update suggestions"
  ON public.automation_suggestions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = automation_suggestions.organization_id
      AND om.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = automation_suggestions.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_auto_suggest_org_id ON public.automation_suggestions(organization_id);
CREATE INDEX IF NOT EXISTS idx_auto_suggest_created_at ON public.automation_suggestions(created_at);
CREATE INDEX IF NOT EXISTS idx_auto_suggest_dismissed ON public.automation_suggestions(is_dismissed);

-- ============================================================================
-- 5. TRIGGERS
-- ============================================================================
CREATE OR REPLACE TRIGGER update_workflows_updated_at
  BEFORE UPDATE ON public.workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_auto_suggestions_updated_at
  BEFORE UPDATE ON public.automation_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 6. FUNCTION: RECORD WORKFLOW EXECUTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.record_workflow_execution(
  p_workflow_id UUID,
  p_organization_id UUID,
  p_prospect_id UUID DEFAULT NULL,
  p_prospect_name TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'success',
  p_error_message TEXT DEFAULT NULL,
  p_duration_ms INTEGER DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.workflow_executions (
    workflow_id, organization_id, prospect_id, prospect_name, status, error_message, duration_ms, metadata
  ) VALUES (
    p_workflow_id, p_organization_id, p_prospect_id, p_prospect_name, p_status, p_error_message, p_duration_ms, p_metadata
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. FUNCTION: UPDATE WORKFLOW STATS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_workflow_stats(
  p_workflow_id UUID,
  p_success BOOLEAN,
  p_duration_ms INTEGER
) RETURNS VOID AS $$
DECLARE
  v_execution_count INTEGER;
  v_success_count INTEGER;
  v_failure_count INTEGER;
  v_avg_duration_ms INTEGER;
BEGIN
  SELECT execution_count, success_count, failure_count, avg_duration_ms INTO v_execution_count, v_success_count, v_failure_count, v_avg_duration_ms
  FROM public.workflows WHERE id = p_workflow_id;

  v_execution_count := COALESCE(v_execution_count, 0) + 1;
  v_success_count := COALESCE(v_success_count, 0) + CASE WHEN p_success THEN 1 ELSE 0 END;
  v_failure_count := COALESCE(v_failure_count, 0) + CASE WHEN p_success THEN 0 ELSE 1 END;
  v_avg_duration_ms := ROUND((COALESCE(v_avg_duration_ms, 0) * (v_execution_count - 1) + COALESCE(p_duration_ms, 0))::numeric / v_execution_count)::int;

  UPDATE public.workflows
  SET
    execution_count = v_execution_count,
    success_count = v_success_count,
    failure_count = v_failure_count,
    avg_duration_ms = v_avg_duration_ms,
    last_run_at = NOW()
  WHERE id = p_workflow_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. FUNCTION: CREATE REMINDER
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_reminder(
  p_organization_id UUID,
  p_user_id UUID,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_prospect_id UUID DEFAULT NULL,
  p_workflow_id UUID DEFAULT NULL,
  p_reminder_type TEXT DEFAULT 'custom',
  p_scheduled_for TIMESTAMPTZ DEFAULT NOW()
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.reminders (
    organization_id, user_id, title, body, prospect_id, workflow_id, reminder_type, scheduled_for
  ) VALUES (
    p_organization_id, p_user_id, p_title, p_body, p_prospect_id, p_workflow_id, p_reminder_type, p_scheduled_for
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
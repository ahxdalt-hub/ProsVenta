-- ============================================================================
-- Prosventa — Stage 7 Phase 2: Trigger & Event Engine
-- ============================================================================
-- Normalized internal event pipeline that lets active workflows react to real
-- application events. Extends the EXISTING workflow infrastructure
-- (Stage 3 automation + Stage 4 intelligence workflows + Phase 1 foundation).
--
-- Adds:
--   - workflow_events table (normalized event record + processing states)
--   - Event-level idempotency via UNIQUE (organization_id, event_key)
--   - RLS organization isolation
--   - Retention helper (90 days default — auditability without unbounded growth)
--   - workflows.trigger_type extended to accept registered event IDs
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. WORKFLOW EVENTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workflow_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'prospect.created',
      'prospect.imported',
      'prospect.updated',
      'prospect.deleted',
      'prospect.score.updated',
      'signal.detected',
      'recommendation.generated',
      'intelligence.completed',
      'intelligence.partially_completed',
      'intelligence.failed',
      'workflow.manual_triggered'
    )
  ),
  target_type TEXT,
  target_id UUID,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Stable identity used for deduplication. Producers SHOULD supply a key that
  -- is deterministic for the same underlying occurrence (e.g. signal ID).
  event_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received' CHECK (
    status IN ('received', 'processing', 'matched', 'skipped', 'executed', 'failed', 'invalid')
  ),
  skip_reason TEXT,
  processing_error TEXT,
  -- Origin metadata for loop protection / explainability:
  --   { source, origin_workflow_id, origin_execution_id, origin_chain_depth }
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  CONSTRAINT workflow_events_org_event_key_unique UNIQUE (organization_id, event_key)
);

CREATE INDEX IF NOT EXISTS idx_workflow_events_org_type
  ON public.workflow_events(organization_id, event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_events_status
  ON public.workflow_events(status)
  WHERE status IN ('received', 'processing', 'failed');

ALTER TABLE public.workflow_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org members read workflow events" ON public.workflow_events;
CREATE POLICY "org members read workflow events"
  ON public.workflow_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = workflow_events.organization_id
        AND om.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "org members insert workflow events" ON public.workflow_events;
CREATE POLICY "org members insert workflow events"
  ON public.workflow_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = workflow_events.organization_id
        AND om.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "org members update workflow events" ON public.workflow_events;
CREATE POLICY "org members update workflow events"
  ON public.workflow_events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = workflow_events.organization_id
        AND om.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 2. TRIGGER TYPE — allow registered event IDs as workflow triggers
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  ALTER TABLE public.workflows DROP CONSTRAINT IF EXISTS workflows_trigger_type_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE public.workflows
  ADD CONSTRAINT workflows_trigger_type_check CHECK (
    trigger_type IN (
      -- Legacy (Stage 3/4) triggers — kept for backwards compatibility
      'status_changed',
      'tag_added',
      'note_added',
      'high_icp_score',
      'score_threshold_crossed',
      'high_priority_signal',
      'new_company_signal',
      'prospect_role_changed',
      'company_research_updated',
      'prospect_research_updated',
      'recommendation_created',
      'recommendation_priority_high',
      -- Stage 7 Phase 2 registered event IDs
      'prospect.created',
      'prospect.imported',
      'prospect.updated',
      'prospect.deleted',
      'prospect.score.updated',
      'signal.detected',
      'recommendation.generated',
      'intelligence.completed',
      'intelligence.partially_completed',
      'intelligence.failed',
      'workflow.manual_triggered'
    )
  );

-- ----------------------------------------------------------------------------
-- 3. RETENTION — keep events long enough for debugging/audit, then purge.
--    Call periodically (pg_cron / scheduled job in a later phase).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_old_workflow_events(
  p_retention_days INTEGER DEFAULT 90
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  purged INTEGER;
BEGIN
  DELETE FROM public.workflow_events
  WHERE occurred_at < NOW() - make_interval(days => GREATEST(p_retention_days, 1));
  GET DIAGNOSTICS purged = ROW_COUNT;
  RETURN purged;
END;
$$;

-- ============================================================================
-- Prosventa — Stage 7 Phase 3: Playbook Engine
-- ============================================================================
-- A Playbook is a reusable, customer-facing business process layered ON TOP of
-- the EXISTING workflow infrastructure. No second execution engine, no second
-- action registry, no second condition engine is created.
--
--   Playbook → Workflow (existing `workflows` row)
--            → Trigger / Condition (Phase 1/2 systems)
--            → Actions (Phase 1 safe internal actions)
--            → Execution (existing workflow_executions pipeline)
--
-- Adds:
--   - playbooks table (org-scoped, status lifecycle, simple integer versioning)
--   - playbook_steps table (ordered references to existing action types)
--   - Execution↔Playbook linkage (version snapshot at execution start)
--   - RLS organization isolation on both new tables
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PLAYBOOKS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- The underlying execution mechanism. Exactly one workflow powers a playbook;
  -- executions ALWAYS flow through the existing workflow engine.
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK (
    category IN (
      'prospect_research',
      'high_intent',
      'icp_qualification',
      'new_prospect',
      'signal_response',
      'follow_up_preparation'
    )
  ),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  -- Simple version model: edits that change behaviour bump this integer.
  -- Executions snapshot the version they started with (see below).
  version INTEGER NOT NULL DEFAULT 1
    CONSTRAINT playbooks_version_positive CHECK (version > 0),
  icon TEXT,
  is_starter BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_playbooks_org_status
  ON public.playbooks(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_playbooks_workflow
  ON public.playbooks(workflow_id);

ALTER TABLE public.playbooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org members read playbooks" ON public.playbooks;
CREATE POLICY "org members read playbooks"
  ON public.playbooks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = playbooks.organization_id
        AND om.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "org members insert playbooks" ON public.playbooks;
CREATE POLICY "org members insert playbooks"
  ON public.playbooks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = playbooks.organization_id
        AND om.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "org members update playbooks" ON public.playbooks;
CREATE POLICY "org members update playbooks"
  ON public.playbooks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = playbooks.organization_id
        AND om.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = playbooks.organization_id
        AND om.user_id = auth.uid()
    )
  );


DROP POLICY IF EXISTS "org members delete playbooks" ON public.playbooks;
CREATE POLICY "org members delete playbooks"
  ON public.playbooks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = playbooks.organization_id
        AND om.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 2. PLAYBOOK STEPS — ordered references to EXISTING action types
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.playbook_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID NOT NULL REFERENCES public.playbooks(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  position INTEGER NOT NULL
    CONSTRAINT playbook_steps_position_non_negative CHECK (position >= 0),
  -- Must be a currently-supported Phase 1 safe internal action type.
  -- Validated application-side against the step catalog before activation.
  action_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Optional per-step condition (same shape as IntelligenceCondition).
  condition JSONB,
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  enabled BOOLEAN NOT NULL DEFAULT true,
  -- Marks steps that may eventually consume paid/provider resources
  -- (cost readiness only — Prosventa Credits come later).
  provider_backed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_playbook_steps_playbook
  ON public.playbook_steps(playbook_id, position);

ALTER TABLE public.playbook_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org members read playbook steps" ON public.playbook_steps;
CREATE POLICY "org members read playbook steps"
  ON public.playbook_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = playbook_steps.organization_id
        AND om.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "org members insert playbook steps" ON public.playbook_steps;
CREATE POLICY "org members insert playbook steps"
  ON public.playbook_steps FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = playbook_steps.organization_id
        AND om.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "org members update playbook steps" ON public.playbook_steps;
CREATE POLICY "org members update playbook steps"
  ON public.playbook_steps FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = playbook_steps.organization_id
        AND om.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = playbook_steps.organization_id
        AND om.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "org members delete playbook steps" ON public.playbook_steps;
CREATE POLICY "org members delete playbook steps"
  ON public.playbook_steps FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = playbook_steps.organization_id
        AND om.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 3. EXECUTION ↔ PLAYBOOK LINKAGE (version snapshot)
-- ----------------------------------------------------------------------------
-- Existing executions remain associated with the playbook version they started
-- with. Nullable so historical rows stay valid.

ALTER TABLE public.workflow_executions
  ADD COLUMN IF NOT EXISTS playbook_id UUID REFERENCES public.playbooks(id) ON DELETE SET NULL;
ALTER TABLE public.workflow_executions
  ADD COLUMN IF NOT EXISTS playbook_version INTEGER;

CREATE INDEX IF NOT EXISTS idx_workflow_executions_playbook
  ON public.workflow_executions(playbook_id, created_at DESC);

-- ============================================================================
-- Prosventa Provider Usage Log (credits preparation)
-- Stage 2 — Phase 8: Real Lead Discovery
-- ============================================================================
-- One measurable record per external provider operation so the future credit
-- engine can account for usage per organization/user/provider.
-- No credits are charged in this phase. RLS enforces organization isolation.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.provider_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  operation TEXT NOT NULL CHECK (operation IN ('lead_search')),
  provider TEXT NOT NULL,
  provider_request_id TEXT,
  estimated_cost NUMERIC NOT NULL DEFAULT 0 CHECK (estimated_cost >= 0),
  actual_cost NUMERIC CHECK (actual_cost IS NULL OR actual_cost >= 0),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provider_usage_log_org_created
  ON public.provider_usage_log (organization_id, created_at DESC);

ALTER TABLE public.provider_usage_log ENABLE ROW LEVEL SECURITY;

-- Members can view their own organization's usage records only.
CREATE POLICY "Members can view their organization's provider usage"
  ON public.provider_usage_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = provider_usage_log.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- Authenticated members can insert usage records for their own organization.
CREATE POLICY "Members can record their organization's provider usage"
  ON public.provider_usage_log
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = provider_usage_log.organization_id
      AND om.user_id = auth.uid()
    )
  );

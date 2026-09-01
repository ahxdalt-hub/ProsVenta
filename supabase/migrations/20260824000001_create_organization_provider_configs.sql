-- ============================================================================
-- Prosventa Organization Provider Configuration
-- Stage 6 - Phase 1: Data Provider & Enrichment Foundation
-- ============================================================================
-- Per-organization, NON-SECRET provider selection:
--   - Which provider id each organization uses per kind.
--   - Whether that provider is enabled for the organization.
-- SECURITY RULES:
--   - Provider API KEYS are NEVER stored here. Credentials remain in
--     server-side environment variables only.
--   - RLS restricts all access to members of the owning organization,
--     matching the existing intelligence tables' policy pattern.
-- ============================================================================
-- Also adds usage metadata to intelligence_usage so Stage 8 (Credits) can
-- later record provider cost information without another schema change.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.organization_provider_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- company_enrichment | prospect_enrichment | research | intent | ai
  kind TEXT NOT NULL CHECK (
    kind IN ('company_enrichment', 'prospect_enrichment', 'research', 'intent', 'ai')
  ),
  -- Registry provider id (e.g. "mock", "clearbit"). Never a secret value.
  provider_id TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  -- Non-secret options only. Secrets are forbidden by convention; never
  -- write credentials into this column.
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_org_provider_kind UNIQUE (organization_id, kind)
);

ALTER TABLE public.organization_provider_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view provider configs in their org" ON public.organization_provider_configs;
DROP POLICY IF EXISTS "Members can manage provider configs in their org" ON public.organization_provider_configs;

CREATE POLICY "Members can view provider configs in their org"
  ON public.organization_provider_configs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_provider_configs.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members can manage provider configs in their org"
  ON public.organization_provider_configs FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_provider_configs.organization_id
    AND om.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_provider_configs.organization_id
    AND om.user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_org_provider_configs_org_id
  ON public.organization_provider_configs(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_provider_configs_org_kind
  ON public.organization_provider_configs(organization_id, kind);

-- ============================================================================
-- Credit preparation: usage metadata on intelligence_usage
-- ============================================================================
ALTER TABLE public.intelligence_usage
  ADD COLUMN IF NOT EXISTS usage_metadata JSONB;

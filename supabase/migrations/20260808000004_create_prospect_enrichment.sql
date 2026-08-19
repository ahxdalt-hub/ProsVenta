-- Prosventa Prospect Enrichment Storage
-- Stage 4 — Phase 3: Contact & Prospect Intelligence
-- Unique (prospect_id) prevents duplicate enrichment records per prospect.
-- RLS scopes rows to the user's organization (never disabled).
-- This table is SEPARATE from the prospects table so user-provided data is
-- never overwritten by provider data.

CREATE TABLE IF NOT EXISTS public.prospect_enrichments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'none' CHECK (status IN ('none','processing','completed','failed')),
  error_code TEXT,
  error_message TEXT,
  data JSONB,
  raw JSONB,
  confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
  enriched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_prospect_enrichment UNIQUE (prospect_id)
);

ALTER TABLE public.prospect_enrichments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view prospect enrichments in their org" ON public.prospect_enrichments;
DROP POLICY IF EXISTS "Members can create prospect enrichments" ON public.prospect_enrichments;
DROP POLICY IF EXISTS "Members can update prospect enrichments" ON public.prospect_enrichments;
DROP POLICY IF EXISTS "Members can delete prospect enrichments" ON public.prospect_enrichments;

CREATE POLICY "Members can view prospect enrichments in their org"
  ON public.prospect_enrichments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = prospect_enrichments.organization_id AND om.user_id = auth.uid()));

CREATE POLICY "Members can create prospect enrichments"
  ON public.prospect_enrichments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = prospect_enrichments.organization_id AND om.user_id = auth.uid()));

CREATE POLICY "Members can update prospect enrichments"
  ON public.prospect_enrichments FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = prospect_enrichments.organization_id AND om.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = prospect_enrichments.organization_id AND om.user_id = auth.uid()));

CREATE POLICY "Members can delete prospect enrichments"
  ON public.prospect_enrichments FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = prospect_enrichments.organization_id AND om.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_prospect_enrich_org_id ON public.prospect_enrichments(organization_id);
CREATE INDEX IF NOT EXISTS idx_prospect_enrich_prospect_id ON public.prospect_enrichments(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_enrich_status ON public.prospect_enrichments(status);
CREATE INDEX IF NOT EXISTS idx_prospect_enrich_provider ON public.prospect_enrichments(provider);
CREATE INDEX IF NOT EXISTS idx_prospect_enrich_updated_at ON public.prospect_enrichments(updated_at);
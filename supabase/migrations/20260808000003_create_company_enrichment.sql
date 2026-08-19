-- Prosventa Company Enrichment Storage
-- Stage 4 — Phase 2: Company Enrichment
-- Unique (prospect_id, domain) prevents duplicate enrichment records.
-- RLS scopes rows to the user's organization (never disabled).

CREATE TABLE IF NOT EXISTS public.company_enrichments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
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
  CONSTRAINT unique_prospect_domain UNIQUE (prospect_id, domain)
);

ALTER TABLE public.company_enrichments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view company enrichments in their org" ON public.company_enrichments;
DROP POLICY IF EXISTS "Members can create company enrichments" ON public.company_enrichments;
DROP POLICY IF EXISTS "Members can update company enrichments" ON public.company_enrichments;
DROP POLICY IF EXISTS "Members can delete company enrichments" ON public.company_enrichments;

CREATE POLICY "Members can view company enrichments in their org"
  ON public.company_enrichments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = company_enrichments.organization_id AND om.user_id = auth.uid()));

CREATE POLICY "Members can create company enrichments"
  ON public.company_enrichments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = company_enrichments.organization_id AND om.user_id = auth.uid()));

CREATE POLICY "Members can update company enrichments"
  ON public.company_enrichments FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = company_enrichments.organization_id AND om.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = company_enrichments.organization_id AND om.user_id = auth.uid()));

CREATE POLICY "Members can delete company enrichments"
  ON public.company_enrichments FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = company_enrichments.organization_id AND om.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_company_enrich_org_id ON public.company_enrichments(organization_id);
CREATE INDEX IF NOT EXISTS idx_company_enrich_prospect_id ON public.company_enrichments(prospect_id);
CREATE INDEX IF NOT EXISTS idx_company_enrich_domain ON public.company_enrichments(domain);
CREATE INDEX IF NOT EXISTS idx_company_enrich_status ON public.company_enrichments(status);
CREATE INDEX IF NOT EXISTS idx_company_enrich_updated_at ON public.company_enrichments(updated_at);
CREATE INDEX IF NOT EXISTS idx_company_enrich_prospect_domain ON public.company_enrichments(prospect_id, domain);
-- ============================================================================
-- Prosventa Discovery Data-Integrity Hardening (Find Matching Leads Phase 4)
-- ============================================================================
-- Database-level guarantees that previously relied only on application checks:
--   1. One prospect per (organization, domain) — makes repeated Save clicks
--      and double-submission races idempotent at the storage layer.
--   2. One prospect per (organization, provider lead id) — stable provider
--      identity can never produce duplicates either.
-- ============================================================================

-- Provider identity for discovered leads (dedupe preference #1).
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS provider_lead_id TEXT;

-- Remove any pre-existing duplicate domains (keep the earliest record) so the
-- unique index below can be created safely on databases with legacy rows.
DELETE FROM public.prospects p
USING public.prospects q
WHERE p.domain IS NOT NULL AND p.domain <> ''
  AND p.organization_id = q.organization_id
  AND lower(p.domain) = lower(q.domain)
  AND (p.created_at, p.id) > (q.created_at, q.id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_prospects_org_domain
  ON public.prospects (organization_id, lower(domain))
  WHERE domain IS NOT NULL AND domain <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_prospects_org_provider_lead
  ON public.prospects (organization_id, provider_lead_id)
  WHERE provider_lead_id IS NOT NULL;

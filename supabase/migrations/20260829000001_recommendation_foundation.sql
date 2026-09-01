-- ============================================================================
-- Prosventa Recommendations — Feature 5: Phase 1
-- Recommendation Foundation, Data Model & Decision Architecture
-- ============================================================================
-- Extends the existing public.recommendations table (Stage 4 — Phase 8)
-- additively. Does NOT weaken any existing RLS policy and does NOT duplicate
-- Intelligence, Signals, Enrichment or ICP data.
--
--   * Lifecycle:    new → viewed → accepted | dismissed ; expired | superseded
--                   ('reviewed'/'completed' remain valid for legacy rows.)
--   * Priority:     very_high | high | medium | low | very_low
--                   Derived from existing Intelligence/scoring — never arbitrary.
--   * Confidence:   stays a SEPARATE 0–100 measure of evidence strength.
--   * Source:       intelligence (primary reasoning layer) | signal | icp | system
--   * Freshness:    fresh | aging | stale | expired  (+ explicit expires_at)
--   * Invalidation: superseded_by_id preserves history instead of deleting.
--   * Feedback:     lightweight dismissal reason + free-text feedback only
--                   (no ML personalization yet).
-- ============================================================================

-- ============================================================================
-- 1. LIFECYCLE — extend status (additive; legacy values stay valid)
-- ============================================================================
ALTER TABLE public.recommendations DROP CONSTRAINT IF EXISTS recommendations_status_check;

ALTER TABLE public.recommendations
  ADD CONSTRAINT recommendations_status_check
  CHECK (status IN (
    'new',
    'viewed',
    'accepted',
    'dismissed',
    -- Legacy Stage-4 values kept readable for historical rows.
    'reviewed',
    'completed',
    -- Expiration / invalidation states.
    'expired',
    'superseded'
  ));

-- ============================================================================
-- 2. PRIORITY — five-level scale derived from Intelligence scoring
-- ============================================================================
ALTER TABLE public.recommendations DROP CONSTRAINT IF EXISTS recommendations_priority_check;

ALTER TABLE public.recommendations
  ADD CONSTRAINT recommendations_priority_check
  CHECK (priority IN ('very_high', 'high', 'medium', 'low', 'very_low'));

-- ============================================================================
-- 3. TAXONOMY — controlled categories + reassess_prospect type extension
-- ============================================================================
ALTER TABLE public.recommendations
  ADD COLUMN IF NOT EXISTS recommendation_category TEXT CHECK (
    recommendation_category IN ('priority', 'research', 'signal', 'data_quality', 'intelligence')
  );

ALTER TABLE public.recommendations DROP CONSTRAINT IF EXISTS recommendations_recommendation_type_check;

ALTER TABLE public.recommendations
  ADD CONSTRAINT recommendations_recommendation_type_check
  CHECK (recommendation_type IN (
    'research_company',
    'research_prospect',
    'refresh_intelligence',
    'review_high_fit',
    'review_company_signal',
    'review_leadership_change',
    'review_company_context',
    'review_prospect_role',

-- ============================================================================
-- 4. SOURCE — why this recommendation exists (Intelligence stays primary)
-- ============================================================================
ALTER TABLE public.recommendations
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'intelligence' CHECK (
    source_type IN ('intelligence', 'signal', 'icp', 'system')
  );

-- Link to the Intelligence generation/version that produced this
-- recommendation (no duplicated Intelligence payload — reference only).
ALTER TABLE public.recommendations
  ADD COLUMN IF NOT EXISTS intelligence_insight_id UUID
  REFERENCES public.intelligence_insights(id) ON DELETE SET NULL;

-- ============================================================================
-- 5. FRESHNESS & EXPIRATION
-- ============================================================================
-- Explicit expiry ceiling; effective TTL depends on recommendation type and
-- is enforced deterministically by the application layer (lifecycle module).
ALTER TABLE public.recommendations
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Materialized freshness state: fresh | aging | stale | expired.
ALTER TABLE public.recommendations
  ADD COLUMN IF NOT EXISTS freshness TEXT CHECK (
    freshness IN ('fresh', 'aging', 'stale', 'expired')
  );

-- ============================================================================
-- 6. INVALIDATION — supersede instead of delete (preserve history)
-- ============================================================================
ALTER TABLE public.recommendations
  ADD COLUMN IF NOT EXISTS superseded_by_id UUID
  REFERENCES public.recommendations(id) ON DELETE SET NULL;

-- ============================================================================
-- 7. USER ACTIONS & LIGHTWEIGHT FEEDBACK
-- ============================================================================
ALTER TABLE public.recommendations ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;
ALTER TABLE public.recommendations ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE public.recommendations ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMPTZ;

-- Optional dismissal metadata: not_relevant | already_handled | incorrect |
-- not_interested | other. Lightweight — never required.
ALTER TABLE public.recommendations
  ADD COLUMN IF NOT EXISTS dismissal_reason TEXT CHECK (
    dismissal_reason IN ('not_relevant', 'already_handled', 'incorrect', 'not_interested', 'other')
  );

-- Free-text feedback stored where appropriate (ranking quality input later).
ALTER TABLE public.recommendations ADD COLUMN IF NOT EXISTS feedback TEXT;

-- ============================================================================
-- 8. INDEXES (actual query patterns: active lists, expiry sweeps, history)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_recommendations_org_active
  ON public.recommendations(organization_id, status, priority, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_org_expires
  ON public.recommendations(organization_id, expires_at)
  WHERE expires_at IS NOT NULL AND status IN ('new', 'viewed');
CREATE INDEX IF NOT EXISTS idx_recommendations_superseded_by
  ON public.recommendations(superseded_by_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_intelligence_insight
  ON public.recommendations(intelligence_insight_id);

-- ============================================================================
-- NOTE ON RLS
-- ============================================================================
-- The four organization-member RLS policies created in
-- 20260810000002_create_intelligence_recommendations.sql continue to protect
-- SELECT / INSERT / UPDATE / DELETE. This migration adds no policies and
-- weakens none.
    'investigate_business_need',
    'verify_company_info',
    'verify_prospect_info',
    'complete_icp_data',
    'review_recent_signal',
    'follow_up_company_event',
    -- Feature 5 Phase 1: reconsider a prospect whose context changed.
    'reassess_prospect'
  ));
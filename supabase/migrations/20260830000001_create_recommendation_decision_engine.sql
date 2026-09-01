-- ============================================================================
-- Prosventa Recommendations — Feature 5: Phase 2
-- Decision Engine support columns
-- ============================================================================
-- Additive only. No RLS changes; existing org-member policies on
-- public.recommendations continue to protect all operations.
--
--   primary_recommendation → exactly ONE active primary per prospect/context.
--   context_fingerprint    → stable fingerprint of the producing context;
--                            powers dedup + dismissal material-change checks
--                            without recomputing anything on read.
--   generation_trigger     → which controlled trigger produced the row
--                            (observability; no scheduler in this phase).
-- ============================================================================

ALTER TABLE public.recommendations
  ADD COLUMN IF NOT EXISTS primary_recommendation BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.recommendations
  ADD COLUMN IF NOT EXISTS context_fingerprint TEXT;

ALTER TABLE public.recommendations
  ADD COLUMN IF NOT EXISTS generation_trigger TEXT;

-- Fast lookup of a prospect's current primary recommendation.
CREATE INDEX IF NOT EXISTS idx_recommendations_prospect_primary
  ON public.recommendations(prospect_id)
  WHERE primary_recommendation IS TRUE AND status IN ('new', 'viewed');

-- Duplicate/dismissal checks by fingerprint.
CREATE INDEX IF NOT EXISTS idx_recommendations_fingerprint
  ON public.recommendations(context_fingerprint)
  WHERE context_fingerprint IS NOT NULL;

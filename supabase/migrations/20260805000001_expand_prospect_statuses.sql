-- ============================================================================
-- Prosventa Prospect Status Expansion
-- Stage 3 — Phase 1: Premium Prospect Workspace
-- ============================================================================
-- Expands the prospect status lifecycle to a full sales pipeline:
--   new, contacted, qualified, proposal_sent, negotiation, won, lost
-- ============================================================================

-- 1. Drop the old status check constraint
ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_status_check;

-- 2. Migrate existing status values to the new lifecycle
--     new      -> new
--     reviewed -> contacted
--     saved    -> qualified
--     archived -> lost
UPDATE public.prospects
SET status = CASE
  WHEN status = 'reviewed' THEN 'contacted'
  WHEN status = 'saved' THEN 'qualified'
  WHEN status = 'archived' THEN 'lost'
  ELSE 'new'
END;

-- 3. Add the new status check constraint
ALTER TABLE public.prospects
  ADD CONSTRAINT prospects_status_check
  CHECK (status IN ('new', 'contacted', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost'));

-- 4. Add tags column for prospect tagging
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

-- 5. Add priority column
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium'
  CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

-- 6. Add contact fields
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT;

-- 7. Add last_contacted_at for activity tracking
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;

-- 8. Index for tags and priority queries
CREATE INDEX IF NOT EXISTS idx_prospects_tags ON public.prospects USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_prospects_priority ON public.prospects(priority);
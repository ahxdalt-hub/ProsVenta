-- ============================================================================
-- Prosventa Saved Views & Advanced Filtering
-- Stage 3 — Phase 3: Premium Prospect Workspace
-- ============================================================================
-- This migration introduces:
--   1. saved_views table — persistent, shareable prospect views
--   2. New prospect columns: is_favorite, lead_score, ai_fit_score,
--      buying_intent, revenue
--   3. Indexes for efficient filtering on the new columns
-- ============================================================================

-- ============================================================================
-- 1. PROSPECT TABLE ENRICHMENT
-- ============================================================================

-- 1a. Add is_favorite column for prospect favoriting
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false;

-- 1b. Add lead_score column (0-100 numeric score)
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS lead_score INTEGER
  CHECK (lead_score IS NULL OR (lead_score >= 0 AND lead_score <= 100));

-- 1c. Add ai_fit_score column (0-100 AI-computed fit score)
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS ai_fit_score INTEGER
  CHECK (ai_fit_score IS NULL OR (ai_fit_score >= 0 AND ai_fit_score <= 100));

-- 1d. Add buying_intent column (low/medium/high)
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS buying_intent TEXT NOT NULL DEFAULT 'medium'
  CHECK (buying_intent IN ('low', 'medium', 'high'));

-- 1e. Add revenue column (estimated annual revenue in USD)
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS revenue BIGINT;

-- 1f. Add owner_id column for prospect ownership
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Indexes for efficient filtering on new columns
CREATE INDEX IF NOT EXISTS idx_prospects_is_favorite ON public.prospects(is_favorite);
CREATE INDEX IF NOT EXISTS idx_prospects_lead_score ON public.prospects(lead_score);
CREATE INDEX IF NOT EXISTS idx_prospects_ai_fit_score ON public.prospects(ai_fit_score);
CREATE INDEX IF NOT EXISTS idx_prospects_buying_intent ON public.prospects(buying_intent);
CREATE INDEX IF NOT EXISTS idx_prospects_revenue ON public.prospects(revenue);
CREATE INDEX IF NOT EXISTS idx_prospects_owner_id ON public.prospects(owner_id);
CREATE INDEX IF NOT EXISTS idx_prospects_updated_at ON public.prospects(updated_at);
CREATE INDEX IF NOT EXISTS idx_prospects_last_contacted_at ON public.prospects(last_contacted_at);

-- ============================================================================
-- 2. SAVED VIEWS TABLE
-- ============================================================================
-- Stores persistent prospect views with filters, sort, and search state.
-- Supports personal, shared, team, and organization-level views.

CREATE TABLE IF NOT EXISTS public.saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  -- View type: personal (only creator), shared (org-wide), team, organization
  view_type TEXT NOT NULL DEFAULT 'personal'
    CHECK (view_type IN ('personal', 'shared', 'team', 'organization')),
  -- Filter configuration stored as JSONB for flexibility
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Sort configuration
  sort_field TEXT,
  sort_order TEXT CHECK (sort_order IS NULL OR sort_order IN ('asc', 'desc')),
  -- Search term
  search TEXT,
  -- Quick filter preset (e.g., 'today', 'yesterday', 'last_7_days')
  quick_filter TEXT,
  -- Favorites only flag
  favorites_only BOOLEAN NOT NULL DEFAULT false,
  -- Pinning for quick access
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  -- Icon/emoji for visual identification
  icon TEXT,
  -- Color accent for the view tab
  color TEXT,
  -- Display order for manual sorting
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.saved_views ENABLE ROW LEVEL SECURITY;

-- Users can view their personal views
CREATE POLICY "Users can view own personal views"
  ON public.saved_views
  FOR SELECT
  USING (
    view_type = 'personal' AND created_by = auth.uid()
  );

-- Organization members can view shared/team/org views
CREATE POLICY "Organization members can view shared views"
  ON public.saved_views
  FOR SELECT
  USING (
    view_type IN ('shared', 'team', 'organization')
    AND EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = saved_views.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Users can create views for their organization
CREATE POLICY "Organization members can create views"
  ON public.saved_views
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = saved_views.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Users can update their own personal views
CREATE POLICY "Users can update own personal views"
  ON public.saved_views
  FOR UPDATE
  USING (
    view_type = 'personal' AND created_by = auth.uid()
  )
  WITH CHECK (
    view_type = 'personal' AND created_by = auth.uid()
  );

-- Org owners/admins can update shared views
CREATE POLICY "Admins can update shared views"
  ON public.saved_views
  FOR UPDATE
  USING (
    view_type IN ('shared', 'team', 'organization')
    AND EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = saved_views.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    view_type IN ('shared', 'team', 'organization')
    AND EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = saved_views.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    )
  );

-- Users can delete their own personal views
CREATE POLICY "Users can delete own personal views"
  ON public.saved_views
  FOR DELETE
  USING (
    view_type = 'personal' AND created_by = auth.uid()
  );

-- Org owners/admins can delete shared views
CREATE POLICY "Admins can delete shared views"
  ON public.saved_views
  FOR DELETE
  USING (
    view_type IN ('shared', 'team', 'organization')
    AND EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = saved_views.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    )
  );

-- Indexes for efficient view lookups
CREATE INDEX IF NOT EXISTS idx_saved_views_organization_id ON public.saved_views(organization_id);
CREATE INDEX IF NOT EXISTS idx_saved_views_created_by ON public.saved_views(created_by);
CREATE INDEX IF NOT EXISTS idx_saved_views_view_type ON public.saved_views(view_type);
CREATE INDEX IF NOT EXISTS idx_saved_views_is_pinned ON public.saved_views(is_pinned);
CREATE INDEX IF NOT EXISTS idx_saved_views_display_order ON public.saved_views(display_order);
CREATE INDEX IF NOT EXISTS idx_saved_views_created_at ON public.saved_views(created_at);

-- ============================================================================
-- 3. TRIGGER: AUTO-UPDATE UPDATED_AT TIMESTAMP
-- ============================================================================

CREATE OR REPLACE TRIGGER update_saved_views_updated_at
  BEFORE UPDATE ON public.saved_views
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
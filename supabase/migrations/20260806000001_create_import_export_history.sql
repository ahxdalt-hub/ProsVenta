-- ============================================================================
-- Prosventa Import & Export Center
-- Stage 3 — Phase 6: Import & Export Center
-- ============================================================================
-- This migration introduces:
--   1. import_history table — tracks all prospect imports
--   2. export_history table — tracks all prospect exports
--   3. RLS policies for both tables
--   4. Indexes for efficient history lookups
-- ============================================================================

-- ============================================================================
-- 1. IMPORT HISTORY TABLE
-- ============================================================================
-- Tracks every import operation with status, row counts, and error details.

CREATE TABLE IF NOT EXISTS public.import_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  file_type TEXT NOT NULL DEFAULT 'csv'
    CHECK (file_type IN ('csv', 'xlsx', 'xls', 'google_sheets', 'notion', 'api')),
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'completed', 'failed', 'cancelled')),
  total_rows INTEGER NOT NULL DEFAULT 0,
  imported_rows INTEGER NOT NULL DEFAULT 0,
  skipped_rows INTEGER NOT NULL DEFAULT 0,
  updated_rows INTEGER NOT NULL DEFAULT 0,
  failed_rows INTEGER NOT NULL DEFAULT 0,
  duplicate_rows INTEGER NOT NULL DEFAULT 0,
  -- JSON array of error objects: [{ row, message }]
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Column mapping used for this import
  column_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Duplicate handling strategy
  duplicate_strategy TEXT NOT NULL DEFAULT 'skip'
    CHECK (duplicate_strategy IN ('skip', 'replace', 'update', 'keep_both')),
  -- Duration in milliseconds
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;

-- Organization members can view import history
CREATE POLICY "Organization members can view import history"
  ON public.import_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = import_history.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Organization members can create import history records
CREATE POLICY "Organization members can create import history"
  ON public.import_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = import_history.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Users can update their own import records
CREATE POLICY "Users can update own import records"
  ON public.import_history
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Users can delete their own import records
CREATE POLICY "Users can delete own import records"
  ON public.import_history
  FOR DELETE
  USING (created_by = auth.uid());

-- Indexes for efficient history lookups
CREATE INDEX IF NOT EXISTS idx_import_history_organization_id ON public.import_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_import_history_created_by ON public.import_history(created_by);
CREATE INDEX IF NOT EXISTS idx_import_history_status ON public.import_history(status);
CREATE INDEX IF NOT EXISTS idx_import_history_created_at ON public.import_history(created_at);

-- ============================================================================
-- 2. EXPORT HISTORY TABLE
-- ============================================================================
-- Tracks every export operation with format, row counts, and status.

CREATE TABLE IF NOT EXISTS public.export_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  format TEXT NOT NULL
    CHECK (format IN ('csv', 'xlsx', 'pdf', 'google_sheets', 'notion', 'crm')),
  status TEXT NOT NULL DEFAULT 'completed'
    CHECK (status IN ('processing', 'completed', 'failed')),
  -- What was exported: all, filtered, favorites, saved_view, selected
  scope TEXT NOT NULL DEFAULT 'all'
    CHECK (scope IN ('all', 'filtered', 'favorites', 'saved_view', 'selected')),
  -- Saved view reference if scope is 'saved_view'
  saved_view_id UUID REFERENCES public.saved_views(id) ON DELETE SET NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  -- Duration in milliseconds
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE public.export_history ENABLE ROW LEVEL SECURITY;

-- Organization members can view export history
CREATE POLICY "Organization members can view export history"
  ON public.export_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = export_history.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Organization members can create export history records
CREATE POLICY "Organization members can create export history"
  ON public.export_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = export_history.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Users can update their own export records
CREATE POLICY "Users can update own export records"
  ON public.export_history
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Users can delete their own export records
CREATE POLICY "Users can delete own export records"
  ON public.export_history
  FOR DELETE
  USING (created_by = auth.uid());

-- Indexes for efficient history lookups
CREATE INDEX IF NOT EXISTS idx_export_history_organization_id ON public.export_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_export_history_created_by ON public.export_history(created_by);
CREATE INDEX IF NOT EXISTS idx_export_history_format ON public.export_history(format);
CREATE INDEX IF NOT EXISTS idx_export_history_created_at ON public.export_history(created_at);

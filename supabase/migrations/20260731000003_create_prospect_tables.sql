-- ============================================================================
-- Prosventa Prospect Database Foundation
-- Stage 2 — Phase 6: Core Product Foundation & Prospect Workspace
-- ============================================================================
-- This migration creates the prospect management tables required for the
-- prospect workspace, saved lists, and prospect notes.
-- Tables: organization_members, prospects, prospect_notes, saved_lists, saved_list_items
-- ============================================================================
-- NOTE: organization_members is created here (before the RLS policies that
-- reference it) to resolve the dependency ordering issue where migrations
-- 00003/00004 reference organization_members before 00006 created it.
-- ============================================================================

-- ============================================================================
-- 0. ORGANIZATION_MEMBERS TABLE (moved from 00006 for dependency ordering)
-- ============================================================================
-- Stores the many-to-many relationship between users and organizations.
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Ensure a user can only appear once per organization
  CONSTRAINT unique_org_member UNIQUE (organization_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Members can view their own membership records
CREATE POLICY "Members can view their organization memberships"
  ON public.organization_members
  FOR SELECT
  USING (auth.uid() = user_id);

-- Members can view all members within organizations they belong to
CREATE POLICY "Members can view other members in their org"
  ON public.organization_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- Owners and admins can insert new members.
-- Also permits the organization owner (per organizations.owner_id) to create
-- their own initial owner membership, which is required by the onboarding /
-- ensureOrganization application flows before any membership row exists.
CREATE POLICY "Owners can insert members"
  ON public.organization_members
  FOR INSERT
  WITH CHECK (
    (EXISTS (
      SELECT 1 FROM public.organizations org
      WHERE org.id = organization_members.organization_id
      AND org.owner_id = auth.uid()
    ))
    OR
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- Owners and admins can update member roles
CREATE POLICY "Owners can update member roles"
  ON public.organization_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- Members can remove themselves from an organization
CREATE POLICY "Members can remove themselves"
  ON public.organization_members
  FOR DELETE
  USING (auth.uid() = user_id);

-- Owners and admins can remove other members
CREATE POLICY "Owners can remove members"
  ON public.organization_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- Indexes for efficient membership lookups
CREATE INDEX IF NOT EXISTS idx_organization_members_organization_id ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_role ON public.organization_members(role);
CREATE INDEX IF NOT EXISTS idx_organization_members_created_at ON public.organization_members(created_at);

-- ============================================================================
-- 1. PROSPECTS TABLE
-- ============================================================================
-- Stores discovered prospects linked to an organization.
CREATE TABLE IF NOT EXISTS public.prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  website TEXT,
  industry TEXT,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'invalid', 'saved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

-- Organization members can view prospects belonging to their organization
CREATE POLICY "Organization members can view prospects"
  ON public.prospects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = prospects.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Organization members can create prospects for their organization
CREATE POLICY "Organization members can insert prospects"
  ON public.prospects
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = prospects.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Organization members can update prospects for their organization
CREATE POLICY "Organization members can update prospects"
  ON public.prospects
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = prospects.organization_id
      AND organization_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = prospects.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Organization members can delete prospects for their organization
CREATE POLICY "Organization members can delete prospects"
  ON public.prospects
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = prospects.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Indexes for efficient prospect lookups
CREATE INDEX IF NOT EXISTS idx_prospects_organization_id ON public.prospects(organization_id);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON public.prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_industry ON public.prospects(industry);
CREATE INDEX IF NOT EXISTS idx_prospects_location ON public.prospects(location);
CREATE INDEX IF NOT EXISTS idx_prospects_created_at ON public.prospects(created_at);
CREATE INDEX IF NOT EXISTS idx_prospects_company_name ON public.prospects(company_name);

-- ============================================================================
-- 2. PROSPECT NOTES TABLE
-- ============================================================================
-- Stores user notes attached to individual prospects.
CREATE TABLE IF NOT EXISTS public.prospect_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.prospect_notes ENABLE ROW LEVEL SECURITY;

-- Users can view notes on prospects they have access to
CREATE POLICY "Users can view prospect notes"
  ON public.prospect_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.prospects
      JOIN public.organization_members ON organization_members.organization_id = prospects.organization_id
      WHERE prospects.id = prospect_notes.prospect_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Users can create their own notes
CREATE POLICY "Users can insert own prospect notes"
  ON public.prospect_notes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own notes
CREATE POLICY "Users can update own prospect notes"
  ON public.prospect_notes
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own notes
CREATE POLICY "Users can delete own prospect notes"
  ON public.prospect_notes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for efficient note lookups
CREATE INDEX IF NOT EXISTS idx_prospect_notes_prospect_id ON public.prospect_notes(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_notes_user_id ON public.prospect_notes(user_id);

-- ============================================================================
-- 3. SAVED LISTS TABLE
-- ============================================================================
-- Stores saved prospect lists created by organization members.
CREATE TABLE IF NOT EXISTS public.saved_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.saved_lists ENABLE ROW LEVEL SECURITY;

-- Organization members can view saved lists belonging to their organization
CREATE POLICY "Organization members can view saved lists"
  ON public.saved_lists
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = saved_lists.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Organization members can create saved lists for their organization
CREATE POLICY "Organization members can insert saved lists"
  ON public.saved_lists
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = saved_lists.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Organization members can update saved lists for their organization
CREATE POLICY "Organization members can update saved lists"
  ON public.saved_lists
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = saved_lists.organization_id
      AND organization_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = saved_lists.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Organization members can delete saved lists for their organization
CREATE POLICY "Organization members can delete saved lists"
  ON public.saved_lists
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = saved_lists.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Indexes for efficient saved list lookups
CREATE INDEX IF NOT EXISTS idx_saved_lists_organization_id ON public.saved_lists(organization_id);
CREATE INDEX IF NOT EXISTS idx_saved_lists_created_at ON public.saved_lists(created_at);

-- ============================================================================
-- 4. SAVED LIST ITEMS TABLE
-- ============================================================================
-- Stores the many-to-many relationship between saved lists and prospects.
CREATE TABLE IF NOT EXISTS public.saved_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.saved_lists(id) ON DELETE CASCADE,
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Ensure a prospect can only be added once per list
  CONSTRAINT unique_list_prospect UNIQUE (list_id, prospect_id)
);

-- Enable Row Level Security
ALTER TABLE public.saved_list_items ENABLE ROW LEVEL SECURITY;

-- Organization members can view list items for lists they have access to
CREATE POLICY "Organization members can view saved list items"
  ON public.saved_list_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.saved_lists
      JOIN public.organization_members ON organization_members.organization_id = saved_lists.organization_id
      WHERE saved_lists.id = saved_list_items.list_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Organization members can add items to lists they have access to
CREATE POLICY "Organization members can insert saved list items"
  ON public.saved_list_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.saved_lists
      JOIN public.organization_members ON organization_members.organization_id = saved_lists.organization_id
      WHERE saved_lists.id = saved_list_items.list_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Organization members can remove items from lists they have access to
CREATE POLICY "Organization members can delete saved list items"
  ON public.saved_list_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.saved_lists
      JOIN public.organization_members ON organization_members.organization_id = saved_lists.organization_id
      WHERE saved_lists.id = saved_list_items.list_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Indexes for efficient list item lookups
CREATE INDEX IF NOT EXISTS idx_saved_list_items_list_id ON public.saved_list_items(list_id);
CREATE INDEX IF NOT EXISTS idx_saved_list_items_prospect_id ON public.saved_list_items(prospect_id);

-- ============================================================================
-- 5. TRIGGER: AUTO-UPDATE UPDATED_AT TIMESTAMP
-- ============================================================================
-- Apply updated_at trigger to new tables that have updated_at column.

CREATE OR REPLACE TRIGGER update_prospects_updated_at
  BEFORE UPDATE ON public.prospects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_saved_lists_updated_at
  BEFORE UPDATE ON public.saved_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
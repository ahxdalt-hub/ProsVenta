-- ============================================================================
-- Prosventa Organization & Team Workspace
-- Stage 2 — Phase 9: Organization & Team Workspace
-- ============================================================================
-- This migration creates the organization_members table (referenced in earlier
-- RLS policies but not yet created), adds organization profile fields, and
-- establishes row-level security for team collaboration.
-- ============================================================================

-- ============================================================================
-- 1. ORGANIZATION_MEMBERS TABLE
-- ============================================================================
-- Stores the many-to-many relationship between users and organizations.
-- Created with IF NOT EXISTS for safety (may already exist from manual setup).
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Ensure a user can only appear once per organization
  CONSTRAINT unique_org_member UNIQUE (organization_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-runs)
DROP POLICY IF EXISTS "Members can view their organization memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Members can view other members in their org" ON public.organization_members;
DROP POLICY IF EXISTS "Owners can insert members" ON public.organization_members;
DROP POLICY IF EXISTS "Owners can update member roles" ON public.organization_members;
DROP POLICY IF EXISTS "Members can remove themselves" ON public.organization_members;
DROP POLICY IF EXISTS "Owners can remove members" ON public.organization_members;

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
-- 2. ORGANIZATION PROFILE FIELDS
-- ============================================================================
-- Extends the organizations table with workspace profile data.
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- ============================================================================
-- 3. UPDATE ORGANIZATIONS RLS POLICIES
-- ============================================================================
-- Drop owner-only policies and replace with membership-based policies
-- so that all organization members can view their workspace.
DROP POLICY IF EXISTS "Owners can view their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owners can update their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owners can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owners can delete their organizations" ON public.organizations;

-- Members can view organizations they belong to
CREATE POLICY "Members can view their organization"
  ON public.organizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Owners can update their organization
CREATE POLICY "Owners can update their organization"
  ON public.organizations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'owner'
    )
  );

-- Any authenticated user can create an organization (they become the owner)
CREATE POLICY "Users can create organizations"
  ON public.organizations
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Owners can delete their organization
CREATE POLICY "Owners can delete their organization"
  ON public.organizations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'owner'
    )
  );

-- ============================================================================
-- 4. TRIGGER: AUTO-UPDATE UPDATED_AT FOR ORGANIZATION_MEMBERS
-- ============================================================================
-- Apply the updated_at trigger to the new table.
CREATE OR REPLACE TRIGGER update_organization_members_updated_at
  BEFORE UPDATE ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 5. INDEXES FOR ORGANIZATION PROFILE FIELDS
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_organizations_industry ON public.organizations(industry);
CREATE INDEX IF NOT EXISTS idx_organizations_country ON public.organizations(country);
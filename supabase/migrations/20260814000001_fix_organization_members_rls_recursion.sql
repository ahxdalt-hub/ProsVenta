-- ============================================================================
-- Prosventa RLS Recursion Fix — organization_members
-- ============================================================================
-- Fixes: "infinite recursion detected in policy for relation organization_members"
--
-- ROOT CAUSE
-- ----------
-- The SELECT policy "Members can view other members in their org" on
-- public.organization_members contains a subquery that reads
-- public.organization_members itself:
--
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.organization_members om
--       WHERE om.organization_id = organization_members.organization_id
--       AND om.user_id = auth.uid()
--     )
--   )
--
-- Because RLS is enabled on organization_members, that inner subquery is also
-- subject to RLS, so evaluating the policy re-triggers itself → infinite
-- recursion. The same self-referencing pattern exists in the admin-check
-- branches of the INSERT / UPDATE / DELETE policies on this table.
--
-- FIX
-- ----
-- Introduce SECURITY DEFINER helper functions (is_org_member / is_org_admin)
-- that check membership while bypassing RLS (standard Supabase pattern), and
-- rewrite the self-referencing policies to use them. No tables are dropped,
-- no data is deleted, RLS remains enabled, and multi-tenant isolation is
-- preserved (all checks are scoped to auth.uid()).
-- ============================================================================

-- ============================================================================
-- 1. HELPER FUNCTIONS (SECURITY DEFINER — bypass RLS to avoid recursion)
-- ============================================================================

-- Returns true if the current user is a member of the given organization.
CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_org_id
      AND user_id = auth.uid()
  );
$$;

-- Returns true if the current user is an owner or admin of the given organization.
CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_org_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  );
$$;

-- ============================================================================
-- 2. REWRITE SELF-REFERENCING POLICIES ON organization_members
-- ============================================================================

-- SELECT: members can view all members in organizations they belong to
DROP POLICY IF EXISTS "Members can view other members in their org" ON public.organization_members;
CREATE POLICY "Members can view other members in their org"
  ON public.organization_members
  FOR SELECT
  USING (public.is_org_member(organization_id));

-- INSERT: owners/admins can add members; org owner can create their own
-- initial owner membership during onboarding (before any membership row exists).
DROP POLICY IF EXISTS "Owners can insert members" ON public.organization_members;
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
    public.is_org_admin(organization_members.organization_id)
  );

-- UPDATE: owners/admins can update member roles
DROP POLICY IF EXISTS "Owners can update member roles" ON public.organization_members;
CREATE POLICY "Owners can update member roles"
  ON public.organization_members
  FOR UPDATE
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

-- DELETE: owners/admins can remove other members
-- (self-removal is covered by the separate "Members can remove themselves" policy)
DROP POLICY IF EXISTS "Owners can remove members" ON public.organization_members;
CREATE POLICY "Owners can remove members"
  ON public.organization_members
  FOR DELETE
  USING (public.is_org_admin(organization_id));
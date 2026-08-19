-- ============================================================================
-- Prosventa RLS Fix — organizations policies use SECURITY DEFINER helpers
-- ============================================================================
-- Fixes: "new row violates row-level security policy for table organizations"
--
-- ROOT CAUSE
-- ----------
-- The organizations SELECT/UPDATE/DELETE policies used inline subqueries that
-- read from public.organization_members:
--
--   USING (EXISTS (
--     SELECT 1 FROM organization_members
--     WHERE organization_members.organization_id = organizations.id
--       AND organization_members.user_id = auth.uid()
--   ))
--
-- Because RLS is enabled on organization_members, that inner subquery is
-- subject to RLS. During onboarding, when the app inserts a new organization
-- (INSERT ... RETURNING), PostgreSQL re-evaluates the SELECT policy, which
-- hits the RLS-restricted subquery on organization_members. If the membership
-- row does not yet exist (or RLS blocks the subquery), the insert fails with
-- "new row violates row-level security policy for table organizations".
--
-- FIX
-- ----
-- 1. Rewrite the organizations policies to use the existing SECURITY DEFINER
--    helper functions (is_org_member / is_org_admin), which bypass RLS and
--    avoid any policy interaction.
-- 2. The SELECT policy also allows the organization owner (organizations.owner_id
--    = auth.uid()) to see their own organization even before the membership row
--    is created during onboarding. This is critical because the onboarding flow
--    does: INSERT INTO organizations ... RETURNING *  (before the membership
--    row exists).
--
-- No tables are dropped, no data is deleted, RLS remains enabled, and
-- multi-tenant isolation is preserved.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. organizations — SELECT: members AND the owner can view the organization
--    (owner check is required so INSERT ... RETURNING works during onboarding
--     before the membership row exists)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view their organization" ON public.organizations;
CREATE POLICY "Members can view their organization"
  ON public.organizations
  FOR SELECT
  USING (public.is_org_member(id) OR owner_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 2. organizations — INSERT: any authenticated user can create an organization
--    (owner membership is created separately during onboarding)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;
CREATE POLICY "Users can create organizations"
  ON public.organizations
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ----------------------------------------------------------------------------
-- 3. organizations — UPDATE: owners/admins can update their organization
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Owners can update their organization" ON public.organizations;
CREATE POLICY "Owners can update their organization"
  ON public.organizations
  FOR UPDATE
  USING (public.is_org_admin(id) OR owner_id = auth.uid())
  WITH CHECK (public.is_org_admin(id) OR owner_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 4. organizations — DELETE: owners/admins can delete their organization
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Owners can delete their organization" ON public.organizations;
CREATE POLICY "Owners can delete their organization"
  ON public.organizations
  FOR DELETE
  USING (public.is_org_admin(id) OR owner_id = auth.uid());
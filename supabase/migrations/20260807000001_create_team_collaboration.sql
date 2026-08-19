-- ============================================================================
-- Prosventa Team Collaboration
-- Stage 3 — Phase 7: Team Collaboration System
-- ============================================================================
-- This migration creates the collaboration infrastructure:
--   - Extended roles (owner, admin, manager, sales, viewer)
--   - Member status tracking (active, invited, suspended)
--   - Prospect comments with @mentions and replies
--   - Activity feed
--   - Notifications
--   - Invitations
--   - Workspace settings (timezone, currency)
-- ============================================================================

-- ============================================================================
-- 1. EXTEND ORGANIZATION_MEMBERS
-- ============================================================================
-- Add status and last_active tracking to organization_members
ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'invited', 'suspended')),
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update the role check constraint to support the new roles
ALTER TABLE public.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_role_check;

ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_role_check
  CHECK (role IN ('owner', 'admin', 'manager', 'sales', 'viewer'));

-- ============================================================================
-- 2. ORGANIZATION WORKSPACE SETTINGS
-- ============================================================================
-- Add workspace settings to the organizations table
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS default_currency TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS brand_color TEXT,
  ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free'
    CHECK (subscription_plan IN ('free', 'pro', 'business', 'enterprise'));

-- ============================================================================
-- 3. PROSPECT COMMENTS
-- ============================================================================
-- Internal team comments on prospects with @mentions and replies
CREATE TABLE IF NOT EXISTS public.prospect_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.prospect_comments(id) ON DELETE CASCADE,
  mentions UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.prospect_comments ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Members can view comments in their org" ON public.prospect_comments;
DROP POLICY IF EXISTS "Members can create comments" ON public.prospect_comments;
DROP POLICY IF EXISTS "Authors can update their comments" ON public.prospect_comments;
DROP POLICY IF EXISTS "Authors can delete their comments" ON public.prospect_comments;

CREATE POLICY "Members can view comments in their org"
  ON public.prospect_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = prospect_comments.organization_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can create comments"
  ON public.prospect_comments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = prospect_comments.organization_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Authors can update their comments"
  ON public.prospect_comments
  FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can delete their comments"
  ON public.prospect_comments
  FOR DELETE
  USING (auth.uid() = author_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_prospect_comments_prospect_id ON public.prospect_comments(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_comments_organization_id ON public.prospect_comments(organization_id);
CREATE INDEX IF NOT EXISTS idx_prospect_comments_author_id ON public.prospect_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_prospect_comments_parent_id ON public.prospect_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_prospect_comments_created_at ON public.prospect_comments(created_at);

-- ============================================================================
-- 4. ACTIVITY FEED
-- ============================================================================
-- Tracks all important actions across the workspace
CREATE TABLE IF NOT EXISTS public.activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Members can view activity in their org" ON public.activity_events;
DROP POLICY IF EXISTS "Members can create activity" ON public.activity_events;

CREATE POLICY "Members can view activity in their org"
  ON public.activity_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = activity_events.organization_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can create activity"
  ON public.activity_events
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = activity_events.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_activity_events_organization_id ON public.activity_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_actor_id ON public.activity_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_created_at ON public.activity_events(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_events_entity ON public.activity_events(entity_type, entity_id);

-- ============================================================================
-- 5. NOTIFICATIONS
-- ============================================================================
-- User notifications for mentions, assignments, updates, etc.
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  entity_type TEXT,
  entity_id UUID,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their notifications" ON public.notifications;

CREATE POLICY "Users can view their notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their notifications"
  ON public.notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_organization_id ON public.notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

-- ============================================================================
-- 6. INVITATIONS
-- ============================================================================
-- Pending member invitations
CREATE TABLE IF NOT EXISTS public.organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'admin', 'manager', 'sales', 'viewer')),
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'revoked')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_pending_invite UNIQUE (organization_id, email)
);

-- Enable RLS
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Members can view invitations in their org" ON public.organization_invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON public.organization_invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON public.organization_invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON public.organization_invitations;

CREATE POLICY "Members can view invitations in their org"
  ON public.organization_invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_invitations.organization_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can create invitations"
  ON public.organization_invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_invitations.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins can update invitations"
  ON public.organization_invitations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_invitations.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_invitations.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins can delete invitations"
  ON public.organization_invitations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_invitations.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_org_invitations_org_id ON public.organization_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invitations_email ON public.organization_invitations(email);
CREATE INDEX IF NOT EXISTS idx_org_invitations_status ON public.organization_invitations(status);
CREATE INDEX IF NOT EXISTS idx_org_invitations_token ON public.organization_invitations(token);

-- ============================================================================
-- 7. SHARED VIEWS
-- ============================================================================
-- Extend saved_views with sharing metadata
ALTER TABLE public.saved_views
  ADD COLUMN IF NOT EXISTS shared_with TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS shared_role TEXT DEFAULT 'viewer'
    CHECK (shared_role IN ('viewer', 'editor'));

-- ============================================================================
-- 8. TRIGGERS
-- ============================================================================
-- Update updated_at for new tables
CREATE OR REPLACE TRIGGER update_prospect_comments_updated_at
  BEFORE UPDATE ON public.prospect_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_org_invitations_updated_at
  BEFORE UPDATE ON public.organization_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 9. FUNCTION: RECORD ACTIVITY
-- ============================================================================
-- Helper function to record activity events
CREATE OR REPLACE FUNCTION public.record_activity(
  p_organization_id UUID,
  p_actor_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_entity_name TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.activity_events (
    organization_id, actor_id, action, entity_type, entity_id, entity_name, metadata
  ) VALUES (
    p_organization_id, p_actor_id, p_action, p_entity_type, p_entity_id, p_entity_name, p_metadata
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 10. FUNCTION: CREATE NOTIFICATION
-- ============================================================================
-- Helper function to create notifications
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_organization_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id, organization_id, type, title, body, entity_type, entity_id, actor_id
  ) VALUES (
    p_user_id, p_organization_id, p_type, p_title, p_body, p_entity_type, p_entity_id, p_actor_id
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
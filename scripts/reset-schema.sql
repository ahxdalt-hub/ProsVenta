-- ============================================================================
-- Prosventa Database Rebuild — Schema Reset
-- ============================================================================
-- Drops the existing (test-only, manually-created) public schema and recreates
-- it cleanly so all migrations can be applied in dependency order.
-- The ONLY data loss is the personal test account data, per user approval.
-- ============================================================================

-- Drop storage policies if they exist (bucket itself is created by migration
-- 20260803_00001 via INSERT ... ON CONFLICT DO NOTHING; direct bucket deletion
-- is blocked by Supabase storage protection).
DROP POLICY IF EXISTS "Users can upload their own profile image" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own profile image" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile image" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile image" ON storage.objects;

-- Drop the entire public schema (tables, functions, triggers, policies, etc.)
DROP SCHEMA public CASCADE;

-- Recreate a clean public schema with standard Supabase privileges
CREATE SCHEMA public;

GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO PUBLIC;

-- Reinstall default table grants
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- Ensure future objects inherit the same privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
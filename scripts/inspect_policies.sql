SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('organizations', 'organization_members', 'profiles', 'user_settings')
ORDER BY tablename, cmd, policyname;
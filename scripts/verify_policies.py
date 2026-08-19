"""Verify current RLS policies on organization tables after migration."""
import psycopg2, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from db_helper import DATABASE_URL

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# 1. Check all policies on organizations and organization_members
cur.execute("""
    SELECT tablename, policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('organizations', 'organization_members', 'profiles', 'user_settings')
    ORDER BY tablename, cmd, policyname
""")
rows = cur.fetchall()
print("=== RLS POLICIES ===")
for r in rows:
    print(f"\nTABLE: {r[0]} | POLICY: {r[1]} | CMD: {r[2]}")
    print(f"  USING: {r[3]}")
    print(f"  WITH CHECK: {r[4]}")

# Check helper functions
print("\n=== HELPER FUNCTIONS ===")
cur.execute("""
    SELECT p.proname, pg_get_functiondef(p.oid)
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN ('is_org_member', 'is_org_admin')
    ORDER BY p.proname
""")
for name, defn in cur.fetchall():
    print(f"\n{name}:")
    print(defn)

conn.close()
print("\nDone.")
</execute_command>
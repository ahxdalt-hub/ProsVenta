import psycopg2

DB = dict(
    host='aws-0-ap-southeast-1.pooler.supabase.com',
    port=6543,
    dbname='postgres',
    user='postgres.fqznwnoesagaxrbyxdxx',
    password=__import__('os').environ.get('SUPABASE_DB_PASSWORD', ''),
    sslmode='require',
    connect_timeout=15
)

def main():
    conn = psycopg2.connect(**DB)
    cur = conn.cursor()

    print("=== FINAL RECURSION CHECK (precise) ===")
    # A true recursive policy would contain 'FROM organization_members' in its USING/WITH CHECK.
    # Column references like organization_members.organization_id are just the table's row qualifier, not recursion.
    cur.execute("""
        SELECT tablename, policyname, qual, with_check
        FROM pg_policies
        WHERE schemaname='public'
        AND tablename='organization_members'
    """)
    recursive = False
    for r in cur.fetchall():
        expr = (r[2] or '') + (r[3] or '')
        # Look for actual subquery reads on the membership table itself
        # 'FROM organization_members' = actual subquery (recursion), column quals = benign
        has_self_read = ' FROM public.organization_members' in expr or ' FROM organization_members' in expr
        print(f"  {r[1]}: self-subquery-read={'YES' if has_self_read else 'no'}")
        if has_self_read:
            recursive = True
    print(f"  RESULT: {'FAIL - actual recursion found' if recursive else 'PASS - no real recursion'}")

    print("\n=== RLS STILL ENABLED ===")
    cur.execute("""
        SELECT tablename, rowsecurity FROM pg_tables
        WHERE schemaname='public'
        AND tablename IN ('organizations','organization_members','profiles','user_settings')
        ORDER BY tablename
    """)
    for r in cur.fetchall():
        print(f"  {r[0]}: RLS={'ON' if r[1] else 'OFF'}")

    print("\n=== HELPER FUNCTIONS PRESENT ===")
    cur.execute("""
        SELECT p.proname, p.prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname IN ('is_org_member','is_org_admin')
        ORDER BY p.proname
    """)
    for r in cur.fetchall():
        print(f"  {r[0]}() SECURITY DEFINER={'yes' if r[1] else 'no'}")

    print("\n=== ORGANIZATIONS POLICIES (final) ===")
    cur.execute("""
        SELECT policyname, cmd, qual, with_check FROM pg_policies
        WHERE schemaname='public' AND tablename='organizations'
        ORDER BY cmd
    """)
    for r in cur.fetchall():
        print(f"  {r[0]} [{r[1]}]")
        print(f"    USING: {r[2]}")
        if r[3]:
            print(f"    WITH CHECK: {r[3]}")

    print("\n=== ORGANIZATION_MEMBERS POLICIES (final) ===")
    cur.execute("""
        SELECT policyname, cmd, qual, with_check FROM pg_policies
        WHERE schemaname='public' AND tablename='organization_members'
        ORDER BY cmd, policyname
    """)
    for r in cur.fetchall():
        print(f"  {r[0]} [{r[1]}]")
        print(f"    USING: {r[2]}")
        if r[3]:
            print(f"    WITH CHECK: {r[3]}")

    conn.close()
    print("\n=== FINAL CHECK COMPLETE ===")

if __name__ == '__main__':
    main()
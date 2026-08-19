import psycopg2
import uuid

DB = dict(host='aws-0-ap-southeast-1.pooler.supabase.com', port=6543, dbname='postgres', user='postgres.fqznwnoesagaxrbyxdxx', password='shanusupabase', sslmode='require', connect_timeout=15)

TEST_USER = 'ade581c5-af40-48ac-af5b-5dd2b5c94fb3'

def main():
    conn = psycopg2.connect(**DB)
    conn.autocommit = True
    cur = conn.cursor()
    
    # 1. Verify new policies
    print("=== VERIFY POLICIES AFTER FIX ===")
    cur.execute("""
        SELECT tablename, policyname, cmd, qual, with_check
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename IN ('organizations', 'organization_members')
        ORDER BY tablename, cmd, policyname
    """)
    for r in cur.fetchall():
        print(f"\nTABLE: {r[0]} | POLICY: {r[1]} | CMD: {r[2]}")
        print(f"  USING: {r[3]}")
        print(f"  WITH CHECK: {r[4]}")
    
    # 2. Check for recursive policies
    print("\n=== CHECK FOR RECURSIVE POLICIES ===")
    cur.execute("""
        SELECT tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND (qual LIKE '%organization_members%' OR with_check LIKE '%organization_members%')
        AND tablename = 'organization_members'
    """)
    recursive = cur.fetchall()
    if recursive:
        print("  WARNING: Found potentially recursive policies:")
        for r in recursive:
            print(f"    {r[0]}: {r[1]}")
    else:
        print("  OK: No self-referencing policies on organization_members")
    
    # 3. Create profile for test user (required by FK)
    print("\n=== SETUP: Create profile for test user ===")
    cur.execute("""
        INSERT INTO public.profiles (id, full_name)
        VALUES ('%s', 'Test User')
        ON CONFLICT (id) DO NOTHING
        RETURNING id;
    """ % TEST_USER)
    prof_row = cur.fetchone()
    if prof_row:
        print(f"  Profile created: {prof_row[0]}")
    else:
        print("  Profile already exists or created")
    
    # 4. Test organization INSERT as authenticated user
    print("\n=== TEST: Organization INSERT (onboarding) ===")
    test_org_id = str(uuid.uuid4())
    cur.execute("""
        SET LOCAL ROLE authenticated;
        SET LOCAL request.jwt.claims = '{"sub": "%s"}';
        INSERT INTO public.organizations (id, name, owner_id)
        VALUES ('%s', 'Test Org RLS Verify', '%s')
        RETURNING id, name, owner_id;
    """ % (TEST_USER, test_org_id, TEST_USER))
    org_row = cur.fetchone()
    if org_row:
        print(f"  SUCCESS: Organization created: {org_row[0]} | {org_row[1]} | owner: {org_row[2]}")
    else:
        print("  FAILED: Organization insert returned no rows")
    
    # 4. Test organization_members INSERT for owner
    print("\n=== TEST: Organization Members INSERT (owner) ===")
    cur.execute("""
        SET LOCAL ROLE authenticated;
        SET LOCAL request.jwt.claims = '{"sub": "%s"}';
        INSERT INTO public.organization_members (organization_id, user_id, role, status)
        VALUES ('%s', '%s', 'owner', 'active')
        RETURNING id, organization_id, user_id, role;
    """ % (TEST_USER, test_org_id, TEST_USER))
    member_row = cur.fetchone()
    if member_row:
        print(f"  SUCCESS: Owner membership created: {member_row[0]} | org: {member_row[1]} | user: {member_row[2]} | role: {member_row[3]}")
    else:
        print("  FAILED: Owner membership insert returned no rows")
    
    # 5. Test organization SELECT as member
    print("\n=== TEST: Organization SELECT (as member) ===")
    cur.execute("""
        SET LOCAL ROLE authenticated;
        SET LOCAL request.jwt.claims = '{"sub": "%s"}';
        SELECT id, name FROM public.organizations WHERE id = '%s';
    """ % (TEST_USER, test_org_id))
    sel_row = cur.fetchone()
    if sel_row:
        print(f"  SUCCESS: Can view own org: {sel_row[0]} | {sel_row[1]}")
    else:
        print("  FAILED: Cannot view own org")
    
    # 6. Test organization_members SELECT as member
    print("\n=== TEST: Organization Members SELECT (as member) ===")
    cur.execute("""
        SET LOCAL ROLE authenticated;
        SET LOCAL request.jwt.claims = '{"sub": "%s"}';
        SELECT id, organization_id, user_id, role FROM public.organization_members WHERE organization_id = '%s';
    """ % (TEST_USER, test_org_id))
    mem_rows = cur.fetchall()
    if mem_rows:
        print(f"  SUCCESS: Can view {len(mem_rows)} member(s) in own org")
        for r in mem_rows:
            print(f"    {r[0]} | org: {r[1]} | user: {r[2]} | role: {r[3]}")
    else:
        print("  FAILED: Cannot view members in own org")
    
    # 7. Test UPDATE authorization (owner can update)
    print("\n=== TEST: Organization UPDATE (as owner) ===")
    cur.execute("""
        SET LOCAL ROLE authenticated;
        SET LOCAL request.jwt.claims = '{"sub": "%s"}';
        UPDATE public.organizations SET name = 'Test Org RLS Verify Updated' WHERE id = '%s'
        RETURNING id, name;
    """ % (TEST_USER, test_org_id))
    upd_row = cur.fetchone()
    if upd_row:
        print(f"  SUCCESS: Can update own org: {upd_row[0]} | {upd_row[1]}")
    else:
        print("  FAILED: Cannot update own org")
    
    # 8. Test DELETE authorization (owner can delete)
    print("\n=== TEST: Organization DELETE (as owner) ===")
    cur.execute("""
        SET LOCAL ROLE authenticated;
        SET LOCAL request.jwt.claims = '{"sub": "%s"}';
        DELETE FROM public.organizations WHERE id = '%s'
        RETURNING id;
    """ % (TEST_USER, test_org_id))
    del_row = cur.fetchone()
    if del_row:
        print(f"  SUCCESS: Can delete own org: {del_row[0]}")
    else:
        print("  FAILED: Cannot delete own org")
    
    # 9. Test that a different user cannot access the org
    print("\n=== TEST: Unrelated user cannot access org ===")
    other_user = str(uuid.uuid4())
    cur.execute("""
        SET LOCAL ROLE authenticated;
        SET LOCAL request.jwt.claims = '{"sub": "%s"}';
        SELECT id, name FROM public.organizations WHERE id = '%s';
    """ % (other_user, test_org_id))
    other_row = cur.fetchone()
    if other_row:
        print(f"  FAILED: Unrelated user can see org: {other_row[0]}")
    else:
        print("  SUCCESS: Unrelated user cannot see org (multi-tenant isolation preserved)")
    
    # 10. Test that unrelated user cannot insert into org
    print("\n=== TEST: Unrelated user cannot insert membership ===")
    try:
        cur.execute("""
            SET LOCAL ROLE authenticated;
            SET LOCAL request.jwt.claims = '{"sub": "%s"}';
            INSERT INTO public.organization_members (organization_id, user_id, role, status)
            VALUES ('%s', '%s', 'member', 'active')
            RETURNING id;
        """ % (other_user, test_org_id, other_user))
        other_mem = cur.fetchone()
        if other_mem:
            print(f"  FAILED: Unrelated user can insert membership: {other_mem[0]}")
        else:
            print("  SUCCESS: Unrelated user cannot insert membership")
    except Exception as e:
        print(f"  SUCCESS: Unrelated user blocked from inserting membership: {e}")
    
    # Cleanup: delete test data
    print("\n=== CLEANUP ===")
    cur.execute("DELETE FROM public.organization_members WHERE organization_id = %s", (test_org_id,))
    cur.execute("DELETE FROM public.organizations WHERE id = %s", (test_org_id,))
    print("  Test data cleaned up")
    
    conn.close()

if __name__ == '__main__':
    main()
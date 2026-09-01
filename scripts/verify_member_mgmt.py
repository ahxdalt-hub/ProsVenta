import psycopg2
import uuid

DB = dict(
    host='aws-0-ap-southeast-1.pooler.supabase.com',
    port=6543,
    dbname='postgres',
    user='postgres.fqznwnoesagaxrbyxdxx',
    password=__import__('os').environ.get('SUPABASE_DB_PASSWORD', ''),
    sslmode='require',
    connect_timeout=15
)

UA = 'ade581c5-af40-48ac-af5b-5dd2b5c94fb3'  # existing auth user
UB = str(uuid.uuid4())  # member B
UC = str(uuid.uuid4())  # member C


def main():
    conn = psycopg2.connect(**DB)
    conn.autocommit = True
    cur = conn.cursor()

    def jwt_claims(u):
        return '{"sub": "' + u + '"}'

    print("=== SETUP: create auth users B and C ===")
    # Clean up any leftover test users from a previous run
    cur.execute("DELETE FROM public.profiles WHERE id IN (%s, %s)", (UB, UC))
    cur.execute("DELETE FROM auth.users WHERE email IN %s",
                (('member_b@test.com', 'member_c@test.com'),))
    for uid, email in [(UB, 'member_b@test.com'), (UC, 'member_c@test.com')]:
        cur.execute("""
            INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at,
                                    created_at, updated_at, raw_app_meta_data,
                                    raw_user_meta_data, aud, role)
            VALUES (%s, %s, 'x', now(), now(), now(), '{}', '{}',
                    'authenticated', 'authenticated')
            ON CONFLICT (id) DO NOTHING
        """, (uid, email))
    cur.execute(
        "INSERT INTO public.profiles (id, full_name, onboarding_completed) "
        "VALUES (%s, 'Member B', false) ON CONFLICT (id) DO NOTHING", (UB,))
    cur.execute(
        "INSERT INTO public.profiles (id, full_name, onboarding_completed) "
        "VALUES (%s, 'Member C', false) ON CONFLICT (id) DO NOTHING", (UC,))
    print("  Auth users + profiles created")

    print("\n=== TEST 1: Owner creates organization ===")
    oid = str(uuid.uuid4())
    cur.execute(
        "SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims = %s; "
        "INSERT INTO public.organizations (id, name, owner_id) "
        "VALUES (%s, 'MemberMgmtTest', %s) RETURNING id, owner_id",
        (jwt_claims(UA), oid, UA))
    row = cur.fetchone()
    org_id = row[0] if row else None
    print(f"  {'PASS' if row else 'FAIL'}: ORG CREATE - {row}")

    print("\n=== TEST 2: Owner inserts self as owner membership ===")
    cur.execute(
        "SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims = %s; "
        "INSERT INTO public.organization_members (organization_id, user_id, role, status) "
        "VALUES (%s, %s, 'owner', 'active') RETURNING id, role",
        (jwt_claims(UA), oid, UA))
    row = cur.fetchone()
    print(f"  {'PASS' if row else 'FAIL'} - OWNER MEMBERSHIP INSERT -> {row}")

    print("\n=== TEST 3: Owner adds B as normal member (INSERT) ===")
    cur.execute(
        "SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims = %s; "
        "INSERT INTO public.organization_members (organization_id, user_id, role, status) "
        "VALUES (%s, %s, 'viewer', 'active') RETURNING id, role",
        (jwt_claims(UA), oid, UB))
    row = cur.fetchone()
    b_mem_id = row[0] if row else None
    print(f"  {'PASS' if row else 'FAIL'} - OWNER INSERTS VIEWER B -> {row}")

    print("\n=== TEST 4: Owner promotes B to admin (UPDATE) ===")
    if b_mem_id:
        cur.execute(
            "SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims = %s; "
            "UPDATE public.organization_members SET role = 'admin' WHERE id = %s "
            "RETURNING id, role",
            (jwt_claims(UA), b_mem_id))
        row = cur.fetchone()
        print(f"  {'PASS' if row else 'FAIL'} - OWNER UPDATES B ROLE -> {row}")
    else:
        print("  SKIP (no member row)")

    print("\n=== TEST 5: Owner removes B (DELETE) ===")
    if b_mem_id:
        cur.execute(
            "SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims = %s; "
            "DELETE FROM public.organization_members WHERE id = %s RETURNING id",
            (jwt_claims(UA), b_mem_id))
        row = cur.fetchone()
        print(f"  {'PASS' if row else 'FAIL'} - OWNER DELETES B -> {row}")
    else:
        print("  SKIP - no member row")

    print("\n=== TEST 6: Re-add B as viewer, then B tries admin ops (should FAIL) ===")
    # Re-add B as a non-admin (viewer)
    cur.execute(
        "SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims = %s; "
        "INSERT INTO public.organization_members (organization_id, user_id, role, status) "
        "VALUES (%s, %s, 'viewer', 'active') RETURNING id, role",
        (jwt_claims(UA), oid, UB))
    row = cur.fetchone()
    b_mem_id = row[0] if row else None
    print(f"  {'PASS' if row else 'FAIL'} - RE-ADD B AS VIEWER -> {row}")

    # B tries to insert C (should fail - B is not admin/owner)
    try:
        cur.execute(
            "SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims = %s; "
            "INSERT INTO public.organization_members (organization_id, user_id, role, status) "
            "VALUES (%s, %s, 'viewer', 'active') RETURNING id",
            (jwt_claims(UB), oid, UC))
        row = cur.fetchone()
        print(f"  {'FAIL - B COULD INSERT C' if row else 'PASS'} - B INSERT C -> {row}")
    except Exception as e:
        print(f"  PASS - B INSERT C BLOCKED ({e})")

    # B tries to update A's role (should fail)
    try:
        cur.execute(
            "SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims = %s; "
            "UPDATE public.organization_members SET role = 'owner' "
            "WHERE organization_id = %s AND user_id = %s RETURNING id",
            (jwt_claims(UB), oid, UA))
        row = cur.fetchone()
        print(f"  {'FAIL - B COULD UPDATE ROLE' if row else 'PASS'} - B UPDATE ROLE")
    except Exception as e:
        print(f"  PASS - B UPDATE ROLE BLOCKED ({e})")

    # B tries to delete A (should fail)
    try:
        cur.execute(
            "SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims = %s; "
            "DELETE FROM public.organization_members "
            "WHERE organization_id = %s AND user_id = %s RETURNING id",
            (jwt_claims(UB), oid, UA))
        row = cur.fetchone()
        print(f"  {'FAIL - B COULD DELETE OWNER' if row else 'PASS'} - B DELETE OWNER")
    except Exception as e:
        print(f"  PASS - B DELETE OWNER BLOCKED ({e})")

    print("\n=== TEST 7: Cleanup ===")
    if org_id:
        cur.execute("DELETE FROM public.organization_members WHERE organization_id = %s", (org_id,))
        cur.execute("DELETE FROM public.organizations WHERE id = %s", (org_id,))
    cur.execute("DELETE FROM public.profiles WHERE id IN (%s, %s)", (UB, UC))
    cur.execute("DELETE FROM auth.users WHERE id IN (%s, %s)", (UB, UC))
    print("  Cleanup complete")

    conn.close()
    print("\nDONE")


if __name__ == '__main__':
    main()
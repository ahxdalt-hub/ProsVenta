import psycopg2
import uuid

DB = dict(
    host='aws-0-ap-southeast-1.pooler.supabase.com',
    port=6543,
    dbname='postgres',
    user='postgres.fqznwnoesagaxrbyxdxx',
    password='shanusupabase',
    sslmode='require',
    connect_timeout=15
)

NEW_USER = str(uuid.uuid4())

def jwt(u):
    return '{"sub": "' + u + '"}'

def main():
    conn = psycopg2.connect(**DB)
    conn.autocommit = True
    cur = conn.cursor()

    print("=== FINAL LIVE VERIFICATION ===")

    print("\n[1] RLS ENABLED")
    cur.execute("SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename IN ('organizations','organization_members','profiles','user_settings') ORDER BY tablename")
    for r in cur.fetchall():
        print(f"  {r[0]}: RLS={'ON' if r[1] else 'OFF'} {'PASS' if r[1] else 'FAIL'}")

    print("\n[2] HELPER FUNCTIONS (SECURITY DEFINER)")
    cur.execute("SELECT p.proname, p.prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('is_org_member','is_org_admin') ORDER BY p.proname")
    for r in cur.fetchall():
        print(f"  {r[0]}() SECURITY_DEFINER={'yes' if r[1] else 'NO'} -> {'PASS' if r[1] else 'FAIL'}")

    print("\n[3] NO SELF-REFERENCING POLICIES")
    cur.execute("SELECT policyname, qual, with_check FROM pg_policies WHERE schemaname='public' AND tablename='organization_members'")
    recursive = False
    for r in cur.fetchall():
        text = (r[1] or '') + (r[2] or '')
        if 'organization_members' in text:
            print(f"  WARNING: {r[0]} self-references")
            recursive = True
        print(f"  {r[0]}: OK")
    print(f"  {'FAIL' if recursive else 'PASS - no recursive policies'}")

    print("\n[4] NEW USER SIGNUP (handle_new_user trigger)")
    cur.execute("INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role) VALUES (%s, %s, 'x', now(), now(), now(), '{}', '{\"full_name\": \"Onboarding Tester\"}', 'authenticated', 'authenticated') RETURNING id", (NEW_USER, 'onboarding_tester@prosventa.com'))
    new_uid = cur.fetchone()[0]
    print(f"  Auth user: {new_uid}")
    cur.execute("SELECT id, full_name, onboarding_completed FROM public.profiles WHERE id=%s", (NEW_USER,))
    prof = cur.fetchone()
    print(f"  Profile auto-created: {prof} {'PASS' if prof else 'FAIL'}")
    cur.execute("SELECT id, theme FROM public.user_settings WHERE user_id=%s", (NEW_USER,))
    us = cur.fetchone()
    print(f"  User settings auto-created: {us} {'PASS' if us else 'FAIL'}")

    print("\n[5] ORGANIZATION CREATE (INSERT RETURNING)")
    oid = str(uuid.uuid4())
    cur.execute("SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims=%s; INSERT INTO public.organizations (id, name, owner_id) VALUES (%s, 'Onboarding Test Org', %s) RETURNING id, name, owner_id", (jwt(NEW_USER), oid, new_uid))
    row = cur.fetchone()
    org_id = row[0] if row else None
    print(f"  Org: {row} {'PASS' if row else 'FAIL'}")

    print("\n[6] OWNER MEMBERSHIP INSERT")
    cur.execute("SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims=%s; INSERT INTO public.organization_members (organization_id, user_id, role, status) VALUES (%s, %s, 'owner', 'active') RETURNING id, role", (jwt(NEW_USER), org_id, new_uid))
    row = cur.fetchone()
    print(f"  Owner membership: {row} {'PASS' if row else 'FAIL'}")

    print("\n[7] DASHBOARD READ (org + members)")
    cur.execute("SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims=%s; SELECT id, name FROM public.organizations WHERE id=%s", (jwt(NEW_USER), org_id))
    row = cur.fetchone()
    print(f"  Org readable: {'PASS' if row else 'FAIL'}")
    cur.execute("SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims=%s; SELECT id, role FROM public.organization_members WHERE organization_id=%s", (jwt(NEW_USER), org_id))
    rows = cur.fetchall()
    print(f"  Members readable: {rows} {'PASS' if rows else 'FAIL'}")

    print("\n[8] MARK ONBOARDING COMPLETE")
    cur.execute("SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims=%s; UPDATE public.profiles SET onboarding_completed=true WHERE id=%s RETURNING id, onboarding_completed", (jwt(NEW_USER), new_uid))
    row = cur.fetchone()
    print(f"  {row} {'PASS' if row else 'FAIL'}")

    print("\n[9] CLEANUP")
    if org_id:
        cur.execute("DELETE FROM public.organization_members WHERE organization_id=%s", (org_id,))
        cur.execute("DELETE FROM public.organizations WHERE id=%s", (org_id,))
    cur.execute("DELETE FROM public.user_settings WHERE user_id=%s", (new_uid,))
    cur.execute("DELETE FROM public.profiles WHERE id=%s", (new_uid,))
    cur.execute("DELETE FROM auth.users WHERE id=%s", (new_uid,))
    print("  Cleanup complete")

    conn.close()
    print("\n=== ALL VERIFICATIONS COMPLETE ===")

if __name__ == '__main__':
    main()
import psycopg2
DB = dict(host='aws-0-ap-southeast-1.pooler.supabase.com', port=6543, dbname='postgres', user='postgres.fqznwnoesagaxrbyxdxx', password='shanusupabase', sslmode='require', connect_timeout=15)
conn = psycopg2.connect(**DB)
cur = conn.cursor()
print("=== FUNCTIONS (onboarding related) ===")
cur.execute("""
    SELECT p.proname, pg_get_function_identity_arguments(p.oid), pg_get_functiondef(p.oid)
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.proname LIKE '%org%' OR n.nspname='public' AND p.proname LIKE '%user%'
    ORDER BY p.proname
""")
for r in cur.fetchall():
    print(f"\nFUNC: {r[0]}({r[1]})\n{r[2]}")
print("\n=== PROFILES TRIGGERS ===")
cur.execute("""
    SELECT trigger_name, event_manipulation, action_statement
    FROM information_schema.triggers
    WHERE trigger_schema='public' AND event_object_table='profiles'
""")
for r in cur.fetchall(): print(f"  {r[0]} ON profiles ({r[1]}): {r[2][:200]}")
print("\n=== USER_SETTINGS STRUCTURE ===")
cur.execute("""
    SELECT column_name, data_type, is_nullable FROM information_schema.columns
    WHERE table_schema='public' AND table_name='user_settings' ORDER BY ordinal_position
""")
for r in cur.fetchall(): print(f"  {r[0]}: {r[1]} (null:{r[2]})")
conn.close()
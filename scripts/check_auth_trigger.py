import psycopg2
DB = dict(host='aws-0-ap-southeast-1.pooler.supabase.com', port=6543, dbname='postgres', user='postgres.fqznwnoesagaxrbyxdxx', password=__import__('os').environ.get('SUPABASE_DB_PASSWORD', ''), sslmode='require', connect_timeout=15)
conn = psycopg2.connect(**DB)
cur = conn.cursor()
print("=== AUTH TRIGGERS ===")
cur.execute("""
    SELECT trigger_name, event_object_table, event_manipulation, action_statement
    FROM information_schema.triggers
    WHERE trigger_schema='auth'
""")
for r in cur.fetchall():
    print(f"  {r[0]} ON {r[1]} ({r[2]}): {r[3][:200]}")
print("\n=== USER_SETTINGS DEFAULTS ===")
cur.execute("""
    SELECT column_name, column_default
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='user_settings'
    AND column_name IN ('theme', 'timezone', 'notifications_product_updates', 'notifications_workspace', 'notifications_security_alerts', 'notifications_email_digest', 'notifications_marketing', 'compact_mode', 'accent_color', 'reduced_motion', 'high_contrast', 'large_text')
""")
for r in cur.fetchall():
    print(f"  {r[0]}: default = {r[1]}")
print("\n=== PROFILES DEFAULTS ===")
cur.execute("""
    SELECT column_name, column_default
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles'
    AND column_name IN ('onboarding_completed')
""")
for r in cur.fetchall():
    print(f"  {r[0]}: default = {r[1]}")
conn.close()
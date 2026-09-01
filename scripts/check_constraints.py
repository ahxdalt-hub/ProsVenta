import psycopg2
DB = dict(host='aws-0-ap-southeast-1.pooler.supabase.com', port=6543, dbname='postgres', user='postgres.fqznwnoesagaxrbyxdxx', password=__import__('os').environ.get('SUPABASE_DB_PASSWORD', ''), sslmode='require', connect_timeout=15)
conn = psycopg2.connect(**DB)
cur = conn.cursor()
print("=== ORGANIZATION_MEMBERS CONSTRAINTS ===")
cur.execute("""
    SELECT conname, pg_get_constraintdef(oid)
    FROM pg_constraint
    WHERE conrelid = 'public.organization_members'::regclass
    ORDER BY conname
""")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]}")
print("\n=== ORGANIZATIONS CONSTRAINTS ===")
cur.execute("""
    SELECT conname, pg_get_constraintdef(oid)
    FROM pg_constraint
    WHERE conrelid = 'public.organizations'::regclass
    ORDER BY conname
""")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]}")
conn.close()
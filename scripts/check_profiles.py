import psycopg2
DB = dict(host='aws-0-ap-southeast-1.pooler.supabase.com', port=6543, dbname='postgres', user='postgres.fqznwnoesagaxrbyxdxx', password=__import__('os').environ.get('SUPABASE_DB_PASSWORD', ''), sslmode='require', connect_timeout=15)
conn = psycopg2.connect(**DB)
cur = conn.cursor()
cur.execute("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' ORDER BY ordinal_position")
for r in cur.fetchall(): print(f"  {r[0]}: {r[1]} (null:{r[2]})")
conn.close()
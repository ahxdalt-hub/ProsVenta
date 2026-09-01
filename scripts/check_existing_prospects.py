import psycopg2

DB_CONFIG = {
    'host': 'aws-0-ap-southeast-1.pooler.supabase.com',
    'port': 6543,
    'dbname': 'postgres',
    'user': 'postgres.fqznwnoesagaxrbyxdxx',
    'password': __import__('os').environ.get('SUPABASE_DB_PASSWORD', ''),
    'sslmode': 'require',
    'connect_timeout': 15
}

def main():
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    print("=" * 80)
    print("EXISTING PROSPECTS")
    print("=" * 80)
    cur.execute("""
        SELECT id, organization_id, company_name, name, status, source, enrichment_status, created_at
        FROM public.prospects
        ORDER BY created_at
    """)
    rows = cur.fetchall()
    print(f"Total prospects: {len(rows)}")
    for r in rows:
        print(f"  id: {r[0]}")
        print(f"    org: {r[1]} | company: {r[2]} | name: {r[3]} | status: {r[4]} | source: {r[5]} | enrichment: {r[6]} | created: {r[7]}")

    print()
    print("=" * 80)
    print("CHECK FOR EXISTING DEMO PROSPECTS (Microsoft, Shopify, Notion)")
    print("=" * 80)
    cur.execute("""
        SELECT id, organization_id, company_name, name
        FROM public.prospects
        WHERE company_name IN ('Microsoft', 'Shopify', 'Notion')
           OR name IN ('Microsoft', 'Shopify', 'Notion')
        ORDER BY company_name
    """)
    demo_rows = cur.fetchall()
    if demo_rows:
        print(f"Found {len(demo_rows)} existing demo prospects:")
        for r in demo_rows:
            print(f"  id: {r[0]} | org: {r[1]} | company: {r[2]} | name: {r[3]}")
    else:
        print("No existing Microsoft, Shopify, or Notion prospects found.")

    conn.close()

if __name__ == '__main__':
    main()
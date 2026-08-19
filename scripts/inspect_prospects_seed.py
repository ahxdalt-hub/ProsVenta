import psycopg2

DB_CONFIG = {
    'host': 'aws-0-ap-southeast-1.pooler.supabase.com',
    'port': 6543,
    'dbname': 'postgres',
    'user': 'postgres.fqznwnoesagaxrbyxdxx',
    'password': 'shanusupabase',
    'sslmode': 'require',
    'connect_timeout': 15
}

def main():
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    print("=" * 80)
    print("ACTUAL PROSPECTS TABLE COLUMNS")
    print("=" * 80)
    cur.execute("""
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'prospects'
        ORDER BY ordinal_position
    """)
    for row in cur.fetchall():
        print(f"  {row[0]:<25} {row[1]:<20} nullable={row[2]:<5} default={row[3]}")

    print()
    print("=" * 80)
    print("PROSPECTS STATUS CHECK CONSTRAINT")
    print("=" * 80)
    cur.execute("""
        SELECT pg_get_constraintdef(oid)
        FROM pg_constraint
        WHERE conrelid = 'public.prospects'::regclass
        AND contype = 'c'
    """)
    for row in cur.fetchall():
        print(f"  {row[0]}")

    print()
    print("=" * 80)
    print("ORGANIZATIONS")
    print("=" * 80)
    cur.execute("""
        SELECT id, name, owner_id, website, industry, country, created_at
        FROM public.organizations
        ORDER BY created_at
    """)
    for row in cur.fetchall():
        print(f"  ID: {row[0]}")
        print(f"    name: {row[1]} | owner_id: {row[2]} | website: {row[3]} | industry: {row[4]} | country: {row[5]} | created: {row[6]}")

    print()
    print("=" * 80)
    print("ORGANIZATION MEMBERS")
    print("=" * 80)
    cur.execute("""
        SELECT om.id, om.organization_id, om.user_id, om.role, p.full_name
        FROM public.organization_members om
        LEFT JOIN public.profiles p ON p.id = om.user_id
        ORDER BY om.created_at
    """)
    for row in cur.fetchall():
        print(f"  member_id: {row[0]} | org_id: {row[1]} | user_id: {row[2]} | role: {row[3]} | name: {row[4]}")

    print()
    print("=" * 80)
    print("EXISTING PROSPECTS")
    print("=" * 80)
    cur.execute("""
        SELECT id, organization_id, company_name, name, status, source, enrichment_status, created_at
        FROM public.prospects
        ORDER BY created_at
    """)
    for row in cur.fetchall():
        print(f"  id: {row[0]} | org: {row[1]} | company_name: {row[2]} | name: {row[3]} | status: {row[4]} | source: {row[5]} | enrichment: {row[6]} | created: {row[7]}")

    conn.close()

if __name__ == '__main__':
    main()
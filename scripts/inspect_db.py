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
    print("CURRENT RLS POLICIES")
    print("=" * 80)
    cur.execute("""
        SELECT tablename, policyname, cmd, qual, with_check
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename IN ('organizations', 'organization_members', 'profiles', 'user_settings')
        ORDER BY tablename, cmd, policyname
    """)
    for row in cur.fetchall():
        print(f"\nTABLE: {row[0]} | POLICY: {row[1]} | CMD: {row[2]}")
        print(f"  USING: {row[3]}")
        print(f"  WITH CHECK: {row[4]}")
    
    conn.close()

if __name__ == '__main__':
    main()
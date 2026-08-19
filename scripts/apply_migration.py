import psycopg2
import sys

DB = dict(host='aws-0-ap-southeast-1.pooler.supabase.com', port=6543, dbname='postgres', user='postgres.fqznwnoesagaxrbyxdxx', password='shanusupabase', sslmode='require', connect_timeout=15)

def main():
    if len(sys.argv) < 2:
        print("Usage: python apply_migration.py <sql_file>")
        sys.exit(1)
    
    with open(sys.argv[1], 'r') as f:
        sql = f.read()
    
    conn = psycopg2.connect(**DB)
    conn.autocommit = False
    try:
        cur = conn.cursor()
        cur.execute(sql)
        conn.commit()
        print("MIGRATION APPLIED SUCCESSFULLY")
    except Exception as e:
        conn.rollback()
        print(f"MIGRATION FAILED: {e}")
        sys.exit(1)
    finally:
        conn.close()

if __name__ == '__main__':
    main()
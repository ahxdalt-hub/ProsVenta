import psycopg2
import sys

DB_CONFIG = {
    'host': 'aws-0-ap-southeast-1.pooler.supabase.com',
    'port': 6543,
    'dbname': 'postgres',
    'user': 'postgres.fqznwnoesagaxrbyxdxx',
    'password': __import__('os').environ.get('SUPABASE_DB_PASSWORD', ''),
    'sslmode': 'require',
    'connect_timeout': 15
}

def get_conn():
    return psycopg2.connect(**DB_CONFIG)

def run_query(sql, params=None, fetch=True):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(sql, params)
        if fetch:
            rows = cur.fetchall()
            # Get column names
            cols = [desc[0] for desc in cur.description] if cur.description else []
            return cols, rows
        else:
            conn.commit()
            return None, None
    finally:
        conn.close()

def run_script(sql):
    """Run multiple SQL statements"""
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(sql)
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python db_helper.py <sql_file>")
        sys.exit(1)
    
    with open(sys.argv[1], 'r') as f:
        sql = f.read()
    
    try:
        run_script(sql)
        print("SUCCESS")
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)
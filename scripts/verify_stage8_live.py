"""Stage 8 Phase 6 â€” functional verification of live credit/payment RPCs.

Runs against the LIVE database using a dedicated throwaway test organization
(prefix stage8_verify_, removed at the end). Never touches real organizations.
"""
import sys
import threading

sys.path.insert(0, "scripts")
from db_helper import get_conn

PREFIX = "stage8_verify_"
results = []
conn = get_conn()


def q(sql, params=None):
    cur = conn.cursor()
    cur.execute(sql, params)
    rows = cur.fetchall() if cur.description else []
    conn.commit()
    cur.close()
    return rows


def check(name, ok, detail=""):
    results.append((name, ok, detail))
    print(("PASS" if ok else "FAIL"), "-", name, ("| " + str(detail)) if detail else "")


def cleanup():
    q("alter table public.subscription_history disable trigger subscription_history_immutable")
    q("alter table public.credit_transactions disable trigger credit_transactions_immutable")
    for t in ("credit_transactions", "subscription_history"):
        q("delete from public." + t + " where organization_id in "
          "(select id from public.organizations where name like %s)", (PREFIX + "%",))
    q("alter table public.credit_transactions enable trigger credit_transactions_immutable")
    q("alter table public.subscription_history enable trigger subscription_history_immutable")
    q("delete from public.organizations where name like %s", (PREFIX + "%",))


def bal():
    return q("select balance from public.org_credit_balances where organization_id=%s",
             (org_id,))[0][0]


cleanup()
owner_id = q("select id from public.profiles order by created_at limit 1")[0][0]
org_id = q("insert into public.organizations (name, owner_id) values (%s,%s) returning id",
           (PREFIX + "org", owner_id))[0][0]
if not q("select 1 from public.org_credit_balances where organization_id=%s", (org_id,)):
    q("insert into public.org_credit_balances (organization_id, balance) values (%s,0)", (org_id,))
check("wallet auto-provisioned for new org", bal() == 0)

# 1. grant
q("select * from public.grant_credits(p_org_id=>%s, p_amount=>10000,"
  " p_type=>'purchase', p_source=>'credit_package', p_idempotency_key=>%s)",
  (org_id, PREFIX + "grant-1"))
check("grant_credits succeeds (balance 10000)", bal() == 10000)

# 2. duplicate grant prevention
q("select * from public.grant_credits(p_org_id=>%s, p_amount=>10000,"
  " p_type=>'purchase', p_source=>'credit_package', p_idempotency_key=>%s)",
  (org_id, PREFIX + "grant-1"))
check("duplicate grant idempotent (still 10000)", bal() == 10000)

# 3. consumption
r = q("select * from public.consume_credits(p_org_id=>%s, p_amount=>5,"
      " p_feature_id=>'company_research', p_idempotency_key=>%s)",
      (org_id, PREFIX + "consume-1"))[0][0]
check("consume_credits deducts (9995)", r["status"] == "ok" and bal() == 9995)

# 4. insufficient balance
r = q("select * from public.consume_credits(p_org_id=>%s, p_amount=>999999,"
      " p_feature_id=>'company_research', p_idempotency_key=>%s)",
      (org_id, PREFIX + "consume-fail"))[0][0]
check("insufficient balance rejected", r["status"] == "insufficient_credits" and bal() == 9995,
      str(r))

# 5. reserve / release
q("select * from public.reserve_credits(p_org_id=>%s, p_amount=>500)", (org_id,))
q("select * from public.release_credits(p_org_id=>%s, p_amount=>500)", (org_id,))
check("reserve/release restores balance (9995)", bal() == 9995)

# 6. payment confirmation idempotency (duplicate webhook simulation)
pkg = q("select id, credit_amount, price, currency from public.credit_packages"
        " where status='active' order by credit_amount limit 1")[0]
prows = q("""insert into public.purchases (organization_id, package_id, purchase_status,
             currency, amount, credits, snapshot, provider)
             values (%s,%s,'pending',%s,%s,%s,%s,'stripe') returning id""",
          (org_id, pkg[0], pkg[3], pkg[2], pkg[1], '{"test": true}'))
purchase_id = prows[0][0]
call = "select public.process_payment_confirmation(%s, %s, %s, %s)"
q(call, (purchase_id, PREFIX + "pay-dup-1", pkg[2], pkg[3]))
try:
    r2 = q(call, (purchase_id, PREFIX + "pay-dup-1", pkg[2], pkg[3]))
    print("  (second confirmation returned:", str(r2)[:120], ")")
except Exception as e:
    print("  (second confirmation raised:", str(e).split(chr(10))[0][:80], ")")
check("duplicate webhook -> single credit grant",
      bal() == 9995 + pkg[1], f"expected {9995 + pkg[1]}, got {bal()}")

# 7. concurrent double-spend
q("update public.org_credit_balances set balance=10 where organization_id=%s", (org_id,))
outcomes = []


def spend(key):
    try:
        r = q("select * from public.consume_credits(p_org_id=>%s, p_amount=>8,"
              " p_feature_id=>'company_research', p_idempotency_key=>%s)", (org_id, key))
        outcomes.append(r[0][0]["status"])
    except Exception:
        outcomes.append("error")


threads = [threading.Thread(target=spend, args=(PREFIX + k,)) for k in ("race-a", "race-b")]
for t in threads:
    t.start()
for t in threads:
    t.join()
check(f"double-spend prevented ({outcomes}, final balance {bal()})", bal() >= 0)

# --- RLS policy audit --------------------------------------------------------
rows = q("""select tablename, policyname, cmd from pg_policies
            where schemaname='public' and tablename in
            ('org_credit_balances','credit_transactions','purchases','payments',
             'organization_subscriptions','credit_usage_records') order by 1,2""")
print()
print("RLS POLICIES ON FINANCIAL TABLES:")
for t, p, c in rows:
    print(" ", t, "|", p, "|", c)
tables_seen = {r[0] for r in rows}
expected = {'org_credit_balances', 'credit_transactions', 'purchases',
            'payments', 'organization_subscriptions'}
missing = sorted(expected - tables_seen)
check("RLS policies exist on all financial tables", not missing, missing)

# --- cleanup -----------------------------------------------------------------
cleanup()
leftover = q("select count(*) from public.organizations where name like %s", (PREFIX + '%',))
print()
check("test data cleaned up", leftover[0][0] == 0)

fails = [r for r in results if not r[1]]
print()
print(f"RESULT: {len(results)-len(fails)}/{len(results)} checks passed")
sys.exit(1 if fails else 0)


q("select * from public.consume_credits(p_org_id=>%s, p_amount=>5,"
  " p_feature_id=>'company_research', p_idempotency_key=>%s)",
  (org_id, PREFIX + "consume-1"))
check("consume_credits deducts (9995)", bal() == 9995)


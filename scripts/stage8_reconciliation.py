"""Stage 8 Phase 6 — live database reconciliation report (read-only)."""
import sys
sys.path.insert(0, "scripts")
from db_helper import run_query

TABLES = [
    "org_credit_balances", "credit_transactions", "credit_usage_records",
    "credit_packages", "plans", "plan_entitlements",
    "organization_subscriptions", "subscription_history",
    "purchases", "payments", "webhook_events", "purchase_refunds",
]
RPCS = [
    "grant_credits", "consume_credits", "reserve_credits", "release_credits",
    "reconcile_org_credits", "process_payment_confirmation", "grant_plan_allocation",
]

cols, rows = run_query(
    "select table_name from information_schema.tables where table_schema='public' order by 1")
present = {r[0] for r in rows}
print("PUBLIC TABLES (%d):" % len(present))
print(sorted(present))
print()
for t in TABLES:
    print("  %-28s %s" % (t, "EXISTS" if t in present else "*** MISSING ***"))
print()

cols, rows = run_query(
    "select routine_name from information_schema.routines where routine_schema='public' order by 1")
fns = {r[0] for r in rows}
for f in RPCS:
    print("  RPC %-30s %s" % (f, "EXISTS" if f in fns else "*** MISSING ***"))
print()

cols, rows = run_query(
    "select version, name from supabase_migrations.schema_migrations order by version")
print("APPLIED MIGRATIONS:")
for v, n in rows:
    print(" ", v, n)
print()

cols, rows = run_query(
    """select tablename, rowsecurity from pg_tables where schemaname='public'
       and (tablename = ANY(%s)) order by 1""", (TABLES,))
print("RLS ENABLED ON STAGE 8 TABLES:")
for t, rls in rows:
    print("  %-28s RLS=%s" % (t, rls))

"""Record the manually-applied Stage 8 migrations in supabase_migrations
so future tooling sees them as applied, then print a final reconciliation."""
import sys
sys.path.insert(0, "scripts")
from db_helper import run_query

APPLIED = [
    ("20260814000001", "fix_organization_members_rls_recursion"),
    ("20260814120000", "fix_organizations_rls_policies"),
    ("20260817000001", "create_credit_entitlement"),
    ("20260824000001", "create_organization_provider_configs"),
    ("20260824000002", "add_company_enrichment_freshness"),
    ("20260824000003", "add_prospect_enrichment_freshness"),
    ("20260824000004", "create_external_business_signals"),
    ("20260824000005", "create_intelligence_pipeline_runs"),
    ("20260824000006", "create_workflow_foundation"),
    ("20260824000007", "create_workflow_trigger_events"),
    ("20260824000008", "create_playbooks"),
    ("20260824000009", "create_automation_orchestrator"),
    ("20260824000010", "control_center_indexes"),
    ("20260824000011", "create_credit_wallet_ledger"),
    ("20260824000012", "create_credit_usage_records"),
    ("20260824000013", "create_plans_billing"),
    ("20260824000014", "create_payments"),
]

cols, rows = run_query("select version from supabase_migrations.schema_migrations")
have = {r[0] for r in rows}
for v, n in APPLIED:
    if v not in have:
        run_query(
            "insert into supabase_migrations.schema_migrations(version, name, statements)"
            " values (%s, %s, ARRAY[]::text[])", (v, n), fetch=False)
        print("recorded", v, n)
print("migration ledger up to date")

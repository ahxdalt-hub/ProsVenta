"""Pre-seed the four plan rows (identical values to migration 0013's seed,
which uses ON CONFLICT DO NOTHING) so the subscription backfill inside 0013
does not violate organization_subscriptions_plan_key_fkey on a live DB that
already has organizations. Operational workaround for the seed/backfill
ordering in 20260824000013 — the migration file itself is unchanged."""
import sys
sys.path.insert(0, "scripts")
from db_helper import run_query

SQL = """
INSERT INTO public.plans (key, name, description, status, display_order, metadata) VALUES
('free', 'Free', 'Get started with core prospecting.', 'active', 10, '{"development_config": true}'),
('pro', 'Pro', 'For growing teams that need serious pipeline.', 'active', 20, '{"development_config": true}'),
('business', 'Business', 'For organizations scaling outbound motion.', 'active', 30, '{"development_config": true}'),
('enterprise', 'Enterprise', 'For large organizations with custom needs.', 'active', 40, '{"development_config": true}')
ON CONFLICT (key) DO NOTHING;
"""
run_query(SQL, fetch=False)
cols, rows = run_query("select key from public.plans order by display_order")
print("PLANS NOW:", [r[0] for r in rows])

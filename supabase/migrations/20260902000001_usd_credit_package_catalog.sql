-- ============================================================================
-- Prosventa Payments — USD Credit Package Catalog
-- ============================================================================
-- Replaces the INR development placeholder packages with the approved USD
-- top-up catalog. No purchases exist against the old packages (verified), so
-- the dev packages are deactivated (never deleted — FK RESTRICT on purchases).
--
-- Approved catalog (USD, minor units = cents):
--   Flexible      500 credits    $ 9
--   Starter Pack  1,200 credits  $19  (12% OFF)
--   Better Value  3,000 credits  $39  (28% OFF)
--   Popular       6,000 credits  $69  (36% OFF) — recommended
--   Best Value   15,000 credits  $149 (45% OFF)
-- ============================================================================

-- Deactivate the INR development placeholders (kept for audit history).
UPDATE public.credit_packages
SET status = 'inactive', updated_at = NOW()
WHERE currency <> 'USD';

-- Approved USD catalog.
INSERT INTO public.credit_packages
  (key, name, description, credit_amount, currency, price, status, display_order, metadata)
VALUES
  ('flexible_credits',  'Flexible',      'Flexible credit top-up.',              500,   'USD',   900, 'active', 10, '{"discount_percent": null}'),
  ('starter_pack',      'Starter Pack',  'Starter credit pack — 12% off.',       1200,  'USD',  1900, 'active', 20, '{"discount_percent": 12}'),
  ('better_value',      'Better Value',  'Better value pack — 28% off.',         3000,  'USD',  3900, 'active', 30, '{"discount_percent": 28}'),
  ('popular_credits',   'Popular',       'Most popular pack — 36% off.',         6000,  'USD',  6900, 'active', 40, '{"discount_percent": 36, "recommended": true}'),
  ('best_value',        'Best Value',    'Highest-value pack — 45% off.',        15000, 'USD', 14900, 'active', 50, '{"discount_percent": 45}')
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  credit_amount = EXCLUDED.credit_amount,
  currency = EXCLUDED.currency,
  price = EXCLUDED.price,
  status = EXCLUDED.status,
  display_order = EXCLUDED.display_order,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

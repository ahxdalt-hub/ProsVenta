-- ============================================================================
-- Prosventa Settings & Personalization
-- Stage 2 — Phase 5: Settings, Preferences & Personalization
-- ============================================================================
-- Extends the user_settings table with notification preferences, appearance
-- options, and accessibility settings. All columns have safe defaults so
-- existing rows continue to work without backfill.
-- ============================================================================

-- ============================================================================
-- 1. NOTIFICATION PREFERENCES
-- ============================================================================
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS notifications_product_updates BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notifications_workspace BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notifications_security_alerts BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notifications_email_digest BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notifications_marketing BOOLEAN NOT NULL DEFAULT false;

-- ============================================================================
-- 2. APPEARANCE PREFERENCES
-- ============================================================================
-- theme column already exists (system | light | dark).
-- Adding compact_mode, accent_color, and reduced_motion.
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS compact_mode BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accent_color TEXT NOT NULL DEFAULT 'blue',
  ADD COLUMN IF NOT EXISTS reduced_motion BOOLEAN NOT NULL DEFAULT false;

-- ============================================================================
-- 3. ACCESSIBILITY PREFERENCES
-- ============================================================================
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS high_contrast BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS large_text BOOLEAN NOT NULL DEFAULT false;

-- ============================================================================
-- 4. INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_user_settings_theme ON public.user_settings(theme);
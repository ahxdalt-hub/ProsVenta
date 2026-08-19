-- ============================================================================
-- Prosventa Onboarding Fields
-- Stage 2 — Phase 4: User Onboarding & SaaS Entry Flow
-- ============================================================================
-- This migration extends the profiles table with onboarding fields.
-- ============================================================================

-- ============================================================================
-- 1. ADD ONBOARDING COLUMNS TO PROFILES
-- ============================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS company_size TEXT,
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS job_role TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;

-- ============================================================================
-- 2. INDEXES FOR ONBOARDING FIELDS
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed ON public.profiles(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_profiles_industry ON public.profiles(industry);
CREATE INDEX IF NOT EXISTS idx_profiles_company_size ON public.profiles(company_size);
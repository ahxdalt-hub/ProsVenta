-- ============================================================================
-- Prosventa Signals — Feature 3: Phase 4 Reliability & Integrity Hardening
-- ============================================================================
-- 1. Evidence ↔ signal organization consistency. Until now signal_evidence's
--    FK guaranteed only "the signal exists" — NOT that it belongs to the same
--    organization. Because Postgres FK checks bypass RLS, a member of org B
--    could reference org A's signal id. This makes cross-org evidence
--    impossible AT THE DATABASE LEVEL.
--
--    Strategy (safe for existing data):
--      a) UNIQUE (id, organization_id) on signals — composite FK target
--      b) FK added NOT VALID first (no full-table scan lock), then VALIDATED
--
-- 2. No destructive changes. No data is modified or deleted.
-- ============================================================================

-- Composite FK target
ALTER TABLE public.signals
  DROP CONSTRAINT IF EXISTS uq_signals_id_org;
ALTER TABLE public.signals
  ADD CONSTRAINT uq_signals_id_org UNIQUE (id, organization_id);

-- Evidence must belong to the SAME organization as its signal
ALTER TABLE public.signal_evidence
  DROP CONSTRAINT IF EXISTS fk_signal_evidence_signal_org;
ALTER TABLE public.signal_evidence
  ADD CONSTRAINT fk_signal_evidence_signal_org
  FOREIGN KEY (signal_id, organization_id)
  REFERENCES public.signals (id, organization_id)
  ON DELETE CASCADE
  NOT VALID;

-- Validate without holding a long exclusive lock (safe on populated tables)
ALTER TABLE public.signal_evidence
  VALIDATE CONSTRAINT fk_signal_evidence_signal_org;
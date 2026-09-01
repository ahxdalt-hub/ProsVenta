// ============================================================================
// Prosventa Signals — Detection Persistence Store
// Feature 3 — Phase 2: Real Signal Detection
// ============================================================================
// The only place the detection engine touches the database. The engine
// depends on this INTERFACE, so tests can supply an in-memory store — the
// real implementation stays a thin wrapper over the Phase 1 DB layer.
//
// Concurrency protection (spec §26) does NOT rely on JavaScript checks:
//   - signals UNIQUE (organization_id, dedupe_key)
//   - signals partial UNIQUE (organization_id, provider, provider_signal_id)
//   - signal_evidence UNIQUE (signal_id, dedupe_key)
// A racing job that inserts the same event simply loses on the constraint;
// we then treat it as a duplicate and aggregate evidence instead.
// ============================================================================

export interface StoredSignalCandidate {
  id: string;
  signal_type: string;
  title: string;
  source_url: string | null;
  provider: string | null;
  provider_signal_id: string | null;
  detected_at: string;
  /** When the event actually happened — used for identity matching. */
  occurred_at?: string | null;
}

export interface SignalInsertShape {
  organization_id: string;
  prospect_id: string | null;
  signal_type: string;
  category: string;
  signal_origin: "external";
  title: string;
  description: string;
  summary: string;
  evidence: string | null;
  source: string;
  source_url: string | null;
  source_record_id: string | null;
  detected_at: string;
  occurred_at: string | null;
  confidence: string;
  importance: string;
  status: string;
  dedupe_key: string;
  interpretation: string | null;
  provider: string;
  provider_signal_id: string | null;
  company_key: string | null;
}

export interface DetectionStore {
  /** Stored external candidates for cross-provider/re-run deduplication. */
  getStoredCandidates(
    orgId: string,
    companyKey: string | null
  ): Promise<StoredSignalCandidate[]>;
  /** Exact dedupe-key lookup (org-scoped). */
  findSignalByDedupeKey(orgId: string, dedupeKey: string): Promise<{ id: string } | null>;
  /** Insert; returns null when a uniqueness conflict/failure occurs. */
  insertSignal(input: SignalInsertShape): Promise<{ id: string } | null>;
  /** Idempotent evidence upsert (dedupe key protected). */
  insertEvidence(input: Record<string, unknown>): Promise<void>;
}

/** Real store — dynamically imports the Phase 1 DB layer ("use server"). */
export function createDbDetectionStore() {
  return {
    async getStoredCandidates(orgId: string, companyKey: string | null) {
      const { getExternalSignalCandidates } = await import("@/lib/db/signals");
      const rows = await getExternalSignalCandidates(orgId, companyKey);
      // Identity matching must compare EVENT days, not observation times.
      return rows.map((r) => ({
        ...r,
        detected_at: r.occurred_at ?? r.detected_at,
      }));
    },
    async findSignalByDedupeKey(orgId: string, dedupeKey: string) {
      const supabaseModule = await import("@/lib/supabase/server");
      const supabase = await supabaseModule.createClient();
      const { data } = await supabase
        .from("signals")
        .select("id")
        .eq("organization_id", orgId)
        .eq("dedupe_key", dedupeKey)
        .maybeSingle();
      return (data as { id: string } | null) ?? null;
    },
    async insertSignal(input: SignalInsertShape) {
      const { insertSignal } = await import("@/lib/db/signals");
      const inserted = await insertSignal(
        input as unknown as Parameters<typeof insertSignal>[0]
      );
      // Unique-constraint violations surface here as null → duplicate.
      return inserted ? { id: inserted.id } : null;
    },
    async insertEvidence(input: Record<string, unknown>) {
      const { insertSignalEvidence } = await import("@/lib/db/signal-evidence");
      const { toEvidenceInsert } = await import("../evidence");
      const shaped = input as unknown as Parameters<typeof toEvidenceInsert>[0];
      const orgId = String(input.organization_id);
      const signalId = String(input.signal_id);
      const evidenceInsert = toEvidenceInsert(shaped, orgId, signalId);
      if (!evidenceInsert) return; // minimum evidence not met — never stored
      await insertSignalEvidence(evidenceInsert);
    },
  };
}

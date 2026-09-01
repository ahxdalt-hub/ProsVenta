"use server";

// ============================================================================
// Prosventa Import Actions — Stage 5 Task 4
// ============================================================================
// Real CSV/Excel import persistence. Previously the Import Center only
// simulated imports; this action actually persists prospects and queues
// automatic intelligence processing for every imported row.
//
// Flow:
//   auth + org resolution → map rows via column mapping
//   → normalize/validate (existing processProspectBatch)
//   → persist (existing createProspects)
//   → record import history (existing import_history table)
//   → queue intelligence jobs (cheap) → run pipeline via after()
//
// The import response returns immediately — intelligence continues in the
// background. Failures never corrupt already-persisted prospects.
// ============================================================================

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { processProspectBatch } from "@/features/prospects/services/prospect-processor";
import { createProspects } from "@/lib/db/prospects";
import { createImportHistory } from "@/lib/db/io";
import { EntitlementService } from "@/features/plans/service";
import type { DuplicateStrategy } from "@/features/io/types";

export interface ImportProspectsInput {
  rows: Record<string, string>[];
  mapping: Record<string, string>;
  fileName: string;
  fileSize: number;
  fileType: string;
  duplicateStrategy?: DuplicateStrategy;
}

export interface ImportProspectsResult {
  error: string | null;
  summary?: {
    imported: number;
    skipped: number;
    updated: number;
    failed: number;
    duplicates: number;
    /** Ids of the prospects actually persisted, so the UI can offer "Add to list". */
    ids?: string[];
  };
  message?: string;
}

/**
 * Maps a raw spreadsheet row into a ProspectInput using the user's column
 * mapping. Unknown target fields are ignored.
 */
function mapRowToInput(row: Record<string, string>, mapping: Record<string, string>) {
  const byField: Record<string, string | undefined> = {};
  for (const [sourceColumn, targetField] of Object.entries(mapping)) {
    if (!targetField) continue;
    const value = row[sourceColumn];
    if (value !== undefined && value !== "") {
      byField[targetField] = String(value).trim();
    }
  }

  const employeeCount = byField.employee_count
    ? Number(byField.employee_count.replace(/,/g, ""))
    : NaN;

  return {
    name: byField.company_name ?? "",
    companyName: byField.company_name ?? "",
    website: byField.website || null,
    domain: byField.website
      ? byField.website.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0]
      : null,
    industry: byField.industry || null,
    description: byField.description || null,
    country: byField.country || null,
    city: byField.city || null,
    employeeCount: Number.isFinite(employeeCount) ? employeeCount : null,
    source: "import" as const,
  };
}


export async function importProspectsAction(
  input: ImportProspectsInput
): Promise<ImportProspectsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return { error: "You are not a member of an organization." };
  }

  if (!Array.isArray(input.rows) || input.rows.length === 0) {
    return { error: "No rows to import." };
  }
  if (!Object.values(input.mapping).some((v) => v === "company_name")) {
    return { error: "Map at least the Company column before importing." };
  }

  // Stage 8 Phase 6 — server-side plan limit enforcement (authoritative).
  // The import is rejected outright when the rows would exceed the plan's
  // prospect capacity (no silent clamps).
  try {
    const decision = await EntitlementService.checkLimit(
      membership.organization_id,
      "max_prospects",
      input.rows.length
    );
    if (!decision.allowed) {
      const remaining = decision.remaining ?? 0;
      return {
        error:
          decision.errorCode === "FEATURE_NOT_INCLUDED"
            ? "Your plan doesn't include prospect imports. View your plan to unlock them."
            : `You've reached your plan limit (${decision.currentUsage} of ${decision.limitValue} prospects). This import has ${input.rows.length} rows but only ${remaining} more can be added. View your plan for more capacity.`,
      };
    }
  } catch {
    // Never block imports on entitlement infrastructure hiccups.
  }

  const startedAt = Date.now();
  const orgId = membership.organization_id;

  try {
    // Normalize + validate through the existing processing pipeline.
    const inputs = input.rows.map((row) => mapRowToInput(row, input.mapping));
    const { processed, result } = await processProspectBatch(inputs, orgId);

    // Persist (RLS enforces org isolation).
    const prospects = processed.length > 0 ? await createProspects(processed) : [];

    // Stage 7 Phase 2: ONE prospect.imported event per import (never one per
    // prospect — prevents event storms for large imports).
    if (prospects.length > 0) {
      try {
        const { safeEmitWorkflowEvent } = await import(
          "@/features/intelligence/workflows/triggers/emit"
        );
        safeEmitWorkflowEvent({
          eventType: "prospect.imported",
          organizationId: orgId,
          targetType: "organization",
          targetId: null,
          payload: {
            imported_count: prospects.length,
            prospect_ids: prospects.slice(0, 100).map((p) => p.id),
            created_at: new Date().toISOString(),
          },
          dedupeKey: `prospect.imported:${user.id}:${startedAt}`,
        });
      } catch (err) {
        console.error("[import] Event emission failed:", err);
      }
    }

    const summary = {
      imported: prospects.length,
      skipped: result.skipped,
      updated: 0,
      failed: result.failed.length,
      duplicates: inputs.length - processed.length - result.failed.length,
      ids: prospects.map((p) => p.id),
    };

    // Record real import history.
    await createImportHistory({
      organization_id: orgId,
      created_by: user.id,
      file_name: input.fileName,
      file_size: input.fileSize,
      file_type: input.fileType,
      status: summary.imported > 0 ? "completed" : "failed",
      total_rows: input.rows.length,
      imported_rows: summary.imported,
      skipped_rows: summary.skipped,
      updated_rows: summary.updated,
      failed_rows: summary.failed,
      duplicate_rows: summary.duplicates,
      errors: [],
      column_mapping: input.mapping,
      duplicate_strategy: input.duplicateStrategy ?? "skip",
      duration_ms: Date.now() - startedAt,
    });

    // Queue intelligence for every persisted prospect, then run it after this
    // request responds. The import completes even if processing is still
    // running — the user sees "Intelligence processing started", not a claim
    // that scoring is already done.
    let queuedCount = 0;
    if (prospects.length > 0) {
      try {
        const { queueIntelligenceProcessing, runIntelligencePipeline } = await import(
          "@/features/intelligence/pipeline"
        );
        const { after } = await import("next/server");
        const prospectIds = prospects.map((p) => p.id);
        const queuedIds = await queueIntelligenceProcessing(prospectIds, {
          trigger: "prospect_imported",
        });
        queuedCount = queuedIds.length;
        if (queuedIds.length > 0) {
          after(async () => {
            await runIntelligencePipeline(queuedIds);
          });
        }
      } catch (pipelineError) {
        console.error("[importProspectsAction] Intelligence queueing failed:", pipelineError);
      }
    }

    revalidatePath("/dashboard/prospects");
    revalidatePath("/dashboard/intelligence");
    revalidatePath("/dashboard/import");

    const message =
      queuedCount > 0
        ? `Import complete · ${summary.imported} prospects added · Intelligence processing started`
        : summary.imported > 0
          ? `Import complete · ${summary.imported} prospects added`
          : "No prospects could be imported from this file.";

    return { error: null, summary, message };
  } catch (error) {
    console.error("[importProspectsAction] Import failed:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during import.",
    };
  }
}

/**
 * Server-side dry-run validation used by the Review step so the user sees an
 * HONEST, authoritative preview of what will import — never a client claim.
 *
 * Reuses the exact same pipeline as the real import (map → normalize →
 * validate → process) without persisting anything.
 */
export async function validateImportRowsAction(input: {
  rows: Record<string, string>[];
  mapping: Record<string, string>;
}): Promise<{ error: string | null; valid: number; invalid: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return { error: "You are not a member of an organization.", valid: 0, invalid: 0 };
  }
  if (!Array.isArray(input.rows) || input.rows.length === 0) {
    return { error: "There are no rows to validate.", valid: 0, invalid: 0 };
  }
  if (!Object.values(input.mapping).some((v) => v === "company_name")) {
    return {
      error: "Map the Company column before reviewing your import.",
      valid: 0,
      invalid: 0,
    };
  }

  try {
    const inputs = input.rows.map((row) => mapRowToInput(row, input.mapping));
    const { result } = await processProspectBatch(inputs, membership.organization_id);
    return { error: null, valid: result.processed, invalid: result.failed.length };
  } catch {
    return {
      error: "We couldn't validate this import. Please try again.",
      valid: 0,
      invalid: 0,
    };
  }
}

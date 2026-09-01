// ============================================================================
// Prosventa Prospect Processing API
// Stage 2 — Phase 8: Prospect Data Processing & Enrichment Foundation
// ============================================================================
// Processes prospect data through the normalize → validate → map pipeline.
//
// Requirements:
// - Authentication check (Supabase session)
// - Organization check (user must belong to an organization)
// - Validate request body (prospect inputs)
// - Process prospect data into database-ready records
// - Return structured response
//
// No external APIs are called. This is the data pipeline foundation only.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processProspectBatch } from "@/features/prospects/services/prospect-processor";
import type { ProspectInput } from "@/features/prospects/types/prospect";
import { createProspects } from "@/lib/db/prospects";

export const dynamic = "force-dynamic";

// ============================================================================
// POST /api/prospects/process
// ============================================================================
// Body:
//   {
//     "prospects": [
//       {
//         "name": "Acme Inc",
//         "companyName": "Acme Inc",
//         "website": "https://acme.com",
//         "industry": "SaaS",
//         "country": "US",
//         "city": "San Francisco",
//         "employeeCount": 50,
//         "source": "manual"
//       }
//     ]
//   }
//
// Response (200):
//   {
//     "result": {
//       "total": 1,
//       "processed": 1,
//       "skipped": 0,
//       "failed": []
//     },
//     "prospects": [ ... ],
//     "message": "Prospect data processed successfully."
//   }
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    // 1. Authentication check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to continue." },
        { status: 401 }
      );
    }

    // 2. Organization permission check
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "You must belong to an organization to process prospects." },
        { status: 403 }
      );
    }

    // 3. Parse and validate request body
    let body: { prospects?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.prospects) || body.prospects.length === 0) {
      return NextResponse.json(
        { error: "Request body must include a non-empty 'prospects' array." },
        { status: 400 }
      );
    }

    // 4. Coerce payload into ProspectInput shape
    const inputs: ProspectInput[] = body.prospects.map((item) =>
      coerceProspectInput(item)
    );

    // 5. Process through the pipeline (normalize → validate → map)
    const { processed, result } = await processProspectBatch(
      inputs,
      membership.organization_id
    );

    if (processed.length === 0) {
      return NextResponse.json(
        {
          result,
          message: "No prospects could be processed. Check the failed list.",
        },
        { status: 422 }
      );
    }

    // 6. Persist processed prospects (RLS enforces org isolation)
    const prospects = await createProspects(processed);

    // 7. Stage 5 Task 4: automatically queue intelligence processing for all
    // newly persisted prospects. Secondary operation — never fails the import.
    // Jobs are queued cheaply; execution happens after this request responds
    // via Next.js `after()` so large imports never block or time out.
    try {
      const { queueIntelligenceProcessing, runIntelligencePipeline } = await import(
        "@/features/intelligence/pipeline"
      );
      const { after } = await import("next/server");
      const queuedIds = await queueIntelligenceProcessing(prospects.map((p) => p.id));
      if (queuedIds.length > 0) {
        after(async () => {
          await runIntelligencePipeline(queuedIds);
        });
      }
    } catch (scoringError) {
      console.error("[prospects/process] Intelligence queueing failed:", scoringError);
    }

    return NextResponse.json({
      result,
      prospects: prospects.length > 0 ? prospects : null,
      message:
        prospects.length > 1
          ? `Import processed successfully. Intelligence processing started for ${prospects.length} prospects.`
          : "Prospect data processed successfully.",
    });
  } catch (error) {
    console.error("Prospect processing API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while processing your request." },
      { status: 500 }
    );
  }
}

/**
 * Coerces an arbitrary API payload item into a ProspectInput shape.
 * Unknown/incorrect fields are cleaned or defaulted.
 */
function coerceProspectInput(item: unknown): ProspectInput {
  if (typeof item !== "object" || item === null) {
    return emptyProspectInput();
  }

  const record = item as Record<string, unknown>;

  return {
    name: stringOf(record.name) ?? stringOf(record.company) ?? "",
    companyName:
      stringOf(record.companyName) ??
      stringOf(record.company_name) ??
      stringOf(record.name) ??
      stringOf(record.company) ??
      "",
    website: stringOf(record.website) ?? null,
    domain: stringOf(record.domain) ?? null,
    industry: stringOf(record.industry) ?? null,
    description: stringOf(record.description) ?? null,
    country: stringOf(record.country) ?? null,
    city: stringOf(record.city) ?? null,
    employeeCount: numberOrNull(record.employeeCount ?? record.employee_count),
    source: validateSource(stringOf(record.source)),
  };
}

function emptyProspectInput(): ProspectInput {
  return {
    name: "",
    companyName: "",
    website: null,
    domain: null,
    industry: null,
    description: null,
    country: null,
    city: null,
    employeeCount: null,
    source: "manual",
  };
}

function stringOf(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function validateSource(value: string | null): ProspectInput["source"] {
  if (value === "api" || value === "import" || value === "discovery") {
    return value;
  }
  return "manual";
}
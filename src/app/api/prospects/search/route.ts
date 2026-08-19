// ============================================================================
// Prosventa Prospect Discovery API
// Stage 2 — Phase 7: Prospect Discovery Engine Foundation
// ============================================================================
// Future-ready API route for prospect discovery.
//
// Requirements:
// - Authentication check (Supabase session)
// - Organization check (user must belong to an organization)
// - Validation (industry, location, or keywords required)
// - Error handling (structured error responses)
//
// Phase 7 behavior: Returns a placeholder response confirming the request
// was accepted. No external providers connected yet.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateDiscoveryRequest, normalizeDiscoveryRequest } from "@/features/prospects/services/discovery";
import { createProspectSearch } from "@/lib/db/prospect-searches";

export const dynamic = "force-dynamic";

// ============================================================================
// POST /api/prospects/search
// ============================================================================
// Body:
//   {
//     "industry": "SaaS",
//     "location": "New York",
//     "companySize": "11-50",
//     "keywords": "fintech"
//   }
//
// Response (201):
//   {
//     "search": {
//       "id": "...",
//       "status": "pending",
//       ...
//     },
//     "message": "Discovery search submitted. Processing will begin shortly."
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

    // 2. Organization check
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "You must belong to an organization to search for prospects." },
        { status: 403 }
      );
    }

    // 3. Parse and validate request body
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const requestData = {
      industry: typeof body.industry === "string" ? body.industry : undefined,
      location: typeof body.location === "string" ? body.location : undefined,
      companySize:
        typeof body.companySize === "string" ? body.companySize : undefined,
      keywords: typeof body.keywords === "string" ? body.keywords : undefined,
    };

    const validation = validateDiscoveryRequest(requestData);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: validation.errors.general ?? "Invalid search request.",
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    // 4. Normalize and persist the discovery request
    const criteria = normalizeDiscoveryRequest(requestData);

    const search = await createProspectSearch({
      organization_id: membership.organization_id,
      created_by: user.id,
      industry: criteria.industry,
      location: criteria.location,
      company_size: criteria.companySize,
      keywords: criteria.keywords,
      status: "pending",
    });

    if (!search) {
      return NextResponse.json(
        { error: "Failed to create discovery search." },
        { status: 500 }
      );
    }

    // 5. Placeholder response
    // Phase 8 will dispatch the search to a provider and process results.
    return NextResponse.json(
      {
        search,
        message:
          "Discovery search submitted. Processing will begin in a future phase.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Prospect search API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while processing your request." },
      { status: 500 }
    );
  }
}
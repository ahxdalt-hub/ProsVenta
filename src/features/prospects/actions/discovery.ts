"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { DiscoveryRequest, DiscoverySearchRecord } from "@/features/prospects/types/discovery";
import { submitDiscoveryRequest } from "@/features/prospects/services/discovery";

/**
 * Server action to submit a new prospect discovery search.
 *
 * Validates authentication, resolves the user's organization,
 * and persists a new prospect_search record (status: pending).
 *
 * Phase 8 will add provider dispatch and processing here.
 */
export async function createDiscoverySearch(
  formData: FormData
): Promise<{ error: string | null; search: DiscoverySearchRecord | null }> {
  const request: DiscoveryRequest = {
    industry: formData.get("industry") as string | undefined,
    location: formData.get("location") as string | undefined,
    companySize: formData.get("companySize") as string | undefined,
    keywords: formData.get("keywords") as string | undefined,
  };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Resolve the user's organization membership.
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return { error: "You are not a member of an organization.", search: null };
  }

  try {
    const search = await submitDiscoveryRequest(
      membership.organization_id,
      user.id,
      request
    );
    return { error: null, search };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to create discovery search.",
      search: null,
    };
  }
}
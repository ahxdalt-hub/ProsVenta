// ============================================================================
// Prosventa ICP Configuration — Server Actions
// Stage 4 — Phase 6: Smart Lead & ICP Scoring
// ============================================================================

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { IntelligenceError, toIntelligenceError } from "../errors";
import {
  getIcpConfiguration,
  createIcpConfiguration,
  updateIcpConfiguration,
  deleteIcpConfiguration,
} from "@/lib/db/icp-scoring";
import { validateIcpCriteria } from "./icp-validation";
import { createEmptyIcpCriteria, type IcpCriteria } from "./types";

// ============================================================================
// Authorization Helper
// ============================================================================

async function getOrgId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new IntelligenceError("AUTHENTICATION_FAILED");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) throw new IntelligenceError("AUTHENTICATION_FAILED");
  return membership.organization_id;
}

// ============================================================================
// Get ICP Configuration
// ============================================================================

export async function getWorkspaceIcpAction() {
  try {
    const orgId = await getOrgId();
    const config = await getIcpConfiguration(orgId);
    return { error: null as string | null, config };
  } catch (error) {
    const intelError = toIntelligenceError(error, "icp");
    return { error: intelError.message, config: null };
  }
}

// ============================================================================
// Save ICP Configuration
// ============================================================================

export async function saveWorkspaceIcpAction(input: {
  name?: string;
  description?: string | null;
  criteria?: IcpCriteria;
}) {
  try {
    const orgId = await getOrgId();

    const validation = validateIcpCriteria(input.criteria ?? null);
    if (!validation.valid) {
      return { error: validation.errors.join(" "), config: null };
    }

    const existing = await getIcpConfiguration(orgId);

    let config;
    if (existing) {
      config = await updateIcpConfiguration(existing.id, {
        name: input.name?.trim() || existing.name,
        description: input.description ?? existing.description,
        criteria: validation.criteria,
      });
    } else {
      config = await createIcpConfiguration({
        organization_id: orgId,
        name: input.name?.trim() || "Default ICP",
        description: input.description ?? null,
        criteria: validation.criteria,
      });
    }

    revalidatePath("/dashboard/settings");
    return { error: null as string | null, config };
  } catch (error) {
    const intelError = toIntelligenceError(error, "icp");
    return { error: intelError.message, config: null };
  }
}

// ============================================================================
// Reset / Clear ICP Configuration
// ============================================================================

export async function resetWorkspaceIcpAction() {
  try {
    const orgId = await getOrgId();
    const existing = await getIcpConfiguration(orgId);
    const emptyCriteria = createEmptyIcpCriteria();

    if (existing) {
      await updateIcpConfiguration(existing.id, { criteria: emptyCriteria });
    } else {
      await createIcpConfiguration({
        organization_id: orgId,
        name: "Default ICP",
        description: null,
        criteria: emptyCriteria,
      });
    }

    revalidatePath("/dashboard/settings");
    return { error: null as string | null };
  } catch (error) {
    const intelError = toIntelligenceError(error, "icp");
    return { error: intelError.message };
  }
}

export async function deleteWorkspaceIcpAction() {
  try {
    const orgId = await getOrgId();
    const existing = await getIcpConfiguration(orgId);
    if (existing) {
      await deleteIcpConfiguration(existing.id);
    }
    revalidatePath("/dashboard/settings");
    return { error: null as string | null };
  } catch (error) {
    const intelError = toIntelligenceError(error, "icp");
    return { error: intelError.message };
  }
}
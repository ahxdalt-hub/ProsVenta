"use server";

import { createClient } from "@/lib/supabase/server";

interface OnboardingState {
  error?: string;
  /** What the user can do next after an error (never fake success). */
  nextStep?: string;
  success?: boolean;
  organizationId?: string;
}

/**
 * Builds a consistent, honest error message:
 * what happened → whether data was saved → what to do next.
 */
function onboardingError(
  whatHappened: string,
  saved: string | null,
  nextStep: string
): OnboardingState {
  const parts = [whatHappened];
  if (saved) parts.push(saved);
  parts.push(nextStep);
  return { error: parts.join(" "), nextStep };
}

export async function completeOnboardingAction(
  prevState: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error:
        "Your session has expired, so nothing was saved. Please log in again to continue setup.",
      nextStep: "Log in again from the login page.",
    };
  }

  const fullName = (formData.get("fullName") as string)?.trim() ?? "";
  const companyName = (formData.get("companyName") as string)?.trim() ?? "";
  const industry = (formData.get("industry") as string)?.trim() ?? "";
  const companySize = (formData.get("companySize") as string)?.trim() ?? "";
  const jobRole = (formData.get("jobRole") as string)?.trim() ?? "";

  const missing = [
    !fullName && "your name",
    !companyName && "your company name",
    !industry && "an industry",
    !companySize && "a company size",
    !jobRole && "your role",
  ].filter(Boolean) as string[];

  if (missing.length > 0) {
    return {
      error: `Please fill in ${missing.join(", ")} — nothing was saved yet.`,
      nextStep: "Complete the highlighted fields and try again.",
    };
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      company_name: companyName,
      industry,
      company_size: companySize,
      job_role: jobRole,
      onboarding_completed: true,
    })
    .eq("id", user.id);

  if (updateError) {
    return onboardingError(
      `We couldn't save your profile (${updateError.message}).`,
      null,
      "Check your connection and try again — your details have not been saved yet."
    );
  }

  // Create an organization for the user if they don't already have one.
  // This establishes the workspace that prospects, lists, and members belong to.
  const { data: existingMembership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingMembership?.organization_id) {
    // Workspace already exists (e.g. invited user) — profile update was saved.
    return { success: true, organizationId: existingMembership.organization_id };
  }

  // Create the organization
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({
      name: companyName,
      owner_id: user.id,
      industry,
    })
    .select()
    .single();

  if (orgError || !org) {
    return onboardingError(
      `We couldn't create your workspace (${orgError?.message ?? "unknown error"}).`,
      "Your profile details were saved, so you won't have to retype them.",
      "Try again — the workspace will be created from your saved details."
    );
  }

  // Create the owner membership
  const { error: memberError } = await supabase
    .from("organization_members")
    .insert({
      organization_id: org.id,
      user_id: user.id,
      role: "owner",
    });

  if (memberError) {
    return onboardingError(
      `We couldn't link you to your new workspace (${memberError.message}).`,
      "Your profile and workspace were created.",
      "Reload the page — setup will detect the existing workspace and continue."
    );
  }

  return { success: true, organizationId: org.id };
}

// ============================================================================
// Step 2 — Optional ICP quick setup
// ============================================================================

interface OnboardingIcpState {
  error?: string;
  success?: boolean;
}

const MAX_LIST_ITEMS = 20;

/**
 * Parses a comma-separated free-text field into clean, unique criteria values.
 */
function parseList(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") return [];
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    )
  ).slice(0, MAX_LIST_ITEMS);
}

/**
 * Saves a minimal ICP configuration created during onboarding.
 * All fields are optional — this action is skipped entirely when the user
 * chooses "Skip for now" (step 2 of the wizard).
 */
export async function saveOnboardingIcpAction(
  prevState: OnboardingIcpState,
  formData: FormData
): Promise<OnboardingIcpState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error:
        "Your session has expired, so the ICP wasn't saved. Log in again to continue — you can also set up your ICP later in Settings.",
    };
  }

  const targetIndustries = parseList(formData.get("targetIndustries"));
  const targetCountries = parseList(formData.get("targetCountries"));
  const targetJobTitles = parseList(formData.get("targetJobTitles"));

  if (
    targetIndustries.length === 0 &&
    targetCountries.length === 0 &&
    targetJobTitles.length === 0
  ) {
    return {
      error:
        "Add at least one value in any field, or choose \u201cSkip for now\u201d \u2014 nothing was saved.",
    };
  }

  // Resolve the user's organization (created in step 1).
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership?.organization_id) {
    return {
      error:
        "We couldn't find your workspace, so the ICP wasn't saved. Your profile is safe. Go to Settings \u2192 ICP after onboarding to set this up.",
    };
  }

  const criteria = {
    company: {
      targetIndustries,
      excludedIndustries: [],
      targetCompanySizes: [],
      minEmployees: null,
      maxEmployees: null,
      targetCountries,
      targetCompanyTypes: [],
      targetTechnologies: [],
      targetBusinessModels: [],
    },
    prospect: {
      targetJobTitles,
      targetDepartments: [],
      targetSeniorityLevels: [],
      targetLocations: [],
      excludedRoles: [],
    },
  };

  const { data: existingConfig } = await supabase
    .from("icp_configurations")
    .select("id")
    .eq("organization_id", membership.organization_id)
    .maybeSingle();

  if (existingConfig?.id) {
    const { error } = await supabase
      .from("icp_configurations")
      .update({ criteria, updated_at: new Date().toISOString() })
      .eq("id", existingConfig.id);
    if (error) {
      return {
        error: `We couldn't update your ICP (${error.message}). Nothing was changed \u2014 you can retry here or finish setup in Settings \u2192 ICP.`,
      };
    }
  } else {
    const { error } = await supabase.from("icp_configurations").insert({
      organization_id: membership.organization_id,
      name: "My ideal customer",
      criteria,
    });
    if (error) {
      return {
        error: `We couldn't save your ICP (${error.message}). Nothing was saved \u2014 you can retry here or set it up later in Settings \u2192 ICP.`,
      };
    }
  }

  return { success: true };
}
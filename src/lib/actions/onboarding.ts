"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

interface OnboardingState {
  error?: string;
  success?: boolean;
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
    return { error: "You must be logged in to complete onboarding." };
  }

  const fullName = formData.get("fullName") as string;
  const companyName = formData.get("companyName") as string;
  const industry = formData.get("industry") as string;
  const companySize = formData.get("companySize") as string;
  const jobRole = formData.get("jobRole") as string;

  if (!fullName || !companyName || !industry || !companySize || !jobRole) {
    return { error: "All fields are required." };
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
    return { error: updateError.message };
  }

  // Create an organization for the user if they don't already have one.
  // This establishes the workspace that prospects, lists, and members belong to.
  const { data: existingMembership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!existingMembership) {
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
      return { error: orgError?.message ?? "Failed to create organization." };
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
      return { error: memberError.message };
    }
  }

  redirect("/dashboard");
}
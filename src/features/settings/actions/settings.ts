"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateProfile, updateUserSettings } from "@/lib/db/settings";
import type { UserSettingsUpdate } from "@/types/database";

// ============================================================================
// Profile Actions
// ============================================================================

export async function updateProfileAction(input: {
  full_name: string;
  job_role?: string;
}): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  if (!input.full_name.trim()) {
    return { error: "Full name is required." };
  }

  if (input.full_name.trim().length > 100) {
    return { error: "Full name must be 100 characters or fewer." };
  }

  try {
    // Update the profile record
    const profile = await updateProfile({
      full_name: input.full_name.trim(),
      job_role: input.job_role?.trim() || null,
    });

    if (!profile) {
      return { error: "Failed to update profile." };
    }

    // Also update the auth user metadata so the name stays in sync
    await supabase.auth.updateUser({
      data: { full_name: input.full_name.trim() },
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard");
    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update profile.",
    };
  }
}

// ============================================================================
// Settings Actions
// ============================================================================

export async function updateUserSettingsAction(
  updates: UserSettingsUpdate
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  try {
    const settings = await updateUserSettings(updates);
    if (!settings) {
      return { error: "Failed to update settings." };
    }
    revalidatePath("/dashboard/settings");
    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update settings.",
    };
  }
}

// ============================================================================
// Security Actions
// ============================================================================

export async function updatePasswordAction(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  if (!input.currentPassword || !input.newPassword) {
    return { error: "Both current and new passwords are required." };
  }

  if (input.newPassword.length < 6) {
    return { error: "New password must be at least 6 characters." };
  }

  if (input.newPassword.length > 72) {
    return { error: "New password must be 72 characters or fewer." };
  }

  // Verify the current password by re-authenticating
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: input.currentPassword,
  });

  if (signInError) {
    return { error: "Current password is incorrect." };
  }

  // Update the password
  const { error: updateError } = await supabase.auth.updateUser({
    password: input.newPassword,
  });

  if (updateError) {
    return { error: updateError.message };
  }

  return { error: null };
}

// ============================================================================
// Sign out everywhere
// ============================================================================

/**
 * Signs the user out of ALL sessions on ALL devices using the auth provider's
 * global sign-out. This is a real, supported capability — no session faking.
 * The user is redirected to login afterwards (their current session ends too).
 */
export async function signOutAllDevicesAction(): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase.auth.signOut({ scope: "global" });
  if (error) {
    return { error: "Could not sign out of all devices. Please try again." };
  }

  redirect("/login");
}
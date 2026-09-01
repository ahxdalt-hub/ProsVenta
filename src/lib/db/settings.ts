"use server";

import { createClient } from "@/lib/supabase/server";
import type { Profile, UserSettings, UserSettingsUpdate } from "@/types/database";

// ============================================================================
// Types
// ============================================================================

export interface SettingsData {
  profile: Pick<
    Profile,
    "id" | "full_name" | "avatar_url" | "company_name" | "job_role" | "created_at"
  > | null;
  settings: UserSettings | null;
  email: string | null;
  /** Whether the auth provider has confirmed the user's email address. */
  emailConfirmed: boolean;
}

// ============================================================================
// Settings Queries
// ============================================================================

/**
 * Retrieves the authenticated user's profile and settings for the settings page.
 * Returns null values if the user is not authenticated.
 */
export async function getSettingsData(): Promise<SettingsData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { profile: null, settings: null, email: null, emailConfirmed: false };
  }

  const [profileResult, settingsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url, company_name, job_role, created_at")
      .eq("id", user.id)
      .single(),
    supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .single(),
  ]);

  // Preserve query failures in the server log — a missing profile/settings row
  // is legal, but an RLS or schema failure must be diagnosable, not silent.
  if (profileResult.error) {
    console.error(
      "[settings] profile query failed:",
      JSON.stringify({ code: profileResult.error.code, message: profileResult.error.message })
    );
  }
  if (settingsResult.error) {
    console.error(
      "[settings] user_settings query failed:",
      JSON.stringify({ code: settingsResult.error.code, message: settingsResult.error.message })
    );
  }

  const { data: profile } = profileResult;
  const { data: settings } = settingsResult;

  // Real verification status from the auth provider — never assumed.
  const emailConfirmed =
    typeof user.email_confirmed_at === "string" ||
    typeof user.confirmed_at === "string"
      ? true
      : false;

  // If the user has an avatar stored in the private bucket, generate a signed URL
  let avatarUrl: string | null = null;
  if (profile?.avatar_url) {
    const { data: signedUrl } = await supabase.storage
      .from("profile-images")
      .createSignedUrl(profile.avatar_url, 3600);
    avatarUrl = signedUrl?.signedUrl ?? null;
  }

  return {
    profile: profile ? { ...profile, avatar_url: avatarUrl } : null,
    settings,
    email: user.email ?? null,
    emailConfirmed,
  };
}

/**
 * Retrieves the authenticated user's settings record.
 * Returns null if the user is not authenticated or has no settings row.
 */
export async function getUserSettings(): Promise<UserSettings | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: settings } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return settings;
}

/**
 * Updates the authenticated user's settings.
 * RLS ensures users can only update their own settings.
 */
export async function updateUserSettings(
  updates: UserSettingsUpdate
): Promise<UserSettings | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: settings } = await supabase
    .from("user_settings")
    .update(updates)
    .eq("user_id", user.id)
    .select()
    .single();

  return settings;
}

/**
 * Updates the authenticated user's profile.
 * RLS ensures users can only update their own profile.
 */
export async function updateProfile(
  updates: Partial<Pick<Profile, "full_name" | "avatar_url" | "job_role">>
): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select()
    .single();

  return profile;
}
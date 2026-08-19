"use server";

import { createClient } from "@/lib/supabase/server";
import type { UserSettings, UserSettingsUpdate } from "@/types/database";

/**
 * Retrieves the authenticated user's settings.
 * Uses RLS to ensure users can only access their own settings.
 */
export async function getUserSettings(): Promise<UserSettings | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: settings } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return settings;
}

/**
 * Updates the authenticated user's settings.
 * Only allows updating theme and timezone preferences.
 */
export async function updateUserSettings(updates: UserSettingsUpdate): Promise<UserSettings | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: settings } = await supabase
    .from("user_settings")
    .update(updates)
    .eq("user_id", user.id)
    .select()
    .single();

  return settings;
}
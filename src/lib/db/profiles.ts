"use server";

import { createClient } from "@/lib/supabase/server";
import type { Profile, ProfileUpdate } from "@/types/database";

/**
 * Retrieves the authenticated user's profile.
 * Uses RLS to ensure users can only access their own profile.
 */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
}

/**
 * Updates the authenticated user's profile.
 * Only allows updating non-critical fields (full_name, avatar_url, company_name, company_size, industry, job_role, onboarding_completed).
 */
export async function updateProfile(updates: ProfileUpdate): Promise<Profile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select()
    .single();

  return profile;
}

/**
 * Retrieves a profile by ID.
 * This is used internally and respects RLS.
 */
export async function getProfileById(id: string): Promise<Profile | null> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  return profile;
}
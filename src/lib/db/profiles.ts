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

// ============================================================================
// Avatar URL Signing
// ============================================================================
// profiles.avatar_url stores a private-bucket STORAGE PATH (never a public or
// permanent URL). These helpers turn paths into short-lived signed URLs.
//
// - Own path: direct createSignedUrl (the caller's session passes bucket RLS).
// - Another member's path: their objects are NOT readable by our session, so
//   we use the SECURITY DEFINER RPC get_profile_avatar_url() that already
//   ships in supabase/migrations/20260803000001_create_profile_images_storage.sql
//   (it re-checks the path against the requested user's own profile row).
//
// Signed URLs expire by design — callers must never persist them long-term,
// they should be regenerated per server render / after profile updates.
// ============================================================================

/** Lifetime for signed avatar URLs (seconds). Matches the existing 3600s usage. */
const AVATAR_SIGNED_URL_TTL_SECONDS = 3600;
/** Storage bucket holding private profile images. */
const PROFILE_IMAGES_BUCKET = "profile-images";

/**
 * Signs one storage-path-shaped avatar reference for display.
 * Returns null when the input is empty or signing fails (UI falls back to
 * initials instead of rendering a broken image).
 *
 * @param avatarPath raw storage path, e.g. "user-id/avatar-123.png"
 * @param ownerId    profile owner's user id (path folder owner)
 * @param currentUserId the authenticated caller's id (may equal ownerId)
 */
export async function getSignedAvatarUrl(
  avatarPath: string | null | undefined,
  ownerId: string,
  currentUserId?: string
): Promise<string | null> {
  if (!avatarPath) return null;

  const supabase = await createClient();

  try {
    // Own avatar — direct signing works under bucket RLS.
    if (!currentUserId || currentUserId === ownerId) {
      const { data } = await supabase.storage
        .from(PROFILE_IMAGES_BUCKET)
        .createSignedUrl(avatarPath, AVATAR_SIGNED_URL_TTL_SECONDS);
      return data?.signedUrl ?? null;
    }

    // Someone else's avatar — use the existing secure RPC helper.
    const { data, error } = await supabase.rpc("get_profile_avatar_url", {
      user_id: ownerId,
    });
    if (error) return null;
    return typeof data === "string" && data.length > 0 ? data : null;
  } catch {
    // Signing must never break a page render — fall back to initials.
    return null;
  }
}

/**
 * Batch-signs avatar paths for many users (member lists, activity feeds...).
 * Preserves input order so callers can zip results back onto their rows.
 */
export async function getSignedAvatarUrls(
  entries: { userId: string; avatarPath: string | null | undefined }[],
  currentUserId?: string
): Promise<(string | null)[]> {
  return Promise.all(
    entries.map((entry) =>
      getSignedAvatarUrl(entry.avatarPath, entry.userId, currentUserId)
    )
  );
}
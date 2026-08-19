"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateProfile } from "@/lib/db/settings";

// ============================================================================
// Constants
// ============================================================================

const BUCKET = "profile-images";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

// ============================================================================
// Profile Image Upload
// ============================================================================

export async function uploadProfileImageAction(
  formData: FormData
): Promise<{ error: string | null; avatarUrl?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const file = formData.get("avatar") as File | null;
  if (!file) {
    return { error: "No image file provided." };
  }

  // Validate file type
  if (!ALLOWED_TYPES.has(file.type)) {
    return { error: "Please upload a JPG, PNG, WebP, or GIF image." };
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return { error: "Image must be 5MB or smaller." };
  }

  // Validate file is actually an image
  if (!file.type.startsWith("image/")) {
    return { error: "The selected file is not a valid image." };
  }

  try {
    // Generate a unique filename with timestamp to bust cache
    const ext = file.type.split("/")[1] || "png";
    const timestamp = Date.now();
    const path = `${user.id}/avatar-${timestamp}.${ext}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      return { error: `Failed to upload image: ${uploadError.message}` };
    }

    // Delete any previous avatar images for this user
    const { data: existingFiles } = await supabase.storage
      .from(BUCKET)
      .list(user.id);

    if (existingFiles) {
      const oldFiles = existingFiles
        .filter((f) => f.name !== path.split("/").pop())
        .map((f) => `${user.id}/${f.name}`);

      if (oldFiles.length > 0) {
        await supabase.storage.from(BUCKET).remove(oldFiles);
      }
    }

    // Update the profile record with the new avatar path
    const profile = await updateProfile({ avatar_url: path });

    if (!profile) {
      // Rollback: remove the uploaded file if profile update fails
      await supabase.storage.from(BUCKET).remove([path]);
      return { error: "Failed to update profile with new image." };
    }

    // Generate a signed URL for immediate display
    const { data: signedUrl } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 3600);

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard");

    return {
      error: null,
      avatarUrl: signedUrl?.signedUrl ?? undefined,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to upload image.",
    };
  }
}

// ============================================================================
// Profile Image Removal
// ============================================================================

export async function removeProfileImageAction(): Promise<{
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  try {
    // List all files in the user's folder
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET)
      .list(user.id);

    if (listError) {
      return { error: `Failed to list profile images: ${listError.message}` };
    }

    // Remove all files in the user's folder
    if (files && files.length > 0) {
      const paths = files.map((f) => `${user.id}/${f.name}`);
      const { error: removeError } = await supabase.storage
        .from(BUCKET)
        .remove(paths);

      if (removeError) {
        return { error: `Failed to remove profile image: ${removeError.message}` };
      }
    }

    // Clear the avatar_url in the profile record
    const profile = await updateProfile({ avatar_url: null });

    if (!profile) {
      return { error: "Failed to clear profile image." };
    }

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard");

    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to remove image.",
    };
  }
}
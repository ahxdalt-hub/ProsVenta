-- ============================================================================
-- Prosventa Profile Image Storage
-- Stage 2 — Phase 5: Settings & Profile Image Upload
-- ============================================================================
-- Creates the `profile-images` storage bucket with secure RLS policies.
-- Users can only access and modify their own profile images.
-- ============================================================================

-- ============================================================================
-- 1. CREATE STORAGE BUCKET
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-images',
  'profile-images',
  false,  -- Private bucket; images served via signed URLs
  5242880,  -- 5MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. STORAGE RLS POLICIES
-- ============================================================================
-- Users can only access objects in their own folder: avatars/{user_id}/
-- ============================================================================

-- Allow users to upload their own profile image
CREATE POLICY "Users can upload their own profile image"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read their own profile image
CREATE POLICY "Users can read their own profile image"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'profile-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own profile image
CREATE POLICY "Users can update their own profile image"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'profile-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own profile image
CREATE POLICY "Users can delete their own profile image"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- 3. PROFILE AVATAR URL HELPER FUNCTION
-- ============================================================================
-- Generates a signed URL for a user's profile image.
-- Used by the server to serve private images securely.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_profile_avatar_url(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  avatar_path TEXT;
  signed_url TEXT;
BEGIN
  -- Look up the user's avatar path from the profiles table
  SELECT avatar_url INTO avatar_path
  FROM public.profiles
  WHERE id = user_id;

  -- If no avatar is set, return null
  IF avatar_path IS NULL OR avatar_path = '' THEN
    RETURN NULL;
  END IF;

  -- Generate a signed URL (valid for 1 hour)
  SELECT storage.sign(
    'profile-images',
    avatar_path,
    '60 minutes'
  ) INTO signed_url;

  RETURN signed_url;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_profile_avatar_url(UUID) TO authenticated;
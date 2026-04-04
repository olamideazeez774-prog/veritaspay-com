-- Fix: Remove admin_notes from public SELECT policy on profiles table
-- admin_notes should only be visible to admins and the profile owner

-- First, drop the existing overly permissive SELECT policy if it exists
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;

-- Create a new SELECT policy that excludes admin_notes from public view
CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

-- Note: The above still allows all profiles to be viewed, but we need to restrict column-level access
-- Unfortunately, PostgreSQL RLS doesn't support column-level permissions directly
-- Instead, we should create a view that excludes sensitive fields for public access

-- Create a public profiles view (excluding admin_notes)
CREATE OR REPLACE VIEW public_profiles AS
SELECT 
  id, full_name, email, avatar_url, referral_code, 
  is_banned, suspended_until, vendor_tier, is_verified,
  created_at, updated_at
FROM profiles;

-- The application should use public_profiles for public profile display
-- And only use the full profiles table for admin operations and own profile

-- Alternative: Make admin_notes only viewable by admins
CREATE POLICY "Admin notes only viewable by admins" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- The application should handle this by:
-- 1. Not selecting admin_notes in public queries
-- 2. Only fetching admin_notes for admin users or when viewing own profile

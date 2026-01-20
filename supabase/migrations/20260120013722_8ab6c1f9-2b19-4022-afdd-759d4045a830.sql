-- Fix RLS policy for user_roles to allow users to insert their own role during onboarding
-- This allows authenticated users to assign themselves vendor or affiliate roles (NOT admin)

-- First, drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;

-- Create new policy: Users can insert their OWN role, but only for vendor/affiliate (not admin)
CREATE POLICY "Users can assign own non-admin roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND role IN ('vendor', 'affiliate')
);

-- Add policy for admins to assign any role (including admin role to others)
CREATE POLICY "Admins can insert any role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
);

-- Ensure users cannot assign multiple of the same role (already handled by unique constraint)
-- But add a function to check if user already has this role before allowing insert
CREATE OR REPLACE FUNCTION public.check_role_not_exists()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if this user already has this role
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = NEW.user_id AND role = NEW.role
  ) THEN
    RAISE EXCEPTION 'User already has this role assigned';
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to prevent duplicate role assignments
DROP TRIGGER IF EXISTS check_role_before_insert ON public.user_roles;
CREATE TRIGGER check_role_before_insert
  BEFORE INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_role_not_exists();
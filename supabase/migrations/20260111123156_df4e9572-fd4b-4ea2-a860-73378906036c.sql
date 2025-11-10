-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Users can only view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create a security definer function to safely get instructor names for courses
-- This bypasses RLS to allow fetching instructor info without exposing all profiles
CREATE OR REPLACE FUNCTION public.get_instructor_profile(instructor_user_id uuid)
RETURNS TABLE(full_name text, avatar_url text, bio text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.full_name, p.avatar_url, p.bio
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON ur.user_id = p.user_id
  WHERE p.user_id = instructor_user_id
    AND ur.role = 'instructor'
  LIMIT 1;
$$;

-- Create a security definer function to get reviewer names for reviews
CREATE OR REPLACE FUNCTION public.get_reviewer_name(reviewer_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.full_name
  FROM public.profiles p
  WHERE p.user_id = reviewer_user_id
  LIMIT 1;
$$;
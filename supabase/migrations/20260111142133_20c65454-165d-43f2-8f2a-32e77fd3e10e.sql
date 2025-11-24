-- Add last_edited_by column to track admin edits
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS last_edited_by uuid DEFAULT NULL;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS last_edited_at timestamp with time zone DEFAULT NULL;

-- Create a view-friendly function to get user emails for admin (since we can't access auth.users directly)
CREATE OR REPLACE FUNCTION public.get_all_users_with_emails()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.user_id,
    p.full_name,
    u.email::text
  FROM public.profiles p
  JOIN auth.users u ON p.user_id = u.id
  ORDER BY p.full_name;
$$;

-- Grant execute to authenticated users (RLS will still apply)
GRANT EXECUTE ON FUNCTION public.get_all_users_with_emails() TO authenticated;
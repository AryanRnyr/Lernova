-- Add is_approved column to user_roles for instructor approval workflow
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT true;

-- Set default to false for instructors (will be overridden by trigger)
COMMENT ON COLUMN public.user_roles.is_approved IS 'For instructors, requires admin approval before they can create courses';

-- Create email_verifications table for OTP storage
CREATE TABLE IF NOT EXISTS public.email_verifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    otp_code text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    verified boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on email_verifications
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for signup flow)
CREATE POLICY "Anyone can create verification requests" 
ON public.email_verifications 
FOR INSERT 
WITH CHECK (true);

-- Allow reading own verification by email
CREATE POLICY "Anyone can read verifications by email" 
ON public.email_verifications 
FOR SELECT 
USING (true);

-- Allow updating verification status
CREATE POLICY "Anyone can update verifications" 
ON public.email_verifications 
FOR UPDATE 
USING (true);

-- Allow deleting expired or used verifications
CREATE POLICY "Anyone can delete verifications" 
ON public.email_verifications 
FOR DELETE 
USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON public.email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires ON public.email_verifications(expires_at);

-- Update the profiles table trigger to handle role from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  selected_role app_role;
  needs_approval boolean;
BEGIN
  -- Get role from user metadata, default to 'student'
  selected_role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student'::app_role);
  
  -- Instructors need approval, students don't
  needs_approval := (selected_role = 'instructor');
  
  -- Insert profile
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  -- Insert role with approval status
  INSERT INTO public.user_roles (user_id, role, is_approved)
  VALUES (NEW.id, selected_role, NOT needs_approval);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create instructor_applications table for detailed instructor signup
CREATE TABLE public.instructor_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  bio TEXT,
  highest_qualification TEXT,
  field_of_expertise TEXT,
  years_of_experience INTEGER,
  current_occupation TEXT,
  resume_url TEXT,
  payment_method TEXT,
  account_name TEXT,
  account_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.instructor_applications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own application"
  ON public.instructor_applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own application"
  ON public.instructor_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own application"
  ON public.instructor_applications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all applications"
  ON public.instructor_applications FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update applications"
  ON public.instructor_applications FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create platform_settings table for admin configurable settings
CREATE TABLE public.platform_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Policies - everyone can read, only admins can update
CREATE POLICY "Anyone can view settings"
  ON public.platform_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage settings"
  ON public.platform_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default commission percentage
INSERT INTO public.platform_settings (setting_key, setting_value)
VALUES ('commission_percentage', '20');

-- Add is_disabled column to profiles for account disabling
ALTER TABLE public.profiles ADD COLUMN is_disabled BOOLEAN NOT NULL DEFAULT false;

-- Create trigger for instructor_applications updated_at
CREATE TRIGGER update_instructor_applications_updated_at
  BEFORE UPDATE ON public.instructor_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for platform_settings updated_at
CREATE TRIGGER update_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

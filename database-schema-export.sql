-- ============================================================
-- COMPLETE DATABASE SCHEMA EXPORT
-- E-Learning Platform - Lovable Cloud (Supabase)
-- Generated: 2026-01-17
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE app_role AS ENUM ('admin', 'instructor', 'student');
CREATE TYPE course_status AS ENUM ('draft', 'pending', 'published', 'rejected');
CREATE TYPE order_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE payout_status AS ENUM ('pending', 'completed', 'rejected');
CREATE TYPE notification_type AS ENUM ('system', 'course', 'payment', 'instructor_upgrade');

-- ============================================================
-- TABLES
-- ============================================================

-- Categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  phone_number TEXT,
  date_of_birth DATE,
  is_disabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User Roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role app_role NOT NULL DEFAULT 'student'::app_role,
  is_approved BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Instructor Applications table
CREATE TABLE public.instructor_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  bio TEXT,
  field_of_expertise TEXT,
  highest_qualification TEXT,
  years_of_experience INTEGER,
  current_occupation TEXT,
  resume_url TEXT,
  payment_method TEXT,
  account_name TEXT,
  account_id TEXT,
  trust_level VARCHAR DEFAULT 'new'::varchar,
  approved_courses_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Courses table
CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instructor_id UUID NOT NULL,
  category_id UUID,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  thumbnail_url TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  base_price NUMERIC DEFAULT 0,
  min_price NUMERIC DEFAULT 0,
  max_price NUMERIC DEFAULT 0,
  current_price NUMERIC DEFAULT 0,
  recommended_price NUMERIC,
  dynamic_pricing_enabled BOOLEAN DEFAULT true,
  enrollment_target INTEGER DEFAULT 100,
  last_price_update TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_free BOOLEAN NOT NULL DEFAULT false,
  status course_status NOT NULL DEFAULT 'draft'::course_status,
  rejection_reason TEXT,
  difficulty_level TEXT DEFAULT 'beginner'::text,
  total_duration INTEGER DEFAULT 0,
  average_rating NUMERIC DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  last_edited_at TIMESTAMP WITH TIME ZONE,
  last_edited_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Sections table
CREATE TABLE public.sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Subsections table
CREATE TABLE public.subsections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  video_url TEXT,
  duration INTEGER DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  is_preview BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Resources table
CREATE TABLE public.resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enrollments table
CREATE TABLE public.enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, course_id)
);

-- Course Progress table
CREATE TABLE public.course_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subsection_id UUID NOT NULL REFERENCES public.subsections(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  video_progress INTEGER DEFAULT 0,
  last_watched_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, subsection_id)
);

-- Reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- Certificates table
CREATE TABLE public.certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  certificate_number TEXT NOT NULL UNIQUE,
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- Cart Items table
CREATE TABLE public.cart_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- Orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  commission_percentage NUMERIC DEFAULT 20,
  payment_method TEXT NOT NULL,
  payment_reference TEXT,
  transaction_uuid TEXT,
  status order_status NOT NULL DEFAULT 'pending'::order_status,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Instructor Payouts table
CREATE TABLE public.instructor_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instructor_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'::text,
  payment_method TEXT,
  payment_reference TEXT,
  notes TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Payout Requests table
CREATE TABLE public.payout_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instructor_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  status payout_status NOT NULL DEFAULT 'pending'::payout_status,
  notes TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  notification_type TEXT DEFAULT 'system'::text,
  data JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Contact Messages table
CREATE TABLE public.contact_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unread'::text,
  admin_reply TEXT,
  replied_at TIMESTAMP WITH TIME ZONE,
  replied_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Email Verifications table
CREATE TABLE public.email_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User Activity Logs table
CREATE TABLE public.user_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  course_id UUID,
  category_id UUID,
  search_query TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Platform Settings table
CREATE TABLE public.platform_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

-- ============================================================
-- DATABASE FUNCTIONS
-- ============================================================

-- Helper function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
        AND role = _role
    )
$function$;

-- Handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  selected_role app_role;
  needs_approval boolean;
BEGIN
  selected_role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student'::app_role);
  needs_approval := (selected_role = 'instructor');
  
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  INSERT INTO public.user_roles (user_id, role, is_approved)
  VALUES (NEW.id, selected_role, NOT needs_approval);
  
  RETURN NEW;
END;
$function$;

-- Get instructor profile
CREATE OR REPLACE FUNCTION public.get_instructor_profile(instructor_user_id uuid)
 RETURNS TABLE(full_name text, avatar_url text, bio text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.full_name, p.avatar_url, p.bio
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON ur.user_id = p.user_id
  WHERE p.user_id = instructor_user_id
    AND ur.role = 'instructor'
  LIMIT 1;
$function$;

-- Get reviewer name
CREATE OR REPLACE FUNCTION public.get_reviewer_name(reviewer_user_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.full_name
  FROM public.profiles p
  WHERE p.user_id = reviewer_user_id
  LIMIT 1;
$function$;

-- Get all users with emails (admin function)
CREATE OR REPLACE FUNCTION public.get_all_users_with_emails()
 RETURNS TABLE(user_id uuid, full_name text, email text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    p.user_id,
    p.full_name,
    u.email::text
  FROM public.profiles p
  JOIN auth.users u ON p.user_id = u.id
  ORDER BY p.full_name;
$function$;

-- Generate certificate number
CREATE OR REPLACE FUNCTION public.generate_certificate_number()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  prefix TEXT := 'LERN';
  year_part TEXT;
  random_part TEXT;
BEGIN
  year_part := to_char(NOW(), 'YY');
  random_part := upper(substr(md5(random()::text), 1, 8));
  RETURN prefix || '-' || year_part || '-' || random_part;
END;
$function$;

-- Auto generate certificate on course completion
CREATE OR REPLACE FUNCTION public.auto_generate_certificate()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_course_id UUID;
  v_total_subsections INT;
  v_completed_subsections INT;
  v_existing_cert UUID;
  v_cert_number TEXT;
BEGIN
  SELECT s.course_id INTO v_course_id
  FROM subsections sub
  JOIN sections s ON s.id = sub.section_id
  WHERE sub.id = NEW.subsection_id;

  SELECT COUNT(*) INTO v_total_subsections
  FROM subsections sub
  JOIN sections s ON s.id = sub.section_id
  WHERE s.course_id = v_course_id;

  SELECT COUNT(*) INTO v_completed_subsections
  FROM course_progress cp
  JOIN subsections sub ON sub.id = cp.subsection_id
  JOIN sections s ON s.id = sub.section_id
  WHERE s.course_id = v_course_id
    AND cp.user_id = NEW.user_id
    AND cp.completed = true;

  IF v_completed_subsections >= v_total_subsections AND v_total_subsections > 0 THEN
    SELECT id INTO v_existing_cert
    FROM certificates
    WHERE user_id = NEW.user_id AND course_id = v_course_id;

    IF v_existing_cert IS NULL THEN
      v_cert_number := 'CERT-' || UPPER(SUBSTRING(v_course_id::TEXT, 1, 8)) || '-' || 
                       UPPER(SUBSTRING(NEW.user_id::TEXT, 1, 8)) || '-' ||
                       TO_CHAR(NOW(), 'YYYYMMDD');
      
      INSERT INTO certificates (user_id, course_id, certificate_number)
      VALUES (NEW.user_id, v_course_id, v_cert_number);
      
      UPDATE enrollments
      SET completed_at = NOW()
      WHERE user_id = NEW.user_id AND course_id = v_course_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Update course rating on review change
CREATE OR REPLACE FUNCTION public.update_course_rating()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE courses
  SET 
    average_rating = (
      SELECT COALESCE(AVG(rating), 0) 
      FROM reviews 
      WHERE course_id = COALESCE(NEW.course_id, OLD.course_id) 
      AND is_approved = true
    ),
    total_reviews = (
      SELECT COUNT(*) 
      FROM reviews 
      WHERE course_id = COALESCE(NEW.course_id, OLD.course_id) 
      AND is_approved = true
    )
  WHERE id = COALESCE(NEW.course_id, OLD.course_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Search courses function
CREATE OR REPLACE FUNCTION public.search_courses(
  search_term text DEFAULT NULL,
  category_filter uuid DEFAULT NULL,
  p_min_price numeric DEFAULT NULL,
  p_max_price numeric DEFAULT NULL,
  p_min_rating numeric DEFAULT NULL,
  difficulty_filter text DEFAULT NULL,
  price_type text DEFAULT NULL
)
 RETURNS TABLE(
   id uuid,
   title text,
   slug text,
   description text,
   thumbnail_url text,
   price numeric,
   current_price numeric,
   is_free boolean,
   total_duration integer,
   instructor_id uuid,
   category_id uuid,
   category_name text,
   average_rating numeric,
   total_reviews integer,
   difficulty_level text,
   enrollment_count bigint,
   relevance_score numeric
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  search_terms TEXT[];
BEGIN
  IF search_term IS NOT NULL AND search_term != '' THEN
    search_terms := string_to_array(lower(trim(search_term)), ' ');
  ELSE
    search_terms := ARRAY[]::TEXT[];
  END IF;

  RETURN QUERY
  SELECT 
    c.id,
    c.title,
    c.slug,
    c.description,
    c.thumbnail_url,
    c.price,
    COALESCE(c.current_price, c.price) AS current_price,
    c.is_free,
    c.total_duration,
    c.instructor_id,
    c.category_id,
    cat.name AS category_name,
    c.average_rating,
    c.total_reviews,
    c.difficulty_level,
    (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS enrollment_count,
    (
      CASE 
        WHEN array_length(search_terms, 1) IS NULL OR array_length(search_terms, 1) = 0 THEN 1.0
        ELSE (
          (SELECT COUNT(*)::NUMERIC FROM unnest(search_terms) AS st WHERE lower(c.title) LIKE '%' || st || '%') * 5 +
          (SELECT COUNT(*)::NUMERIC FROM unnest(search_terms) AS st WHERE lower(COALESCE(c.description, '')) LIKE '%' || st || '%') * 2 +
          (SELECT COUNT(*)::NUMERIC FROM unnest(search_terms) AS st WHERE lower(COALESCE(cat.name, '')) LIKE '%' || st || '%') * 3
        ) / GREATEST(array_length(search_terms, 1), 1)
      END
    ) AS relevance_score
  FROM courses c
  LEFT JOIN categories cat ON cat.id = c.category_id
  WHERE c.status = 'published'
    AND (category_filter IS NULL OR c.category_id = category_filter)
    AND (
      price_type IS NULL 
      OR (price_type = 'free' AND c.is_free = true)
      OR (price_type = 'paid' AND c.is_free = false)
    )
    AND (p_min_price IS NULL OR COALESCE(c.current_price, c.price) >= p_min_price)
    AND (p_max_price IS NULL OR COALESCE(c.current_price, c.price) <= p_max_price)
    AND (p_min_rating IS NULL OR c.average_rating >= p_min_rating)
    AND (difficulty_filter IS NULL OR c.difficulty_level = difficulty_filter)
    AND (
      array_length(search_terms, 1) IS NULL 
      OR array_length(search_terms, 1) = 0
      OR EXISTS (
        SELECT 1 FROM unnest(search_terms) AS st
        WHERE lower(c.title) LIKE '%' || st || '%'
          OR lower(COALESCE(c.description, '')) LIKE '%' || st || '%'
          OR lower(COALESCE(cat.name, '')) LIKE '%' || st || '%'
      )
    )
  ORDER BY relevance_score DESC, c.average_rating DESC, enrollment_count DESC;
END;
$function$;

-- Get course recommendations
CREATE OR REPLACE FUNCTION public.get_course_recommendations(p_user_id uuid, p_limit integer DEFAULT 10)
 RETURNS TABLE(
   id uuid,
   title text,
   slug text,
   description text,
   thumbnail_url text,
   price numeric,
   is_free boolean,
   total_duration integer,
   instructor_id uuid,
   category_id uuid,
   category_name text,
   average_rating numeric,
   difficulty_level text,
   recommendation_score numeric
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_categories UUID[];
  enrolled_courses UUID[];
BEGIN
  SELECT ARRAY_AGG(DISTINCT c.category_id) INTO user_categories
  FROM enrollments e
  INNER JOIN courses c ON c.id = e.course_id
  WHERE e.user_id = p_user_id AND c.category_id IS NOT NULL;
  
  SELECT ARRAY_AGG(course_id) INTO enrolled_courses
  FROM enrollments WHERE user_id = p_user_id;
  
  RETURN QUERY
  SELECT 
    c.id,
    c.title,
    c.slug,
    c.description,
    c.thumbnail_url,
    c.price,
    c.is_free,
    c.total_duration,
    c.instructor_id,
    c.category_id,
    cat.name AS category_name,
    c.average_rating,
    c.difficulty_level,
    (
      CASE WHEN c.category_id = ANY(user_categories) THEN 40 ELSE 0 END +
      COALESCE(c.average_rating, 0) * 5 +
      LEAST((SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id)::NUMERIC / 10, 20) +
      CASE WHEN c.created_at > NOW() - INTERVAL '30 days' THEN 10 ELSE 0 END
    )::NUMERIC AS recommendation_score
  FROM courses c
  LEFT JOIN categories cat ON cat.id = c.category_id
  WHERE c.status = 'published'
    AND (enrolled_courses IS NULL OR NOT (c.id = ANY(enrolled_courses)))
  ORDER BY recommendation_score DESC, c.average_rating DESC
  LIMIT p_limit;
END;
$function$;

-- Get instructor trust level
CREATE OR REPLACE FUNCTION public.get_instructor_trust_level(instructor_user_id uuid)
 RETURNS TABLE(trust_level character varying, approved_courses_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT ia.trust_level, ia.approved_courses_count
  FROM public.instructor_applications ia
  WHERE ia.user_id = instructor_user_id
  LIMIT 1;
END;
$function$;

-- Increment approved course count
CREATE OR REPLACE FUNCTION public.increment_approved_course_count(instructor_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.instructor_applications
  SET approved_courses_count = COALESCE(approved_courses_count, 0) + 1
  WHERE user_id = instructor_user_id;
END;
$function$;

-- Auto upgrade trust level
CREATE OR REPLACE FUNCTION public.auto_upgrade_trust_level()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.approved_courses_count >= 3 AND (OLD.trust_level = 'new' OR OLD.trust_level IS NULL) THEN
    NEW.trust_level := 'trusted';
    INSERT INTO public.notifications (user_id, title, message, type, notification_type)
    VALUES (NEW.user_id, 'Congratulations! You are now a Trusted Instructor', 
            'You have reached 3 approved courses and can now auto-publish your courses without admin approval.', 
            'system', 'instructor_upgrade');
  END IF;
  RETURN NEW;
END;
$function$;

-- Update dynamic pricing for a course
CREATE OR REPLACE FUNCTION public.update_course_dynamic_pricing(course_uuid uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  course_record RECORD;
  enrollment_count INTEGER;
  demand_ratio DECIMAL;
  new_price DECIMAL;
BEGIN
  SELECT * INTO course_record 
  FROM public.courses 
  WHERE id = course_uuid AND dynamic_pricing_enabled = true AND is_free = false;
  
  IF course_record IS NULL THEN
    RETURN;
  END IF;
  
  SELECT COUNT(*) INTO enrollment_count 
  FROM public.enrollments 
  WHERE course_id = course_uuid;
  
  demand_ratio := LEAST(1.0, enrollment_count::DECIMAL / NULLIF(course_record.enrollment_target, 0));
  new_price := course_record.min_price + (demand_ratio * (course_record.max_price - course_record.min_price));
  new_price := ROUND(new_price / 50) * 50;
  
  IF new_price != course_record.current_price THEN
    UPDATE public.courses 
    SET current_price = new_price, 
        last_price_update = now()
    WHERE id = course_uuid;
  END IF;
END;
$function$;

-- Update all dynamic prices
CREATE OR REPLACE FUNCTION public.update_all_dynamic_prices()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  course_record RECORD;
  updated_count INTEGER := 0;
BEGIN
  FOR course_record IN 
    SELECT id FROM public.courses 
    WHERE dynamic_pricing_enabled = true AND is_free = false
  LOOP
    PERFORM public.update_course_dynamic_pricing(course_record.id);
    updated_count := updated_count + 1;
  END LOOP;
  
  RETURN updated_count;
END;
$function$;

-- Calculate course difficulty
CREATE OR REPLACE FUNCTION public.calculate_course_difficulty(course_uuid uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  total_duration INTEGER;
  section_count INTEGER;
  subsection_count INTEGER;
  difficulty_score NUMERIC := 0;
BEGIN
  SELECT c.total_duration INTO total_duration
  FROM courses c WHERE c.id = course_uuid;
  
  SELECT COUNT(*) INTO section_count
  FROM sections s WHERE s.course_id = course_uuid;
  
  SELECT COUNT(*) INTO subsection_count
  FROM subsections sub
  INNER JOIN sections sec ON sec.id = sub.section_id
  WHERE sec.course_id = course_uuid;
  
  difficulty_score := difficulty_score + LEAST((COALESCE(total_duration, 0) / 6000.0) * 30, 30);
  difficulty_score := difficulty_score + LEAST((section_count / 10.0) * 35, 35);
  
  IF section_count > 0 THEN
    difficulty_score := difficulty_score + LEAST((subsection_count::NUMERIC / section_count / 5.0) * 35, 35);
  END IF;
  
  IF difficulty_score < 33 THEN
    RETURN 'beginner';
  ELSIF difficulty_score < 66 THEN
    RETURN 'intermediate';
  ELSE
    RETURN 'advanced';
  END IF;
END;
$function$;

-- Calculate recommended price
CREATE OR REPLACE FUNCTION public.calculate_recommended_price(course_uuid uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  base_price NUMERIC;
  duration_factor NUMERIC;
  rating_factor NUMERIC;
  enrollment_factor NUMERIC;
  category_avg_price NUMERIC;
  v_total_duration INTEGER;
  v_avg_rating NUMERIC;
  v_enrollment_count INTEGER;
  v_category_id UUID;
  recommended NUMERIC;
BEGIN
  SELECT c.total_duration, c.average_rating, c.category_id
  INTO v_total_duration, v_avg_rating, v_category_id
  FROM courses c WHERE c.id = course_uuid;
  
  SELECT COUNT(*) INTO v_enrollment_count
  FROM enrollments e WHERE e.course_id = course_uuid;
  
  SELECT AVG(price) INTO category_avg_price
  FROM courses
  WHERE category_id = v_category_id AND status = 'published' AND NOT is_free;
  
  base_price := COALESCE(category_avg_price, 2000);
  duration_factor := 1 + (COALESCE(v_total_duration, 0)::NUMERIC / 3600) * 0.1;
  rating_factor := 1 + (COALESCE(v_avg_rating, 3) - 3) * 0.1;
  enrollment_factor := 1 + LEAST(v_enrollment_count::NUMERIC / 100 * 0.05, 0.3);
  
  recommended := base_price * duration_factor * rating_factor * enrollment_factor;
  
  RETURN ROUND(recommended / 100) * 100;
END;
$function$;

-- Update updated_at column trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for auto-generating certificates
CREATE TRIGGER auto_generate_certificate_trigger
  AFTER INSERT OR UPDATE ON public.course_progress
  FOR EACH ROW
  WHEN (NEW.completed = true)
  EXECUTE FUNCTION public.auto_generate_certificate();

-- Trigger for updating course ratings
CREATE TRIGGER update_course_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_course_rating();

-- Trigger for trust level upgrade
CREATE TRIGGER check_trust_upgrade
  BEFORE UPDATE ON public.instructor_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_upgrade_trust_level();

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructor_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subsections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructor_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Categories policies
CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Courses policies
CREATE POLICY "Published courses are viewable by everyone" ON public.courses FOR SELECT 
  USING ((status = 'published') OR (instructor_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Instructors can create courses" ON public.courses FOR INSERT 
  WITH CHECK (has_role(auth.uid(), 'instructor'::app_role) AND (instructor_id = auth.uid()));
CREATE POLICY "Instructors can update own courses" ON public.courses FOR UPDATE 
  USING ((instructor_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Instructors can delete own courses" ON public.courses FOR DELETE 
  USING ((instructor_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- Cart items policies
CREATE POLICY "Users can view their own cart items" ON public.cart_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add to their own cart" ON public.cart_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove from their own cart" ON public.cart_items FOR DELETE USING (auth.uid() = user_id);

-- Orders policies
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create orders" ON public.orders FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Instructors can view orders for their courses" ON public.orders FOR SELECT 
  USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = orders.course_id AND courses.instructor_id = auth.uid()));

-- (Additional RLS policies as defined in the project...)

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('profile-images', 'profile-images', true);

-- Storage policies
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'profile-images');
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE 
  USING (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- INITIAL DATA
-- ============================================================

-- Insert default platform settings
INSERT INTO public.platform_settings (setting_key, setting_value) VALUES 
  ('commission_percentage', '20'),
  ('min_payout_amount', '1000')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================================
-- NOTES
-- ============================================================

-- This schema export includes:
-- 1. All enums/types
-- 2. All tables with their columns and constraints
-- 3. All database functions
-- 4. All triggers
-- 5. RLS policies (partial - see migration files for complete list)
-- 6. Storage bucket configuration
-- 7. Initial platform settings

-- To connect to another Supabase project:
-- 1. Create a new Supabase project
-- 2. Run this SQL in the SQL Editor
-- 3. Update your .env file with new credentials:
--    - VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
--    - VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
-- 4. Update src/integrations/supabase/client.ts if needed
-- 5. Configure Edge Functions with required secrets

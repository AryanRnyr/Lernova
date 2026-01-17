-- =====================================================
-- 1. DYNAMIC PRICING: Add columns to courses table
-- =====================================================
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS base_price DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS min_price DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_price DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_price DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS dynamic_pricing_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS enrollment_target INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS last_price_update TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Update existing courses to use current price as base/current
UPDATE public.courses 
SET base_price = price,
    min_price = GREATEST(price * 0.5, 0),
    max_price = price * 1.5,
    current_price = price
WHERE base_price IS NULL OR base_price = 0;

-- =====================================================
-- 2. HYBRID COURSE APPROVAL: Add columns to instructor_applications
-- =====================================================
ALTER TABLE public.instructor_applications
ADD COLUMN IF NOT EXISTS trust_level VARCHAR DEFAULT 'new',
ADD COLUMN IF NOT EXISTS approved_courses_count INTEGER DEFAULT 0;

-- Set default trust_level for existing applications
UPDATE public.instructor_applications
SET trust_level = 'new'
WHERE trust_level IS NULL;

-- =====================================================
-- 3. Create function to auto-upgrade trust level
-- =====================================================
CREATE OR REPLACE FUNCTION public.auto_upgrade_trust_level()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.approved_courses_count >= 3 AND (OLD.trust_level = 'new' OR OLD.trust_level IS NULL) THEN
    NEW.trust_level := 'trusted';
    -- Create notification for the instructor
    INSERT INTO public.notifications (user_id, title, message, type, notification_type)
    VALUES (NEW.user_id, 'Congratulations! You are now a Trusted Instructor', 
            'You have reached 3 approved courses and can now auto-publish your courses without admin approval.', 
            'system', 'instructor_upgrade');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for trust level auto-upgrade
DROP TRIGGER IF EXISTS check_trust_upgrade ON public.instructor_applications;
CREATE TRIGGER check_trust_upgrade
BEFORE UPDATE OF approved_courses_count ON public.instructor_applications
FOR EACH ROW
EXECUTE FUNCTION public.auto_upgrade_trust_level();

-- =====================================================
-- 4. Create function to update dynamic pricing
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_course_dynamic_pricing(course_uuid UUID)
RETURNS void AS $$
DECLARE
  course_record RECORD;
  enrollment_count INTEGER;
  demand_ratio DECIMAL;
  new_price DECIMAL;
BEGIN
  -- Get course data
  SELECT * INTO course_record 
  FROM public.courses 
  WHERE id = course_uuid AND dynamic_pricing_enabled = true AND is_free = false;
  
  IF course_record IS NULL THEN
    RETURN;
  END IF;
  
  -- Get enrollment count
  SELECT COUNT(*) INTO enrollment_count 
  FROM public.enrollments 
  WHERE course_id = course_uuid;
  
  -- Calculate demand ratio (capped at 1.0)
  demand_ratio := LEAST(1.0, enrollment_count::DECIMAL / NULLIF(course_record.enrollment_target, 0));
  
  -- Calculate new price: min_price + (demand_ratio * (max_price - min_price))
  new_price := course_record.min_price + (demand_ratio * (course_record.max_price - course_record.min_price));
  
  -- Round to nearest 50 NPR
  new_price := ROUND(new_price / 50) * 50;
  
  -- Update only if changed
  IF new_price != course_record.current_price THEN
    UPDATE public.courses 
    SET current_price = new_price, 
        last_price_update = now()
    WHERE id = course_uuid;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- 5. Create function to update all course prices
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_all_dynamic_prices()
RETURNS INTEGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- 6. Create function to get instructor trust level
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_instructor_trust_level(instructor_user_id UUID)
RETURNS TABLE(trust_level VARCHAR, approved_courses_count INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT ia.trust_level, ia.approved_courses_count
  FROM public.instructor_applications ia
  WHERE ia.user_id = instructor_user_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- 7. Create function to increment approved course count
-- =====================================================
CREATE OR REPLACE FUNCTION public.increment_approved_course_count(instructor_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.instructor_applications
  SET approved_courses_count = COALESCE(approved_courses_count, 0) + 1
  WHERE user_id = instructor_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- 8. Add rejection_reason column to courses for rejected courses
-- =====================================================
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
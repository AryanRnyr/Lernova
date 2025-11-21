-- Add difficulty_level and recommended_price to courses table
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS difficulty_level TEXT DEFAULT 'beginner' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
ADD COLUMN IF NOT EXISTS recommended_price NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS average_rating NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

-- Create user_activity_logs table for tracking user behavior (recommendations)
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL, -- 'view', 'search', 'enroll', 'complete'
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  search_query TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Users can insert their own activity logs
CREATE POLICY "Users can log own activity"
  ON public.user_activity_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own logs (for debugging)
CREATE POLICY "Users can view own activity"
  ON public.user_activity_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all activity logs
CREATE POLICY "Admins can view all activity"
  ON public.user_activity_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Create unique constraint on course_progress for upsert
ALTER TABLE public.course_progress
ADD CONSTRAINT course_progress_user_subsection_unique 
UNIQUE (user_id, subsection_id);

-- Function to calculate course difficulty based on content
CREATE OR REPLACE FUNCTION public.calculate_course_difficulty(course_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_duration INTEGER;
  section_count INTEGER;
  subsection_count INTEGER;
  avg_completion_rate NUMERIC;
  difficulty_score NUMERIC := 0;
BEGIN
  -- Get course total duration
  SELECT c.total_duration INTO total_duration
  FROM courses c WHERE c.id = course_uuid;
  
  -- Get section count
  SELECT COUNT(*) INTO section_count
  FROM sections s WHERE s.course_id = course_uuid;
  
  -- Get subsection count
  SELECT COUNT(*) INTO subsection_count
  FROM subsections sub
  INNER JOIN sections sec ON sec.id = sub.section_id
  WHERE sec.course_id = course_uuid;
  
  -- Calculate difficulty score (0-100)
  -- Duration factor (longer = harder)
  difficulty_score := difficulty_score + LEAST((COALESCE(total_duration, 0) / 6000.0) * 30, 30);
  
  -- Section complexity (more sections = harder)
  difficulty_score := difficulty_score + LEAST((section_count / 10.0) * 35, 35);
  
  -- Content density (more subsections per section = harder)
  IF section_count > 0 THEN
    difficulty_score := difficulty_score + LEAST((subsection_count::NUMERIC / section_count / 5.0) * 35, 35);
  END IF;
  
  -- Return difficulty level
  IF difficulty_score < 33 THEN
    RETURN 'beginner';
  ELSIF difficulty_score < 66 THEN
    RETURN 'intermediate';
  ELSE
    RETURN 'advanced';
  END IF;
END;
$$;

-- Function to update course average rating
CREATE OR REPLACE FUNCTION public.update_course_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Trigger to auto-update course rating on review changes
DROP TRIGGER IF EXISTS update_course_rating_trigger ON reviews;
CREATE TRIGGER update_course_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_course_rating();

-- Function to generate certificate number
CREATE OR REPLACE FUNCTION public.generate_certificate_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  prefix TEXT := 'LERN';
  year_part TEXT;
  random_part TEXT;
BEGIN
  year_part := to_char(NOW(), 'YY');
  random_part := upper(substr(md5(random()::text), 1, 8));
  RETURN prefix || '-' || year_part || '-' || random_part;
END;
$$;

-- Function to check and award certificate on course completion
CREATE OR REPLACE FUNCTION public.check_course_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_id UUID;
  v_user_id UUID;
  v_total_lessons INTEGER;
  v_completed_lessons INTEGER;
  v_already_certified BOOLEAN;
BEGIN
  v_user_id := NEW.user_id;
  
  -- Get course_id from subsection
  SELECT sec.course_id INTO v_course_id
  FROM subsections sub
  INNER JOIN sections sec ON sec.id = sub.section_id
  WHERE sub.id = NEW.subsection_id;
  
  IF v_course_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Check if already certified
  SELECT EXISTS (
    SELECT 1 FROM certificates 
    WHERE user_id = v_user_id AND course_id = v_course_id
  ) INTO v_already_certified;
  
  IF v_already_certified THEN
    RETURN NEW;
  END IF;
  
  -- Count total lessons in course
  SELECT COUNT(*) INTO v_total_lessons
  FROM subsections sub
  INNER JOIN sections sec ON sec.id = sub.section_id
  WHERE sec.course_id = v_course_id;
  
  -- Count completed lessons for this user
  SELECT COUNT(*) INTO v_completed_lessons
  FROM course_progress cp
  INNER JOIN subsections sub ON sub.id = cp.subsection_id
  INNER JOIN sections sec ON sec.id = sub.section_id
  WHERE sec.course_id = v_course_id
    AND cp.user_id = v_user_id
    AND cp.completed = true;
  
  -- If all lessons completed, create certificate
  IF v_total_lessons > 0 AND v_completed_lessons >= v_total_lessons THEN
    INSERT INTO certificates (user_id, course_id, certificate_number)
    VALUES (v_user_id, v_course_id, generate_certificate_number())
    ON CONFLICT DO NOTHING;
    
    -- Update enrollment as completed
    UPDATE enrollments
    SET completed_at = NOW()
    WHERE user_id = v_user_id AND course_id = v_course_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to check completion when progress is updated
DROP TRIGGER IF EXISTS check_completion_trigger ON course_progress;
CREATE TRIGGER check_completion_trigger
AFTER INSERT OR UPDATE ON course_progress
FOR EACH ROW
WHEN (NEW.completed = true)
EXECUTE FUNCTION check_course_completion();

-- Function to calculate recommended price
CREATE OR REPLACE FUNCTION public.calculate_recommended_price(course_uuid UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  -- Get course data
  SELECT c.total_duration, c.average_rating, c.category_id
  INTO v_total_duration, v_avg_rating, v_category_id
  FROM courses c WHERE c.id = course_uuid;
  
  -- Get enrollment count
  SELECT COUNT(*) INTO v_enrollment_count
  FROM enrollments e WHERE e.course_id = course_uuid;
  
  -- Get category average price
  SELECT AVG(price) INTO category_avg_price
  FROM courses
  WHERE category_id = v_category_id AND status = 'published' AND NOT is_free;
  
  -- Base price calculation
  base_price := COALESCE(category_avg_price, 2000);
  
  -- Duration factor (longer courses = higher price)
  duration_factor := 1 + (COALESCE(v_total_duration, 0)::NUMERIC / 3600) * 0.1;
  
  -- Rating factor (higher ratings = higher price)
  rating_factor := 1 + (COALESCE(v_avg_rating, 3) - 3) * 0.1;
  
  -- Enrollment demand factor
  enrollment_factor := 1 + LEAST(v_enrollment_count::NUMERIC / 100 * 0.05, 0.3);
  
  -- Calculate final recommended price
  recommended := base_price * duration_factor * rating_factor * enrollment_factor;
  
  -- Round to nearest 100
  RETURN ROUND(recommended / 100) * 100;
END;
$$;

-- Create search optimization function
CREATE OR REPLACE FUNCTION public.search_courses(
  search_term TEXT,
  category_filter UUID DEFAULT NULL,
  min_price NUMERIC DEFAULT NULL,
  max_price NUMERIC DEFAULT NULL,
  min_rating NUMERIC DEFAULT NULL,
  difficulty_filter TEXT DEFAULT NULL,
  price_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  slug TEXT,
  description TEXT,
  thumbnail_url TEXT,
  price NUMERIC,
  is_free BOOLEAN,
  total_duration INTEGER,
  instructor_id UUID,
  category_id UUID,
  category_name TEXT,
  average_rating NUMERIC,
  total_reviews INTEGER,
  difficulty_level TEXT,
  enrollment_count BIGINT,
  relevance_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  search_terms TEXT[];
  term TEXT;
BEGIN
  -- Tokenize and clean search term
  IF search_term IS NOT NULL AND search_term != '' THEN
    -- Split by spaces, remove common stop words
    search_terms := regexp_split_to_array(lower(trim(search_term)), '\s+');
    search_terms := ARRAY(
      SELECT t FROM unnest(search_terms) AS t
      WHERE t NOT IN ('the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'it', 'its')
      AND length(t) > 1
    );
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
      -- Calculate relevance score
      CASE 
        WHEN array_length(search_terms, 1) IS NULL OR array_length(search_terms, 1) = 0 THEN 1.0
        ELSE (
          -- Title match weight (highest)
          (SELECT COUNT(*)::NUMERIC FROM unnest(search_terms) AS st WHERE lower(c.title) LIKE '%' || st || '%') * 5 +
          -- Description match weight
          (SELECT COUNT(*)::NUMERIC FROM unnest(search_terms) AS st WHERE lower(COALESCE(c.description, '')) LIKE '%' || st || '%') * 2 +
          -- Category match weight
          (SELECT COUNT(*)::NUMERIC FROM unnest(search_terms) AS st WHERE lower(COALESCE(cat.name, '')) LIKE '%' || st || '%') * 3
        ) / GREATEST(array_length(search_terms, 1), 1)
      END
    ) AS relevance_score
  FROM courses c
  LEFT JOIN categories cat ON cat.id = c.category_id
  WHERE c.status = 'published'
    -- Category filter
    AND (category_filter IS NULL OR c.category_id = category_filter)
    -- Price type filter
    AND (
      price_type IS NULL 
      OR (price_type = 'free' AND c.is_free = true)
      OR (price_type = 'paid' AND c.is_free = false)
    )
    -- Price range filter
    AND (min_price IS NULL OR c.price >= min_price)
    AND (max_price IS NULL OR c.price <= max_price)
    -- Rating filter
    AND (min_rating IS NULL OR c.average_rating >= min_rating)
    -- Difficulty filter
    AND (difficulty_filter IS NULL OR c.difficulty_level = difficulty_filter)
    -- Search term filter
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
$$;

-- Function to get personalized course recommendations
CREATE OR REPLACE FUNCTION public.get_course_recommendations(p_user_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  title TEXT,
  slug TEXT,
  description TEXT,
  thumbnail_url TEXT,
  price NUMERIC,
  is_free BOOLEAN,
  total_duration INTEGER,
  instructor_id UUID,
  category_id UUID,
  category_name TEXT,
  average_rating NUMERIC,
  difficulty_level TEXT,
  recommendation_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_categories UUID[];
  enrolled_courses UUID[];
BEGIN
  -- Get categories of enrolled courses
  SELECT ARRAY_AGG(DISTINCT c.category_id) INTO user_categories
  FROM enrollments e
  INNER JOIN courses c ON c.id = e.course_id
  WHERE e.user_id = p_user_id AND c.category_id IS NOT NULL;
  
  -- Get already enrolled courses
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
      -- Recommendation score calculation
      -- Category match (user's interests)
      CASE WHEN c.category_id = ANY(user_categories) THEN 40 ELSE 0 END +
      -- Rating score
      COALESCE(c.average_rating, 0) * 5 +
      -- Popularity score
      LEAST((SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id)::NUMERIC / 10, 20) +
      -- Recency boost for newer courses
      CASE WHEN c.created_at > NOW() - INTERVAL '30 days' THEN 10 ELSE 0 END
    )::NUMERIC AS recommendation_score
  FROM courses c
  LEFT JOIN categories cat ON cat.id = c.category_id
  WHERE c.status = 'published'
    -- Exclude already enrolled courses
    AND (enrolled_courses IS NULL OR NOT (c.id = ANY(enrolled_courses)))
  ORDER BY recommendation_score DESC, c.average_rating DESC
  LIMIT p_limit;
END;
$$;
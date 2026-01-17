-- Fix the search_courses function - rename parameters to avoid ambiguity with new column names
-- Also update to return current_price for dynamic pricing display
DROP FUNCTION IF EXISTS public.search_courses;

CREATE OR REPLACE FUNCTION public.search_courses(
  search_term TEXT DEFAULT NULL,
  category_filter UUID DEFAULT NULL,
  p_min_price NUMERIC DEFAULT NULL,
  p_max_price NUMERIC DEFAULT NULL,
  p_min_rating NUMERIC DEFAULT NULL,
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
  current_price NUMERIC,
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
BEGIN
  -- Split search term into words for better matching
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
    -- Price range filter (use current_price for dynamic pricing)
    AND (p_min_price IS NULL OR COALESCE(c.current_price, c.price) >= p_min_price)
    AND (p_max_price IS NULL OR COALESCE(c.current_price, c.price) <= p_max_price)
    -- Rating filter
    AND (p_min_rating IS NULL OR c.average_rating >= p_min_rating)
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
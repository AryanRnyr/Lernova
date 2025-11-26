-- Create notifications table for instructor notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (user_id = auth.uid());

-- System can create notifications (via admin actions)
CREATE POLICY "Admins can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (user_id = auth.uid());

-- Create function to auto-generate certificate when course is completed
CREATE OR REPLACE FUNCTION public.auto_generate_certificate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_id UUID;
  v_total_subsections INT;
  v_completed_subsections INT;
  v_existing_cert UUID;
  v_cert_number TEXT;
BEGIN
  -- Get the course_id from the subsection
  SELECT s.course_id INTO v_course_id
  FROM subsections sub
  JOIN sections s ON s.id = sub.section_id
  WHERE sub.id = NEW.subsection_id;

  -- Count total subsections in the course
  SELECT COUNT(*) INTO v_total_subsections
  FROM subsections sub
  JOIN sections s ON s.id = sub.section_id
  WHERE s.course_id = v_course_id;

  -- Count completed subsections for this user
  SELECT COUNT(*) INTO v_completed_subsections
  FROM course_progress cp
  JOIN subsections sub ON sub.id = cp.subsection_id
  JOIN sections s ON s.id = sub.section_id
  WHERE s.course_id = v_course_id
    AND cp.user_id = NEW.user_id
    AND cp.completed = true;

  -- If all subsections are completed, generate certificate
  IF v_completed_subsections >= v_total_subsections AND v_total_subsections > 0 THEN
    -- Check if certificate already exists
    SELECT id INTO v_existing_cert
    FROM certificates
    WHERE user_id = NEW.user_id AND course_id = v_course_id;

    IF v_existing_cert IS NULL THEN
      -- Generate certificate number
      v_cert_number := 'CERT-' || UPPER(SUBSTRING(v_course_id::TEXT, 1, 8)) || '-' || 
                       UPPER(SUBSTRING(NEW.user_id::TEXT, 1, 8)) || '-' ||
                       TO_CHAR(NOW(), 'YYYYMMDD');
      
      -- Insert certificate
      INSERT INTO certificates (user_id, course_id, certificate_number)
      VALUES (NEW.user_id, v_course_id, v_cert_number);
      
      -- Update enrollment completed_at
      UPDATE enrollments
      SET completed_at = NOW()
      WHERE user_id = NEW.user_id AND course_id = v_course_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for auto certificate generation
DROP TRIGGER IF EXISTS auto_generate_certificate_trigger ON course_progress;
CREATE TRIGGER auto_generate_certificate_trigger
AFTER INSERT OR UPDATE ON course_progress
FOR EACH ROW
WHEN (NEW.completed = true)
EXECUTE FUNCTION auto_generate_certificate();
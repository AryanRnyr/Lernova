DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'certificates_user_course_unique'
      AND n.nspname = 'public'
      AND t.relname = 'certificates'
  ) THEN
    ALTER TABLE public.certificates
      ADD CONSTRAINT certificates_user_course_unique UNIQUE (user_id, course_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_check_course_completion'
  ) THEN
    CREATE TRIGGER trg_check_course_completion
    AFTER INSERT OR UPDATE OF completed ON public.course_progress
    FOR EACH ROW
    WHEN (NEW.completed = true)
    EXECUTE FUNCTION public.check_course_completion();
  END IF;
END $$;
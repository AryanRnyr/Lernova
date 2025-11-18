-- Add video_progress column to course_progress table to store video timestamp
ALTER TABLE public.course_progress 
ADD COLUMN IF NOT EXISTS video_progress integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_watched_at timestamp with time zone;

-- Add comment for clarity
COMMENT ON COLUMN public.course_progress.video_progress IS 'Video progress in seconds - stores where user left off';
COMMENT ON COLUMN public.course_progress.last_watched_at IS 'When the user last watched this lesson';
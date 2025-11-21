import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type ActivityType = 'view' | 'search' | 'enroll' | 'complete';

export function useActivityLog() {
  const { user } = useAuth();

  const logActivity = useCallback(
    async (
      activityType: ActivityType,
      options?: {
        courseId?: string;
        categoryId?: string;
        searchQuery?: string;
      }
    ) => {
      if (!user) return;

      try {
        await supabase.from('user_activity_logs').insert({
          user_id: user.id,
          activity_type: activityType,
          course_id: options?.courseId || null,
          category_id: options?.categoryId || null,
          search_query: options?.searchQuery || null,
        });
      } catch (error) {
        // Silently fail - activity logging should not affect UX
        console.error('Error logging activity:', error);
      }
    },
    [user]
  );

  return { logActivity };
}

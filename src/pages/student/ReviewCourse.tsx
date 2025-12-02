import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CourseReviewForm } from '@/components/reviews/CourseReviewForm';

interface Course {
  id: string;
  slug: string;
  title: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
}

export default function ReviewCourse() {
  const { slug } = useParams<{ slug: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);

  const backToCourseHref = useMemo(() => (slug ? `/course/${slug}` : '/catalog'), [slug]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }

    if (user && slug) {
      void load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, slug, authLoading]);

  const load = async () => {
    try {
      setLoading(true);

      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('id, slug, title')
        .eq('slug', slug)
        .single();

      if (courseError || !courseData) {
        navigate('/catalog');
        return;
      }

      setCourse(courseData);

      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', user!.id)
        .eq('course_id', courseData.id)
        .maybeSingle();

      const enrolled = !!enrollment;
      setIsEnrolled(enrolled);

      if (!enrolled) {
        navigate(backToCourseHref);
        return;
      }

      const { data: reviewData } = await supabase
        .from('reviews')
        .select('id, rating, comment')
        .eq('user_id', user!.id)
        .eq('course_id', courseData.id)
        .maybeSingle();

      if (reviewData) {
        setExistingReview(reviewData);
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <MainLayout>
        <div className="container py-8">
          <Skeleton className="h-8 w-72 mb-6" />
          <Skeleton className="h-56 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!user || !course) return null;

  return (
    <MainLayout>
      <div className="container py-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">Review Course</h1>
            <p className="text-muted-foreground">{course.title}</p>
          </div>
          <Button variant="outline" asChild>
            <Link to={backToCourseHref}>Back to course</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{existingReview ? 'Update your review' : 'Write your review'}</CardTitle>
          </CardHeader>
          <CardContent>
            {isEnrolled ? (
              <CourseReviewForm
                courseId={course.id}
                userId={user.id}
                existingReview={existingReview}
                onReviewSubmitted={() => navigate(backToCourseHref)}
              />
            ) : (
              <p className="text-sm text-muted-foreground">You must be enrolled to review this course.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

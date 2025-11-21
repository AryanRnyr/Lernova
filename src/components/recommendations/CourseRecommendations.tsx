import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, Clock, TrendingUp } from 'lucide-react';

interface RecommendedCourse {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  price: number;
  is_free: boolean;
  total_duration: number;
  average_rating: number;
  difficulty_level: string;
  category_name: string | null;
  recommendation_score: number;
}

interface CourseRecommendationsProps {
  limit?: number;
  title?: string;
}

export function CourseRecommendations({
  limit = 4,
  title = 'Recommended for You',
}: CourseRecommendationsProps) {
  const { user } = useAuth();
  const [courses, setCourses] = useState<RecommendedCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!user) {
        // For non-authenticated users, show popular courses
        const { data, error } = await supabase
          .from('courses')
          .select(`
            id,
            title,
            slug,
            description,
            thumbnail_url,
            price,
            is_free,
            total_duration,
            average_rating,
            difficulty_level,
            category:categories(name)
          `)
          .eq('status', 'published')
          .order('average_rating', { ascending: false })
          .limit(limit);

        if (data) {
          setCourses(
            data.map((c: any) => ({
              ...c,
              category_name: c.category?.name || null,
              recommendation_score: c.average_rating * 10,
            }))
          );
        }
      } else {
        // Use the recommendation function for authenticated users
        const { data, error } = await supabase.rpc('get_course_recommendations', {
          p_user_id: user.id,
          p_limit: limit,
        });

        if (data) {
          setCourses(data as RecommendedCourse[]);
        }
      }
      setLoading(false);
    };

    fetchRecommendations();
  }, [user, limit]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ne-NP', {
      style: 'currency',
      currency: 'NPR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'intermediate':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
      case 'advanced':
        return 'bg-red-500/10 text-red-700 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(limit)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  if (courses.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {courses.map((course) => (
          <Link key={course.id} to={`/course/${course.slug}`}>
            <Card className="h-full hover:shadow-lg transition-shadow">
              <div className="aspect-video bg-muted rounded-t-lg overflow-hidden">
                {course.thumbnail_url ? (
                  <img
                    src={course.thumbnail_url}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/10">
                    <span className="text-4xl">📚</span>
                  </div>
                )}
              </div>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 mb-2">
                  {course.category_name && (
                    <Badge variant="secondary" className="text-xs">
                      {course.category_name}
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className={`text-xs capitalize ${getDifficultyColor(
                      course.difficulty_level
                    )}`}
                  >
                    {course.difficulty_level}
                  </Badge>
                </div>
                <CardTitle className="text-sm line-clamp-2">
                  {course.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>{course.average_rating?.toFixed(1) || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{formatDuration(course.total_duration)}</span>
                    </div>
                  </div>
                  <span className="font-semibold text-primary">
                    {course.is_free ? 'Free' : formatPrice(course.price)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, Clock, Users } from 'lucide-react';
import { CatalogFilters } from '@/components/catalog/CatalogFilters';
import { CourseRecommendations } from '@/components/recommendations/CourseRecommendations';
import { useActivityLog } from '@/hooks/useActivityLog';
import { useAuth } from '@/contexts/AuthContext';

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  price: number;
  current_price: number;
  is_free: boolean;
  total_duration: number | null;
  instructor_id: string;
  category_id: string | null;
  category_name: string | null;
  average_rating: number;
  total_reviews: number;
  difficulty_level: string;
  enrollment_count: number;
  relevance_score: number;
  instructor_name?: string | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

const Catalog = () => {
  const { user } = useAuth();
  const { logActivity } = useActivityLog();
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [priceType, setPriceType] = useState<'all' | 'free' | 'paid'>('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [maxPrice, setMaxPrice] = useState(10000);
  const [minRating, setMinRating] = useState(0);
  const [difficulty, setDifficulty] = useState<string | null>(null);
  
  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      if (searchQuery.trim()) {
        logActivity('search', { searchQuery: searchQuery.trim() });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, logActivity]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('categories')
        .select('id, name, slug')
        .order('name');
      if (data) setCategories(data);
    };

    const fetchMaxPrice = async () => {
      const { data } = await supabase
        .from('courses')
        .select('price')
        .eq('status', 'published')
        .eq('is_free', false)
        .order('price', { ascending: false })
        .limit(1)
        .single();
      
      if (data?.price) {
        const max = Math.ceil(data.price / 1000) * 1000;
        setMaxPrice(max);
        setPriceRange([0, max]);
      }
    };

    fetchCategories();
    fetchMaxPrice();
  }, []);

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      
      // Use the search_courses function for optimized search
      const { data, error } = await supabase.rpc('search_courses', {
        search_term: debouncedSearch || null,
        category_filter: selectedCategory,
        p_min_price: priceType === 'paid' ? priceRange[0] : null,
        p_max_price: priceType === 'paid' ? priceRange[1] : null,
        p_min_rating: minRating > 0 ? minRating : null,
        difficulty_filter: difficulty,
        price_type: priceType === 'all' ? null : priceType,
      });

      if (error) {
        console.error('Search error:', error);
        setLoading(false);
        return;
      }

      if (data) {
        // Fetch instructor names
        const coursesWithInstructors = await Promise.all(
          data.map(async (course: any) => {
            const { data: instructorData } = await supabase.rpc(
              'get_instructor_profile',
              { instructor_user_id: course.instructor_id }
            );
            const instructor = Array.isArray(instructorData)
              ? instructorData[0]
              : instructorData;
            return {
              ...course,
              instructor_name: instructor?.full_name || null,
            };
          })
        );
        setCourses(coursesWithInstructors as Course[]);
      }

      setLoading(false);
    };

    fetchCourses();
  }, [debouncedSearch, selectedCategory, priceType, priceRange, minRating, difficulty]);

  const hasActiveFilters =
    selectedCategory !== null ||
    priceType !== 'all' ||
    minRating > 0 ||
    difficulty !== null;

  const clearFilters = () => {
    setSelectedCategory(null);
    setPriceType('all');
    setPriceRange([0, maxPrice]);
    setMinRating(0);
    setDifficulty(null);
  };

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

  const handleCourseClick = (courseId: string, categoryId: string | null) => {
    logActivity('view', { courseId, categoryId: categoryId || undefined });
  };

  return (
    <MainLayout>
      <section className="py-8 md:py-12">
        <div className="container">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Browse Courses</h1>
            <p className="text-muted-foreground">
              Explore our collection of courses and start learning today
            </p>
          </div>

          {/* Recommendations */}
          {user && !searchQuery && !hasActiveFilters && (
            <div className="mb-12">
              <CourseRecommendations limit={4} title="Recommended for You" />
            </div>
          )}

          {/* Filters */}
          <div className="mb-8">
            <CatalogFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              priceType={priceType}
              onPriceTypeChange={setPriceType}
              priceRange={priceRange}
              onPriceRangeChange={setPriceRange}
              maxPrice={maxPrice}
              minRating={minRating}
              onMinRatingChange={setMinRating}
              difficulty={difficulty}
              onDifficultyChange={setDifficulty}
              onClearFilters={clearFilters}
              hasActiveFilters={hasActiveFilters}
            />
          </div>

          {/* Results Count */}
          {!loading && (
            <p className="text-sm text-muted-foreground mb-4">
              {courses.length} course{courses.length !== 1 ? 's' : ''} found
            </p>
          )}

          {/* Course Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Card key={i}>
                  <Skeleton className="h-48 w-full rounded-t-lg" />
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3 mt-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">No courses found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {courses.map((course) => (
                <Link
                  key={course.id}
                  to={`/course/${course.slug}`}
                  onClick={() => handleCourseClick(course.id, course.category_id)}
                >
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
                      <div className="flex items-center gap-2 flex-wrap mb-2">
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
                      <h3 className="font-semibold line-clamp-2">{course.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {course.instructor_name || 'Unknown Instructor'}
                      </p>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{formatDuration(course.total_duration)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span>{course.average_rating?.toFixed(1) || 'N/A'}</span>
                          <span className="text-xs">({course.total_reviews})</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Users className="h-3 w-3" />
                        <span>{course.enrollment_count} students</span>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-2">
                      {course.is_free ? (
                        <Badge className="bg-green-500 hover:bg-green-600">Free</Badge>
                      ) : (
                        <span className="font-bold text-primary">
                          {formatPrice(course.current_price || course.price)}
                        </span>
                      )}
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </MainLayout>
  );
};

export default Catalog;

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, Clock, Users, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  price: number;
  is_free: boolean;
  total_duration: number | null;
  category: { name: string } | null;
  instructor: { full_name: string | null } | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

const Catalog = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      // Fetch categories
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, name, slug')
        .order('name');

      if (categoriesData) {
        setCategories(categoriesData);
      }

      // Fetch published courses
      let query = supabase
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
          category:categories(name),
          instructor:profiles!courses_instructor_id_fkey(full_name)
        `)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (selectedCategory) {
        query = query.eq('category_id', selectedCategory);
      }

      const { data: coursesData } = await query;

      if (coursesData) {
        setCourses(coursesData as unknown as Course[]);
      }

      setLoading(false);
    };

    fetchData();
  }, [selectedCategory]);

  const filteredCourses = courses.filter((course) =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedCategory === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(null)}
              >
                All
              </Button>
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </div>

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
          ) : filteredCourses.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">No courses found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCourses.map((course) => (
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
                      {course.category && (
                        <Badge variant="secondary" className="w-fit mb-2">
                          {course.category.name}
                        </Badge>
                      )}
                      <h3 className="font-semibold line-clamp-2">{course.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {course.instructor?.full_name || 'Unknown Instructor'}
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
                          <span>4.5</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-2">
                      {course.is_free ? (
                        <Badge className="bg-green-500 hover:bg-green-600">Free</Badge>
                      ) : (
                        <span className="font-bold text-primary">
                          {formatPrice(course.price)}
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

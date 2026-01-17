import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useCart } from '@/hooks/useCart';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Star, Clock, Users, PlayCircle, Lock, CheckCircle, BookOpen, ShoppingCart, GraduationCap, MessageSquarePlus } from 'lucide-react';
import { useActivityLog } from '@/hooks/useActivityLog';
import { CourseChat } from '@/components/course/CourseChat';

interface Subsection {
  id: string;
  title: string;
  duration: number | null;
  is_preview: boolean;
  position: number;
}

interface Section {
  id: string;
  title: string;
  position: number;
  subsections: Subsection[];
}

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  price: number;
  current_price: number | null;
  dynamic_pricing_enabled: boolean;
  is_free: boolean;
  total_duration: number | null;
  status: string;
  instructor_id: string;
  category: { name: string } | null;
  instructor_name: string | null;
  instructor_avatar: string | null;
  difficulty_level: string;
  average_rating: number;
  total_reviews: number;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user_id: string;
  reviewer_name: string | null;
}

const CourseDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { isAdmin, isInstructor } = useUserRole();
  const { addToCart, items: cartItems } = useCart();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logActivity } = useActivityLog();

  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollmentCount, setEnrollmentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);

  const isInCart = course ? cartItems.some(item => item.course_id === course.id) : false;
  
  // Don't show purchase options for admins/instructors
  const canPurchase = !isAdmin() && !isInstructor();

  useEffect(() => {
    const fetchCourse = async () => {
      if (!slug) return;

      // Fetch course with difficulty and rating info
      const { data: courseData, error } = await supabase
        .from('courses')
        .select(`
          id,
          title,
          slug,
          description,
          thumbnail_url,
          price,
          current_price,
          dynamic_pricing_enabled,
          is_free,
          total_duration,
          status,
          instructor_id,
          difficulty_level,
          average_rating,
          total_reviews,
          category:categories(name)
        `)
        .eq('slug', slug)
        .maybeSingle();

      if (error || !courseData) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Course not found',
        });
        navigate('/catalog');
        return;
      }

      // Fetch instructor profile using security function
      const { data: instructorData } = await supabase
        .rpc('get_instructor_profile', { instructor_user_id: courseData.instructor_id });
      const instructor = Array.isArray(instructorData) ? instructorData[0] : instructorData;

      setCourse({
        ...courseData,
        instructor_name: instructor?.full_name || null,
        instructor_avatar: instructor?.avatar_url || null,
        difficulty_level: courseData.difficulty_level || 'beginner',
        average_rating: courseData.average_rating || 0,
        total_reviews: courseData.total_reviews || 0,
        current_price: courseData.current_price,
        dynamic_pricing_enabled: courseData.dynamic_pricing_enabled || false,
      } as Course);

      // Log course view activity
      if (user) {
        logActivity('course_view', { courseId: courseData.id });
      }

      // Fetch sections with subsections
      const { data: sectionsData } = await supabase
        .from('sections')
        .select(`
          id,
          title,
          position,
          subsections (
            id,
            title,
            duration,
            is_preview,
            position
          )
        `)
        .eq('course_id', courseData.id)
        .order('position');

      if (sectionsData) {
        const formattedSections = sectionsData.map((s: any) => ({
          ...s,
          subsections: s.subsections.sort((a: Subsection, b: Subsection) => a.position - b.position),
        }));
        setSections(formattedSections);
      }

      // Fetch reviews
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          user_id
        `)
        .eq('course_id', courseData.id)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (reviewsData) {
        // Fetch reviewer names using security function
        const reviewsWithNames = await Promise.all(
          reviewsData.map(async (review: any) => {
            const { data: reviewerData } = await supabase
              .rpc('get_reviewer_name', { reviewer_user_id: review.user_id });
            return {
              ...review,
              reviewer_name: reviewerData || null,
            };
          })
        );
        setReviews(reviewsWithNames as Review[]);
        
        // Check if current user has reviewed
        if (user) {
          const existingReview = reviewsWithNames.find(r => r.user_id === user.id);
          if (existingReview) {
            setUserReview(existingReview as Review);
          }
        }
      }

      // Check enrollment
      if (user) {
        const { data: enrollment } = await supabase
          .from('enrollments')
          .select('id')
          .eq('user_id', user.id)
          .eq('course_id', courseData.id)
          .maybeSingle();

        setIsEnrolled(!!enrollment);
      }

      // Get enrollment count
      const { count } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', courseData.id);

      setEnrollmentCount(count || 0);

      setLoading(false);
    };

    fetchCourse();
  }, [slug, user, navigate, toast]);

  const handleEnroll = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!course) return;

    setEnrolling(true);

    if (course.is_free) {
      // Direct enrollment for free courses
      const { error } = await supabase
        .from('enrollments')
        .insert({
          user_id: user.id,
          course_id: course.id,
        });

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message,
        });
      } else {
        setIsEnrolled(true);
        toast({
          title: 'Enrolled!',
          description: 'You can now access the course.',
        });
      }
    } else {
      // Add to cart and redirect to cart/checkout
      const added = await addToCart(course.id);
      if (added) {
        navigate('/cart');
      }
    }

    setEnrolling(false);
  };

  const handleAddToCart = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!course) return;

    setAddingToCart(true);
    await addToCart(course.id);
    setAddingToCart(false);
  };

  const handleReviewSubmitted = () => {
    // Refresh course data to get updated rating
    window.location.reload();
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ne-NP', {
      style: 'currency',
      currency: 'NPR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTotalLectures = () => {
    return sections.reduce((acc, section) => acc + section.subsections.length, 0);
  };

  const getDifficultyColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-32 w-full" />
            </div>
            <div>
              <Skeleton className="h-96 w-full" />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!course) {
    return (
      <MainLayout>
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Course Not Found</h1>
          <Button asChild>
            <Link to="/catalog">Browse Courses</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary/10 to-background py-8 md:py-12">
        <div className="container">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-wrap gap-2">
                {course.category && (
                  <Badge variant="secondary">{course.category.name}</Badge>
                )}
                <Badge className={getDifficultyColor(course.difficulty_level)}>
                  {course.difficulty_level || 'Beginner'}
                </Badge>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold">{course.title}</h1>
              <p className="text-lg text-muted-foreground">{course.description}</p>
              
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{(course.average_rating || 0).toFixed(1)}</span>
                  <span className="text-muted-foreground">({course.total_reviews || 0} reviews)</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{enrollmentCount} students</span>
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span>{getTotalLectures()} lectures</span>
                </div>
              </div>

              <p className="text-sm">
                Created by{' '}
                <span className="font-medium">
                  {course.instructor_name || 'Unknown Instructor'}
                </span>
              </p>
            </div>

            {/* Sticky Card */}
            <div className="lg:sticky lg:top-24 h-fit">
              <Card>
                <div className="aspect-video bg-muted rounded-t-lg overflow-hidden">
                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/10">
                      <PlayCircle className="h-16 w-16 text-primary" />
                    </div>
                  )}
                </div>
                <CardContent className="pt-6 space-y-4">
                  <div className="text-3xl font-bold">
                    {course.is_free ? (
                      <span className="text-green-600">Free</span>
                    ) : (
                      <div>
                        {formatPrice(course.current_price || course.price)}
                        {course.dynamic_pricing_enabled && (
                          <span className="block text-xs text-muted-foreground font-normal mt-1">
                            Price adjusts based on demand
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {isEnrolled ? (
                    <Button className="w-full" size="lg" asChild>
                      <Link to={`/learn/${course.slug}`}>
                        <PlayCircle className="mr-2 h-5 w-5" />
                        Continue Learning
                      </Link>
                    </Button>
                  ) : canPurchase ? (
                    course.is_free ? (
                      <Button
                        className="w-full"
                        size="lg"
                        onClick={handleEnroll}
                        disabled={enrolling}
                      >
                        Enroll Now - Free
                      </Button>
                    ) : isInCart ? (
                      <Button className="w-full" size="lg" asChild>
                        <Link to="/cart">
                          <ShoppingCart className="mr-2 h-5 w-5" />
                          Go to Cart
                        </Link>
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <Button
                          className="w-full"
                          size="lg"
                          onClick={handleEnroll}
                          disabled={enrolling}
                        >
                          Buy Now
                        </Button>
                        <Button
                          className="w-full"
                          size="lg"
                          variant="outline"
                          onClick={handleAddToCart}
                          disabled={addingToCart}
                        >
                          <ShoppingCart className="mr-2 h-5 w-5" />
                          Add to Cart
                        </Button>
                      </div>
                    )
                  ) : (
                    <p className="text-center text-muted-foreground text-sm">
                      You are viewing as {isAdmin() ? 'an admin' : 'an instructor'}
                    </p>
                  )}

                  <Separator />

                  <div className="space-y-2 text-sm">
                    <p className="font-medium">This course includes:</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        {getTotalLectures()} video lectures
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Lifetime access
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Certificate of completion
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Curriculum Section */}
      <section className="py-8 md:py-12">
        <div className="container">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold mb-6">Course Curriculum</h2>
              
              {sections.length === 0 ? (
                <p className="text-muted-foreground">No curriculum available yet.</p>
              ) : (
                <Accordion type="multiple" className="space-y-4">
                  {sections.map((section, sectionIndex) => (
                    <AccordionItem key={section.id} value={section.id} className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3 text-left">
                          <span className="font-medium">
                            Section {sectionIndex + 1}: {section.title}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {section.subsections.length} lectures
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pt-2">
                          {section.subsections.map((lecture, lectureIndex) => (
                            <div
                              key={lecture.id}
                              className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50"
                            >
                              <div className="flex items-center gap-3">
                                {lecture.is_preview || isEnrolled ? (
                                  <PlayCircle className="h-4 w-4 text-primary" />
                                ) : (
                                  <Lock className="h-4 w-4 text-muted-foreground" />
                                )}
                                <span>
                                  {sectionIndex + 1}.{lectureIndex + 1} {lecture.title}
                                </span>
                                {lecture.is_preview && !isEnrolled && (
                                  <Badge variant="outline" className="text-xs">
                                    Preview
                                  </Badge>
                                )}
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {formatDuration(lecture.duration)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </div>
            
            {/* Course Chat Assistant */}
            <div className="lg:sticky lg:top-24 h-fit">
              <CourseChat
                courseTitle={course.title}
                courseDescription={course.description}
                sections={sections}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Review CTA for Enrolled Students */}
      {isEnrolled && user && !userReview && (
        <section className="py-8 md:py-12 bg-muted/30">
          <div className="container">
            <div className="lg:w-2/3">
              <h2 className="text-2xl font-bold mb-6">Write a Review</h2>
              <Button asChild>
                <Link to={`/course/${course.slug}/review`}>
                  <MessageSquarePlus className="mr-2 h-4 w-4" />
                  Review this course
                </Link>
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                Reviews are submitted from the review page.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Reviews Section */}
      <section className="py-8 md:py-12 bg-card">
        <div className="container">
          <div className="lg:w-2/3">
            <h2 className="text-2xl font-bold mb-6">Student Reviews</h2>
            
            {reviews.length === 0 ? (
              <p className="text-muted-foreground">No reviews yet. Be the first to review this course!</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium">
                              {review.reviewer_name || 'Anonymous'}
                            </span>
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < review.rating
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-muted'
                                  }`}
                                />
                              ))}
                            </div>
                            {review.user_id === user?.id && (
                              <Badge variant="outline" className="text-xs">Your Review</Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground">{review.comment}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </MainLayout>
  );
};

export default CourseDetail;

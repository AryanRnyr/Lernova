import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Clock, Award, PlayCircle } from 'lucide-react';

interface EnrolledCourse {
  id: string;
  course_id: string;
  enrolled_at: string;
  completed_at: string | null;
  course: {
    id: string;
    title: string;
    slug: string;
    thumbnail_url: string | null;
    total_duration: number;
    instructor: {
      full_name: string | null;
    } | null;
  };
  progress: number;
  totalLectures: number;
  completedLectures: number;
}

const StudentDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const [enrollments, setEnrollments] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCourses: 0,
    completedCourses: 0,
    totalHoursLearned: 0,
    certificatesEarned: 0,
  });

  useEffect(() => {
    if (!user) return;

    const fetchEnrollments = async () => {
      try {
        // Fetch enrollments with course info
        const { data: enrollmentData, error: enrollmentError } = await supabase
          .from('enrollments')
          .select(`
            id,
            course_id,
            enrolled_at,
            completed_at,
            course:courses (
              id,
              title,
              slug,
              thumbnail_url,
              total_duration,
              instructor_id
            )
          `)
          .eq('user_id', user.id)
          .order('enrolled_at', { ascending: false });

        if (enrollmentError) throw enrollmentError;

        // Fetch instructor names for each course
        const enrollmentsWithInstructors = await Promise.all(
          (enrollmentData || []).map(async (enrollment: any) => {
            if (enrollment.course?.instructor_id) {
              const { data: instructorData } = await supabase.rpc('get_instructor_profile', {
                instructor_user_id: enrollment.course.instructor_id,
              });
              const instructorName = instructorData?.[0]?.full_name || 'Unknown Instructor';
              return {
                ...enrollment,
                course: {
                  ...enrollment.course,
                  instructor: { full_name: instructorName }
                }
              };
            }
            return {
              ...enrollment,
              course: {
                ...enrollment.course,
                instructor: { full_name: 'Unknown Instructor' }
              }
            };
          })
        );

        // Fetch progress for each enrollment
        const enrichedEnrollments = await Promise.all(
          enrollmentsWithInstructors.map(async (enrollment: any) => {
            // Get total lectures for this course
            const { data: sections } = await supabase
              .from('sections')
              .select('id')
              .eq('course_id', enrollment.course_id);

            const sectionIds = (sections || []).map((s: any) => s.id);
            
            let totalLectures = 0;
            let completedLectures = 0;

            if (sectionIds.length > 0) {
              const { data: subsections } = await supabase
                .from('subsections')
                .select('id')
                .in('section_id', sectionIds);

              totalLectures = subsections?.length || 0;

              // Get completed count
              const { data: progressData } = await supabase
                .from('course_progress')
                .select('id')
                .eq('user_id', user.id)
                .eq('completed', true)
                .in('subsection_id', (subsections || []).map((s: any) => s.id));

              completedLectures = progressData?.length || 0;
            }

            const progress = totalLectures > 0 
              ? Math.round((completedLectures / totalLectures) * 100) 
              : 0;

            return {
              ...enrollment,
              progress,
              totalLectures,
              completedLectures,
            };
          })
        );

        setEnrollments(enrichedEnrollments);

        // Calculate stats
        const completedCourses = enrichedEnrollments.filter(e => e.completed_at).length;
        
        // Get certificates count
        const { data: certificates } = await supabase
          .from('certificates')
          .select('id')
          .eq('user_id', user.id);

        setStats({
          totalCourses: enrichedEnrollments.length,
          completedCourses,
          totalHoursLearned: enrichedEnrollments.reduce((acc, e) => 
            acc + Math.round((e.course?.total_duration || 0) * (e.progress / 100) / 60), 0),
          certificatesEarned: certificates?.length || 0,
        });

      } catch (error) {
        console.error('Error fetching enrollments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEnrollments();
  }, [user]);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (authLoading) {
    return (
      <MainLayout>
        <div className="container py-8">
          <Skeleton className="h-8 w-64 mb-8" />
          <div className="grid gap-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Please Sign In</h1>
          <p className="text-muted-foreground mb-6">
            Sign in to access your learning dashboard.
          </p>
          <Button asChild>
            <Link to="/login">Sign In</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  const inProgressCourses = enrollments.filter(e => !e.completed_at && e.progress < 100);
  const completedCourses = enrollments.filter(e => e.completed_at || e.progress === 100);

  return (
    <MainLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">My Learning</h1>
          <p className="text-muted-foreground">Track your progress and continue learning</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Enrolled Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCourses}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedCourses}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Hours Learned</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalHoursLearned}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Certificates</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.certificatesEarned}</div>
            </CardContent>
          </Card>
        </div>

        {/* Course Tabs */}
        <Tabs defaultValue="in-progress" className="space-y-6">
          <TabsList>
            <TabsTrigger value="in-progress">
              In Progress ({inProgressCourses.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedCourses.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="in-progress">
            {loading ? (
              <div className="grid gap-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : inProgressCourses.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No courses in progress</h3>
                  <p className="text-muted-foreground mb-4">
                    Start learning by enrolling in a course
                  </p>
                  <Button asChild>
                    <Link to="/catalog">Browse Courses</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {inProgressCourses.map((enrollment) => (
                  <CourseCard key={enrollment.id} enrollment={enrollment} formatDuration={formatDuration} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed">
            {loading ? (
              <div className="grid gap-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : completedCourses.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No completed courses yet</h3>
                  <p className="text-muted-foreground">
                    Complete your enrolled courses to earn certificates
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {completedCourses.map((enrollment) => (
                  <CourseCard key={enrollment.id} enrollment={enrollment} formatDuration={formatDuration} completed />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

interface CourseCardProps {
  enrollment: EnrolledCourse;
  formatDuration: (minutes: number) => string;
  completed?: boolean;
}

const CourseCard = ({ enrollment, formatDuration, completed }: CourseCardProps) => {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row">
          <div className="w-full md:w-48 h-32 bg-muted flex-shrink-0">
            {enrollment.course?.thumbnail_url ? (
              <img
                src={enrollment.course.thumbnail_url}
                alt={enrollment.course.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1 p-4 flex flex-col justify-between">
            <div>
              <Link 
                to={`/course/${enrollment.course?.slug}`}
                className="text-lg font-semibold hover:text-primary transition-colors"
              >
                {enrollment.course?.title}
              </Link>
              <p className="text-sm text-muted-foreground">
                {enrollment.course?.instructor?.full_name || 'Unknown Instructor'}
              </p>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">
                  {enrollment.completedLectures} / {enrollment.totalLectures} lectures
                </span>
                <span className="font-medium">{enrollment.progress}%</span>
              </div>
              <Progress value={enrollment.progress} className="h-2" />
            </div>
          </div>
          <div className="p-4 flex items-center">
            <Button asChild variant={completed ? "outline" : "default"}>
              <Link to={`/learn/${enrollment.course?.slug}`}>
                <PlayCircle className="mr-2 h-4 w-4" />
                {completed ? 'Review' : 'Continue'}
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StudentDashboard;

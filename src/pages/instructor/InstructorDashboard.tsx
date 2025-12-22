import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, BookOpen, Users, DollarSign, Eye, Edit, Trash2, TrendingUp, Percent, Wallet } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

interface Course {
  id: string;
  title: string;
  slug: string;
  status: string;
  price: number;
  is_free: boolean;
  created_at: string;
  thumbnail_url: string | null;
  enrollments: { count: number }[];
}

interface EarningsData {
  totalRevenue: number;
  totalEarnings: number;
  commissionPaid: number;
  commissionPercentage: number;
  pendingPayout: number;
}

const InstructorDashboard = () => {
  const { user } = useAuth();
  const { isInstructor, isAdmin, isPendingInstructor, loading: roleLoading } = useUserRole();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalCourses: 0, totalStudents: 0 });
  const [earnings, setEarnings] = useState<EarningsData>({
    totalRevenue: 0,
    totalEarnings: 0,
    commissionPaid: 0,
    commissionPercentage: 20,
    pendingPayout: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Fetch courses
      const { data: coursesData, error } = await supabase
        .from('courses')
        .select(`
          id,
          title,
          slug,
          status,
          price,
          is_free,
          created_at,
          thumbnail_url,
          enrollments(count)
        `)
        .eq('instructor_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching courses:', error);
      } else if (coursesData) {
        setCourses(coursesData as unknown as Course[]);
        
        const totalStudents = coursesData.reduce((acc, course: any) => 
          acc + (course.enrollments?.[0]?.count || 0), 0);
        
        setStats({
          totalCourses: coursesData.length,
          totalStudents,
        });
      }

      // Fetch commission percentage
      const { data: settingsData } = await supabase
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'commission_percentage')
        .single();

      const commissionPercentage = settingsData ? parseFloat(settingsData.setting_value) : 20;

      // Fetch completed orders for this instructor's courses
      const { data: ordersData } = await supabase
        .from('orders')
        .select('amount, course_id, courses!inner(instructor_id)')
        .eq('status', 'completed')
        .eq('courses.instructor_id', user.id);

      // Calculate earnings
      const totalRevenue = ordersData?.reduce((acc, order) => acc + (order.amount || 0), 0) || 0;
      const commissionPaid = totalRevenue * (commissionPercentage / 100);
      const totalEarnings = totalRevenue - commissionPaid;

      // Fetch already paid out amounts
      const { data: payoutsData } = await supabase
        .from('payout_requests')
        .select('amount')
        .eq('instructor_id', user.id)
        .eq('status', 'completed');

      const paidOut = payoutsData?.reduce((acc, p) => acc + (p.amount || 0), 0) || 0;
      const pendingPayout = totalEarnings - paidOut;

      setEarnings({
        totalRevenue,
        totalEarnings,
        commissionPaid,
        commissionPercentage,
        pendingPayout: Math.max(0, pendingPayout),
      });

      setLoading(false);
    };

    fetchData();
  }, [user]);

  const handleDelete = async (courseId: string) => {
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete course',
      });
    } else {
      setCourses(courses.filter((c) => c.id !== courseId));
      toast({
        title: 'Course deleted',
        description: 'The course has been removed.',
      });
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ne-NP', {
      style: 'currency',
      currency: 'NPR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      published: 'default',
      draft: 'secondary',
      pending: 'outline',
      rejected: 'destructive',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  if (roleLoading) {
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

  if (isPendingInstructor()) {
    return (
      <MainLayout>
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Approval Pending</h1>
          <p className="text-muted-foreground mb-6">
            Your instructor account is pending approval. You'll be able to access your dashboard once an admin approves your application.
          </p>
          <Button asChild>
            <Link to="/">Go Home</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  if (!isInstructor() && !isAdmin()) {
    return (
      <MainLayout>
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You need to be an instructor to access this page.
          </p>
          <Button asChild>
            <Link to="/">Go Home</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Instructor Dashboard</h1>
            <p className="text-muted-foreground">Manage your courses and track performance</p>
          </div>
          <Button asChild>
            <Link to="/instructor/courses/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Course
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCourses}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalStudents}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Your Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatPrice(earnings.totalEarnings)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                After {earnings.commissionPercentage}% platform commission
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Available for Payout</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(earnings.pendingPayout)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Earnings Breakdown */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Earnings Breakdown
            </CardTitle>
            <CardDescription>Your revenue and commission details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
                <p className="text-xl font-semibold">{formatPrice(earnings.totalRevenue)}</p>
              </div>
              <div className="p-4 bg-destructive/10 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                  <Percent className="h-3 w-3" />
                  Platform Commission ({earnings.commissionPercentage}%)
                </p>
                <p className="text-xl font-semibold text-destructive">{formatPrice(earnings.commissionPaid)}</p>
              </div>
              <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Your Net Earnings</p>
                <p className="text-xl font-semibold text-green-600 dark:text-green-400">{formatPrice(earnings.totalEarnings)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Courses List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Courses</CardTitle>
            <CardDescription>Manage and edit your created courses</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : courses.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No courses yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first course to start teaching
                </p>
                <Button asChild>
                  <Link to="/instructor/courses/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Course
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {courses.map((course) => (
                  <div
                    key={course.id}
                    className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-14 bg-muted rounded overflow-hidden flex-shrink-0">
                        {course.thumbnail_url ? (
                          <img
                            src={course.thumbnail_url}
                            alt={course.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium">{course.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {getStatusBadge(course.status)}
                          <span>•</span>
                          <span>{course.enrollments?.[0]?.count || 0} students</span>
                          <span>•</span>
                          <span>{course.is_free ? 'Free' : formatPrice(course.price)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/course/${course.slug}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/instructor/courses/${course.id}/edit`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Course</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{course.title}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(course.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default InstructorDashboard;

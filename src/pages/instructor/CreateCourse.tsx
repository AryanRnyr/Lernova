import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { CourseForm } from '@/components/instructor/CourseForm';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Percent, Info, CheckCircle, Clock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TrustLevelBadge } from '@/components/instructor/TrustLevelBadge';

const CreateCourse = () => {
  const { user } = useAuth();
  const { isInstructor, isAdmin, isPendingInstructor, loading: roleLoading } = useUserRole();
  const [loading, setLoading] = useState(false);
  const [commissionPercentage, setCommissionPercentage] = useState<number>(20);
  const [trustLevel, setTrustLevel] = useState<string>('new');
  const [approvedCoursesCount, setApprovedCoursesCount] = useState<number>(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Fetch commission
      const { data: settingsData } = await supabase
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'commission_percentage')
        .single();
      
      if (settingsData) {
        setCommissionPercentage(parseFloat(settingsData.setting_value));
      }

      // Fetch instructor trust level
      const { data: trustData } = await supabase
        .rpc('get_instructor_trust_level', { instructor_user_id: user.id });
      
      if (trustData && trustData.length > 0) {
        setTrustLevel(trustData[0].trust_level || 'new');
        setApprovedCoursesCount(trustData[0].approved_courses_count || 0);
      }
    };
    fetchData();
  }, [user]);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      + '-' + Date.now().toString(36);
  };

  const handleSubmit = async (data: {
    title: string;
    description: string;
    category_id: string | null;
    price: number;
    is_free: boolean;
    thumbnail_url: string;
    difficulty_level: string;
    base_price: number;
    min_price: number;
    max_price: number;
    enrollment_target: number;
    dynamic_pricing_enabled: boolean;
    current_price: number;
  }) => {
    if (!user) return;

    setLoading(true);

    // Determine course status based on trust level
    const isTrusted = trustLevel === 'trusted' || trustLevel === 'verified';
    const courseStatus = isTrusted ? 'published' : 'pending';

    const { data: course, error } = await supabase
      .from('courses')
      .insert({
        ...data,
        instructor_id: user.id,
        slug: generateSlug(data.title),
        status: courseStatus,
      })
      .select()
      .single();

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } else {
      if (isTrusted) {
        toast({
          title: 'Course Published!',
          description: 'Your course is now live. Add sections and lectures to complete it.',
        });
      } else {
        toast({
          title: 'Course Created!',
          description: 'Your course is pending admin approval. You can still add content while waiting.',
        });
      }
      navigate(`/instructor/courses/${course.id}/edit`);
    }

    setLoading(false);
  };

  if (roleLoading) {
    return (
      <MainLayout>
        <div className="container py-8">
          <p>Loading...</p>
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
            Your instructor account is pending approval. You'll be able to create courses once an admin approves your application.
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
            You need to be an instructor to create courses.
          </p>
          <Button asChild>
            <Link to="/">Go Home</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  const isTrusted = trustLevel === 'trusted' || trustLevel === 'verified';

  return (
    <MainLayout>
      <div className="container py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">Create New Course</h1>
          <TrustLevelBadge 
            trustLevel={trustLevel} 
            approvedCoursesCount={approvedCoursesCount}
            showProgress
          />
        </div>
        <p className="text-muted-foreground mb-6">
          Fill in the details below to create your course
        </p>

        {/* Trust Level Info */}
        {isTrusted ? (
          <Alert className="mb-6 border-green-200 bg-green-50 dark:bg-green-900/10">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800 dark:text-green-400">Auto-Publish Enabled</AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300">
              As a {trustLevel} instructor, your courses will be published automatically without admin review.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="mb-6 border-amber-200 bg-amber-50 dark:bg-amber-900/10">
            <Clock className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-400">Admin Approval Required</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              Your course will be reviewed by an admin before publishing. 
              {3 - approvedCoursesCount > 0 && (
                <span> Get {3 - approvedCoursesCount} more course{3 - approvedCoursesCount > 1 ? 's' : ''} approved to unlock auto-publish.</span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Commission Info Alert */}
        <Alert className="mb-6 border-primary/20 bg-primary/5">
          <Percent className="h-4 w-4" />
          <AlertTitle>Platform Commission</AlertTitle>
          <AlertDescription>
            A <span className="font-semibold">{commissionPercentage}%</span> platform commission will be deducted from your course sales. 
            For example, if you price your course at NPR 1000, you'll receive NPR {1000 - (1000 * commissionPercentage / 100)} per sale.
          </AlertDescription>
        </Alert>

        <CourseForm onSubmit={handleSubmit} loading={loading} />
      </div>
    </MainLayout>
  );
};

export default CreateCourse;

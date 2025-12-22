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
import { Card, CardContent } from '@/components/ui/card';
import { Percent, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const CreateCourse = () => {
  const { user } = useAuth();
  const { isInstructor, isAdmin, isPendingInstructor, loading: roleLoading } = useUserRole();
  const [loading, setLoading] = useState(false);
  const [commissionPercentage, setCommissionPercentage] = useState<number>(20);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchCommission = async () => {
      const { data } = await supabase
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'commission_percentage')
        .single();
      
      if (data) {
        setCommissionPercentage(parseFloat(data.setting_value));
      }
    };
    fetchCommission();
  }, []);

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
  }) => {
    if (!user) return;

    setLoading(true);

    const { data: course, error } = await supabase
      .from('courses')
      .insert({
        ...data,
        instructor_id: user.id,
        slug: generateSlug(data.title),
        status: 'draft',
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
      toast({
        title: 'Course created!',
        description: 'Now add sections and lectures to your course.',
      });
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

  return (
    <MainLayout>
      <div className="container py-8 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">Create New Course</h1>
        <p className="text-muted-foreground mb-6">
          Fill in the details below to create your course
        </p>

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

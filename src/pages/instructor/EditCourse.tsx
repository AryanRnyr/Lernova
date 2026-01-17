import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { CourseForm } from '@/components/instructor/CourseForm';
import { CurriculumEditor } from '@/components/instructor/CurriculumEditor';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Eye, Send, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category_id: string | null;
  price: number;
  is_free: boolean;
  thumbnail_url: string | null;
  status: string;
  instructor_id: string;
  last_edited_by: string | null;
  last_edited_at: string | null;
  difficulty_level?: string;
  base_price?: number;
  min_price?: number;
  max_price?: number;
  enrollment_target?: number;
  dynamic_pricing_enabled?: boolean;
  current_price?: number;
}

interface AdminEditInfo {
  editedBy: string;
  editedAt: string;
}

const EditCourse = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { isInstructor, isAdmin, loading: roleLoading } = useUserRole();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminEditInfo, setAdminEditInfo] = useState<AdminEditInfo | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchCourse = async () => {
      if (!id) return;

      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Course not found',
        });
        navigate('/instructor');
      } else {
        setCourse(data);
        
        // Check if course was edited by admin (and current user is the instructor)
        if (data.last_edited_by && data.last_edited_by !== data.instructor_id && data.instructor_id === user?.id) {
          // Fetch admin name
          const { data: adminProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', data.last_edited_by)
            .single();
          
          setAdminEditInfo({
            editedBy: adminProfile?.full_name || 'An administrator',
            editedAt: data.last_edited_at,
          });
        }
      }
      setLoading(false);
    };

    fetchCourse();
  }, [id, navigate, toast, user?.id]);

  const handleUpdateDetails = async (data: {
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
    if (!id || !course) return;

    setSaving(true);

    // Include admin tracking fields
    const updateData: any = {
      ...data,
      last_edited_by: user?.id,
      last_edited_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('courses')
      .update(updateData)
      .eq('id', id);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } else {
      // If admin edited instructor's course, create notification
      if (isAdmin() && course.instructor_id !== user?.id) {
        await supabase.from('notifications').insert({
          user_id: course.instructor_id,
          type: 'course_edit',
          title: 'Course Edited by Admin',
          message: `Your course "${course.title}" has been modified by an administrator.`,
          data: { course_id: course.id, course_title: course.title },
        });
      }
      
      setCourse((prev) => prev ? { ...prev, ...data } : null);
      toast({
        title: 'Course updated!',
        description: 'Your changes have been saved.',
      });
    }

    setSaving(false);
  };

  const handlePublish = async () => {
    if (!id) return;

    setSaving(true);

    const { error } = await supabase
      .from('courses')
      .update({ status: 'published' })
      .eq('id', id);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } else {
      setCourse((prev) => prev ? { ...prev, status: 'published' } : null);
      toast({
        title: 'Course published!',
        description: 'Your course is now live.',
      });
    }

    setSaving(false);
  };

  if (roleLoading || loading) {
    return (
      <MainLayout>
        <div className="container py-8">
          <Skeleton className="h-8 w-64 mb-8" />
          <Skeleton className="h-96 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!isInstructor() && !isAdmin()) {
    return (
      <MainLayout>
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <Button asChild>
            <Link to="/">Go Home</Link>
          </Button>
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
            <Link to="/instructor">Back to Dashboard</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  // Check ownership
  if (course.instructor_id !== user?.id && !isAdmin()) {
    return (
      <MainLayout>
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">You don't have permission to edit this course.</p>
          <Button asChild>
            <Link to="/instructor">Back to Dashboard</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Admin edit notification for instructors */}
        {adminEditInfo && (
          <Alert className="mb-6 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              {adminEditInfo.editedBy} edited this course on{' '}
              {new Date(adminEditInfo.editedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to={isAdmin() ? "/admin" : "/instructor"}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{course.title}</h1>
                <Badge variant={course.status === 'published' ? 'default' : 'secondary'}>
                  {course.status}
                </Badge>
                {isAdmin() && course.instructor_id !== user?.id && (
                  <Badge variant="outline" className="border-amber-500 text-amber-600">
                    Editing as Admin
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">Edit your course details and curriculum</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to={`/course/${course.slug}`}>
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Link>
            </Button>
            {course.status !== 'published' && (
              <Button onClick={handlePublish} disabled={saving}>
                <Send className="mr-2 h-4 w-4" />
                Publish
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="details" className="space-y-6">
          <TabsList>
            <TabsTrigger value="details">Course Details</TabsTrigger>
            <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <CourseForm
              initialData={{
                title: course.title,
                description: course.description || '',
                category_id: course.category_id,
                price: course.price,
                is_free: course.is_free,
                thumbnail_url: course.thumbnail_url || '',
                difficulty_level: course.difficulty_level || 'beginner',
                base_price: course.base_price || course.price,
                min_price: course.min_price || course.price * 0.5,
                max_price: course.max_price || course.price * 1.5,
                enrollment_target: course.enrollment_target || 100,
                dynamic_pricing_enabled: course.dynamic_pricing_enabled ?? true,
              }}
              onSubmit={handleUpdateDetails}
              loading={saving}
            />
          </TabsContent>

          <TabsContent value="curriculum">
            <Card>
              <CardHeader>
                <CardTitle>Course Curriculum</CardTitle>
                <CardDescription>
                  Organize your course into sections and lectures
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CurriculumEditor courseId={course.id} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default EditCourse;

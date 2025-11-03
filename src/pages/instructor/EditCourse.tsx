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
import { ArrowLeft, Eye, Send } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

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
}

const EditCourse = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { isInstructor, isAdmin, loading: roleLoading } = useUserRole();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
      }
      setLoading(false);
    };

    fetchCourse();
  }, [id, navigate, toast]);

  const handleUpdateDetails = async (data: {
    title: string;
    description: string;
    category_id: string | null;
    price: number;
    is_free: boolean;
    thumbnail_url: string;
  }) => {
    if (!id) return;

    setSaving(true);

    const { error } = await supabase
      .from('courses')
      .update(data)
      .eq('id', id);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } else {
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/instructor">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{course.title}</h1>
                <Badge variant={course.status === 'published' ? 'default' : 'secondary'}>
                  {course.status}
                </Badge>
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

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Users, BookOpen, FolderOpen, Plus, Edit, Trash2, Shield, Eye, UserCheck, UserX, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

interface UserWithRole {
  user_id: string;
  email: string;
  full_name: string | null;
  roles: string[];
}

interface PendingInstructor {
  user_id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

interface CourseForAdmin {
  id: string;
  title: string;
  slug: string;
  status: string;
  price: number;
  instructor_name: string | null;
  last_edited_by: string | null;
  last_edited_at: string | null;
}

const AdminDashboard = () => {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [courses, setCourses] = useState<CourseForAdmin[]>([]);
  const [pendingInstructors, setPendingInstructors] = useState<PendingInstructor[]>([]);
  const [stats, setStats] = useState({ users: 0, courses: 0, categories: 0, pendingInstructors: 0 });
  const [loading, setLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const { toast } = useToast();

  // Category dialog
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');

  useEffect(() => {
    // Only fetch once when admin status is confirmed
    if (isAdmin() && !hasFetched && !roleLoading) {
      setHasFetched(true);
      fetchData();
    }
  }, [isAdmin, roleLoading, hasFetched]);

  const fetchData = async () => {
    try {
      // Fetch categories
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (categoriesData) {
        setCategories(categoriesData);
      }

      // Fetch users with emails using the new function
      const { data: usersWithEmails, error: usersError } = await supabase
        .rpc('get_all_users_with_emails');

      if (usersError) {
        console.error('Error fetching users:', usersError);
      }

      // Fetch all roles with approval status
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role, is_approved, created_at');

      if (usersWithEmails) {
        const usersMap = new Map<string, UserWithRole>();
        
        usersWithEmails.forEach((user: any) => {
          usersMap.set(user.user_id, {
            user_id: user.user_id,
            email: user.email || '',
            full_name: user.full_name,
            roles: [],
          });
        });

        if (rolesData) {
          rolesData.forEach((role: any) => {
            const user = usersMap.get(role.user_id);
            if (user) {
              user.roles.push(role.role);
            }
          });
        }

        setUsers(Array.from(usersMap.values()));

        // Find pending instructors (instructors with is_approved = false)
        const pendingList: PendingInstructor[] = [];
        if (rolesData) {
          const pendingRoles = rolesData.filter(
            (r: any) => r.role === 'instructor' && r.is_approved === false
          );
          for (const role of pendingRoles) {
            const user = usersMap.get(role.user_id);
            if (user) {
              pendingList.push({
                user_id: role.user_id,
                email: user.email,
                full_name: user.full_name,
                created_at: role.created_at,
              });
            }
          }
        }
        setPendingInstructors(pendingList);
      }

      // Fetch all courses for admin management
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, title, slug, status, price, instructor_id, last_edited_by, last_edited_at')
        .order('created_at', { ascending: false });

      if (coursesData) {
        // Fetch instructor names for each course
        const coursesWithInstructors = await Promise.all(
          coursesData.map(async (course) => {
            const { data: instructor } = await supabase
              .rpc('get_instructor_profile', { instructor_user_id: course.instructor_id });
            return {
              ...course,
              instructor_name: instructor?.[0]?.full_name || 'Unknown',
            };
          })
        );
        setCourses(coursesWithInstructors);
      }

      // Fetch counts
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: coursesCount } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true });

      // Count pending instructors
      const { count: pendingCount } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'instructor')
        .eq('is_approved', false);

      setStats({
        users: usersCount || 0,
        courses: coursesCount || 0,
        categories: categoriesData?.length || 0,
        pendingInstructors: pendingCount || 0,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch data' });
    }

    setLoading(false);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const openCategoryDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryName(category.name);
      setCategoryDescription(category.description || '');
    } else {
      setEditingCategory(null);
      setCategoryName('');
      setCategoryDescription('');
    }
    setCategoryDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) return;

    const categoryData = {
      name: categoryName,
      slug: generateSlug(categoryName),
      description: categoryDescription || null,
    };

    if (editingCategory) {
      const { error } = await supabase
        .from('categories')
        .update(categoryData)
        .eq('id', editingCategory.id);

      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      } else {
        await fetchData();
        toast({ title: 'Category updated' });
      }
    } else {
      const { error } = await supabase
        .from('categories')
        .insert(categoryData);

      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      } else {
        await fetchData();
        toast({ title: 'Category created' });
      }
    }

    setCategoryDialogOpen(false);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      await fetchData();
      toast({ title: 'Category deleted' });
    }
  };

  const handleAssignRole = async (userId: string, role: 'instructor' | 'admin') => {
    const { error } = await supabase
      .from('user_roles')
      .insert({ user_id: userId, role, is_approved: true });

    if (error) {
      if (error.code === '23505') {
        toast({ variant: 'destructive', title: 'Error', description: 'User already has this role' });
      } else {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      }
    } else {
      await fetchData();
      toast({ title: 'Role assigned' });
    }
  };

  const handleRemoveRole = async (userId: string, role: 'admin' | 'instructor' | 'student') => {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', role);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      await fetchData();
      toast({ title: 'Role removed' });
    }
  };

  const handleApproveInstructor = async (userId: string) => {
    const { error } = await supabase
      .from('user_roles')
      .update({ is_approved: true })
      .eq('user_id', userId)
      .eq('role', 'instructor');

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      await fetchData();
      toast({ title: 'Instructor approved', description: 'They can now create courses.' });
    }
  };

  const handleRejectInstructor = async (userId: string) => {
    // Remove the instructor role entirely
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', 'instructor');

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      // Ensure they have student role
      await supabase.from('user_roles').upsert({
        user_id: userId,
        role: 'student',
        is_approved: true,
      }, { onConflict: 'user_id,role' });
      
      await fetchData();
      toast({ title: 'Instructor request rejected', description: 'User has been set to student role.' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-100 text-green-800">Published</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (roleLoading) {
    return (
      <MainLayout>
        <div className="container py-8">
          <Skeleton className="h-8 w-64 mb-8" />
          <div className="grid gap-4">
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!isAdmin()) {
    return (
      <MainLayout>
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You need admin privileges to access this page.
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage users, categories, courses, and platform settings</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.users}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.courses}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.categories}</div>
            </CardContent>
          </Card>
          <Card className={stats.pendingInstructors > 0 ? 'border-orange-200 bg-orange-50/50' : ''}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <Clock className={`h-4 w-4 ${stats.pendingInstructors > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.pendingInstructors > 0 ? 'text-orange-600' : ''}`}>
                {stats.pendingInstructors}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue={stats.pendingInstructors > 0 ? 'approvals' : 'categories'} className="space-y-6">
          <TabsList>
            <TabsTrigger value="approvals" className="relative">
              Instructor Approvals
              {stats.pendingInstructors > 0 && (
                <Badge className="ml-2 bg-orange-500 text-white text-xs px-1.5 py-0.5">
                  {stats.pendingInstructors}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="users">Users & Roles</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
          </TabsList>

          <TabsContent value="approvals">
            <Card>
              <CardHeader>
                <CardTitle>Pending Instructor Approvals</CardTitle>
                <CardDescription>
                  Review and approve new instructor registrations. Instructors need approval before they can create courses.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : pendingInstructors.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No pending approvals</p>
                    <p className="text-sm">All instructor requests have been processed.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Requested On</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingInstructors.map((instructor) => (
                        <TableRow key={instructor.user_id}>
                          <TableCell className="font-medium">
                            {instructor.full_name || 'Unnamed User'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {instructor.email}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(instructor.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleApproveInstructor(instructor.user_id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <UserCheck className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="sm">
                                    <UserX className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Reject Instructor Request</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to reject {instructor.full_name || instructor.email}'s instructor request? 
                                      They will be set to a student role.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleRejectInstructor(instructor.user_id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Reject
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Course Categories</CardTitle>
                  <CardDescription>Manage course categories</CardDescription>
                </div>
                <Button onClick={() => openCategoryDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : categories.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No categories yet. Create your first category.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {categories.map((category) => (
                      <div
                        key={category.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{category.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {category.description || 'No description'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openCategoryDialog(category)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Category</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{category.name}"? Courses in this category will be unassigned.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteCategory(category.id)}>
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
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Users & Roles</CardTitle>
                <CardDescription>Manage user roles and permissions</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No users found.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Roles</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.user_id}>
                          <TableCell className="font-medium">
                            {user.full_name || 'Unnamed User'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {user.email || 'No email'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {user.roles.length === 0 ? (
                                <Badge variant="outline">No roles</Badge>
                              ) : (
                                user.roles.map((role) => (
                                  <Badge key={role} variant="secondary" className="capitalize">
                                    {role}
                                  </Badge>
                                ))
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {!user.roles.includes('instructor') && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAssignRole(user.user_id, 'instructor')}
                                >
                                  <Shield className="h-4 w-4 mr-1" />
                                  Make Instructor
                                </Button>
                              )}
                              {user.roles.includes('instructor') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveRole(user.user_id, 'instructor')}
                                >
                                  Remove Instructor
                                </Button>
                              )}
                              {!user.roles.includes('admin') && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAssignRole(user.user_id, 'admin')}
                                >
                                  Make Admin
                                </Button>
                              )}
                              {user.roles.includes('admin') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveRole(user.user_id, 'admin')}
                                >
                                  Remove Admin
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="courses">
            <Card>
              <CardHeader>
                <CardTitle>All Courses</CardTitle>
                <CardDescription>View and manage all courses on the platform</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : courses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No courses found.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Instructor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {courses.map((course) => (
                        <TableRow key={course.id}>
                          <TableCell className="font-medium">
                            {course.title}
                            {course.last_edited_by && (
                              <p className="text-xs text-muted-foreground">
                                Last edited by admin
                              </p>
                            )}
                          </TableCell>
                          <TableCell>{course.instructor_name}</TableCell>
                          <TableCell>{getStatusBadge(course.status)}</TableCell>
                          <TableCell>
                            {course.price === 0 ? 'Free' : `NPR ${course.price}`}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="sm" asChild>
                                <Link to={`/course/${course.slug}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button variant="outline" size="sm" asChild>
                                <Link to={`/instructor/courses/${course.id}/edit`}>
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Category Dialog */}
        <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
              <DialogDescription>
                {editingCategory ? 'Update the category details' : 'Create a new course category'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="cat-name">Category Name *</Label>
                <Input
                  id="cat-name"
                  placeholder="e.g., Web Development"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-desc">Description</Label>
                <Input
                  id="cat-desc"
                  placeholder="Brief description of this category"
                  value={categoryDescription}
                  onChange={(e) => setCategoryDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveCategory}>
                {editingCategory ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default AdminDashboard;

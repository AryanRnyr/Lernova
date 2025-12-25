import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, BookOpen, FolderOpen, Plus, Edit, Trash2, Eye, Clock, Settings, Ban, DollarSign, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { InstructorDetailsDialog } from '@/components/admin/InstructorDetailsDialog';
import { SalesPayoutsTab } from '@/components/admin/SalesPayoutsTab';

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
  role: string;
  is_disabled: boolean;
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

interface SalesData {
  totalSales: number;
  totalRevenue: number;
  commissionEarned: number;
  instructorPayouts: {
    instructor_id: string;
    instructor_name: string;
    totalEarned: number;
    commissionPaid: number;
    netEarnings: number;
    paidOut: number;
    pending: number;
  }[];
}

const AdminDashboard = () => {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { user: currentUser } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [courses, setCourses] = useState<CourseForAdmin[]>([]);
  const [pendingInstructors, setPendingInstructors] = useState<PendingInstructor[]>([]);
  const [stats, setStats] = useState({ users: 0, courses: 0, categories: 0, pendingInstructors: 0 });
  const [salesData, setSalesData] = useState<SalesData>({ totalSales: 0, totalRevenue: 0, commissionEarned: 0, instructorPayouts: [] });
  const [loading, setLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState<PendingInstructor | null>(null);
  const [commissionPercentage, setCommissionPercentage] = useState<number>(20);
  const { toast } = useToast();

  // Category dialog
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');

  useEffect(() => {
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

      // Fetch commission percentage
      const { data: settingsData } = await supabase
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'commission_percentage')
        .single();

      const commission = settingsData ? parseFloat(settingsData.setting_value) : 20;
      setCommissionPercentage(commission);

      // Fetch users with emails using the RPC function
      const { data: usersWithEmails, error: usersError } = await supabase
        .rpc('get_all_users_with_emails');

      if (usersError) {
        console.error('Error fetching users:', usersError);
      }

      // Fetch all roles with approval status
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role, is_approved, created_at');

      // Fetch profiles with disabled status
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, is_disabled');

      const disabledMap = new Map<string, boolean>();
      profilesData?.forEach((p: any) => disabledMap.set(p.user_id, p.is_disabled));

      if (usersWithEmails) {
        // Create user list with primary role (priority: admin > instructor > student)
        const usersMap = new Map<string, UserWithRole>();
        
        usersWithEmails.forEach((user: any) => {
          usersMap.set(user.user_id, {
            user_id: user.user_id,
            email: user.email || '',
            full_name: user.full_name,
            role: 'student',
            is_disabled: disabledMap.get(user.user_id) || false,
          });
        });

        if (rolesData) {
          rolesData.forEach((role: any) => {
            const user = usersMap.get(role.user_id);
            if (user && role.is_approved) {
              // Set priority: admin > instructor > student
              if (role.role === 'admin') {
                user.role = 'admin';
              } else if (role.role === 'instructor' && user.role !== 'admin') {
                user.role = 'instructor';
              }
            }
          });
        }

        setUsers(Array.from(usersMap.values()));

        // Find pending instructors
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

      // Fetch sales data
      await fetchSalesData(commission);

      // Fetch counts
      const usersCount = usersWithEmails?.length || 0;
      const { count: coursesCount } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true });

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

  const fetchSalesData = async (commission: number) => {
    // Fetch all completed orders with course info
    const { data: ordersData } = await supabase
      .from('orders')
      .select('amount, course_id, courses(instructor_id, title)')
      .eq('status', 'completed');

    // Fetch payout requests
    const { data: payoutsData } = await supabase
      .from('payout_requests')
      .select('instructor_id, amount, status')
      .eq('status', 'completed');

    // Calculate per-instructor earnings
    const instructorEarnings = new Map<string, { totalEarned: number; instructor_id: string }>();
    
    ordersData?.forEach((order: any) => {
      const instructorId = order.courses?.instructor_id;
      if (instructorId) {
        const existing = instructorEarnings.get(instructorId) || { totalEarned: 0, instructor_id: instructorId };
        existing.totalEarned += order.amount || 0;
        instructorEarnings.set(instructorId, existing);
      }
    });

    // Get instructor names
    const instructorPayouts: SalesData['instructorPayouts'] = [];
    for (const [instructorId, data] of instructorEarnings) {
      const { data: profile } = await supabase
        .rpc('get_instructor_profile', { instructor_user_id: instructorId });
      
      const paidOut = payoutsData
        ?.filter((p: any) => p.instructor_id === instructorId)
        .reduce((acc: number, p: any) => acc + (p.amount || 0), 0) || 0;

      const commissionPaid = data.totalEarned * (commission / 100);
      const netEarnings = data.totalEarned - commissionPaid;

      instructorPayouts.push({
        instructor_id: instructorId,
        instructor_name: profile?.[0]?.full_name || 'Unknown',
        totalEarned: data.totalEarned,
        commissionPaid,
        netEarnings,
        paidOut,
        pending: Math.max(0, netEarnings - paidOut),
      });
    }

    const totalRevenue = ordersData?.reduce((acc, o: any) => acc + (o.amount || 0), 0) || 0;
    const commissionEarned = totalRevenue * (commission / 100);

    setSalesData({
      totalSales: ordersData?.length || 0,
      totalRevenue,
      commissionEarned,
      instructorPayouts: instructorPayouts.sort((a, b) => b.pending - a.pending),
    });
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

  const handleChangeRole = async (userId: string, newRole: string) => {
    if (userId === currentUser?.id && newRole !== 'admin') {
      toast({ variant: 'destructive', title: 'Error', description: 'You cannot change your own role from admin' });
      return;
    }

    // Delete existing roles
    await supabase.from('user_roles').delete().eq('user_id', userId);

    // Insert new role
    const { error } = await supabase.from('user_roles').insert({
      user_id: userId,
      role: newRole as 'admin' | 'instructor' | 'student',
    });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      await fetchData();
      toast({ title: 'Role updated' });
    }
  };

  const handleToggleDisable = async (userId: string, currentlyDisabled: boolean) => {
    if (userId === currentUser?.id) {
      toast({ variant: 'destructive', title: 'Error', description: 'You cannot disable your own account' });
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ is_disabled: !currentlyDisabled })
      .eq('user_id', userId);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      await fetchData();
      toast({ title: currentlyDisabled ? 'Account enabled' : 'Account disabled' });
    }
  };

  const handleApproveInstructor = async (userId: string, email: string, name: string | null) => {
    const { error } = await supabase
      .from('user_roles')
      .update({ is_approved: true })
      .eq('user_id', userId)
      .eq('role', 'instructor');

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      await supabase.functions.invoke('send-email', {
        body: {
          to: email,
          subject: 'Your Instructor Application Has Been Approved!',
          html: `<h2>Congratulations ${name || 'Instructor'}!</h2><p>Your instructor application on Lernova has been approved. You can now log in and start creating courses.</p><p>Welcome to our teaching community!</p>`,
        },
      });
      await fetchData();
      toast({ title: 'Instructor approved', description: 'They can now create courses.' });
    }
  };

  const handleRejectInstructor = async (userId: string, email: string, name: string | null) => {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', 'instructor');

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      await supabase.from('user_roles').upsert({ user_id: userId, role: 'student', is_approved: true }, { onConflict: 'user_id,role' });
      await supabase.functions.invoke('send-email', {
        body: {
          to: email,
          subject: 'Update on Your Instructor Application',
          html: `<h2>Hello ${name || 'User'},</h2><p>Thank you for your interest in becoming an instructor on Lernova. After reviewing your application, we're unable to approve it at this time.</p><p>You can continue using Lernova as a student. If you have questions, please contact support.</p>`,
        },
      });
      await fetchData();
      toast({ title: 'Instructor request rejected' });
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage users, categories, courses, and platform settings</p>
          </div>
          <Button asChild>
            <Link to="/admin/settings"><Settings className="h-4 w-4 mr-2" /> Settings</Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
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
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{salesData.totalSales}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Commission Earned</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatPrice(salesData.commissionEarned)}</div>
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
          <TabsList className="flex-wrap">
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
            <TabsTrigger value="sales">Sales & Payouts</TabsTrigger>
          </TabsList>

          <TabsContent value="approvals">
            <Card>
              <CardHeader>
                <CardTitle>Pending Instructor Approvals</CardTitle>
                <CardDescription>
                  Review and approve new instructor registrations. Click on an instructor to view their details.
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
                  <div className="text-center py-8 text-muted-foreground">
                    No pending instructor approvals.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Applied</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingInstructors.map((instructor) => (
                        <TableRow key={instructor.user_id}>
                          <TableCell 
                            className="font-medium cursor-pointer hover:text-primary"
                            onClick={() => setSelectedInstructor(instructor)}
                          >
                            {instructor.full_name || 'Unnamed'}
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
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedInstructor(instructor)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleApproveInstructor(instructor.user_id, instructor.email, instructor.full_name)}
                              >
                                Approve
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="destructive">
                                    Reject
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Reject Instructor Request</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to reject {instructor.full_name || instructor.email}'s instructor request?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleRejectInstructor(instructor.user_id, instructor.email, instructor.full_name)}
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
                                  Are you sure you want to delete "{category.name}"?
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
                <CardDescription>Manage user roles and account status. Each user has one primary role.</CardDescription>
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
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.user_id} className={user.is_disabled ? 'opacity-50' : ''}>
                          <TableCell className="font-medium">
                            {user.full_name || 'Unnamed User'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {user.email || 'No email'}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={user.role}
                              onValueChange={(value) => handleChangeRole(user.user_id, value)}
                              disabled={user.user_id === currentUser?.id}
                            >
                              <SelectTrigger className="w-[130px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="student">Student</SelectItem>
                                <SelectItem value="instructor">Instructor</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {user.is_disabled ? (
                              <Badge variant="destructive">Disabled</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {user.user_id !== currentUser?.id && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant={user.is_disabled ? 'outline' : 'ghost'}
                                    size="sm"
                                  >
                                    {user.is_disabled ? (
                                      <>Enable</>
                                    ) : (
                                      <><Ban className="h-4 w-4 mr-1" /> Disable</>
                                    )}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      {user.is_disabled ? 'Enable Account' : 'Disable Account'}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {user.is_disabled
                                        ? `Are you sure you want to enable ${user.full_name || user.email}'s account?`
                                        : `Are you sure you want to disable ${user.full_name || user.email}'s account? They will not be able to log in.`}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleToggleDisable(user.user_id, user.is_disabled)}
                                    >
                                      {user.is_disabled ? 'Enable' : 'Disable'}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
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
                          </TableCell>
                          <TableCell>{course.instructor_name}</TableCell>
                          <TableCell>{getStatusBadge(course.status)}</TableCell>
                          <TableCell>
                            {course.price === 0 ? 'Free' : formatPrice(course.price)}
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

          <TabsContent value="sales">
            <SalesPayoutsTab />
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

        {/* Instructor Details Dialog */}
        {selectedInstructor && (
          <InstructorDetailsDialog
            open={!!selectedInstructor}
            onOpenChange={(open) => !open && setSelectedInstructor(null)}
            userId={selectedInstructor.user_id}
            userName={selectedInstructor.full_name}
            userEmail={selectedInstructor.email}
            isPending={true}
            onApprove={handleApproveInstructor}
            onReject={handleRejectInstructor}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default AdminDashboard;

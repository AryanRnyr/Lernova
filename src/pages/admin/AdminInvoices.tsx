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
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Download, 
  ArrowLeft, 
  Receipt, 
  Calendar, 
  CreditCard,
  Search,
  DollarSign,
  TrendingUp,
  Users
} from 'lucide-react';
import jsPDF from 'jspdf';

interface Order {
  id: string;
  amount: number;
  commission_percentage: number | null;
  payment_method: string;
  payment_reference: string | null;
  status: string;
  created_at: string;
  user_id: string;
  course: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    instructor_id: string;
  };
  user_email?: string;
}

const AdminInvoices = () => {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState<string>(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (user && isAdmin()) {
      fetchOrders();
    }
  }, [user, roleLoading]);

  const fetchOrders = async () => {
    setLoading(true);
    
    // Fetch orders with course info
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        amount,
        commission_percentage,
        payment_method,
        payment_reference,
        status,
        created_at,
        user_id,
        course:courses(id, title, thumbnail_url, instructor_id)
      `)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      setLoading(false);
      return;
    }

    // Fetch user emails
    const { data: usersData } = await supabase.rpc('get_all_users_with_emails');
    const userEmails = new Map(usersData?.map((u: any) => [u.user_id, u.email]) || []);

    const formattedOrders = (ordersData || []).map((order: any) => ({
      ...order,
      course: order.course || { id: '', title: 'Unknown Course', thumbnail_url: null, instructor_id: '' },
      user_email: userEmails.get(order.user_id) || 'Unknown'
    }));

    setOrders(formattedOrders);
    setLoading(false);
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
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Completed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'refunded':
        return <Badge variant="outline">Refunded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesSearch = searchQuery === '' || 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.payment_reference?.toLowerCase().includes(searchQuery.toLowerCase());
    const orderDate = new Date(order.created_at);
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);
    const matchesDate = orderDate >= fromDate && orderDate <= toDate;
    return matchesStatus && matchesSearch && matchesDate;
  });

  const stats = {
    totalRevenue: filteredOrders.filter(o => o.status === 'completed').reduce((acc, o) => acc + o.amount, 0),
    totalCommission: filteredOrders.filter(o => o.status === 'completed').reduce((acc, o) => acc + (o.amount * (o.commission_percentage || 20) / 100), 0),
    completedOrders: filteredOrders.filter(o => o.status === 'completed').length,
    pendingOrders: filteredOrders.filter(o => o.status === 'pending').length,
  };

  const openDetails = (order: Order) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  };

  const downloadInvoice = (order: Order) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const commission = order.amount * (order.commission_percentage || 20) / 100;

    // Header
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', pageWidth / 2, 30, { align: 'center' });

    // Invoice details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice #: ${order.id.slice(0, 8).toUpperCase()}`, 20, 50);
    doc.text(`Date: ${new Date(order.created_at).toLocaleDateString()}`, 20, 58);
    doc.text(`Status: ${order.status.toUpperCase()}`, 20, 66);
    doc.text(`Customer: ${order.user_email || 'N/A'}`, 20, 74);

    // Separator line
    doc.setDrawColor(200);
    doc.line(20, 85, pageWidth - 20, 85);

    // Course details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Order Details', 20, 100);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Course: ${order.course.title}`, 20, 112);
    doc.text(`Payment Method: ${order.payment_method.toUpperCase()}`, 20, 122);
    if (order.payment_reference) {
      doc.text(`Transaction ID: ${order.payment_reference}`, 20, 132);
    }

    // Financial breakdown
    doc.setDrawColor(200);
    doc.line(20, 145, pageWidth - 20, 145);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Financial Summary', 20, 160);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text('Subtotal:', 20, 175);
    doc.text(formatPrice(order.amount), pageWidth - 20, 175, { align: 'right' });
    
    doc.text(`Platform Commission (${order.commission_percentage || 20}%):`, 20, 185);
    doc.text(formatPrice(commission), pageWidth - 20, 185, { align: 'right' });
    
    doc.text('Instructor Earnings:', 20, 195);
    doc.text(formatPrice(order.amount - commission), pageWidth - 20, 195, { align: 'right' });

    // Total
    doc.setDrawColor(200);
    doc.line(20, 205, pageWidth - 20, 205);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Total Amount:', 20, 220);
    doc.text(formatPrice(order.amount), pageWidth - 20, 220, { align: 'right' });

    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Generated by Admin Dashboard', pageWidth / 2, 280, { align: 'center' });

    doc.save(`invoice-${order.id.slice(0, 8)}.pdf`);
  };

  const exportAllAsCSV = () => {
    const headers = ['Invoice #', 'Date', 'Customer', 'Course', 'Amount', 'Commission', 'Net', 'Payment Method', 'Status', 'Transaction ID'];
    const rows = filteredOrders.map(order => {
      const commission = order.amount * (order.commission_percentage || 20) / 100;
      return [
        order.id.slice(0, 8).toUpperCase(),
        new Date(order.created_at).toLocaleDateString(),
        order.user_email || 'N/A',
        order.course.title,
        order.amount,
        commission,
        order.amount - commission,
        order.payment_method,
        order.status,
        order.payment_reference || ''
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
          <p className="text-muted-foreground mb-6">You need admin access to view this page.</p>
          <Button asChild><Link to="/">Go Home</Link></Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Receipt className="h-8 w-8" />
              All Invoices
            </h1>
            <p className="text-muted-foreground">View and manage all platform transactions</p>
          </div>
          <Button onClick={exportAllAsCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(stats.totalRevenue)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Platform Commission</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatPrice(stats.totalCommission)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completed Orders</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completedOrders}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pendingOrders}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by ID, course, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No invoices found matching your filters.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => {
                  const commission = order.amount * (order.commission_percentage || 20) / 100;
                  return (
                    <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetails(order)}>
                      <TableCell className="font-mono text-sm">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {order.user_email || 'N/A'}
                      </TableCell>
                      <TableCell className="font-medium max-w-[150px] truncate">
                        {order.course.title}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatPrice(order.amount)}
                      </TableCell>
                      <TableCell className="text-primary">
                        {formatPrice(commission)}
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadInvoice(order);
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </CardContent>
          </Card>
        )}

        {/* Invoice Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Invoice #{selectedOrder?.id.slice(0, 8).toUpperCase()}
              </DialogTitle>
              <DialogDescription>
                {selectedOrder && new Date(selectedOrder.created_at).toLocaleString()}
              </DialogDescription>
            </DialogHeader>
            
            {selectedOrder && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <h4 className="font-semibold">Customer</h4>
                  <p className="text-sm">{selectedOrder.user_email || 'N/A'}</p>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h4 className="font-semibold">Course Details</h4>
                  <div className="flex gap-4">
                    {selectedOrder.course.thumbnail_url ? (
                      <img 
                        src={selectedOrder.course.thumbnail_url} 
                        alt={selectedOrder.course.title}
                        className="w-20 h-14 object-cover rounded"
                      />
                    ) : (
                      <div className="w-20 h-14 bg-muted rounded flex items-center justify-center">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{selectedOrder.course.title}</p>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <CreditCard className="h-4 w-4" />
                      Payment Method
                    </span>
                    <span className="uppercase font-medium">{selectedOrder.payment_method}</span>
                  </div>
                  
                  {selectedOrder.payment_reference && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Transaction ID</span>
                      <span className="font-mono text-xs">{selectedOrder.payment_reference}</span>
                    </div>
                  )}
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(selectedOrder.amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Platform Commission ({selectedOrder.commission_percentage || 20}%)</span>
                    <span className="text-primary">{formatPrice(selectedOrder.amount * (selectedOrder.commission_percentage || 20) / 100)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Instructor Earnings</span>
                    <span>{formatPrice(selectedOrder.amount - (selectedOrder.amount * (selectedOrder.commission_percentage || 20) / 100))}</span>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(selectedOrder.amount)}</span>
                </div>
                
                <Button 
                  className="w-full" 
                  onClick={() => downloadInvoice(selectedOrder)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Invoice (PDF)
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default AdminInvoices;

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Separator } from '@/components/ui/separator';
import { FileText, Download, ArrowLeft, Receipt, Calendar, CreditCard } from 'lucide-react';
import jsPDF from 'jspdf';

interface Order {
  id: string;
  amount: number;
  payment_method: string;
  payment_reference: string | null;
  status: string;
  created_at: string;
  course: {
    id: string;
    title: string;
    thumbnail_url: string | null;
  };
}

const StudentInvoices = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        amount,
        payment_method,
        payment_reference,
        status,
        created_at,
        course:courses(id, title, thumbnail_url)
      `)
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const formattedOrders = data.map((order: any) => ({
        ...order,
        course: order.course || { id: '', title: 'Unknown Course', thumbnail_url: null }
      }));
      setOrders(formattedOrders);
    }
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

  const openDetails = (order: Order) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  };

  const downloadInvoice = (order: Order) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

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

    // Separator line
    doc.setDrawColor(200);
    doc.line(20, 75, pageWidth - 20, 75);

    // Course details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Course Details', 20, 90);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Course: ${order.course.title}`, 20, 102);
    doc.text(`Payment Method: ${order.payment_method.toUpperCase()}`, 20, 112);
    if (order.payment_reference) {
      doc.text(`Transaction ID: ${order.payment_reference}`, 20, 122);
    }

    // Amount section
    doc.setDrawColor(200);
    doc.line(20, 140, pageWidth - 20, 140);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Total Amount:', 20, 155);
    doc.text(formatPrice(order.amount), pageWidth - 20, 155, { align: 'right' });

    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Thank you for your purchase!', pageWidth / 2, 280, { align: 'center' });

    doc.save(`invoice-${order.id.slice(0, 8)}.pdf`);
  };

  if (!user) {
    return (
      <MainLayout>
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Please Sign In</h1>
          <p className="text-muted-foreground mb-6">You need to be signed in to view your invoices.</p>
          <Button asChild><Link to="/login">Sign In</Link></Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Receipt className="h-8 w-8" />
              My Invoices
            </h1>
            <p className="text-muted-foreground">View and download your purchase history</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No invoices found.</p>
              <Button asChild className="mt-4">
                <Link to="/catalog">Browse Courses</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetails(order)}>
                    <TableCell className="font-mono text-sm">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </TableCell>
                    <TableCell className="font-medium max-w-xs truncate">
                      {order.course.title}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatPrice(order.amount)}
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
                ))}
              </TableBody>
            </Table>
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
                      <Link 
                        to={`/learn/${selectedOrder.course.id}`}
                        className="text-sm text-primary hover:underline"
                      >
                        Go to Course →
                      </Link>
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
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Date
                    </span>
                    <span>{new Date(selectedOrder.created_at).toLocaleDateString()}</span>
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

export default StudentInvoices;

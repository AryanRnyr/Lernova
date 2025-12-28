import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Download, TrendingUp, Wallet, Calendar, Check, Clock, CreditCard, Settings } from 'lucide-react';
import jsPDF from 'jspdf';

interface PayoutRecord {
  id: string;
  amount: number;
  period_start: string;
  period_end: string;
  status: string;
  payment_method: string | null;
  payment_reference: string | null;
  created_at: string;
  processed_at: string | null;
}

interface EarningsData {
  totalRevenue: number;
  commissionPaid: number;
  netEarnings: number;
  totalPaidOut: number;
  pendingPayout: number;
  commissionPercentage: number;
}

const InstructorPayouts = () => {
  const { user } = useAuth();
  const { isInstructor, isAdmin, loading: roleLoading } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [earnings, setEarnings] = useState<EarningsData>({
    totalRevenue: 0,
    commissionPaid: 0,
    netEarnings: 0,
    totalPaidOut: 0,
    pendingPayout: 0,
    commissionPercentage: 20,
  });
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    if (user && (isInstructor() || isAdmin())) {
      fetchData();
    }
  }, [user, isInstructor, isAdmin, dateFrom, dateTo]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    // Fetch commission percentage
    const { data: settingsData } = await supabase
      .from('platform_settings')
      .select('setting_value')
      .eq('setting_key', 'commission_percentage')
      .single();

    const commissionPercentage = settingsData ? parseFloat(settingsData.setting_value) : 20;

    // Fetch orders for this instructor's courses
    const { data: ordersData } = await supabase
      .from('orders')
      .select('amount, commission_percentage, courses!inner(instructor_id)')
      .eq('status', 'completed')
      .eq('courses.instructor_id', user.id);

    // Calculate earnings using the commission at time of order
    let totalRevenue = 0;
    let commissionPaid = 0;

    ordersData?.forEach((order: any) => {
      const orderCommission = order.commission_percentage || commissionPercentage;
      totalRevenue += order.amount || 0;
      commissionPaid += (order.amount || 0) * (orderCommission / 100);
    });

    const netEarnings = totalRevenue - commissionPaid;

    // Fetch payout records
    const { data: payoutsData } = await supabase
      .from('instructor_payouts')
      .select('*')
      .eq('instructor_id', user.id)
      .order('created_at', { ascending: false });

    setPayouts((payoutsData as PayoutRecord[]) || []);

    const totalPaidOut = payoutsData
      ?.filter((p: any) => p.status === 'completed')
      .reduce((acc: number, p: any) => acc + (p.amount || 0), 0) || 0;

    setEarnings({
      totalRevenue,
      commissionPaid,
      netEarnings,
      totalPaidOut,
      pendingPayout: Math.max(0, netEarnings - totalPaidOut),
      commissionPercentage,
    });

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
        return (
          <Badge className="bg-green-100 text-green-800">
            <span className="flex items-center gap-1">
              <Check className="h-3 w-3" />
              Completed
            </span>
          </Badge>
        );
      case 'processing':
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Processing
            </span>
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Pending
            </span>
          </Badge>
        );
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredPayouts = statusFilter === 'all' 
    ? payouts 
    : payouts.filter(p => p.status === statusFilter);

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.text('My Earnings Report', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, 30, { align: 'center' });

    // Summary
    doc.setFontSize(14);
    doc.text('Earnings Summary', 20, 50);
    
    doc.setFontSize(11);
    doc.text(`Total Revenue (before commission): ${formatPrice(earnings.totalRevenue)}`, 20, 62);
    doc.text(`Platform Commission Paid: ${formatPrice(earnings.commissionPaid)}`, 20, 70);
    doc.text(`Net Earnings: ${formatPrice(earnings.netEarnings)}`, 20, 78);
    doc.text(`Total Paid Out: ${formatPrice(earnings.totalPaidOut)}`, 20, 86);
    doc.text(`Pending Payout: ${formatPrice(earnings.pendingPayout)}`, 20, 94);

    // Payout History Table
    if (filteredPayouts.length > 0) {
      doc.setFontSize(14);
      doc.text('Payout History', 20, 115);

      let y = 125;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Date', 20, y);
      doc.text('Period', 50, y);
      doc.text('Amount', 100, y);
      doc.text('Status', 140, y);
      doc.text('Reference', 165, y);

      doc.setFont('helvetica', 'normal');
      y += 8;

      filteredPayouts.forEach((payout) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(new Date(payout.created_at).toLocaleDateString(), 20, y);
        doc.text(`${payout.period_start} - ${payout.period_end}`, 50, y);
        doc.text(formatPrice(payout.amount), 100, y);
        doc.text(payout.status, 140, y);
        doc.text(payout.payment_reference || '-', 165, y);
        y += 7;
      });
    }

    // Footer
    doc.setFontSize(8);
    doc.text('Note: Commission is deducted based on the rate at the time of each sale.', 20, 285);

    doc.save(`my-earnings-${new Date().toISOString().split('T')[0]}.pdf`);
    toast({ title: 'PDF Downloaded' });
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

  if (!isInstructor() && !isAdmin()) {
    return (
      <MainLayout>
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">You need to be an instructor to access this page.</p>
          <Button asChild><Link to="/">Go Home</Link></Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Payouts</h1>
            <p className="text-muted-foreground">Track your earnings and payment history</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/instructor/settings">
                <Settings className="h-4 w-4 mr-2" />
                Payout Settings
              </Link>
            </Button>
            <Button onClick={generatePDF}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : (
          <>
            {/* Earnings Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatPrice(earnings.totalRevenue)}</div>
                  <p className="text-xs text-muted-foreground">Before commission</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Your Net Earnings</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{formatPrice(earnings.netEarnings)}</div>
                  <p className="text-xs text-muted-foreground">After {earnings.commissionPercentage}% commission</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Paid Out</CardTitle>
                  <Check className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatPrice(earnings.totalPaidOut)}</div>
                  <p className="text-xs text-muted-foreground">Received to date</p>
                </CardContent>
              </Card>
              <Card className={earnings.pendingPayout > 0 ? 'border-orange-200 bg-orange-50/50 dark:bg-orange-900/10' : ''}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Pending Payout</CardTitle>
                  <Wallet className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${earnings.pendingPayout > 0 ? 'text-orange-600' : ''}`}>
                    {formatPrice(earnings.pendingPayout)}
                  </div>
                  <p className="text-xs text-muted-foreground">Awaiting payment</p>
                </CardContent>
              </Card>
            </div>

            {/* Commission Info */}
            <Card className="mb-8">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-full">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">Current Platform Commission</p>
                      <p className="text-sm text-muted-foreground">Applied to all new sales</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-lg px-4 py-2">
                    {earnings.commissionPercentage}%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Payout History */}
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Payout History
                    </CardTitle>
                    <CardDescription>Your payment records from the platform</CardDescription>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {filteredPayouts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No payout records yet.</p>
                    <p className="text-sm mt-1">Your payments will appear here once processed by admin.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayouts.map((payout) => (
                        <TableRow key={payout.id}>
                          <TableCell className="font-medium">
                            {new Date(payout.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {payout.period_start} to {payout.period_end}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatPrice(payout.amount)}
                          </TableCell>
                          <TableCell>{getStatusBadge(payout.status)}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {payout.payment_reference || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default InstructorPayouts;

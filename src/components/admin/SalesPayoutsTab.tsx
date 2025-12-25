import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Download, Filter, CreditCard, Check, Search, ArrowUpDown, Calendar, DollarSign, TrendingUp, Wallet } from 'lucide-react';
import jsPDF from 'jspdf';

interface InstructorPayout {
  instructor_id: string;
  instructor_name: string;
  email: string;
  totalEarned: number;
  commissionPaid: number;
  netEarnings: number;
  paidOut: number;
  pending: number;
  payment_method: string | null;
  account_name: string | null;
  account_id: string | null;
}

interface PayoutRecord {
  id: string;
  instructor_id: string;
  amount: number;
  period_start: string;
  period_end: string;
  status: string;
  payment_reference: string | null;
  created_at: string;
  processed_at: string | null;
}

export const SalesPayoutsTab = () => {
  const [loading, setLoading] = useState(true);
  const [instructorPayouts, setInstructorPayouts] = useState<InstructorPayout[]>([]);
  const [filteredPayouts, setFilteredPayouts] = useState<InstructorPayout[]>([]);
  const [payoutRecords, setPayoutRecords] = useState<PayoutRecord[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [commissionEarned, setCommissionEarned] = useState(0);
  const [commissionPercentage, setCommissionPercentage] = useState(20);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInstructor, setSelectedInstructor] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [sortBy, setSortBy] = useState<'pending' | 'total' | 'name'>('pending');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Payment dialog
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedForPayment, setSelectedForPayment] = useState<InstructorPayout | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  // Payment method dialog
  const [paymentMethodDialogOpen, setPaymentMethodDialogOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<InstructorPayout | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [dateFrom, dateTo]);

  useEffect(() => {
    applyFilters();
  }, [instructorPayouts, searchQuery, selectedInstructor, sortBy, sortOrder]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch commission percentage
    const { data: settingsData } = await supabase
      .from('platform_settings')
      .select('setting_value')
      .eq('setting_key', 'commission_percentage')
      .single();

    const commission = settingsData ? parseFloat(settingsData.setting_value) : 20;
    setCommissionPercentage(commission);

    // Fetch orders within date range
    const { data: ordersData } = await supabase
      .from('orders')
      .select('amount, course_id, commission_percentage, created_at, courses(instructor_id)')
      .eq('status', 'completed')
      .gte('created_at', `${dateFrom}T00:00:00`)
      .lte('created_at', `${dateTo}T23:59:59`);

    // Fetch payout records
    const { data: payoutsData } = await supabase
      .from('instructor_payouts')
      .select('*')
      .order('created_at', { ascending: false });

    setPayoutRecords((payoutsData as PayoutRecord[]) || []);

    // Fetch all completed payouts for totals
    const { data: allPayoutsData } = await supabase
      .from('instructor_payouts')
      .select('instructor_id, amount')
      .eq('status', 'completed');

    // Calculate per-instructor earnings
    const instructorEarnings = new Map<string, { totalEarned: number; commissionPaid: number }>();
    
    ordersData?.forEach((order: any) => {
      const instructorId = order.courses?.instructor_id;
      if (instructorId) {
        const orderCommission = order.commission_percentage || commission;
        const existing = instructorEarnings.get(instructorId) || { totalEarned: 0, commissionPaid: 0 };
        existing.totalEarned += order.amount || 0;
        existing.commissionPaid += (order.amount || 0) * (orderCommission / 100);
        instructorEarnings.set(instructorId, existing);
      }
    });

    // Build instructor payouts list with all details
    const payoutsList: InstructorPayout[] = [];
    for (const [instructorId, data] of instructorEarnings) {
      // Get instructor profile and application details
      const [profileRes, applicationRes] = await Promise.all([
        supabase.rpc('get_instructor_profile', { instructor_user_id: instructorId }),
        supabase.from('instructor_applications').select('payment_method, account_name, account_id').eq('user_id', instructorId).single(),
      ]);

      const { data: emailData } = await supabase.rpc('get_all_users_with_emails');
      const userEmail = emailData?.find((u: any) => u.user_id === instructorId)?.email || '';

      const paidOut = allPayoutsData
        ?.filter((p: any) => p.instructor_id === instructorId)
        .reduce((acc: number, p: any) => acc + (p.amount || 0), 0) || 0;

      const netEarnings = data.totalEarned - data.commissionPaid;

      payoutsList.push({
        instructor_id: instructorId,
        instructor_name: profileRes.data?.[0]?.full_name || 'Unknown',
        email: userEmail,
        totalEarned: data.totalEarned,
        commissionPaid: data.commissionPaid,
        netEarnings,
        paidOut,
        pending: Math.max(0, netEarnings - paidOut),
        payment_method: applicationRes.data?.payment_method || null,
        account_name: applicationRes.data?.account_name || null,
        account_id: applicationRes.data?.account_id || null,
      });
    }

    setInstructorPayouts(payoutsList);
    
    const revenue = ordersData?.reduce((acc, o: any) => acc + (o.amount || 0), 0) || 0;
    setTotalRevenue(revenue);
    setCommissionEarned(payoutsList.reduce((acc, p) => acc + p.commissionPaid, 0));

    setLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...instructorPayouts];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.instructor_name.toLowerCase().includes(query) || 
        p.email.toLowerCase().includes(query)
      );
    }

    // Instructor filter
    if (selectedInstructor !== 'all') {
      filtered = filtered.filter(p => p.instructor_id === selectedInstructor);
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'pending') {
        comparison = a.pending - b.pending;
      } else if (sortBy === 'total') {
        comparison = a.totalEarned - b.totalEarned;
      } else if (sortBy === 'name') {
        comparison = a.instructor_name.localeCompare(b.instructor_name);
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    setFilteredPayouts(filtered);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ne-NP', {
      style: 'currency',
      currency: 'NPR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleMarkAsPaid = async () => {
    if (!selectedForPayment || !paymentAmount) return;

    setProcessingPayment(true);

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ variant: 'destructive', title: 'Invalid amount' });
      setProcessingPayment(false);
      return;
    }

    const { error } = await supabase.from('instructor_payouts').insert({
      instructor_id: selectedForPayment.instructor_id,
      amount,
      period_start: dateFrom,
      period_end: dateTo,
      status: 'completed',
      payment_method: selectedForPayment.payment_method,
      payment_reference: paymentReference || null,
      processed_at: new Date().toISOString(),
    });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      // Send notification to instructor
      await supabase.from('notifications').insert({
        user_id: selectedForPayment.instructor_id,
        title: 'Payment Received',
        message: `You have received a payout of ${formatPrice(amount)}. Reference: ${paymentReference || 'N/A'}`,
        type: 'success',
        notification_type: 'payout',
      });

      toast({ title: 'Payment recorded', description: 'Instructor has been notified.' });
      setPaymentDialogOpen(false);
      setSelectedForPayment(null);
      setPaymentAmount('');
      setPaymentReference('');
      fetchData();
    }

    setProcessingPayment(false);
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.text('Sales & Payouts Report', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Period: ${dateFrom} to ${dateTo}`, pageWidth / 2, 30, { align: 'center' });

    // Summary
    doc.setFontSize(14);
    doc.text('Summary', 20, 45);
    
    doc.setFontSize(11);
    doc.text(`Total Revenue: ${formatPrice(totalRevenue)}`, 20, 55);
    doc.text(`Platform Commission (${commissionPercentage}%): ${formatPrice(commissionEarned)}`, 20, 62);
    doc.text(`Total Pending Payouts: ${formatPrice(filteredPayouts.reduce((a, p) => a + p.pending, 0))}`, 20, 69);

    // Table header
    let y = 85;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Instructor', 20, y);
    doc.text('Total Sales', 70, y);
    doc.text('Commission', 100, y);
    doc.text('Net Earnings', 130, y);
    doc.text('Paid Out', 160, y);
    doc.text('Pending', 185, y);

    // Table data
    doc.setFont('helvetica', 'normal');
    y += 8;

    filteredPayouts.forEach((instructor) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(instructor.instructor_name.substring(0, 15), 20, y);
      doc.text(formatPrice(instructor.totalEarned), 70, y);
      doc.text(formatPrice(instructor.commissionPaid), 100, y);
      doc.text(formatPrice(instructor.netEarnings), 130, y);
      doc.text(formatPrice(instructor.paidOut), 160, y);
      doc.text(formatPrice(instructor.pending), 185, y);
      y += 7;
    });

    // Footer
    doc.setFontSize(8);
    doc.text(`Generated on ${new Date().toLocaleString()}`, 20, 285);

    doc.save(`sales-payouts-${dateFrom}-to-${dateTo}.pdf`);
    toast({ title: 'PDF Downloaded' });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">For selected period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Platform Commission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatPrice(commissionEarned)}</div>
            <p className="text-xs text-muted-foreground">{commissionPercentage}% of sales</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Pending Payouts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatPrice(instructorPayouts.reduce((a, p) => a + p.pending, 0))}
            </div>
            <p className="text-xs text-muted-foreground">To {instructorPayouts.filter(p => p.pending > 0).length} instructors</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Check className="h-4 w-4" />
              Total Paid Out
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(instructorPayouts.reduce((a, p) => a + p.paidOut, 0))}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search instructor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Instructor</Label>
              <Select value={selectedInstructor} onValueChange={setSelectedInstructor}>
                <SelectTrigger>
                  <SelectValue placeholder="All instructors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Instructors</SelectItem>
                  {instructorPayouts.map(p => (
                    <SelectItem key={p.instructor_id} value={p.instructor_id}>
                      {p.instructor_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Sort By</Label>
              <Select value={sortBy} onValueChange={(v: 'pending' | 'total' | 'name') => setSortBy(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending Amount</SelectItem>
                  <SelectItem value="total">Total Sales</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-between items-center mt-4">
            <Button variant="outline" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
              <ArrowUpDown className="h-4 w-4 mr-2" />
              {sortOrder === 'desc' ? 'Descending' : 'Ascending'}
            </Button>
            <Button onClick={generatePDF}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Instructor Payouts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Instructor Payouts</CardTitle>
          <CardDescription>
            Manage instructor payments. Commission is calculated based on the rate at time of each order.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredPayouts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No sales data for the selected period.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Instructor</TableHead>
                  <TableHead className="text-right">Total Sales</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead className="text-right">Net Earnings</TableHead>
                  <TableHead className="text-right">Paid Out</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayouts.map((instructor) => (
                  <TableRow key={instructor.instructor_id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{instructor.instructor_name}</p>
                        <p className="text-xs text-muted-foreground">{instructor.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{formatPrice(instructor.totalEarned)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatPrice(instructor.commissionPaid)}</TableCell>
                    <TableCell className="text-right">{formatPrice(instructor.netEarnings)}</TableCell>
                    <TableCell className="text-right text-green-600">{formatPrice(instructor.paidOut)}</TableCell>
                    <TableCell className="text-right">
                      {instructor.pending > 0 ? (
                        <Badge className="bg-orange-100 text-orange-800">{formatPrice(instructor.pending)}</Badge>
                      ) : (
                        <Badge variant="outline">Settled</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedPaymentMethod(instructor);
                            setPaymentMethodDialogOpen(true);
                          }}
                        >
                          <CreditCard className="h-4 w-4" />
                        </Button>
                        {instructor.pending > 0 && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedForPayment(instructor);
                              setPaymentAmount(instructor.pending.toString());
                              setPaymentDialogOpen(true);
                            }}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Pay
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

      {/* Payment Method Dialog */}
      <Dialog open={paymentMethodDialogOpen} onOpenChange={setPaymentMethodDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Method Details</DialogTitle>
            <DialogDescription>
              {selectedPaymentMethod?.instructor_name}'s payment information
            </DialogDescription>
          </DialogHeader>
          {selectedPaymentMethod ? (
            <div className="space-y-4 py-4">
              {selectedPaymentMethod.payment_method ? (
                <div className="space-y-3">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <Label className="text-muted-foreground">Payment Method</Label>
                    <p className="font-medium capitalize text-lg">{selectedPaymentMethod.payment_method}</p>
                  </div>
                  {selectedPaymentMethod.account_name && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <Label className="text-muted-foreground">Account Name</Label>
                      <p className="font-medium">{selectedPaymentMethod.account_name}</p>
                    </div>
                  )}
                  {selectedPaymentMethod.account_id && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <Label className="text-muted-foreground">Account ID / Number</Label>
                      <p className="font-medium font-mono">{selectedPaymentMethod.account_id}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No payment method configured by this instructor.</p>
                </div>
              )}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentMethodDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as Paid Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Mark payment as completed for {selectedForPayment?.instructor_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Pending Amount</p>
              <p className="text-xl font-bold">{selectedForPayment && formatPrice(selectedForPayment.pending)}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentAmount">Amount Paid (NPR)</Label>
              <Input
                id="paymentAmount"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentReference">Payment Reference (Optional)</Label>
              <Input
                id="paymentReference"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="e.g., Transaction ID"
              />
            </div>
            {selectedForPayment?.payment_method && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
                <p className="font-medium">Payment Method: <span className="capitalize">{selectedForPayment.payment_method}</span></p>
                {selectedForPayment.account_name && <p>Account: {selectedForPayment.account_name}</p>}
                {selectedForPayment.account_id && <p>ID: {selectedForPayment.account_id}</p>}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMarkAsPaid} disabled={processingPayment}>
              {processingPayment ? 'Processing...' : 'Confirm Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

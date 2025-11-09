import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Loader2, XCircle, BookOpen } from 'lucide-react';

const PaymentSuccess = () => {
  const { user, session } = useAuth();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');
  const [courseId, setCourseId] = useState<string | null>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      if (!user || !session) {
        setStatus('error');
        setMessage('Please sign in to verify payment');
        return;
      }

      const method = searchParams.get('method');
      
      try {
        let paymentData: any = {};

        if (method === 'esewa') {
          // eSewa returns data as base64 encoded string
          const data = searchParams.get('data');
          if (!data) {
            throw new Error('No payment data received');
          }
          paymentData = data;
        } else if (method === 'khalti') {
          // Khalti returns pidx and other params
          const pidx = searchParams.get('pidx');
          const transactionId = searchParams.get('transaction_id');
          const purchaseOrderId = searchParams.get('purchase_order_id');
          
          if (!pidx) {
            throw new Error('No payment reference received');
          }
          paymentData = { pidx, transactionId, purchaseOrderId };
        } else {
          throw new Error('Invalid payment method');
        }

        // Verify payment with backend
        const { data, error } = await supabase.functions.invoke('verify-payment', {
          body: {
            method,
            data: paymentData,
          },
        });

        if (error) throw error;

        if (data.success) {
          setStatus('success');
          setMessage('Payment verified successfully! You are now enrolled.');
          setCourseId(data.courseId);
        } else {
          throw new Error(data.error || 'Payment verification failed');
        }

      } catch (error: any) {
        console.error('Payment verification error:', error);
        setStatus('error');
        setMessage(error.message || 'Payment verification failed. Please contact support.');
      }
    };

    verifyPayment();
  }, [user, session, searchParams]);

  return (
    <MainLayout>
      <div className="container py-16 max-w-lg">
        <Card className="text-center">
          <CardHeader>
            {status === 'verifying' && (
              <>
                <Loader2 className="h-16 w-16 text-primary mx-auto mb-4 animate-spin" />
                <CardTitle>Verifying Payment</CardTitle>
                <CardDescription>Please wait while we verify your payment...</CardDescription>
              </>
            )}
            {status === 'success' && (
              <>
                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <CardTitle>Payment Successful!</CardTitle>
                <CardDescription>{message}</CardDescription>
              </>
            )}
            {status === 'error' && (
              <>
                <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
                <CardTitle>Payment Failed</CardTitle>
                <CardDescription className="text-destructive">{message}</CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent>
            {status === 'success' && (
              <div className="p-6 bg-muted rounded-lg">
                <BookOpen className="h-10 w-10 text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  You can now access your course from your dashboard
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex-col gap-3">
            {status === 'success' && (
              <>
                <Button asChild className="w-full">
                  <Link to="/dashboard">Go to Dashboard</Link>
                </Button>
                {courseId && (
                  <Button asChild variant="outline" className="w-full">
                    <Link to={`/learn/${courseId}`}>Start Learning</Link>
                  </Button>
                )}
              </>
            )}
            {status === 'error' && (
              <>
                <Button asChild className="w-full">
                  <Link to="/cart">Return to Cart</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/contact">Contact Support</Link>
                </Button>
              </>
            )}
          </CardFooter>
        </Card>
      </div>
    </MainLayout>
  );
};

export default PaymentSuccess;

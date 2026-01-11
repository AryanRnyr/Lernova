import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Loader2, XCircle, BookOpen } from 'lucide-react';

const PaymentSuccess = () => {
  const { user, session } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [hasVerified, setHasVerified] = useState(false);

  useEffect(() => {
    // Prevent multiple verification attempts
    if (hasVerified) return;
    
    const verifyPayment = async () => {
      if (!user || !session) {
        setStatus('error');
        setMessage('Please sign in to verify payment');
        return;
      }

      let method = searchParams.get('method');
      
      // Handle malformed URLs from payment gateways
      if (method && method.includes('?')) {
        method = method.split('?')[0];
      }
      
      // If method is not in URL, try to detect from payment data
      if (!method) {
        if (searchParams.get('data')) {
          method = 'esewa';
        } else if (searchParams.get('pidx')) {
          method = 'khalti';
        } else {
          method = sessionStorage.getItem('paymentMethod');
        }
      }

      if (method) {
        sessionStorage.setItem('paymentMethod', method);
      }
      
      try {
        if (!method) {
          throw new Error('Payment method not detected. Please try again.');
        }

        let paymentData: any = {};

        if (method === 'esewa') {
          let data = searchParams.get('data');
          
          // Handle malformed URL format
          if (!data) {
            const methodParam = searchParams.get('method');
            if (methodParam && methodParam.includes('?data=')) {
              const match = methodParam.match(/\?data=(.+)$/);
              if (match) {
                data = match[1];
              }
            }
          }
          
          if (!data) {
            throw new Error('No payment data received from eSewa');
          }
          paymentData = data;
        } else if (method === 'khalti') {
          let pidx = searchParams.get('pidx');
          const purchaseOrderId = searchParams.get('purchase_order_id');
          
          console.log('Khalti payment params:', { pidx, purchaseOrderId });
          
          // Try to get pidx from session storage if not in URL
          if (!pidx) {
            pidx = sessionStorage.getItem('khaltiPidx');
          }
          
          paymentData = { pidx, purchaseOrderId };
        } else {
          throw new Error(`Invalid payment method: ${method}`);
        }

        console.log('Verifying payment:', { method, paymentData });

        // Verify payment with backend
        const { data, error } = await supabase.functions.invoke('verify-payment', {
          body: {
            method,
            data: paymentData,
          },
        });

        console.log('Verification response:', { data, error });

        if (error) {
          if (error.context && error.context instanceof Response) {
            const errorText = await error.context.text();
            console.error('Error response:', errorText);
            try {
              const errorJson = JSON.parse(errorText);
              throw new Error(errorJson.error || error.message);
            } catch (e) {
              throw new Error(errorText || error.message);
            }
          }
          throw error;
        }

        if (data.success) {
          setStatus('success');
          setMessage(data.message || 'Payment verified successfully! You are now enrolled.');
          setCourseIds(data.courseIds || [data.courseId].filter(Boolean));
          setHasVerified(true);
          
          // Clear session storage
          sessionStorage.removeItem('paymentMethod');
          sessionStorage.removeItem('khaltiPidx');
          sessionStorage.removeItem('pendingCourses');
        } else {
          throw new Error(data.error || 'Payment verification failed');
        }

      } catch (error: any) {
        console.error('Payment verification error:', error);
        setHasVerified(true);
        
        // Check if the error is because order is already completed
        if (error.message?.includes('already') || error.message?.includes('completed')) {
          setStatus('success');
          setMessage('You are already enrolled in this course!');
          return;
        }
        
        setStatus('error');
        setMessage(error.message || 'Payment verification failed. Please contact support.');
        
        // Redirect to failure page after delay
        const failureMethod = method || sessionStorage.getItem('paymentMethod') || 'esewa';
        setTimeout(() => {
          navigate(`/payment/failure?method=${failureMethod}`);
        }, 3000);
      }
    };

    verifyPayment();
  }, [user, session, searchParams, navigate, hasVerified]);

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
                  {courseIds.length > 1 
                    ? `You are now enrolled in ${courseIds.length} courses!` 
                    : 'You can now access your course from your dashboard'}
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
                {courseIds.length === 1 && courseIds[0] && (
                  <Button asChild variant="outline" className="w-full">
                    <Link to={`/learn/${courseIds[0]}`}>Start Learning</Link>
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
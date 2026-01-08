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
  const [courseId, setCourseId] = useState<string | null>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      if (!user || !session) {
        setStatus('error');
        setMessage('Please sign in to verify payment');
        return;
      }

      let method = searchParams.get('method');
      
      // Handle malformed URLs from payment gateways
      // If method contains "?" like "esewa?data=...", extract just the method part
      if (method && method.includes('?')) {
        method = method.split('?')[0];
      }
      
      // If method is not in URL, try to detect from payment data
      if (!method) {
        // Check for eSewa data parameter
        if (searchParams.get('data')) {
          method = 'esewa';
        } 
        // Check for Khalti pidx parameter
        else if (searchParams.get('pidx')) {
          method = 'khalti';
        }
        // Try to get from sessionStorage
        else {
          method = sessionStorage.getItem('paymentMethod');
        }
      }

      // Store method for later use
      if (method) {
        sessionStorage.setItem('paymentMethod', method);
      }
      
      try {
        if (!method) {
          throw new Error('Payment method not detected. Please try again.');
        }

        let paymentData: any = {};

        if (method === 'esewa') {
          // eSewa returns data as base64 encoded string in URL parameter
          // Handle both ?data=... and ?method=esewa?data=... formats
          let data = searchParams.get('data');
          
          // If no data found, check if it's in the malformed URL format
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
          // Pass the base64 string directly - the backend will decode it
          paymentData = data;
        } else if (method === 'khalti') {
          // Khalti returns pidx and other params in URL
          let pidx = searchParams.get('pidx');
          const purchaseOrderId = searchParams.get('purchase_order_id');
          
          console.log('Khalti payment params from URL:', { 
            pidx,
            purchaseOrderId,
            allParams: Array.from(searchParams.entries()).reduce((acc, [key, val]) => ({ ...acc, [key]: val }), {})
          });
          
          // If pidx not found in URL, try to get it from session storage or use null
          // The backend will use the most recent pending order as fallback
          if (!pidx && !sessionStorage.getItem('khaltiPidx')) {
            console.warn('No pidx in URL, relying on order lookup by user and pending status');
            // We'll pass null and let the backend find the most recent pending order
            pidx = null;
          } else if (!pidx) {
            pidx = sessionStorage.getItem('khaltiPidx');
          }
          
          paymentData = { pidx, purchaseOrderId };
        } else {
          throw new Error(`Invalid payment method: ${method}`);
        }

        console.log('Payment data to verify:', { method, paymentData });

        // Verify payment with backend
        const { data, error } = await supabase.functions.invoke('verify-payment', {
          body: {
            method,
            data: paymentData,
          },
        });

        console.log('Backend response:', { data, error });

        if (error) {
          // Try to extract error details from the response
          if (error.context && error.context instanceof Response) {
            const errorText = await error.context.text();
            console.error('Error response text:', errorText);
            try {
              const errorJson = JSON.parse(errorText);
              console.error('Parsed error:', errorJson);
              throw new Error(errorJson.error || error.message);
            } catch (e) {
              throw new Error(errorText || error.message);
            }
          }
          throw error;
        }

        if (data.success) {
          setStatus('success');
          setMessage('Payment verified successfully! You are now enrolled.');
          setCourseId(data.courseId);
          // Clear session storage on success
          sessionStorage.removeItem('paymentMethod');
        } else {
          console.error('Backend error:', data.error);
          throw new Error(data.error || 'Payment verification failed');
        }

      } catch (error: any) {
        console.error('Payment verification error:', error);
        setStatus('error');
        setMessage(error.message || 'Payment verification failed. Please contact support.');
        
        // Redirect to failure page after a short delay
        const failureMethod = method || sessionStorage.getItem('paymentMethod') || 'esewa';
        setTimeout(() => {
          navigate(`/payment/failure?method=${failureMethod}`);
        }, 2000);
      }
    };

    verifyPayment();
  }, [user, session, searchParams, navigate]);

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

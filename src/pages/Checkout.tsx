import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/hooks/useCart';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ShoppingCart, Wallet, CreditCard, Loader2 } from 'lucide-react';

const Checkout = () => {
  const { user, session, loading: authLoading } = useAuth();
  const { items, loading, getTotal, refetch } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState<'esewa' | 'khalti'>('esewa');
  const [processing, setProcessing] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ne-NP', {
      style: 'currency',
      currency: 'NPR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handlePayment = async () => {
    if (!user || !session) {
      toast({
        variant: 'destructive',
        title: 'Please sign in',
        description: 'You need to sign in to complete checkout',
      });
      return;
    }

    if (items.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Cart is empty',
        description: 'Add courses to your cart before checkout',
      });
      return;
    }

    setProcessing(true);

    try {
      // Filter out items with valid courses
      const validItems = items.filter(item => item.course);
      
      if (validItems.length === 0) {
        throw new Error('No valid courses found in cart');
      }

      // Handle free courses - enroll directly
      const freeItems = validItems.filter(item => item.course?.is_free);
      const paidItems = validItems.filter(item => !item.course?.is_free);

      // Enroll in free courses directly
      for (const item of freeItems) {
        const { error: enrollError } = await supabase
          .from('enrollments')
          .insert({
            user_id: user.id,
            course_id: item.course!.id,
          });

        if (enrollError && !enrollError.message.includes('duplicate')) {
          console.error('Free enrollment error:', enrollError);
        }

        // Remove from cart
        await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', user.id)
          .eq('course_id', item.course!.id);
      }

      // If only free courses, redirect to dashboard
      if (paidItems.length === 0) {
        toast({
          title: 'Enrolled successfully!',
          description: `You are now enrolled in ${freeItems.length} course(s)`,
        });
        await refetch();
        navigate('/dashboard');
        return;
      }

      // Calculate total for paid items using current_price
      const totalAmount = paidItems.reduce((sum, item) => {
        const price = item.course?.current_price ?? item.course?.price ?? 0;
        return sum + price;
      }, 0);
      
      // Prepare course data for multi-course payment
      const courseData = paidItems.map(item => ({
        id: item.course!.id,
        title: item.course!.title,
        price: item.course!.current_price ?? item.course!.price ?? 0,
      }));

      // Paid courses - initiate payment
      const functionName = paymentMethod === 'esewa' 
        ? 'initiate-esewa-payment' 
        : 'initiate-khalti-payment';

      const origin = window.location.origin;
      const successUrl = `${origin}/payment/success`;
      const failureUrl = `${origin}/payment/failure`;

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          // For backwards compatibility, include single course fields
          courseId: courseData[0].id,
          amount: totalAmount,
          courseName: courseData.length > 1 
            ? `${courseData.length} Courses` 
            : courseData[0].title,
          // New multi-course fields
          courses: courseData,
          totalAmount,
          successUrl,
          failureUrl,
        },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Payment initiation failed');
      }

      // Store payment method and course info for recovery
      sessionStorage.setItem('paymentMethod', paymentMethod);
      sessionStorage.setItem('pendingCourses', JSON.stringify(courseData.map(c => c.id)));

      if (paymentMethod === 'esewa') {
        // Create and submit eSewa form
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = data.paymentUrl;

        Object.entries(data.formData).forEach(([key, value]) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = value as string;
          form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
      } else {
        // Store Khalti pidx for recovery if needed
        if (data.pidx) {
          sessionStorage.setItem('khaltiPidx', data.pidx);
        }
        // Redirect to Khalti payment page
        window.location.href = data.paymentUrl;
      }

    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        variant: 'destructive',
        title: 'Payment failed',
        description: error.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setProcessing(false);
    }
  };

  if (authLoading) {
    return (
      <MainLayout>
        <div className="container py-8">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="grid gap-8 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="container py-16 text-center">
          <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Please Sign In</h1>
          <p className="text-muted-foreground mb-6">
            Sign in to complete your purchase.
          </p>
          <Button asChild>
            <Link to="/login">Sign In</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <MainLayout>
        <div className="container py-16 text-center">
          <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
          <p className="text-muted-foreground mb-6">
            Add some courses to your cart to checkout.
          </p>
          <Button asChild>
            <Link to="/catalog">Browse Courses</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  const total = getTotal();

  return (
    <MainLayout>
      <div className="container py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>

        {loading ? (
          <div className="grid gap-8 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2">
            {/* Payment Method Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
                <CardDescription>
                  Choose your preferred payment method
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={(value) => setPaymentMethod(value as 'esewa' | 'khalti')}
                  className="space-y-4"
                >
                  <div className="flex items-center space-x-4 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="esewa" id="esewa" />
                    <Label htmlFor="esewa" className="flex items-center gap-3 cursor-pointer flex-1">
                      <div className="w-12 h-12 bg-[#60BB46] rounded-lg flex items-center justify-center">
                        <Wallet className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">eSewa</p>
                        <p className="text-sm text-muted-foreground">Pay with eSewa wallet</p>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-4 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="khalti" id="khalti" />
                    <Label htmlFor="khalti" className="flex items-center gap-3 cursor-pointer flex-1">
                      <div className="w-12 h-12 bg-[#5C2D91] rounded-lg flex items-center justify-center">
                        <CreditCard className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">Khalti</p>
                        <p className="text-sm text-muted-foreground">Pay with Khalti wallet</p>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
                <CardDescription>
                  {items.length} {items.length === 1 ? 'course' : 'courses'} in your cart
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span className="text-sm line-clamp-1 flex-1 mr-4">{item.course?.title}</span>
                    <span className="font-medium">
                      {item.course?.is_free ? 'Free' : formatPrice(item.course?.current_price ?? item.course?.price ?? 0)}
                    </span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-4">
                <Button 
                  className="w-full" 
                  size="lg" 
                  onClick={handlePayment}
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Pay ${formatPrice(total)}`
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  By completing this purchase, you agree to our Terms of Service
                </p>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Checkout;
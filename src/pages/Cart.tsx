import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingCart, Trash2, BookOpen } from 'lucide-react';

const Cart = () => {
  const { user, loading: authLoading } = useAuth();
  const { items, loading, removeFromCart, getTotal } = useCart();
  const navigate = useNavigate();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ne-NP', {
      style: 'currency',
      currency: 'NPR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleCheckout = () => {
    navigate('/checkout');
  };

  if (authLoading) {
    return (
      <MainLayout>
        <div className="container py-8">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="grid gap-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
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
            Sign in to view your cart and make purchases.
          </p>
          <Button asChild>
            <Link to="/login">Sign In</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  const total = getTotal();
  const hasItems = items.length > 0;

  return (
    <MainLayout>
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2 space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
            <Skeleton className="h-64" />
          </div>
        ) : !hasItems ? (
          <Card>
            <CardContent className="py-16 text-center">
              <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
              <p className="text-muted-foreground mb-6">
                Browse our courses and add some to your cart
              </p>
              <Button asChild>
                <Link to="/catalog">Browse Courses</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-8 md:grid-cols-3">
            {/* Cart Items */}
            <div className="md:col-span-2 space-y-4">
              <p className="text-muted-foreground mb-4">
                {items.length} {items.length === 1 ? 'Course' : 'Courses'} in Cart
              </p>
              {items.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="w-32 h-20 bg-muted rounded overflow-hidden flex-shrink-0">
                        {item.course?.thumbnail_url ? (
                          <img
                            src={item.course.thumbnail_url}
                            alt={item.course.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link 
                          to={`/course/${item.course?.slug}`}
                          className="font-semibold hover:text-primary line-clamp-2"
                        >
                          {item.course?.title}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {item.course?.instructor?.full_name || 'Unknown Instructor'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="font-bold text-lg">
                          {item.course?.is_free ? 'Free' : formatPrice(item.course?.price || 0)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCart(item.course_id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <div>
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" size="lg" onClick={handleCheckout}>
                    Proceed to Checkout
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Cart;

import { Link, useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle, RefreshCw, HelpCircle } from 'lucide-react';

const PaymentFailure = () => {
  const [searchParams] = useSearchParams();
  const method = searchParams.get('method');

  return (
    <MainLayout>
      <div className="container py-16 max-w-lg">
        <Card className="text-center">
          <CardHeader>
            <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <CardTitle>Payment Failed</CardTitle>
            <CardDescription>
              Your payment could not be processed. Don't worry, no charges were made.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-6 bg-muted rounded-lg space-y-3">
              <p className="text-sm text-muted-foreground">
                This could happen due to:
              </p>
              <ul className="text-sm text-muted-foreground text-left list-disc list-inside space-y-1">
                <li>Insufficient balance in your {method === 'esewa' ? 'eSewa' : 'Khalti'} wallet</li>
                <li>Transaction was cancelled</li>
                <li>Session timeout during payment</li>
                <li>Network connectivity issues</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button asChild className="w-full">
              <Link to="/checkout">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/cart">Return to Cart</Link>
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link to="/contact">
                <HelpCircle className="mr-2 h-4 w-4" />
                Need Help?
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </MainLayout>
  );
};

export default PaymentFailure;

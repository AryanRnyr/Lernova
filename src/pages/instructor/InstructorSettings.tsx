import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Save, Settings, ArrowLeft } from 'lucide-react';

const InstructorSettings = () => {
  const { user } = useAuth();
  const { isInstructor, isAdmin, loading: roleLoading } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountId, setAccountId] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (user && !roleLoading && (isInstructor() || isAdmin())) {
      fetchSettings();
    }
  }, [user, roleLoading]);

  const fetchSettings = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('instructor_applications')
      .select('payment_method, account_name, account_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setPaymentMethod(data.payment_method || '');
      setAccountName(data.account_name || '');
      setAccountId(data.account_id || '');
    }

    setLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);

    const { error } = await supabase
      .from('instructor_applications')
      .update({
        payment_method: paymentMethod || null,
        account_name: accountName || null,
        account_id: accountId || null,
      })
      .eq('user_id', user.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Settings saved', description: 'Your payout details have been updated.' });
    }

    setSaving(false);
  };

  if (roleLoading) {
    return (
      <MainLayout>
        <div className="container py-8 max-w-2xl">
          <Skeleton className="h-8 w-64 mb-8" />
          <Skeleton className="h-64 w-full" />
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
      <div className="container py-8 max-w-2xl">
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/instructor/payouts">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Payouts
          </Link>
        </Button>

        <div className="flex items-center gap-3 mb-8">
          <Settings className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">Payout Settings</h1>
            <p className="text-muted-foreground">Configure how you receive payments</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Details
            </CardTitle>
            <CardDescription>
              Update your payment information for receiving payouts from the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="esewa">eSewa</SelectItem>
                      <SelectItem value="khalti">Khalti</SelectItem>
                      <SelectItem value="bank">Bank Transfer</SelectItem>
                      <SelectItem value="fonepay">FonePay</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose how you'd like to receive your earnings
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountName">Account Holder Name</Label>
                  <Input
                    id="accountName"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Enter the name on your account"
                  />
                  <p className="text-xs text-muted-foreground">
                    The name registered with your payment account
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountId">
                    {paymentMethod === 'bank' ? 'Bank Account Number' : 'Account ID / Phone Number'}
                  </Label>
                  <Input
                    id="accountId"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    placeholder={paymentMethod === 'bank' ? 'Enter bank account number' : 'Enter phone number or ID'}
                  />
                  <p className="text-xs text-muted-foreground">
                    {paymentMethod === 'bank' 
                      ? 'Your bank account number for receiving transfers'
                      : 'The phone number or ID linked to your wallet'}
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
                    {saving ? 'Saving...' : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Note:</strong> Make sure your payment details are accurate. The admin will use this information to process your payouts. Changes to payment details will be applied to future payouts only.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default InstructorSettings;

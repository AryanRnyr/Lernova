import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, Percent, Save } from 'lucide-react';

const AdminSettings = () => {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [commission, setCommission] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isAdmin() && !roleLoading) {
      fetchSettings();
    }
  }, [isAdmin, roleLoading]);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('platform_settings')
      .select('*')
      .eq('setting_key', 'commission_percentage')
      .single();

    if (data) {
      setCommission(data.setting_value);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    const numValue = parseFloat(commission);
    if (isNaN(numValue) || numValue < 0 || numValue > 100) {
      toast({ variant: 'destructive', title: 'Invalid value', description: 'Commission must be between 0 and 100' });
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from('platform_settings')
      .update({ setting_value: commission })
      .eq('setting_key', 'commission_percentage');

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      // Notify all instructors about commission change
      const { data: instructors } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'instructor')
        .eq('is_approved', true);

      if (instructors && instructors.length > 0) {
        const notifications = instructors.map((i) => ({
          user_id: i.user_id,
          title: 'Commission Rate Updated',
          message: `The platform commission rate has been updated to ${commission}%. This will apply to all future earnings.`,
          type: 'info',
          notification_type: 'commission_update',
        }));

        await supabase.from('notifications').insert(notifications);
      }

      toast({ title: 'Settings saved', description: 'All instructors have been notified of the change.' });
    }

    setSaving(false);
  };

  if (roleLoading) {
    return (
      <MainLayout>
        <div className="container py-8">
          <Skeleton className="h-8 w-64 mb-8" />
          <Skeleton className="h-48 w-full max-w-md" />
        </div>
      </MainLayout>
    );
  }

  if (!isAdmin()) {
    return (
      <MainLayout>
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">You need admin privileges to access this page.</p>
          <Button asChild><Link to="/">Go Home</Link></Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8 max-w-2xl">
        <div className="flex items-center gap-3 mb-8">
          <Settings className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">Platform Settings</h1>
            <p className="text-muted-foreground">Configure platform-wide settings</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Commission Settings
            </CardTitle>
            <CardDescription>
              Set the platform commission percentage that will be deducted from instructor earnings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <Skeleton className="h-10 w-32" />
            ) : (
              <>
                <div className="flex items-end gap-4">
                  <div className="space-y-2 flex-1 max-w-xs">
                    <Label htmlFor="commission">Commission Percentage</Label>
                    <div className="relative">
                      <Input
                        id="commission"
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={commission}
                        onChange={(e) => setCommission(e.target.value)}
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This percentage will be deducted from each course sale
                    </p>
                  </div>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : <><Save className="h-4 w-4 mr-2" /> Save Changes</>}
                  </Button>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg mt-6">
                  <p className="text-sm text-muted-foreground">
                    <strong>Note:</strong> When you update the commission percentage, all approved instructors will receive a notification about the change.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="mt-6">
          <Button variant="outline" asChild>
            <Link to="/admin">← Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default AdminSettings;

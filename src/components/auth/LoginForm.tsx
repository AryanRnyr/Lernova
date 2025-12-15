import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, AlertTriangle } from 'lucide-react';

export const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [rejectionMessage, setRejectionMessage] = useState<string | null>(null);
  const { signIn, signOut, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Handle role-based redirect after login
  useEffect(() => {
    const handleRoleRedirect = async () => {
      if (!user || redirecting) return;
      
      setRedirecting(true);
      
      // Fetch user roles with approval status
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role, is_approved')
        .eq('user_id', user.id);
      
      const userRoles = roles || [];
      const approvedRoles = userRoles.filter(r => r.is_approved).map(r => r.role);
      
      // Check if instructor was rejected (has instructor role but not approved)
      const hasUnapprovedInstructor = userRoles.some(
        r => r.role === 'instructor' && !r.is_approved
      );
      
      if (hasUnapprovedInstructor && !approvedRoles.includes('admin')) {
        // Show rejection message and sign out
        setRejectionMessage('Your instructor application is pending approval or has been rejected. Please contact support for more information.');
        await signOut();
        setRedirecting(false);
        return;
      }
      
      // Redirect based on role priority: admin > instructor > student
      if (approvedRoles.includes('admin')) {
        navigate('/admin');
      } else if (approvedRoles.includes('instructor')) {
        navigate('/instructor');
      } else {
        navigate('/dashboard');
      }
    };

    handleRoleRedirect();
  }, [user, navigate, redirecting, signOut]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: error.message,
      });
      setLoading(false);
    } else {
      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.',
      });
      // Redirect is handled by useEffect when user state updates
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Welcome back</CardTitle>
        <CardDescription className="text-center">
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {rejectionMessage && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Access Denied</AlertTitle>
              <AlertDescription>{rejectionMessage}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                to="/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign In
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
};

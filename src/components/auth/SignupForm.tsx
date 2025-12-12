import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, User, GraduationCap, BookOpen, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type SignupStep = 'details' | 'otp';

export const SignupForm = () => {
  const [step, setStep] = useState<SignupStep>('details');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'student' | 'instructor'>('student');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const sendOTP = async () => {
    try {
      const { error } = await supabase.functions.invoke('send-otp', {
        body: { email, fullName },
      });

      if (error) throw error;

      toast({
        title: 'Verification code sent!',
        description: 'Please check your email for the 6-digit code.',
      });
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      throw error;
    }
  };

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Passwords do not match',
        description: 'Please make sure your passwords match.',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Password too short',
        description: 'Password must be at least 6 characters long.',
      });
      return;
    }

    setLoading(true);

    try {
      await sendOTP();
      setStep('otp');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to send verification code',
        description: error.message || 'Please try again.',
      });
    }

    setLoading(false);
  };

  const handleResendOTP = async () => {
    setResendLoading(true);
    try {
      await sendOTP();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to resend code',
        description: error.message || 'Please try again.',
      });
    }
    setResendLoading(false);
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      toast({
        variant: 'destructive',
        title: 'Invalid code',
        description: 'Please enter the complete 6-digit code.',
      });
      return;
    }

    setLoading(true);

    try {
      // Verify OTP
      const { data, error: verifyError } = await supabase.functions.invoke('verify-otp', {
        body: { email, otp },
      });

      if (verifyError || !data?.success) {
        throw new Error(data?.error || verifyError?.message || 'Invalid verification code');
      }

      // OTP verified, now create the account
      const { error: signUpError } = await signUp(email, password, fullName, role);

      if (signUpError) {
        throw signUpError;
      }

      toast({
        title: 'Account created!',
        description: role === 'instructor' 
          ? 'Your instructor account is pending approval. You can log in but cannot create courses until approved.'
          : 'Welcome to Lernova! You can now log in.',
      });
      navigate('/login');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Verification failed',
        description: error.message || 'Please try again.',
      });
    }

    setLoading(false);
  };

  if (step === 'otp') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-fit -ml-2 mb-2"
            onClick={() => setStep('details')}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <CardTitle className="text-2xl font-bold text-center">Verify your email</CardTitle>
          <CardDescription className="text-center">
            We've sent a 6-digit verification code to <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={setOtp}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          <p className="text-sm text-center text-muted-foreground">
            Didn't receive the code?{' '}
            <Button
              variant="link"
              className="p-0 h-auto"
              onClick={handleResendOTP}
              disabled={resendLoading}
            >
              {resendLoading ? 'Sending...' : 'Resend code'}
            </Button>
          </p>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            onClick={handleVerifyOTP}
            disabled={loading || otp.length !== 6}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify & Create Account
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Create an account</CardTitle>
        <CardDescription className="text-center">
          Start your learning journey with Lernova
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleDetailsSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label>I want to join as</Label>
            <RadioGroup
              value={role}
              onValueChange={(value) => setRole(value as 'student' | 'instructor')}
              className="grid grid-cols-2 gap-4"
            >
              <div>
                <RadioGroupItem
                  value="student"
                  id="student"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="student"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <GraduationCap className="mb-2 h-6 w-6" />
                  <span className="font-medium">Student</span>
                  <span className="text-xs text-muted-foreground">Learn new skills</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value="instructor"
                  id="instructor"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="instructor"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <BookOpen className="mb-2 h-6 w-6" />
                  <span className="font-medium">Instructor</span>
                  <span className="text-xs text-muted-foreground">Teach & earn</span>
                </Label>
              </div>
            </RadioGroup>
            {role === 'instructor' && (
              <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
                ℹ️ Instructor accounts require admin approval before you can create courses.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>
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
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continue
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
};

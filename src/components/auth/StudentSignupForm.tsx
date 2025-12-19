import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, User, Phone, Calendar, ArrowLeft, Image } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type SignupStep = 'details' | 'otp';

interface StudentSignupFormProps {
  onBack: () => void;
}

export const StudentSignupForm = ({ onBack }: StudentSignupFormProps) => {
  const [step, setStep] = useState<SignupStep>('details');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ variant: 'destructive', title: 'File too large', description: 'Maximum 5MB allowed' });
        return;
      }
      setProfileImage(file);
      setProfileImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadProfileImage = async (userId: string) => {
    if (!profileImage) return null;
    
    const fileExt = profileImage.name.split('.').pop();
    const fileName = `${userId}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('profile-images')
      .upload(fileName, profileImage, { upsert: true });

    if (error) {
      console.error('Error uploading image:', error);
      return null;
    }

    const { data } = supabase.storage.from('profile-images').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const sendOTP = async () => {
    const { error } = await supabase.functions.invoke('send-otp', {
      body: { email, fullName },
    });
    if (error) throw error;
    toast({
      title: 'Verification code sent!',
      description: 'Please check your email for the 6-digit code.',
    });
  };

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Passwords do not match' });
      return;
    }

    if (password.length < 6) {
      toast({ variant: 'destructive', title: 'Password must be at least 6 characters' });
      return;
    }

    setLoading(true);
    try {
      await sendOTP();
      setStep('otp');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed to send verification code', description: error.message });
    }
    setLoading(false);
  };

  const handleResendOTP = async () => {
    setResendLoading(true);
    try {
      await sendOTP();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed to resend code', description: error.message });
    }
    setResendLoading(false);
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      toast({ variant: 'destructive', title: 'Invalid code', description: 'Enter the complete 6-digit code.' });
      return;
    }

    setLoading(true);
    try {
      const { data, error: verifyError } = await supabase.functions.invoke('verify-otp', {
        body: { email, otp },
      });

      if (verifyError || !data?.success) {
        throw new Error(data?.error || 'Invalid verification code');
      }

      const { error: signUpError } = await signUp(email, password, fullName, 'student');
      if (signUpError) throw signUpError;

      // Get the newly created user and update profile
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        let avatarUrl = null;
        if (profileImage) {
          avatarUrl = await uploadProfileImage(authData.user.id);
        }

        await supabase.from('profiles').update({
          phone_number: phoneNumber || null,
          date_of_birth: dateOfBirth || null,
          avatar_url: avatarUrl,
        }).eq('user_id', authData.user.id);
      }

      toast({ title: 'Account created!', description: 'Welcome to Lernova!' });
      navigate('/login');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Verification failed', description: error.message });
    }
    setLoading(false);
  };

  if (step === 'otp') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <Button variant="ghost" size="sm" className="w-fit -ml-2 mb-2" onClick={() => setStep('details')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <CardTitle className="text-2xl font-bold text-center">Verify your email</CardTitle>
          <CardDescription className="text-center">
            We've sent a 6-digit code to <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={otp} onChange={setOtp}>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <p className="text-sm text-center text-muted-foreground">
            Didn't receive the code?{' '}
            <Button variant="link" className="p-0 h-auto" onClick={handleResendOTP} disabled={resendLoading}>
              {resendLoading ? 'Sending...' : 'Resend code'}
            </Button>
          </p>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={handleVerifyOTP} disabled={loading || otp.length !== 6}>
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
        <Button variant="ghost" size="sm" className="w-fit -ml-2 mb-2" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <CardTitle className="text-2xl font-bold text-center">Student Registration</CardTitle>
        <CardDescription className="text-center">Create your student account</CardDescription>
      </CardHeader>
      <form onSubmit={handleDetailsSubmit}>
        <CardContent className="space-y-4">
          {/* Profile Image */}
          <div className="flex flex-col items-center space-y-2">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profileImagePreview} />
              <AvatarFallback><Image className="h-8 w-8 text-muted-foreground" /></AvatarFallback>
            </Avatar>
            <Label htmlFor="profile-image" className="cursor-pointer text-sm text-primary hover:underline">
              Upload Profile Photo
            </Label>
            <Input id="profile-image" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input id="fullName" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input id="email" type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="phone" type="tel" placeholder="98XXXXXXXX" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="pl-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="dob" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="pl-10" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input id="password" type="password" placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input id="confirmPassword" type="password" placeholder="Confirm your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10" required />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continue
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
};

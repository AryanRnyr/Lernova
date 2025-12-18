import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, User, Phone, ArrowLeft, Image, Upload, Briefcase, GraduationCap, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CloudinaryUpload } from '@/components/ui/cloudinary-upload';

type SignupStep = 'basic' | 'professional' | 'payout' | 'otp';

interface InstructorSignupFormProps {
  onBack: () => void;
}

export const InstructorSignupForm = ({ onBack }: InstructorSignupFormProps) => {
  const [step, setStep] = useState<SignupStep>('basic');
  
  // Basic info
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState('');
  
  // Professional info
  const [bio, setBio] = useState('');
  const [highestQualification, setHighestQualification] = useState('');
  const [fieldOfExpertise, setFieldOfExpertise] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [currentOccupation, setCurrentOccupation] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  
  // Payout info
  const [paymentMethod, setPaymentMethod] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountId, setAccountId] = useState('');
  const [confirmDetails, setConfirmDetails] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  
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
    const { error } = await supabase.storage.from('profile-images').upload(fileName, profileImage, { upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from('profile-images').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const sendOTP = async () => {
    const { error } = await supabase.functions.invoke('send-otp', { body: { email, fullName } });
    if (error) throw error;
    toast({ title: 'Verification code sent!', description: 'Check your email for the 6-digit code.' });
  };

  const handleBasicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Passwords do not match' });
      return;
    }
    if (password.length < 6) {
      toast({ variant: 'destructive', title: 'Password must be at least 6 characters' });
      return;
    }
    setStep('professional');
  };

  const handleProfessionalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bio || !highestQualification || !fieldOfExpertise) {
      toast({ variant: 'destructive', title: 'Please fill all required fields' });
      return;
    }
    setStep('payout');
  };

  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmDetails || !agreeToTerms) {
      toast({ variant: 'destructive', title: 'Please confirm all checkboxes' });
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
      const { data, error: verifyError } = await supabase.functions.invoke('verify-otp', { body: { email, otp } });
      if (verifyError || !data?.success) throw new Error(data?.error || 'Invalid verification code');

      const { error: signUpError } = await signUp(email, password, fullName, 'instructor');
      if (signUpError) throw signUpError;

      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        let avatarUrl = null;
        if (profileImage) {
          avatarUrl = await uploadProfileImage(authData.user.id);
        }

        // Update profile
        await supabase.from('profiles').update({
          phone_number: phoneNumber || null,
          avatar_url: avatarUrl,
          bio: bio,
        }).eq('user_id', authData.user.id);

        // Create instructor application
        await supabase.from('instructor_applications').insert({
          user_id: authData.user.id,
          bio,
          highest_qualification: highestQualification,
          field_of_expertise: fieldOfExpertise,
          years_of_experience: parseInt(yearsOfExperience) || null,
          current_occupation: currentOccupation,
          resume_url: resumeUrl || null,
          payment_method: paymentMethod || null,
          account_name: accountName || null,
          account_id: accountId || null,
        });
      }

      toast({
        title: 'Application submitted!',
        description: 'Your instructor account is pending approval. You\'ll receive an email once reviewed.',
      });
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
          <Button variant="ghost" size="sm" className="w-fit -ml-2 mb-2" onClick={() => setStep('payout')}>
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
                {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
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
            Verify & Submit Application
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (step === 'payout') {
    return (
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1">
          <Button variant="ghost" size="sm" className="w-fit -ml-2 mb-2" onClick={() => setStep('professional')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <CardTitle className="text-2xl font-bold text-center">Payout Details</CardTitle>
          <CardDescription className="text-center">Step 3 of 3 - Optional (can be filled later)</CardDescription>
        </CardHeader>
        <form onSubmit={handlePayoutSubmit}>
          <CardContent className="space-y-4">
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
                </SelectContent>
              </Select>
            </div>

            {paymentMethod && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="accountName">Account Name</Label>
                  <Input id="accountName" placeholder="Name as per account" value={accountName} onChange={(e) => setAccountName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountId">{paymentMethod === 'bank' ? 'Account Number' : 'Phone Number / ID'}</Label>
                  <Input id="accountId" placeholder="Enter account identifier" value={accountId} onChange={(e) => setAccountId(e.target.value)} />
                </div>
              </>
            )}

            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center space-x-2">
                <Checkbox id="confirmDetails" checked={confirmDetails} onCheckedChange={(c) => setConfirmDetails(c as boolean)} />
                <Label htmlFor="confirmDetails" className="text-sm">I confirm all details are correct</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="agreeTerms" checked={agreeToTerms} onCheckedChange={(c) => setAgreeToTerms(c as boolean)} />
                <Label htmlFor="agreeTerms" className="text-sm">I agree to platform policies & revenue sharing</Label>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading || !confirmDetails || !agreeToTerms}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continue to Verification
            </Button>
          </CardFooter>
        </form>
      </Card>
    );
  }

  if (step === 'professional') {
    return (
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1">
          <Button variant="ghost" size="sm" className="w-fit -ml-2 mb-2" onClick={() => setStep('basic')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <CardTitle className="text-2xl font-bold text-center">Professional Background</CardTitle>
          <CardDescription className="text-center">Step 2 of 3 - Tell us about your expertise</CardDescription>
        </CardHeader>
        <form onSubmit={handleProfessionalSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bio">Short Bio / About Me *</Label>
              <Textarea id="bio" placeholder="Tell us about yourself (2-4 lines)" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="qualification">Highest Qualification *</Label>
                <Select value={highestQualification} onValueChange={setHighestQualification}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high_school">High School</SelectItem>
                    <SelectItem value="bachelor">Bachelor's Degree</SelectItem>
                    <SelectItem value="master">Master's Degree</SelectItem>
                    <SelectItem value="phd">PhD</SelectItem>
                    <SelectItem value="certification">Professional Certification</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="experience">Years of Experience</Label>
                <Select value={yearsOfExperience} onValueChange={setYearsOfExperience}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Less than 1 year</SelectItem>
                    <SelectItem value="1">1-2 years</SelectItem>
                    <SelectItem value="3">3-5 years</SelectItem>
                    <SelectItem value="5">5-10 years</SelectItem>
                    <SelectItem value="10">10+ years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expertise">Field / Subject Expertise *</Label>
              <Input id="expertise" placeholder="e.g., Web Development, Data Science" value={fieldOfExpertise} onChange={(e) => setFieldOfExpertise(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="occupation">Current Occupation</Label>
              <Select value={currentOccupation} onValueChange={setCurrentOccupation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="freelancer">Freelancer</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="professional">Working Professional</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Resume / CV (PDF) - Optional</Label>
              <CloudinaryUpload type="image" value={resumeUrl} onChange={setResumeUrl} accept=".pdf,.doc,.docx" label="" />
              <p className="text-xs text-muted-foreground">Upload your resume or CV for review</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full">Continue to Payout Details</Button>
          </CardFooter>
        </form>
      </Card>
    );
  }

  // Step: basic
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <Button variant="ghost" size="sm" className="w-fit -ml-2 mb-2" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <CardTitle className="text-2xl font-bold text-center">Instructor Registration</CardTitle>
        <CardDescription className="text-center">Step 1 of 3 - Basic Information</CardDescription>
      </CardHeader>
      <form onSubmit={handleBasicSubmit}>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center space-y-2">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profileImagePreview} />
              <AvatarFallback><Image className="h-8 w-8 text-muted-foreground" /></AvatarFallback>
            </Avatar>
            <Label htmlFor="profile-image-instructor" className="cursor-pointer text-sm text-primary hover:underline">
              Upload Profile Photo *
            </Label>
            <Input id="profile-image-instructor" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input id="fullName" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input id="email" type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input id="phone" type="tel" placeholder="98XXXXXXXX" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="pl-10" required />
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

          <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
            ℹ️ Instructor accounts require admin approval before you can create courses.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full">Continue to Professional Details</Button>
          <p className="text-sm text-center text-muted-foreground">
            Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
};

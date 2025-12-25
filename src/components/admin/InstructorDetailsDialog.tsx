import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { User, Mail, Phone, Briefcase, GraduationCap, FileText, Calendar, Check, X } from 'lucide-react';

interface InstructorDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string | null;
  userEmail: string;
  isPending?: boolean;
  onApprove?: (userId: string, email: string, name: string | null) => void;
  onReject?: (userId: string, email: string, name: string | null) => void;
}

interface InstructorApplication {
  bio: string | null;
  highest_qualification: string | null;
  field_of_expertise: string | null;
  years_of_experience: number | null;
  current_occupation: string | null;
  resume_url: string | null;
  payment_method: string | null;
  account_name: string | null;
  account_id: string | null;
  created_at: string;
}

interface Profile {
  avatar_url: string | null;
  phone_number: string | null;
  bio: string | null;
}

const qualificationLabels: Record<string, string> = {
  high_school: 'High School',
  bachelor: "Bachelor's Degree",
  master: "Master's Degree",
  phd: 'PhD',
  certification: 'Professional Certification',
};

const occupationLabels: Record<string, string> = {
  student: 'Student',
  freelancer: 'Freelancer',
  teacher: 'Teacher',
  professional: 'Working Professional',
  other: 'Other',
};

export const InstructorDetailsDialog = ({
  open,
  onOpenChange,
  userId,
  userName,
  userEmail,
  isPending = false,
  onApprove,
  onReject,
}: InstructorDetailsDialogProps) => {
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<InstructorApplication | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (open && userId) {
      fetchDetails();
    }
  }, [open, userId]);

  const fetchDetails = async () => {
    setLoading(true);

    const [applicationRes, profileRes] = await Promise.all([
      supabase.from('instructor_applications').select('*').eq('user_id', userId).single(),
      supabase.from('profiles').select('avatar_url, phone_number, bio').eq('user_id', userId).single(),
    ]);

    setApplication(applicationRes.data);
    setProfile(profileRes.data);
    setLoading(false);
  };

  const handleApprove = () => {
    if (onApprove) {
      onApprove(userId, userEmail, userName);
      onOpenChange(false);
    }
  };

  const handleReject = () => {
    if (onReject) {
      onReject(userId, userEmail, userName);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Instructor Application Details</DialogTitle>
          <DialogDescription>Review the instructor's profile and qualifications</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header with profile info */}
            <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback><User className="h-8 w-8" /></AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{userName || 'Unnamed User'}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <Mail className="h-4 w-4" />
                  {userEmail}
                </div>
                {profile?.phone_number && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Phone className="h-4 w-4" />
                    {profile.phone_number}
                  </div>
                )}
              </div>
              {application && (
                <Badge variant="outline">
                  <Calendar className="h-3 w-3 mr-1" />
                  Applied {new Date(application.created_at).toLocaleDateString()}
                </Badge>
              )}
            </div>

            {application ? (
              <div className="grid gap-6">
                {/* Bio */}
                {application.bio && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <User className="h-4 w-4" /> About
                    </h4>
                    <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                      {application.bio}
                    </p>
                  </div>
                )}

                {/* Qualifications */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 text-sm font-medium mb-1">
                      <GraduationCap className="h-4 w-4" /> Highest Qualification
                    </div>
                    <p className="text-muted-foreground">
                      {application.highest_qualification
                        ? qualificationLabels[application.highest_qualification] || application.highest_qualification
                        : 'Not specified'}
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 text-sm font-medium mb-1">
                      <Briefcase className="h-4 w-4" /> Current Occupation
                    </div>
                    <p className="text-muted-foreground">
                      {application.current_occupation
                        ? occupationLabels[application.current_occupation] || application.current_occupation
                        : 'Not specified'}
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 text-sm font-medium mb-1">
                      Field of Expertise
                    </div>
                    <p className="text-muted-foreground">
                      {application.field_of_expertise || 'Not specified'}
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 text-sm font-medium mb-1">
                      Years of Experience
                    </div>
                    <p className="text-muted-foreground">
                      {application.years_of_experience !== null
                        ? `${application.years_of_experience}+ years`
                        : 'Not specified'}
                    </p>
                  </div>
                </div>

                {/* Resume */}
                {application.resume_url && (
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 text-sm font-medium mb-2">
                      <FileText className="h-4 w-4" /> Resume / CV
                    </div>
                    <a
                      href={application.resume_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm"
                    >
                      View Resume →
                    </a>
                  </div>
                )}

                {/* Payout Info */}
                {application.payment_method && (
                  <div className="p-4 border rounded-lg bg-muted/30">
                    <h4 className="font-medium mb-3">Payout Details</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Method:</span>
                        <p className="font-medium capitalize">{application.payment_method}</p>
                      </div>
                      {application.account_name && (
                        <div>
                          <span className="text-muted-foreground">Account Name:</span>
                          <p className="font-medium">{application.account_name}</p>
                        </div>
                      )}
                      {application.account_id && (
                        <div>
                          <span className="text-muted-foreground">Account ID:</span>
                          <p className="font-medium">{application.account_id}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No detailed application found for this instructor.</p>
                <p className="text-sm mt-1">They may have registered before the detailed form was introduced.</p>
              </div>
            )}
          </div>
        )}

        {/* Action buttons for pending instructors */}
        {isPending && onApprove && onReject && (
          <DialogFooter className="mt-6 gap-2 sm:gap-0">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <X className="h-4 w-4 mr-2" />
                  Reject Application
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reject Instructor Application</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to reject {userName || userEmail}'s instructor application? They will be notified via email.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleReject}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Reject
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <Button onClick={handleApprove}>
              <Check className="h-4 w-4 mr-2" />
              Approve Instructor
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { GraduationCap, BookOpen } from 'lucide-react';
import { StudentSignupForm } from './StudentSignupForm';
import { InstructorSignupForm } from './InstructorSignupForm';

type RoleSelection = 'none' | 'student' | 'instructor';

export const SignupForm = () => {
  const [selectedRole, setSelectedRole] = useState<RoleSelection>('none');

  if (selectedRole === 'student') {
    return <StudentSignupForm onBack={() => setSelectedRole('none')} />;
  }

  if (selectedRole === 'instructor') {
    return <InstructorSignupForm onBack={() => setSelectedRole('none')} />;
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Create an account</CardTitle>
        <CardDescription className="text-center">
          Start your learning journey with Lernova
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label className="text-base font-medium">I want to join as</Label>
          <RadioGroup
            value={selectedRole}
            onValueChange={(value) => setSelectedRole(value as RoleSelection)}
            className="grid grid-cols-2 gap-4"
          >
            <div>
              <RadioGroupItem value="student" id="student" className="peer sr-only" />
              <Label
                htmlFor="student"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-6 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
              >
                <GraduationCap className="mb-3 h-8 w-8" />
                <span className="font-medium text-lg">Student</span>
                <span className="text-xs text-muted-foreground mt-1">Learn new skills</span>
              </Label>
            </div>
            <div>
              <RadioGroupItem value="instructor" id="instructor" className="peer sr-only" />
              <Label
                htmlFor="instructor"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-6 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
              >
                <BookOpen className="mb-3 h-8 w-8" />
                <span className="font-medium text-lg">Instructor</span>
                <span className="text-xs text-muted-foreground mt-1">Teach & earn</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <p className="text-sm text-center text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
};

import { SignupForm } from '@/components/auth/SignupForm';
import { MainLayout } from '@/components/layout/MainLayout';

const Signup = () => {
  return (
    <MainLayout>
      <div className="container flex items-center justify-center min-h-[calc(100vh-12rem)] py-8">
        <SignupForm />
      </div>
    </MainLayout>
  );
};

export default Signup;

import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { MainLayout } from '@/components/layout/MainLayout';

const ForgotPassword = () => {
  return (
    <MainLayout>
      <div className="container flex items-center justify-center min-h-[calc(100vh-12rem)] py-8">
        <ForgotPasswordForm />
      </div>
    </MainLayout>
  );
};

export default ForgotPassword;

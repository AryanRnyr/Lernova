import { LoginForm } from '@/components/auth/LoginForm';
import { MainLayout } from '@/components/layout/MainLayout';

const Login = () => {
  return (
    <MainLayout>
      <div className="container flex items-center justify-center min-h-[calc(100vh-12rem)] py-8">
        <LoginForm />
      </div>
    </MainLayout>
  );
};

export default Login;

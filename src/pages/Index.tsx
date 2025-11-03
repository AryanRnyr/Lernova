import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { GraduationCap, BookOpen, Award, Users } from 'lucide-react';

const Index = () => {
  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary/10 to-background py-20 md:py-32">
        <div className="container text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Learn Without Limits with <span className="text-primary">Lernova</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Access quality courses from expert instructors. Start your learning journey today
            and unlock your full potential.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/catalog">Browse Courses</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/signup">Get Started Free</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose Lernova?</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { icon: BookOpen, title: 'Quality Courses', desc: 'Learn from industry experts' },
              { icon: GraduationCap, title: 'Certificates', desc: 'Earn certificates on completion' },
              { icon: Users, title: 'Community', desc: 'Join thousands of learners' },
              { icon: Award, title: 'Affordable', desc: 'Pay in NPR with local payments' },
            ].map((feature) => (
              <div key={feature.title} className="text-center">
                <div className="rounded-full bg-primary/10 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </MainLayout>
  );
};

export default Index;

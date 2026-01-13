import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { GraduationCap, BookOpen, Award, Users, CheckCircle, Play, TrendingUp, Clock, Shield, Zap } from 'lucide-react';

const Index = () => {
  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary/10 to-background py-20 md:py-32">
        <div className="container text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Zap className="h-4 w-4" />
            Start learning today with Nepal's trusted platform
          </div>
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
          <div className="flex flex-wrap items-center justify-center gap-8 mt-12 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>100+ Courses</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Expert Instructors</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Pay with eSewa & Khalti</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-4">Why Choose Lernova?</h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
            We provide the best learning experience with features designed to help you succeed
          </p>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { icon: BookOpen, title: 'Quality Courses', desc: 'Learn from industry experts with practical, real-world knowledge' },
              { icon: GraduationCap, title: 'Certificates', desc: 'Earn verified certificates upon successful course completion' },
              { icon: Users, title: 'Community', desc: 'Join thousands of learners and grow together' },
              { icon: Award, title: 'Affordable', desc: 'Pay in NPR with local payment options like eSewa & Khalti' },
            ].map((feature) => (
              <div key={feature.title} className="text-center p-6 rounded-xl hover:bg-muted/50 transition-colors">
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

      {/* How It Works Section */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-4">How It Works</h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
            Getting started with Lernova is easy. Follow these simple steps to begin your learning journey.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Create Account', desc: 'Sign up for free and set up your learner profile in minutes', icon: Users },
              { step: '02', title: 'Choose Courses', desc: 'Browse our catalog and enroll in courses that match your goals', icon: BookOpen },
              { step: '03', title: 'Start Learning', desc: 'Access video lessons, complete assignments, and earn certificates', icon: Play },
            ].map((item) => (
              <div key={item.step} className="relative">
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="p-8 text-center">
                    <div className="text-5xl font-bold text-primary/20 mb-4">{item.step}</div>
                    <div className="rounded-full bg-primary/10 w-14 h-14 flex items-center justify-center mx-auto mb-4">
                      <item.icon className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                    <p className="text-muted-foreground">{item.desc}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '100+', label: 'Courses Available', icon: BookOpen },
              { value: '50+', label: 'Expert Instructors', icon: Users },
              { value: '1000+', label: 'Happy Students', icon: GraduationCap },
              { value: '95%', label: 'Satisfaction Rate', icon: TrendingUp },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mx-auto mb-3">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-primary mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Learn at Your Own Pace</h2>
              <p className="text-muted-foreground mb-8">
                Whether you're a busy professional or a full-time student, Lernova adapts to your schedule. 
                Access courses anytime, anywhere, and learn at a pace that works for you.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Clock, text: 'Lifetime access to purchased courses' },
                  { icon: Play, text: 'HD video lessons with subtitles' },
                  { icon: Shield, text: 'Secure payments with eSewa & Khalti' },
                  { icon: Award, text: 'Downloadable certificates' },
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="rounded-full bg-green-500/10 p-2">
                      <item.icon className="h-5 w-5 text-green-500" />
                    </div>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
              <Button className="mt-8" size="lg" asChild>
                <Link to="/catalog">Explore Courses</Link>
              </Button>
            </div>
            <div className="relative">
              <div className="aspect-video rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <div className="text-center p-8">
                  <GraduationCap className="h-20 w-20 text-primary mx-auto mb-4" />
                  <p className="text-xl font-semibold">Start Your Journey Today</p>
                  <p className="text-muted-foreground">Join thousands of learners in Nepal</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Instructors Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-3xl p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-4">Become an Instructor</h2>
                <p className="text-muted-foreground mb-6">
                  Share your expertise and earn money by creating courses on Lernova. 
                  We provide all the tools you need to create, publish, and sell your courses.
                </p>
                <ul className="space-y-3 mb-8">
                  {[
                    'Easy-to-use course creation tools',
                    'Reach students across Nepal',
                    'Get paid directly to your bank account',
                    'Track your earnings and student progress',
                  ].map((item, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Button size="lg" asChild>
                  <Link to="/signup">Start Teaching Today</Link>
                </Button>
              </div>
              <div className="hidden md:flex justify-center">
                <div className="relative">
                  <div className="w-64 h-64 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-32 w-32 text-primary/50" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Start Learning?</h2>
          <p className="text-lg opacity-90 max-w-2xl mx-auto mb-8">
            Join thousands of students already learning on Lernova. 
            Create your free account today and start your journey to success.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/signup">Create Free Account</Link>
            </Button>
            <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary" asChild>
              <Link to="/catalog">Browse Courses</Link>
            </Button>
          </div>
        </div>
      </section>
    </MainLayout>
  );
};

export default Index;

import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Target, Users, Award, BookOpen } from 'lucide-react';

const About = () => {
  const stats = [
    { icon: Users, label: 'Students', value: '10,000+' },
    { icon: BookOpen, label: 'Courses', value: '500+' },
    { icon: Award, label: 'Instructors', value: '100+' },
    { icon: Target, label: 'Success Rate', value: '95%' },
  ];

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary/10 to-background py-16 md:py-24">
        <div className="container text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">About Lernova</h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Empowering learners across Nepal with accessible, high-quality education. 
            Our mission is to make learning available to everyone, everywhere.
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <Card key={stat.label} className="text-center">
                <CardContent className="pt-6">
                  <stat.icon className="h-10 w-10 text-primary mx-auto mb-4" />
                  <p className="text-3xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-12 md:py-16 bg-card">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
              <p className="text-muted-foreground mb-4">
                At Lernova, we believe that quality education should be accessible to everyone. 
                We're building a platform that connects passionate instructors with eager learners 
                across Nepal and beyond.
              </p>
              <p className="text-muted-foreground mb-4">
                Our platform offers courses in various categories, from technology and business 
                to creative arts and personal development. Whether you're looking to advance 
                your career or pursue a new hobby, Lernova has something for you.
              </p>
              <p className="text-muted-foreground">
                With affordable pricing in Nepali Rupees and local payment options like Esewa 
                and Khalti, we're making learning more accessible than ever before.
              </p>
            </div>
            <div className="bg-primary/10 rounded-lg p-8">
              <h3 className="text-xl font-semibold mb-4">Why Choose Lernova?</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/20 p-1 mt-1">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <span>Expert instructors with real-world experience</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/20 p-1 mt-1">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <span>Affordable courses with local payment options</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/20 p-1 mt-1">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <span>Certificates upon course completion</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/20 p-1 mt-1">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <span>Lifetime access to purchased courses</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/20 p-1 mt-1">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <span>Learn at your own pace, anywhere</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
};

export default About;

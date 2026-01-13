import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, Users, Award, BookOpen, Globe, Github, Linkedin, Code, GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';

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

      {/* Developer Section */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">Meet the Developer</h2>
          <div className="max-w-4xl mx-auto">
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="grid md:grid-cols-5 gap-0">
                  {/* Image */}
                  <div className="md:col-span-2 bg-gradient-to-br from-primary/20 to-primary/5">
                    <img 
                      src="/AR.png" 
                      alt="Aryan Rauniyar" 
                      className="w-full h-full object-cover min-h-[300px]"
                    />
                  </div>
                  {/* Content */}
                  <div className="md:col-span-3 p-8">
                    <div className="flex items-center gap-2 text-primary text-sm font-medium mb-2">
                      <Code className="h-4 w-4" />
                      Full Stack Developer
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Aryan Rauniyar</h3>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-4">
                      <GraduationCap className="h-4 w-4" />
                      BCA Student
                    </div>
                    <p className="text-muted-foreground mb-4">
                      Hi, I'm Aryan Rauniyar, a passionate full-stack developer and currently pursuing 
                      my Bachelor's in Computer Applications (BCA). I built Lernova with the vision of 
                      making quality education accessible to everyone in Nepal.
                    </p>
                    <p className="text-muted-foreground mb-6">
                      With a keen interest in web development and modern technologies, I enjoy building 
                      applications that solve real-world problems. Lernova is my initiative to contribute 
                      to the education sector by connecting learners with expert instructors through a 
                      seamless digital platform.
                    </p>
                    {/* Social Links */}
                    <div className="flex gap-3">
                      <a 
                        href="https://aryanrauniyar.com.np" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-sm font-medium"
                      >
                        <Globe className="h-4 w-4" />
                        Portfolio
                      </a>
                      <a 
                        href="https://github.com/AryanRnyr" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-sm font-medium"
                      >
                        <Github className="h-4 w-4" />
                        GitHub
                      </a>
                      <a 
                        href="https://www.linkedin.com/in/aryanrauniyar/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-sm font-medium"
                      >
                        <Linkedin className="h-4 w-4" />
                        LinkedIn
                      </a>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
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

      {/* CTA Section */}
      <section className="py-16 md:py-20 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Your Learning Journey?</h2>
          <p className="text-lg opacity-90 max-w-2xl mx-auto mb-8">
            Join thousands of learners and start exploring our courses today.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link to="/catalog">Browse Courses</Link>
          </Button>
        </div>
      </section>
    </MainLayout>
  );
};

export default About;

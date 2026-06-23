import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, DollarSign, Users, Code, Megaphone, BarChart, Mail, GraduationCap, ArrowRight, Briefcase, Handshake } from 'lucide-react';
import Footer from '@/components/Footer';
import { Link, useNavigate } from 'react-router-dom';

const Careers = () => {
  const navigate = useNavigate();
  const jobs = [
    {
      title: 'Chief Technology Officer (CTO)',
      department: 'Technology',
      type: 'Full-time',
      location: 'Remote (US)',
      salary: 'Competitive + equity',
      icon: Code,
    },
    {
      title: 'Director of Partnerships',
      department: 'Sales & Partnerships',
      type: 'Full-time',
      location: 'Remote (US)',
      salary: 'Competitive + equity',
      icon: Handshake,
    },
    {
      title: 'Chief Operating Officer (COO)',
      department: 'Operations',
      type: 'Full-time',
      location: 'Remote (US)',
      salary: 'Competitive + equity',
      icon: Briefcase,
    },
    {
      title: 'Head of Marketing',
      department: 'Marketing',
      type: 'Full-time',
      location: 'Remote (US)',
      salary: 'Competitive + equity',
      icon: Megaphone,
    },
    {
      title: 'Head of People',
      department: 'People & HR',
      type: 'Full-time',
      location: 'Remote (US)',
      salary: 'Competitive + equity',
      icon: Users,
    },
  ];
  
  const benefits = [
    {
      title: 'Competitive Compensation',
      description: 'Market-leading salaries and equity packages',
      icon: DollarSign
    },
    {
      title: 'Flexible Work',
      description: 'Remote-first culture with flexible hours',
      icon: Clock
    },
    {
      title: 'Health & Wellness',
      description: 'Comprehensive health, dental, and vision coverage',
      icon: Users
    },
    {
      title: 'Growth Opportunities',
      description: 'Professional development and learning budget',
      icon: BarChart
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <div className="container mx-auto px-4 py-16 text-center">
          <Users className="h-16 w-16 mx-auto mb-6" />
          <h1 className="text-4xl font-bold mb-4">Join Our Team</h1>
          <p className="text-xl opacity-90 max-w-3xl mx-auto">
            Help us redefine on-demand local commerce across food, grocery, retail, convenience, and courier (CX). Build your career with a fast-growing company that values innovation and teamwork.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Benefits Section */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-8">Why Work at Crave'n?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <Card key={index} className="text-center">
                  <CardContent className="p-6">
                    <Icon className="h-12 w-12 mx-auto mb-4 text-primary" />
                    <h3 className="font-semibold mb-2">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Internship Program Section */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-8">Internship Program</h2>
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 hover:border-primary/40 transition-all">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                    <GraduationCap className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-primary text-primary-foreground">Executive Track</Badge>
                    <Badge variant="outline">United States & United Kingdom</Badge>
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Marketing & Growth Internship</h3>
                  <p className="text-muted-foreground mb-4">
                    A performance-driven internship with a direct pathway into permanent C-Suite roles (CMO/CGO). 
                    Includes equity ownership (0.25% – 1.0%) and deferred executive compensation for selected candidates.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">Content Creation</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">Social Media</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">Growth Marketing</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">Brand Strategy</span>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <Link to="/careers/internship">
                    <Button size="lg" className="group">
                      View Details
                      <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Job Listings or No Positions Message */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-8">Open Positions</h2>
          
          {jobs.length > 0 ? (
            <div className="grid gap-6">{jobs.map((job, index) => {
              const Icon = job.icon;
              return (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className="h-6 w-6 text-primary" />
                        <div>
                          <CardTitle>{job.title}</CardTitle>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="secondary">{job.department}</Badge>
                            <Badge variant="outline">{job.type}</Badge>
                          </div>
                        </div>
                      </div>
                      <Button
                            onClick={() => navigate('/careers/apply', { state: { positionTitle: job.title, department: job.department } })}
                          >
                            Apply Now
                          </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {job.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        {job.salary}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {job.type}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}</div>
          ) : (
            <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
              <CardContent className="p-12 text-center">
                <Users className="h-16 w-16 mx-auto mb-4 text-primary" />
                <h3 className="text-2xl font-bold mb-3">No Open Positions at This Time</h3>
                <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                  We're not currently hiring, but we're always interested in connecting with talented individuals. 
                  Send us your resume and we'll keep you in mind for future opportunities.
                </p>
                <Button size="lg" onClick={() => window.location.href = 'mailto:customerservice@cravenusa.com'}>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Your Resume
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Careers;
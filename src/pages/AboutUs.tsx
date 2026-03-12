// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Target, Users, Truck, Store, Globe, Award, TrendingUp, MapPin, Clock, Star, Zap } from "lucide-react";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { FALLBACK_EXECUTIVES } from "@/data/executiveFallbacks";
import { isCLevelPosition, getExecRoleFromPosition } from "@/utils/roleUtils";

interface TeamMember {
  name: string;
  role: string;
  bio: string;
  department?: string;
}

const AboutUs = () => {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [statsVisible, setStatsVisible] = useState(true); // Default to visible
  const [hasCheckedFlag, setHasCheckedFlag] = useState(false);

  useEffect(() => {
    // Check feature flag from database
    const checkFeatureFlag = async () => {
      try {
        const { data, error } = await supabase
          .from('admin_settings')
          .select('setting_value')
          .eq('setting_key', 'feature_about_us_stats_visible')
          .single();

        if (!error && data?.setting_value) {
          setStatsVisible(data.setting_value.enabled !== false); // Default to true if not explicitly false
        }
        // If no setting exists, keep default (true)
      } catch (error) {
        // If setting doesn't exist, keep default (true)
        console.log('Feature flag not set, using default (visible)');
      } finally {
        setHasCheckedFlag(true);
      }
    };

    checkFeatureFlag();
  }, []);

  useEffect(() => {
    fetchExecutives();
  }, []);

  const fetchExecutives = async () => {
    try {
      // Fetch from both exec_users and employees tables
      const [execUsersRes, employeesRes] = await Promise.allSettled([
        supabase
          .from("exec_users")
          .select("id, role, title, department, name, email")
          .in("role", ["ceo", "cfo", "coo", "cto", "cxo", "cmo", "board_member", "advisor"])
          .order("created_at", { ascending: false }),
        supabase
          .from("employees" as any)
          .select("id, first_name, last_name, position, department, email")
          .order("position"),
      ]);

      const execUsersData =
        execUsersRes.status === "fulfilled" && !execUsersRes.value.error
          ? execUsersRes.value.data || []
          : [];
      const employeesData =
        employeesRes.status === "fulfilled" && !employeesRes.value.error
          ? employeesRes.value.data || []
          : [];

      const existingEmails = new Set<string>();
      const teamMembers: TeamMember[] = [];

      // Process exec_users (skip Nathan Curry — CTO position listed as Hiring)
      execUsersData.forEach((exec: any) => {
        const email = exec.email?.toLowerCase();
        if (email === "natecurry.cto@cravenusa.com" || (exec.name || "").toLowerCase().includes("nathan curry")) return;
        if (email) existingEmails.add(email);

        const roleTitle = exec.title || exec.role?.toUpperCase() || "Executive";
        const displayRole = exec.role === "ceo" ? "CEO & Founder" : roleTitle;
        const bio = exec.department
          ? `Leading ${exec.department} operations and strategic initiatives.`
          : `Executive leadership team member driving company growth and innovation.`;

        teamMembers.push({
          name: exec.name || exec.title || "Executive",
          role: displayRole,
          bio,
          department: exec.department,
        });
      });

      // Process employees with C-level positions (skip Nathan Curry — CTO listed as Hiring)
      employeesData
        .filter((emp: any) => isCLevelPosition(emp.position))
        .forEach((emp: any) => {
          const email = (emp.email || "").toLowerCase();
          if (email === "natecurry.cto@cravenusa.com") return;
          const name = `${emp.first_name || ""} ${emp.last_name || ""}`.trim();
          if (name.toLowerCase().includes("nathan curry")) return;
          if (email && existingEmails.has(email)) return; // Skip if already added from exec_users

          const position = emp.position || "";
          const bio = emp.department
            ? `Leading ${emp.department} operations and strategic initiatives.`
            : `Executive leadership team member driving company growth and innovation.`;

          teamMembers.push({
            name,
            role: position,
            bio,
            department: emp.department,
          });
        });

      // Add fallback executives if not already present
      FALLBACK_EXECUTIVES.forEach((fallback) => {
        const emailLower = (fallback.email || "").toLowerCase();
        if (emailLower && existingEmails.has(emailLower)) return;
        const displayRole = fallback.role === "ceo" ? "CEO & Founder" : fallback.title;
        const bio =
          fallback.name === "Hiring"
            ? "This position is open. Join our leadership team."
            : fallback.role === "ceo"
            ? "Visionary entrepreneur with a passion for revolutionizing food delivery and supporting local communities."
            : fallback.department
            ? `Leading ${fallback.department} operations and strategic initiatives.`
            : `Executive leadership team member driving company growth and innovation.`;

        teamMembers.push({
          name: fallback.name,
          role: displayRole,
          bio,
          department: fallback.department,
        });
      });

      // Sort: CEO first, then by role importance
      const roleOrder: { [key: string]: number } = {
        ceo: 0,
        cfo: 1,
        coo: 2,
        cto: 3,
        cxo: 4,
        cmo: 5,
      };

      teamMembers.sort((a, b) => {
        const aRole = a.role.toLowerCase();
        const bRole = b.role.toLowerCase();
        
        const aKey = Object.keys(roleOrder).find((r) => aRole.includes(r.toLowerCase()));
        const bKey = Object.keys(roleOrder).find((r) => bRole.includes(r.toLowerCase()));
        
        const aOrder = aKey ? roleOrder[aKey] : 999;
        const bOrder = bKey ? roleOrder[bKey] : 999;
        
        return aOrder - bOrder;
      });

      // Ensure at least Torrance is shown
      if (teamMembers.length === 0) {
        teamMembers.push({
          name: "Torrance Stroman",
          role: "CEO & Founder",
          bio: "Visionary entrepreneur with a passion for revolutionizing food delivery and supporting local communities.",
        });
      }

      setTeam(teamMembers);
    } catch (error) {
      console.error("Error fetching executives:", error);
      // Fallback to default executives
      setTeam(
        FALLBACK_EXECUTIVES.map((exec) => ({
          name: exec.name,
          role: exec.role === "ceo" ? "CEO & Founder" : exec.title,
          bio:
            exec.name === "Hiring"
              ? "This position is open. Join our leadership team."
              : exec.role === "ceo"
              ? "Visionary entrepreneur with a passion for revolutionizing food delivery and supporting local communities."
              : `Leading ${exec.department} operations and strategic initiatives.`,
          department: exec.department,
        }))
      );
    }
  };
  const stats = [
    {
      icon: Users,
      label: "Loyal Users",
      value: "",
    },
    {
      icon: Store,
      label: "Restaurant Partners",
      value: "5K+",
    },
    {
      icon: Truck,
      label: "Delivery Drivers",
      value: "1K+",
    },
    {
      icon: Globe,
      label: "Cities Served",
      value: "100+",
    },
  ];
  const values = [
    {
      icon: Heart,
      title: "Customer First",
      description: "Every decision we make is centered around creating the best possible experience for our customers.",
    },
    {
      icon: Zap,
      title: "Speed & Reliability",
      description: "We leverage technology to ensure fast, accurate deliveries that you can count on every time.",
    },
    {
      icon: Users,
      title: "Community Focus",
      description:
        "We believe in supporting local restaurants and creating opportunities for drivers in every community.",
    },
    {
      icon: Star,
      title: "Quality Excellence",
      description: "From our platform to our partnerships, we maintain the highest standards in everything we do.",
    },
  ];
  const timeline = [
    {
      year: "2025",
      title: "The Beginning",
      description:
        "Crave'n was founded with a simple mission: make food delivery faster, more reliable, and more affordable for everyone.",
    },
    {
      year: "2025",
      title: "Rapid Growth",
      description:
        "Quickly expanded to 100+ cities and onboarded over 5,000 restaurant partners, establishing our presence in major metropolitan areas.",
    },
    {
      year: "2025",
      title: "Platform Innovation",
      description:
        "Launched our AI-powered routing system, real-time tracking, and built a network of 1,000+ dedicated delivery drivers.",
    },
    {
      year: "2025",
      title: "Community Impact",
      description:
        "Reached 20K active users and introduced our driver benefits program, safety features, and award-winning customer support platform.",
    },
  ];

  const futureRoles = ["COO", "VP of Operations", "Head of Marketing", "Director of Partnerships"];
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl font-bold mb-4">About Crave'n</h1>
          <p className="text-xl opacity-90 max-w-3xl mx-auto mb-8">
            We're on a mission to connect people with their favorite food, support local restaurants, and create
            opportunities for drivers in communities everywhere.
          </p>
          <Badge variant="secondary" className="bg-white/20 text-white text-lg px-4 py-2">
            Founded in 2025 • United States • Loyal Users
          </Badge>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Stats Section */}
        {statsVisible && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index} className="text-center">
                  <CardContent className="p-6">
                    <Icon className="h-8 w-8 mx-auto mb-3 text-primary" />
                    {stat.value && <h3 className="text-2xl font-bold text-primary mb-2">{stat.value}</h3>}
                    <p className={`${stat.value ? 'text-sm text-muted-foreground' : 'text-lg font-semibold text-primary'}`}>{stat.label}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Mission & Vision */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-6 w-6 text-primary" />
                Our Mission
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg text-muted-foreground leading-relaxed">
                To revolutionize food delivery by creating a platform that benefits everyone: customers get their
                favorite meals quickly and affordably, restaurants reach new customers and grow their business, and
                drivers earn good money with flexible schedules.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-6 w-6 text-primary" />
                Our Vision
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg text-muted-foreground leading-relaxed">
                To become the most trusted and beloved food delivery platform, known for exceptional service, innovative
                technology, and unwavering commitment to the communities we serve. We envision a world where great food
                is always within reach.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Core Values */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Our Core Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <Card key={index}>
                  <CardHeader>
                    <Icon className="h-8 w-8 text-primary mb-2" />
                    <CardTitle className="text-lg">{value.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{value.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Leadership Team */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-4">Leadership Team</h2>
          <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
            Building the future of food delivery, one delivery at a time.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {team.map((member, index) => (
              <Card key={index} className="text-center">
                <CardContent className="p-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/60 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="font-semibold mb-1">{member.name}</h3>
                  <p className="text-primary text-sm mb-3">{member.role}</p>
                  <p className="text-xs text-muted-foreground">{member.bio}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
            <CardContent className="p-8 text-center">
              <h3 className="text-xl font-bold mb-3">We're Growing!</h3>
              <p className="text-muted-foreground mb-4">
                We're actively building our leadership team. Join us as we scale and shape the future of food delivery.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {futureRoles.map((role, i) => (
                  <Badge key={i} variant="outline">
                    {role} - Coming Soon
                  </Badge>
                ))}
              </div>
              <Button onClick={() => (window.location.href = "/careers")}>View Open Positions</Button>
            </CardContent>
          </Card>
        </div>

        {/* Company Culture */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          <Card>
            <CardHeader>
              <CardTitle>Life at Crave'n</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                We believe that great products come from great teams. Our culture is built on collaboration, innovation,
                and a shared passion for making food delivery better for everyone.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Flexible work arrangements</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Comprehensive health benefits</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Professional development opportunities</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Equity participation for all employees</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sustainability Commitment</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                We're committed to reducing our environmental impact and supporting sustainable practices throughout our
                operations and partner network.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Carbon-neutral delivery options</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Eco-friendly packaging partnerships</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Local sourcing initiatives</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Food waste reduction programs</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        <Card className="text-center bg-gradient-to-r from-primary/10 to-primary/5">
          <CardContent className="p-8">
            <h3 className="text-2xl font-bold mb-4">Join the Crave'n Family</h3>
            <p className="text-lg text-muted-foreground mb-6">
              Whether you're looking for a career opportunity, want to partner with us, or simply want to stay updated
              on our journey, we'd love to connect.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg">View Open Positions</Button>
              <Button variant="outline" size="lg">
                Partner With Us
              </Button>
              <Button variant="outline" size="lg">
                Follow Our Story
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
};

// Add missing CheckCircle and Trophy imports
const CheckCircle = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);
const Trophy = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
    />
  </svg>
);
export default AboutUs;

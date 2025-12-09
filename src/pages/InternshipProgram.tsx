import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Briefcase, Mail, ExternalLink, GraduationCap, TrendingUp, Users, Award } from 'lucide-react';
import Footer from '@/components/Footer';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';

const InternshipProgram = () => {
  const responsibilities = [
    "Create engaging social media content for TikTok, Instagram, Facebook, and LinkedIn.",
    "Support Craver (driver) recruitment campaigns with videos, graphics, and copywriting.",
    "Assist with customer and merchant marketing campaigns.",
    "Pitch creative concepts directly to the CEO & CXO during brainstorming sessions.",
    "Conduct research on trends, competitors, and local market opportunities.",
    "Track analytics for engagement, conversions, and growth performance.",
    "Help manage community outreach, college campus marketing, and brand activations.",
    "Collaborate on promotional designs, short-form videos, and digital ads.",
    "Submit weekly progress reports and contribute to ongoing strategic planning."
  ];

  const learningOutcomes = [
    "How to build and launch marketing campaigns from scratch.",
    "Growth marketing, analytics, and brand positioning.",
    "Professional content creation and digital storytelling.",
    "High-level strategy by collaborating with senior leadership.",
    "Hands-on experience inside a fast-growing technology startup."
  ];

  const requiredSkills = [
    "Strong written and verbal communication.",
    "Creativity in content, branding, and concepts.",
    "Familiarity with major social media platforms.",
    "Basic research and analytical interpretation skills.",
    "Reliability, professionalism, and strong work ethic.",
    "Ability to learn quickly in a fast-paced startup environment."
  ];

  const preferredSkills = [
    "Canva, CapCut, Adobe Express, or similar tools.",
    "Basic graphic design or video editing experience.",
    "Comfort with TikTok/Reels trends and short-form content.",
    "Experience in outreach, sales, or community engagement.",
    "Interest in startups, branding, and digital media."
  ];

  const traits = ["Ambitious", "Creative", "Analytical", "Entrepreneurial", "Leadership Potential"];

  return (
    <>
      <Helmet>
        <title>Marketing & Growth Internship | Crave'n Inc.</title>
        <meta 
          name="description" 
          content="Crave'n Inc. Marketing & Growth Internship with an executive advancement pathway, equity, and deferred C-suite compensation." 
        />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-[#1f1f26] via-[#0a0a0d] to-black text-foreground">
        {/* Back to Careers */}
        <div className="container mx-auto px-4 pt-6">
          <Link 
            to="/careers" 
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            ← Back to Careers
          </Link>
        </div>

        {/* Header */}
        <header className="container mx-auto px-4 py-8 md:py-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 mb-4">
            <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]" />
            <span className="text-xs uppercase tracking-widest text-primary font-medium">
              Marketing & Growth Internship
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Crave'n Inc.{' '}
            <span className="text-primary">Internship + Executive Pathway</span>
          </h1>

          <p className="text-muted-foreground max-w-2xl text-base md:text-lg leading-relaxed mb-6">
            A performance-driven Marketing & Growth Internship with a direct pathway into permanent C-Suite roles at Crave'n Inc. — designed for ambitious creatives, strategists, and future leaders.
          </p>

          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/50 bg-background/30 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              Remote + Toledo, OH
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/50 bg-background/30 text-sm text-muted-foreground">
              <Briefcase className="h-3.5 w-3.5" />
              Marketing & Growth Operations
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/50 bg-background/30 text-sm text-muted-foreground">
              <GraduationCap className="h-3.5 w-3.5" />
              Internship (Executive Track)
            </div>
          </div>
        </header>

        {/* Main Content Card */}
        <main className="container mx-auto px-4 pb-12">
          <div className="rounded-2xl bg-gradient-to-br from-primary/5 via-card/90 to-card border border-white/5 backdrop-blur-xl shadow-2xl p-6 md:p-8">
            <div className="grid lg:grid-cols-[2fr_1.5fr] gap-8">
              {/* Left Column */}
              <div className="space-y-8">
                {/* About */}
                <section>
                  <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-4 font-medium">
                    About the Internship
                  </h2>
                  <p className="text-foreground leading-relaxed mb-3">
                    Crave'n Inc. is seeking highly motivated <strong className="text-primary">Marketing & Growth Interns</strong> to join our rapidly scaling startup. This program is built for individuals who want real-world experience in digital marketing, brand development, content creation, and growth operations — while working directly with company leadership.
                  </p>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    This is a performance-driven internship with a unique opportunity for top talent to transition into permanent executive roles.
                  </p>
                </section>

                {/* Responsibilities */}
                <section>
                  <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-4 font-medium">
                    Key Responsibilities
                  </h2>
                  <ul className="space-y-2">
                    {responsibilities.map((item, index) => (
                      <li key={index} className="flex items-start gap-3 text-sm leading-relaxed">
                        <span className="text-primary mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Learning */}
                <section>
                  <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-4 font-medium">
                    What You Will Learn
                  </h2>
                  <ul className="space-y-2">
                    {learningOutcomes.map((item, index) => (
                      <li key={index} className="flex items-start gap-3 text-sm leading-relaxed">
                        <span className="text-primary mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>

              {/* Right Column */}
              <div className="space-y-8">
                {/* Candidate Profile */}
                <section>
                  <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-4 font-medium">
                    Candidate Profile
                  </h2>
                  <div className="rounded-xl bg-gradient-to-br from-primary/10 to-background/80 border border-white/5 p-5">
                    <h3 className="font-medium mb-3">Required Skills</h3>
                    <ul className="space-y-1.5 mb-5">
                      {requiredSkills.map((skill, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{skill}</span>
                        </li>
                      ))}
                    </ul>

                    <h3 className="font-medium mb-3">Preferred Skills</h3>
                    <ul className="space-y-1.5">
                      {preferredSkills.map((skill, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{skill}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>

                {/* Executive Pathway */}
                <section>
                  <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-4 font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Executive Advancement Pathway
                  </h2>
                  <p className="text-sm leading-relaxed mb-3">
                    At the conclusion of the internship, the <strong className="text-primary">two highest-rated interns</strong> will be promoted into permanent C-Suite roles at Crave'n Inc.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-0.5">•</span>
                      <span><strong className="text-primary">Chief Marketing Officer (CMO)</strong> – leads brand strategy, creative direction, and marketing operations.</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-0.5">•</span>
                      <span><strong className="text-primary">Chief Growth Officer (CGO)</strong> – leads growth strategy, analytics, user acquisition, and performance marketing.</span>
                    </li>
                  </ul>
                </section>

                {/* Compensation */}
                <section>
                  <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-4 font-medium flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" />
                    Compensation & Equity (For Selected Executives)
                  </h2>
                  <div className="rounded-xl bg-gradient-to-br from-primary/10 to-background/80 border border-white/5 p-5 space-y-4">
                    <div>
                      <h3 className="font-medium mb-2">Equity Ownership</h3>
                      <p className="text-sm leading-relaxed">
                        Each selected executive will receive <strong className="text-primary">0.25% – 1.0% equity</strong> in Crave'n Inc., determined by performance, contribution, and long-term commitment.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-medium mb-2">Deferred Executive Salary</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed mb-2">
                        Executive salaries activate when Crave'n reaches its first major revenue or funding milestone (for example, a defined monthly revenue target or seed funding round).
                      </p>
                      <ul className="space-y-1">
                        <li className="flex items-start gap-2 text-sm">
                          <span className="text-primary mt-0.5">•</span>
                          <span><strong className="text-primary">CMO:</strong> $85,000 – $95,000 per year (deferred).</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm">
                          <span className="text-primary mt-0.5">•</span>
                          <span><strong className="text-primary">CGO:</strong> $75,000 – $90,000 per year (deferred).</span>
                        </li>
                      </ul>
                      <p className="text-muted-foreground text-xs mt-2">
                        Until activation, compensation is primarily equity-based, consistent with early-stage startup executive structures.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Ideal Candidate */}
                <section>
                  <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-4 font-medium">
                    Ideal Candidate
                  </h2>
                  <p className="text-sm leading-relaxed mb-4">
                    This internship is ideal for highly motivated individuals who are passionate about marketing, branding, and growth — and who are excited by the opportunity to earn a permanent executive role inside a fast-growing startup.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {traits.map((trait, index) => (
                      <span 
                        key={index}
                        className="px-3 py-1 rounded-full border border-border/50 bg-background/30 text-xs text-muted-foreground"
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                </section>
              </div>
            </div>

            {/* Apply Section */}
            <div className="mt-8 pt-6 border-t border-dashed border-white/10 flex flex-wrap gap-4 items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                  How to apply
                </div>
                <div className="text-sm text-muted-foreground">
                  Send your resume or portfolio to:{' '}
                  <a 
                    href="mailto:careers@cravendelivery.com" 
                    className="font-semibold text-primary hover:underline"
                  >
                    careers@cravendelivery.com
                  </a>
                  <br />
                  Subject line: <strong className="text-foreground">Marketing & Growth Internship Application — [Your Name]</strong>
                </div>
              </div>
              <Button 
                className="bg-gradient-to-r from-primary to-orange-600 hover:from-primary/90 hover:to-orange-600/90 text-white shadow-lg shadow-primary/40"
                onClick={() => window.location.href = 'mailto:careers@cravendelivery.com?subject=Marketing%20%26%20Growth%20Internship%20Application'}
              >
                <Mail className="h-4 w-4 mr-2" />
                Apply Now
                <ExternalLink className="h-3.5 w-3.5 ml-2" />
              </Button>
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-6 text-xs text-muted-foreground">
            © {new Date().getFullYear()} Crave'n Inc. All rights reserved.
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default InternshipProgram;

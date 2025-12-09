import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Car, DollarSign, Clock, CheckCircle, Star, ArrowRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import becomeDriverHero from "@/assets/20251002_2239_Animated-Logo-Driver_remix_01k6kyy1m7f108g2r5qjd0a8x8.png";

const FeederHub = () => {
  const navigate = useNavigate();

  const quickStats = [
    { icon: DollarSign, value: "$20-30/hr", label: "Average Earnings" },
    { icon: Clock, value: "Flexible", label: "Your Schedule" },
    { icon: Star, value: "4.8/5", label: "Feeder Rating" },
    { icon: TrendingUp, value: "50K+", label: "Active Feeders" }
  ];

  const requirements = [
    "18+ years old",
    "Valid driver's license",
    "Car, bike, or scooter",
    "Smartphone",
    "Pass background check"
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section - Full Width, Bold */}
      <section className="relative bg-gradient-to-br from-orange-50 via-white to-orange-50/30 py-16 md:py-24 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-200/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-100/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left side - Content */}
              <div className="space-y-8 text-center lg:text-left">
                <div className="space-y-4">
                  <Badge className="bg-orange-100 text-orange-700 border-orange-200 px-4 py-1.5 text-sm font-medium">
                    Join 50,000+ Feeders Earning Today
                  </Badge>
                  <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight">
                    Become a <span className="text-orange-600">Feeder</span>
                    <br />
                    <span className="text-4xl md:text-5xl lg:text-6xl">Start Earning Now</span>
                  </h1>
                  <p className="text-xl md:text-2xl text-gray-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                    Deliver food, earn great money, and work on your own schedule. 
                    <span className="font-semibold text-gray-900"> Get approved in minutes.</span>
                  </p>
                </div>

                {/* Primary CTA */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <Button 
                    size="lg" 
                    className="text-lg px-10 py-7 bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-600/30 hover:shadow-xl hover:shadow-orange-600/40 transition-all duration-300 group"
                    onClick={() => navigate('/driver-onboarding/apply')}
                  >
                    Sign Up Now - It's Free
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="text-lg px-10 py-7 border-2 hover:bg-gray-50"
                    onClick={() => navigate('/driver/auth')}
                  >
                    Already a Feeder? Login
                  </Button>
                </div>
              </div>
              
              {/* Right side - Hero image */}
              <div className="flex justify-center lg:justify-end">
                <div className="relative max-w-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-200/20 to-orange-100/20 rounded-3xl blur-2xl transform rotate-6"></div>
                  <img 
                    src={becomeDriverHero} 
                    alt="Become a Feeder" 
                    className="relative w-full h-auto rounded-2xl shadow-2xl"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Stats - Full Width */}
      <section className="py-12 bg-white border-y border-gray-200">
        <div className="w-full px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {quickStats.map((stat, index) => (
              <div key={index} className="flex flex-col items-center text-center">
                <div className="flex items-center gap-2 text-orange-600 mb-2">
                  <stat.icon className="h-6 w-6" />
                  <span className="text-3xl md:text-4xl font-bold text-gray-900">{stat.value}</span>
                </div>
                <span className="text-sm md:text-base text-gray-600 font-medium">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Requirements & CTA Combined Section */}
      <section className="py-16 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* Requirements */}
              <Card className="p-8 border-2">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Simple Requirements</h2>
                <ul className="space-y-3">
                  {requirements.map((requirement, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span className="text-gray-700">{requirement}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              {/* CTA Card */}
              <Card className="p-8 bg-gradient-to-br from-orange-600 to-orange-700 text-white border-0 shadow-xl">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-3xl font-bold mb-3">Ready to Start?</h2>
                    <p className="text-orange-50 text-lg">
                      Join thousands of Feeders earning money on their own schedule. 
                      Application takes less than 5 minutes.
                    </p>
                  </div>
                  <Button 
                    size="lg" 
                    className="w-full bg-white text-orange-600 hover:bg-gray-50 text-lg px-8 py-6 font-semibold shadow-lg"
                    onClick={() => navigate('/driver-onboarding/apply')}
                  >
                    Get Started Now
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <p className="text-sm text-orange-100 text-center">
                    ✓ Free to sign up • ✓ No commitment • ✓ Start earning today
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 bg-orange-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Start Earning as a Feeder Today
          </h2>
          <p className="text-xl text-orange-50 mb-8 max-w-2xl mx-auto">
            Join our community and start making money delivering food on your schedule. 
            Get approved and start earning in days, not weeks.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="text-lg px-12 py-7 bg-white text-orange-600 hover:bg-gray-50 font-semibold shadow-xl"
              onClick={() => navigate('/driver-onboarding/apply')}
            >
              Sign Up Now - It's Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg px-12 py-7 border-2 border-white text-white hover:bg-white/10"
              onClick={() => navigate('/driver/auth')}
            >
              Login
            </Button>
          </div>
          <p className="text-sm text-orange-100 mt-6">
            No credit card required • Takes less than 5 minutes • Start earning immediately after approval
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default FeederHub;

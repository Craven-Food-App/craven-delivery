import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Sparkles, Zap, Shield, Clock } from "lucide-react";
import cravemoreIcon from "@/assets/cravemore-icon.png";
import mainHeroImage from "@/assets/main-hero-image.png";
import { CraveMoreText } from "@/components/ui/cravemore-text";
import { useCraveMoreOffer } from "@/hooks/useCraveMoreOffer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { analytics } from "@/utils/cravemoreAnalytics";

const Hero = () => {
  const navigate = useNavigate();
  const { offer, loading: offerLoading } = useCraveMoreOffer();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const handlePlanCheckout = async (planKey?: string) => {
    if (!planKey) {
      navigate('/cravemore');
      return;
    }
    try {
      setCheckoutLoading(planKey);
      analytics.planSelected(planKey);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate(`/login?redirect=/cravemore`);
        return;
      }

      analytics.checkoutStarted(planKey);
      const { data, error } = await supabase.functions.invoke('create-cravemore-checkout', {
        body: { planKey },
      });

      if (error) {
        console.error('CraveMore checkout error:', error);
        toast.error('Unable to start checkout. Please try again.');
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else if (data?.error) {
        toast.error(data.error);
      } else {
        toast.error('No checkout URL returned. Please try again.');
      }
    } catch (err: any) {
      console.error('CraveMore checkout exception:', err);
      toast.error(err?.message || 'Failed to start checkout.');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const benefits = [
    { icon: Zap, text: "Zero delivery fees with", highlight: true },
    { icon: Shield, text: "Priority customer support" },
    { icon: Clock, text: "Exclusive early access to new restaurants" },
    { icon: Sparkles, text: "Special member-only discounts" }
  ];

  // Convert offer plans to pricing tiers format
  const pricingTiers = offer?.plans.map((plan) => {
    const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;
    
    let price = formatPrice(plan.priceCents);
    let period = plan.billingPeriod === 'one_time' ? 'one-time' : 
                 plan.billingPeriod === 'year' ? 'per year' : 'per month';
    
    let savings: string | undefined;
    if (plan.annualSavings && plan.annualSavings > 0) {
      savings = `Save ${formatPrice(plan.annualSavings)} per year`;
    } else if (plan.planKey === 'lifetime' && plan.lifetimeRemaining !== null) {
      savings = `Limited to first 1,000 customers`;
    }

    const features = plan.planKey === 'monthly' 
      ? ["All benefits", "Cancel anytime", "Instant activation"]
      : plan.planKey === 'annual'
      ? ["All benefits", "2 months free", "Best value"]
      : ["All benefits", "Never pay again", "Exclusive founding member status"];

    return {
      name: plan.displayName,
      price,
      period,
      savings,
      features,
      popular: plan.isMostPopular,
      limited: plan.planKey === 'lifetime',
      planKey: plan.planKey,
      lifetimeAvailable: plan.lifetimeAvailable,
    };
  }) || [
    // Fallback if loading
    {
      name: "Monthly",
      price: "$9.49",
      period: "per month",
      features: ["All benefits", "Cancel anytime", "Instant activation"]
    },
    {
      name: "Annual",
      price: "$89.00",
      period: "per year",
      savings: "Save $24.88 per year",
      features: ["All benefits", "2 months free", "Best value"],
      popular: true
    },
    {
      name: "Lifetime",
      price: "$299.00",
      period: "one-time",
      savings: "Limited to first 1,000 customers",
      features: ["All benefits", "Never pay again", "Exclusive founding member status"],
      limited: true
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
        {/* Hero Image Background */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${mainHeroImage})`,
          }}
        >
          {/* Overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/50" />
        </div>
        
        {/* Hero Content */}
        <div className="relative z-10 text-center text-white px-4 animate-fade-in">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight drop-shadow-lg">
              Crave'n
            </h1>
            
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight drop-shadow-lg">
              Your Local Food Delivery Partner
            </h2>
            
            <p className="text-lg md:text-xl lg:text-2xl mb-8 opacity-95 font-medium max-w-3xl mx-auto drop-shadow-md">
              We connect you with the best local restaurants in your area, delivering delicious meals right to your door with unbeatable service and value.
            </p>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-16 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-foreground">Who We Are</h2>
            <div className="text-lg text-muted-foreground max-w-4xl mx-auto space-y-6 text-left">
              <p>
                Crave'n is a next-generation delivery platform built on a simple belief: when local businesses are treated fairly, entire communities grow stronger.
              </p>
              <p>
                We created Crave'n after experiencing the realities of the delivery industry from both sides. From merchants being forced to sacrifice margins just to stay competitive, to drivers working under systems that promised independence while limiting real flexibility and opportunity, it became clear that the industry needed a better balance.
              </p>
              <p>
                Founded by entrepreneur Torrance Stroman, Crave'n was built around honesty, transparency, opportunity, and long-term sustainability for everyone involved in the delivery ecosystem. Our platform helps restaurants expand their reach without excessive commission structures while creating fairer opportunities for drivers and a better experience for customers.
              </p>
              <p>
                Crave'n represents more than food delivery. It represents community, fairness, and building a platform where merchants grow, drivers succeed, customers feel valued, and local economies become stronger.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CraveMore Section */}
      <section className="py-8 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <img 
                src={cravemoreIcon} 
                alt="CraveMore" 
                className="w-12 h-12 animate-fade-in"
              />
              <div>
                <div className="inline-flex items-center gap-2 bg-orange-500/10 text-orange-600 dark:text-orange-400 px-3 py-1 rounded-full text-sm mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span className="font-semibold">Introducing <CraveMoreText /></span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                  Unlimited Perks, Zero Delivery Fees
                </h2>
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center md:text-right max-w-xs">
              Join <CraveMoreText /> and unlock unlimited benefits
            </p>
          </div>

          {/* Benefits Inline */}
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 mb-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <benefit.icon className="w-5 h-5 text-orange-500 flex-shrink-0" />
                <span className="font-medium text-foreground">
                  {benefit.text}
                  {benefit.highlight && <> <CraveMoreText className="inline" /></>}
                </span>
              </div>
            ))}
          </div>

          {/* Pricing Tiers */}
          <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {pricingTiers.map((tier, index) => (
              <Card 
                key={index} 
                className={`p-4 relative flex flex-col ${tier.popular ? 'border-orange-500 border-2' : ''} ${tier.limited ? 'border-orange-600 border-2' : ''}`}
              >
                {/* Badge area - consistent height for all cards */}
                <div className="h-6 mb-2 flex items-center justify-center">
                  {tier.popular && (
                    <div className="bg-orange-500 text-white px-3 py-0.5 rounded-full text-xs font-semibold">
                      Most Popular
                    </div>
                  )}
                  {tier.limited && (
                    <div className="bg-orange-600 text-white px-3 py-0.5 rounded-full text-xs font-semibold">
                      Limited Offer
                    </div>
                  )}
                </div>
                
                <div className="text-center mb-4 flex-shrink-0">
                  <h3 className="text-lg font-bold mb-1 text-foreground">{tier.name}</h3>
                  <div className="text-2xl font-bold text-orange-500 mb-0.5">{tier.price}</div>
                  <p className="text-xs text-muted-foreground">{tier.period}</p>
                  {tier.savings && (
                    <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mt-1">
                      {tier.savings}
                    </p>
                  )}
                </div>

                <ul className="space-y-1.5 mb-4 flex-grow">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <Check className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 text-sm mt-auto"
                  onClick={() => navigate('/cravemore')}
                  disabled={tier.lifetimeAvailable === false}
                >
                  {tier.lifetimeAvailable === false ? 'Sold Out' : 'Get Started'}
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-hero">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            Ready to Start Saving?
          </h2>
          <p className="text-lg text-white/90 mb-8">
            Join thousands of satisfied customers who are already enjoying unlimited benefits
          </p>
          <Button 
            size="lg"
            onClick={() => navigate('/restaurants')}
            className="h-14 px-12 text-lg font-bold bg-white text-orange-500 hover:bg-white/90 shadow-2xl rounded-xl transform hover:scale-105 transition-all duration-300"
          >
            <span className="flex items-center gap-2">
              Order Now & Join <CraveMoreText />
            </span>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Hero;
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, DollarSign, TrendingUp, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import becomeDriverHero from "@/assets/20251002_2239_Animated-Logo-Driver_remix_01k6kyy1m7f108g2r5qjd0a8x8.png";

const FeederHub = () => {
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length === 0) return '';
    if (numbers.length <= 3) return `(${numbers}`;
    if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
  };

  useEffect(() => {
    const fetchMarketingSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('marketing_settings')
          .select('feeder_hero_image_url')
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching marketing settings:', error);
          return;
        }
        
        if (data?.feeder_hero_image_url) {
          setHeroImageUrl(data.feeder_hero_image_url);
        }
      } catch (error: any) {
        console.error('Error fetching marketing settings:', error);
      }
    };

    fetchMarketingSettings();
  }, []);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneNumber(formatPhoneNumber(e.target.value));
  };

  const generateSecurePassword = () => {
    // Generate a secure random password
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber || !emailAddress) {
      toast.error('Please enter both phone number and email address');
      return;
    }

    setIsSubmitting(true);

    try {
      // Format phone number (remove formatting, keep only digits)
      const formattedPhone = countryCode + phoneNumber.replace(/\D/g, '');
      
      // Check if user is already logged in
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (currentUser) {
        // User is logged in - update their phone number
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ 
            phone: formattedPhone,
            email: emailAddress 
          })
          .eq('user_id', currentUser.id);

        if (updateError) {
          throw updateError;
        }

        toast.success('Phone number updated successfully!');
        navigate('/driver-onboarding/apply');
        return;
      }

      // Create new account
      const tempPassword = generateSecurePassword();
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: emailAddress,
        password: tempPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/driver-onboarding/apply`,
          data: {
            phone: formattedPhone,
            user_type: 'driver'
          }
        }
      });

      if (authError) {
        // If user already exists in auth but not in profiles
        if (authError.message.includes('already registered')) {
          toast.error('An account with this email already exists. Please login.');
          navigate('/driver/auth');
          return;
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      // Wait a moment for the trigger to create user_profile
      await new Promise(resolve => setTimeout(resolve, 500));

      // Update user profile with phone number
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ 
          phone: formattedPhone,
          email: emailAddress,
          role: 'driver'
        })
        .eq('user_id', authData.user.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        // Profile might not exist yet, try to insert
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: authData.user.id,
            phone: formattedPhone,
            email: emailAddress,
            role: 'driver'
          });

        if (insertError) {
          console.error('Error inserting profile:', insertError);
        }
      }

      // Send password reset email so user can set their own password
      await supabase.auth.resetPasswordForEmail(emailAddress, {
        redirectTo: `${window.location.origin}/driver-onboarding/apply?reset=true`,
      });

      toast.success('Account created! Please check your email to set your password.');
      
      // Navigate to driver onboarding
      navigate('/driver-onboarding/apply', { 
        state: { phone: formattedPhone, email: emailAddress } 
      });

    } catch (error: any) {
      console.error('Error registering:', error);
      toast.error(error.message || 'Failed to register. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const earnings = [
    {
      title: "BASE PAY",
      description: "You'll always earn Base Pay for any delivery accepted on Crave'n. Base Pay is calculated based on the estimated time, distance, and desirability of the delivery.",
      image: "https://images.unsplash.com/photo-1619677930164-3f5b6d6b5c6a?w=400&h=300&fit=crop"
    },
    {
      title: "PLUS TIPS",
      description: "Customers using Crave'n can tip you anytime you choose to accept a delivery — and most deliveries include a tip. You'll always receive 100% of the customer tips.",
      image: "https://images.unsplash.com/photo-1556742111-a301076d9d18?w=400&h=300&fit=crop"
    },
    {
      title: "PLUS PROMOTIONS",
      description: "Promotions like Peak Pay, Challenges, and Delivery Streaks help you earn more.",
      items: [
        "Peak Pay pays you more per delivery.",
        "Challenges let you earn extra money for completing a certain number of deliveries in a set amount of time."
      ],
      image: "https://images.unsplash.com/photo-1607013251379-e6eecfffe234?w=400&h=300&fit=crop"
    }
  ];

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif" }}>
      <Header />
      
      {/* Hero Section - Split Screen */}
      <section className="grid lg:grid-cols-2 min-h-screen">
        {/* Left Section - White Background */}
        <div 
          className="bg-white p-12 lg:p-20 lg:pl-24 flex flex-col justify-center relative"
          style={{ paddingTop: '80px', paddingBottom: '80px' }}
        >
          {/* Black Triangle Accent */}
          <div 
            className="absolute bottom-0 right-0 w-48 h-48 bg-black"
            style={{ clipPath: 'polygon(100% 100%, 0% 100%, 100% 0%)' }}
          ></div>

          <h1 
            className="text-5xl lg:text-7xl font-black text-black mb-6 leading-none uppercase"
            style={{ letterSpacing: '-2px' }}
          >
            EARN WITH THE BEST
          </h1>
          
          <p className="text-xl lg:text-2xl text-[#191919] mb-12 leading-relaxed font-medium max-w-xl">
            Deliver with Crave'n and get more opportunities to earn.
          </p>

          {/* Signup Form Card */}
          <div className="bg-white rounded-3xl p-8 lg:p-10 max-w-lg shadow-lg relative z-10">
            <h2 
              className="text-2xl font-extrabold text-[#5D1049] mb-8 uppercase"
              style={{ letterSpacing: '-0.5px' }}
            >
              SIGN UP TO BECOME A FEEDER
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Phone Input Group */}
              <div className="grid grid-cols-[140px_1fr] gap-3">
                <Select value={countryCode} onValueChange={setCountryCode}>
                  <SelectTrigger className="h-12 border-2 border-[#E0E0E0] rounded-lg font-semibold text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem key="us" value="+1">+1 (US)</SelectItem>
                    <SelectItem key="uk" value="+44">+44 (UK)</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="tel"
                  placeholder="Phone Number"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  className="h-12 border-2 border-[#E0E0E0] rounded-lg text-base focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/10"
                  required
                />
              </div>

              {/* Email Input */}
              <Input
                type="email"
                placeholder="Email Address"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                className="h-12 border-2 border-[#E0E0E0] rounded-lg text-base focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/10"
                required
              />

              {/* Terms Text */}
              <p className="text-sm text-[#666] leading-relaxed">
                By clicking "Continue," I agree to the{" "}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/independent-contractor-agreement');
                  }}
                  className="text-[#FF6B00] underline font-semibold hover:text-[#E65F00]"
                >
                  Independent Contractor Agreement
                </button>{" "}
                and have read the{" "}
                <a href="#" className="text-[#FF6B00] underline font-semibold">Feeder Privacy Policy</a>.
              </p>

              {/* Continue Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-14 bg-[#FF6B00] hover:bg-[#E65F00] text-white rounded-full text-lg font-extrabold uppercase shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ letterSpacing: '0.5px' }}
              >
                {isSubmitting ? 'Creating Account...' : 'Continue'}
              </Button>
            </form>
          </div>
        </div>

        {/* Right Section - Image Background */}
        <div 
          className="relative overflow-hidden"
          style={{
            backgroundImage: `url(${heroImageUrl || becomeDriverHero})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          {/* Fallback gradient overlay if no image */}
          {!heroImageUrl && (
            <div className="absolute inset-0 bg-gradient-to-br from-[#FFE8D9] to-[#FFD4B8]"></div>
          )}
          
          {/* Black Accent */}
          <div 
            className="absolute top-0 right-0 w-72 h-72 bg-black z-10"
            style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 0)' }}
          ></div>

          {/* Location Tag */}
          <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 bg-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 z-20">
            <div className="w-4 h-4 bg-[#FF6B00] rounded-full"></div>
            <span className="text-sm font-semibold text-[#191919]">Feeder from Toledo, OH</span>
          </div>
        </div>
      </section>

      {/* How Much Can I Earn Section */}
      <section className="py-24 px-6 lg:px-24 max-w-7xl mx-auto">
        <h2 
          className="text-4xl lg:text-5xl font-black text-[#FF6B00] text-center mb-16 uppercase"
          style={{ letterSpacing: '-1px' }}
        >
          HOW MUCH CAN I EARN?
        </h2>

        <div className="grid md:grid-cols-3 gap-10">
          {earnings.map((earning, index) => (
            <div key={index} className="flex flex-col">
              <div className="w-full h-72 rounded-xl overflow-hidden mb-6 bg-gray-200">
                <img 
                  src={earning.image} 
                  alt={earning.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <h3 
                  className="text-lg font-black text-[#5D1049] mb-4 uppercase"
                  style={{ letterSpacing: '0.5px' }}
                >
                  {earning.title}
                </h3>
                <p className="text-base text-[#191919] leading-relaxed mb-4">
                  {earning.description}
                </p>
                {earning.items && (
                  <ul className="space-y-3">
                    {earning.items.map((item, idx) => (
                      <li key={idx} className="text-base text-[#191919] leading-relaxed pl-6 relative">
                        <span className="absolute left-0 text-[#FF6B00] font-black text-xl">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default FeederHub;

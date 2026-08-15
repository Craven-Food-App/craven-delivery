// @ts-nocheck
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
import { PhoneVerificationModal } from "@/components/feeder/PhoneVerificationModal";
import { validateEmail, validatePhone, sanitizeForDB } from "@/utils/validation";

const FeederHub = () => {
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

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

  // Debug: Log when verification modal state changes
  useEffect(() => {
    console.log('Verification modal state changed:', showVerificationModal);
    if (showVerificationModal) {
      console.log('Modal should be visible now. Phone:', phoneNumber, 'Email:', emailAddress, 'Country Code:', countryCode);
    }
  }, [showVerificationModal, phoneNumber, emailAddress, countryCode]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneNumber(formatPhoneNumber(e.target.value));
  };

  // Generate a random preset password for new drivers
  const generatePresetPassword = () => {
    // Generate a secure random password
    // Format: [RandomChars][Number][SpecialChar][RandomChars][Number]
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude confusing letters
    const lowercase = 'abcdefghijkmnpqrstuvwxyz'; // Exclude confusing letters
    const numbers = '23456789'; // Exclude 0, 1
    const specialChars = '!@#$%&*';
    
    // Generate random parts
    const getRandomChar = (chars: string) => chars[Math.floor(Math.random() * chars.length)];
    const getRandomString = (length: number, chars: string) => {
      return Array.from({ length }, () => getRandomChar(chars)).join('');
    };
    
    const part1 = getRandomString(4, uppercase + lowercase); // 4 random letters
    const num1 = getRandomString(3, numbers); // 3-digit number
    const special = getRandomChar(specialChars); // 1 special char
    const part2 = getRandomString(3, uppercase + lowercase); // 3 random letters
    const num2 = getRandomString(2, numbers); // 2-digit number
    
    return `${part1}${num1}${special}${part2}${num2}`;
  };

  const createAccountAfterVerification = async () => {
    setIsSubmitting(true);
    try {
      // Validate and sanitize inputs again (defense in depth)
      const emailValidation = validateEmail(emailAddress);
      if (!emailValidation.isValid) {
        toast.error('Invalid email address');
        setIsSubmitting(false);
        return;
      }

      const phoneValidation = validatePhone(phoneNumber);
      if (!phoneValidation.isValid) {
        toast.error('Invalid phone number');
        setIsSubmitting(false);
        return;
      }

      const sanitizedEmail = emailValidation.sanitized;
      const sanitizedPhone = phoneValidation.sanitized;

      // Format phone number (remove formatting, keep only digits)
      const formattedPhone = countryCode + sanitizedPhone.replace(/\D/g, '');
      
      // Generate a random preset password for this user
      const presetPassword = generatePresetPassword();
      
      // Create account after phone verification with preset password
      // User will be required to change password on first login
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password: presetPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/driver-onboarding/apply`,
          data: {
            phone: formattedPhone,
            user_type: 'driver'
          }
        }
      });

      // Check for various error messages indicating email already exists
      if (authError) {
        const errorMsg = authError.message.toLowerCase();
        const errorCode = authError.status || authError.code;
        
        // Check for email already exists errors
        if (
          errorMsg.includes('already registered') ||
          errorMsg.includes('user already registered') ||
          errorMsg.includes('email address is already in use') ||
          errorMsg.includes('email already exists') ||
          errorMsg.includes('user already exists') ||
          errorMsg.includes('already been registered') ||
          errorCode === 400 ||
          errorCode === 422
        ) {
          toast.error('An account with this email already exists. Please login.');
          setIsSubmitting(false);
          setShowVerificationModal(false);
          return;
        }
        // For other errors, still show error but don't proceed
        console.error('Signup error:', authError);
        toast.error(authError.message || 'Failed to create account. Please try again.');
        setIsSubmitting(false);
        setShowVerificationModal(false);
        return;
      }

      // If no user was created, the email likely already exists or signup failed
      if (!authData || !authData.user) {
        toast.error('An account with this email already exists. Please login.');
        setIsSubmitting(false);
        setShowVerificationModal(false);
        return;
      }

      // Verify the user was actually created by checking the user ID
      if (!authData.user || !authData.user.id) {
        toast.error('Failed to create account. Please try again or login if you already have an account.');
        setIsSubmitting(false);
        setShowVerificationModal(false);
        return;
      }

      // Wait a moment for the trigger to create user_profile
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify user profile was created or create it
      const { data: existingProfileCheck } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('user_id', authData.user.id)
        .maybeSingle();

      if (!existingProfileCheck) {
        // Profile doesn't exist, create it
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: authData.user.id,
            phone: formattedPhone,
            email: sanitizedEmail,
            role: 'driver'
          });

        if (insertError) {
          console.error('Error inserting profile:', insertError);
          // Don't fail here, profile might be created by trigger
        }
      } else {
        // Update existing profile
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update({ 
            phone: formattedPhone,
            email: sanitizedEmail,
            role: 'driver'
          })
          .eq('user_id', authData.user.id);

        if (profileError) {
          console.error('Error updating profile:', profileError);
        }
      }

      // Save to localStorage for pre-filling
      // Store in localStorage (less sensitive, but still use secure storage for consistency)
      const { secureSetItem } = await import('@/utils/storage');
      secureSetItem('feeder_signup_email', sanitizedEmail, 24); // 24 hour expiration
      secureSetItem('feeder_signup_phone', formattedPhone, 24);

      // Mark user as needing password reset on first login
      await supabase
        .from('user_profiles')
        .update({ 
          needs_password_reset: true 
        })
        .eq('user_id', authData.user.id);

      // Send welcome email with the generated preset password
      try {
        await supabase.functions.invoke('send-driver-welcome-email', {
          body: {
            driverName: sanitizedEmail.split('@')[0],
            driverEmail: sanitizedEmail,
            presetPassword: presetPassword,
            isNewSignup: true
          }
        });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail the signup if email fails
      }

      // Show success message with instructions
      toast.success(
        'Account created! Check your email for login credentials — and check Spam/Junk if you do not see it. You will set a new password on first login.',
        { duration: 12000 }
      );

      // Navigate to driver onboarding with email and phone
      navigate('/driver-onboarding/apply', { 
        state: { phone: formattedPhone, email: sanitizedEmail } 
      });
      setIsSubmitting(false);
      setShowVerificationModal(false);
    } catch (error: any) {
      console.error('Error creating account:', error);
      toast.error(error.message || 'Failed to create account. Please try again.');
      setIsSubmitting(false);
      setShowVerificationModal(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber || !emailAddress) {
      toast.error('Please enter both phone number and email address');
      return;
    }

    // Validate and sanitize inputs
    const emailValidation = validateEmail(emailAddress);
    if (!emailValidation.isValid) {
      toast.error('Please enter a valid email address');
      return;
    }

    const phoneValidation = validatePhone(phoneNumber);
    if (!phoneValidation.isValid) {
      toast.error('Please enter a valid phone number');
      return;
    }

    // Use sanitized values
    const sanitizedEmail = emailValidation.sanitized;
    const sanitizedPhone = phoneValidation.sanitized;

    console.log('Form submitted, phone:', sanitizedPhone, 'email:', sanitizedEmail);
    setIsSubmitting(true);

    try {
      // Format phone number (remove formatting, keep only digits)
      const formattedPhone = countryCode + sanitizedPhone.replace(/\D/g, '');
      
      // Check if user is already logged in
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      console.log('Current user check:', currentUser ? 'Logged in' : 'Not logged in');
      
      if (currentUser) {
        // User is logged in - check if they already have an application
        const { data: existingApp } = await supabase
          .from('feeder_applications')
          .select('id')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        if (existingApp) {
          toast.error('You already have an application. Please check your account.');
          setIsSubmitting(false);
          return;
        }

        // Even for logged-in users, require phone verification for new signups
        console.log('User logged in, but requiring phone verification for new signup');
        // Continue to verification modal below
      }

      // Check if email or phone exists in user_profiles
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('user_id, email, phone')
        .or(`email.eq.${sanitizedEmail},phone.eq.${formattedPhone}`)
        .maybeSingle();

      // Check if phone or email exists in feeder_applications
      const { data: existingApplication } = await supabase
        .from('feeder_applications')
        .select('id, email, phone')
        .or(`email.eq.${sanitizedEmail},phone.eq.${formattedPhone}`)
        .maybeSingle();

      if (existingProfile || existingApplication) {
        const conflictType = existingProfile?.email === sanitizedEmail || existingApplication?.email === sanitizedEmail
          ? 'email'
          : 'phone';
        toast.error(`This ${conflictType} is already registered. Please login or use a different ${conflictType}.`);
        setIsSubmitting(false);
        return;
      }

      // All checks passed - show phone verification modal
      console.log('All checks passed, showing phone verification modal');
      console.log('Phone:', phoneNumber, 'Email:', emailAddress, 'Country Code:', countryCode);
      setIsSubmitting(false);
      // Force a re-render by using a small delay
      requestAnimationFrame(() => {
        console.log('Setting showVerificationModal to true');
        setShowVerificationModal(true);
      });
    } catch (error: any) {
      console.error('Error validating:', error);
      toast.error(error.message || 'Failed to validate. Please try again.');
      setIsSubmitting(false);
    }
  };


  const earnings = [
    {
      title: "Guaranteed Base Pay",
      subtitle: "Every delivery counts",
      description: "Every delivery you accept on Crave'n comes with guaranteed Base Pay. We calculate this based on the time it takes, distance traveled, and how in-demand the delivery is. No guesswork—just fair compensation for every trip.",
      icon: "💰",
      accent: "bg-gradient-to-br from-[#FF6B00] to-[#FF8C42]",
      textColor: "text-white"
    },
    {
      title: "Keep 100% of Tips",
      subtitle: "All yours, always",
      description: "When customers tip you through Crave'n, you keep every single dollar. We never take a cut. Most deliveries include tips, and customers can add them anytime—even after you've completed the delivery.",
      icon: "💵",
      accent: "bg-gradient-to-br from-[#5D1049] to-[#7A1A5F]",
      textColor: "text-white"
    },
    {
      title: "Boost Your Earnings",
      subtitle: "More ways to earn",
      description: "Take advantage of special promotions designed to maximize your income:",
      items: [
        "Peak Pay: Earn extra during busy times",
        "Challenges: Hit delivery goals for bonus payouts",
        "Delivery Streaks: Consistent deliveries unlock rewards"
      ],
      icon: "🚀",
      accent: "bg-gradient-to-br from-black to-[#2A2A2A]",
      textColor: "text-white"
    }
  ];

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif" }}>
      <Header />
      
      {/* Hero Section - Split Screen */}
      <section className="grid lg:grid-cols-2 min-h-[70vh]">
        {/* Left Section - White Background */}
        <div 
          className="bg-white p-6 lg:p-12 lg:pl-16 flex flex-col justify-center relative"
          style={{ paddingTop: '60px', paddingBottom: '60px' }}
        >
          {/* Black Triangle Accent */}
          <div 
            className="absolute bottom-0 right-0 w-32 h-32 bg-black"
            style={{ clipPath: 'polygon(100% 100%, 0% 100%, 100% 0%)' }}
          ></div>

          <h1 
            className="text-4xl lg:text-5xl font-black text-black mb-4 leading-tight uppercase"
            style={{ letterSpacing: '-1px' }}
          >
            EARN WITH THE BEST
          </h1>
          
          <p className="text-lg lg:text-xl text-[#191919] mb-8 leading-relaxed font-medium max-w-xl">
            Deliver with Crave'n and get more opportunities to earn.
          </p>

          {/* Signup Form Card */}
          <div className="bg-white rounded-2xl p-6 lg:p-8 max-w-lg shadow-lg relative z-10">
            <h2 
              className="text-xl lg:text-2xl font-extrabold text-[#5D1049] mb-6 uppercase"
              style={{ letterSpacing: '-0.5px' }}
            >
              SIGN UP TO BECOME A FEEDER
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Phone Input Group */}
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <Select value={countryCode} onValueChange={setCountryCode}>
                  <SelectTrigger className="h-11 border-2 border-[#E0E0E0] rounded-lg font-semibold text-sm">
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
                  className="h-11 border-2 border-[#E0E0E0] rounded-lg text-sm focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/10"
                  required
                />
              </div>

              {/* Email Input */}
              <Input
                type="email"
                placeholder="Email Address"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                className="h-11 border-2 border-[#E0E0E0] rounded-lg text-sm focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/10"
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
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/feeder-privacy-policy');
                  }}
                  className="text-[#FF6B00] underline font-semibold hover:text-[#E65F00]"
                >
                  Feeder Privacy Policy
                </button>.
              </p>

              {/* Continue Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 bg-[#FF6B00] hover:bg-[#E65F00] text-white rounded-full text-base font-extrabold uppercase shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="absolute top-0 right-0 w-48 h-48 bg-black z-10"
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
      <section className="py-16 lg:py-20 px-6 lg:px-16 bg-gradient-to-b from-white to-[#FAFAFA]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 
              className="text-3xl lg:text-4xl font-black text-[#FF6B00] mb-3 uppercase"
              style={{ letterSpacing: '-1px' }}
            >
              Your Earnings, Your Way
            </h2>
            <p className="text-lg text-[#666] max-w-2xl mx-auto">
              Three powerful ways to build your income with Crave'n
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {earnings.map((earning, index) => (
              <div 
                key={index} 
                className={`relative ${earning.accent} rounded-xl p-6 lg:p-8 shadow-xl transform transition-all duration-300 hover:scale-105 hover:shadow-2xl`}
                style={{ minHeight: '320px' }}
              >
                {/* Icon */}
                <div className="text-5xl mb-4">{earning.icon}</div>
                
                {/* Content */}
                <div className="flex-1">
                  <div className="mb-2">
                    <span className={`text-xs font-bold ${earning.textColor} opacity-80 uppercase tracking-wider`}>
                      {earning.subtitle}
                    </span>
                  </div>
                  <h3 
                    className={`text-xl lg:text-2xl font-black ${earning.textColor} mb-3 leading-tight`}
                    style={{ letterSpacing: '-0.5px' }}
                  >
                    {earning.title}
                  </h3>
                  <p className={`${earning.textColor} leading-relaxed mb-4 opacity-95 text-sm lg:text-base`}>
                    {earning.description}
                  </p>
                  {earning.items && (
                    <ul className="space-y-2">
                      {earning.items.map((item, idx) => (
                        <li key={idx} className={`${earning.textColor} leading-relaxed pl-5 relative opacity-95 text-sm`}>
                          <span className="absolute left-0 text-lg font-black">✓</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Decorative element */}
                <div className={`absolute bottom-0 right-0 w-32 h-32 ${earning.textColor} opacity-5`} style={{ 
                  clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
                  transform: 'scale(2)'
                }}></div>
              </div>
            ))}
          </div>

          {/* Bottom CTA Section */}
          <div className="mt-12 text-center">
            <div className="inline-block bg-white rounded-full px-6 py-3 shadow-lg">
              <p className="text-base font-semibold text-[#191919]">
                <span className="text-[#FF6B00] font-black">Ready to start earning?</span> Sign up above to get started.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {/* Phone Verification Modal */}
      <PhoneVerificationModal
        open={showVerificationModal}
        phoneNumber={phoneNumber}
        countryCode={countryCode}
        email={emailAddress}
        onVerified={createAccountAfterVerification}
        onClose={() => {
          console.log('Closing verification modal');
          setShowVerificationModal(false);
          setIsSubmitting(false);
        }}
      />
    </div>
  );
};

export default FeederHub;

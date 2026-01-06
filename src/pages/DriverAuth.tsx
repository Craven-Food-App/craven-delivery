import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Truck, Car } from "lucide-react";
import { WelcomeConfetti } from "@/components/driver/WelcomeConfetti";
import { BackgroundCheckStatus } from "@/components/driver/BackgroundCheckStatus";

interface ApplicationRecord {
  status: string | null;
  first_name: string | null;
  welcome_screen_shown: boolean | null;
  onboarding_completed_at: string | null;
  contract_signed_at: string | null;
  payout_method: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  vehicle_color: string | null;
  vehicle_type: string | null;
  license_plate: string | null;
  date_of_birth: string | null;
  street_address: string | null;
  drivers_license: string | null;
  license_state: string | null;
  license_expiry: string | null;
  drivers_license_front: string | null;
  drivers_license_back: string | null;
  insurance_provider: string | null;
  insurance_policy: string | null;
  insurance_document: string | null;
  background_check_consent: boolean | null;
  criminal_history_consent: boolean | null;
  facial_image_consent: boolean | null;
  electronic_1099_consent: boolean | null;
  w9_signed: boolean | null;
  background_check: boolean | null;
  background_check_approved_at: string | null;
}

const DriverAuth = () => {
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showWelcomeConfetti, setShowWelcomeConfetti] = useState(false);
  const [showBackgroundCheckStatus, setShowBackgroundCheckStatus] = useState(false);
  const [firstName, setFirstName] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Navigate immediately - let dashboard handle routing
        navigate('/mobile');
      }
    };
    checkAuth();
  }, [navigate]);

  const handlePostLoginRouting = async (userId: string) => {
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );

      const queryPromise = supabase
        .from('craver_applications')
        .select(`
          status,
          first_name,
          welcome_screen_shown,
          onboarding_completed_at,
          contract_signed_at,
          payout_method,
          vehicle_make,
          vehicle_model,
          vehicle_year,
          vehicle_color,
          vehicle_type,
          license_plate,
          date_of_birth,
          street_address,
          drivers_license,
          license_state,
          license_expiry,
          drivers_license_front,
          drivers_license_back,
          insurance_provider,
          insurance_policy,
          insurance_document,
          background_check_consent,
          criminal_history_consent,
          facial_image_consent,
          electronic_1099_consent,
          w9_signed,
          background_check,
          background_check_approved_at
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle<ApplicationRecord>();

      const result = await Promise.race([
        queryPromise,
        timeoutPromise
      ]);

      const { data, error } = result;

      if (error) {
        throw error;
      }

      const application = data;
      
      if (!application) {
        navigate('/feeder');
        return;
      }

      // If approved but haven't shown welcome confetti, show it!
      if (application.status === 'approved' && !application.welcome_screen_shown) {
        setFirstName(application.first_name ?? "");
        setShowWelcomeConfetti(true);
        return;
      }

      if (application.status !== 'approved') {
        setShowBackgroundCheckStatus(true);
        return;
      }

      // Application is approved - check onboarding status first
      // Primary check: If onboarding not complete, redirect to newest onboarding flow
      if (!application.onboarding_completed_at) {
        navigate('/enhanced-onboarding');
        return;
      }

      // Onboarding is complete - check if they need to complete required info
      // (This is a fallback for edge cases where onboarding is marked complete but info is missing)
      const requiredStrings: Array<keyof ApplicationRecord> = [
        'date_of_birth',
        'street_address',
        'drivers_license',
        'license_state',
        'license_expiry',
        'vehicle_type',
        'vehicle_make',
        'vehicle_model',
        'vehicle_color',
        'license_plate',
        'insurance_provider',
        'insurance_policy',
        'payout_method',
      ];

      const requiredDocuments: Array<keyof ApplicationRecord> = [
        'drivers_license_front',
        'drivers_license_back',
        'insurance_document',
      ];

      const requiredConsents: Array<keyof ApplicationRecord> = [
        'background_check_consent',
        'criminal_history_consent',
        'facial_image_consent',
        'electronic_1099_consent',
        'w9_signed',
      ];

      const hasAllStrings = requiredStrings.every((field) => {
        const value = application[field];
        return typeof value === 'string' && value.trim().length > 0;
      });

      const hasAllDocuments = requiredDocuments.every((field) => {
        const value = application[field];
        return typeof value === 'string' && value.trim().length > 0;
      });

      const hasAllConsents = requiredConsents.every((field) => application[field] === true);
      const hasVehicleYear = Boolean(application.vehicle_year);
      const hasContract = typeof application.contract_signed_at === 'string' && application.contract_signed_at.length > 0;

      // If required info not collected, go to post-waitlist onboarding
      const needsPostWaitlist = !hasAllStrings || !hasAllDocuments || !hasAllConsents || !hasVehicleYear || !hasContract;

      if (needsPostWaitlist) {
        navigate('/driver/post-waitlist-onboarding');
        return;
      }

      // All checks passed - onboarding complete and all info collected, proceed to dashboard
      navigate('/mobile');
    } catch (error) {
      console.error('Error checking application status:', error);
      toast({
        title: "Error",
        description: "Could not load your application status. Redirecting...",
        variant: "destructive",
      });
      // Fallback: navigate to feeder hub on error
      setTimeout(() => navigate('/feeder'), 2000);
    }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔐 [DriverAuth] Send code clicked, email:', email);
    
    if (!email.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    try {
      console.log('🔐 [DriverAuth] Sending 6-digit verification code...');
      
      // Use the new email verification function (sends 6-digit code directly, skips step 1)
      const { data, error } = await supabase.functions.invoke("send-email-verification-code", {
        body: {
          email: email.trim(),
        },
      });

      if (error) {
        console.error('❌ [DriverAuth] Function error:', error);
        throw new Error(error.message || "Failed to send verification code.");
      }

      if (data?.error) {
        console.error('❌ [DriverAuth] OTP send error:', data.error);
        throw new Error(data.error);
      }

      console.log('✅ [DriverAuth] Verification code sent successfully');
      setLoading(false);
      setCodeSent(true);
      
      toast({
        title: "Code sent!",
        description: "Check your email for a 6-digit verification code.",
      });
    } catch (error: any) {
      console.error('❌ [DriverAuth] Send code error:', error);
      setLoading(false);
      toast({
        title: "Failed to send code",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (verificationCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter the 6-digit code.",
        variant: "destructive",
      });
      return;
    }
    
    setVerifying(true);

    try {
      console.log('🔐 [DriverAuth] Verifying 6-digit code...');
      
      // Verify the 6-digit code and get sign-in link
      const { data, error } = await supabase.functions.invoke("verify-email-login", {
        body: {
          email: email.trim(),
          code: verificationCode,
        },
      });

      if (error) {
        console.error('❌ [DriverAuth] Function error:', error);
        throw new Error(error.message || "Failed to verify code.");
      }

      if (data?.error) {
        console.error('❌ [DriverAuth] Verification error:', data.error);
        throw new Error(data.error);
      }

      if (data?.verified && data?.signInLink) {
        console.log('✅ [DriverAuth] Code verified, signing in user...');
        setVerifying(false);
        
        toast({
          title: "Welcome back!",
          description: "Successfully signed in to your driver account.",
        });
        
        console.log('🚀 [DriverAuth] Navigating to sign-in link...');
        window.location.href = data.signInLink;
      } else {
        throw new Error(data?.error || "Invalid verification code.");
      }
    } catch (error: any) {
      console.error('❌ [DriverAuth] Verification error:', error);
      setVerifying(false);
      toast({
        title: "Verification Failed",
        description: error.message || "Please check the code and try again.",
        variant: "destructive",
      });
    }
  };

  const handleApplyRedirect = () => {
    navigate('/driver-onboarding/apply');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-primary">
            <Truck className="h-8 w-8" />
            <h1 className="text-3xl font-bold">Craven Delivery</h1>
          </div>
          <p className="text-muted-foreground">Driver Portal</p>
        </div>

        {/* Auth Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Driver Access
            </CardTitle>
            <CardDescription>
              Sign in to start earning or apply to become a driver
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!codeSent ? (
              <form onSubmit={handleSendCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="driver@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading}
                >
                  {loading ? "Sending Code..." : "Send Verification Code"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="text-center mb-4">
                  <p className="text-sm text-muted-foreground">
                    Enter the 6-digit code sent to
                  </p>
                  <p className="font-semibold">{email}</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="verification-code">Verification Code</Label>
                  <Input
                    id="verification-code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="------"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="text-center text-2xl tracking-widest font-mono"
                    required
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={verifying}
                >
                  {verifying ? "Verifying..." : "Verify Code"}
                </Button>
                
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setCodeSent(false);
                    setVerificationCode('');
                  }}
                >
                  Use different email
                </Button>
              </form>
            )}
              
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  New to Crave'n?
                </span>
              </div>
            </div>
            
            <Button 
              type="button"
              variant="outline"
              className="w-full" 
              onClick={handleApplyRedirect}
            >
              Apply to Become a Feeder
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Your account will be created when you submit your application
            </p>
          </CardContent>
        </Card>

        {/* Back to main */}
        <div className="text-center">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="text-muted-foreground"
          >
            ← Back to Home
          </Button>
        </div>
      </div>

      {/* Welcome Confetti Overlay */}
      {showWelcomeConfetti && (
        <WelcomeConfetti 
          firstName={firstName} 
          onComplete={() => setShowWelcomeConfetti(false)} 
        />
      )}

      {/* Background Check Status Overlay */}
      {showBackgroundCheckStatus && <BackgroundCheckStatus />}
    </div>
  );
};

export default DriverAuth;
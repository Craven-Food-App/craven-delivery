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
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
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

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔐 [DriverAuth] Sign-in clicked, email:', email);
    
    if (!email || !password) {
      toast({
        title: "Missing Information",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    try {
      console.log('🔐 [DriverAuth] Calling supabase.auth.signInWithPassword...');
      
      const { error, data } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      console.log('🔐 [DriverAuth] Auth result:', { error: error?.message, hasUser: !!data?.user });

      if (error) throw error;

      if (data.user) {
        console.log('✅ [DriverAuth] Login successful, navigating to /mobile');
        setLoading(false);

      toast({
        title: "Welcome back!",
        description: "Successfully signed in to your driver account.",
      });
        
        // Force navigation with window.location for reliability
        window.location.href = '/mobile';
      }
    } catch (error: any) {
      console.error('❌ [DriverAuth] Login error:', error);
      setLoading(false);
      toast({
        title: "Sign In Failed",
        description: error.message || "An error occurred during sign in.",
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
            <form onSubmit={handleSignIn} className="space-y-4">
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
              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? "Signing In..." : "Sign In"}
              </Button>
              
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
            </form>
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
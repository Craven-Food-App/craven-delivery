import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import RestaurantOnboardingWizard from "@/components/restaurant/onboarding/RestaurantOnboardingWizard";

const RestaurantRegister = () => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [signupData, setSignupData] = useState<any>(null);

  useEffect(() => {
    const checkExistingRestaurant = async () => {
      try {
        // Check for signup data from landing page
        const storedSignupData = localStorage.getItem('merchant_signup_data');
        let hasSignupData = false;
        
        if (storedSignupData) {
          try {
            const parsed = JSON.parse(storedSignupData);
            console.log('Found signup data:', parsed);
            setSignupData(parsed);
            hasSignupData = true;
            // Don't remove immediately - keep it until wizard is fully loaded
          } catch (e) {
            console.error('Error parsing signup data:', e);
          }
        }

        const { data: { user } } = await supabase.auth.getUser();
        
        // If not logged in and no signup data, redirect to landing page
        if (!user && !hasSignupData) {
          console.log('No user and no signup data, redirecting to signup');
          navigate('/merchant/signup', { replace: true });
          return;
        }
        
        // If not logged in but has signup data, proceed with onboarding
        if (!user && hasSignupData) {
          console.log('No user but has signup data, proceeding with onboarding');
          setChecking(false);
          return;
        }

        // User is logged in - check if they already have a restaurant
        // Use a non-single query to handle users with multiple restaurants
        const { data, error } = await supabase
          .from('restaurants')
          .select('id')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Error fetching restaurants for redirect:', error);
          setChecking(false);
          return;
        }

        if (data && data.length > 0) {
          // Restaurant exists - redirect to merchant portal
          console.log('Restaurant exists, redirecting to portal');
          navigate('/merchant-portal', { replace: true });
          return;
        }

        // User is logged in but no restaurant - proceed with onboarding
        console.log('User logged in but no restaurant, proceeding with onboarding');
        setChecking(false);
      } catch (error) {
        console.error('Error checking restaurant:', error);
        setChecking(false);
      }
    };

    checkExistingRestaurant();
  }, [navigate]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking your restaurant...</p>
        </div>
      </div>
    );
  }

  // Clear signup data from localStorage after wizard is mounted
  useEffect(() => {
    if (signupData) {
      // Clear after wizard has had time to read the data
      const timer = setTimeout(() => {
        localStorage.removeItem('merchant_signup_data');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [signupData]);

  return (
    <div className="w-full">
      <RestaurantOnboardingWizard initialData={signupData} />
    </div>
  );
};

export default RestaurantRegister;

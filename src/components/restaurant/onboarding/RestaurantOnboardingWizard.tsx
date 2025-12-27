import { useState } from "react";
import { useNavigate } from "react-router-dom";
import OnboardingHeader from "./OnboardingHeader";
import OnboardingSidebar from "./OnboardingSidebar";
import OrderMethodStep from "./steps/OrderMethodStep";
import StoreHoursStep from "./steps/StoreHoursStep";
import MenuSetupMethodStep from "./steps/MenuSetupMethodStep";
import { MenuBuilderStep } from "./steps/MenuBuilderStep";
import PricingPlanStep from "./steps/PricingPlanStep";
import { EnhancedBankingStep } from "./steps/EnhancedBankingStep";
import MobileVerificationModal from "./MobileVerificationModal";
import PhoneNumberReminderModal from "./PhoneNumberReminderModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ensureAuthenticatedForOnboarding } from "./utils/authHelper";

export interface OnboardingData {
  // Order Method
  orderMethod?: string;
  
  // Qualification
  restaurantType: string;
  hasPhysicalLocation: boolean;
  expectedMonthlyOrders: number;
  posSystem: string;
  
  // Basic Info
  restaurantName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  
  // Business Details
  legalBusinessName: string;
  businessType: 'llc' | 'corporation' | 'sole_proprietor' | 'partnership' | '';
  ein: string;
  yearsInBusiness: string;
  cuisineType: string;
  description: string;
  businessLicenseUrl: string;
  insuranceCertificateUrl: string;
  healthPermitUrl: string;
  
  // Owner Verification
  ownerIdUrl: string;
  ssnLast4: string;
  backgroundCheckAuthorized: boolean;
  
  // Location
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;
  
  // Store Hours
  storeHours?: Record<number, { open: string; close: string; closed: boolean }>;
  hours: {
    [key: string]: {
      isOpen: boolean;
      openTime: string;
      closeTime: string;
    };
  };
  
  // Menu Setup Method
  menuSetupMethod?: string;
  
  // Menu & Photos
  logoUrl: string;
  coverImageUrl: string;
  menuPdfUrl: string;
  menuItems: any[];
  
  // Delivery Settings
  deliveryRadius: number;
  minPrepTime: number;
  maxPrepTime: number;
  deliveryFeeCents: number;
  minimumOrderCents: number;
  
  // Banking
  bankAccountType: 'checking' | 'savings' | '';
  routingNumber: string;
  accountNumber: string;
  accountNumberConfirm: string;
  w9Completed: boolean;
  
  // Marketing
  marketingOptIn: boolean;
  commissionTier: string;
}

const INITIAL_DATA: OnboardingData = {
  orderMethod: "",
  restaurantType: '',
  hasPhysicalLocation: true,
  expectedMonthlyOrders: 0,
  posSystem: '',
  restaurantName: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  legalBusinessName: '',
  businessType: '',
  ein: '',
  yearsInBusiness: '',
  cuisineType: '',
  description: '',
  businessLicenseUrl: '',
  insuranceCertificateUrl: '',
  healthPermitUrl: '',
  ownerIdUrl: '',
  ssnLast4: '',
  backgroundCheckAuthorized: false,
  streetAddress: '',
  city: '',
  state: '',
  zipCode: '',
  menuSetupMethod: "",
  storeHours: {
    0: { open: "09:00", close: "22:00", closed: false },
    1: { open: "09:00", close: "22:00", closed: false },
    2: { open: "09:00", close: "22:00", closed: false },
    3: { open: "09:00", close: "22:00", closed: false },
    4: { open: "09:00", close: "22:00", closed: false },
    5: { open: "09:00", close: "22:00", closed: false },
    6: { open: "09:00", close: "22:00", closed: false },
  },
  hours: {
    monday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
    tuesday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
    wednesday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
    thursday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
    friday: { isOpen: true, openTime: '09:00', closeTime: '22:00' },
    saturday: { isOpen: true, openTime: '09:00', closeTime: '22:00' },
    sunday: { isOpen: true, openTime: '10:00', closeTime: '20:00' },
  },
  logoUrl: '',
  coverImageUrl: '',
  menuPdfUrl: '',
  menuItems: [],
  deliveryRadius: 5,
  minPrepTime: 20,
  maxPrepTime: 40,
  deliveryFeeCents: 299,
  minimumOrderCents: 1000,
  bankAccountType: '',
  routingNumber: '',
  accountNumber: '',
  accountNumberConfirm: '',
  w9Completed: false,
  marketingOptIn: false,
  commissionTier: 'basic',
};

const STEPS = [
  {
    id: "order-method",
    title: "Order method",
    component: OrderMethodStep,
    number: 1,
  },
  {
    id: "hours",
    title: "Store hours",
    component: StoreHoursStep,
    number: 2,
  },
  {
    id: "menu-method",
    title: "Menu setup method",
    component: MenuSetupMethodStep,
    number: 3,
  },
  {
    id: "menu",
    title: "Menu",
    component: MenuBuilderStep,
    number: 4,
  },
  {
    id: "pricing",
    title: "Pricing plan",
    component: PricingPlanStep,
    number: 5,
  },
  {
    id: "payout",
    title: "Payout info",
    component: EnhancedBankingStep,
    number: 6,
  },
];

export interface RestaurantOnboardingWizardProps {
  initialData?: any;
}

const RestaurantOnboardingWizard = (props: RestaurantOnboardingWizardProps = {}) => {
  const { initialData } = props || {};
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  
  // Merge initial data from landing page if provided
  const initialOnboardingData: OnboardingData = initialData ? {
    ...INITIAL_DATA,
    restaurantName: initialData.storeName || '',
    contactEmail: initialData.email || '',
    contactPhone: initialData.phone || '',
    streetAddress: initialData.storeAddress || '',
    city: initialData.city || '',
    state: initialData.state || '',
    zipCode: initialData.zipCode || '',
  } : INITIAL_DATA;
  
  const [data, setData] = useState<OnboardingData>(initialOnboardingData);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [wizardCompleted, setWizardCompleted] = useState(false);

  const handleCompleteOnboarding = async () => {
    try {
      // Validate required fields
      if (!data.contactEmail) {
        toast.error("Email is required to complete setup");
        return;
      }

      if (!data.restaurantName) {
        toast.error("Restaurant name is required");
        return;
      }

      // Ensure user is authenticated (creates account if needed)
      const user = await ensureAuthenticatedForOnboarding(data.contactEmail);
      
      if (!user) {
        toast.error("Unable to authenticate. Please try again.");
        return;
      }

      // Save progress to localStorage
      localStorage.setItem(`restaurant-onboarding-${user.id}`, JSON.stringify(data));

      // Create restaurant record
      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .insert({
          owner_id: user.id,
          name: data.restaurantName,
          description: data.description || '',
          cuisine_type: data.cuisineType || '',
          phone: data.contactPhone || '',
          email: data.contactEmail,
          address: data.streetAddress || '',
          city: data.city || '',
          state: data.state || '',
          zip_code: data.zipCode || '',
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          logo_url: data.logoUrl || null,
          image_url: data.coverImageUrl || null,
          min_delivery_time: data.minPrepTime || 20,
          max_delivery_time: data.maxPrepTime || 40,
          delivery_fee_cents: data.deliveryFeeCents || 299,
          minimum_order_cents: data.minimumOrderCents || 1000,
          delivery_radius_miles: data.deliveryRadius || 5,
          is_active: false, // Pending admin approval
          rating: 5.0,
          onboarding_status: 'pending',
          restaurant_type: data.restaurantType || '',
          expected_monthly_orders: data.expectedMonthlyOrders || 0,
        })
        .select()
        .single();

      if (restaurantError) {
        console.error('Error creating restaurant:', restaurantError);
        toast.error(`Failed to create restaurant: ${restaurantError.message}`);
        throw restaurantError;
      }

      if (!restaurant || !restaurant.id) {
        throw new Error('Restaurant was created but no ID was returned');
      }

      // Verify restaurant exists before proceeding
      const { data: verifyRestaurant, error: verifyError } = await supabase
        .from('restaurants')
        .select('id')
        .eq('id', restaurant.id)
        .single();

      if (verifyError || !verifyRestaurant) {
        console.error('Error verifying restaurant:', verifyError);
        throw new Error('Failed to verify restaurant creation');
      }

      // Save restaurant hours if provided
      if (data.storeHours && restaurant) {
        const hoursToInsert = Object.entries(data.storeHours).map(([day, hours]) => ({
          restaurant_id: restaurant.id,
          day_of_week: parseInt(day),
          open_time: hours.closed ? null : hours.open,
          close_time: hours.closed ? null : hours.close,
          is_closed: hours.closed || false,
        }));

        const { error: hoursError } = await supabase
          .from('restaurant_hours')
          .insert(hoursToInsert);

        if (hoursError) {
          console.warn('Failed to save restaurant hours:', hoursError);
          // Don't fail the whole process if hours fail
        }
      }

      // Send welcome email
      try {
        await supabase.functions.invoke('send-restaurant-welcome-email', {
          body: {
            restaurantName: data.restaurantName,
            ownerEmail: data.contactEmail,
            ownerName: data.contactName || '',
          },
        });
      } catch (emailError) {
        console.warn('Failed to send welcome email:', emailError);
        // Don't fail the whole process if email fails
      }

      toast.success("Setup completed! Redirecting to your dashboard...");
      
      // Wait a moment for database to be ready, then navigate
      // Also force a page reload to ensure the restaurant selector picks up the new restaurant
      setTimeout(() => {
        // Store restaurant ID in localStorage for the selector
        if (restaurant?.id) {
          localStorage.setItem('selected_restaurant_id', restaurant.id);
        }
        // Navigate and force a refresh of the restaurant data
        window.location.href = '/merchant-portal';
      }, 2000);
    } catch (error: any) {
      console.error("Error completing onboarding:", error);
      toast.error(error?.message || "Failed to complete setup. Please try again.");
    }
  };

  const handleNext = async () => {
    // Mark current step as completed
    if (!completedSteps.includes(STEPS[currentStep].number)) {
      setCompletedSteps([...completedSteps, STEPS[currentStep].number]);
    }
    
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Wizard completed, check if phone number exists
      setWizardCompleted(true);
      if (!data.contactPhone) {
        setShowMobileModal(true);
      } else {
        // Phone number exists, complete onboarding and navigate
        await handleCompleteOnboarding();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleStepClick = (stepNumber: number) => {
    const stepIndex = STEPS.findIndex(s => s.number === stepNumber);
    if (stepIndex !== -1) {
      setCurrentStep(stepIndex);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const updateData = (newData: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...newData }));
  };

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        localStorage.setItem(`restaurant-onboarding-${user.id}`, JSON.stringify(data));
        toast.success("Progress saved");
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save progress");
    }
  };

  const handleMobileSubmit = async (phoneNumber: string, countryCode: string) => {
    updateData({ contactPhone: `${countryCode} ${phoneNumber}` });
    setShowMobileModal(false);
    toast.success("Mobile number added successfully");
    // Complete onboarding and navigate
    await handleCompleteOnboarding();
  };

  const handleRemindLater = () => {
    setShowMobileModal(false);
    setShowReminderModal(true);
  };

  const handleAddPhoneFromReminder = () => {
    setShowReminderModal(false);
    setShowMobileModal(true);
  };

  const handleReminderClose = async () => {
    setShowReminderModal(false);
    toast.info("We'll remind you tomorrow");
    // Complete onboarding and navigate even without phone
    await handleCompleteOnboarding();
  };

  const CurrentStepComponent = STEPS[currentStep].component;

  return (
    <div className="min-h-screen bg-background w-full">
      <OnboardingHeader onSave={handleSave} />
      
      {/* Sidebar - Hidden on mobile */}
      <div className="hidden lg:block">
        <OnboardingSidebar
          steps={STEPS}
          currentStep={STEPS[currentStep].number}
          completedSteps={completedSteps}
          storeName={data.restaurantName}
          onStepClick={handleStepClick}
        />
      </div>

      {/* Main Content - Responsive */}
      <main className="lg:ml-64 pt-16 min-h-screen w-full px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto lg:max-w-none">
        <div className="py-6 sm:py-8 lg:py-12">
          <CurrentStepComponent
            data={data}
            updateData={updateData}
            onNext={handleNext}
            onBack={currentStep === 0 ? undefined : handleBack}
          />
        </div>
      </main>

      <MobileVerificationModal
        open={showMobileModal}
        onClose={() => setShowMobileModal(false)}
        onSubmit={handleMobileSubmit}
        onRemindLater={handleRemindLater}
      />

      <PhoneNumberReminderModal
        open={showReminderModal}
        onClose={handleReminderClose}
        onAddPhone={handleAddPhoneFromReminder}
      />
    </div>
  );
};

export default RestaurantOnboardingWizard;

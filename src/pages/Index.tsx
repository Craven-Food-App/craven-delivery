import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import RestaurantGrid from "@/components/RestaurantGrid";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Utensils, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AndroidEnrollmentPopup } from "@/components/AndroidEnrollmentPopup";

const Index = () => {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const navigate = useNavigate();
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [neverShowAgain, setNeverShowAgain] = useState(false);

  useEffect(() => {
    const search = searchParams.get("search");
    const address = searchParams.get("address");

    if (search) setSearchQuery(search);
    if (address) setDeliveryAddress(address);
  }, [searchParams]);

  // Check if user is on Android and show enrollment modal
  useEffect(() => {
    const checkAndShowModal = async () => {
      // Detect Android device
      const userAgent = navigator.userAgent.toLowerCase();
      const isAndroidDevice = /android/.test(userAgent);
      setIsAndroid(isAndroidDevice);

      // Check if modal was already dismissed
      const modalDismissed = localStorage.getItem('android_enrollment_modal_dismissed');
      if (modalDismissed === 'true') {
        return;
      }

      // Check if user is already enrolled (if logged in)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const { data: enrollment } = await supabase
            .from('android_tester_enrollments')
            .select('id')
            .eq('email', user.email)
            .maybeSingle();
          
          if (enrollment) {
            // Already enrolled, don't show modal
            return;
          }
        }
      } catch (error) {
        // Silently handle - user might not be logged in
      }

      // Show modal for Android users after a short delay
      if (isAndroidDevice) {
        setTimeout(() => {
          setShowEnrollmentModal(true);
        }, 1500); // Show after 1.5 seconds
      }
    };

    checkAndShowModal();
  }, []);

  // Auto-redirect drivers to /mobile when opening PWA
  useEffect(() => {
    const checkAndRedirectDriver = async () => {
      // Only redirect if running as PWA (installed app)
      const isPWA =
        window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;

      if (!isPWA) {
        return; // Don't redirect if browsing normally
      }

      // Check localStorage for cached driver status (faster)
      const cachedDriverStatus = localStorage.getItem("user_is_driver");
      if (cachedDriverStatus === "true") {
        navigate("/mobile", { replace: true });
        return;
      }

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (!user) {
          return;
        }

        // Check if user is an approved driver with completed onboarding
        const { data: application, error: appError } = await supabase
          .from("craver_applications")
          .select("status, onboarding_completed_at")
          .eq("user_id", user.id)
          .single();

        if (application?.onboarding_completed_at) {
          // User is an approved driver with completed onboarding
          // Cache the driver status for faster future loads
          localStorage.setItem("user_is_driver", "true");
          navigate("/mobile", { replace: true });
        } else {
          // Clear cached status if it exists
          localStorage.removeItem("user_is_driver");
        }
      } catch (error) {
        console.error("Error checking driver status:", error);
        // Silently fail - user stays on homepage
      }
    };

    // Run immediately
    checkAndRedirectDriver();
  }, [navigate]);

  // JSON-LD Structured Data
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FoodEstablishment",
    name: "Crave'n",
    description: "Food delivery from local restaurants",
    url: "https://craven.app",
    logo: "https://craven.app/craven-logo.png",
    address: {
      "@type": "PostalAddress",
      addressCountry: "US",
    },
    servesCuisine: ["American", "Italian", "Chinese", "Mexican", "Indian", "Japanese", "Thai"],
    priceRange: "$$",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      reviewCount: "2500",
    },
  };

  return (
    <>
      <Helmet>
        <title>Crave'n - Membership | Zero Delivery Fees & Exclusive Benefits</title>
        <meta
          name="description"
          content="Join our membership for $8.99/month and enjoy zero delivery fees, priority support, and exclusive perks. Limited lifetime memberships available for $249."
        />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />
        <Hero />

        {/* Fast Food */}
        <RestaurantGrid
          sectionTitle="Fast Food"
          useNearbyByLocation={true}
          marketplaceType="restaurant"
          cuisineFilter="fast_food"
          horizontal={true}
        />

        {/* Desserts */}
        <RestaurantGrid
          sectionTitle="Desserts"
          useNearbyByLocation={true}
          marketplaceType="restaurant"
          cuisineFilter="desserts"
          horizontal={true}
        />

        {/* Late Night Hunger */}
        <RestaurantGrid
          sectionTitle="Late Night Hunger"
          useNearbyByLocation={true}
          marketplaceType="restaurant"
          cuisineFilter="late_night"
          horizontal={true}
        />

        {/* Browse All Restaurants */}
        <section className="container mx-auto px-4 pb-12">
          <h2 className="text-2xl font-bold mb-6 text-foreground">Browse All Restaurants</h2>
          <RestaurantGrid
            useMarketplaceCatalog={true}
            marketplaceType="restaurant"
          />
        </section>

        <Footer />
      </div>

      {/* Android Tester Enrollment Popup */}
      <AndroidEnrollmentPopup
        opened={showEnrollmentModal}
        onClose={() => {
          setShowEnrollmentModal(false);
          // Only prevent future shows if checkbox is checked
          if (neverShowAgain) {
            localStorage.setItem('android_enrollment_modal_dismissed', 'true');
          }
          setNeverShowAgain(false); // Reset checkbox
        }}
        onEnroll={() => {
          setShowEnrollmentModal(false);
          // Only prevent future shows if checkbox is checked
          if (neverShowAgain) {
            localStorage.setItem('android_enrollment_modal_dismissed', 'true');
          }
          setNeverShowAgain(false); // Reset checkbox
          navigate('/android-tester-enrollment');
        }}
        neverShowAgain={neverShowAgain}
        onNeverShowAgainChange={setNeverShowAgain}
      />
    </>
  );
};

export default Index;

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

const Index = () => {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const search = searchParams.get("search");
    const address = searchParams.get("address");

    if (search) setSearchQuery(search);
    if (address) setDeliveryAddress(address);
  }, [searchParams]);

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
    name: "Crave'N",
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
        <title>Crave'N - Membership | Zero Delivery Fees & Exclusive Benefits</title>
        <meta
          name="description"
          content="Join our membership for $8.99/month and enjoy zero delivery fees, priority support, and exclusive perks. Limited lifetime memberships available for $249."
        />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />
        <Hero />
        <Footer />
      </div>
    </>
  );
};

export default Index;

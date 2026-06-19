import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import CXIntroSection from "@/components/home/CXIntroSection";
import Footer from "@/components/Footer";
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
      const isPWA = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
      if (!isPWA) return;
      const cachedDriverStatus = localStorage.getItem("user_is_driver");
      if (cachedDriverStatus === "true") { navigate("/mobile", { replace: true }); return; }
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: application } = await supabase
          .from("craver_applications")
          .select("status, onboarding_completed_at")
          .eq("user_id", user.id)
          .single();
        if (application?.onboarding_completed_at) {
          localStorage.setItem("user_is_driver", "true");
          navigate("/mobile", { replace: true });
        } else {
          localStorage.removeItem("user_is_driver");
        }
      } catch { /* silently fail */ }
    };
    checkAndRedirectDriver();
  }, [navigate]);

  // JSON-LD Structured Data
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FoodEstablishment",
    name: "Crave'n",
    description: "Food delivery from local restaurants",
    url: "https://cravenusa.com",
    logo: "https://cravenusa.com/craven-logo.png",
    address: { "@type": "PostalAddress", addressCountry: "US" },
    servesCuisine: ["American", "Italian", "Chinese", "Mexican", "Indian", "Japanese", "Thai"],
    priceRange: "$$",
    aggregateRating: { "@type": "AggregateRating", ratingValue: "4.8", reviewCount: "2500" },
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
        <CXIntroSection />
        <Footer />
      </div>
    </>
  );
};

export default Index;

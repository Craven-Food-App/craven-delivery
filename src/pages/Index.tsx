import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import RestaurantGrid from "@/components/RestaurantGrid";
import Footer from "@/components/Footer";
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
  const [weeklyDeals, setWeeklyDeals] = useState<any[]>([]);
  const [adPlacements, setAdPlacements] = useState<any[]>([]);

  useEffect(() => {
    const search = searchParams.get("search");
    const address = searchParams.get("address");
    if (search) setSearchQuery(search);
    if (address) setDeliveryAddress(address);
  }, [searchParams]);

  // Fetch promoted restaurants for Craven Quick Picks
  useEffect(() => {
    const fetchWeeklyDeals = async () => {
      try {
        const { data, error } = await supabase
          .from('restaurants')
          .select(`*, promotion_title, promotion_description, promotion_discount_percentage, promotion_discount_amount_cents, promotion_minimum_order_cents, promotion_maximum_discount_cents, promotion_valid_until, promotion_image_url`)
          .eq('is_promoted', true)
          .eq('is_active', true)
          .order('rating', { ascending: false })
          .limit(6);
        if (error) throw error;
        setWeeklyDeals(data || []);
      } catch {
        setWeeklyDeals([]);
      }
    };
    fetchWeeklyDeals();
  }, []);

  // Fetch ad placements
  useEffect(() => {
    const fetchAds = async () => {
      try {
        const now = new Date().toISOString();
        const { data, error } = await supabase
          .from('ad_placements')
          .select('*')
          .eq('page_path', '/restaurants')
          .eq('is_active', true)
          .lte('valid_from', now)
          .or(`valid_until.is.null,valid_until.gt.${now}`)
          .order('display_order', { ascending: true });
        if (error) {
          if (error.code === 'PGRST205' || error.message?.includes('not found')) {
            setAdPlacements([]);
          } else {
            throw error;
          }
        } else {
          setAdPlacements(data || []);
        }
      } catch {
        setAdPlacements([]);
      }
    };
    fetchAds();
  }, []);

  // Check if user is on Android and show enrollment modal
  useEffect(() => {
    const checkAndShowModal = async () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isAndroidDevice = /android/.test(userAgent);
      setIsAndroid(isAndroidDevice);
      const modalDismissed = localStorage.getItem('android_enrollment_modal_dismissed');
      if (modalDismissed === 'true') return;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const { data: enrollment } = await supabase
            .from('android_tester_enrollments')
            .select('id')
            .eq('email', user.email)
            .maybeSingle();
          if (enrollment) return;
        }
      } catch { /* user might not be logged in */ }
      if (isAndroidDevice) {
        setTimeout(() => setShowEnrollmentModal(true), 1500);
      }
    };
    checkAndShowModal();
  }, []);

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
    url: "https://craven.app",
    logo: "https://craven.app/craven-logo.png",
    address: { "@type": "PostalAddress", addressCountry: "US" },
    servesCuisine: ["American", "Italian", "Chinese", "Mexican", "Indian", "Japanese", "Thai"],
    priceRange: "$$",
    aggregateRating: { "@type": "AggregateRating", ratingValue: "4.8", reviewCount: "2500" },
  };

  // Find main customer ad
  const mainAd = adPlacements.find((ad: any) => ad.placement_key === 'main_customer_ad');

  // Deals with active promotions
  const dealsWithPromos = weeklyDeals.filter((r: any) => r.promotion_title || r.promotion_discount_percentage || r.promotion_discount_amount_cents);

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

        {/* Main Customer Ad - Above Quick Picks */}
        {mainAd && (
          <div className="px-4 pt-4 pb-2" style={{ backgroundColor: 'white' }}>
            <div
              onClick={() => mainAd.click_url && navigate(mainAd.click_url)}
              style={{ 
                cursor: mainAd.click_url ? 'pointer' : 'default', 
                borderRadius: '16px', 
                overflow: 'hidden', 
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)' 
              }}
            >
              {mainAd.ad_code ? (
                <div dangerouslySetInnerHTML={{ __html: mainAd.ad_code }} style={{ width: '100%', maxHeight: 240, objectFit: 'cover' as const }} />
              ) : mainAd.image_url ? (
                <img src={mainAd.image_url} alt="Promotion" style={{ width: '100%', maxHeight: 240, objectFit: 'cover' }} />
              ) : null}
            </div>
          </div>
        )}

        {/* Craven Quick Picks - Promoted Restaurants */}
        {weeklyDeals.length > 0 && (
          <section style={{ backgroundColor: 'white', borderTop: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <div className="flex justify-between items-center px-4 pt-3" style={{ minHeight: 'auto' }}>
              <h2 className="text-lg font-extrabold text-foreground" style={{ margin: 0, lineHeight: 1.2 }}>Craven Quick Picks</h2>
            </div>
            <div style={{ marginTop: '-16px' }}>
              <RestaurantGrid
                horizontal={true}
                customRestaurants={weeklyDeals}
              />
            </div>
          </section>
        )}

        {/* Great Deals - Restaurants with Promotions */}
        {dealsWithPromos.length > 0 && (
          <section className="px-4 pt-4 pb-2" style={{ backgroundColor: 'white' }}>
            <div className="flex items-center gap-2" style={{ margin: 0, padding: 0 }}>
              <h2 className="text-lg font-extrabold text-foreground" style={{ margin: 0, lineHeight: 1.2 }}>
                Great Deals
              </h2>
              <span style={{ fontSize: '20px' }}>🔥</span>
            </div>
            <RestaurantGrid
              horizontal={true}
              customRestaurants={dealsWithPromos}
            />
          </section>
        )}

        {/* ═══ FOOD & RESTAURANTS ═══ */}
        <section className="px-4 pt-4 pb-1 mt-4" style={{ backgroundColor: 'white', borderTop: '1px solid #e5e7eb' }}>
          <div className="flex items-center gap-2 mb-1">
            <span style={{ fontSize: '20px' }}>🍽️</span>
            <h3 className="text-lg font-extrabold text-foreground" style={{ margin: 0, lineHeight: 1.2 }}>Food & Restaurants</h3>
          </div>
          <p className="text-xs text-muted-foreground">Order delivery from your favorites</p>
        </section>

        {/* Restaurants Near You */}
        <RestaurantGrid
          sectionTitle="Restaurants Near You"
          horizontal={true}
          useNearbyByLocation={true}
          marketplaceType="restaurant"
        />

        {/* Late Night Hunger */}
        <RestaurantGrid
          cuisineFilter="late night hunger"
          sectionTitle="🌙 Late Night Hunger"
          horizontal={true}
          useMarketplaceCatalog={true}
          marketplaceType="restaurant"
        />

        {/* Kids Menu */}
        <RestaurantGrid
          cuisineFilter="kids"
          sectionTitle="🧒 Kids Menu"
          horizontal={true}
          useMarketplaceCatalog={true}
          marketplaceType="restaurant"
        />

        {/* ═══ RETAIL & SHOPPING ═══ */}
        <section className="px-4 pt-6 pb-1" style={{ backgroundColor: '#fafafa', borderTop: '2px solid #f0f0f0' }}>
          <div className="flex items-center gap-2 mb-1">
            <span style={{ fontSize: '20px' }}>🛍️</span>
            <h3 className="text-lg font-extrabold text-foreground" style={{ margin: 0, lineHeight: 1.2 }}>Retail & Shopping</h3>
          </div>
          <p className="text-xs text-muted-foreground">Stores, apparel, accessories & more — delivered</p>
        </section>

        <RestaurantGrid
          sectionTitle="Retail Stores Near You"
          horizontal={true}
          useNearbyByLocation={true}
          marketplaceType="retail"
        />

        <RestaurantGrid
          sectionTitle="Cosmetic Stores"
          horizontal={true}
          useMarketplaceCatalog={true}
          marketplaceType="retail"
          cuisineFilter="Cosmetics"
        />

        <RestaurantGrid
          sectionTitle="Pet Stores"
          horizontal={true}
          useMarketplaceCatalog={true}
          marketplaceType="retail"
          cuisineFilter="Pet"
        />

        {/* View more - Browse All */}
        <section className="px-4 py-3 mt-4" style={{ backgroundColor: 'white', borderTop: '1px solid #e5e7eb' }}>
          <h2 className="text-lg font-extrabold text-foreground mb-4" style={{ lineHeight: 1.2 }}>View more</h2>
          <RestaurantGrid
            columns={1}
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
          if (neverShowAgain) localStorage.setItem('android_enrollment_modal_dismissed', 'true');
          setNeverShowAgain(false);
        }}
        onEnroll={() => {
          setShowEnrollmentModal(false);
          if (neverShowAgain) localStorage.setItem('android_enrollment_modal_dismissed', 'true');
          setNeverShowAgain(false);
          navigate('/android-tester-enrollment');
        }}
        neverShowAgain={neverShowAgain}
        onNeverShowAgainChange={setNeverShowAgain}
      />
    </>
  );
};

export default Index;

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notifications } from "@mantine/notifications";
import RestaurantCard from "./RestaurantCard";
import { RequestBusinessModal } from "@/components/restaurant/RequestBusinessModal";
import { hasLocationDisclosureConsent } from "@/utils/locationDisclosure";

let _geoCache: { lat: number; lng: number } | null = null;
let _geoRequested = false;
let _geoCallbacks: Array<(loc: { lat: number; lng: number } | null) => void> = [];

function getSharedUserLocation(cb: (loc: { lat: number; lng: number } | null) => void) {
  if (_geoCache) { cb(_geoCache); return; }
  _geoCallbacks.push(cb);
  if (_geoRequested) return;
  _geoRequested = true;
  if (!hasLocationDisclosureConsent()) {
    _geoCallbacks.forEach((fn) => fn(null));
    _geoCallbacks = [];
    return;
  }
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        _geoCache = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        _geoCallbacks.forEach((fn) => fn(_geoCache));
        _geoCallbacks = [];
      },
      () => {
        _geoCallbacks.forEach((fn) => fn(null));
        _geoCallbacks = [];
      }
    );
  } else {
    _geoCallbacks.forEach((fn) => fn(null));
    _geoCallbacks = [];
  }
}

const RETAIL_CUISINE_KEYWORDS = ['apparel', 'retail', 'clothing', 'fashion', 'electronics', 'hardware', 'beauty', 'cosmetics', 'specialty_retail', 'retail_store'];
function isRetailOrApparel(cuisineType?: string): boolean {
  const cat = (cuisineType || '').toLowerCase();
  return RETAIL_CUISINE_KEYWORDS.some((k) => cat.includes(k));
}

const SEEDED_LOGO_BASE = "https://xaxbucnjlrfkccsfiddq.supabase.co/storage/v1/object/public/seed%20logos";
const BRANDFETCH = "https://cdn.brandfetch.io";
const SEEDED_LOGO_URLS: Record<string, string> = {
  "Tony Packo's": `${SEEDED_LOGO_BASE}/FB_IMG_1773013555938.jpg`,
  "Applebee's": `${SEEDED_LOGO_BASE}/FB_IMG_1773013585044.jpg`,
  "Arby's": `${SEEDED_LOGO_BASE}/FB_IMG_1773013601605.jpg`,
  "Balance Grille": `${SEEDED_LOGO_BASE}/FB_IMG_1773013654751.jpg`,
  "Bangkok Kitchen": `${SEEDED_LOGO_BASE}/FB_IMG_1773013751104.jpg`,
  "Bar Louie": `${SEEDED_LOGO_BASE}/FB_IMG_1773013775224.jpg`,
  "Bob Evans": `${SEEDED_LOGO_BASE}/FB_IMG_1773013792415.jpg`,
  "Chili's": `${SEEDED_LOGO_BASE}/FB_IMG_1773013841352.jpg`,
  "Cracker Barrel": `${SEEDED_LOGO_BASE}/FB_IMG_1773013861105.jpg`,
  "Denny's": `${SEEDED_LOGO_BASE}/FB_IMG_1773013878790.jpg`,
  "Dunkin'": `${SEEDED_LOGO_BASE}/FB_IMG_1773013952977.jpg`,
  "Holland House": `${SEEDED_LOGO_BASE}/FB_IMG_1773014023637.jpg`,
  "Home Slice Pizza": `${SEEDED_LOGO_BASE}/FB_IMG_1773014076682.jpg`,
  "IHOP": `${SEEDED_LOGO_BASE}/FB_IMG_1773014105739.jpg`,
  "McDonald's": `${SEEDED_LOGO_BASE}/FB_IMG_1773014131269.jpg`,
  "McDonalds": `${SEEDED_LOGO_BASE}/FB_IMG_1773014131269.jpg`,
  "Olive Garden": `${SEEDED_LOGO_BASE}/FB_IMG_1773014153763.jpg`,
  "Outback Steakhouse": `${SEEDED_LOGO_BASE}/FB_IMG_1773014170637.jpg`,
  "Panda Express": `${SEEDED_LOGO_BASE}/FB_IMG_1773014193727.jpg`,
  "Red Lobster": `${SEEDED_LOGO_BASE}/FB_IMG_1773014220077.jpg`,
  "Red Robin": `${SEEDED_LOGO_BASE}/FB_IMG_1773014242955.jpg`,
  "Red Robbin": `${SEEDED_LOGO_BASE}/FB_IMG_1773014242955.jpg`,
  "Rosiies": `${SEEDED_LOGO_BASE}/FB_IMG_1773014271528.jpg`,
  "Rosie's": `${SEEDED_LOGO_BASE}/FB_IMG_1773014271528.jpg`,
  "Rudy's Hot Dog": `${SEEDED_LOGO_BASE}/FB_IMG_1773014327092.jpg`,
  "Schmucker's Restaurant": `${SEEDED_LOGO_BASE}/FB_IMG_1773014432347.jpg`,
  "Sonic": `${SEEDED_LOGO_BASE}/FB_IMG_1773014452021.jpg`,
  "Star Diner": `${SEEDED_LOGO_BASE}/FB_IMG_1773014472754.jpg`,
  "Starbucks": `${SEEDED_LOGO_BASE}/FB_IMG_1773014488001.jpg`,
  "Taco Bell": `${SEEDED_LOGO_BASE}/FB_IMG_1773014506899.jpg`,
  "Texas Roadhouse": `${SEEDED_LOGO_BASE}/FB_IMG_1773014555948.jpg`,
  "The Attic on Adams": `${SEEDED_LOGO_BASE}/FB_IMG_1773014580737.jpg`,
  "Ye Olde Dirty Bird": `${SEEDED_LOGO_BASE}/Picsart_26-03-08_20-07-48-171.jpg`,
  "Ye Olde Durty Bird": `${SEEDED_LOGO_BASE}/Picsart_26-03-08_20-07-48-171.jpg`,
  // Brandfetch CDN logos for major chains
  "Burger King": `${BRANDFETCH}/burgerking.com/logo`,
  "Chick-fil-A": `${BRANDFETCH}/chick-fil-a.com/logo`,
  "Chipotle": `${BRANDFETCH}/chipotle.com/logo`,
  "Five Guys": `${BRANDFETCH}/fiveguys.com/logo`,
  "Popeyes": `${BRANDFETCH}/popeyes.com/logo`,
  "Panera Bread": `${BRANDFETCH}/panerabread.com/logo`,
  "Jimmy John's": `${BRANDFETCH}/jimmyjohns.com/logo`,
  "Little Caesars": `${BRANDFETCH}/littlecaesars.com/logo`,
  "Pizza Hut": `${BRANDFETCH}/pizzahut.com/logo`,
  "Domino's": `${BRANDFETCH}/dominos.com/logo`,
  "Dairy Queen": `${BRANDFETCH}/dairyqueen.com/logo`,
  "Wingstop": `${BRANDFETCH}/wingstop.com/logo`,
  "Raising Cane's": `${BRANDFETCH}/raisingcanes.com/logo`,
  "Qdoba": `${BRANDFETCH}/qdoba.com/logo`,
  "Firehouse Subs": `${BRANDFETCH}/firehousesubs.com/logo`,
  "Jersey Mike's": `${BRANDFETCH}/jerseymikes.com/logo`,
  "Culver's": `${BRANDFETCH}/culvers.com/logo`,
  "Buffalo Wild Wings": `${BRANDFETCH}/buffalowildwings.com/logo`,
  "White Castle": `${BRANDFETCH}/whitecastle.com/logo`,
  "Steak 'n Shake": `${BRANDFETCH}/steaknshake.com/logo`,
  "Marco's Pizza": `${BRANDFETCH}/marcos.com/logo`,
  "Papa Johns": `${BRANDFETCH}/papajohns.com/logo`,
  "Papa John's": `${BRANDFETCH}/papajohns.com/logo`,
  "Wendy's": `${BRANDFETCH}/wendys.com/logo`,
  "KFC": `${BRANDFETCH}/kfc.com/logo`,
  "Subway": `${BRANDFETCH}/subway.com/logo`,
  "Waffle House": `${BRANDFETCH}/wafflehouse.com/logo`,
  "Shake Shack": `${BRANDFETCH}/shakeshack.com/logo`,
  "Krispy Kreme": `${BRANDFETCH}/krispykreme.com/logo`,
  "Tim Hortons": `${BRANDFETCH}/timhortons.com/logo`,
  "Del Taco": `${BRANDFETCH}/deltaco.com/logo`,
  "Bojangles": `${BRANDFETCH}/bojangles.com/logo`,
  "Golden Corral": `${BRANDFETCH}/goldencorral.com/logo`,
};

/** Check if a URL is a generic unsplash stock photo (not a real logo) */
function isGenericStockPhoto(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes('images.unsplash.com');
}

function getSeededLogoUrl(name: string | null | undefined): string | undefined {
  return name ? SEEDED_LOGO_URLS[name] : undefined;
}

interface Restaurant {
  id: string;
  name: string;
  description?: string;
  cuisine_type: string;
  delivery_fee_cents?: number;
  min_delivery_time?: number;
  max_delivery_time?: number;
  is_promoted?: boolean;
  rating?: number;
  image_url?: string;
  delivery_radius_miles?: number;
  latitude?: number;
  longitude?: number;
  marketplaceStatus?: 'ACTIVE' | 'REQUESTABLE' | 'COMING_SOON';
  request_count?: number;
  marketplace_type?: string;
}
interface RestaurantGridProps {
  searchQuery?: string;
  deliveryAddress?: string;
  cuisineFilter?: string;
  excludeCuisine?: string;
  sectionTitle?: string;
  horizontal?: boolean;
  categoryFilter?: string;
  customRestaurants?: Restaurant[];
  columns?: number;
  useMarketplaceCatalog?: boolean;
  useNearbyByLocation?: boolean;
  marketplaceType?: 'restaurant' | 'retail' | 'mall' | null;
}
const RestaurantGrid = ({
  searchQuery,
  deliveryAddress,
  cuisineFilter,
  excludeCuisine,
  sectionTitle,
  horizontal = false,
  categoryFilter,
  customRestaurants,
  columns,
  useMarketplaceCatalog = false,
  useNearbyByLocation = false,
  marketplaceType = null,
}: RestaurantGridProps = {}) => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<{ id: string; name: string; image?: string; cuisine?: string } | null>(null);

  useEffect(() => {
    getSharedUserLocation((loc) => { if (loc) setUserLocation(loc); });
  }, []);
  // Helper function to calculate distance between two points
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  useEffect(() => {
    if (customRestaurants) {
      const formatted = customRestaurants.map((restaurant: any) => ({
        ...restaurant,
        min_delivery_time: restaurant.min_delivery_time || 20,
        max_delivery_time: restaurant.max_delivery_time || 30,
        is_promoted: restaurant.is_promoted || false,
        marketplaceStatus: (restaurant.marketplaceStatus || 'ACTIVE') as 'ACTIVE' | 'REQUESTABLE' | 'COMING_SOON',
      }));
      setRestaurants(formatted);
      setLoading(false);
    } else if (useNearbyByLocation) {
      fetchNearbyByLocation();
    } else if (useMarketplaceCatalog) {
      fetchMarketplaceRestaurants();
    } else {
      fetchRestaurants();
    }
  }, [searchQuery, deliveryAddress, cuisineFilter, userLocation, categoryFilter, customRestaurants, useMarketplaceCatalog, useNearbyByLocation, marketplaceType]);

  const fetchNearbyByLocation = async () => {
    setLoading(true);
    const lat = userLocation?.lat ?? 41.65;
    const lng = userLocation?.lng ?? -83.54;
    const radii = [10, 20, 35, 50];
    try {
      let list: Restaurant[] = [];
      for (const radius of radii) {
        const { data, error } = await (supabase as any).rpc('get_business_nearby', {
          p_lat: lat,
          p_lng: lng,
          p_radius_miles: radius,
          p_marketplace_type: marketplaceType || null,
          p_search: searchQuery || null,
          p_limit: 300,
        });
        if (error) throw error;
        list = (data || []).map((row: any) => ({
          id: row.id,
          name: row.name,
          cuisine_type: row.cuisine_type || row.category || '',
          image_url: row.logo_url || row.image_url,
          latitude: row.lat != null ? Number(row.lat) : undefined,
          longitude: row.lng != null ? Number(row.lng) : undefined,
          rating: row.rating != null ? Number(row.rating) : undefined,
          min_delivery_time: row.min_delivery_time,
          max_delivery_time: row.max_delivery_time,
          delivery_fee_cents: row.delivery_fee_cents,
          is_promoted: row.is_promoted ?? false,
          marketplaceStatus: (row.status === 'ACTIVE' ? 'ACTIVE' : row.status === 'COMING_SOON' ? 'COMING_SOON' : 'REQUESTABLE') as 'ACTIVE' | 'REQUESTABLE' | 'COMING_SOON',
          request_count: row.request_count,
          marketplace_type: row.marketplace_type || 'restaurant',
        }));
        if (list.length >= 6 || radius === 50) break;
      }
      if (marketplaceType) {
        list = list.filter((r) => (r.marketplace_type || 'restaurant') === marketplaceType);
      }
      if (marketplaceType === 'restaurant') {
        list = list.filter((r) => !isRetailOrApparel(r.cuisine_type));
      }
      if (excludeCuisine) {
        const excludeList = excludeCuisine.split(',').map((c: string) => c.trim().toLowerCase());
        setRestaurants(list.filter((r) => !r.cuisine_type || !excludeList.includes(r.cuisine_type.toLowerCase())));
      } else {
        setRestaurants(list);
      }
    } catch {
      setRestaurants([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketplaceRestaurants = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc('get_marketplace_restaurants', {
        p_lat: userLocation?.lat ?? 41.65,
        p_lng: userLocation?.lng ?? -83.54,
        p_search: searchQuery || null,
        p_cuisine: cuisineFilter && cuisineFilter !== 'all' ? cuisineFilter : null,
        p_limit: 300,
        p_marketplace_type: marketplaceType && marketplaceType !== 'restaurant' ? marketplaceType : null,
      });
      if (error) throw error;
      let list: Restaurant[] = (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        cuisine_type: row.cuisine_type || row.category || '',
        image_url: row.logo_url || row.image_url,
        latitude: row.lat != null ? Number(row.lat) : undefined,
        longitude: row.lng != null ? Number(row.lng) : undefined,
        rating: row.rating != null ? Number(row.rating) : undefined,
        min_delivery_time: row.min_delivery_time,
        max_delivery_time: row.max_delivery_time,
        delivery_fee_cents: row.delivery_fee_cents,
        is_promoted: row.is_promoted ?? false,
        marketplaceStatus: (row.status === 'ACTIVE' ? 'ACTIVE' : row.status === 'COMING_SOON' ? 'COMING_SOON' : 'REQUESTABLE') as 'ACTIVE' | 'REQUESTABLE' | 'COMING_SOON',
        marketplace_type: row.marketplace_type || 'restaurant',
      }));
      if (marketplaceType === 'restaurant') {
        list = list.filter((r) => (r.marketplace_type || 'restaurant') === 'restaurant' && !isRetailOrApparel(r.cuisine_type));
      } else if (marketplaceType === 'retail') {
        list = list.filter((r) => (r.marketplace_type || 'restaurant') === 'retail' || isRetailOrApparel(r.cuisine_type));
      } else if (marketplaceType === 'mall') {
        list = list.filter((r) => (r.marketplace_type || 'restaurant') === 'mall');
      }
      if (excludeCuisine) {
        const excludeList = excludeCuisine.split(',').map((c: string) => c.trim().toLowerCase());
        setRestaurants(list.filter((r) => !r.cuisine_type || !excludeList.includes(r.cuisine_type.toLowerCase())));
      } else {
        setRestaurants(list);
      }
    } catch {
      await fetchRestaurants();
    } finally {
      setLoading(false);
    }
  };

  const fetchRestaurants = async () => {
    try {
      let query = (supabase as any)
        .from("restaurants")
        .select(`
          *,
          delivery_radius_miles,
          latitude,
          longitude
        `)
        .eq("is_active", true);

      const { data, error } = await query
        .order("is_promoted", { ascending: false })
        .order("rating", { ascending: false });
      
      if (error) throw error;
      
      let filteredData = (data || []).map((restaurant: any) => ({
        ...restaurant,
        min_delivery_time: restaurant.min_delivery_time || 20,
        max_delivery_time: restaurant.max_delivery_time || 30,
        is_promoted: restaurant.is_promoted || false
      }));

      // Filter by cuisine if provided and not 'all' (case-insensitive)
      if (cuisineFilter && cuisineFilter !== 'all') {
        filteredData = filteredData.filter((restaurant: Restaurant) =>
          restaurant.cuisine_type?.toLowerCase() === cuisineFilter.toLowerCase()
        );
      }

      // Exclude specific cuisine types if provided (supports comma-separated list)
      if (excludeCuisine) {
        const excludeList = excludeCuisine.split(',').map(c => c.trim().toLowerCase());
        filteredData = filteredData.filter((restaurant: Restaurant) => {
          const restaurantCuisine = restaurant.cuisine_type?.toLowerCase();
          return !restaurantCuisine || !excludeList.includes(restaurantCuisine);
        });
      }

      // Filter by search query if provided
      if (searchQuery) {
        filteredData = filteredData.filter((restaurant: Restaurant) =>
          restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (restaurant.cuisine_type || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (restaurant.description || '').toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      // Filter by delivery radius if user location is available
      if (userLocation && filteredData.length > 0) {
        filteredData = filteredData.filter((restaurant: Restaurant) => {
          if (!restaurant.latitude || !restaurant.longitude || !restaurant.delivery_radius_miles) {
            return true; // Include restaurants without location data
          }

          // Calculate distance using Haversine formula
          const distance = calculateDistance(
            userLocation.lat, 
            userLocation.lng, 
            restaurant.latitude, 
            restaurant.longitude
          );
          
          return distance <= restaurant.delivery_radius_miles;
        });
      }

      // Filter by menu category if categoryFilter is provided
      if (categoryFilter && categoryFilter !== 'all' && filteredData.length > 0) {
        try {
          // Fetch restaurants with menu items in the specified category
          const { data: categoryData } = await supabase
            .from('menu_categories')
            .select('restaurant_id')
            .eq('name', categoryFilter)
            .eq('is_active', true);
          
          if (categoryData && categoryData.length > 0) {
            const restaurantIds = categoryData.map((cat: any) => cat.restaurant_id);
            filteredData = filteredData.filter((restaurant: Restaurant) =>
              restaurantIds.includes(restaurant.id)
            );
          } else {
            filteredData = []; // No restaurants with this category
          }
        } catch (error) {
          console.error('Error filtering by category:', error);
          // Continue with unfiltered data if category filter fails
        }
      }

      setRestaurants(filteredData);
    } catch (error) {
      console.error("Error fetching restaurants:", error);
    } finally {
      setLoading(false);
    }
  };
  if (loading) {
    return <section className="py-2 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              {searchQuery || deliveryAddress ? "Searching..." : "Popular Restaurants Near You"}
            </h2>
            <p className="text-muted-foreground text-lg">
              Loading restaurants...
            </p>
          </div>
        </div>
      </section>;
  }
  const requestRestaurant = async (masterId: string) => {
    const { data, error } = await (supabase as any).rpc('request_restaurant', { p_restaurant_master_id: masterId });
    if (error) {
      notifications.show({ title: 'Request failed', message: error.message || 'Try again.', color: 'red' });
      return;
    }
    if (data?.ok) {
      setRestaurants((prev) => prev.map((r) => r.id === masterId ? { ...r, request_count: data.request_count as number } : r));
      notifications.show({ title: 'Request recorded', message: "We'll let this business know you want them on Crave'n!", color: 'green' });
    } else {
      notifications.show({ title: 'Request failed', message: (data as any)?.error || 'Try again.', color: 'red' });
    }
  };

  const notifyMeRestaurant = async (masterId: string, email?: string) => {
    const { data } = await (supabase as any).rpc('notify_me_restaurant', { p_restaurant_master_id: masterId, p_email: email || null });
    return data?.ok;
  };

  const formatRestaurantData = (restaurant: Restaurant) => {
    let distanceStr: string | undefined;
    if (userLocation && restaurant.latitude != null && restaurant.longitude != null) {
      const miles = calculateDistance(userLocation.lat, userLocation.lng, restaurant.latitude, restaurant.longitude);
      distanceStr = `${miles.toFixed(1)} mi`;
    }
    const minTime = restaurant.min_delivery_time ?? 25;
    const feeCents = restaurant.delivery_fee_cents;
    return {
      id: restaurant.id,
      name: restaurant.name,
      image: getSeededLogoUrl(restaurant.name) || (restaurant.image_url && !isGenericStockPhoto(restaurant.image_url) ? restaurant.image_url : null) || `https://placehold.co/600x400/f5f5f5/333?text=${encodeURIComponent(restaurant.name || 'Restaurant')}`,
      rating: restaurant.rating ?? 4,
      deliveryTime: `${minTime} min`,
      deliveryFee: feeCents === 0 ? "Free" : feeCents != null ? `$${(feeCents / 100).toFixed(2)}` : "—",
      cuisine: restaurant.cuisine_type,
      distance: distanceStr,
      isPromoted: restaurant.is_promoted ?? false,
      marketplaceStatus: (restaurant.marketplaceStatus ?? 'ACTIVE') as 'ACTIVE' | 'REQUESTABLE' | 'COMING_SOON',
      onRequest: restaurant.marketplaceStatus === 'REQUESTABLE' ? () => requestRestaurant(restaurant.id) : undefined,
      onNotifyMe: restaurant.marketplaceStatus === 'COMING_SOON' ? (email?: string) => notifyMeRestaurant(restaurant.id, email) : undefined,
      onShareWithBusiness: restaurant.marketplaceStatus === 'REQUESTABLE' ? (business: { id: string; name: string; image?: string; cuisine?: string }) => {
        setSelectedBusiness(business);
        setRequestModalOpen(true);
      } : undefined,
    };
  };

  if (restaurants.length === 0 && !loading && !sectionTitle) {
    return null;
  }

  // Determine padding and height based on props
  const sectionPadding = (excludeCuisine && sectionTitle === "Restaurants") ? "py-1" : "py-2";
  const sectionHeight = (customRestaurants && horizontal) ? "270px" : undefined;

  return <section className={sectionPadding} style={{ backgroundColor: 'rgba(255, 255, 255, 1)', height: sectionHeight }}>
      {horizontal ? (
        <>
          {sectionTitle && (
            <div className="container mx-auto px-4 mb-1">
              <h2 className="text-2xl font-bold text-gray-900">{sectionTitle}</h2>
            </div>
          )}
          <div className="w-full overflow-x-auto scrollbar-hide" style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            scrollBehavior: 'smooth'
          }}>
            <div className="flex space-x-4 px-4 pb-4" style={{ minWidth: 'max-content' }}>
              {restaurants.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <p className="text-muted-foreground text-lg">
                    {cuisineFilter && cuisineFilter !== 'all' 
                      ? "Sorry there is nothing available in this category as of yet. Please check back at a later date"
                      : searchQuery 
                        ? `No restaurants found for "${searchQuery}"${deliveryAddress ? ` near ${deliveryAddress}` : ''}` 
                        : deliveryAddress 
                          ? `No restaurants found within ${deliveryAddress}` 
                          : "No restaurants available right now. Be the first to register your restaurant!"}
                  </p>
                </div>
              ) : (
                restaurants.map((restaurant, index) => (
                  <div key={restaurant.id} className="flex-shrink-0 w-[280px] animate-slide-up" style={{
                    animationDelay: `${index * 100}ms`
                  }}>
                    <RestaurantCard {...formatRestaurantData(restaurant)} />
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="container mx-auto px-4">
          {sectionTitle && (
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{sectionTitle}</h2>
            </div>
          )}
          {!searchQuery && !deliveryAddress && !sectionTitle && <div className="text-center mb-8">
            
            
          </div>}

          {restaurants.length === 0 ? <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              {cuisineFilter && cuisineFilter !== 'all' 
                ? "Sorry there is nothing available in this category as of yet. Please check back at a later date"
                : searchQuery 
                  ? `No restaurants found for "${searchQuery}"${deliveryAddress ? ` near ${deliveryAddress}` : ''}` 
                  : deliveryAddress 
                    ? `No restaurants found within ${deliveryAddress}` 
                    : "No restaurants available right now. Be the first to register your restaurant!"}
            </p>
          </div> : (
            <div className={`grid gap-4 ${columns === 2 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'}`}>
              {restaurants.map((restaurant, index) => <div key={restaurant.id} className="animate-slide-up" style={{
                animationDelay: `${index * 100}ms`
              }}>
                <RestaurantCard {...formatRestaurantData(restaurant)} />
              </div>)}
            </div>
          )}
        </div>
      )}
      <RequestBusinessModal
        open={requestModalOpen}
        onClose={() => { setRequestModalOpen(false); setSelectedBusiness(null); }}
        business={selectedBusiness ?? { id: '', name: '' }}
        onSuccess={() => {
          if (selectedBusiness) {
            setRestaurants((prev) => prev.map((r) => r.id === selectedBusiness.id ? { ...r, request_count: (r.request_count ?? 0) + 1 } : r));
          }
        }}
      />
    </section>;
};
export default RestaurantGrid;
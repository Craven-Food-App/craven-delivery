import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notifications } from "@mantine/notifications";
import RestaurantCard, { type RestaurantCardVariant } from "./RestaurantCard";
import { RequestBusinessModal } from "@/components/restaurant/RequestBusinessModal";
import { hasLocationDisclosureConsent } from "@/utils/locationDisclosure";
import { resolveMerchantLogoUrl } from "@/utils/merchantSeedLogos";

// Module-level geolocation cache — request location once, share across all instances
let _geoCache: { lat: number; lng: number } | null = null;
let _geoRequested = false;
let _geoCallbacks: Array<(loc: { lat: number; lng: number } | null) => void> = [];

function getSharedUserLocation(cb: (loc: { lat: number; lng: number } | null) => void) {
  if (_geoCache) { cb(_geoCache); return; }
  _geoCallbacks.push(cb);
  if (_geoRequested) return; // already in-flight
  _geoRequested = true;
  if (!hasLocationDisclosureConsent()) {
    // User has not seen the prominent disclosure yet; do not trigger OS
    // location permission. Resolve callbacks with null so callers can fall
    // back to default behavior.
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
      (error) => {
        // Denied / unavailable — resolve all waiters with null
        // Only log if not a user denial (error.code !== 1). Network/403 from provider is common on HTTP or restricted domains.
        if (error.code !== 1 && import.meta.env.DEV) {
          const msg = error.message || 'Unknown error';
          const short = msg.includes('403') || msg.includes('network') ? 'Location from network unavailable (e.g. HTTP or domain restriction).' : msg;
          console.warn('Location access unavailable:', short);
        }
        _geoCallbacks.forEach((fn) => fn(null));
        _geoCallbacks = [];
      }
    );
  } else {
    _geoCallbacks.forEach((fn) => fn(null));
    _geoCallbacks = [];
  }
}

// Cuisine/category keywords that mean retail/apparel — never show these in "Restaurants Near You"
const RETAIL_CUISINE_KEYWORDS = ['apparel', 'retail', 'clothing', 'fashion', 'electronics', 'hardware', 'beauty', 'cosmetics', 'specialty_retail', 'retail_store'];

function isRetailOrApparel(cuisineType?: string): boolean {
  const cat = (cuisineType || '').toLowerCase();
  return RETAIL_CUISINE_KEYWORDS.some((k) => cat.includes(k));
}

/** Normalize merchant display names for client-side dedupe (seed spelling variants). */
function normalizeMerchantName(name: string | undefined | null): string {
  let n = (name || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const aliases: Record<string, string> = {
    "mcdonalds": "mcdonald's",
    "papa johns": "papa john's",
    "kengo sushi": "kengo sushi & yakitori",
    "westfield franklin park": "franklin park mall",
    "ye olde dirty bird": "ye olde durty bird",
    "red robbin": "red robin",
    "rosie's": "rosie's italian grille",
    "rosiies": "rosie's italian grille",
  };
  if (aliases[n]) n = aliases[n];
  return n;
}

/** Keep first occurrence per normalized merchant name (browse rails must not show seed dups). */
function dedupeMerchantsByName<T extends { id: string; name?: string }>(list: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of list) {
    const key = normalizeMerchantName(row.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

// National chains that exist everywhere — bypass 25-mile distance filter.
// Local hotspots (Tony Packo's, Ye Olde Durty Bird, etc.) are Toledo-only.
const NATIONAL_CHAINS = new Set([
  "McDonald's", "McDonalds", "Burger King", "Wendy's", "Taco Bell", "KFC",
  "Chick-fil-A", "Popeyes", "Subway", "Domino's", "Pizza Hut", "Papa Johns", "Papa John's",
  "Little Caesars", "Sonic", "Arby's", "Dairy Queen", "Dunkin'", "Starbucks",
  "Chipotle", "Panda Express", "Five Guys", "Panera Bread", "Jimmy John's",
  "Wingstop", "Raising Cane's", "Qdoba", "Firehouse Subs", "Jersey Mike's",
  "Culver's", "Buffalo Wild Wings", "White Castle", "Steak 'n Shake",
  "Marco's Pizza", "Waffle House", "Shake Shack", "Krispy Kreme", "Tim Hortons",
  "Del Taco", "Bojangles", "Golden Corral", "Applebee's", "Chili's",
  "Olive Garden", "Red Lobster", "Red Robin", "Red Robbin", "Outback Steakhouse",
  "Cracker Barrel", "Denny's", "IHOP", "Bob Evans", "Texas Roadhouse",
  "Bar Louie",
]);

function isNationalChain(name: string | undefined | null): boolean {
  return !!name && NATIONAL_CHAINS.has(name);
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
  /** From marketplace catalog: ACTIVE | REQUESTABLE | COMING_SOON */
  marketplaceStatus?: 'ACTIVE' | 'REQUESTABLE' | 'COMING_SOON';
  request_count?: number;
  /** restaurant | retail | mall – used for catalog fallback filtering */
  marketplace_type?: string;
  restaurant_type?: string;
}
interface RestaurantGridProps {
  searchQuery?: string;
  deliveryAddress?: string;
  cuisineFilter?: string;
  excludeCuisine?: string;
  /** Optional one-line reason under the title */
  sectionSubtitle?: string;
  horizontal?: boolean;
  /** food = restaurant rails; shelf = retail/mall tiles; default = legacy card */
  cardVariant?: RestaurantCardVariant;
  categoryFilter?: string;
  customRestaurants?: Restaurant[]; // Pre-fetched restaurants to display (skips fetch)
  columns?: number;
  /** When true, fetch unified catalog (active + requestable + coming_soon) so marketplace looks full */
  useMarketplaceCatalog?: boolean;
  /** When true, fetch location-based nearby via get_business_nearby (radius 10mi, expand to 20/35/50 if low results) */
  useNearbyByLocation?: boolean;
  /** Filter nearby results by marketplace_type: restaurant | retail | mall */
  marketplaceType?: 'restaurant' | 'retail' | 'mall' | null;
  targetLocation?: { lat: number; lng: number } | null;
  /** Client-side exclusive filter: keep rows whose cuisine/name contains any keyword */
  cuisineKeywords?: string[];
}

function matchesCuisineKeywords(
  restaurant: { cuisine_type?: string; name?: string; restaurant_type?: string },
  keywords?: string[]
): boolean {
  if (!keywords?.length) return true;
  const hay = `${restaurant.cuisine_type || ''} ${restaurant.name || ''} ${restaurant.restaurant_type || ''}`.toLowerCase();
  return keywords.some((k) => hay.includes(k.toLowerCase()));
}

const RestaurantGrid = ({
  searchQuery,
  deliveryAddress,
  cuisineFilter,
  excludeCuisine,
  sectionTitle,
  sectionSubtitle,
  horizontal = false,
  cardVariant = 'default',
  categoryFilter,
  customRestaurants,
  columns,
  useMarketplaceCatalog = false,
  useNearbyByLocation = false,
  marketplaceType = null,
  targetLocation = null,
  cuisineKeywords,
}: RestaurantGridProps = {}) => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const effectiveLocation = targetLocation ?? userLocation;
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<{ id: string; name: string; image?: string; cuisine?: string } | null>(null);

  // Get user's current location for delivery radius filtering (shared across instances)
  useEffect(() => {
    getSharedUserLocation((loc) => {
      if (loc) setUserLocation(loc);
    });
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
        marketplaceStatus: 'ACTIVE' as const,
      }));
      setRestaurants(dedupeMerchantsByName(formatted));
      setLoading(false);
    } else if (useNearbyByLocation) {
      fetchNearbyByLocation();
    } else if (useMarketplaceCatalog) {
      fetchMarketplaceRestaurants();
    } else {
      fetchRestaurants();
    }
  }, [searchQuery, deliveryAddress, cuisineFilter, cuisineKeywords, userLocation, categoryFilter, customRestaurants, useMarketplaceCatalog, useNearbyByLocation, marketplaceType]);

  const fetchNearbyByLocation = async () => {
    setLoading(true);
    const lat = effectiveLocation?.lat ?? 41.65;
    const lng = effectiveLocation?.lng ?? -83.54;
    const hasRealGps = !!effectiveLocation;
    const MAX_RADIUS = 25; // 25 mile hard cap
    const radii = [10, 15, 25];
    const minResults = 6;
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
          restaurant_type: row.restaurant_type || undefined,
          image_url: row.logo_url || row.image_url,
          latitude: row.lat != null ? Number(row.lat) : undefined,
          longitude: row.lng != null ? Number(row.lng) : undefined,
          rating: row.rating != null ? Number(row.rating) : undefined,
          min_delivery_time: row.min_delivery_time,
          max_delivery_time: row.max_delivery_time,
          delivery_fee_cents: row.delivery_fee_cents,
          is_promoted: row.is_promoted ?? false,
          marketplaceStatus: row.status === 'ACTIVE' ? 'ACTIVE' : row.status === 'COMING_SOON' ? 'COMING_SOON' : 'REQUESTABLE',
          request_count: row.request_count,
          marketplace_type: row.marketplace_type || 'restaurant',
        }));
        // National food chains show everywhere; local hotspots only within 25mi when GPS known.
        // Retail/mall marketplace_chains pins are anchored near (lat,lng); show within radius
        // even without GPS so Retail & Shopping is not blank when location consent is off.
        list = list.filter((r) => {
          if (isNationalChain(r.name)) return true;
          if (r.latitude == null || r.longitude == null) return false;
          const within = calculateDistance(lat, lng, r.latitude, r.longitude) <= MAX_RADIUS;
          const mt = r.marketplace_type || 'restaurant';
          if ((marketplaceType === 'retail' || marketplaceType === 'mall') && (mt === 'retail' || mt === 'mall')) {
            return within;
          }
          if (!hasRealGps) return false;
          return within;
        });
        if (list.length >= minResults || radius === MAX_RADIUS) break;
      }
      // Never show wrong type (match fetchMarketplaceRestaurants: retail includes category keywords)
      if (marketplaceType) {
        if (marketplaceType === 'retail') {
          list = list.filter(
            (r) => (r.marketplace_type || 'restaurant') === 'retail' || isRetailOrApparel(r.cuisine_type)
          );
        } else {
          list = list.filter((r) => (r.marketplace_type || 'restaurant') === marketplaceType);
        }
      }
      if (marketplaceType === 'restaurant') {
        list = list.filter((r) => !isRetailOrApparel(r.cuisine_type));
      }
      // Broaden low-density areas: enrich nearby with marketplace catalog rows
      // using the same selected location so discovery works outside core seed regions.
      if (list.length < 20) {
        try {
          const { data: catalogRows, error: catalogError } = await (supabase as any).rpc('get_marketplace_restaurants', {
            p_lat: lat,
            p_lng: lng,
            p_search: searchQuery || null,
            p_cuisine: cuisineFilter && cuisineFilter !== 'all' ? cuisineFilter : null,
            p_limit: 500,
            p_marketplace_type: marketplaceType && marketplaceType !== 'restaurant' ? marketplaceType : null,
            p_radius_miles: 60,
          });
          if (!catalogError && Array.isArray(catalogRows)) {
            const mapped: Restaurant[] = catalogRows.map((row: any) => ({
              id: row.id,
              name: row.name,
              cuisine_type: row.cuisine_type || row.category || '',
              restaurant_type: row.restaurant_type || undefined,
              image_url: row.logo_url || row.image_url,
              latitude: row.lat != null ? Number(row.lat) : undefined,
              longitude: row.lng != null ? Number(row.lng) : undefined,
              rating: row.rating != null ? Number(row.rating) : undefined,
              min_delivery_time: row.min_delivery_time,
              max_delivery_time: row.max_delivery_time,
              delivery_fee_cents: row.delivery_fee_cents,
              is_promoted: row.is_promoted ?? false,
              marketplaceStatus: row.status === 'ACTIVE' ? 'ACTIVE' : row.status === 'COMING_SOON' ? 'COMING_SOON' : 'REQUESTABLE',
              request_count: row.request_count,
              marketplace_type: row.marketplace_type || 'restaurant',
            }));
            const seen = new Set(list.map((r) => r.id));
            const merged = [...list];
            for (const row of mapped) {
              if (!seen.has(row.id)) {
                seen.add(row.id);
                merged.push(row);
              }
            }
            list = merged;
          }
        } catch {
          // Keep best-effort nearby list if catalog enrichment fails
        }
      }
      if (cuisineKeywords?.length) {
        list = list.filter((r) => matchesCuisineKeywords(r, cuisineKeywords));
      }
      list = dedupeMerchantsByName(list);
      if (excludeCuisine) {
        const excludeList = excludeCuisine.split(',').map(c => c.trim().toLowerCase());
        setRestaurants(list.filter(r => !r.cuisine_type || !excludeList.includes(r.cuisine_type.toLowerCase())));
      } else {
        setRestaurants(list);
      }
    } catch (err) {
      console.error('Error fetching nearby businesses:', err);
      if (marketplaceType) {
        await fetchMarketplaceRestaurants();
      } else {
        setRestaurants([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketplaceRestaurants = async () => {
    setLoading(true);
    const lat = effectiveLocation?.lat ?? 41.65;
    const lng = effectiveLocation?.lng ?? -83.54;
    try {
      const { data, error } = await (supabase as any).rpc('get_marketplace_restaurants', {
        p_lat: lat,
        p_lng: lng,
        p_search: searchQuery || null,
        p_cuisine: cuisineFilter && cuisineFilter !== 'all' ? cuisineFilter : null,
        p_limit: 300,
        p_marketplace_type: marketplaceType && marketplaceType !== 'restaurant' ? marketplaceType : null,
        p_radius_miles: 30,
      });
      if (error) throw error;
      let list: Restaurant[] = (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        cuisine_type: row.cuisine_type || row.category || '',
        restaurant_type: row.restaurant_type || undefined,
        image_url: row.image_url || row.logo_url,
        latitude: row.lat != null ? Number(row.lat) : undefined,
        longitude: row.lng != null ? Number(row.lng) : undefined,
        rating: row.rating != null ? Number(row.rating) : undefined,
        min_delivery_time: row.min_delivery_time,
        max_delivery_time: row.max_delivery_time,
        delivery_fee_cents: row.delivery_fee_cents,
        is_promoted: row.is_promoted ?? false,
        marketplaceStatus: row.status === 'ACTIVE' ? 'ACTIVE' : row.status === 'COMING_SOON' ? 'COMING_SOON' : 'REQUESTABLE',
        marketplace_type: row.marketplace_type || 'restaurant',
      }));
      // Never mix types: strict filter so restaurant sections never show retail/mall and vice versa
      if (marketplaceType === 'restaurant') {
        list = list.filter((r) => (r.marketplace_type || 'restaurant') === 'restaurant' && !isRetailOrApparel(r.cuisine_type));
      } else if (marketplaceType === 'retail') {
        // Retail section = catalog retail (marketplace_type 'retail') OR apparel/retail by category (active merchants)
        list = list.filter((r) => (r.marketplace_type || 'restaurant') === 'retail' || isRetailOrApparel(r.cuisine_type));
      } else if (marketplaceType === 'mall') {
        list = list.filter((r) => (r.marketplace_type || 'restaurant') === 'mall');
      }
      if (cuisineKeywords?.length) {
        list = list.filter((r) => matchesCuisineKeywords(r, cuisineKeywords));
      }
      list = dedupeMerchantsByName(list);
      if (excludeCuisine) {
        const excludeList = excludeCuisine.split(',').map(c => c.trim().toLowerCase());
        setRestaurants(list.filter(r => !r.cuisine_type || !excludeList.includes(r.cuisine_type.toLowerCase())));
      } else {
        setRestaurants(list);
      }
    } catch (err) {
      console.error('Error fetching marketplace restaurants:', err);
      // Fallback to active restaurants only so the section still shows (e.g. if RPC/migrations not deployed)
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

      // Filter by cuisine if provided and not 'all'
      // Note: We'll filter in JavaScript for case-insensitive matching
      // since Supabase eq() is case-sensitive

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

      // Filter by cuisine if provided and not 'all' (case-insensitive contains)
      if (cuisineFilter && cuisineFilter !== 'all') {
        const needle = cuisineFilter.toLowerCase();
        filteredData = filteredData.filter((restaurant: Restaurant) =>
          (restaurant.cuisine_type || '').toLowerCase().includes(needle)
        );
      }
      if (cuisineKeywords?.length) {
        filteredData = filteredData.filter((r) => matchesCuisineKeywords(r, cuisineKeywords));
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
          restaurant.cuisine_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
          restaurant.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      // National chains show everywhere; local spots only within 25mi
      const MAX_RADIUS = 25;
      if (filteredData.length > 0) {
        filteredData = filteredData.filter((restaurant: Restaurant) => {
          if (isNationalChain(restaurant.name)) return true;
          if (!restaurant.latitude || !restaurant.longitude) return false;
          if (!effectiveLocation) return false;
          const distance = calculateDistance(
            effectiveLocation.lat,
            effectiveLocation.lng,
            restaurant.latitude,
            restaurant.longitude
          );
          const radiusMiles = Math.min(restaurant.delivery_radius_miles ?? MAX_RADIUS, MAX_RADIUS);
          return distance <= radiusMiles;
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

      setRestaurants(dedupeMerchantsByName(filteredData));
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
      notifications.show({
        title: 'Request failed',
        message: error.message || 'Could not submit request. Try again.',
        color: 'red',
      });
      return;
    }
    if (data?.ok) {
      setRestaurants(prev => prev.map(r => r.id === masterId ? { ...r, request_count: (data.request_count as number) } : r));
      notifications.show({
        title: 'Request recorded',
        message: "We'll let this business know you want them on Crave'n!",
        color: 'green',
      });
    } else {
      notifications.show({
        title: 'Request failed',
        message: (data as any)?.error || 'Could not submit request. Try again.',
        color: 'red',
      });
    }
  };
  const notifyMeRestaurant = async (masterId: string, email?: string) => {
    const { data } = await (supabase as any).rpc('notify_me_restaurant', { p_restaurant_master_id: masterId, p_email: email || null });
    return data?.ok;
  };

  const formatRestaurantData = (restaurant: Restaurant) => {
    let distanceStr: string | undefined;
    if (effectiveLocation && restaurant.latitude != null && restaurant.longitude != null) {
      const miles = calculateDistance(
        effectiveLocation.lat, effectiveLocation.lng,
        restaurant.latitude, restaurant.longitude
      );
      distanceStr = `${miles.toFixed(1)} mi`;
    }
    const minTime = restaurant.min_delivery_time ?? 25;
    const feeCents = restaurant.delivery_fee_cents;
    return {
      id: restaurant.id,
      name: restaurant.name,
      image: resolveMerchantLogoUrl(restaurant.name, restaurant.image_url, undefined) || `https://placehold.co/600x400/f5f5f5/333?text=${encodeURIComponent(restaurant.name || 'Restaurant')}`,
      rating: restaurant.rating ?? 4,
      deliveryTime: `${minTime} min`,
      deliveryFee: feeCents === 0 ? "Free" : feeCents != null ? `$${(feeCents / 100).toFixed(2)}` : "—",
      cuisine: restaurant.cuisine_type,
      distance: distanceStr,
      isPromoted: restaurant.is_promoted ?? false,
      marketplaceStatus: restaurant.marketplaceStatus ?? 'ACTIVE',
      onRequest: restaurant.marketplaceStatus === 'REQUESTABLE' ? () => requestRestaurant(restaurant.id) : undefined,
      onNotifyMe: restaurant.marketplaceStatus === 'COMING_SOON' ? (email?: string) => notifyMeRestaurant(restaurant.id, email) : undefined,
      onShareWithBusiness: restaurant.marketplaceStatus === 'REQUESTABLE' ? (business) => {
        setSelectedBusiness(business);
        setRequestModalOpen(true);
      } : undefined,
    };
  };
  const sectionHeight = (customRestaurants && horizontal) ? "270px" : undefined;
  const isEmpty = restaurants.length === 0 && !loading;

  // When we have a section title (e.g. Cosmetic Stores, Pet Stores), always show the section; show empty state if no results
  if (isEmpty && !sectionTitle) {
    return null;
  }

  const emptyMessage = sectionTitle ? `No ${sectionTitle.toLowerCase()} to show yet.` : 'No results.';
  const isRail = horizontal;
  const useDenseRails = isRail && (cardVariant === 'food' || cardVariant === 'shelf');
  // Dense rails: food peeks, shelf is compact logo tiles
  const tileWidth =
    cardVariant === 'shelf' ? 128 : cardVariant === 'food' ? 'min(70vw, 260px)' : 280;

  const sectionHeader = sectionTitle ? (
    useDenseRails ? (
      <div className="container mx-auto px-4 mb-1.5 flex items-end justify-between gap-2">
        <h2 className="text-[16px] font-bold text-gray-900 tracking-tight m-0 leading-none">
          {sectionTitle}
        </h2>
        {!isEmpty && (
          <span className="text-[11px] font-semibold text-gray-400 tabular-nums flex-shrink-0">
            {restaurants.length}
          </span>
        )}
      </div>
    ) : (
      <div className="container mx-auto px-4 mb-1">
        <h2 className="text-2xl font-bold text-gray-900">{sectionTitle}</h2>
        {sectionSubtitle && (
          <p className="text-sm text-gray-500 mt-0.5 m-0">{sectionSubtitle}</p>
        )}
      </div>
    )
  ) : null;

  return <section className={useDenseRails ? 'py-0.5' : 'py-2'} style={{ backgroundColor: 'rgba(255, 255, 255, 1)', height: useDenseRails ? undefined : sectionHeight }}>
      {horizontal ? (
        <>
          {sectionHeader}
          {isEmpty ? (
            <div className="container mx-auto px-4 py-4 text-center text-gray-500 text-sm">{emptyMessage}</div>
          ) : (
          <div
            className="w-full overflow-x-auto scrollbar-hide"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
              scrollBehavior: 'smooth',
              ...(useDenseRails
                ? {
                    scrollSnapType: 'x mandatory',
                    scrollPaddingLeft: 16,
                    scrollPaddingRight: 16,
                  }
                : {}),
            }}
          >
            <div
              className={`flex px-4 ${useDenseRails ? 'gap-2 pb-2' : 'space-x-3 pb-4'}`}
              style={{ minWidth: 'max-content' }}
            >
              {restaurants.map((restaurant, index) => (
                <div
                  key={restaurant.id}
                  className="flex-shrink-0 animate-slide-up"
                  style={{
                    width: tileWidth,
                    animationDelay: `${Math.min(index, 6) * 60}ms`,
                    ...(useDenseRails ? { scrollSnapAlign: 'start' } : {}),
                  }}
                >
                  <RestaurantCard {...formatRestaurantData(restaurant)} variant={cardVariant} />
                </div>
              ))}
              {useDenseRails && <div className="flex-shrink-0 w-1" aria-hidden />}
            </div>
          </div>
          )}
        </>
      ) : (
        <div className="container mx-auto px-4">
          {sectionTitle && (
            <div className="mb-2 flex items-end justify-between gap-2">
              <h2 className="text-[16px] font-bold text-gray-900 tracking-tight m-0 leading-none">{sectionTitle}</h2>
              {!isEmpty && (
                <span className="text-[11px] font-semibold text-gray-400 tabular-nums">{restaurants.length}</span>
              )}
            </div>
          )}
          {!searchQuery && !deliveryAddress && !sectionTitle && <div className="text-center mb-8">
            
            
          </div>}

          {isEmpty ? (
            <div className="py-4 text-center text-gray-500 text-sm">{emptyMessage}</div>
          ) : (
          <div className={`grid gap-2.5 ${columns === 1 ? 'grid-cols-1' : columns === 2 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'}`}>
            {restaurants.map((restaurant, index) => <div key={restaurant.id} className="animate-slide-up" style={{
              animationDelay: `${index * 100}ms`
            }}>
              <RestaurantCard {...formatRestaurantData(restaurant)} variant={cardVariant} />
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
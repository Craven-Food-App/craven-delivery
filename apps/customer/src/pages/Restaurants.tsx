
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import RestaurantGrid from '@/components/RestaurantGrid';
import AccountPopup from '@/components/AccountPopup';
import { 
  Box, 
  Stack, 
  Group, 
  Text, 
  Title, 
  Button, 
  TextInput, 
  Badge, 
  Card, 
  ActionIcon, 
  Image as MantineImage,
  Menu,
  Drawer,
  Loader,
  Divider,
  Container,
  Grid,
  SegmentedControl,
  Paper,
  Overlay
} from '@mantine/core';
import { Carousel } from '@mantine/carousel';
import { useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  IconSearch, 
  IconMapPin, 
  IconFilter, 
  IconStar, 
  IconClock, 
  IconBolt, 
  IconTrendingUp, 
  IconChevronLeft, 
  IconPlus,
  IconBell,
  IconShoppingCart,
  IconHome,
  IconToolsKitchen2,
  IconCoffee,
  IconBuildingStore,
  IconHeart,
  IconUser,
  IconSettings,
  IconChevronRight,
  IconFlame,
  IconAward,
  IconTruck,
  IconShield,
  IconCurrencyDollar,
  IconAlarm,
  IconNavigation,
  IconMenu2,
  IconX,
  IconSparkles,
  IconCrown,
  IconGift,
  IconTarget,
  IconTrendingDown,
  IconUsers,
  IconWorld,
  IconDeviceMobile,
  IconWifi,
  IconCreditCard,
  IconShieldCheck,
  IconPhone,
  IconMessageCircle,
  IconShare,
  IconBookmark,
  IconEye,
  IconThumbUp,
  IconRefresh,
  IconChevronDown,
  IconAdjustments,
  IconSortAscending,
  IconGrid3x3,
  IconList,
  IconLayersLinked,
  IconCompass,
  IconPackage,
  IconShirt
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';
import cravenLogo from "@/assets/craven-logo.png";
import heroPromoImage from "@/assets/20251116_0529_Crave'n Delivery Promo_remix_01ka63adc2e2et6qwwt2p909xn.png";

// Professional Rating Icon Component
const RatingPill = ({ rating }: { rating: number }) => (
  <Group gap={4} style={{ backgroundColor: 'white', padding: '4px 8px', borderRadius: '9999px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
    <IconStar size={12} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
    <Text size="xs" fw={600} c="gray.9">{rating}</Text>
  </Group>
);

// Promo Card Component
const PromoCard = ({ title, subtitle, image, bannerId }: { title: string; subtitle: string; image: string; bannerId?: string }) => {
  const navigate = useNavigate();
  
  return (
    <Paper
      shadow="md"
      p="xl"
      radius="md"
      style={{
        height: '250px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundImage: `url(${image})`,
        position: 'relative'
      }}
    >
      <Overlay
        opacity={0.55}
        zIndex={0}
        style={{
          backgroundImage: 'linear-gradient(105deg, var(--mantine-color-black) 20%, #312f2f 50%, var(--mantine-color-gray-4) 100%)'
        }}
      />
      <Box style={{ position: 'absolute', inset: 0, padding: 'var(--mantine-spacing-xl)', zIndex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '250px' }}>
        <Box>
          <Title order={3} c="white" fw={600} style={{ lineHeight: 1.2, fontSize: '32px', marginTop: 'var(--mantine-spacing-xs)', whiteSpace: 'nowrap' }}>
            {title}
          </Title>
          <Text size="sm" c="white" style={{ opacity: 0.9, marginTop: 'var(--mantine-spacing-xs)', whiteSpace: 'nowrap' }}>
            {subtitle}
          </Text>
        </Box>
        <Button
          variant="white"
          color="dark"
          onClick={() => navigate('/promotion-details')}
          style={{ position: 'absolute', bottom: 'var(--mantine-spacing-xl)', right: 'var(--mantine-spacing-xl)' }}
        >
          View Details
        </Button>
      </Box>
    </Paper>
  );
};

// Professional Restaurant Card
const RestaurantCard = ({ 
  restaurant, 
  likedItems, 
  toggleLike 
}: { 
  restaurant: any; 
  likedItems: Set<string>; 
  toggleLike: (id: string) => void;
}) => {
  const navigate = useNavigate();
  
  return (
    <Box
      style={{ 
        minWidth: '280px', 
        cursor: 'pointer',
        transition: 'all 0.3s',
      }}
      onClick={() => navigate(`/restaurant/${restaurant.id}/menu`)}
    >
      {/* Image with rounded corners and overlay tags */}
      <Box style={{ position: 'relative', height: '200px', backgroundColor: 'white', overflow: 'hidden', borderRadius: '12px', marginBottom: '12px' }}>
        <MantineImage
          src={restaurant.image || restaurant.image_url || `https://placehold.co/600x400/f5f5f5/333?text=Craven`}
          alt={restaurant.name}
          style={{ width: '100%', height: '175px', objectFit: 'cover' }}
          onError={(e) => { 
            e.currentTarget.src = "https://placehold.co/600x400/f5f5f5/333?text=Craven"; 
          }}
        />
        {/* Overlay tags */}
        <Box style={{ position: 'absolute', top: '8px', left: '8px', right: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {restaurant.isSponsored && (
            <Badge size="sm" style={{ backgroundColor: '#ff5f1f', color: 'white', fontWeight: 600 }}>
              Promoted
            </Badge>
          )}
          {(restaurant.restaurantPromo?.toLowerCase().includes('free delivery') || restaurant.delivery_fee_cents === 0) && (
            <Badge size="sm" style={{ backgroundColor: '#10b981', color: 'white', fontWeight: 600 }}>
              Free Delivery
            </Badge>
          )}
        </Box>
      </Box>

      {/* Row 1: Star rating (left) and Restaurant name (right) */}
      <Group justify="space-between" align="center" mb="xs" wrap="nowrap">
        {/* Star rating on left */}
        <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
          <IconStar size={14} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
          <Text size="sm" fw={500} c="gray.8">{restaurant.rating || 4.5}</Text>
        </Group>
        {/* Restaurant name on right */}
        <Text size="lg" fw={700} c="gray.9" lineClamp={1} style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
          {restaurant.name}
        </Text>
      </Group>

      {/* Row 2: Promo text (left) and Distance/time (right) */}
      <Group justify="space-between" align="center" mb="xs" wrap="nowrap">
        {/* Promo text on left */}
        <Box style={{ flex: 1, minWidth: 0 }}>
          {restaurant.restaurantPromo && (
            <Text size="sm" c="gray.8" lineClamp={1} style={{ verticalAlign: 'top' }}>
              {restaurant.restaurantPromo}
            </Text>
          )}
          {restaurant.discountPromo && (
            <Text size="sm" fw={600} c="red.7" lineClamp={1}>
              {restaurant.discountPromo}
            </Text>
          )}
          {!restaurant.restaurantPromo && !restaurant.discountPromo && restaurant.isSponsored && (
            <Text size="sm" c="gray.5" style={{ fontWeight: 400 }}>
              Sponsored
            </Text>
          )}
        </Box>
        {/* Distance and time on right */}
        <Text size="sm" c="gray.7" style={{ flexShrink: 0, marginLeft: '8px' }}>
          - {restaurant.distance || '0.8 mi'} - {restaurant.time || '20 min'}
        </Text>
      </Group>
    </Box>
  );
};

const Restaurants = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [location, setLocation] = useState(searchParams.get('location') || '6759 Nebraska Ave');
  const [cuisineFilter, setCuisineFilter] = useState(searchParams.get('cuisine') || 'all');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'rating');
  const [weeklyDeals, setWeeklyDeals] = useState<any[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(true);
  const [promotionalBanners, setPromotionalBanners] = useState<any[]>([]);
  const [loadingBanners, setLoadingBanners] = useState(true);
  const [heroImageUrl, setHeroImageUrl] = useState<string>('');
  const [loadingHeroImage, setLoadingHeroImage] = useState(true);
  const [adPlacements, setAdPlacements] = useState<any[]>([]);
  const [loadingAds, setLoadingAds] = useState(true);
  const [randomizedAds, setRandomizedAds] = useState<any[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [activeFilter, setActiveFilter] = useState('deals');
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [showMenuIcons, setShowMenuIcons] = useState(false); // Start collapsed
  const [activeCategory, setActiveCategory] = useState('all');
  const [quickFilter, setQuickFilter] = useState<string | null>(null);
  const [apparelCategoryFilter, setApparelCategoryFilter] = useState<string>('all'); // 'all', 'Apparel', 'Accessories', 'Shoes'
  
  // Mobile app states
  // Check cached auth state first to prevent flash
  const getCachedAuthState = () => {
    if (typeof window === 'undefined') return false;
    const cached = sessionStorage.getItem('craven_auth_state');
    if (cached) {
      try {
        const { isAuthenticated, timestamp } = JSON.parse(cached);
        // Cache is valid for 5 minutes
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          return isAuthenticated;
        }
      } catch (e) {
        // Invalid cache, ignore
      }
    }
    return null; // No cached state
  };

  const cachedAuth = getCachedAuthState();
  const [showMain, setShowMain] = useState(cachedAuth === true);
  const [checkingAuth, setCheckingAuth] = useState(cachedAuth === null); // Only check if no cache
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set());
  
  // Login form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  
  // New state for enhanced functionality
  const [deliveryMode, setDeliveryMode] = useState<'delivery' | 'pickup'>('delivery');
  const [showAddressSelector, setShowAddressSelector] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [addressSuggestionsData, setAddressSuggestionsData] = useState<any[]>([]); // Store full address data
  const [addressSearchQuery, setAddressSearchQuery] = useState<string>('');
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<any[]>([]);
  const [showAccountPopup, setShowAccountPopup] = useState(false);
  const [accountPopupPosition, setAccountPopupPosition] = useState({ top: 0, left: 0 });
  const [availableCuisines, setAvailableCuisines] = useState<string[]>([]);
  
  // Get cart from context
  const { cartCount, cartItems: contextCartItems, getCartTotal, removeFromCart: removeFromCartContext } = useCart();
  
  // Icon mapping for cuisine types
  const getCuisineIcon = (cuisine: string) => {
    const cuisineLower = cuisine.toLowerCase();
    if (cuisineLower.includes('pizza') || cuisineLower.includes('italian')) return IconToolsKitchen2;
    if (cuisineLower.includes('chinese') || cuisineLower.includes('asian')) return IconToolsKitchen2;
    if (cuisineLower.includes('mexican') || cuisineLower.includes('taco')) return IconToolsKitchen2;
    if (cuisineLower.includes('burger') || cuisineLower.includes('american')) return IconToolsKitchen2;
    if (cuisineLower.includes('sushi') || cuisineLower.includes('japanese')) return IconToolsKitchen2;
    if (cuisineLower.includes('indian')) return IconToolsKitchen2;
    if (cuisineLower.includes('thai')) return IconToolsKitchen2;
    if (cuisineLower.includes('breakfast') || cuisineLower.includes('brunch')) return IconCoffee;
    if (cuisineLower.includes('dessert') || cuisineLower.includes('bakery') || cuisineLower.includes('sweet')) return IconSparkles;
    if (cuisineLower.includes('grocery') || cuisineLower.includes('market')) return IconBuildingStore;
    if (cuisineLower.includes('seafood')) return IconToolsKitchen2;
    if (cuisineLower.includes('mediterranean')) return IconToolsKitchen2;
    if (cuisineLower.includes('bbq') || cuisineLower.includes('barbecue')) return IconFlame;
    return IconToolsKitchen2; // Default icon
  };
  
  // Filter restaurants based on cuisine filter
  const filteredWeeklyDeals = quickFilter 
    ? weeklyDeals.filter((r: any) => r.cuisine_type?.toLowerCase() === quickFilter.toLowerCase())
    : weeklyDeals;
  
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const currentLocation = useLocation();
  const mobile = useMediaQuery('(max-width: 48em)');
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const weeklyDealsScrollRef = useRef<HTMLDivElement>(null);
  const featuredScrollRef = useRef<HTMLDivElement>(null);
  const apparelSectionRef = useRef<HTMLDivElement>(null);
  const restaurantsSectionRef = useRef<HTMLDivElement>(null);
  const retailSectionRef = useRef<HTMLDivElement>(null);
  const lateNateHungerSectionRef = useRef<HTMLDivElement>(null);
  const kidsSectionRef = useRef<HTMLDivElement>(null);
  const addressSelectorRef = useRef<HTMLDivElement | null>(null);

  const toggleLike = useCallback((id: string) => {
    setLikedItems(prev => {
      const newLiked = new Set(prev);
      if (newLiked.has(id)) {
        newLiked.delete(id);
      } else {
        newLiked.add(id);
      }
      return newLiked;
    });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (location) params.set('location', location);
    if (cuisineFilter && cuisineFilter !== 'all') params.set('cuisine', cuisineFilter);
    if (sortBy !== 'rating') params.set('sort', sortBy);
    setSearchParams(params);
  }, [searchQuery, location, cuisineFilter, sortBy, setSearchParams]);

  const handleSearch = () => {
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Handle login submission - phone or email
  const handleAddressSubmit = async () => {
    if (!email.trim()) {
      notifications.show({
        title: 'Email Required',
        message: 'Please enter your email to continue.',
        color: 'orange',
        autoClose: 3000,
      });
      return;
    }

    if (!password.trim()) {
      notifications.show({
        title: 'Password Required',
        message: 'Please enter your password to continue.',
        color: 'orange',
        autoClose: 3000,
      });
      return;
    }

    if (isSignUp) {
      if (!fullName.trim()) {
        notifications.show({
          title: 'Name Required',
          message: 'Please enter your full name to continue.',
          color: 'orange',
          autoClose: 3000,
        });
        return;
      }

      if (password !== confirmPassword) {
        notifications.show({
          title: 'Passwords Do Not Match',
          message: 'Please make sure your passwords match.',
          color: 'red',
          autoClose: 3000,
        });
        return;
      }

      if (password.length < 6) {
        notifications.show({
          title: 'Password Too Short',
          message: 'Password must be at least 6 characters.',
          color: 'red',
          autoClose: 3000,
        });
        return;
      }
    }

    setAuthLoading(true);

    try {
      if (isSignUp) {
        // Sign up
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            emailRedirectTo: `${window.location.origin}/restaurants`,
            data: {
              full_name: fullName.trim(),
            }
          }
        });

        if (error) throw error;

        if (data.user) {
          notifications.show({
            title: 'Account Created!',
            message: 'Please check your email to verify your account.',
            color: 'green',
            autoClose: 5000,
          });
          
          // Reset form
          setEmail('');
          setPassword('');
          setConfirmPassword('');
          setFullName('');
          setIsSignUp(false);
        }
      } else {
        // Sign in
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('Invalid email or password. Please check your credentials.');
          }
          throw error;
        }

        if (data.user) {
          notifications.show({
            title: 'Welcome back!',
            message: 'Signing you in...',
            color: 'green',
            autoClose: 2000,
          });
          
          // Auth state change will handle navigation
        }
      }
    } catch (error: any) {
      notifications.show({
        title: isSignUp ? 'Sign Up Failed' : 'Sign In Failed',
        message: error.message || `An error occurred during ${isSignUp ? 'sign up' : 'sign in'}`,
        color: 'red',
        autoClose: 5000,
      });
    } finally {
      setAuthLoading(false);
    }
  };

  // Address selector functionality
  const handleAddressSearch = async (query: string) => {
    setAddressSearchQuery(query);
    
    if (query.length < 3) {
      setAddressSuggestions([]);
      setAddressSuggestionsData([]);
      return;
    }
    
    try {
      let mapboxToken = '';
      
      // Try to get token from edge function first (production)
      try {
        const { data } = await supabase.functions.invoke('get-mapbox-token');
        if (data?.token) {
          mapboxToken = data.token;
        }
      } catch (edgeFunctionError) {
        console.warn('Edge function not available, using fallback token for development');
      }

      // Fallback to development token if edge function fails
      if (!mapboxToken) {
        mapboxToken = 'pk.eyJ1IjoiY3JhdmUtbiIsImEiOiJjbWVxb21qbTQyNTRnMm1vaHg5bDZwcmw2In0.aOsYrL2B0cjfcCGW1jHAdw';
      }

      if (!mapboxToken) {
        throw new Error('Mapbox token not available');
      }

      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
        `access_token=${mapboxToken}&` +
        `country=US&` + // Limit to US addresses
        `autocomplete=true&` +
        `types=address,poi&` + // Focus on addresses and points of interest
        `limit=5`
      );

      const result = await response.json();

      let formatted: string[] = [];
      let formattedData: any[] = [];
      if (response.ok && Array.isArray(result?.features)) {
        formatted = result.features.map((feature: any) => feature.place_name);
        formattedData = result.features.map((feature: any) => ({
          place_name: feature.place_name,
          center: feature.center,
          context: feature.context,
          address: feature.address,
          text: feature.text,
          properties: feature.properties,
          source: 'mapbox'
        }));
      }

      // Fallback: use Nominatim (OpenStreetMap) if Mapbox fails or returns no features
      if (!formatted.length) {
        try {
          const nominatimResp = await fetch(
            `https://nominatim.openstreetmap.org/search?` +
            `q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`
          );
          const nomiJson = await nominatimResp.json();
          if (Array.isArray(nomiJson)) {
            formatted = nomiJson.map((item: any) => item.display_name);
            formattedData = nomiJson.map((item: any) => ({
              place_name: item.display_name,
              center: [Number(item.lon), Number(item.lat)],
              addressdetails: item.addressdetails,
              source: 'nominatim'
            }));
          }
        } catch (fallbackErr) {
          console.warn('Nominatim fallback failed:', fallbackErr);
        }
      }

      setAddressSuggestions(formatted);
      setAddressSuggestionsData(formattedData);
    } catch (error) {
      console.error('Address search failed:', error);
      setAddressSuggestions([]);
      setAddressSuggestionsData([]);
    }
  };

  // Parse address from Mapbox or Nominatim response
  const parseAddress = (addressData: any): { street_address: string; city: string; state: string; zip_code: string } => {
    if (addressData.source === 'mapbox') {
      const context = addressData.context || [];
      const street = addressData.address ? `${addressData.address} ${addressData.text}` : addressData.text || '';
      const city = context.find((c: any) => c.id?.startsWith('place'))?.text || '';
      const state = context.find((c: any) => c.id?.startsWith('region'))?.text || '';
      const zip = context.find((c: any) => c.id?.startsWith('postcode'))?.text || '';
      
      return {
        street_address: street.trim(),
        city: city.trim(),
        state: state.trim(),
        zip_code: zip.trim()
      };
    } else if (addressData.source === 'nominatim') {
      const addr = addressData.addressdetails || {};
      return {
        street_address: `${addr.house_number || ''} ${addr.road || ''}`.trim(),
        city: addr.city || addr.town || addr.village || '',
        state: addr.state || '',
        zip_code: addr.postcode || ''
      };
    }
    
    // Fallback: try to parse from place_name
    const parts = addressData.place_name?.split(',') || [];
    return {
      street_address: parts[0]?.trim() || '',
      city: parts[1]?.trim() || '',
      state: parts[2]?.trim() || '',
      zip_code: parts[3]?.trim() || ''
    };
  };

  const selectAddress = async (address: string, index?: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // If not logged in, just set location without saving
        setLocation(address);
        setAddressSearchQuery('');
        setAddressSuggestions([]);
        setAddressSuggestionsData([]);
        setShowAddressSelector(false);
        notifications.show({
          title: "Location Updated",
          message: `Delivery address set to ${address}`,
          color: 'orange',
        });
        return;
      }

      // Get the full address data for this selection
      const addressData = index !== undefined && addressSuggestionsData[index] 
        ? addressSuggestionsData[index] 
        : null;

      if (addressData) {
        // Parse the address components
        const parsed = parseAddress(addressData);
        
        // Check if address already exists
        const { data: existingAddresses } = await supabase
          .from('delivery_addresses')
          .select('*')
          .eq('user_id', user.id)
          .eq('street_address', parsed.street_address)
          .eq('city', parsed.city)
          .eq('state', parsed.state)
          .eq('zip_code', parsed.zip_code);

        // Only save if it doesn't already exist
        if (!existingAddresses || existingAddresses.length === 0) {
          // Save the address
          const { error: saveError } = await supabase
            .from('delivery_addresses')
            .insert({
              user_id: user.id,
              label: 'Other', // Default label for manually entered addresses
              street_address: parsed.street_address,
              city: parsed.city,
              state: parsed.state,
              zip_code: parsed.zip_code,
              is_default: false
            });

          if (saveError) {
            console.error('Error saving address:', saveError);
            notifications.show({
              title: "Address Saved",
              message: `Location updated. Note: Address could not be saved to your saved addresses.`,
              color: 'orange',
            });
          } else {
            // Refresh saved addresses
            await fetchSavedAddresses();
            notifications.show({
              title: "Address Saved",
              message: `Delivery address saved and set to ${address}`,
              color: 'green',
            });
          }
        } else {
          notifications.show({
            title: "Location Updated",
            message: `Delivery address set to ${address}`,
            color: 'orange',
          });
        }
      } else {
        // If we don't have full data, just set the location
        notifications.show({
          title: "Location Updated",
          message: `Delivery address set to ${address}`,
          color: 'orange',
        });
      }

      setLocation(address);
      setAddressSearchQuery('');
      setAddressSuggestions([]);
      setAddressSuggestionsData([]);
      setShowAddressSelector(false);
    } catch (error) {
      console.error('Error selecting address:', error);
      // Still set the location even if save fails
      setLocation(address);
      setAddressSearchQuery('');
      setAddressSuggestions([]);
      setAddressSuggestionsData([]);
      setShowAddressSelector(false);
      notifications.show({
        title: "Location Updated",
        message: `Delivery address set to ${address}`,
        color: 'orange',
      });
    }
  };

  // Fetch saved delivery addresses
  const fetchSavedAddresses = async () => {
    try {
      setLoadingAddresses(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSavedAddresses([]);
        return;
      }

      const { data, error } = await supabase
        .from('delivery_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedAddresses(data || []);
    } catch (error) {
      console.error('Error fetching saved addresses:', error);
      setSavedAddresses([]);
    } finally {
      setLoadingAddresses(false);
    }
  };

  const selectSavedAddress = (address: any) => {
    const fullAddress = `${address.street_address}, ${address.city}, ${address.state} ${address.zip_code}`;
    setLocation(fullAddress);
    setAddressSearchQuery('');
    setAddressSuggestions([]);
    setAddressSuggestionsData([]);
    setShowAddressSelector(false);
    notifications.show({
      title: "Location Updated",
      message: `Delivery address set to ${address.label || fullAddress}`,
      color: 'orange',
    });
  };

  const handleAddressButtonClick = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setShowMain(false);
      return;
    }
    setShowAddressSelector(!showAddressSelector);
  };

  // Notifications functionality
  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setNotificationsList([]);
        return;
      }

      // Fetch from order_notifications table
      const { data: orderNotifs, error: orderError } = await supabase
        .from('order_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (orderError) {
        console.error('Error fetching notifications:', orderError);
        setNotificationsList([]);
        return;
      }

      // Also check notification_logs for promo offers
      const { data: logNotifs, error: logError } = await supabase
        .from('notification_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('notification_type', 'promotion')
        .order('created_at', { ascending: false })
        .limit(20);

      // Combine and format notifications
      const formattedNotifications = [
        ...(orderNotifs || []).map(n => ({
          id: n.id,
          title: n.title,
          message: n.message,
          time: new Date(n.created_at).toLocaleString(),
          read: n.is_read || false,
          type: n.notification_type || 'order'
        })),
        ...(logNotifs || []).map(n => ({
          id: n.id,
          title: n.title,
          message: n.body,
          time: new Date(n.created_at || new Date()).toLocaleString(),
          read: n.status === 'clicked',
          type: 'promotion'
        }))
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

      setNotificationsList(formattedNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotificationsList([]);
    }
  };

  // Cart functionality
  const addToCart = (item: any) => {
    setCartItems(prev => [...prev, item]);
    notifications.show({
      title: "Added to Cart",
      message: `${item.name} has been added to your cart`,
      color: 'orange',
    });
  };


  // Filter functionality
  const applyFilters = () => {
    // This would filter restaurants based on active filters
    // For now, we'll just show a notification
    notifications.show({
      title: "Filters Applied",
      message: `Showing ${activeFilter} restaurants`,
      color: 'orange',
    });
  };

  // Scroll functions for horizontal sections
  const scrollWeeklyDealsLeft = () => {
    if (weeklyDealsScrollRef.current) {
      weeklyDealsScrollRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const scrollWeeklyDealsRight = () => {
    if (weeklyDealsScrollRef.current) {
      weeklyDealsScrollRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  const scrollFeaturedLeft = () => {
    if (featuredScrollRef.current) {
      featuredScrollRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const scrollFeaturedRight = () => {
    if (featuredScrollRef.current) {
      featuredScrollRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  // Fetch promoted restaurants for weekly deals
  const fetchWeeklyDeals = async () => {
    try {
      setLoadingDeals(true);
      const { data, error } = await supabase
        .from('restaurants')
        .select(`
          *,
          promotion_title,
          promotion_description,
          promotion_discount_percentage,
          promotion_discount_amount_cents,
          promotion_minimum_order_cents,
          promotion_maximum_discount_cents,
          promotion_valid_until,
          promotion_image_url
        `)
        .eq('is_promoted', true)
        .eq('is_active', true)
        .order('rating', { ascending: false })
        .limit(6);

      if (error) throw error;
      setWeeklyDeals(data || []);
    } catch (error) {
      console.error('Error fetching weekly deals:', error);
      setWeeklyDeals([]);
    } finally {
      setLoadingDeals(false);
    }
  };

  // Common cuisine types - always show these
  const commonCuisines = [
    'American',
    'Italian',
    'Chinese',
    'Mexican',
    'Japanese',
    'Indian',
    'Thai',
    'Mediterranean',
    'Korean',
    'Vietnamese',
    'French',
    'Greek',
    'BBQ',
    'Seafood',
    'Breakfast',
    'Dessert',
    'Pizza',
    'Burgers',
    'Sushi',
    'Steakhouse'
  ];

  // Fetch available cuisine types (for future use, but always show common cuisines)
  const fetchAvailableCuisines = async () => {
    // Always set to common cuisines for now
    setAvailableCuisines(commonCuisines);
    
    // Optional: Also fetch from database to see what's available
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('cuisine_type')
        .eq('is_active', true)
        .not('cuisine_type', 'is', null);

      if (!error && data) {
        // Get unique cuisine types from database
        const uniqueCuisines = Array.from(
          new Set(
            (data || [])
              .map((r: any) => r.cuisine_type)
              .filter((c: string | null) => c && c.trim() !== '')
          )
        ) as string[];
        
        // Merge with common cuisines, prioritizing database cuisines
        const allCuisines = [...new Set([...uniqueCuisines, ...commonCuisines])].sort();
        setAvailableCuisines(allCuisines);
      }
    } catch (error) {
      console.error('Error fetching cuisine types:', error);
      // Keep common cuisines on error
    }
  };

  // Randomize ads every hour on the hour
  const randomizeAds = useCallback(() => {
    // Combine ad placements and promotional banners
    const allAds: any[] = [];
    
    // Add ad placements
    const adPlacement = adPlacements.find(ad => ad.placement_key === 'below_quick_picks');
    if (adPlacement) {
      allAds.push({
        ...adPlacement,
        type: 'ad_placement',
        click_url: adPlacement.click_url || null // Only use link if set in database
      });
    }
    
    // Add promotional banners
    promotionalBanners.forEach(banner => {
      allAds.push({
        ...banner,
        type: 'promotional_banner',
        click_url: banner.action_url || banner.link_url || null, // Only use link if set in database
        image_url: banner.image_url,
        width: 380,
        height: 200
      });
    });
    
    // Shuffle array using Fisher-Yates algorithm
    const shuffled = [...allAds];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    setRandomizedAds(shuffled);
    setCurrentAdIndex(0);
  }, [adPlacements, promotionalBanners]);

  // Set up hourly randomization
  useEffect(() => {
    if (loadingAds || loadingBanners) return;
    if (adPlacements.length === 0 && promotionalBanners.length === 0) return;
    
    // Randomize immediately
    randomizeAds();
    
    // Calculate milliseconds until next hour
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);
    const msUntilNextHour = nextHour.getTime() - now.getTime();
    
    // Set timeout for next hour
    const hourlyTimeout = setTimeout(() => {
      randomizeAds();
      // Then set interval for every hour
      const hourlyInterval = setInterval(() => {
        randomizeAds();
      }, 60 * 60 * 1000); // 1 hour in milliseconds
      
      return () => clearInterval(hourlyInterval);
    }, msUntilNextHour);
    
    return () => clearTimeout(hourlyTimeout);
  }, [adPlacements, promotionalBanners, loadingAds, loadingBanners, randomizeAds]);

  // Auto-rotate carousel every 5 seconds
  useEffect(() => {
    if (randomizedAds.length <= 1) return;
    
    const rotationInterval = setInterval(() => {
      setCurrentAdIndex((prev) => (prev + 1) % randomizedAds.length);
    }, 5000); // 5 seconds
    
    return () => clearInterval(rotationInterval);
  }, [randomizedAds.length]);

  // Fetch deals on component mount
  useEffect(() => {
    fetchWeeklyDeals();
    fetchNotifications();
    fetchPromotionalBanners();
    fetchHeroImage();
    fetchAvailableCuisines();
    fetchAdPlacements();
    fetchSavedAddresses();
  }, []);

  // Fetch addresses when selector opens
  useEffect(() => {
    if (showAddressSelector) {
      fetchSavedAddresses();
    }
  }, [showAddressSelector]);

  // Fetch addresses when selector opens
  useEffect(() => {
    if (showAddressSelector) {
      fetchSavedAddresses();
    }
  }, [showAddressSelector]);

  // Update filter options based on delivery mode
  useEffect(() => {
    const updatedFilters = filterOptions.map(filter => ({
      ...filter,
      active: filter.id === activeFilter
    }));
    // This would update the filter options in real implementation
  }, [activeFilter, deliveryMode]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Check if click is inside any dropdown or the address selector button
      const isInsideDropdown = target.closest('[data-dropdown]');
      const isAddressButton = target.closest('button[onclick*="setShowAddressSelector"]') || 
                              target.closest('.address-selector-button') ||
                              target.closest('[class*="address-selector"]');
      // Also check if click is inside the address selector ref
      const isInsideAddressSelector = addressSelectorRef.current?.contains(target);
      
      if (!isInsideDropdown && !isAddressButton && !isInsideAddressSelector) {
        setShowAddressSelector(false);
        setShowNotifications(false);
        setShowCart(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Navigation categories
  const navCategories = [
    { id: 'all', label: 'All', icon: IconHome, active: activeCategory === 'all' },
    { id: 'grocery', label: 'Grocery', icon: IconBuildingStore, active: activeCategory === 'grocery' },
    { id: 'convenience', label: 'Quick Stops', icon: IconCoffee, active: activeCategory === 'convenience' },
    { id: 'dashmart', label: "Craven'Z", icon: IconBuildingStore, active: activeCategory === 'dashmart' },
    { id: 'beauty', label: 'Cosmetics', icon: IconHeart, active: activeCategory === 'beauty' },
    { id: 'apparel', label: 'Apparel', icon: IconShirt, active: activeCategory === 'apparel' },
    { id: 'pets', label: 'Animals', icon: IconHeart, active: activeCategory === 'pets' },
    { id: 'health', label: 'Self Care', icon: IconShield, active: activeCategory === 'health' },
    { id: 'browse', label: 'Browse All', icon: IconSearch, active: activeCategory === 'browse' },
    { id: 'orders', label: 'Orders', icon: IconClock, active: activeCategory === 'orders' },
    { id: 'account', label: 'Account', icon: IconUser, active: activeCategory === 'account' }
  ];

  const handleCategoryClick = (categoryId: string) => {
    setActiveCategory(categoryId);
    
    // Handle different category types
    if (categoryId === 'all' || categoryId === 'browse') {
      setCuisineFilter('all');
      setApparelCategoryFilter('all'); // Reset apparel filter when switching away
    } else if (['grocery', 'convenience', 'dashmart', 'beauty', 'apparel', 'pets', 'health'].includes(categoryId)) {
      // Don't change cuisineFilter for menu clicks - just scroll to the section
      // The sections are always visible in the mobile layout
      setApparelCategoryFilter('all');
    } else if (categoryId === 'orders') {
      // Navigate to orders page
      navigate('/order-history');
      return;
    } else if (categoryId === 'account') {
      // Navigate to customer dashboard account tab
      navigate('/account');
      return;
    }
    
    // Scroll to results section for restaurant categories
    if (['all', 'browse', 'grocery', 'convenience', 'dashmart', 'beauty', 'apparel', 'pets', 'health'].includes(categoryId)) {
      setTimeout(() => {
        if (categoryId === 'apparel' && apparelSectionRef.current) {
          apparelSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setTimeout(() => {
            window.scrollBy({ top: -100, behavior: 'smooth' });
          }, 300);
        } else if (resultsRef.current) {
          resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setTimeout(() => {
            window.scrollBy({ top: -100, behavior: 'smooth' });
          }, 300);
        }
      }, 100);
    }
  };

  // Filter options
  const filterOptions = [
    { id: 'deals', label: 'Deals', active: true },
    { id: 'pickup', label: 'Pickup' },
    { id: 'rating', label: 'Over 4.5★' },
    { id: 'time', label: 'Under 30 min' },
    { id: 'price', label: 'Price' },
    { id: 'dashpass', label: 'CravePass' }
  ];

  // Fetch promotional banners from database
  const fetchPromotionalBanners = async () => {
    try {
      setLoadingBanners(true);
      const { data, error } = await supabase
        .from('promotional_banners')
        .select('*')
        .eq('is_active', true)
        .or(`valid_until.is.null,valid_until.gt.${new Date().toISOString()}`)
        .order('display_order', { ascending: true })
        .limit(10);

      if (error) throw error;
      setPromotionalBanners(data || []);
    } catch (error) {
      console.error('Error fetching promotional banners:', error);
      // Fallback to empty array if fetch fails
      setPromotionalBanners([]);
    } finally {
      setLoadingBanners(false);
    }
  };

  const fetchAdPlacements = async () => {
    try {
      setLoadingAds(true);
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
        // If table doesn't exist yet, just log and continue
        if (error.code === 'PGRST205' || error.message?.includes('not found')) {
          console.log('Ad placements table not found - migration may not be applied yet');
          setAdPlacements([]);
        } else {
          throw error;
        }
      } else {
        setAdPlacements(data || []);
      }
    } catch (error) {
      console.error('Error fetching ad placements:', error);
      setAdPlacements([]);
    } finally {
      setLoadingAds(false);
    }
  };

  // Fetch hero image from marketing settings
  const fetchHeroImage = async () => {
    try {
      setLoadingHeroImage(true);
      const { data, error } = await supabase
        .from('marketing_settings')
        .select('mobile_hero_image_url')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      
      const imageUrl = data?.mobile_hero_image_url || '';
      setHeroImageUrl(imageUrl);
    } catch (error) {
      console.error('Error fetching hero image:', error);
      // Fallback to empty string if fetch fails
      setHeroImageUrl('');
    } finally {
      setLoadingHeroImage(false);
    }
  };

  // Restaurant data - transform from database
  const getRestaurantData = () => {
    const fastest = weeklyDeals.slice(0, 3).map((r) => {
      // Format restaurant promo (e.g., "$0 delivery fee, first order")
      const deliveryFeeCents = r.delivery_fee_cents || 0;
      const restaurantPromo = deliveryFeeCents === 0 
        ? "$0 delivery fee, first order"
        : r.promotion_description || null;

      // Format discount promo
      let discountPromo = null;
      if (r.promotion_discount_percentage) {
        discountPromo = `${r.promotion_discount_percentage}% off`;
      } else if (r.promotion_discount_amount_cents) {
        const discountAmount = (r.promotion_discount_amount_cents / 100).toFixed(2);
        discountPromo = `$${discountAmount} off`;
      }

      return {
      id: r.id,
      name: r.name,
      image: r.promotion_image_url || r.image_url || r.header_image_url || `https://placehold.co/600x400/f5f5f5/333?text=${encodeURIComponent(r.name)}`,
      rating: r.rating || 4.5,
      reviews: "1.2K",
      distance: "0.8 mi",
      time: `${r.min_delivery_time || 20} min`,
        restaurantPromo: restaurantPromo,
        discountPromo: discountPromo,
        isSponsored: r.is_promoted || false
      };
    });

    const premium = weeklyDeals.slice(3, 5).map((r) => {
      // Format restaurant promo (e.g., "$0 delivery fee, first order")
      const deliveryFeeCents = r.delivery_fee_cents || 0;
      const restaurantPromo = deliveryFeeCents === 0 
        ? "$0 delivery fee, first order"
        : r.promotion_description || null;

      // Format discount promo
      let discountPromo = null;
      if (r.promotion_discount_percentage) {
        discountPromo = `${r.promotion_discount_percentage}% off`;
      } else if (r.promotion_discount_amount_cents) {
        const discountAmount = (r.promotion_discount_amount_cents / 100).toFixed(2);
        discountPromo = `$${discountAmount} off`;
      }

      return {
      id: r.id,
      name: r.name,
      image: r.promotion_image_url || r.image_url || r.header_image_url || `https://placehold.co/600x400/f5f5f5/333?text=${encodeURIComponent(r.name)}`,
      rating: r.rating || 4.5,
      reviews: "800",
      distance: "2.1 mi",
      time: `${r.min_delivery_time || 30} min`,
        restaurantPromo: restaurantPromo,
        discountPromo: discountPromo,
        isSponsored: r.is_promoted || false,
      featured: true
      };
    });

    return { fastest, premium };
  };

  const RESTAURANTS_DATA = getRestaurantData();

  // Determine active nav item based on current location
  const getNavItems = () => {
    const isHome = currentLocation.pathname === '/restaurants' || currentLocation.pathname === '/';
    const isOrders = currentLocation.pathname === '/order-history';
    const isAccount = currentLocation.pathname === '/account';
    const isFavorites = currentLocation.pathname === '/favorites';

    return [
      { name: 'Home', icon: IconHome, current: isHome, path: '/restaurants' },
      { name: 'Favorites', icon: IconHeart, current: isFavorites, path: '/favorites' },
      { name: 'Orders', icon: IconPackage, current: isOrders, path: '/order-history' },
      { name: 'Account', icon: IconUser, current: isAccount, path: '/account' },
    ];
  };

  const NAV_ITEMS = getNavItems();

  const handleNavClick = (path: string) => {
    if (path === '/restaurants') {
      setShowMain(true);
      navigate('/restaurants');
    } else {
      navigate(path);
    }
  };

  // Check if user is logged in - if so, skip landing page (check BEFORE rendering)
  useEffect(() => {
    const checkAuth = async () => {
      if (!isMobile) {
        setCheckingAuth(false);
        setShowMain(true); // Desktop always shows main view
        return;
      }

      // Check if user wants to browse as guest (from shop button or URL param)
      const browseAsGuest = searchParams.get('browse') === 'guest' || 
                           sessionStorage.getItem('browse_as_guest') === 'true';
      
      if (browseAsGuest) {
        setShowMain(true);
        setCheckingAuth(false);
        return;
      }

      // Always check auth state, but use cache as initial state
      // This ensures we re-check on page load even with cache
      const initialShowMain = cachedAuth === true;
      setShowMain(initialShowMain);
      
      // If we have valid cached auth state, we can skip the check for faster load
      // But we'll still verify in the background
      if (cachedAuth !== null) {
        setCheckingAuth(false);
        // Still verify in background
        supabase.auth.getUser().then(({ data: { user } }) => {
          const isAuthenticated = !!user;
          if (isAuthenticated !== cachedAuth) {
            // Cache was wrong, update it
            setShowMain(isAuthenticated);
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('craven_auth_state', JSON.stringify({
                isAuthenticated,
                timestamp: Date.now()
              }));
            }
          }
        }).catch(() => {
          // On error, assume not logged in
          setShowMain(false);
        });
        return;
      }
      
      // Minimum display time for loading screen (1 second)
      const minDisplayTime = 1000;
      const startTime = Date.now();
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, minDisplayTime - elapsedTime);
        
        await new Promise(resolve => setTimeout(resolve, remainingTime));
        
        const isAuthenticated = !!user;
        
        // Cache the auth state
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('craven_auth_state', JSON.stringify({
            isAuthenticated,
            timestamp: Date.now()
          }));
        }
        
        if (user) {
          // User is logged in - skip landing page and show main restaurants view
          setShowMain(true);
        } else {
          // User is logged out - ensure landing page shows
          setShowMain(false);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, minDisplayTime - elapsedTime);
        await new Promise(resolve => setTimeout(resolve, remainingTime));
        
        // Cache failed state
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('craven_auth_state', JSON.stringify({
            isAuthenticated: false,
            timestamp: Date.now()
          }));
        }
        
        // On error, assume not logged in and show landing page
        setShowMain(false);
      } finally {
        setCheckingAuth(false);
      }
    };
    
    checkAuth();

    // Also listen for auth state changes (e.g., when user logs out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        // User logged out - show landing page
        setShowMain(false);
        setCheckingAuth(false);
        // Clear cached auth state
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('craven_auth_state');
        }
        // If on mobile, ensure we're on restaurants page to show landing
        if (isMobile) {
          // Already on restaurants page, just ensure landing shows
        }
      } else if (event === 'SIGNED_IN' && session?.user) {
        // User logged in - show main view
        if (isMobile) {
        setShowMain(true);
        // Clear guest browsing flag
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('browse_as_guest');
          sessionStorage.setItem('craven_auth_state', JSON.stringify({
            isAuthenticated: true,
            timestamp: Date.now()
          }));
        }
        // Reset form
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setFullName('');
        setIsSignUp(false);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isMobile]);

  // Show simple loader while checking auth (loading screen is handled at app level)
  if (isMobile && checkingAuth) {
    return (
      <Box style={{ width: '100%', maxWidth: '430px', margin: '0 auto', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000' }}>
        <Loader color="orange" size="lg" />
      </Box>
    );
  }

  // Mobile App Landing Page (only show if user is NOT logged in)
  if (isMobile && !showMain && !checkingAuth) {
    return (
      <Box style={{ width: '100%', maxWidth: '430px', margin: '0 auto', minHeight: '100vh', position: 'relative', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {/* Hero Image - Full Background */}
        <Box style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}>
          <MantineImage 
            src={heroImageUrl || heroPromoImage} 
            alt="Crave'n Delivery Hero" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {/* Overlay for better text readability */}
          <Box style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.4) 100%)',
            zIndex: 1
          }} />
        </Box>

        {/* Content Container - On Background */}
        <Box style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column', paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))', paddingLeft: '24px', paddingRight: '24px', paddingBottom: `calc(24px + env(safe-area-inset-bottom, 0px))` }}>
          {/* Logo and Tagline */}
          <Box style={{ marginBottom: '32px' }}>
            <Title order={1} style={{ fontSize: '80px', fontWeight: 900, marginBottom: '8px', letterSpacing: '-0.05em', color: '#ffffff', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>Craven.</Title>
            <Text size="sm" fw={300} c="white" style={{ fontSize: '18px', whiteSpace: 'nowrap', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
              Your premium choice for food delivery.
            </Text>
          </Box>

          {/* Login Form Area - DoorDash Style - On Background Image */}
          <Box style={{ flex: 1, marginTop: 'auto', paddingTop: '200px' }}>
            {/* Welcome Back Title */}
            <Title order={2} style={{ fontSize: '24px', fontWeight: 700, marginBottom: '4px', color: '#ffffff', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
              {isSignUp ? 'Create account' : 'Welcome back'}
            </Title>
            <Text size="sm" mb="md" style={{ fontSize: '13px', color: '#ffffff', textShadow: '0 1px 3px rgba(0,0,0,0.3)', marginBottom: '16px' }}>
              {isSignUp ? 'Sign up to get started' : 'Looks like you last logged in with email'}
            </Text>

            {/* Email Input */}
            <TextInput
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              placeholder="Email"
              type="email"
              mb="sm"
              disabled={authLoading}
              styles={{
                input: {
                  fontSize: '15px',
                  fontWeight: 500,
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  height: '48px',
                  backgroundColor: 'white'
                }
              }}
            />

            {/* Full Name Input (Sign Up Only) */}
            {isSignUp && (
              <TextInput
                value={fullName}
                onChange={(e) => setFullName(e.currentTarget.value)}
                placeholder="Full name"
                mb="sm"
                disabled={authLoading}
                styles={{
                  input: {
                    fontSize: '15px',
                    fontWeight: 500,
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    height: '48px',
                    backgroundColor: 'white'
                  }
                }}
              />
            )}

            {/* Password Input */}
            <TextInput
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              placeholder="Password"
              type="password"
              mb="sm"
              disabled={authLoading}
              styles={{
                input: {
                  fontSize: '15px',
                  fontWeight: 500,
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  height: '48px',
                  backgroundColor: 'white'
                }
              }}
            />

            {/* Confirm Password Input (Sign Up Only) */}
            {isSignUp && (
              <TextInput
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.currentTarget.value)}
                placeholder="Confirm password"
                type="password"
                mb="sm"
                disabled={authLoading}
                styles={{
                  input: {
                    fontSize: '15px',
                    fontWeight: 500,
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    height: '48px',
                    backgroundColor: 'white'
                  }
                }}
              />
            )}

            {/* Continue Button */}
            <Button
              onClick={handleAddressSubmit}
              fullWidth
              size="lg"
              loading={authLoading}
              disabled={authLoading}
              style={{
                background: 'linear-gradient(to right, #ff6b35, #b91c1c)',
                color: 'white',
                fontWeight: 600,
                fontSize: '15px',
                height: '48px',
                borderRadius: '8px',
                marginBottom: '12px',
                border: 'none'
              }}
            >
              {isSignUp ? 'Sign up' : 'Continue'}
            </Button>

            {/* Toggle Sign In / Sign Up */}
            <Text
              size="sm"
              style={{ 
                cursor: 'pointer',
                textAlign: 'center',
                display: 'block',
                marginBottom: '12px',
                fontSize: '13px',
                color: '#3b82f6',
                textDecoration: 'underline'
              }}
              onClick={() => {
                setIsSignUp(!isSignUp);
                setPassword('');
                setConfirmPassword('');
                setFullName('');
              }}
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </Text>

            {/* Browse as Guest Button */}
            <Button
              onClick={() => {
                sessionStorage.setItem('browse_as_guest', 'true');
                setShowMain(true);
              }}
              fullWidth
              variant="light"
              size="lg"
              style={{
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '15px',
                height: '48px',
                borderRadius: '8px',
                marginBottom: '12px',
                border: '2px solid rgba(255, 255, 255, 0.5)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)'
              }}
            >
              Browse as Guest
            </Button>

            {/* Terms and Privacy Policy */}
            <Text
              size="xs"
              style={{
                fontSize: '10px',
                lineHeight: '1.4',
                textAlign: 'center',
                color: '#ffffff',
                textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                marginBottom: 'env(safe-area-inset-bottom, 0px)'
              }}
            >
              By {isSignUp ? 'creating an account' : 'signing in'}, you agree to Crave'N's{' '}
              <Text
                component="a"
                href="/terms"
                style={{ color: '#3b82f6', textDecoration: 'underline', cursor: 'pointer' }}
              >
                Terms
              </Text>
              , including a waiver of your jury trial right, and{' '}
              <Text
                component="a"
                href="/privacy"
                style={{ color: '#3b82f6', textDecoration: 'underline', cursor: 'pointer' }}
              >
                Privacy Policy
              </Text>
              .
            </Text>
          </Box>
        </Box>
      </Box>
    );
  }

  // Mobile App Main Interface - Always show mobile UI when on mobile (web browser or native app)
  if (isMobile) {
    if (showMain) {
      return (
        <Box style={{ 
          width: '100%', 
          maxWidth: '430px', 
          margin: '0 auto', 
          minHeight: '100vh', 
          backgroundColor: 'white', 
          display: 'flex', 
          flexDirection: 'column',
          paddingTop: 'calc(80px + env(safe-area-inset-top, 0px))'
        }}>
        {/* Search & Address Bar (Fixed Header - Matching Chat Header Structure) */}
        <Box component="header" style={{ 
          backgroundColor: 'white', 
          position: 'fixed',
          top: 'env(safe-area-inset-top, 0px)',
          left: 0,
          right: 0,
          width: '100%',
          zIndex: 1000, 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)', 
          borderBottom: '1px solid #e5e7eb', 
          padding: '1rem 16px 12px',
          flexShrink: 0
        }}>
          {/* Address and Account */}
          <Group justify="space-between" mb="md">
            <Box style={{ position: 'relative', width: '114px', marginLeft: '-100px' }}>
              <Button
                variant="subtle"
                leftSection={<IconMapPin size={20} style={{ color: '#b91c1c' }} />}
                rightSection={<IconChevronRight size={16} style={{ color: '#a3a3a3' }} />}
                onClick={handleAddressButtonClick}
                style={{ 
                  padding: '8px', 
                  borderRadius: '12px', 
                  width: '160px',
                  textAlign: 'left',
                  backgroundColor: 'rgba(255, 255, 255, 0.12)'
                }}
                styles={{ inner: { width: '124px', textAlign: 'left' } }}
              >
                <Stack gap={0} align="flex-start">
                  <Text size="sm" fw={700} c="gray.9" lineClamp={1} style={{ maxWidth: '150px' }}>{location.split(',')[0]}...</Text>
                </Stack>
              </Button>
              
              {/* Address Selector Dropdown - Mobile */}
              {showAddressSelector && (
                <Box
                  ref={addressSelectorRef}
                  data-dropdown
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '8px',
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    zIndex: 100,
                    maxHeight: '400px',
                    overflowY: 'auto'
                  }}
                >
                  <Box p="md">
                    <Text size="sm" fw={700} mb="md">Select delivery address</Text>
                    
                    {/* Saved Addresses */}
                    {loadingAddresses ? (
                      <Box py="md" style={{ textAlign: 'center' }}>
                        <Text size="sm" c="dimmed">Loading addresses...</Text>
                      </Box>
                    ) : savedAddresses.length > 0 ? (
                      <Stack gap="xs" mb="md">
                        <Text size="xs" fw={600} c="dimmed" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Saved Addresses
                        </Text>
                        {savedAddresses.map((address) => {
                          const fullAddress = `${address.street_address}, ${address.city}, ${address.state} ${address.zip_code}`;
                          const isSelected = location.includes(address.street_address) && location.includes(address.city);
                          return (
                            <Button
                              key={address.id}
                              variant={isSelected ? "filled" : "subtle"}
                              color={isSelected ? "orange" : "gray"}
                              onClick={() => selectSavedAddress(address)}
                              style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                              fullWidth
                            >
                              <Stack gap={2} align="flex-start" style={{ width: '100%' }}>
                                <Group justify="space-between" style={{ width: '100%' }}>
                                  <Text size="sm" fw={600}>{address.label || 'Home'}</Text>
                                  {address.is_default && (
                                    <Badge size="xs" color="orange">Default</Badge>
                                  )}
                                </Group>
                                <Text size="xs" c="dimmed" style={{ textAlign: 'left' }}>
                                  {fullAddress}
                                </Text>
                              </Stack>
                            </Button>
                          );
                        })}
                      </Stack>
                    ) : null}

                    {/* Search for New Address */}
                    <Stack gap="xs" mb="md">
                      <Text size="xs" fw={600} c="dimmed" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {savedAddresses.length > 0 ? 'Search Address' : 'Enter Address'}
                      </Text>
                      <TextInput
                        placeholder="Search for an address"
                        value={addressSearchQuery}
                        onChange={(e) => handleAddressSearch(e.target.value)}
                        onFocus={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                      {addressSuggestions.length > 0 && (
                        <Stack gap="xs">
                          {addressSuggestions.map((address, index) => (
                            <Button
                              key={index}
                              variant="subtle"
                              onClick={() => selectAddress(address, index)}
                              style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                              fullWidth
                            >
                              <Text size="sm">{address}</Text>
                            </Button>
                          ))}
                        </Stack>
                      )}
                    </Stack>

                    {/* Add New Address Button */}
                    <Divider my="sm" />
                    <Button
                      variant="subtle"
                      color="orange"
                      onClick={() => {
                        setShowAddressSelector(false);
                        navigate('/account/delivery-addresses');
                      }}
                      leftSection={<IconPlus size={16} />}
                      fullWidth
                    >
                      Add new address
                    </Button>
                  </Box>
                </Box>
              )}
            </Box>

            <Group gap="xs" style={{ width: '162px' }}>
              <ActionIcon
                onClick={() => navigate('/notifications')}
                variant="subtle"
                size="lg"
                radius="xl"
                style={{ position: 'relative' }}
              >
                <IconBell size={24} style={{ color: '#737373' }} />
                {notificationsList.filter(n => !n.read).length > 0 && (
                  <Box style={{ position: 'absolute', top: 4, right: 4, width: '10px', height: '10px', backgroundColor: '#b91c1c', borderRadius: '50%', border: '2px solid white' }} />
                )}
              </ActionIcon>
              <ActionIcon
                onClick={() => navigate('/account')}
                variant="subtle"
                size="lg"
                radius="xl"
              >
                <IconUser size={24} style={{ color: '#171717' }} />
              </ActionIcon>
              {/* Cart Icon with Quantity Badge */}
              {cartCount > 0 && (
                <ActionIcon
                  onClick={() => navigate('/checkout')}
                  variant="subtle"
                  size="lg"
                  radius="xl"
                  style={{ position: 'relative' }}
                >
                  <IconShoppingCart size={24} style={{ color: '#171717', width: '100px', height: '34px' }} />
                  <Box
                    style={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      minWidth: '18px',
                      height: '18px',
                      backgroundColor: '#ff5f1f',
                      borderRadius: '50%',
                      border: '2px solid white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'white',
                      lineHeight: 1
                    }}
                  >
                    {cartCount > 99 ? '99+' : cartCount}
                  </Box>
                </ActionIcon>
              )}
            </Group>
          </Group>

          {/* Search Bar */}
          <Box style={{ position: 'relative' }}>
            <IconSearch size={20} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#a3a3a3', zIndex: 1 }} />
            <TextInput
              placeholder="Search Craven, Restaurants, or Food"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              styles={{ 
                input: { 
                  paddingLeft: '44px', 
                  paddingRight: '48px', 
                  paddingTop: '12px', 
                  paddingBottom: '12px', 
                  fontSize: '16px', 
                  backgroundColor: 'white', 
                  border: 'none', 
                  borderRadius: '12px',
                  fontWeight: 500
                }
              }}
            />
            {/* Menu Hamburger Icon - Bottom Right */}
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={() => setShowMenuIcons(!showMenuIcons)}
              style={{
                position: 'absolute',
                right: 8,
                bottom: 8,
                zIndex: 2,
                backgroundColor: 'transparent',
                color: '#a3a3a3',
              }}
            >
              <IconMenu2 
                size={16} 
              />
            </ActionIcon>
          </Box>
        </Box>

        {/* Menu Icons Dropdown - Fixed (appears below header when open) */}
        {showMenuIcons && (
          <Box 
            px={0}
            py="md"
            style={{ 
              position: 'fixed',
              top: 'calc(120px + env(safe-area-inset-top, 0px))',
              left: 0,
              right: 0,
              width: '100%',
              zIndex: 999,
              borderBottom: '1px solid #e5e7eb', 
              backgroundColor: 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              margin: 0,
            }}
          >
            <Box
              style={{
                width: '100%',
                overflowX: 'auto',
                overflowY: 'hidden',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch',
                scrollBehavior: 'smooth',
                paddingLeft: '16px',
                paddingRight: '16px',
              }}
              sx={{
                '&::-webkit-scrollbar': {
                  display: 'none'
                }
              }}
            >
              <Group gap="md" style={{ flexWrap: 'nowrap', width: 'max-content', paddingBottom: '8px' }}>
                {navCategories.map((category) => {
                  const IconComponent = category.icon;
                  return (
                    <Box
                      key={category.id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleCategoryClick(category.id);
                        setShowMenuIcons(false); // Close menu after clicking
                      }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        flexShrink: 0,
                        minWidth: '60px',
                      }}
                    >
                      <Box
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '12px',
                          backgroundColor: category.active ? '#ff5f1f' : 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s',
                        }}
                      >
                        <IconComponent 
                          size={24} 
                          style={{ 
                            color: category.active ? 'white' : '#4b5563',
                            strokeWidth: 2
                          }} 
                        />
                      </Box>
                      <Text 
                        size="xs" 
                        fw={category.active ? 600 : 500}
                        c={category.active ? '#ff5f1f' : 'gray.7'}
                        style={{ 
                          textAlign: 'center',
                          lineHeight: 1.2
                        }}
                      >
                        {category.label}
                      </Text>
                    </Box>
                  );
                })}
              </Group>
            </Box>
          </Box>
        )}

        {/* Cuisine Categories - Fixed position directly under search header */}
        <Box 
          style={{ 
            position: 'fixed',
            top: showMenuIcons 
              ? 'calc(120px + 100px + env(safe-area-inset-top, 0px))' 
              : 'calc(120px + env(safe-area-inset-top, 0px))',
            left: 0,
            right: 0,
            width: '100%',
            zIndex: 998,
            borderBottom: '1px solid #e5e7eb', 
            backgroundColor: 'white',
            paddingTop: '12px',
            paddingBottom: '12px',
            paddingLeft: '16px',
            paddingRight: '16px',
            transition: 'top 0.2s ease',
          }}
        >
          {availableCuisines.length > 0 ? (
            <Box style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Row 1 */}
              <Box style={{ 
                display: 'flex', 
                gap: '8px', 
                overflowX: 'auto', 
                scrollbarWidth: 'none', 
                msOverflowStyle: 'none', 
                WebkitOverflowScrolling: 'touch', 
                paddingBottom: '4px' 
              }} sx={{ '&::-webkit-scrollbar': { display: 'none' } }}>
                {availableCuisines.slice(0, Math.ceil(availableCuisines.length / 2)).map((cuisine) => {
                  const IconComponent = getCuisineIcon(cuisine);
                  const isActive = cuisineFilter === cuisine.toLowerCase();
                  return (
                    <Button
                      key={cuisine}
                      variant={isActive ? "filled" : "outline"}
                      size="xs"
                      radius="md"
                      onClick={() => {
                        const cuisineSlug = cuisine.toLowerCase().replace(/\s+/g, '-');
                        navigate(`/restaurants/cuisine/${cuisineSlug}`);
                      }}
                      leftSection={
                        <IconComponent 
                          size={14} 
                          style={{ 
                            color: isActive ? 'white' : '#ff5f1f',
                            strokeWidth: 2.5
                          }} 
                        />
                      }
                      style={{ 
                        backgroundColor: isActive ? '#ff5f1f' : 'white', 
                        borderColor: isActive ? '#ff5f1f' : '#e5e7eb',
                        color: isActive ? 'white' : '#404040',
                        fontWeight: 600,
                        padding: '6px 12px',
                        height: 'auto',
                        fontSize: '11px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        transition: 'all 0.2s ease',
                        boxShadow: isActive ? '0 2px 8px rgba(255, 95, 31, 0.3)' : '0 1px 2px rgba(0,0,0,0.1)'
                      }}
                    >
                      {cuisine}
                    </Button>
                  );
                })}
              </Box>
              {/* Row 2 */}
              <Box style={{ 
                display: 'flex', 
                gap: '8px', 
                overflowX: 'auto', 
                scrollbarWidth: 'none', 
                msOverflowStyle: 'none', 
                WebkitOverflowScrolling: 'touch', 
                paddingBottom: '4px' 
              }} sx={{ '&::-webkit-scrollbar': { display: 'none' } }}>
                {availableCuisines.slice(Math.ceil(availableCuisines.length / 2)).map((cuisine) => {
                  const IconComponent = getCuisineIcon(cuisine);
                  const isActive = cuisineFilter === cuisine.toLowerCase();
                  return (
                    <Button
                      key={cuisine}
                      variant={isActive ? "filled" : "outline"}
                      size="xs"
                      radius="md"
                      onClick={() => {
                        const cuisineSlug = cuisine.toLowerCase().replace(/\s+/g, '-');
                        navigate(`/restaurants/cuisine/${cuisineSlug}`);
                      }}
                      leftSection={
                        <IconComponent 
                          size={14} 
                          style={{ 
                            color: isActive ? 'white' : '#ff5f1f',
                            strokeWidth: 2.5
                          }} 
                        />
                      }
                      style={{ 
                        backgroundColor: isActive ? '#ff5f1f' : 'white', 
                        borderColor: isActive ? '#ff5f1f' : '#e5e7eb',
                        color: isActive ? 'white' : '#404040',
                        fontWeight: 600,
                        padding: '6px 12px',
                        height: 'auto',
                        fontSize: '11px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        transition: 'all 0.2s ease',
                        boxShadow: isActive ? '0 2px 8px rgba(255, 95, 31, 0.3)' : '0 1px 2px rgba(0,0,0,0.1)'
                      }}
                    >
                      {cuisine}
                    </Button>
                  );
                })}
              </Box>
            </Box>
          ) : (
            <Text size="sm" c="gray.6" ta="center" py="md">
              Loading cuisines...
            </Text>
          )}
        </Box>

        {/* Scrollable Content */}
        <Box style={{ 
          flex: 1, 
          overflowY: 'auto', 
          backgroundColor: 'white',
          paddingTop: showMenuIcons 
            ? 'calc(120px + 100px + 110px + env(safe-area-inset-top, 0px))' 
            : 'calc(120px + 110px + env(safe-area-inset-top, 0px))',
          paddingBottom: 'calc(70px + env(safe-area-inset-bottom, 0px))'
        }}>
          <Box component="main">

            {/* Craven Quick Picks - Promoted Restaurants */}
            {weeklyDeals.length > 0 && (
              <Box px="md" py="md" style={{ backgroundColor: 'white', borderTop: '1px solid #e5e7eb' }}>
                <Group justify="space-between" gap="xs" mb="sm" style={{ minHeight: 'auto', margin: 0, padding: 0, height: 'auto' }}>
                  <Title order={2} fw={800} c="gray.9" style={{ fontSize: '18px', lineHeight: 1.2, margin: 0, padding: 0 }}>Craven Quick Picks</Title>
                  <ActionIcon variant="subtle" color="red" radius="xl" size="sm" style={{ margin: 0, padding: 0 }}>
                    <IconChevronRight size={18} />
                  </ActionIcon>
                </Group>
                <RestaurantGrid 
                  searchQuery={searchQuery} 
                  deliveryAddress={location} 
                  cuisineFilter={undefined}
                  excludeCuisine={undefined}
                  sectionTitle={undefined}
                  horizontal={true}
                  customRestaurants={weeklyDeals}
                />
              </Box>
            )}

            {/* Great Deals - Restaurants with Promotions */}
            {weeklyDeals.filter((r: any) => r.promotion_title || r.promotion_discount_percentage || r.promotion_discount_amount_cents).length > 0 && (
              <Box px="md" pt="md" pb="sm" style={{ backgroundColor: 'white' }}>
                <Group gap="xs" align="center" style={{ margin: 0, padding: 0 }}>
                  <Title order={2} fw={800} c="gray.9" style={{ fontSize: '18px', lineHeight: 1.2, margin: 0, padding: 0 }}>
                    Great Deals
                  </Title>
                  {/* Hyper-realistic animated flame */}
                  <Box
                    component="span"
                    style={{
                      position: 'relative',
                      display: 'inline-block',
                      width: '20px',
                      height: '24px',
                      marginLeft: '6px',
                      verticalAlign: 'middle',
                    }}
                  >
                    {/* Main flame - center tongue */}
                    <Box
                      component="span"
                      className="flame-main"
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: '50%',
                        width: '6px',
                        height: '20px',
                        background: 'linear-gradient(to top, #ff4500 0%, #ff6b35 30%, #ff8c42 60%, #ffd700 90%, #fff 100%)',
                        clipPath: 'polygon(50% 100%, 0% 80%, 0% 50%, 20% 30%, 30% 10%, 50% 0%, 70% 10%, 80% 30%, 100% 50%, 100% 80%)',
                        borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                        animation: 'flameMain 0.3s ease-in-out infinite',
                        transformOrigin: 'bottom center',
                        filter: 'blur(0.3px)',
                        boxShadow: '0 0 8px rgba(255, 107, 53, 0.9), 0 0 16px rgba(255, 69, 0, 0.6)',
                      }}
                    />
                    {/* Left flame tongue */}
                    <Box
                      component="span"
                      className="flame-left"
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: '15%',
                        width: '5px',
                        height: '16px',
                        background: 'linear-gradient(to top, #ff4500 0%, #ff6b35 40%, #ff8c42 70%, transparent 100%)',
                        clipPath: 'polygon(50% 100%, 0% 85%, 0% 60%, 30% 40%, 40% 20%, 50% 0%, 60% 15%, 70% 35%, 100% 55%, 100% 80%)',
                        animation: 'flameLeft 0.4s ease-in-out infinite',
                        transformOrigin: 'bottom center',
                        filter: 'blur(0.4px)',
                      }}
                    />
                    {/* Right flame tongue */}
                    <Box
                      component="span"
                      className="flame-right"
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        right: '15%',
                        width: '5px',
                        height: '16px',
                        background: 'linear-gradient(to top, #ff4500 0%, #ff6b35 40%, #ff8c42 70%, transparent 100%)',
                        clipPath: 'polygon(50% 100%, 0% 80%, 0% 55%, 30% 35%, 40% 15%, 50% 0%, 60% 20%, 70% 40%, 100% 60%, 100% 85%)',
                        animation: 'flameRight 0.5s ease-in-out infinite',
                        transformOrigin: 'bottom center',
                        filter: 'blur(0.4px)',
                      }}
                    />
                    {/* Top flicker - small tongue */}
                    <Box
                      component="span"
                      className="flame-top"
                      style={{
                        position: 'absolute',
                        bottom: '14px',
                        left: '50%',
                        width: '4px',
                        height: '10px',
                        background: 'linear-gradient(to top, transparent 0%, #ff8c42 20%, #ffd700 60%, #fff 100%)',
                        clipPath: 'polygon(50% 100%, 20% 80%, 30% 60%, 40% 40%, 50% 0%, 60% 40%, 70% 60%, 80% 80%)',
                        animation: 'flameTop 0.25s ease-in-out infinite',
                        transformOrigin: 'bottom center',
                        filter: 'blur(0.5px)',
                      }}
                    />
                    {/* Spark particles */}
                    <Box
                      component="span"
                      className="flame-spark-1"
                      style={{
                        position: 'absolute',
                        bottom: '16px',
                        left: '25%',
                        width: '1.5px',
                        height: '1.5px',
                        background: '#ffd700',
                        borderRadius: '50%',
                        animation: 'spark1 1s ease-out infinite',
                        boxShadow: '0 0 3px rgba(255, 215, 0, 1)',
                      }}
                    />
                    <Box
                      component="span"
                      className="flame-spark-2"
                      style={{
                        position: 'absolute',
                        bottom: '18px',
                        right: '25%',
                        width: '1.5px',
                        height: '1.5px',
                        background: '#fff',
                        borderRadius: '50%',
                        animation: 'spark2 1.3s ease-out infinite',
                        boxShadow: '0 0 3px rgba(255, 255, 255, 0.9)',
                      }}
                    />
                    {/* Base glow */}
                    <Box
                      component="span"
                      style={{
                        position: 'absolute',
                        bottom: '-1px',
                        left: '50%',
                        width: '12px',
                        height: '6px',
                        background: 'radial-gradient(ellipse at center, rgba(255, 107, 53, 0.5) 0%, transparent 70%)',
                        animation: 'flameBaseGlow 0.6s ease-in-out infinite alternate',
                        transform: 'translateX(-50%)',
                        pointerEvents: 'none',
                      }}
                    />
                  </Box>
                </Group>
                <RestaurantGrid 
                  searchQuery={searchQuery} 
                  deliveryAddress={location} 
                  cuisineFilter={undefined}
                  excludeCuisine={undefined}
                  sectionTitle={undefined}
                  horizontal={true}
                  customRestaurants={weeklyDeals.filter((r: any) => r.promotion_title || r.promotion_discount_percentage || r.promotion_discount_amount_cents)}
                />
              </Box>
            )}

            {/* Advertisement Banner - Auto-Rotating Carousel */}
            <Box px="md" py="md" style={{ backgroundColor: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {loadingAds || loadingBanners ? (
                <Box
                  style={{
                    width: '380px',
                    height: '200px',
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Loader size="sm" />
                </Box>
              ) : randomizedAds.length > 0 ? (
                <Box
                  style={{
                    width: '380px',
                    maxWidth: '100%',
                    height: '200px',
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: '16px',
                    isolation: 'isolate',
                    transform: 'translateZ(0)',
                    boxShadow: '0 8px 32px rgba(255, 107, 53, 0.4), 0 0 40px rgba(255, 107, 53, 0.2)',
                  }}
                >
                  {randomizedAds.map((ad, index) => {
                    const isActive = index === currentAdIndex;
                    const isPrevious = index === (currentAdIndex - 1 + randomizedAds.length) % randomizedAds.length;
                    
                    // Calculate transform based on position
                    let transform = 'translateX(100%)'; // Default: off-screen to the right
                    let zIndex = 1;
                    if (isActive) {
                      transform = 'translateX(0)'; // Current: center
                      zIndex = 3;
                    } else if (isPrevious) {
                      transform = 'translateX(-100%)'; // Previous: off-screen to the left
                      zIndex = 2;
                    }
                    
                    return (
                      <Box
                        key={`${ad.type}-${ad.id || index}`}
                        component={ad.click_url || ad.action_url || ad.link_url ? "a" : "div"}
                        href={ad.click_url || ad.action_url || ad.link_url || undefined}
                        onClick={(e) => {
                          if (!ad.click_url && !ad.action_url && !ad.link_url) {
                            e.preventDefault();
                            return;
                          }
                          e.preventDefault();
                          const link = ad.click_url || ad.action_url || ad.link_url;
                          if (link) {
                            navigate(link);
                          }
                        }}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          transform: transform,
                          transition: 'transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                          pointerEvents: isActive ? 'auto' : 'none',
                          zIndex: zIndex,
                          willChange: 'transform',
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden',
                          background: ad.type === 'promotional_banner' && !ad.image_url
                            ? 'linear-gradient(135deg, #ff6b35 0%, #f97316 50%, #ea580c 100%)'
                            : ad.background || 'linear-gradient(135deg, #ff6b35 0%, #f97316 50%, #ea580c 100%)',
                          borderRadius: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: (ad.click_url || ad.action_url || ad.link_url) ? 'pointer' : 'default',
                          overflow: 'hidden',
                          textDecoration: 'none',
                          boxShadow: '0 8px 32px rgba(255, 107, 53, 0.4), 0 0 40px rgba(255, 107, 53, 0.2)',
                          border: '2px solid rgba(255, 255, 255, 0.2)',
                        }}
                        onMouseEnter={(e) => {
                          if (isActive) {
                            e.currentTarget.style.transform = 'translateX(0) translateY(-4px)';
                            e.currentTarget.style.boxShadow = '0 16px 48px rgba(255, 107, 53, 0.5), 0 0 60px rgba(255, 107, 53, 0.3)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (isActive) {
                            e.currentTarget.style.transform = 'translateX(0) translateY(0)';
                            e.currentTarget.style.boxShadow = '0 8px 32px rgba(255, 107, 53, 0.4), 0 0 40px rgba(255, 107, 53, 0.2)';
                          }
                        }}
                      >
                        {ad.ad_code ? (
                          <div 
                            dangerouslySetInnerHTML={{ __html: ad.ad_code }} 
                            style={{ width: '100%', height: '100%', position: 'relative', zIndex: 1 }}
                          />
                        ) : ad.image_url ? (
                          <MantineImage
                            src={ad.image_url}
                            alt={ad.title || "Advertisement"}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'relative', zIndex: 1 }}
                          />
                        ) : (
                          <Box style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                            <Text size="sm" c="white" fw={600} style={{ textAlign: 'center' }}>
                              {ad.title || 'Advertisement'}
                              <br />
                              {ad.width || 380} × {ad.height || 200}
                            </Text>
                          </Box>
                        )}
                        {/* Overlay gradient for better text readability */}
                        <Box
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, transparent 50%, rgba(0,0,0,0.2) 100%)',
                            pointerEvents: 'none',
                            zIndex: 2,
                          }}
                        />
                      </Box>
                    );
                  })}
                </Box>
              ) : (
                <Box
                  component="a"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/promotion-details');
                  }}
                  style={{
                    width: '380px',
                    maxWidth: '100%',
                    height: '200px',
                    background: 'linear-gradient(135deg, #ff6b35 0%, #f97316 50%, #ea580c 100%)',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 8px 24px rgba(255, 107, 53, 0.3)',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 12px 32px rgba(255, 107, 53, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 107, 53, 0.3)';
                  }}
                >
                  <Text size="sm" c="white" fw={600} style={{ textAlign: 'center' }}>
                    Advertisement
                    <br />
                    380 × 200
                  </Text>
                </Box>
              )}
            </Box>

            {/* Promotional Banner Carousel */}
            {loadingBanners ? (
              <Box py="xl" px="md">
                <Group gap="md">
                  {[...Array(4)].map((_, i) => (
                    <Card key={i} style={{ height: '440px', width: '100%' }}>
                      <Loader />
                    </Card>
                  ))}
                </Group>
              </Box>
            ) : promotionalBanners.length > 0 ? (
              <Box py="xl" px="md">
                <Carousel
                  slideSize="100%"
                  slideGap="md"
                  withControls
                >
                  {promotionalBanners.map((banner) => (
                    <Carousel.Slide key={banner.id}>
                      <PromoCard 
                        title={banner.title} 
                        subtitle={banner.description || banner.subtitle || ''}
                        image={banner.image_url || ''}
                        bannerId={banner.id}
                      />
                    </Carousel.Slide>
                  ))}
                </Carousel>
              </Box>
            ) : null}

            {/* Premium Selections Header */}
            <Box px="md" py="md" mt="md" style={{ backgroundColor: 'white', borderTop: '1px solid #e5e7eb' }}>
              <Group justify="space-between" gap="xs" mb="sm" style={{ minHeight: 'auto', margin: 0, padding: 0, height: 'auto' }}>
                <Title order={2} fw={800} c="gray.9" style={{ fontSize: '18px', lineHeight: 1.2, margin: 0, padding: 0 }}>Premium Selections</Title>
                <ActionIcon variant="subtle" color="red" radius="xl" size="sm" style={{ margin: 0, padding: 0 }}>
                  <IconChevronRight size={18} />
                </ActionIcon>
              </Group>
            </Box>

            {/* Premium Selections - Restaurants (excluding apparel, retail, kids, late nate hunger) */}
            <Box ref={restaurantsSectionRef} id="restaurants-section" data-section="restaurants">
              <RestaurantGrid 
                searchQuery={searchQuery} 
                deliveryAddress={location} 
                cuisineFilter={undefined}
                excludeCuisine={['apparel', 'retail', 'kids', 'late nate hunger'].join(',')}
                sectionTitle="Restaurants"
                horizontal={true}
              />
            </Box>

            {/* Premium Selections - Apparel */}
            <Box ref={apparelSectionRef} id="apparel-section" data-section="apparel">
              <RestaurantGrid 
                searchQuery={searchQuery} 
                deliveryAddress={location} 
                cuisineFilter="apparel"
                sectionTitle="Apparel"
                horizontal={true}
              />
            </Box>

            {/* Premium Selections - Retail */}
            <div ref={retailSectionRef} id="retail-section" data-section="retail">
              <RestaurantGrid 
                searchQuery={searchQuery} 
                deliveryAddress={location} 
                cuisineFilter="retail"
                sectionTitle="Retail"
                horizontal={true}
              />
            </div>

            {/* Premium Selections - Late Nate Hunger */}
            <div ref={lateNateHungerSectionRef}>
              <RestaurantGrid 
                searchQuery={searchQuery} 
                deliveryAddress={location} 
                cuisineFilter="late nate hunger"
                sectionTitle="Late Nate Hunger"
                horizontal={true}
              />
            </div>

            {/* Premium Selections - Kids */}
            <div ref={kidsSectionRef} id="kids-section" data-section="kids">
              <RestaurantGrid 
                searchQuery={searchQuery} 
                deliveryAddress={location} 
                cuisineFilter="kids"
                sectionTitle="Kids"
                horizontal={true}
              />
            </div>

            {/* All Restaurants Section - Mobile */}
            <Box px="md" py="sm" mt="md" style={{ backgroundColor: 'white', borderTop: '1px solid #e5e7eb' }}>
              <Box ref={resultsRef} id="browse-all-section" data-section="browse-all">
                <Group justify="space-between" gap="xs" mb="sm" style={{ minHeight: 'auto', margin: 0, padding: 0, height: 'auto', marginBottom: '16px' }}>
                  <Title order={2} fw={800} c="gray.9" style={{ fontSize: '18px', lineHeight: 1.2, margin: 0, padding: 0 }}>Browse All</Title>
                </Group>
                <RestaurantGrid 
                  searchQuery={searchQuery} 
                  deliveryAddress={location} 
                  cuisineFilter={cuisineFilter}
                  columns={2}
                />
              </Box>
            </Box>

            {/* Spacing for Nav */}
            <Box style={{ height: '64px' }} />
          </Box>
        </Box>

        {/* White Bar at Bottom */}
        <Box
          style={{
            position: 'fixed',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: '430px',
            backgroundColor: '#ffffff',
            height: '56px',
            zIndex: 1000,
            borderTop: '1px solid #e5e7eb',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        />
      </Box>
    );
    }
  }

  // Desktop Layout - Only show when NOT on mobile
  if (!isMobile) {
    return (
    <div style={{ minHeight: '100vh', backgroundColor: 'white' }}>
      {/* Mobile Header - Mantine UI */}
      <Box 
        component="header"
        style={{ 
          display: isMobile ? 'block' : 'none',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backgroundColor: 'white',
          borderBottom: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}
      >
        <Stack gap="md" p="md">
          <Group justify="space-between">
            <Group gap="xs">
              <MantineImage src={cravenLogo} alt="CRAVE'N" style={{ height: '32px' }} />
              <ActionIcon
                onClick={() => navigate('/notifications')}
                variant="subtle"
                size="lg"
                radius="xl"
                style={{ position: 'relative' }}
              >
                <IconBell size={20} style={{ color: '#4b5563' }} />
                {notificationsList.filter(n => !n.read).length > 0 && (
                  <Box 
                    style={{ 
                      position: 'absolute', 
                      top: 4, 
                      right: 4, 
                      width: '8px', 
                      height: '8px', 
                      backgroundColor: '#ff6b35', 
                      borderRadius: '50%' 
                    }} 
                  />
                )}
              </ActionIcon>
            </Group>
            <ActionIcon
              onClick={() => setShowMobileNav(!showMobileNav)}
              variant="subtle"
              size="lg"
              radius="xl"
            >
              {showMobileNav ? (
                <IconX size={24} style={{ color: '#171717' }} />
              ) : (
                <IconMenu2 size={24} style={{ color: '#171717' }} />
              )}
            </ActionIcon>
          </Group>
          
          {/* Location & Delivery Mode */}
          <Group gap="xs">
            <Button
              onClick={() => setShowAddressSelector(!showAddressSelector)}
              variant="subtle"
              leftSection={<IconMapPin size={16} style={{ color: '#4b5563' }} />}
              rightSection={<IconChevronDown size={16} style={{ color: '#4b5563' }} />}
              style={{ 
                flex: 1,
                backgroundColor: 'white',
                color: '#111827',
                fontWeight: 500,
                justifyContent: 'space-between',
                paddingLeft: '12px',
                paddingRight: '12px'
              }}
            >
              <Text size="sm" fw={500} lineClamp={1} style={{ flex: 1, textAlign: 'left' }}>
                {location}
              </Text>
            </Button>
            
            <SegmentedControl
              value={deliveryMode}
              onChange={(value) => setDeliveryMode(value as 'delivery' | 'pickup')}
              data={[
                { label: 'Delivery', value: 'delivery' },
                { label: 'Pickup', value: 'pickup' }
              ]}
              size="sm"
              radius="md"
              styles={{
                root: {
                  backgroundColor: 'white',
                  padding: '2px'
                },
                indicator: {
                  backgroundColor: '#000000'
                },
                label: {
                  fontSize: '12px',
                  fontWeight: 500,
                  padding: '6px 12px'
                }
              }}
            />
          </Group>
          
          {/* Search Bar */}
          <TextInput
            placeholder="Search restaurants or dishes"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            leftSection={<IconSearch size={16} style={{ color: '#9ca3af' }} />}
            styles={{
              input: {
                backgroundColor: 'white',
                border: 'none',
                fontSize: '14px',
                paddingTop: '10px',
                paddingBottom: '10px'
              }
            }}
            radius="md"
          />
        </Stack>
      </Box>

      {/* Desktop Header - Hidden on Mobile */}
      <div className="hidden lg:block sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo and Location */}
            <div className="flex items-center space-x-2">
              <img src={cravenLogo} alt="CRAVE'N" className="h-10" />
              {/* Location Selector */}
              <div className="relative" style={{ marginLeft: '-100px' }}>
                <button 
                  onClick={() => setShowAddressSelector(!showAddressSelector)}
                  className="address-selector-button flex items-center space-x-1 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <IconMapPin className="w-4 h-4" />
                  <span className="text-sm font-medium max-w-32 truncate">{location}</span>
                  <IconChevronRight className="w-4 h-4" />
                </button>
                
                {/* Address Selector Dropdown */}
                {showAddressSelector && (
                  <div 
                    ref={addressSelectorRef}
                    data-dropdown 
                    className="absolute top-full left-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-4" onMouseDown={(e) => e.stopPropagation()}>
                      <h3 className="font-semibold text-gray-900 mb-3">Select delivery address</h3>
                      
                      {/* Saved Addresses */}
                      {loadingAddresses ? (
                        <div className="py-4 text-center">
                          <Text size="sm" c="dimmed">Loading addresses...</Text>
                        </div>
                      ) : savedAddresses.length > 0 ? (
                        <div className="space-y-2 mb-4">
                          <Text size="xs" fw={600} c="dimmed" mb="xs" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Saved Addresses
                          </Text>
                          {savedAddresses.map((address) => {
                            const fullAddress = `${address.street_address}, ${address.city}, ${address.state} ${address.zip_code}`;
                            const isSelected = location.includes(address.street_address) && location.includes(address.city);
                            return (
                              <button
                                key={address.id}
                                onClick={() => selectSavedAddress(address)}
                                className={`w-full text-left p-3 border rounded-lg transition-all ${
                                  isSelected
                                    ? 'border-orange-500 bg-orange-50'
                                    : 'border-gray-200 hover:border-orange-300 hover:bg-white'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-sm font-semibold text-gray-900">
                                        {address.label || 'Home'}
                                      </span>
                                      {address.is_default && (
                                        <span className="text-xs px-2 py-0.5 rounded bg-orange-500 text-white font-medium">
                                          Default
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-500 leading-relaxed">
                                      {fullAddress}
                                    </p>
                                  </div>
                                  <IconChevronRight size={16} style={{ color: '#9ca3af', flexShrink: 0, marginTop: '2px' }} />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : null}

                      {/* Search for New Address */}
                      <div className="space-y-2">
                        <Text size="xs" fw={600} c="dimmed" mb="xs" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {savedAddresses.length > 0 ? 'Search Address' : 'Enter Address'}
                        </Text>
                        <div onMouseDown={(e) => e.stopPropagation()}>
                          <TextInput
                            placeholder="Search for an address"
                            value={addressSearchQuery}
                            onChange={(e) => handleAddressSearch(e.target.value)}
                            className="w-full"
                            onFocus={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        {addressSuggestions.length > 0 && (
                          <div className="space-y-1">
                            {addressSuggestions.map((address, index) => (
                              <button
                                key={index}
                                onClick={() => selectAddress(address, index)}
                                className="w-full text-left p-2 hover:bg-white rounded-md text-sm"
                              >
                                {address}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Add New Address Button */}
                      <div className="pt-3 mt-3 border-t">
                        <button 
                          onClick={() => {
                            setShowAddressSelector(false);
                            navigate('/account/delivery-addresses');
                          }}
                          className="w-full flex items-center justify-center gap-2 text-orange-600 hover:text-orange-700 text-sm font-medium py-2 px-3 rounded-lg hover:bg-orange-50 transition-colors"
                        >
                          <IconPlus size={16} />
                          Add new address
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Center: Search */}
            <div className="flex-1 max-w-2xl mx-8">
              <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <TextInput 
                  placeholder="Search Crave'N" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            {/* Right: Delivery/Pickup, Notifications, Cart */}
            <div className="flex items-center space-x-4">
              {/* Delivery/Pickup Toggle */}
              <div className="flex bg-white rounded-lg p-1">
                <button 
                  onClick={() => setDeliveryMode('delivery')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    deliveryMode === 'delivery' 
                      ? 'bg-orange-500 text-white' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Delivery
                </button>
                <button 
                  onClick={() => setDeliveryMode('pickup')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    deliveryMode === 'pickup' 
                      ? 'bg-orange-500 text-white' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Pickup
                </button>
              </div>

              {/* Notifications */}
              <div className="relative">
                <button 
                  onClick={() => navigate('/notifications')}
                  className="relative"
                >
                  <IconBell className="w-6 h-6 text-gray-600 hover:text-gray-900 transition-colors" />
                  {notificationsList.filter(n => !n.read).length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                      {notificationsList.filter(n => !n.read).length}
                    </span>
                  )}
                </button>
                
                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div data-dropdown className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900">Notifications</h3>
                        <button className="text-sm text-orange-600">Mark all as read</button>
                      </div>
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {notificationsList.map((notification) => (
                          <div 
                            key={notification.id}
                            className={`p-3 rounded-lg border ${
                              notification.read ? 'bg-white' : 'bg-orange-50 border-orange-200'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-sm text-gray-900">{notification.title}</h4>
                                <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                                <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                              </div>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Cart */}
              <div className="relative">
                <button 
                  onClick={() => setShowCart(!showCart)}
                  className="relative"
                >
                  <IconShoppingCart className="w-6 h-6 text-gray-600 hover:text-gray-900 transition-colors" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </button>
                
                {/* Cart Dropdown */}
                {showCart && (
                  <div data-dropdown className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900">Your Cart</h3>
                        <button className="text-sm text-orange-600">Clear all</button>
                      </div>
                      {contextCartItems.length > 0 ? (
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {contextCartItems.map((item, index) => (
                            <div key={item.id || index} className="flex items-center justify-between p-2 border rounded-lg">
                              <div className="flex-1">
                                <h4 className="font-medium text-sm text-gray-900">{item.name}</h4>
                                <p className="text-xs text-gray-600">${((item.price_cents * item.quantity) / 100).toFixed(2)}</p>
                                {item.quantity > 1 && (
                                  <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                                )}
                              </div>
                              <button 
                                onClick={() => removeFromCartContext(item.id)}
                                className="text-primary hover:text-primary"
                              >
                                <IconX className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <div className="pt-3 border-t">
                            <div className="flex items-center justify-between mb-3">
                              <span className="font-semibold">Total: ${(getCartTotal() / 100).toFixed(2)}</span>
                            </div>
                            <Button 
                              className="w-full bg-orange-500 hover:bg-orange-600"
                              onClick={() => {
                                setShowCart(false);
                                navigate('/checkout');
                              }}
                            >
                              Checkout
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <IconShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-500 text-sm">Your cart is empty</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Menu */}
              <button 
                onClick={() => setShowMobileNav(!showMobileNav)}
                className="lg:hidden p-2"
              >
                {showMobileNav ? <IconX className="w-6 h-6" /> : <IconMenu2 className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Filter Pills - Mantine UI */}
      <Box
        component="nav"
        style={{
          display: isMobile ? 'block' : 'none',
          position: 'sticky',
          top: '140px',
          zIndex: 40,
          backgroundColor: 'white',
          borderBottom: '1px solid #e5e7eb',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        <Box
          style={{
            width: '100%',
            overflowX: 'auto',
            overflowY: 'hidden',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            scrollBehavior: 'smooth'
          }}
          sx={{
            '&::-webkit-scrollbar': {
              display: 'none'
            }
          }}
        >
          <Group gap="xs" p="md" style={{ flexWrap: 'nowrap', width: 'max-content' }}>
            {filterOptions.map((filter) => (
              <Button
                key={filter.id}
                onClick={() => {
                  setActiveFilter(filter.id);
                  applyFilters();
                }}
                variant={activeFilter === filter.id ? 'filled' : 'light'}
                size="sm"
                radius="xl"
                style={{
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                  backgroundColor: activeFilter === filter.id ? '#000000' : 'white',
                  color: activeFilter === filter.id ? '#ffffff' : '#374151',
                  fontWeight: 500,
                  fontSize: '14px'
                }}
              >
                {filter.label}
              </Button>
            ))}
          </Group>
        </Box>
      </Box>

      <div className="flex">
        {/* Right Side Navigation - Desktop Only */}
        <div className="hidden lg:block w-64 bg-white border-r border-gray-200 min-h-screen side-menu-container">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Browse</h3>
            <nav className="space-y-1">
              {navCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.id)}
                  className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-gray-600 hover:bg-white hover:text-gray-900"
                >
                  <category.icon className="w-5 h-5" />
                  <span className="font-medium">{category.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Filter Bar - Desktop Only */}
          <div className="hidden lg:block border-b border-gray-200 bg-white">
            <div className="max-w-7xl mx-auto px-4 py-4">
              <div className="flex items-center space-x-4 overflow-x-auto">
                {filterOptions.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => {
                      setActiveFilter(filter.id);
                      applyFilters();
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                      activeFilter === filter.id
                        ? 'bg-orange-500 text-white' 
                        : 'bg-white text-gray-600 hover:bg-white'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="bg-white py-8" ref={resultsRef}>
            <div className="max-w-7xl mx-auto px-4">
              {/* Results Header - Only show when searching or filtering */}
              {(searchQuery || (cuisineFilter && cuisineFilter !== 'all')) && (
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {searchQuery ? `Results for "${searchQuery}"` : 'Filtered Results'}
                  </h2>
                  {location && (
                    <p className="text-gray-600 flex items-center">
                      <IconMapPin className="w-4 h-4 mr-2" />
                      Delivering to: {location}
                    </p>
                  )}
                </div>
              )}

              {/* Show organized sections when filter is 'all' or no filter */}
              {(!cuisineFilter || cuisineFilter === 'all') ? (
                <>
                  {/* Craven Quick Picks - Promoted Restaurants */}
                  {weeklyDeals.length > 0 && (
                    <div className="mb-8">
                      <div className="mb-4">
                        <h2 className="text-xl lg:text-2xl font-bold text-gray-900">Craven Quick Picks</h2>
                      </div>
                      <RestaurantGrid 
                        searchQuery={searchQuery} 
                        deliveryAddress={location} 
                        cuisineFilter={undefined}
                        excludeCuisine={undefined}
                        sectionTitle={undefined}
                        horizontal={true}
                        customRestaurants={weeklyDeals}
                      />
                    </div>
                  )}

                  {/* Great Deals - Restaurants with Promotions */}
                  {weeklyDeals.filter((r: any) => r.promotion_title || r.promotion_discount_percentage || r.promotion_discount_amount_cents).length > 0 && (
                    <div className="mb-8">
                      <div className="mb-4">
                        <h2 className="text-2xl font-bold text-gray-900">Great Deals</h2>
                      </div>
                      <RestaurantGrid 
                        searchQuery={searchQuery} 
                        deliveryAddress={location} 
                        cuisineFilter={undefined}
                        excludeCuisine={undefined}
                        sectionTitle={undefined}
                        horizontal={true}
                        customRestaurants={weeklyDeals.filter((r: any) => r.promotion_title || r.promotion_discount_percentage || r.promotion_discount_amount_cents)}
                      />
                    </div>
                  )}

                  {/* Premium Selections Header */}
                  <div className="mb-6 px-4">
                    <h2 className="text-2xl font-bold text-gray-900">Premium Selections</h2>
                  </div>

                  {/* Premium Selections - Restaurants (excluding apparel, retail, kids, late nate hunger) */}
                  <div className="mb-8">
                    <RestaurantGrid 
                      searchQuery={searchQuery} 
                      deliveryAddress={location} 
                      cuisineFilter={undefined}
                      excludeCuisine={['apparel', 'retail', 'kids', 'late nate hunger'].join(',')}
                      sectionTitle="Restaurants"
                      horizontal={true}
                    />
                  </div>

                  {/* Premium Selections - Apparel */}
                  <div className="mb-8">
                    <RestaurantGrid 
                      searchQuery={searchQuery} 
                      deliveryAddress={location} 
                      cuisineFilter="apparel"
                      sectionTitle="Apparel"
                      horizontal={true}
                    />
                  </div>

                  {/* Premium Selections - Retail */}
                  <div className="mb-8">
                    <RestaurantGrid 
                      searchQuery={searchQuery} 
                      deliveryAddress={location} 
                      cuisineFilter="retail"
                      sectionTitle="Retail"
                      horizontal={true}
                    />
                  </div>

                  {/* Premium Selections - Late Nate Hunger */}
                  <div className="mb-8">
                    <RestaurantGrid 
                      searchQuery={searchQuery} 
                      deliveryAddress={location} 
                      cuisineFilter="late nate hunger"
                      sectionTitle="Late Nate Hunger"
                      horizontal={true}
                    />
                  </div>

                  {/* Premium Selections - Kids */}
                  <div className="mb-8">
                    <RestaurantGrid 
                      searchQuery={searchQuery} 
                      deliveryAddress={location} 
                      cuisineFilter="kids"
                      sectionTitle="Kids"
                      horizontal={true}
                    />
                  </div>
                </>
              ) : cuisineFilter === 'apparel' ? (
                <>
                  {/* Apparel Category Submenu */}
                  <div className="mb-6 px-4">
                    <div className="flex space-x-3 overflow-x-auto scrollbar-hide pb-2" style={{
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none',
                      WebkitOverflowScrolling: 'touch'
                    }}>
                      <button
                        onClick={() => setApparelCategoryFilter('all')}
                        className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                          apparelCategoryFilter === 'all'
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setApparelCategoryFilter('Apparel')}
                        className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                          apparelCategoryFilter === 'Apparel'
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Apparel
                      </button>
                      <button
                        onClick={() => setApparelCategoryFilter('Accessories')}
                        className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                          apparelCategoryFilter === 'Accessories'
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Accessories
                      </button>
                      <button
                        onClick={() => setApparelCategoryFilter('Shoes')}
                        className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                          apparelCategoryFilter === 'Shoes'
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Shoes
                      </button>
                    </div>
                  </div>

                  {/* Apparel Stores - Horizontal Scrollable Row */}
                  <RestaurantGrid 
                    searchQuery={searchQuery} 
                    deliveryAddress={location} 
                    cuisineFilter="apparel"
                    sectionTitle="Apparel Stores"
                    horizontal={true}
                    categoryFilter={apparelCategoryFilter !== 'all' ? apparelCategoryFilter : undefined}
                  />
                </>
              ) : (
                /* Single section when filtering by specific cuisine or searching */
                <RestaurantGrid 
                  searchQuery={searchQuery} 
                  deliveryAddress={location} 
                  cuisineFilter={cuisineFilter}
                  horizontal={true}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Overlay - Mantine Drawer */}
      <Drawer
        opened={showMobileNav}
        onClose={() => setShowMobileNav(false)}
        position="right"
        size="256px"
        zIndex={50}
        styles={{
          overlay: {
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
          },
          content: {
            boxShadow: '-10px 0 25px rgba(0,0,0,0.1)'
          }
        }}
      >
        <Stack gap="md">
          <Group justify="space-between" mb="sm">
            <Title order={3} fw={600} style={{ fontSize: '16px', lineHeight: 1.2 }}>Browse</Title>
            <ActionIcon
              onClick={() => setShowMobileNav(false)}
              variant="subtle"
              size="lg"
              radius="xl"
            >
              <IconX size={20} />
            </ActionIcon>
          </Group>
          <Stack gap="xs">
            {navCategories.map((category) => {
              const IconComponent = category.icon;
              return (
                <Button
                  key={category.id}
                  onClick={() => {
                    handleCategoryClick(category.id);
                    setShowMobileNav(false);
                  }}
                  variant="subtle"
                  leftSection={<IconComponent size={20} />}
                  justify="flex-start"
                  fullWidth
                  style={{
                    justifyContent: 'flex-start',
                    paddingLeft: '12px',
                    paddingRight: '12px',
                    color: '#4b5563',
                    fontWeight: 500
                  }}
                  styles={{
                    root: {
                      '&:hover': {
                        backgroundColor: 'white',
                        color: '#111827'
                      }
                    }
                  }}
                >
                  {category.label}
                </Button>
              );
            })}
          </Stack>
        </Stack>
      </Drawer>

      <Footer />

      {/* Account Popup */}
      <AccountPopup 
        isOpen={showAccountPopup}
        onClose={() => setShowAccountPopup(false)}
        position={accountPopupPosition}
      />

      <style>{`
        @keyframes flameMain {
          0% {
            transform: translateX(-50%) scaleY(1) scaleX(1) translateY(0);
            clipPath: polygon(50% 100%, 0% 80%, 0% 50%, 20% 30%, 30% 10%, 50% 0%, 70% 10%, 80% 30%, 100% 50%, 100% 80%);
          }
          25% {
            transform: translateX(-50%) scaleY(1.2) scaleX(0.9) translateY(-1px);
            clipPath: polygon(50% 100%, 5% 75%, 5% 45%, 25% 25%, 35% 5%, 50% 0%, 65% 5%, 75% 25%, 95% 45%, 95% 75%);
          }
          50% {
            transform: translateX(-50%) scaleY(0.9) scaleX(1.1) translateY(0);
            clipPath: polygon(50% 100%, 0% 85%, 0% 55%, 15% 35%, 25% 15%, 50% 0%, 75% 15%, 85% 35%, 100% 55%, 100% 85%);
          }
          75% {
            transform: translateX(-50%) scaleY(1.15) scaleX(0.95) translateY(-0.5px);
            clipPath: polygon(50% 100%, 3% 78%, 3% 48%, 23% 28%, 33% 8%, 50% 0%, 67% 8%, 77% 28%, 97% 48%, 97% 78%);
          }
          100% {
            transform: translateX(-50%) scaleY(1) scaleX(1) translateY(0);
            clipPath: polygon(50% 100%, 0% 80%, 0% 50%, 20% 30%, 30% 10%, 50% 0%, 70% 10%, 80% 30%, 100% 50%, 100% 80%);
          }
        }
        
        @keyframes flameLeft {
          0% {
            transform: translateX(0) rotate(-10deg) scaleY(1) scaleX(1);
            opacity: 0.85;
          }
          33% {
            transform: translateX(-1.5px) rotate(-18deg) scaleY(1.25) scaleX(0.85);
            opacity: 1;
          }
          66% {
            transform: translateX(0.5px) rotate(-5deg) scaleY(0.8) scaleX(1.15);
            opacity: 0.8;
          }
          100% {
            transform: translateX(0) rotate(-10deg) scaleY(1) scaleX(1);
            opacity: 0.85;
          }
        }
        
        @keyframes flameRight {
          0% {
            transform: translateX(0) rotate(10deg) scaleY(1) scaleX(1);
            opacity: 0.85;
          }
          33% {
            transform: translateX(0.5px) rotate(5deg) scaleY(0.8) scaleX(1.15);
            opacity: 0.8;
          }
          66% {
            transform: translateX(-1.5px) rotate(18deg) scaleY(1.25) scaleX(0.85);
            opacity: 1;
          }
          100% {
            transform: translateX(0) rotate(10deg) scaleY(1) scaleX(1);
            opacity: 0.85;
          }
        }
        
        @keyframes flameTop {
          0% {
            transform: translateX(-50%) translateY(0) scaleY(1) scaleX(1);
            opacity: 0.9;
          }
          50% {
            transform: translateX(-50%) translateY(-3px) scaleY(1.4) scaleX(0.7);
            opacity: 1;
          }
          100% {
            transform: translateX(-50%) translateY(0) scaleY(0.85) scaleX(1.2);
            opacity: 0.8;
          }
        }
        
        @keyframes flameBaseGlow {
          0% {
            opacity: 0.3;
            transform: translateX(-50%) scale(0.9);
          }
          100% {
            opacity: 0.6;
            transform: translateX(-50%) scale(1.1);
          }
        }
        
        @keyframes spark1 {
          0% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: 1;
          }
          50% {
            transform: translateY(-8px) translateX(2px) scale(0.8);
            opacity: 0.7;
          }
          100% {
            transform: translateY(-12px) translateX(4px) scale(0.3);
            opacity: 0;
          }
        }
        
        @keyframes spark2 {
          0% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: 1;
          }
          50% {
            transform: translateY(-10px) translateX(-3px) scale(0.7);
            opacity: 0.6;
          }
          100% {
            transform: translateY(-14px) translateX(-5px) scale(0.2);
            opacity: 0;
          }
        }
        
        @keyframes flameGlow {
          0% {
            opacity: 0.2;
            transform: translateX(-50%) scale(0.9);
          }
          100% {
            opacity: 0.4;
            transform: translateX(-50%) scale(1.1);
          }
        }
        
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
    );
  }

  // Fallback: If somehow neither mobile nor desktop conditions match, return null
  return null;
};

export default Restaurants;
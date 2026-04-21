
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import RestaurantGrid from '@/components/RestaurantGrid';
import AccountPopup from '@/components/AccountPopup';
import { MainCustomerAdPanel } from '@/components/MainCustomerAdPanel';
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
  ScrollArea,
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
  IconShirt,
  IconUser,
  IconSettings,
  IconChevronRight,
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
  IconMap2
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { useDeliveryAddress } from '@/contexts/DeliveryAddressContext';
import cravenLogo from "@/assets/craven-logo.png";
import cravenCLogo from "@/assets/craven-c-new.png";
import heroPromoImage from "@/assets/20251116_0529_Crave'n Delivery Promo_remix_01ka63adc2e2et6qwwt2p909xn.png";
import CustomerMerchantMap from '@/components/CustomerMerchantMap';

// Professional Rating Icon Component
const RatingPill = ({ rating }: { rating: number }) => (
  <Group gap={4} style={{ backgroundColor: 'white', padding: '4px 8px', borderRadius: '9999px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
    <IconStar size={12} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
    <Text size="xs" fw={600} c="gray.9">{rating}</Text>
  </Group>
);

// Promo Card Component
const PromoCard = ({ title, subtitle, image }: { title: string; subtitle: string; image: string }) => (
  <Paper
    shadow="md"
    p="xl"
    radius="md"
    style={{
      height: '300px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      backgroundSize: 'cover',
      backgroundPosition: 'center top',
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
    <Box style={{ position: 'absolute', inset: 0, padding: 'var(--mantine-spacing-xl)', zIndex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <Box>
        <Title order={3} c="white" fw={600} style={{ lineHeight: 1.2, fontSize: '32px', marginTop: 'var(--mantine-spacing-xs)' }}>
          {title}
        </Title>
        <Text c="white" style={{ opacity: 0.9, marginTop: 'var(--mantine-spacing-xs)', fontSize: '24px' }}>
          {subtitle}
        </Text>
      </Box>
      <Button
        variant="white"
        color="dark"
        style={{ position: 'absolute', bottom: 'var(--mantine-spacing-xl)', right: 'var(--mantine-spacing-xl)' }}
      >
        View Details
      </Button>
    </Box>
  </Paper>
);

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
      {/* Image with rounded corners */}
      <Box style={{ position: 'relative', height: '160px', backgroundColor: '#f5f5f5', overflow: 'hidden', borderRadius: '12px', marginBottom: '12px' }}>
        <MantineImage
          src={restaurant.image || restaurant.image_url || `https://placehold.co/600x400/f5f5f5/333?text=Craven`}
          alt={restaurant.name}
          style={{ width: '100%', height: '160px', objectFit: 'cover' }}
          onError={(e) => { 
            e.currentTarget.src = "https://placehold.co/600x400/f5f5f5/333?text=Craven"; 
          }}
        />
      </Box>

      {/* Restaurant name and rating info on same line */}
      <Group justify="space-between" align="center" mb="xs" wrap="nowrap">
        <Text size="lg" fw={700} c="gray.9" lineClamp={1} style={{ flex: 1, minWidth: 0 }}>
          {restaurant.name}
        </Text>
        {/* Star rating * Mile distance * Delivery time */}
        <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
          <Group gap={4} wrap="nowrap">
            <IconStar size={24} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
            <Text style={{ fontSize: '24px' }} fw={500} c="gray.8">{restaurant.rating || 4.5}</Text>
          </Group>
          {restaurant.distance && (
            <>
              <Text size="sm" c="gray.4">•</Text>
              <Text size="sm" c="gray.7">{restaurant.distance}</Text>
            </>
          )}
          <Text size="sm" c="gray.4">•</Text>
          <Text size="sm" c="gray.7">{restaurant.time || '20 min'}</Text>
        </Group>
      </Group>

      {/* Promo text and Sponsored on same line */}
      <Group justify="space-between" align="center" mb="xs" wrap="nowrap">
        <Box style={{ flex: 1, minWidth: 0 }}>
          {/* Restaurant promo */}
          {restaurant.restaurantPromo && (
            <Text size="sm" c="gray.8" lineClamp={1}>
              {restaurant.restaurantPromo}
            </Text>
          )}
          {/* Discount promo */}
          {restaurant.discountPromo && (
            <Text size="sm" fw={600} c="red.7" lineClamp={1}>
              {restaurant.discountPromo}
            </Text>
          )}
        </Box>
        {/* Sponsored - right aligned */}
        {restaurant.isSponsored && (
          <Text size="sm" fw={600} c="blue.7" style={{ flexShrink: 0, marginLeft: '8px' }}>
            Sponsored
          </Text>
        )}
      </Group>
    </Box>
  );
};

const Restaurants = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [location, setLocation] = useState(searchParams.get('location') || '');
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
  const [mainCustomerAdIndex, setMainCustomerAdIndex] = useState(0);
  const [activeFilter, setActiveFilter] = useState('deals');
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [availableCuisines, setAvailableCuisines] = useState<string[]>([]);
  
  // Mobile app states
  // Web version: Check auth on mobile, allow guest browsing
  const [showMain, setShowMain] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true); // Check auth on mobile
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set());
  const { cartCount } = useCart(); // Use actual cart count from context, not hardcoded
  const [isGuest, setIsGuest] = useState(false); // Track guest mode
  
  // New state for enhanced functionality
  const [deliveryMode, setDeliveryMode] = useState<'delivery' | 'pickup'>('delivery');
  const [showAddressSelector, setShowAddressSelector] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [selectedLocationCoords, setSelectedLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mobileAddressSearch, setMobileAddressSearch] = useState(''); // Mobile web address input
  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<any[]>([]);
  const [showAccountPopup, setShowAccountPopup] = useState(false);
  const [accountPopupPosition, setAccountPopupPosition] = useState({ top: 0, left: 0 });
  const [showMenuIcons, setShowMenuIcons] = useState(false);
  const [showMapView, setShowMapView] = useState(false);
  // Default to Tampa HQ (6759 Nebraska Ave) — overwritten by browser geolocation if granted
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({ lat: 27.9766, lng: -82.4563 });
  const { selectedAddress, setSelectedAddress } = useDeliveryAddress();

  const mainCustomerAds = useMemo(
    () => adPlacements.filter((ad: any) => ad.placement_key === 'main_customer_ad'),
    [adPlacements]
  );

  const activeMainCustomerAd = useMemo(() => {
    if (mainCustomerAds.length === 0) return null;
    return mainCustomerAds[mainCustomerAdIndex % mainCustomerAds.length];
  }, [mainCustomerAds, mainCustomerAdIndex]);
  
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const currentLocation = useLocation();
  const mobile = useMediaQuery('(max-width: 48em)');
  const resultsRef = useRef<HTMLDivElement | null>(null);
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

  // Get user's current location for distance calculations
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => { /* silently fail */ }
      );
    }
  }, []);

  // Haversine distance in miles
  const calcDistanceMiles = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 3959;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  // Format distance for a restaurant record
  const formatDistance = (r: any): string => {
    if (!r.latitude || !r.longitude) return '';
    const d = calcDistanceMiles(userLocation.lat, userLocation.lng, r.latitude, r.longitude);
    if (d < 0.1) return `${Math.round(d * 5280)} ft`;
    return `${d.toFixed(1)} mi`;
  };

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (location) params.set('location', location);
    if (cuisineFilter && cuisineFilter !== 'all') params.set('cuisine', cuisineFilter);
    if (sortBy !== 'rating') params.set('sort', sortBy);
    setSearchParams(params);
  }, [searchQuery, location, cuisineFilter, sortBy, setSearchParams]);

  useEffect(() => {
    if (selectedAddress?.street_address && selectedAddress?.city && selectedAddress?.state && selectedAddress?.zip_code) {
      const full = `${selectedAddress.street_address}, ${selectedAddress.city}, ${selectedAddress.state} ${selectedAddress.zip_code}`;
      setLocation((prev) => (prev === full ? prev : full));
    }
    const lat = Number((selectedAddress as any)?.latitude);
    const lng = Number((selectedAddress as any)?.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      setSelectedLocationCoords((prev) => (
        prev && prev.lat === lat && prev.lng === lng ? prev : { lat, lng }
      ));
    }
  }, [
    selectedAddress?.street_address,
    selectedAddress?.city,
    selectedAddress?.state,
    selectedAddress?.zip_code,
    (selectedAddress as any)?.latitude,
    (selectedAddress as any)?.longitude,
  ]);

  useEffect(() => {
    if (!selectedAddress?.street_address || (selectedAddress as any)?.latitude != null || (selectedAddress as any)?.longitude != null) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        let mapboxToken = '';
        try {
          const { data } = await supabase.functions.invoke('get-mapbox-token');
          if (data?.token) mapboxToken = data.token;
        } catch {
          // fallback below
        }
        if (!mapboxToken) {
          mapboxToken = 'pk.eyJ1IjoiY3JhdmUtbiIsImEiOiJjbWVxb21qbTQyNTRnMm1vaHg5bDZwcmw2In0.aOsYrL2B0cjfcCGW1jHAdw';
        }
        const full = `${selectedAddress.street_address}, ${selectedAddress.city}, ${selectedAddress.state} ${selectedAddress.zip_code}`;
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(full)}.json?` +
            `access_token=${mapboxToken}&country=US&limit=1`,
        );
        const result = await response.json();
        const center = result?.features?.[0]?.center;
        if (!cancelled && Array.isArray(center) && center.length >= 2) {
          const lng = Number(center[0]);
          const lat = Number(center[1]);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            setSelectedAddress({
              ...selectedAddress,
              latitude: lat,
              longitude: lng,
            });
          }
        }
      } catch {
        // noop
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedAddress, setSelectedAddress]);

  const handleSearch = () => {
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Address selector functionality
  const handleAddressSearch = async (query: string) => {
    if (query.length < 3) {
      setAddressSuggestions([]);
      return;
    }

    try {
      let mapboxToken = '';

      try {
        const { data } = await supabase.functions.invoke('get-mapbox-token');
        if (data?.token) mapboxToken = data.token;
      } catch {
        // dev fallback below
      }

      if (!mapboxToken) {
        mapboxToken = 'pk.eyJ1IjoiY3JhdmUtbiIsImEiOiJjbWVxb21qbTQyNTRnMm1vaHg5bDZwcmw2In0.aOsYrL2B0cjfcCGW1jHAdw';
      }

      const mapboxResp = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
          `access_token=${mapboxToken}&country=US&autocomplete=true&types=address,poi&limit=5`,
      );
      const mapboxJson = await mapboxResp.json();
      let suggestions: string[] = Array.isArray(mapboxJson?.features)
        ? mapboxJson.features.map((feature: any) => feature.place_name).filter(Boolean)
        : [];

      if (!suggestions.length) {
        const nominatimResp = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`,
        );
        const nominatimJson = await nominatimResp.json();
        if (Array.isArray(nominatimJson)) {
          suggestions = nominatimJson.map((item: any) => item.display_name).filter(Boolean);
        }
      }

      setAddressSuggestions(suggestions);
    } catch (error) {
      console.error('Address search failed:', error);
      setAddressSuggestions([]);
    }
  };

  const selectAddress = async (address: string) => {
    let coords: { lat: number; lng: number } | null = null;
    try {
      const mapboxResp = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?` +
          `access_token=pk.eyJ1IjoiY3JhdmUtbiIsImEiOiJjbWVxb21qbTQyNTRnMm1vaHg5bDZwcmw2In0.aOsYrL2B0cjfcCGW1jHAdw&country=US&limit=1`,
      );
      const mapboxJson = await mapboxResp.json();
      const center = mapboxJson?.features?.[0]?.center;
      if (Array.isArray(center) && center.length >= 2) {
        coords = { lat: Number(center[1]), lng: Number(center[0]) };
      }
    } catch {
      coords = null;
    }
    const parts = address.split(',').map((part) => part.trim());
    const stateZip = (parts[2] || '').split(/\s+/);
    const state = stateZip[0] || '';
    const zip = stateZip.slice(1).join(' ');
    if (parts[0] && parts[1] && state && zip) {
      setSelectedAddress({
        street_address: parts[0],
        city: parts[1],
        state,
        zip_code: zip,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
      });
    }
    setSelectedLocationCoords(coords);
    setLocation(address);
    setShowAddressSelector(false);
    notifications.show({
      title: "Location Updated",
      message: `Delivery address set to ${address}`,
      color: 'orange',
    });
  };

  // Notifications functionality — fetch from DB, not mock data
  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setNotificationsList([]);
        return;
      }

      const { data: orderNotifs, error } = await supabase
        .from('order_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error || !orderNotifs) {
        console.error('Error fetching notifications:', error);
        setNotificationsList([]);
        return;
      }

      const formatted = orderNotifs.map((n: any) => ({
        id: n.id,
        title: n.title || 'Notification',
        message: n.message || '',
        time: new Date(n.created_at).toLocaleString(),
        read: n.read ?? true,
        type: n.notification_type || 'order',
      }));
      setNotificationsList(formatted);
    } catch (err) {
      console.error('Notification fetch error:', err);
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

  const removeFromCart = (itemId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== itemId));
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price || 0), 0);
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

  // Fetch deals on component mount
  useEffect(() => {
    fetchWeeklyDeals();
    fetchNotifications();
    fetchPromotionalBanners();
    fetchHeroImage();
    fetchAvailableCuisines();
    fetchAdPlacements();
  }, []);

  useEffect(() => {
    if (mainCustomerAds.length === 0) return;
    setMainCustomerAdIndex(Math.floor(Math.random() * mainCustomerAds.length));
  }, [mainCustomerAds]);

  useEffect(() => {
    if (mainCustomerAds.length <= 1) return;
    const n = mainCustomerAds.length;
    const id = window.setInterval(() => {
      setMainCustomerAdIndex((i) => (i + 1) % n);
    }, 30_000);
    return () => clearInterval(id);
  }, [mainCustomerAds.length]);

  // Update filter options based on delivery mode
  useEffect(() => {
    const updatedFilters = filterOptions.map(filter => ({
      ...filter,
      active: filter.id === activeFilter
    }));
    // This would update the filter options in real implementation
  }, [activeFilter, deliveryMode]);

  // Close dropdowns when clicking outside (panels must use data-dropdown and/or ref)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const isInsideDropdown = target.closest('[data-dropdown]');
      const isAddressTrigger = target.closest('[data-address-selector-trigger]');
      const isInsideAddressSelector = addressSelectorRef.current?.contains(target);

      if (!isInsideDropdown && !isAddressTrigger && !isInsideAddressSelector) {
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
    { id: 'all', label: 'Main', icon: IconHome, active: activeCategory === 'all' },
    { id: 'restaurants', label: 'Restaurants', icon: IconToolsKitchen2, active: activeCategory === 'restaurants' },
    { id: 'grocery', label: 'Grocery', icon: IconBuildingStore, active: activeCategory === 'grocery' },
    { id: 'convenience', label: 'C Stores', icon: IconCoffee, active: activeCategory === 'convenience' },
    { id: 'beauty', label: 'Cosmetics', icon: IconHeart, active: activeCategory === 'beauty' },
    { id: 'apparel', label: 'Apparel', icon: IconShirt, active: activeCategory === 'apparel' },
    { id: 'pets', label: 'Animals', icon: IconHeart, active: activeCategory === 'pets' },
    { id: 'health', label: 'Self Care', icon: IconShield, active: activeCategory === 'health' },
    { id: 'browse', label: 'Browse All', icon: IconSearch, active: activeCategory === 'browse' },
    { id: 'orders', label: 'Orders', icon: IconClock, active: activeCategory === 'orders' },
    { id: 'account', label: 'Account', icon: IconUser, active: activeCategory === 'account' }
  ];

  const getCategoryLabel = (categoryId: string) => {
    const category = navCategories.find(cat => cat.id === categoryId);
    return category ? category.label : 'Restaurants';
  };

  const handleCategoryClick = (categoryId: string) => {
    setActiveCategory(categoryId);
    
    // Handle different category types
    if (categoryId === 'all' || categoryId === 'browse') {
      setCuisineFilter('all');
    } else if (categoryId === 'restaurants') {
      // Filter to show restaurants (excluding apparel, retail, kids, late nate hunger)
      setCuisineFilter('all');
      // Scroll to the Restaurants section
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    } else if (['grocery', 'convenience', 'beauty', 'apparel', 'pets', 'health'].includes(categoryId)) {
      setCuisineFilter(categoryId);
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
    if (['all', 'browse', 'grocery', 'convenience', 'beauty', 'apparel', 'pets', 'health'].includes(categoryId)) {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  // Emoji mapping for cuisine types
  const getCuisineEmoji = (cuisine: string) => {
    const cuisineLower = cuisine.toLowerCase();
    if (cuisineLower.includes('pizza') || cuisineLower.includes('italian')) return '🍕';
    if (cuisineLower.includes('burger') || cuisineLower.includes('american')) return '🍔';
    if (cuisineLower.includes('sushi') || cuisineLower.includes('japanese')) return '🍣';
    if (cuisineLower.includes('chinese') || cuisineLower.includes('asian')) return '🍜';
    if (cuisineLower.includes('mexican') || cuisineLower.includes('taco')) return '🌮';
    if (cuisineLower.includes('indian')) return '🍛';
    if (cuisineLower.includes('thai')) return '🍲';
    if (cuisineLower.includes('bbq') || cuisineLower.includes('barbecue') || cuisineLower.includes('steakhouse')) return '🥩';
    if (cuisineLower.includes('breakfast') || cuisineLower.includes('brunch')) return '🥞';
    if (cuisineLower.includes('dessert') || cuisineLower.includes('bakery') || cuisineLower.includes('sweet')) return '🍰';
    if (cuisineLower.includes('seafood')) return '🦞';
    if (cuisineLower.includes('mediterranean') || cuisineLower.includes('greek')) return '🥙';
    if (cuisineLower.includes('korean')) return '🍱';
    if (cuisineLower.includes('vietnamese')) return '🍜';
    if (cuisineLower.includes('french')) return '🥐';
    if (cuisineLower.includes('grocery') || cuisineLower.includes('market')) return '🛒';
    return '🍽️'; // Default
  };

  // Category-specific filters
  const getCategoryFilters = (categoryId: string) => {
    switch (categoryId) {
      case 'apparel':
        return ['Men\'s', 'Women\'s', 'Kids', 'Shoes', 'Accessories', 'Jewelry', 'Bags', 'Watches', 'Sunglasses', 'Hats', 'Activewear', 'Formal'];
      case 'grocery':
        return ['Produce', 'Dairy', 'Meat', 'Bakery', 'Frozen', 'Pantry', 'Beverages', 'Snacks', 'Organic', 'Deli', 'Seafood', 'International'];
      case 'convenience':
        return ['Snacks', 'Beverages', 'Candy', 'Ice Cream', 'Quick Meals', 'Sandwiches', 'Salads', 'Soups', 'Breakfast', 'Coffee', 'Energy Drinks', 'Chips'];
      case 'beauty':
        return ['Makeup', 'Skincare', 'Hair Care', 'Fragrance', 'Tools', 'Bath & Body', 'Nails', 'Men\'s Grooming', 'Sunscreen', 'Anti-Aging', 'Acne Care', 'Hair Styling'];
      case 'pets':
        return ['Dogs', 'Cats', 'Birds', 'Fish', 'Small Pets', 'Supplies', 'Food', 'Toys', 'Beds', 'Grooming', 'Health', 'Training'];
      case 'health':
        return ['Vitamins', 'Supplements', 'Wellness', 'Fitness', 'Personal Care', 'First Aid', 'Pain Relief', 'Digestive', 'Immune Support', 'Sleep', 'Energy', 'Weight Management'];
      default:
        return [];
    }
  };

  const getCategoryFilterEmoji = (filter: string) => {
    // Return appropriate emoji for category filters
    const emojiMap: Record<string, string> = {
      "Men's": '👔', "Women's": '👗', 'Kids': '👶', 'Shoes': '👠', 'Accessories': '👜', 'Jewelry': '💍',
      'Bags': '👜', 'Watches': '⌚', 'Sunglasses': '🕶️', 'Hats': '🧢', 'Activewear': '👟', 'Formal': '🎩',
      'Produce': '🥬', 'Dairy': '🥛', 'Meat': '🥩', 'Bakery': '🍞', 'Frozen': '🧊', 'Pantry': '🥫',
      'Beverages': '🥤', 'Snacks': '🍿', 'Organic': '🌱', 'Deli': '🥓', 'Seafood': '🦞', 'International': '🌍',
      'Candy': '🍬', 'Ice Cream': '🍦', 'Quick Meals': '🍱', 'Sandwiches': '🥪', 'Salads': '🥗', 'Soups': '🍲',
      'Breakfast': '🥞', 'Coffee': '☕', 'Energy Drinks': '⚡', 'Chips': '🥔',
      'Electronics': '📱', 'Home': '🏠', 'Beauty': '💄', 'Health': '💊', 'Baby': '👶', 'Pet': '🐾',
      'Office': '💼', 'Garden': '🌳', 'Kitchen': '🍳', 'Bedding': '🛏️', 'Decor': '🖼️', 'Storage': '📦',
      'Makeup': '💄', 'Skincare': '🧴', 'Hair Care': '🧴', 'Fragrance': '🌸', 'Tools': '🪒', 'Bath & Body': '🛁',
      'Nails': '💅', "Men's Grooming": '🧔', 'Sunscreen': '☀️', 'Anti-Aging': '✨', 'Acne Care': '🔬', 'Hair Styling': '💇',
      'Dogs': '🐕', 'Cats': '🐈', 'Birds': '🐦', 'Fish': '🐠', 'Small Pets': '🐹', 'Supplies': '🪀',
      'Food': '🍖', 'Toys': '🎾', 'Beds': '🛏️', 'Grooming': '✂️', 'Training': '🎓',
      'Supplements': '💊', 'Wellness': '🧘', 'Fitness': '💪', 'Personal Care': '🧴', 'First Aid': '🩹',
      'Pain Relief': '💊', 'Digestive': '🌿', 'Immune Support': '🛡️', 'Sleep': '😴', 'Energy': '⚡', 'Weight Management': '⚖️'
    };
    return emojiMap[filter] || '🏷️';
  };

  // Unified emoji lookup — checks category sub-filter map first, then cuisine map
  const getFilterEmoji = (filter: string) => {
    const catEmoji = getCategoryFilterEmoji(filter);
    if (catEmoji !== '🏷️') return catEmoji;
    return getCuisineEmoji(filter);
  };

  // Build a unified, deduplicated list: cuisines + every category sub-filter
  const allFilters = React.useMemo(() => {
    const categoryKeys: string[] = ['grocery', 'convenience', 'beauty', 'apparel', 'pets', 'health'];
    const allCategoryFilters = categoryKeys.flatMap(k => getCategoryFilters(k));
    return [...new Set([...availableCuisines, ...allCategoryFilters])];
  }, [availableCuisines]);

  // Fetch available cuisine types
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
      image: r.promotion_image_url || r.header_image_url || r.image_url || `https://placehold.co/600x400/f5f5f5/333?text=${encodeURIComponent(r.name)}`,
      rating: r.rating || 4.5,
      reviews: `${r.total_reviews || 0}+`,
      distance: formatDistance(r) || '',
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
      image: r.promotion_image_url || r.header_image_url || r.image_url || `https://placehold.co/600x400/f5f5f5/333?text=${encodeURIComponent(r.name)}`,
      rating: r.rating || 4.5,
      reviews: `${r.total_reviews || 0}+`,
      distance: formatDistance(r) || '',
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

  // Check authentication on mobile devices (both app and web)
  useEffect(() => {
    const checkAuth = async () => {
      // Check if user is guest (from localStorage)
      const guestMode = localStorage.getItem('guest_mode') === 'true';
      if (guestMode) {
        setIsGuest(true);
        setShowMain(true);
        setCheckingAuth(false);
        return;
      }

      // On mobile, check if user is authenticated
      if (isMobile) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // User is logged in, show main view
          setShowMain(true);
        } else {
          // User is not logged in, redirect to auth page
          navigate('/auth?redirect=/restaurants');
          return;
        }
      } else {
        // Desktop: always show main view
        setShowMain(true);
      }
      setCheckingAuth(false);
    };
    
    checkAuth();
  }, [isMobile, navigate]);

  // Show loading state while checking auth (prevents flash)
  if (isMobile && checkingAuth) {
    return (
      <Box style={{ width: '100%', maxWidth: '430px', margin: '0 auto', minHeight: '100vh', background: 'linear-gradient(to bottom right, #fef2f2, white, #fafafa)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader size="lg" color="orange" />
      </Box>
    );
  }

  // Mobile App Landing Page (only show if user is NOT logged in) - DISABLED FOR WEB
  if (false && isMobile && !showMain && !checkingAuth) {
    return (
      <Box style={{ width: '100%', maxWidth: '430px', margin: '0 auto', minHeight: '100vh', background: 'linear-gradient(to bottom right, #fef2f2, white, #fafafa)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {/* Hero Section - Light, Premium */}
        <Box style={{ padding: '24px', paddingTop: '64px', paddingBottom: '48px', position: 'relative', overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {/* Hero Image - Promotional Banner */}
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

          {/* Logo and Tagline */}
          <Box style={{ position: 'relative', zIndex: 10 }}>
            <Title order={1} style={{ fontSize: '72px', fontWeight: 900, marginBottom: '8px', letterSpacing: '-0.05em', color: '#ffffff', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>Craven.</Title>
            <Text size="xl" fw={300} c="white" style={{ maxWidth: '320px', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
              Your premium choice for food delivery.
            </Text>
          </Box>

          {/* Action Area */}
          <Box style={{ position: 'relative', zIndex: 10, paddingTop: '64px' }}>
            <Text size="sm" c="white" mb="md" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>Enter your corporate or residential address to begin.</Text>
            <Box style={{ position: 'relative', backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(127, 29, 29, 0.25)', border: '1px solid #fee2e2' }}>
              <IconMapPin size={20} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#b91c1c' }} />
              <TextInput
                value={location}
                onChange={(e) => setLocation(e.currentTarget.value)}
                placeholder="Enter delivery address"
                style={{ paddingLeft: '48px', paddingRight: '64px' }}
                styles={{ input: { border: '2px solid transparent', fontSize: '16px', fontWeight: 500, padding: '16px', borderRadius: '12px' } }}
              />
              <ActionIcon
                onClick={() => setShowMain(true)}
                color="red"
                variant="filled"
                size="lg"
                radius="md"
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', backgroundColor: '#b91c1c', boxShadow: '0 10px 15px -3px rgba(185, 28, 28, 0.5)' }}
              >
                <IconChevronRight size={20} />
              </ActionIcon>
            </Box>

            <Group justify="space-between" mt="lg">
              <Button
                onClick={() => navigate('/auth?redirect=/restaurants')}
                variant="subtle"
                leftSection={<IconUser size={16} />}
                style={{ color: '#737373', fontWeight: 500 }}
              >
                Sign In / Sign Up
              </Button>
              <Button
                onClick={() => setShowMain(true)}
                variant="subtle"
                leftSection={<IconNavigation size={16} />}
                style={{ color: '#b91c1c', fontWeight: 500 }}
              >
                Use My Location
              </Button>
            </Group>
          </Box>
        </Box>

        {/* Footer Links */}
        <Group justify="center" p="md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(4px)', borderTop: '1px solid #e5e7eb' }}>
          <Text size="xs" c="gray.6" component="a" href="#" style={{ textDecoration: 'none', cursor: 'pointer' }}>Deliver</Text>
          <Text size="xs" c="gray.6" component="a" href="#" style={{ textDecoration: 'none', cursor: 'pointer' }}>Partner</Text>
          <Text size="xs" c="gray.6" component="a" href="#" style={{ textDecoration: 'none', cursor: 'pointer' }}>Help</Text>
        </Group>
      </Box>
    );
  }

  // Mobile App Main Interface
  if (isMobile && showMain) {
    return (
      <Box style={{ 
        width: '100%', 
        maxWidth: '430px', 
        margin: '0 auto', 
        minHeight: '100vh', 
        backgroundColor: 'white', 
        display: 'flex', 
        flexDirection: 'column',
        paddingTop: 'calc(120px + env(safe-area-inset-top, 0px))'
      }}>
        {showMapView && (
          <CustomerMerchantMap
            onClose={() => setShowMapView(false)}
            targetLocation={selectedLocationCoords}
          />
        )}
        {/* Search & Address Bar (Fixed Header - Matching Customer App) */}
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
          <Group
            justify="flex-start"
            mb="md"
            gap="xs"
            align="center"
            wrap="nowrap"
            style={{ flexWrap: 'nowrap', overflow: 'hidden' }}
          >
            <Box style={{ position: 'relative', width: '180px', flexShrink: 0 }}>
              <Button
                variant="subtle"
                data-address-selector-trigger
                leftSection={
                  <MantineImage
                    src={cravenCLogo}
                    alt="CRAVE'N"
                    style={{ height: '30px', width: '30px', flexShrink: 0 }}
                  />
                }
                rightSection={<IconChevronRight size={16} style={{ color: '#a3a3a3' }} />}
                onClick={() => setShowAddressSelector(!showAddressSelector)}
                style={{ padding: '8px', borderRadius: '12px', width: '100%', textAlign: 'left' }}
              >
                <Stack gap={0} align="flex-start">
                  <Text size="sm" fw={700} c="gray.9" lineClamp={1} style={{ maxWidth: '120px' }}>{location.split(',')[0]}...</Text>
                </Stack>
              </Button>
            </Box>

            <button
              type="button"
              data-map-view-toggle
              title={showMapView ? 'View list' : 'View map'}
              aria-label={showMapView ? 'View list' : 'View map'}
              onClick={(e) => {
                e.stopPropagation();
                setShowMapView((prev) => !prev);
              }}
              style={{
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                border: 'none',
                borderRadius: 9999,
                background: 'transparent',
                cursor: 'pointer',
                padding: 0,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {showMapView ? (
                <IconBuildingStore size={24} style={{ color: '#171717' }} />
              ) : (
                <IconMap2 size={24} style={{ color: '#171717' }} />
              )}
            </button>

            <Group
              gap="xs"
              wrap="nowrap"
              style={{ flexWrap: 'nowrap', flexShrink: 0 }}
            >
              <ActionIcon
                onClick={() => navigate('/notifications')}
                variant="subtle"
                size="lg"
                radius="xl"
                style={{ position: 'relative', flexShrink: 0 }}
              >
                <IconBell size={24} style={{ color: '#000000' }} />
                {notificationsList.filter(n => !n.read).length > 0 && (
                  <Box style={{ position: 'absolute', top: 4, right: 4, width: '10px', height: '10px', backgroundColor: '#b91c1c', borderRadius: '50%', border: '2px solid white' }} />
                )}
              </ActionIcon>
              <ActionIcon
                onClick={() => navigate('/account')}
                variant="subtle"
                size="lg"
                radius="xl"
                style={{ flexShrink: 0 }}
              >
                <IconUser size={24} style={{ color: '#171717' }} />
              </ActionIcon>
              {/* Cart Icon and count with no background */}
              <ActionIcon
                onClick={() => navigate('/checkout')}
                variant="subtle"
                size="lg"
                radius="xl"
                style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  gap: '4px',
                  padding: 0,
                  backgroundColor: 'transparent',
                  flexShrink: 0
                }}
              >
                {cartCount > 0 && (
                  <Text
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      lineHeight: 1
                    }}
                  >
                    {cartCount > 99 ? '99+' : cartCount}
                  </Text>
                )}
                <IconShoppingCart size={62} style={{ color: '#ff5f1f' }} />
              </ActionIcon>
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
              top: 'calc(120px + env(safe-area-inset-top, 0px))', // Always below header
              left: 0,
              right: 0,
              width: '100%',
              maxWidth: '430px',
              margin: '0 auto',
              zIndex: 999,
              borderBottom: '1px solid #e5e7eb', 
              backgroundColor: 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
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
              className="scrollbar-hide"
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
                          border: category.active ? 'none' : '1px solid #e5e7eb',
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
                        fw={500} 
                        c={category.active ? 'orange' : 'gray.7'}
                        style={{ textAlign: 'center' }}
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

        {showAddressSelector && (
          <Box
            ref={addressSelectorRef}
            data-dropdown
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: 'calc(120px + env(safe-area-inset-top, 0px))',
              left: 0,
              right: 0,
              width: '100%',
              maxWidth: '430px',
              margin: '0 auto',
              zIndex: 1100,
              backgroundColor: 'white',
              boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
              borderBottom: '1px solid #e5e7eb',
              padding: '16px'
            }}
          >
            <Stack gap="sm">
              <Group justify="space-between" align="center">
                <Text fw={600} c="gray.9">
                  Select delivery address
                </Text>
                <Button
                  variant="subtle"
                  size="xs"
                  onClick={() => setShowAddressSelector(false)}
                >
                  Close
                </Button>
              </Group>

              <TextInput
                placeholder="Search for an address"
                value={mobileAddressSearch}
                onChange={(e) => {
                  const value = e.currentTarget.value;
                  setMobileAddressSearch(value);
                  handleAddressSearch(value);
                }}
              />

              {addressSuggestions.length > 0 && (
                <Stack gap={4}>
                  {addressSuggestions.map((addr, index) => (
                    <Button
                      key={index}
                      variant="subtle"
                      fullWidth
                      style={{ justifyContent: 'flex-start' }}
                      onClick={() => {
                        selectAddress(addr);
                        setMobileAddressSearch('');
                      }}
                    >
                      {addr}
                    </Button>
                  ))}
                </Stack>
              )}

              <Button variant="outline" size="xs">
                Add new address
              </Button>
            </Stack>
          </Box>
        )}

        {/* Category Filter Buttons - Mobile (Sticky) — All filters: cuisines + every category */}
        <Box
          component="nav"
          style={{
            position: 'fixed',
            top: showMenuIcons 
              ? 'calc(220px + env(safe-area-inset-top, 0px))'
              : 'calc(120px + env(safe-area-inset-top, 0px))',
            left: 0,
            right: 0,
            width: '100%',
            maxWidth: '430px',
            margin: '0 auto',
            zIndex: 998,
            backgroundColor: 'white',
            borderBottom: '1px solid #e5e7eb',
            paddingTop: '13px',
            paddingBottom: '12px',
            paddingLeft: '16px',
            paddingRight: '16px',
          }}
        >
          {allFilters.length > 0 ? (
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
              }} className="scrollbar-hide">
                {allFilters.slice(0, Math.ceil(allFilters.length / 2)).map((filter) => {
                  const emoji = getFilterEmoji(filter);
                  const isActive = cuisineFilter === filter.toLowerCase();
                  return (
                    <Button
                      key={filter}
                      variant={isActive ? "filled" : "outline"}
                      size="xs"
                      radius="md"
                      onClick={() => {
                        setCuisineFilter(filter.toLowerCase());
                        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
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
                        boxShadow: isActive ? '0 2px 8px rgba(255, 95, 31, 0.3)' : '0 1px 2px rgba(0,0,0,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span style={{ fontSize: '16px', lineHeight: 1 }}>{emoji}</span>
                      <span>{filter}</span>
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
              }} className="scrollbar-hide">
                {allFilters.slice(Math.ceil(allFilters.length / 2)).map((filter) => {
                  const emoji = getFilterEmoji(filter);
                  const isActive = cuisineFilter === filter.toLowerCase();
                  return (
                    <Button
                      key={filter}
                      variant={isActive ? "filled" : "outline"}
                      size="xs"
                      radius="md"
                      onClick={() => {
                        setCuisineFilter(filter.toLowerCase());
                        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
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
                        boxShadow: isActive ? '0 2px 8px rgba(255, 95, 31, 0.3)' : '0 1px 2px rgba(0,0,0,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span style={{ fontSize: '16px', lineHeight: 1 }}>{emoji}</span>
                      <span>{filter}</span>
                    </Button>
                  );
                })}
              </Box>
            </Box>
          ) : (
            <Text size="sm" c="gray.6" ta="center" py="md">
              Loading filters...
            </Text>
          )}
        </Box>

        {/* Scrollable Content */}
        <Box style={{ 
          flex: 1, 
          overflowY: 'auto', 
          backgroundColor: 'white',
          paddingTop: '125px',
          paddingBottom: 'calc(70px + env(safe-area-inset-bottom, 0px))'
        }}>
          <Box component="main">

            {/* Main Customer Ad — smooth crossfade between creatives */}
            <MainCustomerAdPanel ad={activeMainCustomerAd} maxHeight={240} variant="web-mobile" />

            {/* Great Deals - Restaurants with Promotions */}
            {weeklyDeals.filter((r: any) => r.promotion_title || r.promotion_discount_percentage || r.promotion_discount_amount_cents).length > 0 && (
              <Box px="md" pt="md" pb="sm" style={{ backgroundColor: 'white' }}>
                <Title order={2} fw={800} c="gray.9" style={{ fontSize: '18px', lineHeight: 1.2, margin: 0, padding: 0 }}>
                  Great Deals
                </Title>
                <RestaurantGrid 
                  searchQuery={searchQuery} 
                  deliveryAddress={location}
                  targetLocation={selectedLocationCoords}
                  cuisineFilter={undefined}
                  excludeCuisine={undefined}
                  sectionTitle={undefined}
                  horizontal={true}
                  customRestaurants={weeklyDeals.filter((r: any) => r.promotion_title || r.promotion_discount_percentage || r.promotion_discount_amount_cents)}
                />
              </Box>
            )}

            {/* ═══ FOOD & RESTAURANTS ═══ */}
            <Box px="md" pt="md" pb={4} mt="md" style={{ backgroundColor: 'white', borderTop: '1px solid #e5e7eb' }}>
              <Title order={3} fw={800} c="gray.9" style={{ fontSize: '18px', lineHeight: 1.2, margin: 0 }}>
                Food & Restaurants
              </Title>
            </Box>

            {/* Restaurants Near You — location-based nearby */}
            <Box>
              <RestaurantGrid
                searchQuery={searchQuery}
                deliveryAddress={location}
                targetLocation={selectedLocationCoords}
                sectionTitle="Restaurants Near You"
                horizontal={true}
                useNearbyByLocation={true}
                marketplaceType="restaurant"
              />
            </Box>

            {/* Shopping Centers Near You */}
            <Box>
              <RestaurantGrid
                searchQuery={searchQuery}
                deliveryAddress={location}
                targetLocation={selectedLocationCoords}
                sectionTitle="Shopping Centers Near You"
                horizontal={true}
                useNearbyByLocation={true}
                marketplaceType="mall"
              />
            </Box>

            {/* Late Night Hunger */}
            <Box>
              <RestaurantGrid
                searchQuery={searchQuery}
                deliveryAddress={location}
                targetLocation={selectedLocationCoords}
                cuisineFilter="late night hunger"
                sectionTitle="Late Night Hunger"
                horizontal={true}
                useMarketplaceCatalog={true}
                marketplaceType="restaurant"
              />
            </Box>

            {/* Kids Menu */}
            <Box>
              <RestaurantGrid
                searchQuery={searchQuery}
                deliveryAddress={location}
                targetLocation={selectedLocationCoords}
                cuisineFilter="kids"
                sectionTitle="Kids Menu"
                horizontal={true}
                useMarketplaceCatalog={true}
                marketplaceType="restaurant"
              />
            </Box>

            {/* ═══ RETAIL & SHOPPING ═══ */}
            <Box px="md" pt="lg" pb={4} style={{ backgroundColor: '#fafafa', borderTop: '2px solid #f0f0f0' }}>
              <Title order={3} fw={800} c="gray.9" style={{ fontSize: '18px', lineHeight: 1.2, margin: 0, marginBottom: 4 }}>
                Retail & Shopping
              </Title>
            </Box>

            <Box>
              <RestaurantGrid
                searchQuery={searchQuery}
                deliveryAddress={location}
                targetLocation={selectedLocationCoords}
                sectionTitle="Retail Stores Near You"
                horizontal={true}
                useNearbyByLocation={true}
                marketplaceType="retail"
              />
            </Box>

            {/* Cosmetic Stores */}
            <Box px="md" pt="md" pb="xs">
              <RestaurantGrid
                searchQuery={searchQuery}
                deliveryAddress={location}
                targetLocation={selectedLocationCoords}
                sectionTitle="Cosmetic Stores"
                horizontal={true}
                useMarketplaceCatalog={true}
                marketplaceType="retail"
                cuisineFilter="Cosmetics"
              />
            </Box>

            {/* Pet Stores */}
            <Box px="md" pt="xs" pb="md">
              <RestaurantGrid
                searchQuery={searchQuery}
                deliveryAddress={location}
                targetLocation={selectedLocationCoords}
                sectionTitle="Pet Stores"
                horizontal={true}
                useMarketplaceCatalog={true}
                marketplaceType="retail"
                cuisineFilter="Pet"
              />
            </Box>

            {/* View more Section (one card per row) */}
            <Box px="md" py="sm" mt="md" style={{ backgroundColor: 'white', borderTop: '1px solid #e5e7eb' }}>
              <Box ref={resultsRef}>
                <Group justify="space-between" gap="xs" mb="sm" style={{ minHeight: 'auto', margin: 0, padding: 0, height: 'auto', marginBottom: '16px' }}>
                  <Title order={2} fw={800} c="gray.9" style={{ fontSize: '18px', lineHeight: 1.2, margin: 0, padding: 0 }}>View more</Title>
                </Group>
                <RestaurantGrid
                  searchQuery={searchQuery}
                  deliveryAddress={location}
                  targetLocation={selectedLocationCoords}
                  cuisineFilter={cuisineFilter}
                  columns={1}
                  useMarketplaceCatalog={true}
                  marketplaceType="restaurant"
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

  // Desktop Layout (existing code - keep as is)
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
                onClick={() => setShowNotifications(!showNotifications)}
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
                <IconMenu2 size={26} style={{ color: '#171717' }} />
              )}
            </ActionIcon>
          </Group>
          
          {/* Location & Delivery Mode */}
          <Group gap="xs">
            <Button
              data-address-selector-trigger
              onClick={() => setShowAddressSelector(!showAddressSelector)}
              variant="subtle"
              leftSection={<IconMapPin size={16} style={{ color: '#4b5563' }} />}
              rightSection={<IconChevronDown size={16} style={{ color: '#4b5563' }} />}
              style={{ 
                flex: 1,
                backgroundColor: '#f3f4f6',
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
                  backgroundColor: '#f3f4f6',
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
                backgroundColor: '#f3f4f6',
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
      <div className="hidden lg:block sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm" style={{ height: '80px' }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo */}
            <div className="flex items-center space-x-4">
              <img src={cravenLogo} alt="CRAVE'N" className="h-10" />
            </div>

            {/* Center: Search */}
            <div className="flex-1 max-w-2xl mx-8">
              <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <TextInput 
                  placeholder="Search Crave'n" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            {/* Right: Location, Delivery/Pickup, Notifications, Cart */}
            <div className="flex items-center space-x-4">
              {/* Location Selector */}
              <div className="relative">
                <button 
                  type="button"
                  data-address-selector-trigger
                  onClick={() => setShowAddressSelector(!showAddressSelector)}
                  className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 transition-colors"
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
                    className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Select delivery address</h3>
                      <div className="space-y-2">
                        <TextInput
                          placeholder="Search for an address"
                          onChange={(e) => handleAddressSearch(e.target.value)}
                          className="w-full"
                        />
                        {addressSuggestions.length > 0 && (
                          <div className="space-y-1">
                            {addressSuggestions.map((address, index) => (
                              <button
                                key={index}
                                onClick={() => selectAddress(address)}
                                className="w-full text-left p-2 hover:bg-gray-100 rounded-md text-sm"
                              >
                                {address}
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="pt-2 border-t">
                          <button className="text-orange-600 text-sm font-medium">
                            Add new address
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Delivery/Pickup Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
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
                  onClick={() => setShowNotifications(!showNotifications)}
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
                              notification.read ? 'bg-gray-50' : 'bg-orange-50 border-orange-200'
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
                  {cartItems.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center">
                      {cartItems.length}
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
                      {cartItems.length > 0 ? (
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {cartItems.map((item, index) => (
                            <div key={index} className="flex items-center justify-between p-2 border rounded-lg">
                              <div className="flex-1">
                                <h4 className="font-medium text-sm text-gray-900">{item.name}</h4>
                                <p className="text-xs text-gray-600">${item.price?.toFixed(2) || '0.00'}</p>
                              </div>
                              <button 
                                onClick={() => removeFromCart(item.id)}
                                className="text-primary hover:text-primary"
                              >
                                <IconX className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <div className="pt-3 border-t">
                            <div className="flex items-center justify-between mb-3">
                              <span className="font-semibold">Total: ${getCartTotal().toFixed(2)}</span>
                            </div>
                            <Button className="w-full bg-orange-500 hover:bg-orange-600">
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
                {showMobileNav ? <IconX className="w-6 h-6" /> : <IconMenu2 size={26} style={{ height: '26px', width: '16px' }} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* All Filter Buttons - Sticky below header (cuisines + category sub-filters) */}
      <Box
        component="nav"
        style={{
          position: 'sticky',
          top: isMobile ? '100px' : '80px',
          left: 0,
          right: 0,
          width: '100%',
          height: '100px',
          zIndex: 998,
          borderBottom: '1px solid #e5e7eb', 
          backgroundColor: 'white',
          marginTop: '0px',
          marginBottom: '0px',
          paddingTop: '13px',
          paddingBottom: '12px',
          paddingLeft: '16px',
          paddingRight: '16px',
          transition: 'top 0.2s ease',
        }}
      >
        {allFilters.length > 0 ? (
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
            }} className="scrollbar-hide">
              {allFilters.slice(0, Math.ceil(allFilters.length / 2)).map((filter) => {
                const emoji = getFilterEmoji(filter);
                const isActive = cuisineFilter === filter.toLowerCase();
                return (
                  <Button
                    key={filter}
                    variant={isActive ? "filled" : "outline"}
                    size="xs"
                    radius="md"
                    onClick={() => {
                      setCuisineFilter(filter.toLowerCase());
                      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
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
                      boxShadow: isActive ? '0 2px 8px rgba(255, 95, 31, 0.3)' : '0 1px 2px rgba(0,0,0,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span style={{ fontSize: '16px', lineHeight: 1 }}>{emoji}</span>
                    <span>{filter}</span>
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
            }} className="scrollbar-hide">
              {allFilters.slice(Math.ceil(allFilters.length / 2)).map((filter) => {
                const emoji = getFilterEmoji(filter);
                const isActive = cuisineFilter === filter.toLowerCase();
                return (
                  <Button
                    key={filter}
                    variant={isActive ? "filled" : "outline"}
                    size="xs"
                    radius="md"
                    onClick={() => {
                      setCuisineFilter(filter.toLowerCase());
                      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
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
                      boxShadow: isActive ? '0 2px 8px rgba(255, 95, 31, 0.3)' : '0 1px 2px rgba(0,0,0,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span style={{ fontSize: '16px', lineHeight: 1 }}>{emoji}</span>
                    <span>{filter}</span>
                  </Button>
                );
              })}
            </Box>
          </Box>
        ) : (
          <Text size="sm" c="gray.6" ta="center" py="md">
            Loading filters...
          </Text>
        )}
      </Box>

      {/* Mobile Filter Pills - Mantine UI */}
      <Box
        component="nav"
        px={0}
        style={{
          display: isMobile ? 'block' : 'none',
          position: 'sticky',
          top: '100px',
          zIndex: 999,
          backgroundColor: 'white',
          borderBottom: '1px solid #e5e7eb',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          height: '400px',
          paddingTop: '10px',
          paddingBottom: '16px',
          margin: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          width: '100%'
        }}
      >
        <ScrollArea type="scroll" scrollbars="x" style={{ width: '100%', overflow: 'auto hidden', scrollbarWidth: 'none', scrollBehavior: 'smooth', paddingLeft: '16px', paddingRight: '16px' }}>
          <Group gap="xs" style={{ flexWrap: 'nowrap', width: 'max-content', paddingBottom: '8px' }}>
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
                  backgroundColor: activeFilter === filter.id ? '#000000' : '#f3f4f6',
                  color: activeFilter === filter.id ? '#ffffff' : '#374151',
                  fontWeight: 500,
                  fontSize: '14px'
                }}
              >
                {filter.label}
              </Button>
            ))}
          </Group>
        </ScrollArea>
      </Box>

      <div className="flex">
        {/* Right Side Navigation - Desktop Only */}
        <div className="hidden lg:block w-64 bg-gray-50 border-r border-gray-200 min-h-screen side-menu-container">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Browse</h3>
            <nav className="space-y-1">
              {navCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.id)}
                  className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-gray-600 hover:bg-gray-100 hover:text-gray-900"
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
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Home sections stay visible; pills filter the list below (same idea as mobile “View more”). */}
            <>
              {/* Main Customer Ad — smooth crossfade between creatives */}
              <MainCustomerAdPanel ad={activeMainCustomerAd} maxHeight={280} variant="web-desktop" />

              {/* Great Deals - Restaurants with Promotions */}
              {weeklyDeals.filter((r: any) => r.promotion_title || r.promotion_discount_percentage || r.promotion_discount_amount_cents).length > 0 && (
                <div className="bg-gray-50 py-8 mb-8">
                  <div className="max-w-7xl mx-auto px-4">
                    <div className="mb-4">
                      <h2 className="text-2xl font-bold text-gray-900">Great Deals</h2>
                    </div>
                    <RestaurantGrid 
                      searchQuery={searchQuery} 
                      deliveryAddress={location}
                      targetLocation={selectedLocationCoords}
                      cuisineFilter={undefined}
                      excludeCuisine={undefined}
                      sectionTitle={undefined}
                      horizontal={true}
                      customRestaurants={weeklyDeals.filter((r: any) => r.promotion_title || r.promotion_discount_percentage || r.promotion_discount_amount_cents)}
                    />
                  </div>
                </div>
              )}

              {/* ═══════ FOOD & RESTAURANTS SECTION ═══════ */}
              <div className="bg-white py-0" style={{ marginTop: '0px', marginBottom: '0px' }}>
                <div className="max-w-7xl mx-auto px-4">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Food & Restaurants</h2>
                </div>
              </div>

              {/* Restaurants (excluding apparel, retail, kids, late nate hunger) */}
              <div className="bg-white py-8 mb-4">
                <div className="max-w-7xl mx-auto px-4">
                  <RestaurantGrid 
                    searchQuery={searchQuery} 
                    deliveryAddress={location}
                    targetLocation={selectedLocationCoords}
                    cuisineFilter={undefined}
                    excludeCuisine={['apparel', 'retail', 'kids', 'late nate hunger'].join(',')}
                    sectionTitle="Restaurants Near You"
                    horizontal={true}
                    useNearbyByLocation={true}
                    marketplaceType="restaurant"
                  />
                </div>
              </div>

              {/* Late Nate Hunger */}
              <div className="bg-white py-8 mb-4">
                <div className="max-w-7xl mx-auto px-4">
                  <RestaurantGrid 
                    searchQuery={searchQuery} 
                    deliveryAddress={location}
                    targetLocation={selectedLocationCoords}
                    cuisineFilter="late nate hunger"
                    sectionTitle="Late Nate Hunger"
                    horizontal={true}
                  />
                </div>
              </div>

              {/* Kids */}
              <div className="bg-white py-8 mb-4">
                <div className="max-w-7xl mx-auto px-4">
                  <RestaurantGrid 
                    searchQuery={searchQuery} 
                    deliveryAddress={location}
                    targetLocation={selectedLocationCoords}
                    cuisineFilter="kids"
                    sectionTitle="Kids Menu"
                    horizontal={true}
                  />
                </div>
              </div>

              {/* ═══════ RETAIL & SHOPPING SECTION ═══════ */}
              <div className="bg-gradient-to-r from-gray-50 to-white py-6 mt-4 border-t-2 border-gray-100">
                <div className="max-w-7xl mx-auto px-4">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Retail & Shopping</h2>
                </div>
              </div>

              {/* Apparel */}
              <div className="bg-white py-8 mb-4">
                <div className="max-w-7xl mx-auto px-4">
                  <RestaurantGrid 
                    searchQuery={searchQuery} 
                    deliveryAddress={location}
                    targetLocation={selectedLocationCoords}
                    cuisineFilter="apparel"
                    sectionTitle="Apparel & Fashion"
                    horizontal={true}
                  />
                </div>
              </div>

              {/* Retail */}
              <div className="bg-white py-8 mb-8">
                <div className="max-w-7xl mx-auto px-4">
                  <RestaurantGrid 
                    searchQuery={searchQuery} 
                    deliveryAddress={location}
                    targetLocation={selectedLocationCoords}
                    cuisineFilter="retail"
                    sectionTitle="Retail Stores"
                    horizontal={true}
                  />
                </div>
              </div>

              {/* View more — narrowed when a category pill is selected */}
              <div className="bg-white py-8 border-t border-gray-200" ref={resultsRef}>
                <div className="max-w-7xl mx-auto px-4">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">View more</h2>
                  </div>
                  <RestaurantGrid 
                    searchQuery={searchQuery} 
                    deliveryAddress={location}
                    targetLocation={selectedLocationCoords}
                    cuisineFilter={cuisineFilter}
                  />
                </div>
              </div>
            </>
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
          <Group justify="space-between" mb="lg">
            <Title order={3} fw={600}>Browse</Title>
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
                        backgroundColor: '#f3f4f6',
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
};

export default Restaurants;
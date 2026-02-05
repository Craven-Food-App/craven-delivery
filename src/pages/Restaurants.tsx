
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
  IconPackage
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';
import cravenLogo from "@/assets/craven-logo.png";
import cravenCLogo from "@/assets/craven-c-new.png";
import heroPromoImage from "@/assets/20251116_0529_Crave'n Delivery Promo_remix_01ka63adc2e2et6qwwt2p909xn.png";

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
      height: '350px',
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
      <Box style={{ position: 'relative', height: '200px', backgroundColor: '#f5f5f5', overflow: 'hidden', borderRadius: '12px', marginBottom: '12px' }}>
      <MantineImage
        src={restaurant.image || restaurant.image_url || `https://placehold.co/600x400/f5f5f5/333?text=Craven`}
        alt={restaurant.name}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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
          <Text size="sm" c="gray.4">•</Text>
          <Text size="sm" c="gray.7">{restaurant.distance || '0.5 mi'}</Text>
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
  const [activeFilter, setActiveFilter] = useState('deals');
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [availableCuisines, setAvailableCuisines] = useState<string[]>([]);
  
  // Mobile app states
  // Web version: Always show main view, never show landing page
  const [showMain, setShowMain] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(false); // Web doesn't need auth check for landing page
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set());
  const { cartCount } = useCart(); // Use actual cart count from context, not hardcoded
  
  // New state for enhanced functionality
  const [deliveryMode, setDeliveryMode] = useState<'delivery' | 'pickup'>('delivery');
  const [showAddressSelector, setShowAddressSelector] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<any[]>([]);
  const [showAccountPopup, setShowAccountPopup] = useState(false);
  const [accountPopupPosition, setAccountPopupPosition] = useState({ top: 0, left: 0 });
  const [showMenuIcons, setShowMenuIcons] = useState(false);
  
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const currentLocation = useLocation();
  const mobile = useMediaQuery('(max-width: 48em)');
  const resultsRef = useRef<HTMLDivElement | null>(null);

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

  // Address selector functionality
  const handleAddressSearch = async (query: string) => {
    if (query.length < 3) return;
    
    // Mock address suggestions - in real app, this would call a geocoding API
    const mockSuggestions = [
      `${query} Street, Toledo, OH`,
      `${query} Avenue, Toledo, OH`,
      `${query} Boulevard, Toledo, OH`,
      `${query} Drive, Toledo, OH`,
      `${query} Lane, Toledo, OH`
    ];
    setAddressSuggestions(mockSuggestions);
  };

  const selectAddress = (address: string) => {
    setLocation(address);
    setShowAddressSelector(false);
    notifications.show({
      title: "Location Updated",
      message: `Delivery address set to ${address}`,
      color: 'orange',
    });
  };

  // Notifications functionality
  const fetchNotifications = async () => {
    // Mock notifications - in real app, this would fetch from database
    const mockNotifications = [
      {
        id: 1,
        title: "Order Update",
        message: "Your order from CMIH Kitchen is being prepared",
        time: "2 min ago",
        read: false,
        type: "order"
      },
      {
        id: 2,
        title: "New Deal Available",
        message: "20% off your next order at McDonald's",
        time: "1 hour ago",
        read: false,
        type: "promotion"
      },
      {
        id: 3,
        title: "Delivery Complete",
        message: "Your order has been delivered successfully",
        time: "3 hours ago",
        read: true,
        type: "delivery"
      }
    ];
    setNotificationsList(mockNotifications);
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
      if (!target.closest('[data-dropdown]')) {
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
    { id: 'restaurants', label: 'Restaurants', icon: IconToolsKitchen2, active: activeCategory === 'restaurants' },
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
    } else if (['grocery', 'convenience', 'dashmart', 'beauty', 'apparel', 'pets', 'health'].includes(categoryId)) {
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
    if (['all', 'browse', 'grocery', 'convenience', 'dashmart', 'beauty', 'apparel', 'pets', 'health'].includes(categoryId)) {
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
      case 'dashmart':
        return ['Electronics', 'Home', 'Beauty', 'Health', 'Baby', 'Pet', 'Office', 'Garden', 'Kitchen', 'Bedding', 'Decor', 'Storage'];
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

  // Web version: Always show main view, never show landing page
  // Landing page logic is disabled for web - only used in customer app
  useEffect(() => {
    // Web always shows main view
    setShowMain(true);
    setCheckingAuth(false);
  }, []);

  // Web version: Never show landing page or loading state
  // Show loading state while checking auth (prevents flash of landing page) - DISABLED FOR WEB
  if (false && isMobile && checkingAuth) {
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
          <Group justify="space-between" mb="md" gap="xs">
            {/* C-Logo - Small to the left of address button */}
            <MantineImage 
              src={cravenCLogo} 
              alt="CRAVE'N" 
              style={{ height: '24px', width: '24px', flexShrink: 0 }} 
            />
            
            <Box style={{ position: 'relative', flex: 1 }}>
              <Button
                variant="subtle"
                leftSection={<IconMapPin size={20} style={{ color: '#b91c1c' }} />}
                rightSection={<IconChevronRight size={16} style={{ color: '#a3a3a3' }} />}
                onClick={() => setShowAddressSelector(!showAddressSelector)}
                style={{ padding: '8px', borderRadius: '12px', width: '100%' }}
              >
                <Stack gap={0} align="flex-start">
                  <Text size="sm" fw={700} c="gray.9" lineClamp={1} style={{ maxWidth: '150px' }}>{location.split(',')[0]}...</Text>
                </Stack>
              </Button>
            </Box>

            <Group gap="xs">
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
                  <IconShoppingCart size={24} style={{ color: '#171717' }} />
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

        {/* Category Filter Buttons - Mobile (Sticky, Conditional based on active category) */}
        {(activeCategory === 'all' || activeCategory === 'restaurants') ? (
          <Box
            component="nav"
            style={{
              position: 'fixed',
              top: showMenuIcons 
                ? 'calc(220px + env(safe-area-inset-top, 0px))' // Below header + menu dropdown
                : 'calc(120px + env(safe-area-inset-top, 0px))', // Below header only
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
                    }} className="scrollbar-hide">
                      {availableCuisines.slice(0, Math.ceil(availableCuisines.length / 2)).map((cuisine) => {
                        const cuisineEmoji = getCuisineEmoji(cuisine);
                        const isActive = cuisineFilter === cuisine.toLowerCase();
                        return (
                          <Button
                            key={cuisine}
                            variant={isActive ? "filled" : "outline"}
                            size="xs"
                            radius="md"
                            onClick={() => {
                              setCuisineFilter(cuisine.toLowerCase());
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
                            <span style={{ fontSize: '16px', lineHeight: 1 }}>{cuisineEmoji}</span>
                            <span>{cuisine}</span>
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
                      {availableCuisines.slice(Math.ceil(availableCuisines.length / 2)).map((cuisine) => {
                        const cuisineEmoji = getCuisineEmoji(cuisine);
                        const isActive = cuisineFilter === cuisine.toLowerCase();
                        return (
                          <Button
                            key={cuisine}
                            variant={isActive ? "filled" : "outline"}
                            size="xs"
                            radius="md"
                            onClick={() => {
                              setCuisineFilter(cuisine.toLowerCase());
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
                            <span style={{ fontSize: '16px', lineHeight: 1 }}>{cuisineEmoji}</span>
                            <span>{cuisine}</span>
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
            ) : ['grocery', 'convenience', 'dashmart', 'beauty', 'apparel', 'pets', 'health'].includes(activeCategory) ? (
              <Box
                component="nav"
                style={{
                  position: 'fixed',
                  top: showMenuIcons 
                    ? 'calc(220px + env(safe-area-inset-top, 0px))' // Below header + menu dropdown
                    : 'calc(120px + env(safe-area-inset-top, 0px))', // Below header only
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
                {(() => {
                  const categoryFilters = getCategoryFilters(activeCategory);
                  if (categoryFilters.length === 0) return null;
                  
                  return (
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
                        {categoryFilters.slice(0, Math.ceil(categoryFilters.length / 2)).map((filter) => {
                          const filterEmoji = getCategoryFilterEmoji(filter);
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
                              <span style={{ fontSize: '16px', lineHeight: 1 }}>{filterEmoji}</span>
                              <span>{filter}</span>
                            </Button>
                          );
                        })}
                      </Box>
                      {/* Row 2 */}
                      {categoryFilters.length > Math.ceil(categoryFilters.length / 2) && (
                        <Box style={{ 
                          display: 'flex', 
                          gap: '8px', 
                          overflowX: 'auto', 
                          scrollbarWidth: 'none', 
                          msOverflowStyle: 'none', 
                          WebkitOverflowScrolling: 'touch', 
                          paddingBottom: '4px'
                        }} className="scrollbar-hide">
                          {categoryFilters.slice(Math.ceil(categoryFilters.length / 2)).map((filter) => {
                            const filterEmoji = getCategoryFilterEmoji(filter);
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
                                <span style={{ fontSize: '16px', lineHeight: 1 }}>{filterEmoji}</span>
                                <span>{filter}</span>
                              </Button>
                            );
                          })}
                        </Box>
                      )}
                    </Box>
                  );
                })()}
              </Box>
            ) : null}

        {/* Scrollable Content */}
        <Box style={{ 
          flex: 1, 
          overflowY: 'auto', 
          backgroundColor: '#fafafa',
          paddingTop: (() => {
            const hasFilters = (activeCategory === 'all' || activeCategory === 'restaurants' || ['grocery', 'convenience', 'dashmart', 'beauty', 'apparel', 'pets', 'health'].includes(activeCategory));
            if (showMenuIcons && hasFilters) {
              return '220px'; // Menu + filters
            } else if (showMenuIcons) {
              return '100px'; // Menu only
            } else if (hasFilters) {
              return '100px'; // Filters only
            }
            return '0px';
          })()
        }}>
          <Box component="main">
            {/* Promo Carousel */}
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
                        subtitle={banner.subtitle}
                        image={banner.image_url} 
                      />
                    </Carousel.Slide>
                  ))}
                </Carousel>
              </Box>
            ) : null}

            {/* Fastest near you */}
            <Box px="md" style={{ backgroundColor: 'white', borderTop: '1px solid #e5e7eb', marginTop: 0, paddingTop: '4px', paddingBottom: '4px', height: '345px' }}>
              <Group justify="space-between" mb="md">
                <Title order={2} fw={800} c="gray.9" style={{ fontSize: '24px' }}>Craven Quick Picks</Title>
                <ActionIcon variant="subtle" color="red" radius="xl">
                  <IconChevronRight size={26} style={{ height: '26px', width: '26px' }} />
                </ActionIcon>
              </Group>
              
              <Group gap="md" style={{ overflowX: 'auto', paddingBottom: '8px' }}>
                {RESTAURANTS_DATA.fastest.map((restaurant) => (
                  <RestaurantCard 
                    key={restaurant.id} 
                    restaurant={restaurant} 
                    likedItems={likedItems} 
                    toggleLike={toggleLike} 
                  />
                ))}
              </Group>
            </Box>

            {/* Advertisement Banner - Dynamic */}
            <Box px="md" py="md" style={{ backgroundColor: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {loadingAds ? (
                <Box
                  style={{
                    width: '380px',
                    height: '200px',
                    backgroundColor: '#f3f4f6',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Loader size="sm" />
                </Box>
              ) : (() => {
                const adPlacement = adPlacements.find(ad => ad.placement_key === 'below_quick_picks');
                return adPlacement ? (
                    <Box
                      component="a"
                      href={adPlacement.click_url || '#'}
                      target={adPlacement.click_url ? '_blank' : undefined}
                      rel={adPlacement.click_url ? 'noopener noreferrer' : undefined}
                      style={{
                        width: `${adPlacement.width}px`,
                        height: `${adPlacement.height}px`,
                        backgroundColor: '#f3f4f6',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: adPlacement.click_url ? 'pointer' : 'default',
                        transition: 'opacity 0.2s',
                        overflow: 'hidden',
                        textDecoration: 'none',
                      }}
                      onMouseEnter={(e) => {
                        if (adPlacement.click_url) {
                          e.currentTarget.style.opacity = '0.9';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '1';
                      }}
                    >
                      {adPlacement.ad_code ? (
                        <div 
                          dangerouslySetInnerHTML={{ __html: adPlacement.ad_code }} 
                          style={{ width: '100%', height: '100%' }}
                        />
                      ) : adPlacement.image_url ? (
                        <MantineImage
                          src={adPlacement.image_url}
                          alt="Advertisement"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <Text size="sm" c="dimmed" style={{ textAlign: 'center' }}>
                          Advertisement
                          <br />
                          {adPlacement.width} × {adPlacement.height}
                        </Text>
                      )}
                    </Box>
                  ) : (
                    <Box
                      style={{
                        width: '380px',
                        height: '200px',
                        backgroundColor: '#f3f4f6',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text size="sm" c="dimmed" style={{ textAlign: 'center' }}>
                        Advertisement
                        <br />
                        380 × 200
                      </Text>
                    </Box>
                  );
                })()}
              </Box>

            {/* Premium Selections */}
            <Box px="md" style={{ backgroundColor: 'white', borderTop: '1px solid #e5e7eb', marginTop: 0, paddingTop: '0px', paddingBottom: '0px' }}>
              <Group justify="space-between" mb="md">
                <Title order={2} fw={800} c="gray.9" style={{ fontSize: '24px' }}>Premium Selections</Title>
                <ActionIcon variant="subtle" color="red" radius="xl">
                  <IconChevronRight size={26} style={{ height: '26px', width: '26px' }} />
                </ActionIcon>
              </Group>
              
              <Stack gap="md">
                {RESTAURANTS_DATA.premium.map((restaurant) => (
                  <RestaurantCard 
                    key={restaurant.id} 
                    restaurant={restaurant} 
                    likedItems={likedItems} 
                    toggleLike={toggleLike} 
                  />
                ))}
              </Stack>
            </Box>

            {/* Show organized sections when filter is 'all' or no filter */}
            {(!cuisineFilter || cuisineFilter === 'all') ? (
              <>
                {/* Premium Selections - Restaurants (excluding apparel, retail, kids, late nate hunger) */}
                <Box px="md" py="md" style={{ backgroundColor: 'white', borderTop: '1px solid #e5e7eb' }}>
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
                <Box px="md" py="md" style={{ backgroundColor: 'white', borderTop: '1px solid #e5e7eb' }}>
                  <RestaurantGrid 
                    searchQuery={searchQuery} 
                    deliveryAddress={location} 
                    cuisineFilter="apparel"
                    sectionTitle="Apparel"
                    horizontal={true}
                  />
                </Box>

                {/* Premium Selections - Retail */}
                <Box px="md" py="md" style={{ backgroundColor: 'white', borderTop: '1px solid #e5e7eb' }}>
                  <RestaurantGrid 
                    searchQuery={searchQuery} 
                    deliveryAddress={location} 
                    cuisineFilter="retail"
                    sectionTitle="Retail"
                    horizontal={true}
                  />
                </Box>

                {/* Premium Selections - Late Nate Hunger */}
                <Box px="md" py="md" style={{ backgroundColor: 'white', borderTop: '1px solid #e5e7eb' }}>
                  <RestaurantGrid 
                    searchQuery={searchQuery} 
                    deliveryAddress={location} 
                    cuisineFilter="late nate hunger"
                    sectionTitle="Late Nate Hunger"
                    horizontal={true}
                  />
                </Box>

                {/* Premium Selections - Kids */}
                <Box px="md" py="md" style={{ backgroundColor: 'white', borderTop: '1px solid #e5e7eb' }}>
                  <RestaurantGrid 
                    searchQuery={searchQuery} 
                    deliveryAddress={location} 
                    cuisineFilter="kids"
                    sectionTitle="Kids"
                    horizontal={true}
                  />
                </Box>

                {/* Browse All Section */}
                <Box px="md" py="md" style={{ backgroundColor: 'white', borderTop: '1px solid #e5e7eb' }} ref={resultsRef}>
                  <Box mb="md">
                    <Title order={2} fw={800} c="gray.9" style={{ fontSize: '24px' }}>Browse All</Title>
                  </Box>
                  <RestaurantGrid 
                    searchQuery={searchQuery} 
                    deliveryAddress={location} 
                    cuisineFilter={cuisineFilter}
                    columns={2}
                  />
                </Box>
              </>
            ) : (
              /* Single section when filtering by specific cuisine or searching */
              <Box px="md" py="md" style={{ backgroundColor: 'white', borderTop: '1px solid #e5e7eb' }} ref={resultsRef}>
                {(searchQuery || location || cuisineFilter !== 'all') && (
                  <Box mb="md">
                    <Title order={2} fw={800} c="gray.9" style={{ fontSize: '24px' }}>
                      {searchQuery 
                        ? `Results for "${searchQuery}"` 
                        : activeCategory && activeCategory !== 'all' && activeCategory !== 'browse'
                          ? `${getCategoryLabel(activeCategory)} Near You`
                          : 'Restaurants Near You'}
                    </Title>
                    {location && (
                      <Text size="sm" c="gray.6" mt="xs" style={{ display: 'flex', alignItems: 'center' }}>
                        <IconMapPin size={16} style={{ marginRight: '8px' }} />
                        Delivering to: {location}
                      </Text>
                    )}
                  </Box>
                )}
                <RestaurantGrid 
                  searchQuery={searchQuery} 
                  deliveryAddress={location} 
                  cuisineFilter={cuisineFilter}
                  columns={2}
                />
              </Box>
            )}

            {/* Spacing for Nav */}
            <Box style={{ height: '64px' }} />
          </Box>
        </Box>

        {/* Bottom Navigation removed - using global navigation */}
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
                  placeholder="Search Crave'N" 
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
                  onClick={() => setShowAddressSelector(!showAddressSelector)}
                  className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <IconMapPin className="w-4 h-4" />
                  <span className="text-sm font-medium max-w-32 truncate">{location}</span>
                  <IconChevronRight className="w-4 h-4" />
                </button>
                
                {/* Address Selector Dropdown */}
                {showAddressSelector && (
                  <div data-dropdown className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
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

      {/* Cuisine Filter Buttons - Sticky below header */}
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
            }} className="scrollbar-hide">
              {availableCuisines.slice(0, Math.ceil(availableCuisines.length / 2)).map((cuisine) => {
                const cuisineEmoji = getCuisineEmoji(cuisine);
                const isActive = cuisineFilter === cuisine.toLowerCase();
                return (
                  <Button
                    key={cuisine}
                    variant={isActive ? "filled" : "outline"}
                    size="xs"
                    radius="md"
                    onClick={() => {
                      setCuisineFilter(cuisine.toLowerCase());
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
                    <span style={{ fontSize: '16px', lineHeight: 1 }}>{cuisineEmoji}</span>
                    <span>{cuisine}</span>
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
              {availableCuisines.slice(Math.ceil(availableCuisines.length / 2)).map((cuisine) => {
                const cuisineEmoji = getCuisineEmoji(cuisine);
                const isActive = cuisineFilter === cuisine.toLowerCase();
                return (
                  <Button
                    key={cuisine}
                    variant={isActive ? "filled" : "outline"}
                    size="xs"
                    radius="md"
                    onClick={() => {
                      setCuisineFilter(cuisine.toLowerCase());
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
                    <span style={{ fontSize: '16px', lineHeight: 1 }}>{cuisineEmoji}</span>
                    <span>{cuisine}</span>
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

          {/* Show organized sections when filter is 'all' or no filter */}
          {(!cuisineFilter || cuisineFilter === 'all') ? (
            <>
              {/* Craven Quick Picks - Promoted Restaurants */}
              {weeklyDeals.length > 0 && (
                <div className="bg-white py-8 mb-8" style={{ height: '440px' }}>
                  <div className="max-w-7xl mx-auto px-4">
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
                </div>
              )}

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
                      cuisineFilter={undefined}
                      excludeCuisine={undefined}
                      sectionTitle={undefined}
                      horizontal={true}
                      customRestaurants={weeklyDeals.filter((r: any) => r.promotion_title || r.promotion_discount_percentage || r.promotion_discount_amount_cents)}
                    />
                  </div>
                </div>
              )}

              {/* Premium Selections Header */}
              <div className="bg-white py-0" style={{ marginTop: '0px', marginBottom: '0px' }}>
                <div className="max-w-7xl mx-auto px-4">
                  <h2 className="text-2xl font-bold text-gray-900">Premium Selections</h2>
                </div>
              </div>

              {/* Premium Selections - Restaurants (excluding apparel, retail, kids, late nate hunger) */}
              <div className="bg-white py-8 mb-8">
                <div className="max-w-7xl mx-auto px-4">
                  <RestaurantGrid 
                    searchQuery={searchQuery} 
                    deliveryAddress={location} 
                    cuisineFilter={undefined}
                    excludeCuisine={['apparel', 'retail', 'kids', 'late nate hunger'].join(',')}
                    sectionTitle="Restaurants"
                    horizontal={true}
                  />
                </div>
              </div>

              {/* Premium Selections - Apparel */}
              <div className="bg-white py-8 mb-8">
                <div className="max-w-7xl mx-auto px-4">
                  <RestaurantGrid 
                    searchQuery={searchQuery} 
                    deliveryAddress={location} 
                    cuisineFilter="apparel"
                    sectionTitle="Apparel"
                    horizontal={true}
                  />
                </div>
              </div>

              {/* Premium Selections - Retail */}
              <div className="bg-white py-8 mb-8">
                <div className="max-w-7xl mx-auto px-4">
                  <RestaurantGrid 
                    searchQuery={searchQuery} 
                    deliveryAddress={location} 
                    cuisineFilter="retail"
                    sectionTitle="Retail"
                    horizontal={true}
                  />
                </div>
              </div>

              {/* Premium Selections - Late Nate Hunger */}
              <div className="bg-white py-8 mb-8">
                <div className="max-w-7xl mx-auto px-4">
                  <RestaurantGrid 
                    searchQuery={searchQuery} 
                    deliveryAddress={location} 
                    cuisineFilter="late nate hunger"
                    sectionTitle="Late Nate Hunger"
                    horizontal={true}
                  />
                </div>
              </div>

              {/* Premium Selections - Kids */}
              <div className="bg-white py-8 mb-8">
                <div className="max-w-7xl mx-auto px-4">
                  <RestaurantGrid 
                    searchQuery={searchQuery} 
                    deliveryAddress={location} 
                    cuisineFilter="kids"
                    sectionTitle="Kids"
                    horizontal={true}
                  />
                </div>
              </div>

              {/* Browse All Section */}
              <div className="bg-white py-8" ref={resultsRef}>
                <div className="max-w-7xl mx-auto px-4">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Browse All</h2>
                  </div>
                  <RestaurantGrid 
                    searchQuery={searchQuery} 
                    deliveryAddress={location} 
                    cuisineFilter={cuisineFilter}
                  />
                </div>
              </div>
            </>
          ) : (
            /* Single section when filtering by specific cuisine or searching */
            <div className="bg-white py-8" ref={resultsRef}>
              <div className="max-w-7xl mx-auto px-4">
                {/* Results Header */}
                {(searchQuery || location || cuisineFilter !== 'all') && (
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {searchQuery 
                        ? `Results for "${searchQuery}"` 
                        : activeCategory && activeCategory !== 'all' && activeCategory !== 'browse'
                          ? `${getCategoryLabel(activeCategory)} Near You`
                          : 'Restaurants Near You'}
                    </h2>
                    {location && (
                      <p className="text-gray-600 flex items-center">
                        <IconMapPin className="w-4 h-4 mr-2" />
                        Delivering to: {location}
                      </p>
                    )}
                  </div>
                )}
                <RestaurantGrid 
                  searchQuery={searchQuery} 
                  deliveryAddress={location} 
                  cuisineFilter={cuisineFilter}
                />
              </div>
            </div>
          )}
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
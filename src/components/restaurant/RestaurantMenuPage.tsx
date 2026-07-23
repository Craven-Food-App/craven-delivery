// @ts-nocheck
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate } from 'react-router-dom';
import { getLogoBackgroundColor } from '@/utils/logoUtils';
import {
  Button,
  TextInput,
  Badge,
  Stack,
  Group,
  Text,
  Title,
  Box,
  ActionIcon,
  Image as MantineImage,
  ScrollArea,
  Divider,
  Card,
  Loader,
  Drawer,
  Modal,
  Tabs,
  Menu,
  RingProgress,
  Avatar,
  Grid,
  Textarea,
  Rating,
  Progress,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconStar,
  IconClock,
  IconTruck,
  IconPlus,
  IconMinus,
  IconShoppingCart,
  IconX,
  IconChevronLeft,
  IconToolsKitchen2,
  IconHeart,
  IconShare,
  IconMapPin,
  IconPhone,
  IconNavigation,
  IconMessageCircle,
  IconCircleCheck,
  IconFilter,
  IconSearch,
  IconChefHat,
  IconLeaf,
  IconInfoCircle,
  IconArrowUp,
  IconFlame,
  IconCar,
  IconHome,
  IconBuildingStore,
  IconCoffee,
  IconCalendar,
  IconUser,
  IconBell,
  IconMenu2,
  IconApple,
  IconPill,
  IconPaw,
  IconReceipt,
  IconThumbUp,
    IconShieldCheck,
    IconStarFilled,
    IconChevronRight,
} from "@tabler/icons-react";
import { supabase } from '@/integrations/supabase/client';
import cravenLogo from "@/assets/craven-logo.png";
import cravemoreIcon from "@/assets/cravemore-icon.png";
import { useCart } from '@/contexts/CartContext';
import RetailItemDetailModal from '@/components/retail/RetailItemDetailModal';

// --- Type Definitions (matching your database) ---
interface Restaurant {
  id: string;
  name: string;
  description: string;
  cuisine_type: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  delivery_fee_cents: number;
  min_delivery_time: number;
  max_delivery_time: number;
  rating: number;
  total_reviews: number;
  image_url: string;
  header_image_url?: string;
  logo_url?: string;
  latitude?: number;
  longitude?: number;
  is_open?: boolean;
  opens_at?: string;
  closes_at?: string;
  cravemore_eligible?: boolean | null;
  merchant_category?: string | null;
  restaurant_type?: string | null;
}

// Detect if this is a retail / non-food store
const RETAIL_CUISINE_TYPES = ['apparel', 'retail', 'clothing', 'fashion', 'electronics', 'hardware', 'beauty', 'cosmetics', 'specialty_retail'];
const isRetailStore = (r: Restaurant | null): boolean => {
  if (!r) return false;
  const mc = (r.merchant_category || '').toLowerCase();
  const ct = (r.cuisine_type || '').toLowerCase();
  const rt = (r.restaurant_type || '').toLowerCase();
  return (
    mc === 'retail_store' || mc === 'specialty_retail' ||
    rt === 'retail_store' || rt === 'retail' ||
    RETAIL_CUISINE_TYPES.includes(ct)
  );
};

interface MenuCategory {
  id: string;
  name: string;
  description: string;
  display_order: number;
  restaurant_id: string;
  icon?: string;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  image_url: string;
  is_available: boolean;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
  category_id: string;
  preparation_time: number;
  restaurant_id: string;
  is_featured?: boolean;
  order_count?: number;
  spice_level?: number;
  calories?: number;
  chef_recommended?: boolean;
  favorites_count?: number;
  // Retail fields
  brand?: string;
  tags?: string[];
  has_variants?: boolean;
  compare_at_price_cents?: number;
  product_type?: string;
  requires_shipping?: boolean;
  weight_value?: number;
  weight_unit?: string;
}

interface PromoCode {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: string;
  discount_percentage: number | null;
  discount_amount_cents: number | null;
  minimum_order_cents: number | null;
  is_active: boolean;
}

interface CartItem extends MenuItem {
  key: string;
  quantity: number;
  special_instructions?: string;
}

// --- Mobile Header Component (DoorDash Style) ---
const MobileHeader = ({ restaurant, onBack, onShare, onLike, isLiked = false }: { restaurant: Restaurant | null; onBack: () => void; onShare: () => void; onLike: () => void; isLiked?: boolean }) => (
  <Box
    style={{
      display: 'block',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      backgroundColor: 'white',
      borderBottom: '1px solid var(--mantine-color-gray-3)',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    }}
    className="lg:hidden"
  >
    <Group justify="space-between" align="center" p="md" px="lg">
      <ActionIcon
        variant="subtle"
        onClick={onBack}
        style={{ marginLeft: '-8px' }}
      >
        <IconChevronLeft size={24} style={{ color: 'var(--mantine-color-gray-9)' }} />
      </ActionIcon>
      <Box style={{ flex: 1, textAlign: 'center' }}>
        <Text fw={600} size="sm" truncate>{restaurant?.name || 'Restaurant'}</Text>
      </Box>
      <Group gap="xs">
      <ActionIcon
        variant="subtle"
        onClick={onShare}
      >
        <IconShare size={20} style={{ color: 'var(--mantine-color-gray-6)' }} />
      </ActionIcon>
        <ActionIcon
          variant="subtle"
          onClick={onLike}
          style={{ marginRight: '-8px' }}
        >
          <IconHeart 
            size={20} 
            style={{ 
              color: isLiked ? 'var(--mantine-color-red-6)' : 'var(--mantine-color-gray-6)',
              fill: isLiked ? 'var(--mantine-color-red-6)' : 'none'
            }} 
          />
      </ActionIcon>
      </Group>
    </Group>
  </Box>
);

// --- Main Component ---
const RestaurantMenuPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
    const tabsRef = useRef<HTMLDivElement>(null);
    const mobileStickyNavRef = useRef<HTMLDivElement>(null);
    
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [promos, setPromos] = useState<PromoCode[]>([]);
  const { cartItems, addToCart: addToCartContext, removeFromCart: removeFromCartContext, clearCart } = useCart();
  const [loading, setLoading] = useState(true);

  // New state for header and side menu
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('6759 Nebraska Ave');
  const [showAddressSelector, setShowAddressSelector] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [isMenuCompressed, setIsMenuCompressed] = useState(true);
  const [isMenuHovered, setIsMenuHovered] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [showCartButton, setShowCartButton] = useState(false);
  const cartButtonTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [isRestaurantLiked, setIsRestaurantLiked] = useState(false);
  const [reviewSlideIndex, setReviewSlideIndex] = useState(0);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showRetailItemModal, setShowRetailItemModal] = useState(false);
  const [retailSelectedItem, setRetailSelectedItem] = useState<MenuItem | null>(null);
  // Default to Tampa HQ — overwritten by browser geolocation if granted
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({ lat: 27.9766, lng: -82.4563 });
  
    const [activeSection, setActiveSection] = useState('featured');
    const [isMenuFixed, setIsMenuFixed] = useState(false);
    const [deliveryMethod, setDeliveryMethod] = useState('delivery' as 'delivery' | 'pickup');
    // Use deliveryMethod for both mobile and desktop - synced state
           const [pickupInfo, setPickupInfo] = useState({
               address: '',
               walkTime: 0,
               walkDistance: '',
               readyTime: 0
           });
           const [showItemModal, setShowItemModal] = useState(false);
           const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
           const [modalQuantity, setModalQuantity] = useState(1);
           const [selectedRecommendedOption, setSelectedRecommendedOption] = useState<number | null>(1);
           const [selectedMenuItem, setSelectedMenuItem] = useState<string | null>(null);
           const [showSpecialInstructions, setShowSpecialInstructions] = useState(false);
           const [specialInstructions, setSpecialInstructions] = useState('');
           const [menuItemModifiers, setMenuItemModifiers] = useState<any[]>([]);
           const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);
           const reviewsScrollRef = useRef<HTMLDivElement>(null);
           const modalScrollRef = useRef<HTMLDivElement>(null);

    // Reviews scroll functions
    const scrollReviewsLeft = () => {
        if (reviewsScrollRef.current) {
            reviewsScrollRef.current.scrollBy({ left: -320, behavior: 'smooth' });
        }
    };

    const scrollReviewsRight = () => {
        if (reviewsScrollRef.current) {
            reviewsScrollRef.current.scrollBy({ left: 320, behavior: 'smooth' });
        }
    };

    const handleOpenReviewModal = () => {
      setIsReviewModalOpen(true);
    };

    const handleSubmitReview = async () => {
      if (!restaurant) {
        notifications.show({
          title: "Unable to submit review",
          message: "Restaurant details are not loaded yet.",
          color: "red",
        });
        return;
      }

      if (!reviewText.trim()) {
        notifications.show({
          title: "Add a few words",
          message: "Please add a short review before submitting.",
          color: "orange",
        });
        return;
      }

      setSubmittingReview(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase
          .from('restaurant_reviews')
          .insert({
            restaurant_id: restaurant.id,
            rating: reviewRating,
            comment: reviewText.trim(),
            user_id: user?.id ?? null,
          });

        if (error) {
          throw error;
        }

        notifications.show({
          title: "Review submitted",
          message: "Thanks for rating this merchant.",
          color: "green",
        });

        setIsReviewModalOpen(false);
        setReviewText('');
        setReviewRating(5);
      } catch (error: any) {
        console.error('Error submitting review', error);
        notifications.show({
          title: "Error submitting review",
          message: "We couldn't save your review. Please try again in a moment.",
          color: "red",
        });
      } finally {
        setSubmittingReview(false);
      }
    };

    // Navigation categories for side menu
    const navCategories = [
        { id: 'all', label: 'All', icon: IconHome, active: activeCategory === 'all' },
        { id: 'grocery', label: 'Grocery', icon: IconApple, active: activeCategory === 'grocery' },
        { id: 'convenience', label: 'Quick Stops', icon: IconCoffee, active: activeCategory === 'convenience' },
        { id: 'dashmart', label: "Craven'Z", icon: IconBuildingStore, active: activeCategory === 'dashmart' },
        { id: 'beauty', label: 'Cosmetics', icon: IconHeart, active: activeCategory === 'beauty' },
        { id: 'pets', label: 'Animals', icon: IconPaw, active: activeCategory === 'pets' },
        { id: 'health', label: 'Self Care', icon: IconPill, active: activeCategory === 'health' },
        { id: 'browse', label: 'Browse All', icon: IconSearch, active: activeCategory === 'browse' },
        { id: 'orders', label: 'Orders', icon: IconReceipt, active: activeCategory === 'orders' },
        { id: 'account', label: 'Account', icon: IconUser, active: activeCategory === 'account' }
    ];

    // Helper functions for header functionality
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
                    `access_token=${mapboxToken}&country=US&autocomplete=true&types=address,poi&limit=5`
            );
            const mapboxJson = await mapboxResp.json();
            let suggestions: string[] = Array.isArray(mapboxJson?.features)
                ? mapboxJson.features.map((feature: any) => feature.place_name).filter(Boolean)
                : [];

            if (!suggestions.length) {
                const nominatimResp = await fetch(
                    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`
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

    const selectAddress = (address: string) => {
        setLocation(address);
        setShowAddressSelector(false);
        notifications.show({
            title: "Location Updated",
            message: `Delivery address set to ${address}`,
            color: "green",
        });
    };

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

    const handleCategoryClick = (categoryId: string) => {
        setActiveCategory(categoryId);
        
        if (categoryId === 'orders') {
            navigate('/customer-dashboard?tab=orders');
            return;
        } else if (categoryId === 'account') {
            navigate('/customer-dashboard?tab=account');
            return;
        }
        
        // For restaurant categories, navigate back to restaurants page
        if (['all', 'browse', 'grocery', 'convenience', 'dashmart', 'beauty', 'pets', 'health'].includes(categoryId)) {
            navigate('/restaurants');
        }
    };

    const toggleMenuCompression = () => {
        setIsMenuCompressed(!isMenuCompressed);
    };

    // Fetch all data
  useEffect(() => {
    if (id) {
      fetchRestaurantData();
    }
    fetchNotifications();
    
    // Auto-hide side menu when entering restaurant page
    setIsMenuCompressed(true);
  }, [id]);

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

  // Hide bottom navigation when item modal is open
  useEffect(() => {
    if (showItemModal) {
      document.body.classList.add('item-modal-open');
    } else {
      document.body.classList.remove('item-modal-open');
    }
    return () => {
      document.body.classList.remove('item-modal-open');
    };
  }, [showItemModal]);

  // Cleanup cart button timer on unmount
  useEffect(() => {
    return () => {
      if (cartButtonTimerRef.current) {
        clearTimeout(cartButtonTimerRef.current);
      }
    };
  }, []);

  // Get user's current location for distance display
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => { /* silently fail */ }
      );
    }
  }, []);

  // Haversine distance in miles between two coordinates
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

  // Format distance string for display
  const formatDistanceMi = (rLat?: number | null, rLng?: number | null): string => {
    if (!userLocation || !rLat || !rLng) return '';
    const d = calcDistanceMiles(userLocation.lat, userLocation.lng, rLat, rLng);
    if (d < 0.1) return `${Math.round(d * 5280)} ft`;
    return `${d.toFixed(1)} mi`;
  };

    // Calculate walking distance and time based on user's location with pin-point precision
    const calculateWalkingDistance = (userLat: number, userLng: number, restaurantLat: number, restaurantLng: number): { time: number; distance: string } => {
        // Haversine formula to calculate distance in miles with high precision
        const R = 3959; // Earth's radius in miles
        const dLat = (restaurantLat - userLat) * Math.PI / 180;
        const dLng = (restaurantLng - userLng) * Math.PI / 180;
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(userLat * Math.PI / 180) * Math.cos(restaurantLat * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceMiles = R * c;
        
        // Convert to feet for precise measurements
        const distanceFeet = distanceMiles * 5280;
        const distanceYards = distanceFeet / 3;
        
        // Format distance string with precision
        let distanceStr: string;
        if (distanceFeet < 10) {
            // Less than 10 feet - show in feet with 1 decimal
            distanceStr = `${distanceFeet.toFixed(1)} ft`;
        } else if (distanceFeet < 528) { // Less than 0.1 miles (528 feet)
            // Show in feet for very close distances
            distanceStr = `${Math.round(distanceFeet)} ft`;
        } else if (distanceMiles < 0.1) { // Less than 0.1 miles
            // Show in yards for close distances
            distanceStr = `${Math.round(distanceYards)} yd`;
        } else if (distanceMiles < 1) {
            // Show in miles with 2 decimal places for short distances
            distanceStr = `${distanceMiles.toFixed(2)} mi`;
        } else {
            // Show in miles with 1 decimal place for longer distances
            distanceStr = `${distanceMiles.toFixed(1)} mi`;
        }
        
        // Calculate walking time
        // Average walking speed: 3 mph = 0.05 miles per minute = 264 feet per minute
        const walkingSpeedMph = 3; // miles per hour
        const walkingSpeedMpm = walkingSpeedMph / 60; // miles per minute
        const walkingTimeMinutes = distanceMiles / walkingSpeedMpm;
        
        // Round to nearest minute, minimum 1 minute
        const roundedTime = Math.max(1, Math.round(walkingTimeMinutes));
        
        return {
            time: roundedTime,
            distance: distanceStr
        };
    };

    // Set pickup info when restaurant data is loaded
  useEffect(() => {
        if (restaurant && deliveryMethod === 'pickup' && restaurant.latitude && restaurant.longitude) {
            // Try to get user's current location with high accuracy
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const userLat = position.coords.latitude;
                        const userLng = position.coords.longitude;
                        const accuracy = position.coords.accuracy; // Accuracy in meters
                        const walkingInfo = calculateWalkingDistance(
                            userLat,
                            userLng,
                            restaurant.latitude!,
                            restaurant.longitude!
                        );
                        
                        console.log('Walking distance calculation:', {
                            userLat: userLat.toFixed(8),
                            userLng: userLng.toFixed(8),
                            restaurantLat: restaurant.latitude!.toFixed(8),
                            restaurantLng: restaurant.longitude!.toFixed(8),
                            accuracy: `${accuracy}m`,
                            walkTime: walkingInfo.time,
                            walkDistance: walkingInfo.distance
                        });
                        
            setPickupInfo({
                address: restaurant.address,
                            walkTime: walkingInfo.time,
                            walkDistance: walkingInfo.distance,
                readyTime: restaurant.min_delivery_time || 15
            });
                    },
                    (error) => {
                        // If geolocation fails, default to minimal values
                        console.error('Error getting location:', error);
                        setPickupInfo({
                            address: restaurant.address,
                            walkTime: 1,
                            walkDistance: '0 ft',
                            readyTime: restaurant.min_delivery_time || 15
                        });
                    },
                    {
                        enableHighAccuracy: true, // Use GPS if available for maximum precision
                        timeout: 15000, // Increased timeout for high accuracy
                        maximumAge: 0 // Don't use cached location, get fresh one
                    }
                );
            } else {
                // Browser doesn't support geolocation, default to minimal values
                setPickupInfo({
                    address: restaurant.address,
                    walkTime: 1,
                    walkDistance: '0 ft',
                    readyTime: restaurant.min_delivery_time || 15
                });
            }
        }
    }, [restaurant, deliveryMethod]);

  const fetchRestaurantData = async () => {
    try {
      setLoading(true);
      
            // Fetch restaurant details
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', id)
        .single();

      if (restaurantError) throw restaurantError;
      setRestaurant(restaurantData);

            // Fetch menu categories
      const { data: categoriesData } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('restaurant_id', id)
        .order('display_order');

            setCategories(categoriesData || []);

            // Fetch menu items
      const { data: menuData } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', id)
        .eq('is_available', true);

      // Fetch favorites count for all menu items at once
      const menuItemIds = (menuData || []).map((item: any) => item.id);
      let favoritesCountMap: Record<string, number> = {};
      
      if (menuItemIds.length > 0) {
        const { data: favoritesData } = await supabase
          .from('menu_item_favorites')
          .select('menu_item_id')
          .in('menu_item_id', menuItemIds);
        
        // Count favorites per menu item
        favoritesCountMap = (favoritesData || []).reduce((acc: Record<string, number>, fav: any) => {
          acc[fav.menu_item_id] = (acc[fav.menu_item_id] || 0) + 1;
          return acc;
        }, {});
      }

      setMenuItems(
        (menuData || []).map((item: any) => ({
          ...item,
          spice_level: item.spice_level !== undefined && item.spice_level !== null
            ? Number(item.spice_level)
            : undefined,
          favorites_count: favoritesCountMap[item.id] || 0
        }))
      );
      
            // Fetch active promo codes (you might want to filter by restaurant if needed)
            const { data: promosData } = await supabase
                .from('promo_codes')
                .select('*')
                .eq('is_active', true)
                .gte('valid_until', new Date().toISOString())
                .limit(3);

            setPromos(promosData || []);

    } catch (error: any) {
      console.error('Error fetching restaurant data:', error);
      notifications.show({
        title: "Error",
        message: "Failed to load restaurant details",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  // Check if restaurant is liked
  useEffect(() => {
    const checkIfLiked = async () => {
      if (!restaurant || !id) return;
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from('customer_favorites')
          .select('id')
          .eq('customer_id', user.id)
          .eq('restaurant_id', restaurant.id)
          .single();

        setIsRestaurantLiked(!!data);
      } catch (error) {
        // Not liked or error - set to false
        setIsRestaurantLiked(false);
      }
    };

    if (restaurant) {
      checkIfLiked();
    }
  }, [restaurant, id]);

    // Scroll observer for active section highlighting
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && entry.boundingClientRect.top < 250) {
                    setActiveSection(entry.target.id);
                }
            });
        }, {
            rootMargin: '-100px 0px -50% 0px',
            threshold: 0.1
        });

        const sections = [
            'featured',
            'featured-mobile',
            'most-ordered',
            'reviews',
            'reviews-mobile',
            'frequently-ordered',
            'frequently-ordered-mobile',
            ...categories.map(c => c.id),
            ...categories.map(c => `${c.id}-mobile`)
        ];
        sections.forEach(sectionId => {
            const el = document.getElementById(sectionId);
            if (el) observer.observe(el);
        });

        return () => {
            sections.forEach(sectionId => {
                const el = document.getElementById(sectionId);
                if (el) observer.unobserve(el);
            });
        };
    }, [categories]);

    // Fixed sidebar on scroll
    useEffect(() => {
        const handleScroll = () => {
            if (tabsRef.current) {
                const rightColumn = document.querySelector('.lg\\:col-span-9');
                if (rightColumn) {
                    setIsMenuFixed(window.scrollY > (rightColumn.getBoundingClientRect().top + window.scrollY - 100));
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = useCallback((sectionId: string) => {
        // Try to find the section by ID (desktop) or ID-mobile (mobile)
        let section = document.getElementById(sectionId);
        if (!section) {
            // Try mobile version
            section = document.getElementById(`${sectionId}-mobile`);
        }
        if (!section) {
            // Try desktop version if we were looking for mobile
            if (sectionId.endsWith('-mobile')) {
                section = document.getElementById(sectionId.replace('-mobile', ''));
            }
        }
        
        if (section) {
            const sticky = mobileStickyNavRef.current ?? tabsRef.current;
            const stickyH = sticky?.offsetHeight ?? 0;
            const safeTop = typeof window !== 'undefined'
              ? parseFloat(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-top)')) || 0
              : 0;
            const offset = stickyH + 12 + safeTop + 56;
            const elementPosition = section.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;

            window.scrollTo({
                top: Math.max(0, offsetPosition),
                behavior: 'smooth'
            });
        }
    }, []);

           // Cart functions
           const addToCart = useCallback(async (item: MenuItem) => {
    if (!restaurant?.id) {
      notifications.show({
        title: "Error",
        message: "Restaurant information not loaded",
        color: "red",
      });
      return;
    }

    const cartItem = {
      id: item.id,
      name: item.name,
      price_cents: item.price_cents,
      quantity: 1,
      modifiers: [],
      special_instructions: undefined,
      restaurant_id: restaurant.id,
      image_url: item.image_url,
    };

    await addToCartContext(cartItem, restaurant.id);
    
    // Show cart button and set timer to hide after 3 seconds
    setShowCartButton(true);
    if (cartButtonTimerRef.current) {
      clearTimeout(cartButtonTimerRef.current);
    }
    cartButtonTimerRef.current = setTimeout(() => {
      setShowCartButton(false);
    }, 3000);
  }, [restaurant?.id, addToCartContext]);

            const openItemModal = useCallback(async (item: MenuItem) => {
                if (isRetailStore(restaurant)) {
                    setRetailSelectedItem(item);
                    setShowRetailItemModal(true);
                } else {
                    setSelectedItem(item);
                    setShowItemModal(true);
                    setModalQuantity(1);
                    setSelectedRecommendedOption(1);
                    setSelectedMenuItem(null);
                    setSelectedModifiers([]);
                    // Fetch modifiers for this menu item
                    try {
                        const { data, error } = await supabase
                            .from('menu_item_modifiers')
                            .select('*')
                            .eq('menu_item_id', item.id)
                            .eq('is_available', true)
                            .order('display_order', { ascending: true });
                        if (!error && data) {
                            setMenuItemModifiers(data);
                        } else {
                            setMenuItemModifiers([]);
                        }
                    } catch (err) {
                        console.error('Error fetching modifiers:', err);
                        setMenuItemModifiers([]);
                    }
                }
            }, [restaurant]);

           const closeItemModal = useCallback(() => {
               setShowItemModal(false);
               setSelectedItem(null);
               setModalQuantity(1);
               setSelectedRecommendedOption(1);
               setSelectedMenuItem(null);
               setShowSpecialInstructions(false);
               setSpecialInstructions('');
               setMenuItemModifiers([]);
               setSelectedModifiers([]);
           }, []);

           const addToCartFromModal = useCallback(async () => {
               if (selectedItem && restaurant?.id) {
                   // Get selected modifier details
                   const selectedModifierDetails = selectedModifiers.map(modifierId => {
                       const modifier = menuItemModifiers.find(m => m.id === modifierId);
                       return modifier ? {
                           id: modifier.id,
                           name: modifier.name,
                           price_cents: modifier.price_cents,
                           modifier_type: modifier.modifier_type,
                       } : null;
                   }).filter(Boolean);

                   const cartItem = {
                       id: selectedItem.id,
                       name: selectedItem.name,
                       price_cents: selectedItem.price_cents,
                       quantity: modalQuantity,
                       modifiers: selectedModifierDetails,
                       special_instructions: specialInstructions || undefined,
                       restaurant_id: restaurant.id,
                   };

                   await addToCartContext(cartItem, restaurant.id);
                   
                   // Show cart button and set timer to hide after 3 seconds
                   setShowCartButton(true);
                   if (cartButtonTimerRef.current) {
                     clearTimeout(cartButtonTimerRef.current);
                   }
                   cartButtonTimerRef.current = setTimeout(() => {
                     setShowCartButton(false);
                   }, 3000);
                   
                   closeItemModal();
               }
           }, [selectedItem, modalQuantity, restaurant?.id, addToCartContext, closeItemModal]);

  const removeFromCart = useCallback((itemId: string) => {
    removeFromCartContext(itemId);
  }, [removeFromCartContext]);

  const updateCartQuantity = useCallback((itemId: string, quantity: number) => {
    // This function is kept for compatibility but cart management is handled by CartContext
    // The actual update should be done through CartContext's updateCartItem
  }, []);

    // Get items by category or filter
    // Featured Items: Sort by favorites_count (most liked) and take top 10
    const featuredItems = menuItems
        .sort((a, b) => (b.favorites_count || 0) - (a.favorites_count || 0))
        .slice(0, 10);
    const mostOrderedItems = menuItems
        .filter(item => item.order_count && item.order_count > 0)
        .sort((a, b) => (b.order_count || 0) - (a.order_count || 0))
        .slice(0, 8);
    
    // Frequently Ordered: Use mostOrderedItems if available, otherwise use first 8 menu items
    const frequentlyOrderedItems = mostOrderedItems.length > 0 
        ? mostOrderedItems 
        : menuItems.slice(0, 8);

    // Filter menu items based on search query
    const filteredMenuItems = searchQuery.trim() 
        ? menuItems.filter(item => 
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description?.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : menuItems;

    const getItemsByCategory = (categoryId: string) => {
        const items = searchQuery.trim() ? filteredMenuItems : menuItems;
        return items.filter(item => item.category_id === categoryId);
    };

    const formatPrice = (cents: number) => {
        return `$${(cents / 100).toFixed(2)}`;
    };

    // Detect retail vs food
    const isRetail = isRetailStore(restaurant);

    // Sidebar links
    const sidebarLinks = [
        { id: 'featured', label: isRetail ? 'Top Picks' : 'Featured Items', href: '#featured' },
        { id: 'most-ordered', label: isRetail ? 'Best Sellers' : 'Most Ordered', href: '#most-ordered' },
        { id: 'frequently-ordered', label: isRetail ? 'Popular Products' : 'Frequently Ordered', href: '#frequently-ordered' },
        ...categories.map(cat => ({
            id: cat.id,
            label: cat.name,
            href: `#${cat.id}`
        }))
    ];

    const activeNavKey = useMemo(() => activeSection.replace(/-mobile$/, ''), [activeSection]);

    const mobileChipActive = (logicalId: string) => {
      if (isSearchMode) return logicalId === 'search';
      if (logicalId === 'most-ordered' || logicalId === 'frequently-ordered') {
        return activeNavKey === 'frequently-ordered' || activeNavKey === 'most-ordered';
      }
      return activeNavKey === logicalId;
    };

    // --- UI Components ---

    const MenuItemCard = ({ item }: { item: MenuItem }) => {
        const rating = item.order_count ? Math.min(95, 75 + Math.floor(item.order_count / 10)) : 85;
        const reviews = item.order_count || Math.floor(Math.random() * 200) + 50;

        // --- Retail Product Card ---
        if (isRetail) {
            const hasDiscount = item.compare_at_price_cents && item.compare_at_price_cents > item.price_cents;
            return (
                <Box
                    style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden', backgroundColor: 'white', borderRadius: 8, border: '1px solid var(--mantine-color-gray-2)' }}
                    onClick={() => openItemModal(item)}
                >
                    <Box style={{ height: '160px', overflow: 'hidden', backgroundColor: '#f8f8f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MantineImage
                            src={item.image_url || 'https://placehold.co/200x200/f5f5f5/999?text=Product'}
                            alt={item.name}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            onError={(e) => { e.currentTarget.src = "https://placehold.co/200x200/f5f5f5/999?text=Product"; }}
                        />
                        {hasDiscount && (
                            <Badge
                                color="red"
                                variant="filled"
                                size="sm"
                                style={{ position: 'absolute', top: 8, left: 8 }}
                            >
                                SALE
                            </Badge>
                        )}
                        {item.has_variants && (
                            <Badge
                                color="gray"
                                variant="light"
                                size="xs"
                                style={{ position: 'absolute', top: 8, right: 8 }}
                            >
                                Options
                            </Badge>
                        )}
                    </Box>

                    <Stack gap={4} p="sm">
                        {item.brand && (
                            <Text size="xs" c="dimmed" fw={600} tt="uppercase" lineClamp={1}>
                                {item.brand}
                            </Text>
                        )}
                        <Text size="sm" fw={700} lineClamp={2} style={{ lineHeight: '1.3' }}>{item.name}</Text>
                        <Group gap={6}>
                            <Text size="sm" fw={700} c={hasDiscount ? 'red.7' : 'dark'}>
                                {formatPrice(item.price_cents)}
                            </Text>
                            {hasDiscount && (
                                <Text size="xs" c="dimmed" td="line-through">
                                    {formatPrice(item.compare_at_price_cents!)}
                                </Text>
                            )}
                        </Group>
                        {item.tags && item.tags.length > 0 && (
                            <Group gap={4}>
                                {item.tags.slice(0, 2).map((tag) => (
                                    <Badge key={tag} variant="light" color="gray" size="xs" radius="sm">
                                        {tag}
                                    </Badge>
                                ))}
                            </Group>
                        )}
                    </Stack>
                </Box>
            );
        }

        // --- Food Item Card (original) ---
        return (
            <Box
                style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden', backgroundColor: 'white' }}
                onClick={() => openItemModal(item)}
            >
                <Box style={{ height: '128px', overflow: 'hidden' }}>
                    <MantineImage
                        src={item.image_url || 'https://placehold.co/100x100/CCCCCC/666666?text=Item'}
                        alt={item.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        fit="cover"
                        onError={(e) => { e.currentTarget.src = "https://placehold.co/100x100/CCCCCC/666666?text=Item"; }}
                    />
                </Box>

                <Stack gap="xs" p="sm">
                    <Text size="sm" fw={800} lineClamp={2} style={{ lineHeight: '1.3' }}>{item.name}</Text>
                    <Stack gap={0}>
                        <Text size="sm" fw={600} c="gray.7">{formatPrice(item.price_cents)}</Text>
                        <Text size="xs" c="dimmed">{rating}% ({reviews})</Text>
                    </Stack>
                </Stack>

                <ActionIcon
                    onClick={(e) => {
                        e.stopPropagation();
                        openItemModal(item);
                    }}
                    color="orange"
                    variant="filled"
                    style={{ position: 'absolute', bottom: 8, right: 8 }}
                    size="sm"
                >
                    <IconPlus size={14} />
                </ActionIcon>
            </Box>
        );
    };

    const PickupInterface = () => {
        const mapContainer = useRef<HTMLDivElement>(null);
        const map = useRef<any>(null);
        const [mapLoaded, setMapLoaded] = useState(false);

        useEffect(() => {
            if (deliveryMethod === 'pickup' && restaurant && mapContainer.current && !map.current) {
                initializePickupMap();
            }

            // Cleanup function to remove map when component unmounts or dependencies change
            return () => {
                if (map.current) {
                    map.current.remove();
                    map.current = null;
                    setMapLoaded(false);
                }
            };
        }, [deliveryMethod, restaurant]);

        const initializePickupMap = async () => {
            if (!mapContainer.current) {
                console.log('Map container not found');
                return;
            }
            
            // Don't create a new map if one already exists
            if (map.current) {
                return;
            }
            
            if (!restaurant.latitude || !restaurant.longitude) {
                console.log('Restaurant missing coordinates:', { 
                    latitude: restaurant.latitude, 
                    longitude: restaurant.longitude 
                });
                return;
            }

            try {
                // Load Mapbox script if not already loaded
                if (!window.mapboxgl) {
                    const script = document.createElement('script');
                    script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js';
                    script.onload = () => {
                        (window.mapboxgl as any).accessToken = 'pk.eyJ1IjoiY3JhdmUtbiIsImEiOiJjbWVxb21qbTQyNTRnMm1vaHg5bDZwcmw2In0.aOsYrL2B0cjfcCGW1jHAdw';
                        createMap();
                    };
                    script.onerror = () => {
                        console.error('Failed to load Mapbox script');
                    };
                    document.head.appendChild(script);
                } else {
                    (window.mapboxgl as any).accessToken = 'pk.eyJ1IjoiY3JhdmUtbiIsImEiOiJjbWVxb21qbTQyNTRnMm1vaHg5bDZwcmw2In0.aOsYrL2B0cjfcCGW1jHAdw';
                    createMap();
                }
            } catch (error) {
                console.error('Error initializing pickup map:', error);
            }
        };

        const createMap = () => {
            if (!mapContainer.current || !window.mapboxgl || map.current) {
                // Map already exists or container not ready
                return;
            }

            // Clear any existing content in the container
            if (mapContainer.current) {
                mapContainer.current.innerHTML = '';
            }

            map.current = new window.mapboxgl.Map({
                container: mapContainer.current,
                style: 'mapbox://styles/mapbox/light-v11',
                center: [restaurant.longitude, restaurant.latitude],
                zoom: 15,
                interactive: true
            });

            // Add restaurant marker
            new window.mapboxgl.Marker({ color: '#dc2626' })
                .setLngLat([restaurant.longitude, restaurant.latitude])
                .addTo(map.current);

            map.current.on('load', () => {
                setMapLoaded(true);
            });

            map.current.on('error', (e) => {
                console.error('Mapbox error:', e);
            });
        };

        return (
            <Box mb="lg">
                <Stack gap="xs">
                    {/* Pickup Time Info */}
                    <Group justify="space-between" align="center" gap="sm">
                        <Group gap="xs" align="center">
                            <Text size="md" fw={700} c="gray.9">{pickupInfo.readyTime} min</Text>
                            <Text size="xs" c="dimmed">ready for pickup</Text>
                        </Group>
                        <Badge color="green" size="sm">$0 DELIVERY FEE</Badge>
                    </Group>
                    
                    {/* Main Content - Address and Map */}
                    <Group align="stretch" gap="sm">
                        {/* Address and Info - Left Side */}
                        <Stack gap={2} style={{ minWidth: '180px', flex: 1 }}>
                            <Text size="xs" fw={500} c="gray.9">
                                    Pick up this order at:
                                </Text>
                            <Text size="xs" c="blue.6" td="underline" style={{ cursor: 'pointer' }}>
                                    {pickupInfo.address || restaurant.address}
                                </Text>
                            <Group gap={4} align="center">
                                <IconNavigation size={12} style={{ color: 'var(--mantine-color-gray-6)' }} />
                                <Text size="xs" c="dimmed">{pickupInfo.walkDistance} • {pickupInfo.walkTime} min walk</Text>
                                </Group>
                        </Stack>

                        {/* Map Container - Right Side */}
                        <Box style={{ flex: 1, height: '120px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--mantine-color-gray-3)', backgroundColor: '#f5f5f5' }}>
                            {restaurant.latitude && restaurant.longitude ? (
                                <Box 
                                    ref={mapContainer} 
                                    style={{ width: '100%', height: '100%', minHeight: '120px' }}
                                />
                            ) : (
                                <Stack align="center" justify="center" h="100%" gap={2}>
                                    <IconMapPin size={20} style={{ color: 'var(--mantine-color-gray-5)' }} />
                                    <Text size="xs" c="dimmed">Map unavailable</Text>
                                    <Text size="xs" c="dimmed" lineClamp={1}>{restaurant.address}</Text>
                                </Stack>
                            )}
                        </Box>
                    </Group>
                </Stack>
            </Box>
        );
    };

    const TripleDipperModal = () => {
        if (!showItemModal || !selectedItem) return null;

        // Calculate total price including modifiers
        const modifierTotal = selectedModifiers.reduce((sum, modifierId) => {
            const modifier = menuItemModifiers.find(m => m.id === modifierId);
            return sum + (modifier?.price_cents || 0);
        }, 0);
        const totalPrice = ((selectedItem.price_cents + modifierTotal) * modalQuantity) / 100;

        // Group modifiers by modifier_type
        const modifiersByType = menuItemModifiers.reduce((acc, modifier) => {
            const type = modifier.modifier_type || 'addon';
            if (!acc[type]) acc[type] = [];
            acc[type].push(modifier);
            return acc;
        }, {} as Record<string, any[]>);

        // Sort modifier entries: required first, then by type priority
        const typeOrder = ['size', 'preparation', 'side', 'addon', 'beverage', 'dessert', 'app', 'removal', 'substitution'];
        const sortedModifierEntries = Object.entries(modifiersByType).sort(([typeA, modsA], [typeB, modsB]) => {
            const aRequired = (modsA as any[])[0]?.is_required ? 0 : 1;
            const bRequired = (modsB as any[])[0]?.is_required ? 0 : 1;
            if (aRequired !== bRequired) return aRequired - bRequired;
            return (typeOrder.indexOf(typeA) === -1 ? 99 : typeOrder.indexOf(typeA)) - (typeOrder.indexOf(typeB) === -1 ? 99 : typeOrder.indexOf(typeB));
        });

        // Collect dietary/ingredient tags
        const ingredientTags: string[] = [];
        if (selectedItem.is_vegetarian) ingredientTags.push('Vegetarian');
        if (selectedItem.is_vegan) ingredientTags.push('Vegan');
        if (selectedItem.is_gluten_free) ingredientTags.push('Gluten Free');

        return (
            <Modal
                opened={showItemModal}
                onClose={closeItemModal}
                fullScreen
                withCloseButton={false}
                styles={{
                    body: { padding: 0, height: '100%' },
                    header: { display: 'none' },
                    content: { height: '100%', maxHeight: '100%' },
                }}
            >
                <Box style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#fafafa', position: 'relative' }}>
                    {/* Top Bar: Back + Favorite */}
                    <Box style={{ 
                        position: 'fixed', top: 0, left: 0, right: 0, 
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '16px 16px 0', zIndex: 10001 
                    }}>
                        <ActionIcon
                            variant="subtle"
                            color="gray"
                            onClick={closeItemModal}
                            size="lg"
                            radius="xl"
                            style={{ backgroundColor: 'rgba(255,255,255,0.85)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                        >
                            <IconChevronLeft size={22} />
                        </ActionIcon>
                        <ActionIcon
                            variant="subtle"
                            color="red"
                            size="lg"
                            radius="xl"
                            style={{ backgroundColor: 'rgba(255,255,255,0.85)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                            onClick={() => {
                                if (navigator.share) {
                                    navigator.share({ title: selectedItem.name, text: selectedItem.description || '' });
                                }
                            }}
                        >
                            <IconHeart size={22} style={{ color: '#ef4444' }} />
                        </ActionIcon>
                    </Box>

                    {/* Scrollable Content */}
                    <ScrollArea style={{ flex: 1 }} ref={modalScrollRef}>
                        <Box pb="140px">
                            {/* Item Name + Large Price Row */}
                            <Box px="lg" pt="72px" pb="xs">
                                <Title order={2} fw={700} style={{ fontSize: '26px', lineHeight: 1.2, color: '#1a1a2e', fontStyle: 'italic' }}>
                                    {selectedItem.name}
                                </Title>
                                {selectedItem.description && (
                                    <Text size="sm" c="dimmed" mt="xs" style={{ lineHeight: 1.6 }}>
                                        {selectedItem.description}
                                    </Text>
                                )}
                            </Box>

                            {/* Price + Quantity Side-by-Side */}
                            <Box px="lg" pb="md">
                                <Group justify="space-between" align="flex-start">
                                    <Text fw={800} style={{ fontSize: '32px', color: '#ef4444' }}>
                                        ${(selectedItem.price_cents / 100).toFixed(2)}
                                    </Text>
                                    {/* Framed Quantity Selector */}
                                    <Box style={{
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '12px',
                                        padding: '4px 0',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '2px',
                                        backgroundColor: 'white',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                                        minWidth: '44px',
                                    }}>
                                        <ActionIcon
                                            variant="subtle"
                                            color="gray"
                                            size="sm"
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                const scrollContainer = modalScrollRef.current?.querySelector('.mantine-ScrollArea-viewport') as HTMLElement;
                                                const scrollPosition = scrollContainer?.scrollTop || 0;
                                                setModalQuantity((prev) => prev + 1);
                                                requestAnimationFrame(() => { if (scrollContainer) scrollContainer.scrollTop = scrollPosition; });
                                            }}
                                        >
                                            <IconPlus size={16} />
                                        </ActionIcon>
                                        <Text fw={700} size="lg" style={{ lineHeight: 1 }}>{modalQuantity}</Text>
                                        <ActionIcon
                                            variant="subtle"
                                            color="gray"
                                            size="sm"
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                const scrollContainer = modalScrollRef.current?.querySelector('.mantine-ScrollArea-viewport') as HTMLElement;
                                                const scrollPosition = scrollContainer?.scrollTop || 0;
                                                setModalQuantity((prev) => Math.max(1, prev - 1));
                                                requestAnimationFrame(() => { if (scrollContainer) scrollContainer.scrollTop = scrollPosition; });
                                            }}
                                        >
                                            <IconMinus size={16} />
                                        </ActionIcon>
                                    </Box>
                                </Group>
                            </Box>

                            {/* Food Image - Centered Plate Style */}
                            <Box style={{ display: 'flex', justifyContent: 'center', padding: '8px 24px 16px' }}>
                                <Box style={{
                                    width: '260px', height: '260px',
                                    borderRadius: '50%',
                                    overflow: 'hidden',
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                                    border: '6px solid white',
                                }}>
                                    <MantineImage
                                        src={selectedItem.image_url || 'https://placehold.co/300x300/CCCCCC/666666?text=Item'}
                                        alt={selectedItem.name}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        fit="cover"
                                    />
                                </Box>
                            </Box>

                            {/* Ingredient / Dietary Tags */}
                            {ingredientTags.length > 0 && (
                                <Group justify="center" gap="sm" px="lg" pb="md">
                                    {ingredientTags.map((tag) => (
                                        <Group key={tag} gap={4} align="center">
                                            <Box style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#1a1a2e' }} />
                                            <Text size="xs" c="gray.7" fw={500}>{tag}</Text>
                                        </Group>
                                    ))}
                                </Group>
                            )}

                            {/* Add-ons / Customization as Chips */}
                            {sortedModifierEntries.length > 0 && (
                                <Box px="lg" pb="md">
                                    {sortedModifierEntries.map(([type, modifiers]) => {
                                        const typeDisplayNames: Record<string, string> = {
                                            'side': 'Add Extra Side',
                                            'addon': 'Add Extra Topping',
                                            'beverage': 'Add a Drink',
                                            'dessert': 'Add Dessert',
                                            'app': 'Add Appetizer',
                                            'size': 'Choose Size',
                                            'preparation': 'Preparation',
                                            'removal': 'Remove Items',
                                            'substitution': 'Substitutions',
                                        };
                                        const displayName = typeDisplayNames[type] || type.charAt(0).toUpperCase() + type.slice(1);
                                        const isRequired = (modifiers as any[])[0]?.is_required || false;
                                        const maxSelect = (modifiers as any[])[0]?.max_selections || 999;
                                        const selectedCount = selectedModifiers.filter(id =>
                                            (modifiers as any[]).some(m => m.id === id)
                                        ).length;

                                        return (
                                            <Box key={type} mb="md">
                                                <Text size="lg" fw={700} mb="xs" style={{ color: '#1a1a2e' }}>{displayName}</Text>
                                                {isRequired && (
                                                    <Text size="xs" c="dimmed" mb="xs">Required • Select up to {maxSelect === 999 ? 'any' : maxSelect}</Text>
                                                )}
                                                <Group gap="sm">
                                                    {(modifiers as any[]).map((modifier) => {
                                                        const isSelected = selectedModifiers.includes(modifier.id);
                                                        const canSelect = !isSelected && (maxSelect === 999 || selectedCount < maxSelect);
                                                        return (
                                                            <Button
                                                                key={modifier.id}
                                                                variant={isSelected ? 'filled' : 'outline'}
                                                                color={isSelected ? 'orange' : 'gray'}
                                                                size="xs"
                                                                radius="xl"
                                                                style={{
                                                                    fontWeight: 500,
                                                                    opacity: canSelect || isSelected ? 1 : 0.5,
                                                                    borderColor: isSelected ? 'var(--mantine-color-orange-6)' : '#d1d5db',
                                                                }}
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    if (isSelected) {
                                                                        setSelectedModifiers(selectedModifiers.filter(id => id !== modifier.id));
                                                                    } else if (canSelect) {
                                                                        setSelectedModifiers([...selectedModifiers, modifier.id]);
                                                                    }
                                                                }}
                                                            >
                                                                {modifier.name}{modifier.price_cents > 0 ? ` +$${(modifier.price_cents / 100).toFixed(2)}` : ''}
                                                            </Button>
                                                        );
                                                    })}
                                                </Group>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            )}

                            {/* Rating + Delivery Time */}
                            <Box px="lg" pb="md">
                                <Group justify="space-between" align="center">
                                    <Group gap="xs">
                                        <Rating value={5} readOnly size="sm" color="orange" />
                                        <Text size="sm" fw={600} c="gray.8">5.0</Text>
                                    </Group>
                                    <Group gap={4}>
                                        <IconClock size={16} style={{ color: '#9ca3af' }} />
                                        <Text size="sm" c="dimmed">
                                            {selectedItem.preparation_time ? `${selectedItem.preparation_time} Min` : '10-15 Min'}
                                        </Text>
                                    </Group>
                                </Group>
                            </Box>

                            {/* Special Instructions */}
                            <Box px="lg" pb="md">
                                <Button
                                    variant="light"
                                    color="gray"
                                    fullWidth
                                    leftSection={<IconMessageCircle size={18} />}
                                    onClick={() => setShowSpecialInstructions(!showSpecialInstructions)}
                                    style={{
                                        backgroundColor: 'white',
                                        border: '1px solid #e5e7eb',
                                    }}
                                >
                                    Special instructions
                                </Button>
                                {showSpecialInstructions && (
                                    <TextInput
                                        mt="sm"
                                        placeholder="E.g. no onions, extra sauce on the side..."
                                        value={specialInstructions}
                                        onChange={(e) => setSpecialInstructions(e.target.value)}
                                    />
                                )}
                            </Box>

                            {/* Stack your order - suggest drinks/desserts */}
                            {(() => {
                                const drinkKeywords = ['drink', 'beverage', 'juice', 'smoothie', 'shake', 'coffee', 'tea', 'soda', 'water'];
                                const dessertKeywords = ['dessert', 'sweet', 'cake', 'cookie', 'ice cream', 'pastry', 'pie'];
                                const stackKeywords = [...drinkKeywords, ...dessertKeywords, 'side', 'appetizer', 'app'];
                                const stackCategoryIds = categories
                                    .filter(cat => stackKeywords.some(kw => cat.name.toLowerCase().includes(kw)))
                                    .map(cat => cat.id);
                                let stackItems = menuItems.filter(item =>
                                    item.id !== selectedItem.id && item.is_available && stackCategoryIds.includes(item.category_id)
                                );
                                if (stackItems.length === 0) {
                                    stackItems = menuItems.filter(item => item.id !== selectedItem.id && item.is_available);
                                }
                                const shuffled = [...stackItems].sort(() => Math.random() - 0.5).slice(0, 6);
                                if (shuffled.length === 0) return null;

                                return (
                                    <Box px="lg" pb="md">
                                        <Group gap="sm" mb="xs">
                                            <IconShoppingCart size={20} style={{ color: 'var(--mantine-color-orange-6)' }} />
                                            <Text size="md" fw={700}>Stack your order</Text>
                                        </Group>
                                        <Text size="sm" c="dimmed" mb="sm">Add a drink or dessert — save on delivery</Text>
                                        <ScrollArea scrollbars="x" type="never">
                                            <Group gap="sm" style={{ flexWrap: 'nowrap' }} pb="xs">
                                                {shuffled.map((item) => (
                                                    <Card
                                                        key={item.id}
                                                        withBorder
                                                        p={0}
                                                        radius="md"
                                                        style={{ minWidth: '140px', maxWidth: '160px', flexShrink: 0, cursor: 'pointer', overflow: 'hidden' }}
                                                        onClick={() => {
                                                            if (restaurant?.id) {
                                                                addToCartContext({
                                                                    id: item.id, name: item.name, price_cents: item.price_cents,
                                                                    quantity: 1, modifiers: [], restaurant_id: restaurant.id,
                                                                }, restaurant.id);
                                                                notifications.show({ title: 'Added to order', message: `${item.name} added`, color: 'green', autoClose: 2000 });
                                                            }
                                                        }}
                                                    >
                                                        <Box style={{ width: '100%', height: '100px', overflow: 'hidden' }}>
                                                            <MantineImage
                                                                src={item.image_url || 'https://placehold.co/160x100/CCCCCC/666666?text=Item'}
                                                                alt={item.name}
                                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                fit="cover"
                                                            />
                                                        </Box>
                                                        <Box p="xs">
                                                            <Text size="xs" fw={600} lineClamp={2} mb="4px">{item.name}</Text>
                                                            <Group justify="space-between" align="center">
                                                                <Text size="xs" fw={700} c="orange">${(item.price_cents / 100).toFixed(2)}</Text>
                                                                <ActionIcon size="xs" variant="light" color="orange" radius="xl">
                                                                    <IconPlus size={12} />
                                                                </ActionIcon>
                                                            </Group>
                                                        </Box>
                                                    </Card>
                                                ))}
                                            </Group>
                                        </ScrollArea>
                                    </Box>
                                );
                            })()}
                        </Box>
                    </ScrollArea>

                    {/* ADD TO CART Button - Fixed at Bottom */}
                    <Box
                        style={{
                            position: 'sticky',
                            bottom: 0, left: 0, right: 0,
                            backgroundColor: 'white',
                            borderTop: '1px solid #e5e7eb',
                            padding: '12px 16px',
                            paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
                            zIndex: 10,
                        }}
                    >
                        <Button
                            fullWidth
                            size="xl"
                            color="red"
                            radius="xl"
                            onClick={addToCartFromModal}
                            style={{
                                height: '56px',
                                fontSize: '18px',
                                fontWeight: 700,
                                backgroundColor: '#ef4444',
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                            }}
                        >
                            ADD TO CART • ${totalPrice.toFixed(2)}
                        </Button>
                    </Box>
                </Box>
            </Modal>
        );
    };

    const DealsSection = () => (
        <Stack gap="md" mb="xl">
            <Title order={2} size="xl" fw={700} c="gray.8">Deals & benefits</Title>

            <ScrollArea scrollbars="x">
                <Group gap="sm" style={{ flexWrap: 'nowrap' }} pb="xs">
                    {promos.map(promo => (
                        <Card
                            key={promo.id}
                            p="md"
                            withBorder
                            shadow="md"
                            style={{
                                minWidth: '240px',
                                maxWidth: '300px',
                                flexShrink: 0,
                                position: 'relative',
                            }}
                        >
                            <Text size="md" fw={700} c="orange.6" mb="xs">{promo.name}</Text>
                            <Text size="sm" c="dimmed">
                                {promo.description || 
                                 (promo.minimum_order_cents ? `Add ${formatPrice(promo.minimum_order_cents)} to apply` : 'Apply at checkout')}
                            </Text>
                            <IconArrowUp
                                size={16}
                                style={{
                                    color: 'var(--mantine-color-orange-6)',
                                    position: 'absolute',
                                    right: 16,
                                    top: '50%',
                                    transform: 'translateY(-50%) rotate(90deg)',
                                }}
                                stroke={3}
                            />
                        </Card>
                    ))}
                    {promos.length === 0 && (
                        <Card
                            p="md"
                            withBorder
                            shadow="md"
                            style={{
                                minWidth: '300px',
                                flexShrink: 0,
                            }}
                        >
                            <Text size="md" fw={700} c="dimmed">No active deals right now</Text>
                            <Text size="sm" c="dimmed">Check back soon for special offers!</Text>
                        </Card>
                    )}
                </Group>
            </ScrollArea>
        </Stack>
    );

  const LeftColumn = () => (
    <Box
      pt="xl"
      className="hidden lg:block"
      style={{
        ...(isMenuFixed ? {
          position: 'fixed',
          top: 4,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '320px',
        } : {})
      }}
    >
      <Stack gap="md">
        {/* Store Info */}
        <Stack gap="xs">
          <Text size="sm" fw={700} c="gray.7">Store Info</Text>
          <Group gap="xs" wrap="nowrap">
            <IconClock size={16} />
            <Text size="sm" fw={600} c={restaurant?.is_open ? 'green.7' : 'orange.6'}>
              {restaurant?.is_open ? 'Open Now' : `Closed • Opens at ${restaurant?.opens_at || '9:00 AM'}`}
            </Text>
          </Group>
          <Group gap="xs" wrap="nowrap">
            <IconStar size={16} style={{ color: 'var(--mantine-color-yellow-5)', fill: 'var(--mantine-color-yellow-5)' }} />
            <Text size="sm" c="dimmed">
              {restaurant?.rating || 4.0} <Text component="span" c="dimmed">({restaurant?.total_reviews || 0}+)</Text>{formatDistanceMi(restaurant?.latitude, restaurant?.longitude) ? ` • ${formatDistanceMi(restaurant?.latitude, restaurant?.longitude)}` : ''}
            </Text>
          </Group>
          <Group gap="xs" wrap="nowrap">
            <IconMapPin size={16} style={{ color: 'var(--mantine-color-red-5)' }} />
            <Text size="sm" c="dimmed">{restaurant?.cuisine_type}</Text>
            {restaurant?.cravemore_eligible && (
              <>
                <Text size="sm" c="dimmed">•</Text>
                <MantineImage
                  src={cravemoreIcon}
                  alt="CraveMore"
                  style={{ width: '16px', height: '16px', objectFit: 'contain' }}
                />
              </>
            )}
          </Group>
          <Group gap="xs" wrap="nowrap">
            <IconTruck size={16} style={{ color: 'var(--mantine-color-green-6)' }} />
            <Text size="sm" c="dimmed">{formatPrice(restaurant?.delivery_fee_cents || 0)} delivery fee</Text>
          </Group>
        </Stack>

        {/* Full Menu Navigation */}
        <Divider />
        <Stack gap="xs" pt="md">
          <Text size="sm" fw={700} c="gray.7" mb="xs">Full Menu</Text>
          <Stack gap="xs">
            {sidebarLinks.map(link => (
              <Button
                key={link.id}
                variant="subtle"
                fullWidth
                justify="flex-start"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection(link.id);
                }}
                style={{
                  backgroundColor: activeNavKey === link.id ? 'var(--mantine-color-orange-0)' : 'transparent',
                  color: activeNavKey === link.id ? 'var(--mantine-color-orange-6)' : 'var(--mantine-color-gray-7)',
                  fontWeight: activeNavKey === link.id ? 600 : 500,
                  borderLeft: activeNavKey === link.id ? '4px solid var(--mantine-color-orange-6)' : 'none',
                  marginLeft: activeNavKey === link.id ? '-8px' : 0,
                  paddingLeft: activeNavKey === link.id ? '12px' : '8px',
                }}
              >
                {link.label}
              </Button>
            ))}
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );

  if (loading) {
    return (
      <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Stack align="center" gap="md">
          <Loader size="lg" color="orange" />
          <Text c="dimmed">Loading restaurant...</Text>
        </Stack>
      </Box>
    );
  }

  if (!restaurant) {
    return (
      <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Stack align="center" gap="md">
          <Text size="xl" c="dimmed">Restaurant not found</Text>
          <Button onClick={() => navigate('/restaurants')} color="orange">
            Back to Restaurants
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box style={{ minHeight: '100vh', backgroundColor: 'white' }}>
      {/* Mobile Header - DoorDash Style — hidden when item modal is open */}
      {!showItemModal && <MobileHeader 
        restaurant={restaurant}
        onBack={() => navigate('/restaurants')}
        onShare={() => {
          if (navigator.share) {
            navigator.share({
              title: restaurant?.name,
              text: `Check out ${restaurant?.name} on Crave'n`,
              url: window.location.href
            });
          }
        }}
        onLike={async () => {
          if (!restaurant || !id) return;
          
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
              notifications.show({
                title: "Login Required",
                message: "Please login to like restaurants",
                color: "orange",
              });
              return;
            }

            if (isRestaurantLiked) {
              // Unlike: Remove from favorites
              const { error } = await supabase
                .from('customer_favorites')
                .delete()
                .eq('customer_id', user.id)
                .eq('restaurant_id', restaurant.id);
              
              if (!error) {
                setIsRestaurantLiked(false);
                notifications.show({
                  title: "Removed from favorites",
                  message: `${restaurant.name} has been removed from your favorites`,
                  color: "gray",
                });
              }
            } else {
              // Like: Add to favorites
              const { error } = await supabase
                .from('customer_favorites')
                .insert({
                  customer_id: user.id,
                  restaurant_id: restaurant.id,
                });
              
              if (!error) {
                setIsRestaurantLiked(true);
                notifications.show({
                  title: "Added to favorites",
                  message: `${restaurant.name} has been added to your favorites`,
                  color: "green",
                });
              }
            }
          } catch (error) {
            console.error('Error toggling like:', error);
          }
        }}
        isLiked={isRestaurantLiked}
      />}

      {/* Desktop Header - Hidden on Mobile */}
      <Box
        className="hidden lg:block"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backgroundColor: 'white',
          borderBottom: '1px solid var(--mantine-color-gray-3)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}
      >
        <Box style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px' }}>
          <Group justify="space-between" align="center" style={{ height: '64px' }}>
            {/* Left: Logo */}
            <Group gap="md">
              <MantineImage src={cravenLogo} alt="CRAVE'N" style={{ height: '40px' }} />
            </Group>

            {/* Center: Search */}
            <Box style={{ flex: 1, maxWidth: '672px', margin: '0 32px' }}>
              <TextInput
                placeholder="Search Crave'n"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftSection={<IconSearch size={20} style={{ color: 'var(--mantine-color-gray-5)' }} />}
                style={{ width: '100%' }}
              />
            </Box>

            {/* Right: Location, Delivery/Pickup, Notifications, Cart */}
            <Group gap="md">
              {/* Location Selector */}
              <Menu
                opened={showAddressSelector}
                onClose={() => setShowAddressSelector(false)}
                position="bottom-start"
                width={320}
              >
                <Menu.Target>
                  <Button
                    variant="subtle"
                    leftSection={<IconMapPin size={16} />}
                    rightSection={<IconChevronLeft size={16} style={{ transform: 'rotate(-90deg)' }} />}
                    onClick={() => setShowAddressSelector(!showAddressSelector)}
                  >
                    <Text size="sm" fw={500} truncate style={{ maxWidth: '128px' }}>{location}</Text>
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Stack gap="sm" p="md">
                    <Title order={5}>Select delivery address</Title>
                    <TextInput
                      placeholder="Search for an address"
                      onChange={(e) => handleAddressSearch(e.target.value)}
                    />
                    {addressSuggestions.length > 0 && (
                      <Stack gap="xs">
                        {addressSuggestions.map((address, index) => (
                          <Button
                            key={index}
                            variant="subtle"
                            fullWidth
                            justify="flex-start"
                            onClick={() => selectAddress(address)}
                            style={{ textAlign: 'left' }}
                          >
                            {address}
                          </Button>
                        ))}
                      </Stack>
                    )}
                    <Divider />
                    <Button variant="subtle" color="orange" size="sm">
                      Add new address
                    </Button>
                  </Stack>
                </Menu.Dropdown>
              </Menu>

              {/* Delivery/Pickup Toggle */}
              <Button.Group>
                <Button
                  variant={deliveryMethod === 'delivery' ? 'filled' : 'subtle'}
                  color={deliveryMethod === 'delivery' ? 'orange' : 'gray'}
                  size="sm"
                  onClick={() => setDeliveryMethod('delivery')}
                >
                  Delivery
                </Button>
                <Button
                  variant={deliveryMethod === 'pickup' ? 'filled' : 'subtle'}
                  color={deliveryMethod === 'pickup' ? 'orange' : 'gray'}
                  size="sm"
                  onClick={() => setDeliveryMethod('pickup')}
                >
                  Pickup
                </Button>
              </Button.Group>

              {/* Notifications */}
              <Menu
                opened={showNotifications}
                onClose={() => setShowNotifications(false)}
                position="bottom-end"
                width={320}
              >
                <Menu.Target>
                  <ActionIcon
                    variant="subtle"
                    onClick={() => setShowNotifications(!showNotifications)}
                    style={{ position: 'relative' }}
                  >
                    <IconBell size={24} style={{ color: 'var(--mantine-color-gray-6)' }} />
                    {notificationsList.filter(n => !n.read).length > 0 && (
                      <Badge
                        size="xs"
                        color="orange"
                        style={{
                          position: 'absolute',
                          top: -4,
                          right: -4,
                          minWidth: '16px',
                          height: '16px',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {notificationsList.filter(n => !n.read).length}
                      </Badge>
                    )}
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Stack gap="md" p="md">
                    <Group justify="space-between">
                      <Title order={5}>Notifications</Title>
                      <Button variant="subtle" color="orange" size="xs">
                        Mark all as read
                      </Button>
                    </Group>
                     <ScrollArea style={{ maxHeight: '256px' }}>
                       <Stack gap="sm">
                         {notificationsList.map((notification) => (
                           <Card
                            key={notification.id}
                            p="sm"
                            withBorder
                            style={{
                              backgroundColor: notification.read ? 'var(--mantine-color-gray-0)' : 'var(--mantine-color-orange-0)',
                              borderColor: notification.read ? 'var(--mantine-color-gray-3)' : 'var(--mantine-color-orange-3)',
                            }}
                          >
                            <Group justify="space-between" align="flex-start">
                              <Stack gap={4} style={{ flex: 1 }}>
                                <Text size="sm" fw={500}>{notification.title}</Text>
                                <Text size="xs" c="dimmed">{notification.message}</Text>
                                <Text size="xs" c="dimmed">{notification.time}</Text>
                              </Stack>
                              {!notification.read && (
                                <Box
                                  style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: 'var(--mantine-color-orange-6)',
                                  }}
                                />
                              )}
                            </Group>
                          </Card>
                        ))}
                      </Stack>
                    </ScrollArea>
                  </Stack>
                </Menu.Dropdown>
              </Menu>

              {/* Cart */}
              <Menu
                opened={showCart}
                onClose={() => setShowCart(false)}
                position="bottom-end"
                width={384}
              >
                <Menu.Target>
                  <ActionIcon
                    variant="subtle"
                    onClick={() => setShowCart(!showCart)}
                    style={{ position: 'relative' }}
                  >
                    <IconShoppingCart size={24} style={{ color: 'var(--mantine-color-gray-6)' }} />
                    {cartItems.length > 0 && (
                      <Badge
                        size="xs"
                        color="orange"
                        style={{
                          position: 'absolute',
                          top: -4,
                          right: -4,
                          minWidth: '16px',
                          height: '16px',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {cartItems.length}
                      </Badge>
                    )}
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Stack gap="md" p="md" style={{ backgroundColor: 'var(--mantine-color-orange-0)' }}>
                    <Group justify="space-between">
                      <Title order={5}>Your Cart</Title>
                      <Button 
                        variant="subtle" 
                        color="orange" 
                        size="xs"
                        onClick={() => clearCart()}
                      >
                        Clear all
                      </Button>
                    </Group>
                    {cartItems.length > 0 ? (
                      <ScrollArea style={{ maxHeight: '320px' }}>
                        <Stack gap="sm">
                          {cartItems.map((item, index) => (
                            <Card key={index} p="sm" withBorder>
                              <Group justify="space-between" align="flex-start">
                                <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                                  <Text size="sm" fw={500} truncate>{item.name}</Text>
                                  <Text size="xs" c="dimmed">${(item.price_cents / 100).toFixed(2)} x {item.quantity}</Text>
                                </Stack>
                                <ActionIcon
                                  variant="subtle"
                                  color="red"
                                  onClick={() => {
                                    removeFromCartContext(item.id);
                                  }}
                                >
                                  <IconX size={16} />
                                </ActionIcon>
                              </Group>
                            </Card>
                          ))}
                          <Divider />
                          <Group justify="space-between" mb="sm">
                            <Text fw={600}>
                              Total: ${(cartItems.reduce((total, item) => total + (item.price_cents * item.quantity), 0) / 100).toFixed(2)}
                            </Text>
                          </Group>
                          <Button
                            fullWidth
                            color="orange"
                            onClick={() => {
                              // Ensure cart has items before navigating
                              if (!cartItems || cartItems.length === 0) {
                                notifications.show({
                                  title: "Cart is Empty",
                                  message: "Please add items to your cart before checking out.",
                                  color: "red",
                                });
                                return;
                              }
                              
                              // Save to localStorage
                              localStorage.setItem('checkout_cart', JSON.stringify(cartItems));
                              localStorage.setItem('checkout_restaurant', JSON.stringify(restaurant));
                              localStorage.setItem('checkout_delivery_method', deliveryMethod);
                              
                              // Verify it was saved
                              const saved = localStorage.getItem('checkout_cart');
                              if (!saved || JSON.parse(saved).length === 0) {
                                console.error('Failed to save cart to localStorage');
                                notifications.show({
                                  title: "Error",
                                  message: "Failed to save cart. Please try again.",
                                  color: "red",
                                });
                                return;
                              }
                              
                              navigate('/checkout');
                            }}
                          >
                            Checkout
                          </Button>
                        </Stack>
                      </ScrollArea>
                    ) : (
                      <Stack align="center" gap="sm" py="xl">
                        <IconShoppingCart size={48} style={{ color: 'var(--mantine-color-gray-4)' }} />
                        <Text size="sm" c="dimmed">Your cart is empty</Text>
                      </Stack>
                    )}
                  </Stack>
                </Menu.Dropdown>
              </Menu>

              {/* Mobile Menu */}
              <ActionIcon
                variant="subtle"
                onClick={() => setShowMobileNav(!showMobileNav)}
                className="block lg:hidden"
              >
                {showMobileNav ? <IconX size={24} /> : <IconMenu2 size={24} />}
              </ActionIcon>
            </Group>
          </Group>
        </Box>
      </Box>

      <Box style={{ position: 'relative' }}>
        {/* Right Side Navigation - Fixed Overlay */}
        <Box
          className="hidden lg:block"
          style={{
            position: 'fixed',
            left: 0,
            top: '64px',
            width: (isMenuCompressed && !isMenuHovered) ? '64px' : '256px',
            backgroundColor: 'var(--mantine-color-gray-0)',
            borderRight: '1px solid var(--mantine-color-gray-3)',
            height: 'calc(100vh - 64px)',
            zIndex: 30,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            transition: 'width 0.3s ease-in-out',
          }}
          onMouseEnter={() => setIsMenuHovered(true)}
          onMouseLeave={() => setIsMenuHovered(false)}
        >
          <Stack gap="md" p="md">
            {/* Hamburger Menu Button */}
            <Button
              variant="subtle"
              fullWidth
              onClick={toggleMenuCompression}
              style={{ justifyContent: 'center' }}
            >
              <IconMenu2 size={20} style={{ color: 'var(--mantine-color-gray-6)' }} />
            </Button>

            {(!isMenuCompressed || isMenuHovered) && (
              <Text size="sm" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.05em' }}>
                Browse
              </Text>
            )}
            
            <Stack gap="xs">
              {navCategories.map((category) => {
                const IconComponent = category.icon;
                return (
                  <Button
                    key={category.id}
                    variant="subtle"
                    fullWidth
                    justify="flex-start"
                    leftSection={<IconComponent size={20} />}
                    onClick={() => handleCategoryClick(category.id)}
                    style={{
                      color: category.active ? 'var(--mantine-color-orange-6)' : 'var(--mantine-color-gray-6)',
                      backgroundColor: category.active ? 'var(--mantine-color-orange-0)' : 'transparent',
                    }}
                  >
                    {(!isMenuCompressed || isMenuHovered) && (
                      <Text fw={500}>{category.label}</Text>
                    )}
                  </Button>
                );
              })}
            </Stack>
          </Stack>
        </Box>

        {/* Mobile Navigation Overlay */}
        <Drawer
          opened={showMobileNav}
          onClose={() => setShowMobileNav(false)}
          position="right"
          size="320px"
          title="Menu"
        >
          <Stack gap="xs">
            {navCategories.map((category) => {
              const IconComponent = category.icon;
              return (
                <Button
                  key={category.id}
                  variant="subtle"
                  fullWidth
                  justify="flex-start"
                  leftSection={<IconComponent size={20} />}
                  onClick={() => {
                    handleCategoryClick(category.id);
                    setShowMobileNav(false);
                  }}
                >
                  {category.label}
                </Button>
              );
            })}
          </Stack>
        </Drawer>

        {/* Main Content */}
        <Box style={{ flex: 1, position: 'relative' }}>
          <Box style={{ backgroundColor: 'white', minHeight: '100vh' }}>
            <Box style={{ maxWidth: '1280px', margin: '0 auto' }}>
              {/* --- Mobile Hero Section (DoorDash Style) --- */}
              <Box className="block lg:hidden">
                {/* Hero Image */}
                <Box style={{ position: 'relative', height: '192px' }}>
                  <MantineImage
                    src={restaurant.header_image_url || restaurant.image_url || 'https://placehold.co/600x300/A31D24/ffffff?text=Restaurant'}
                    alt={restaurant.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    fit="cover"
                  />
                </Box>
                
                {/* Restaurant Info - Directly beneath header image */}
                <Box
                  p="md"
                  style={{
                    margin: '0 16px',
                    paddingTop: '10px',
                  }}
                >
                  <Group align="flex-start" gap="sm" mb="md">
                    <Box
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: '2px solid white',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                        flexShrink: 0,
                        backgroundColor: getLogoBackgroundColor(restaurant.logo_url, 'var(--mantine-color-gray-1)'),
                      }}
                    >
                      <MantineImage
                        src={restaurant.logo_url || restaurant.image_url || 'https://placehold.co/64x64/CCCCCC/666666?text=Logo'}
                        alt={restaurant.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        fit="cover"
                        onError={(e) => { e.currentTarget.src = "https://placehold.co/64x64/CCCCCC/666666?text=Logo"; }}
                      />
                    </Box>
                    <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
                      <Text size="lg" fw={700} lineClamp={2} style={{ lineHeight: '1.2' }}>{restaurant.name}</Text>
                      <Group gap="xs" wrap="nowrap">
                        <IconStar size={16} style={{ color: 'var(--mantine-color-yellow-5)', fill: 'var(--mantine-color-yellow-5)' }} />
                        <Text size="sm" fw={600} c="dimmed">{restaurant.rating || 4.5}</Text>
                        <Text size="sm" c="dimmed">({restaurant.total_reviews || 0}+)</Text>
                        <Text size="sm" c="dimmed">•</Text>
                        <Text size="sm" c="dimmed" truncate>{restaurant.cuisine_type}</Text>
                        {restaurant.cravemore_eligible && (
                          <>
                            <Text size="sm" c="dimmed">•</Text>
                            <MantineImage
                              src={cravemoreIcon}
                              alt="CraveMore"
                              style={{ width: '16px', height: '16px', objectFit: 'contain' }}
                            />
                          </>
                        )}
                      </Group>
                      <Group gap="xs" wrap="nowrap">
                        <Group gap={4}>
                          <IconClock size={12} style={{ color: 'var(--mantine-color-gray-5)' }} />
                          <Text size="xs" c="dimmed">{restaurant.min_delivery_time}-{restaurant.max_delivery_time} min</Text>
                        </Group>
                        <Text size="xs" c="dimmed">•</Text>
                        <Group gap={4}>
                          <IconTruck size={12} style={{ color: 'var(--mantine-color-gray-5)' }} />
                          <Text size="xs" c="dimmed">{formatPrice(restaurant.delivery_fee_cents || 0)}</Text>
                        </Group>
                      </Group>
                    </Stack>
                  </Group>
                </Box>

                {/* Mobile: sticky nav — enterprise-style segmented delivery + underline category tabs */}
                <Box
                  ref={mobileStickyNavRef}
                  style={{
                    position: 'sticky',
                    top: 'calc(56px + env(safe-area-inset-top, 0px))',
                    zIndex: 200,
                    margin: '0 -16px',
                    backgroundColor: '#ffffff',
                    borderBottom: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
                    isolation: 'isolate',
                  }}
                >
                  <Stack gap={0}>
                    <Box px="md" py={12} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <Box
                        style={{
                          display: 'flex',
                          gap: 4,
                          backgroundColor: '#f1f5f9',
                          borderRadius: 8,
                          padding: 4,
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setDeliveryMethod('delivery')}
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            border: 'none',
                            borderRadius: 6,
                            padding: '10px 12px',
                            fontSize: 13,
                            fontWeight: 600,
                            letterSpacing: '-0.01em',
                            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                            cursor: 'pointer',
                            WebkitTapHighlightColor: 'transparent',
                            transition: 'background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease',
                            ...(deliveryMethod === 'delivery'
                              ? {
                                  backgroundColor: '#ffffff',
                                  color: '#0f172a',
                                  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.08)',
                                }
                              : {
                                  backgroundColor: 'transparent',
                                  color: '#64748b',
                                  boxShadow: 'none',
                                }),
                          }}
                        >
                          <IconTruck size={15} stroke={1.75} />
                          <span>Delivery</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeliveryMethod('pickup')}
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            border: 'none',
                            borderRadius: 6,
                            padding: '10px 12px',
                            fontSize: 13,
                            fontWeight: 600,
                            letterSpacing: '-0.01em',
                            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                            cursor: 'pointer',
                            WebkitTapHighlightColor: 'transparent',
                            transition: 'background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease',
                            ...(deliveryMethod === 'pickup'
                              ? {
                                  backgroundColor: '#ffffff',
                                  color: '#0f172a',
                                  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.08)',
                                }
                              : {
                                  backgroundColor: 'transparent',
                                  color: '#64748b',
                                  boxShadow: 'none',
                                }),
                          }}
                        >
                          <IconBuildingStore size={15} stroke={1.75} />
                          <span>Pickup</span>
                        </button>
                      </Box>
                    </Box>
                    <Box
                      style={{
                        width: '100%',
                        overflowX: 'auto',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        WebkitOverflowScrolling: 'touch',
                        backgroundColor: '#fafbfc',
                        borderBottom: '1px solid #e2e8f0',
                      }}
                      className="scrollbar-hide"
                    >
                      <Group gap={0} wrap="nowrap" align="stretch" px={4} style={{ flexWrap: 'nowrap', minHeight: 48 }}>
                        <button
                          type="button"
                          onClick={() => {
                            setIsSearchMode(true);
                            setSearchQuery('');
                          }}
                          style={{
                            flexShrink: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            padding: '14px 14px',
                            fontSize: 13,
                            fontWeight: mobileChipActive('search') ? 600 : 500,
                            letterSpacing: '-0.02em',
                            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                            color: mobileChipActive('search') ? '#0f172a' : '#64748b',
                            borderBottom: mobileChipActive('search') ? '2px solid #c2410c' : '2px solid transparent',
                            marginBottom: -1,
                            WebkitTapHighlightColor: 'transparent',
                            transition: 'color 0.15s ease, border-color 0.15s ease',
                          }}
                        >
                          <IconSearch size={15} stroke={1.75} style={{ opacity: 0.85 }} />
                          <span>Search</span>
                        </button>
                        {mostOrderedItems.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsSearchMode(false);
                              setSearchQuery('');
                              scrollToSection('most-ordered');
                            }}
                            style={{
                              flexShrink: 0,
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              padding: '14px 14px',
                              fontSize: 13,
                              fontWeight: mobileChipActive('most-ordered') ? 600 : 500,
                              letterSpacing: '-0.02em',
                              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                              color: mobileChipActive('most-ordered') ? '#0f172a' : '#64748b',
                              borderBottom: mobileChipActive('most-ordered') ? '2px solid #c2410c' : '2px solid transparent',
                              marginBottom: -1,
                              WebkitTapHighlightColor: 'transparent',
                              transition: 'color 0.15s ease, border-color 0.15s ease',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {isRetail ? 'Best sellers' : 'Most ordered'}
                          </button>
                        )}
                        {frequentlyOrderedItems.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsSearchMode(false);
                              setSearchQuery('');
                              scrollToSection('frequently-ordered-mobile');
                            }}
                            style={{
                              flexShrink: 0,
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              padding: '14px 14px',
                              fontSize: 13,
                              fontWeight: mobileChipActive('frequently-ordered') ? 600 : 500,
                              letterSpacing: '-0.02em',
                              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                              color: mobileChipActive('frequently-ordered') ? '#0f172a' : '#64748b',
                              borderBottom: mobileChipActive('frequently-ordered') ? '2px solid #c2410c' : '2px solid transparent',
                              marginBottom: -1,
                              WebkitTapHighlightColor: 'transparent',
                              transition: 'color 0.15s ease, border-color 0.15s ease',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {isRetail ? 'Popular' : 'Frequently ordered'}
                          </button>
                        )}
                        {categories.map((category) => (
                          <button
                            type="button"
                            key={category.id}
                            onClick={() => {
                              setIsSearchMode(false);
                              setSearchQuery('');
                              scrollToSection(category.id);
                            }}
                            style={{
                              flexShrink: 0,
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              padding: '14px 14px',
                              fontSize: 13,
                              fontWeight: mobileChipActive(category.id) ? 600 : 500,
                              letterSpacing: '-0.02em',
                              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                              color: mobileChipActive(category.id) ? '#0f172a' : '#64748b',
                              borderBottom: mobileChipActive(category.id) ? '2px solid #c2410c' : '2px solid transparent',
                              marginBottom: -1,
                              WebkitTapHighlightColor: 'transparent',
                              transition: 'color 0.15s ease, border-color 0.15s ease',
                              whiteSpace: 'nowrap',
                              maxWidth: 200,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {category.name}
                          </button>
                        ))}
                      </Group>
                    </Box>
                  </Stack>
                </Box>

                {/* Pickup Interface - Mobile - Show when pickup is selected */}
                {deliveryMethod === 'pickup' && (
                  <Box px="md" pb="md">
                    <PickupInterface />
                  </Box>
                )}

                {/* Mobile Menu Items - Compact List */}
                <Stack gap="lg" p="md">
                  {/* Search Results - Mobile */}
                  {isSearchMode && (
                    <Box>
                      <TextInput
                        placeholder="Search menu items..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        leftSection={<IconSearch size={16} style={{ color: 'var(--mantine-color-gray-5)' }} />}
                        rightSection={searchQuery && (
                          <ActionIcon
                            onClick={() => {
                              setSearchQuery('');
                              setIsSearchMode(false);
                            }}
                            variant="subtle"
                            size="sm"
                          >
                            <IconX size={16} />
                          </ActionIcon>
                        )}
                        style={{ width: '100%', marginBottom: 'md' }}
                        autoFocus
                      />
                      {searchQuery.trim() && (
                        <Box>
                          <Title order={2} size="xl" fw={700} mb="md">
                            Search Results {filteredMenuItems.length > 0 && `(${filteredMenuItems.length})`}
                          </Title>
                          {filteredMenuItems.length > 0 ? (
                      <Stack gap="sm">
                              {filteredMenuItems.map(item => (
                                <Box
                            key={item.id}
                            p="sm"
                                  style={{ cursor: 'pointer', backgroundColor: 'white' }}
                            onClick={() => openItemModal(item)}
                          >
                            <Group align="flex-start" gap="sm">
                              <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
                                <Text fw={600} lineClamp={1}>{item.name}</Text>
                                <Text size="sm" c="dimmed" lineClamp={2} mb="xs">{item.description}</Text>
                                <Group justify="space-between">
                                  <Text size="md" fw={700}>{formatPrice(item.price_cents)}</Text>
                                  <Group gap="xs">
                                    {item.is_vegetarian && <IconLeaf size={16} style={{ color: 'var(--mantine-color-green-6)' }} />}
                                    {item.chef_recommended && <IconChefHat size={16} style={{ color: 'var(--mantine-color-orange-6)' }} />}
                                  </Group>
                                </Group>
                              </Stack>
                              {item.image_url && (
                                <Box
                                  style={{
                                    width: '96px',
                                    height: '96px',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    flexShrink: 0,
                                    position: 'relative',
                                  }}
                                >
                                  <MantineImage
                                    src={item.image_url}
                                    alt={item.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    fit="cover"
                                    onError={(e) => { e.currentTarget.src = "https://placehold.co/100x100/CCCCCC/666666?text=Item"; }}
                                  />
                                  <ActionIcon
                                    color="orange"
                                    variant="filled"
                                    size="sm"
                                    radius="xl"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      addToCart(item);
                                    }}
                                    style={{
                                      position: 'absolute',
                                      bottom: 4,
                                      right: 4,
                                    }}
                                  >
                                    <IconPlus size={14} />
                                  </ActionIcon>
                                </Box>
                              )}
                            </Group>
                                </Box>
                        ))}
                      </Stack>
                          ) : (
                            <Text c="dimmed" ta="center" py="xl">
                              No items found matching "{searchQuery}"
                            </Text>
                          )}
                        </Box>
                      )}
                    </Box>
                  )}

                  {/* Featured Items - Mobile */}
                  {!isSearchMode && menuItems.length > 0 && (
                    <Box id="featured-mobile" mb="xl" style={{ scrollMarginTop: 'calc(120px + env(safe-area-inset-top, 0px))' }}>
                      <Title order={2} size="xl" fw={700} mb="md">Featured Items</Title>
                      <ScrollArea scrollbars="x">
                        <Group gap={4} style={{ flexWrap: 'nowrap' }} pb="md">
                          {featuredItems.slice(0, 10).map((item, index) => (
                            <Box
                            key={item.id}
                              p={4}
                              style={{ 
                                cursor: 'pointer', 
                                backgroundColor: 'white',
                                width: 'calc(50% - 2px)',
                                minWidth: 'calc(50% - 2px)',
                                flexShrink: 0,
                              }}
                            onClick={() => openItemModal(item)}
                          >
                              <Stack gap={4}>
                                {item.image_url && (
                                  <Box
                                    style={{
                                      width: '100%',
                                      aspectRatio: '1',
                                      borderRadius: '8px',
                                      overflow: 'hidden',
                                      position: 'relative',
                                    }}
                                  >
                                    <MantineImage
                                      src={item.image_url}
                                      alt={item.name}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                      fit="cover"
                                      onError={(e) => { e.currentTarget.src = "https://placehold.co/100x100/CCCCCC/666666?text=Item"; }}
                                    />
                                    <Badge
                                      color="orange"
                                      variant="filled"
                                      size="sm"
                                      style={{
                                        position: 'absolute',
                                        top: 4,
                                        left: 4,
                                        fontWeight: 700,
                                      }}
                                    >
                                      #{index + 1}
                                    </Badge>
                                    <ActionIcon
                                      color="orange"
                                      variant="filled"
                                      size="sm"
                                      radius="xl"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        addToCart(item);
                                      }}
                                      style={{
                                        position: 'absolute',
                                        bottom: 4,
                                        right: 4,
                                      }}
                                    >
                                      <IconPlus size={14} />
                                    </ActionIcon>
                                  </Box>
                                )}
                                <Text size="sm" fw={600} lineClamp={1}>{item.name}</Text>
                                <Text size="xs" c="dimmed" lineClamp={1}>{formatPrice(item.price_cents)}</Text>
                              </Stack>
                            </Box>
                          ))}
                        </Group>
                      </ScrollArea>
                    </Box>
                  )}

                  {/* Reviews Section - Mobile — Crave'n Community Ratings */}
                  {!isSearchMode && (
                    <Box id="reviews-mobile" mb="xl" style={{ scrollMarginTop: 'calc(120px + env(safe-area-inset-top, 0px))' }}>
                      {/* Section Header */}
                      <Group justify="space-between" align="flex-start" mb="lg">
                        <Stack gap={2}>
                          <Group gap={8} align="center">
                            <Title order={2} size="lg" fw={800} style={{ letterSpacing: '-0.02em' }}>Community Ratings</Title>
                            <Tooltip label="All reviews verified from Crave'n orders">
                              <Badge
                                size="xs"
                                variant="light"
                                color="teal"
                                leftSection={<IconShieldCheck size={10} />}
                                style={{ cursor: 'help', textTransform: 'none' }}
                              >
                                Verified
                              </Badge>
                            </Tooltip>
                          </Group>
                          <Text size="xs" c="dimmed">3,241 ratings from Crave'n orders</Text>
                        </Stack>
                        <Button variant="outline" color="orange" size="xs" radius="xl" onClick={handleOpenReviewModal}>
                          Write Review
                        </Button>
                      </Group>

                      {/* Rating Summary Card */}
                      <Box
                        mb="lg"
                        p="md"
                        style={{
                          background: 'linear-gradient(135deg, #FFF7ED 0%, #FFFFFF 100%)',
                          borderRadius: 12,
                          border: '1px solid var(--mantine-color-orange-1)',
                        }}
                      >
                        <Group align="flex-start" gap="lg" wrap="nowrap">
                          {/* Score */}
                          <Stack align="center" gap={4} style={{ flexShrink: 0, minWidth: 72 }}>
                            <Text size="2.5rem" fw={800} lh={1} style={{ color: 'var(--mantine-color-gray-9)', letterSpacing: '-0.03em' }}>4.4</Text>
                            <Group gap={2}>
                              {[1,2,3,4].map(i => <IconStarFilled key={i} size={12} style={{ color: '#F97316' }} />)}
                              <IconStar size={12} style={{ color: '#F97316' }} />
                            </Group>
                            <Text size="10px" c="dimmed" fw={500}>3.2k reviews</Text>
                          </Stack>

                          {/* Bar Breakdown */}
                          <Stack gap={6} style={{ flex: 1 }}>
                            {[
                              { stars: 5, pct: 68, count: 2204 },
                              { stars: 4, pct: 20, count: 648 },
                              { stars: 3, pct: 7, count: 227 },
                              { stars: 2, pct: 3, count: 97 },
                              { stars: 1, pct: 2, count: 65 },
                            ].map(row => (
                              <Group key={row.stars} gap={6} wrap="nowrap" align="center">
                                <Text size="xs" fw={600} c="gray.7" style={{ width: 12, textAlign: 'right' }}>{row.stars}</Text>
                                <IconStarFilled size={10} style={{ color: '#F97316', flexShrink: 0 }} />
                                <Progress
                                  value={row.pct}
                                  size={6}
                                  radius="xl"
                                  color="orange"
                                  style={{ flex: 1 }}
                                />
                                <Text size="10px" c="dimmed" style={{ width: 24, textAlign: 'right' }}>{row.pct}%</Text>
                              </Group>
                            ))}
                          </Stack>
                        </Group>

                        {/* Quality Metrics */}
                        <Group gap="xs" mt="md" justify="center">
                          {[
                            { label: 'Food Quality', score: '4.6' },
                            { label: 'Delivery', score: '4.3' },
                            { label: 'Value', score: '4.5' },
                          ].map(metric => (
                            <Box
                              key={metric.label}
                              px="sm"
                              py={6}
                              style={{
                                background: 'white',
                                borderRadius: 8,
                                border: '1px solid var(--mantine-color-gray-2)',
                                textAlign: 'center',
                                flex: 1,
                              }}
                            >
                              <Text size="sm" fw={700} c="gray.9">{metric.score}</Text>
                              <Text size="10px" c="dimmed">{metric.label}</Text>
                            </Box>
                          ))}
                        </Group>
                      </Box>

                      {/* Review Cards — Slide one at a time */}
                      {(() => {
                        const mobileReviewsData = [
                          {
                            name: 'Marcus T',
                            initial: 'M',
                            color: 'blue' as const,
                            stars: 5,
                            date: 'Nov 15, 2023',
                            orders: 12,
                            badge: 'Regular',
                            items: ['Classic Burger'],
                            text: 'This place never disappoints! Classic Burger is always fresh and the delivery is super quick. Highly recommend!',
                            helpful: 24,
                          },
                          {
                            name: 'Sarah K',
                            initial: 'S',
                            color: 'violet' as const,
                            stars: 5,
                            date: 'Oct 28, 2023',
                            orders: 8,
                            badge: 'Top Reviewer',
                            items: ['Chicken Sandwich', 'Seasoned Fries'],
                            text: 'Amazing food! Chicken Sandwich was perfectly cooked and the seasoned fries were incredible. Will definitely order again!',
                            helpful: 18,
                          },
                          {
                            name: 'David M',
                            initial: 'D',
                            color: 'orange' as const,
                            stars: 5,
                            date: 'Dec 2, 2023',
                            orders: 3,
                            badge: 'New',
                            items: ['Fish Sandwich', 'Onion Rings'],
                            text: 'First time ordering and I\'m impressed! Fish Sandwich was crispy and fresh. The onion rings were the perfect side. Great value!',
                            helpful: 11,
                          },
                        ];
                        const mobileReview = mobileReviewsData[reviewSlideIndex];
                        return (
                          <Stack gap="xs" justify="space-between">
                            <Box
                              p="sm"
                              style={{
                                borderRadius: 10,
                                border: '1px solid var(--mantine-color-gray-2)',
                                borderLeft: '3px solid #F97316',
                                background: 'white',
                              }}
                            >
                              {/* Header Row */}
                              <Group justify="space-between" align="flex-start" mb={6}>
                                <Group gap="xs" wrap="nowrap">
                                  <Avatar color={mobileReview.color} radius="xl" size="sm">{mobileReview.initial}</Avatar>
                                  <Stack gap={0}>
                                    <Group gap={4}>
                                      <Text size="sm" fw={600}>{mobileReview.name}</Text>
                                      <Badge size="xs" variant="dot" color="teal" style={{ textTransform: 'none' }}>Verified</Badge>
                                    </Group>
                                    <Text size="xs" c="dimmed">{mobileReview.orders} orders · {mobileReview.date}</Text>
                                  </Stack>
                                </Group>
                                <Group gap={2}>
                                  {[...Array(5)].map((_, i) => (
                                    <IconStarFilled
                                      key={i}
                                      size={11}
                                      style={{ color: i < mobileReview.stars ? '#F97316' : 'var(--mantine-color-gray-3)' }}
                                    />
                                  ))}
                                </Group>
                              </Group>

                              {/* Review Text */}
                              <Text size="sm" c="gray.7" lh={1.5} mb={6} fs="italic">"{mobileReview.text}"</Text>

                              {/* Ordered Items + Helpful */}
                              <Group justify="space-between" align="center">
                                <Group gap={4}>
                                  {mobileReview.items.map(item => (
                                    <Badge key={item} size="xs" variant="light" color="gray" radius="sm" style={{ textTransform: 'none' }}>
                                      {item}
                                    </Badge>
                                  ))}
                                </Group>
                                <Group gap={4}>
                                  <ActionIcon variant="subtle" color="gray" size="xs" radius="xl">
                                    <IconThumbUp size={11} />
                                  </ActionIcon>
                                  <Text size="xs" c="dimmed">{mobileReview.helpful}</Text>
                                </Group>
                              </Group>
                            </Box>

                            {/* Slider controls + See All */}
                            <Group justify="space-between" align="center">
                              <Group gap={6} align="center">
                                <ActionIcon
                                  variant="subtle"
                                  color="gray"
                                  size="sm"
                                  radius="xl"
                                  disabled={reviewSlideIndex === 0}
                                  onClick={() => setReviewSlideIndex(i => Math.max(0, i - 1))}
                                >
                                  <IconChevronLeft size={14} />
                                </ActionIcon>
                                {mobileReviewsData.map((_, i) => (
                                  <Box
                                    key={i}
                                    onClick={() => setReviewSlideIndex(i)}
                                    style={{
                                      width: i === reviewSlideIndex ? 16 : 6,
                                      height: 6,
                                      borderRadius: 3,
                                      background: i === reviewSlideIndex ? '#F97316' : 'var(--mantine-color-gray-3)',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease',
                                    }}
                                  />
                                ))}
                                <ActionIcon
                                  variant="subtle"
                                  color="gray"
                                  size="sm"
                                  radius="xl"
                                  disabled={reviewSlideIndex === mobileReviewsData.length - 1}
                                  onClick={() => setReviewSlideIndex(i => Math.min(mobileReviewsData.length - 1, i + 1))}
                                >
                                  <IconChevronRight size={14} />
                                </ActionIcon>
                              </Group>
                              <Button variant="subtle" color="gray" size="xs" rightSection={<IconChevronRight size={14} />}>
                                All reviews
                              </Button>
                            </Group>
                          </Stack>
                        );
                      })()}
                    </Box>
                  )}

                  {/* Frequently Ordered Section - Mobile */}
                  {!isSearchMode && frequentlyOrderedItems.length > 0 && (
                    <Box id="frequently-ordered-mobile" mb="xl" style={{ scrollMarginTop: 'calc(120px + env(safe-area-inset-top, 0px))' }}>
                      <Title order={2} size="xl" fw={700} mb="md">Frequently Ordered</Title>
                      <Grid gutter={4}>
                        {frequentlyOrderedItems.map(item => (
                          <Grid.Col key={item.id} span={{ base: 6 }}>
                            <Box
                              p={4}
                              style={{ cursor: 'pointer', backgroundColor: 'white' }}
                              onClick={() => openItemModal(item)}
                            >
                              <Stack gap={4}>
                              {item.image_url && (
                                <Box
                                  style={{
                                      width: '100%',
                                      aspectRatio: '1',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    position: 'relative',
                                  }}
                                >
                                  <MantineImage
                                    src={item.image_url}
                                    alt={item.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    fit="cover"
                                    onError={(e) => { e.currentTarget.src = "https://placehold.co/100x100/CCCCCC/666666?text=Item"; }}
                                  />
                                  <ActionIcon
                                    color="orange"
                                    variant="filled"
                                    size="sm"
                                    radius="xl"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      addToCart(item);
                                    }}
                                    style={{
                                      position: 'absolute',
                                      bottom: 4,
                                      right: 4,
                                    }}
                                  >
                                    <IconPlus size={14} />
                                  </ActionIcon>
                                </Box>
                              )}
                                <Text size="sm" fw={600} lineClamp={1}>{item.name}</Text>
                                <Text size="xs" c="dimmed" lineClamp={1}>{formatPrice(item.price_cents)}</Text>
                      </Stack>
                            </Box>
                          </Grid.Col>
                        ))}
                      </Grid>
                    </Box>
                  )}

                  {/* Category Sections - Mobile */}
                  {!isSearchMode && categories.map(category => {
                    const items = getItemsByCategory(category.id);
                    if (items.length === 0) return null;
                    
                    return (
                      <Box key={category.id} id={`${category.id}-mobile`} style={{ scrollMarginTop: 'calc(120px + env(safe-area-inset-top, 0px))' }}>
                        <Title order={2} size="xl" fw={700} mb="md">{category.name}</Title>
                        <Stack gap="sm">
                          {items.map(item => (
                            <Box
                              key={item.id}
                              p="sm"
                              style={{ cursor: 'pointer', backgroundColor: 'white' }}
                              onClick={() => openItemModal(item)}
                            >
                              <Group align="flex-start" gap="sm">
                                <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
                                  <Text fw={600} lineClamp={1}>{item.name}</Text>
                                  <Text size="sm" c="dimmed" lineClamp={2} mb="xs">{item.description}</Text>
                                  <Group justify="space-between">
                                    <Text size="md" fw={700}>{formatPrice(item.price_cents)}</Text>
                                    <Group gap="xs">
                                      {item.is_vegetarian && <IconLeaf size={16} style={{ color: 'var(--mantine-color-green-6)' }} />}
                                      {item.chef_recommended && <IconChefHat size={16} style={{ color: 'var(--mantine-color-orange-6)' }} />}
                                    </Group>
                                  </Group>
                                </Stack>
                                {item.image_url && (
                                  <Box
                                    style={{
                                      width: '96px',
                                      height: '96px',
                                      borderRadius: '8px',
                                      overflow: 'hidden',
                                      flexShrink: 0,
                                      position: 'relative',
                                    }}
                                  >
                                    <MantineImage
                                      src={item.image_url}
                                      alt={item.name}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                      fit="cover"
                                      onError={(e) => { e.currentTarget.src = "https://placehold.co/100x100/CCCCCC/666666?text=Item"; }}
                                    />
                                    <ActionIcon
                                      color="orange"
                                      variant="filled"
                                      size="sm"
                                      radius="xl"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        addToCart(item);
                                      }}
                                      style={{
                                        position: 'absolute',
                                        bottom: 4,
                                        right: 4,
                                      }}
                                    >
                                      <IconPlus size={14} />
                                    </ActionIcon>
                                  </Box>
                                )}
                              </Group>
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    );
                  })}

                  {/* Legal Disclaimer - Mobile */}
                  {!isSearchMode && (
                    <Box mt="xl" pt="xl" style={{ borderTop: '1px solid var(--mantine-color-gray-3)' }}>
                      <Stack gap="xs">
                        <Text size="sm" fw={600} c="gray.8">Legal Notice</Text>
                        <Text size="xs" c="dimmed" style={{ lineHeight: 1.6 }}>
                          All of the prices on this menu are set directly by the Merchant.
                        </Text>
                        <Text size="xs" c="dimmed" style={{ lineHeight: 1.6 }}>
                          Item prices may be different when choosing between Delivery or Pickup
                        </Text>
                      </Stack>
                    </Box>
                  )}
                </Stack>
              </Box>

              {/* --- Desktop Header Image Banner --- */}
              <Box
                className="hidden lg:block"
                style={{
                  position: 'relative',
                  height: '256px',
                  overflow: 'hidden',
                  borderRadius: '0 0 12px 12px',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                }}
              >
                <MantineImage
                  src={restaurant.header_image_url || restaurant.image_url || 'https://placehold.co/1200x400/A31D24/ffffff?text=Restaurant'}
                  alt={restaurant.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  fit="cover"
                  onError={(e) => { e.currentTarget.src = "https://placehold.co/1200x400/A31D24/ffffff?text=Restaurant"; }}
                />

                {/* Back Button */}
                <ActionIcon
                  variant="filled"
                  color="white"
                  onClick={() => navigate('/restaurants')}
                  style={{
                    position: 'absolute',
                    top: 16,
                    left: 16,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  }}
                >
                  <IconChevronLeft size={16} />
                </ActionIcon>

                {/* Status Bar Overlay */}
                <Box
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '40px',
                    backgroundColor: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 16px',
                    boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  <Text size="sm" fw={500} c="gray.7" style={{ flex: 1 }}>
                    <Text component="span" c={restaurant.is_open ? 'green.7' : 'orange.6'}>
                      {restaurant.is_open ? 'Open Now' : 'Closed'}
                    </Text>
                    {' • '}
                    {restaurant.min_delivery_time}-{restaurant.max_delivery_time} min
                  </Text>
                </Box>
              </Box>
            </Box>
        
            {/* --- Main Content Layout - Desktop Only --- */}
            <Box
              component="main"
              className="hidden lg:block"
              style={{
                maxWidth: '1280px',
                margin: '0 auto',
                padding: '32px 16px',
              }}
            >
              {/* --- Restaurant Name & Search Bar --- */}
              <Group justify="space-between" align="center" mb="lg">
                <Group gap="md">
                  {/* Restaurant Logo */}
                  <Box
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: '2px solid var(--mantine-color-gray-3)',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    }}
                  >
                    <MantineImage
                      src={restaurant.logo_url || restaurant.image_url || 'https://placehold.co/64x64/CCCCCC/666666?text=Logo'}
                      alt={`${restaurant.name} logo`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      fit="cover"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'https://placehold.co/64x64/CCCCCC/666666?text=Logo';
                      }}
                    />
                  </Box>
                  <Title order={1} size="2rem" fw={800} style={{ letterSpacing: '-0.025em', lineHeight: '1.1' }}>
                    {restaurant.name}
                  </Title>
                </Group>
                <TextInput
                  placeholder={`Search ${restaurant.name}`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftSection={<IconSearch size={16} style={{ color: 'var(--mantine-color-gray-5)' }} />}
                  style={{ width: '320px' }}
                />
              </Group>

              {/* --- Two-Column Layout --- */}
              <Grid gutter="lg">
                {/* LEFT: Sticky Store Info and Menu Sidebar */}
                <Grid.Col span={{ base: 12, lg: 3 }}>
                  <Box style={{ position: 'sticky', top: '32px' }}>
                    <LeftColumn />
                  </Box>
                </Grid.Col>
          
                {/* RIGHT: Delivery Tabs, Price/Time, and Scrollable Menu Content */}
                <Grid.Col span={{ base: 12, lg: 9 }} style={{ minWidth: 0 }}>
                  {/* Delivery/Pickup Tabs (Always visible) */}
                  <Box
                    ref={tabsRef}
                    style={{
                      position: 'sticky',
                      top: 0,
                      backgroundColor: 'var(--mantine-color-gray-0)',
                      paddingTop: '16px',
                      paddingBottom: '24px',
                      zIndex: 20,
                      borderBottom: '1px solid var(--mantine-color-gray-3)',
                      margin: '0 -16px',
                      paddingLeft: '16px',
                      paddingRight: '16px',
                    }}
                  >
                    <Group justify="space-between" align="center" gap="lg">
                      {/* Delivery/Pickup Tabs */}
                      <Button.Group>
                        <Button
                          variant={deliveryMethod === 'delivery' ? 'filled' : 'outline'}
                          color={deliveryMethod === 'delivery' ? 'orange' : 'gray'}
                          size="sm"
                          onClick={() => setDeliveryMethod('delivery')}
                        >
                          Delivery
                        </Button>
                        <Button
                          variant={deliveryMethod === 'pickup' ? 'filled' : 'outline'}
                          color={deliveryMethod === 'pickup' ? 'orange' : 'gray'}
                          size="sm"
                          onClick={() => setDeliveryMethod('pickup')}
                        >
                          Pickup
                        </Button>
                      </Button.Group>
            
                      {/* Price/Time Info Box - Only show for delivery */}
                      {deliveryMethod === 'delivery' && (
                        <Group gap="md">
                          {/* Delivery Fee Box */}
                          <Box p="sm" style={{ backgroundColor: 'var(--mantine-color-green-0)', borderRadius: '8px' }}>
                            <Text fw={700} size="sm" c="green.7">
                              {formatPrice(restaurant.delivery_fee_cents)} delivery fee
                            </Text>
                            <Group gap="xs" mt={4}>
                              <Text size="xs" c="green.7">pricing & fees</Text>
                              <IconInfoCircle size={12} style={{ color: 'var(--mantine-color-green-7)' }} />
                            </Group>
                          </Box>
              
                          {/* Delivery Time */}
                          <Stack gap={0} align="flex-end">
                            <Text size="lg" fw={700} c="gray.9">
                              {restaurant.min_delivery_time}-{restaurant.max_delivery_time}
                            </Text>
                            <Text size="sm" c="dimmed">delivery time</Text>
                          </Stack>
                        </Group>
                      )}
                    </Group>
                  </Box>

                  {/* Pickup Interface - Show when pickup is selected */}
                  {deliveryMethod === 'pickup' && <PickupInterface />}

                  {/* Deals & Benefits */}
                  <Box id="deals" pt="xs">
                    <DealsSection />
                  </Box>

                  {/* Featured Items - Desktop */}
                  {menuItems.length > 0 && (
                    <Box id="featured" mb="xl" style={{ scrollMarginTop: '80px', marginTop: '-80px', paddingTop: '80px' }}>
                      <Title order={2} size="2xl" fw={700} c="gray.8" mb="md">Featured Items</Title>
                      <ScrollArea scrollbars="x">
                        <Group gap={4} style={{ flexWrap: 'nowrap' }} pb="md">
                          {featuredItems.slice(0, 10).map((item, index) => (
                            <Box
                              key={item.id}
                              p={4}
                              style={{ 
                                cursor: 'pointer', 
                                backgroundColor: 'white',
                                width: 'calc(50% - 2px)',
                                minWidth: 'calc(50% - 2px)',
                                flexShrink: 0,
                              }}
                              onClick={() => openItemModal(item)}
                            >
                              <Stack gap={4}>
                                {item.image_url && (
                                  <Box
                                    style={{
                                      width: '100%',
                                      aspectRatio: '1',
                                      borderRadius: '8px',
                                      overflow: 'hidden',
                                      position: 'relative',
                                    }}
                                  >
                                    <MantineImage
                                      src={item.image_url}
                                      alt={item.name}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                      fit="cover"
                                      onError={(e) => { e.currentTarget.src = "https://placehold.co/100x100/CCCCCC/666666?text=Item"; }}
                                    />
                                    <Badge
                                      color="orange"
                                      variant="filled"
                                      size="sm"
                                      style={{
                                        position: 'absolute',
                                        top: 4,
                                        left: 4,
                                        fontWeight: 700,
                                      }}
                                    >
                                      #{index + 1}
                                    </Badge>
                                    <ActionIcon
                                      color="orange"
                                      variant="filled"
                                      size="sm"
                                      radius="xl"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        addToCart(item);
                                      }}
                                      style={{
                                        position: 'absolute',
                                        bottom: 4,
                                        right: 4,
                                      }}
                                    >
                                      <IconPlus size={14} />
                                    </ActionIcon>
                                  </Box>
                                )}
                                <Text size="sm" fw={600} lineClamp={1}>{item.name}</Text>
                                <Text size="xs" c="dimmed" lineClamp={1}>{formatPrice(item.price_cents)}</Text>
                              </Stack>
                            </Box>
                          ))}
                        </Group>
                      </ScrollArea>
                    </Box>
                  )}

                  {/* Reviews Section - Desktop — Crave'n Community Ratings */}
                  <Box id="reviews" mb="xl" style={{ scrollMarginTop: '80px', marginTop: '-80px', paddingTop: '80px' }}>
                    {/* Section Header */}
                    <Group justify="space-between" align="center" mb="md">
                      <Group gap={10} align="center">
                        <Title order={2} size="h4" fw={800} c="gray.9" style={{ letterSpacing: '-0.02em' }}>Community Ratings</Title>
                        <Tooltip label="All reviews verified from Crave'n orders" position="right">
                          <Badge
                            size="xs"
                            variant="light"
                            color="teal"
                            leftSection={<IconShieldCheck size={10} />}
                            style={{ cursor: 'help', textTransform: 'none' }}
                          >
                            Verified
                          </Badge>
                        </Tooltip>
                      </Group>
                      <Button variant="outline" color="orange" size="xs" radius="xl" onClick={handleOpenReviewModal}>
                        Write a Review
                      </Button>
                    </Group>

                    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16 }}>
                      {/* Rating Summary Panel — Compact */}
                      <Box
                        p="md"
                        style={{
                          background: 'linear-gradient(135deg, #FFF7ED 0%, #FFFFFF 100%)',
                          borderRadius: 12,
                          border: '1px solid var(--mantine-color-orange-1)',
                        }}
                      >
                        <Stack align="center" gap="sm">
                          <Stack align="center" gap={2}>
                            <Text style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1, color: 'var(--mantine-color-gray-9)', letterSpacing: '-0.04em' }}>4.4</Text>
                            <Group gap={2}>
                              {[1,2,3,4].map(i => <IconStarFilled key={i} size={13} style={{ color: '#F97316' }} />)}
                              <IconStar size={13} style={{ color: '#F97316' }} />
                            </Group>
                            <Text size="xs" c="dimmed" fw={500}>3,241 ratings</Text>
                          </Stack>

                          <Divider w="100%" color="orange.1" />

                          <Stack gap={5} w="100%">
                            {[
                              { stars: 5, pct: 68 },
                              { stars: 4, pct: 20 },
                              { stars: 3, pct: 7 },
                              { stars: 2, pct: 3 },
                              { stars: 1, pct: 2 },
                            ].map(row => (
                              <Group key={row.stars} gap={6} wrap="nowrap" align="center">
                                <Text size="xs" fw={600} c="gray.7" style={{ width: 10, textAlign: 'right' }}>{row.stars}</Text>
                                <IconStarFilled size={9} style={{ color: '#F97316', flexShrink: 0 }} />
                                <Progress value={row.pct} size={6} radius="xl" color="orange" style={{ flex: 1 }} />
                                <Text size="10px" c="dimmed" style={{ width: 26, textAlign: 'right' }}>{row.pct}%</Text>
                              </Group>
                            ))}
                          </Stack>

                          <Divider w="100%" color="orange.1" />

                          <Stack gap={5} w="100%">
                            {[
                              { label: 'Food Quality', score: 4.6 },
                              { label: 'Delivery', score: 4.3 },
                              { label: 'Value', score: 4.5 },
                              { label: 'Packaging', score: 4.4 },
                            ].map(metric => (
                              <Group key={metric.label} justify="space-between" wrap="nowrap">
                                <Text size="xs" c="gray.6">{metric.label}</Text>
                                <Group gap={3}>
                                  <Text size="xs" fw={700} c="gray.8">{metric.score}</Text>
                                  <IconStarFilled size={9} style={{ color: '#F97316' }} />
                                </Group>
                              </Group>
                            ))}
                          </Stack>
                        </Stack>
                      </Box>

                      {/* Review Cards — Slide one at a time */}
                      {(() => {
                        const reviewsData = [
                          {
                            name: 'Marcus T',
                            initial: 'M',
                            color: 'blue' as const,
                            stars: 5,
                            date: 'Nov 15, 2023',
                            orders: 12,
                            badge: 'Regular',
                            items: ['Classic Burger'],
                            text: 'This place never disappoints! Classic Burger is always fresh and the delivery is super quick. Highly recommend!',
                            helpful: 24,
                          },
                          {
                            name: 'Sarah K',
                            initial: 'S',
                            color: 'violet' as const,
                            stars: 5,
                            date: 'Oct 28, 2023',
                            orders: 8,
                            badge: 'Top Reviewer',
                            items: ['Chicken Sandwich', 'Seasoned Fries'],
                            text: 'Amazing food! Chicken Sandwich was perfectly cooked and the seasoned fries were incredible. Will definitely order again!',
                            helpful: 18,
                          },
                          {
                            name: 'David M',
                            initial: 'D',
                            color: 'orange' as const,
                            stars: 5,
                            date: 'Dec 2, 2023',
                            orders: 3,
                            badge: 'New',
                            items: ['Fish Sandwich', 'Onion Rings'],
                            text: 'First time ordering and I\'m impressed! Fish Sandwich was crispy and fresh. The onion rings were the perfect side. Great value!',
                            helpful: 11,
                          },
                        ];
                        const review = reviewsData[reviewSlideIndex];
                        return (
                          <Stack gap="xs" justify="space-between">
                            <Box
                              p="md"
                              style={{
                                borderRadius: 10,
                                border: '1px solid var(--mantine-color-gray-2)',
                                borderLeft: '3px solid #F97316',
                                background: 'white',
                                position: 'relative',
                                minHeight: 140,
                              }}
                            >
                              {/* Header */}
                              <Group justify="space-between" align="flex-start" mb={8}>
                                <Group gap="xs" wrap="nowrap">
                                  <Avatar color={review.color} radius="xl" size="sm">{review.initial}</Avatar>
                                  <Stack gap={0}>
                                    <Group gap={6}>
                                      <Text size="sm" fw={700}>{review.name}</Text>
                                      <Badge size="xs" variant="dot" color="teal" style={{ textTransform: 'none' }}>Verified</Badge>
                                      {review.badge === 'Top Reviewer' && (
                                        <Badge size="xs" variant="light" color="orange" style={{ textTransform: 'none' }}>{review.badge}</Badge>
                                      )}
                                    </Group>
                                    <Text size="xs" c="dimmed">{review.orders} orders · {review.date}</Text>
                                  </Stack>
                                </Group>
                                <Group gap={2}>
                                  {[...Array(5)].map((_, i) => (
                                    <IconStarFilled key={i} size={12} style={{ color: i < review.stars ? '#F97316' : 'var(--mantine-color-gray-3)' }} />
                                  ))}
                                </Group>
                              </Group>

                              {/* Review Text */}
                              <Text size="sm" c="gray.7" lh={1.55} mb={8}>"{review.text}"</Text>

                              {/* Footer: Items + Helpful */}
                              <Group justify="space-between" align="center">
                                <Group gap={4}>
                                  {review.items.map(item => (
                                    <Badge key={item} size="xs" variant="light" color="gray" radius="sm" style={{ textTransform: 'none' }}>{item}</Badge>
                                  ))}
                                </Group>
                                <Group gap={4}>
                                  <ActionIcon variant="subtle" color="gray" size="xs" radius="xl"><IconThumbUp size={12} /></ActionIcon>
                                  <Text size="xs" c="dimmed">Helpful ({review.helpful})</Text>
                                </Group>
                              </Group>
                            </Box>

                            {/* Slide Controls */}
                            <Group justify="space-between" align="center">
                              <Group gap={6}>
                                <ActionIcon
                                  variant="subtle"
                                  color="gray"
                                  size="sm"
                                  radius="xl"
                                  disabled={reviewSlideIndex === 0}
                                  onClick={() => setReviewSlideIndex(i => Math.max(0, i - 1))}
                                >
                                  <IconChevronLeft size={16} />
                                </ActionIcon>
                                <Group gap={4}>
                                  {reviewsData.map((_, i) => (
                                    <Box
                                      key={i}
                                      onClick={() => setReviewSlideIndex(i)}
                                      style={{
                                        width: i === reviewSlideIndex ? 16 : 6,
                                        height: 6,
                                        borderRadius: 3,
                                        background: i === reviewSlideIndex ? '#F97316' : 'var(--mantine-color-gray-3)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                      }}
                                    />
                                  ))}
                                </Group>
                                <ActionIcon
                                  variant="subtle"
                                  color="gray"
                                  size="sm"
                                  radius="xl"
                                  disabled={reviewSlideIndex === reviewsData.length - 1}
                                  onClick={() => setReviewSlideIndex(i => Math.min(reviewsData.length - 1, i + 1))}
                                >
                                  <IconChevronRight size={16} />
                                </ActionIcon>
                              </Group>
                              <Button variant="subtle" color="gray" size="xs" compact="true">
                                See all 80+ reviews
                              </Button>
                            </Group>
                          </Stack>
                        );
                      })()}
                    </div>
                  </Box>

                  {/* Frequently Ordered Section - Desktop */}
                  {frequentlyOrderedItems.length > 0 && (
                    <Box id="frequently-ordered" mb="xl" style={{ scrollMarginTop: '80px', marginTop: '-80px', paddingTop: '80px' }}>
                      <Title order={2} size="2xl" fw={700} c="gray.8" mb="md">Frequently Ordered</Title>
                      <Grid gutter={4}>
                        {frequentlyOrderedItems.map(item => (
                          <Grid.Col key={item.id} span={{ base: 6 }}>
                            <Box
                              p={4}
                              style={{ cursor: 'pointer', backgroundColor: 'white' }}
                              onClick={() => openItemModal(item)}
                            >
                              <Stack gap={4}>
                                {item.image_url && (
                                  <Box
                                    style={{
                                      width: '100%',
                                      aspectRatio: '1',
                                      borderRadius: '8px',
                                      overflow: 'hidden',
                                      position: 'relative',
                                    }}
                                  >
                                    <MantineImage
                                      src={item.image_url}
                                      alt={item.name}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                      fit="cover"
                                      onError={(e) => { e.currentTarget.src = "https://placehold.co/100x100/CCCCCC/666666?text=Item"; }}
                                    />
                                    <ActionIcon
                                      color="orange"
                                      variant="filled"
                                      size="sm"
                                      radius="xl"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        addToCart(item);
                                      }}
                                      style={{
                                        position: 'absolute',
                                        bottom: 4,
                                        right: 4,
                                      }}
                                    >
                                      <IconPlus size={14} />
                                    </ActionIcon>
                    </Box>
                  )}
                                <Text size="sm" fw={600} lineClamp={1}>{item.name}</Text>
                                <Text size="xs" c="dimmed" lineClamp={1}>{formatPrice(item.price_cents)}</Text>
                              </Stack>
                            </Box>
                          </Grid.Col>
                        ))}
                      </Grid>
                      <Divider mt="lg" />
                    </Box>
                  )}

                  {/* Category Sections */}
                  {categories.map(category => {
                    const items = getItemsByCategory(category.id);
                    if (items.length === 0) return null;

                    return (
                      <Box key={category.id} id={category.id} mb="xl" style={{ scrollMarginTop: '80px', marginTop: '-80px', paddingTop: '80px' }}>
                        <Title order={2} size="2xl" fw={700} c="gray.8" mb="md">{category.name}</Title>
                        {category.description && (
                          <Text c="dimmed" mb="md">{category.description}</Text>
                        )}
                        <Grid gutter="sm">
                          {items.map(item => (
                            <Grid.Col key={item.id} span={{ base: 6, sm: 4, md: 3, lg: 2.4, xl: 2 }}>
                              <MenuItemCard item={item} />
                            </Grid.Col>
                          ))}
                        </Grid>
                        <Divider mt="lg" />
                      </Box>
                    );
                  })}

                  {/* Legal Disclaimer - Desktop */}
                  <Box mt="xl" pt="xl" style={{ borderTop: '1px solid var(--mantine-color-gray-3)' }}>
                    <Stack gap="xs">
                      <Text size="sm" fw={600} c="gray.8">Legal Notice</Text>
                      <Text size="xs" c="dimmed" style={{ lineHeight: 1.6 }}>
                        All of the prices on this menu are set directly by the Merchant.
                      </Text>
                      <Text size="xs" c="dimmed" style={{ lineHeight: 1.6 }}>
                        Item prices may be different when choosing between Delivery or Pickup
                      </Text>
                    </Stack>
                  </Box>
                </Grid.Col>
              </Grid>
            </Box>

            {/* Floating Cart — white unibody (matches C housing); L/R hit targets; C sits on top */}
            {cartItems.length > 0 && !showItemModal && (
              <Box
                className="block lg:hidden"
                style={{
                  position: 'fixed',
                  bottom: 'calc(76px + env(safe-area-inset-bottom, 0px))',
                  left: 12,
                  right: 12,
                  zIndex: 1001,
                  height: 56,
                  pointerEvents: 'none',
                }}
              >
                {(() => {
                  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
                  const totalLabel = `$${(
                    cartItems.reduce((sum, item) => sum + item.quantity * item.price_cents, 0) / 100
                  ).toFixed(2)}`;
                  const openCart = () => {
                    if (!cartItems || cartItems.length === 0) {
                      notifications.show({
                        title: 'Cart is Empty',
                        message: 'Please add items to your cart before checking out.',
                        color: 'red',
                      });
                      return;
                    }
                    localStorage.setItem('checkout_cart', JSON.stringify(cartItems));
                    localStorage.setItem('checkout_restaurant', JSON.stringify(restaurant));
                    localStorage.setItem('checkout_delivery_method', deliveryMethod);
                    navigate('/checkout');
                  };
                  return (
                    <Box
                      style={{
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        borderRadius: 999,
                        background: '#ffffff',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
                        overflow: 'hidden',
                      }}
                    >
                      <button
                        type="button"
                        onClick={openCart}
                        aria-label={`${itemCount} carted items, view cart`}
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: '42%',
                          border: 0,
                          margin: 0,
                          padding: '0 10px 0 18px',
                          background: 'transparent',
                          pointerEvents: 'auto',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-start',
                          gap: 6,
                          WebkitTapHighlightColor: 'transparent',
                        }}
                      >
                        <Text
                          component="span"
                          style={{
                            fontSize: 26,
                            fontWeight: 900,
                            color: '#ea580c',
                            letterSpacing: 0.1,
                            lineHeight: 1,
                            flexShrink: 0,
                          }}
                        >
                          {itemCount}
                        </Text>
                        <Text
                          component="span"
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#ea580c',
                            letterSpacing: 0.05,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            lineHeight: 1.2,
                          }}
                        >
                          Carted Items
                        </Text>
                      </button>

                      <button
                        type="button"
                        onClick={openCart}
                        aria-label={`Cart total ${totalLabel}, view cart`}
                        style={{
                          position: 'absolute',
                          right: 0,
                          top: 0,
                          bottom: 0,
                          width: '42%',
                          border: 0,
                          margin: 0,
                          padding: '0 16px 0 8px',
                          background: 'transparent',
                          pointerEvents: 'auto',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          WebkitTapHighlightColor: 'transparent',
                        }}
                      >
                        <Text
                          component="span"
                          style={{
                            fontSize: 24,
                            fontWeight: 900,
                            color: '#16a34a',
                            letterSpacing: 0.15,
                            whiteSpace: 'nowrap',
                            fontVariantNumeric: 'tabular-nums',
                            lineHeight: 1,
                            width: '100%',
                            textAlign: 'center',
                          }}
                        >
                          {totalLabel}
                        </Text>
                      </button>
                    </Box>
                  );
                })()}
              </Box>
            )}

            {/* Floating Cart Button - Desktop - Hidden when item modal is open */}
            {cartItems.length > 0 && showCartButton && !showItemModal && (
              <Box
                className="hidden lg:block"
                style={{
                  position: 'fixed',
                  bottom: 16,
                  right: 16,
                  zIndex: 50,
                  opacity: showCartButton ? 1 : 0,
                  transform: showCartButton ? 'translateY(0)' : 'translateY(20px)',
                  transition: 'all 0.5s ease-in-out',
                }}
              >
                <Button
                  color="orange"
                  leftSection={<IconShoppingCart size={20} />}
                  onClick={() => {
                    // Ensure cart has items before navigating
                    if (!cartItems || cartItems.length === 0) {
                      notifications.show({
                        title: "Cart is Empty",
                        message: "Please add items to your cart before checking out.",
                        color: "red",
                      });
                      return;
                    }
                    
                    // Save to localStorage
                    localStorage.setItem('checkout_cart', JSON.stringify(cartItems));
                    localStorage.setItem('checkout_restaurant', JSON.stringify(restaurant));
                    localStorage.setItem('checkout_delivery_method', deliveryMethod);
                    navigate('/checkout');
                  }}
                  style={{
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  }}
                >
                  Cart ({cartItems.length})
                </Button>
              </Box>
            )}

            <style>{`
                html { scroll-behavior: smooth; }
                .snap-x > * {
                    scroll-snap-align: start;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .pb-safe {
                    padding-bottom: env(safe-area-inset-bottom);
                }
            `}</style>
            
            {/* Triple Dipper Modal (food items) */}
            <TripleDipperModal />

            {/* Retail Item Detail Modal (retail stores) */}
            <RetailItemDetailModal
              isOpen={showRetailItemModal}
              onClose={() => { setShowRetailItemModal(false); setRetailSelectedItem(null); }}
              item={retailSelectedItem}
              restaurantName={restaurant?.name || ''}
              onAddToCart={(item, qty, variant) => {
                if (!restaurant?.id) return;
                const cartItem = {
                  id: variant?.id || item.id,
                  name: variant ? `${item.name} - ${variant.title}` : item.name,
                  price_cents: variant?.price_cents || item.price_cents,
                  quantity: qty,
                  modifiers: [],
                  special_instructions: undefined,
                  restaurant_id: restaurant.id,
                  image_url: item.image_url,
                };
                addToCartContext(cartItem, restaurant.id);
                setShowCartButton(true);
                if (cartButtonTimerRef.current) clearTimeout(cartButtonTimerRef.current);
                cartButtonTimerRef.current = setTimeout(() => setShowCartButton(false), 3000);
              }}
            />

            {/* Review Modal */}
            <Modal
              opened={isReviewModalOpen}
              onClose={() => setIsReviewModalOpen(false)}
              title={restaurant ? `Rate ${restaurant.name}` : 'Add Review'}
              centered
            >
              <Stack gap="md">
                <Stack gap={4}>
                  <Text size="sm" fw={600}>
                    Overall rating
                  </Text>
                  <Rating
                    value={reviewRating}
                    onChange={setReviewRating}
                    size="lg"
                  />
                </Stack>

                <Textarea
                  label="Share your experience"
                  placeholder="What did you like? How was the food, delivery, and service?"
                  minRows={4}
                  value={reviewText}
                  onChange={(event) => setReviewText(event.currentTarget.value)}
                />

                <Group justify="flex-end" mt="md">
                  <Button
                    variant="subtle"
                    color="gray"
                    onClick={() => setIsReviewModalOpen(false)}
                    disabled={submittingReview}
                  >
                    Cancel
                  </Button>
                  <Button
                    color="orange"
                    onClick={handleSubmitReview}
                    loading={submittingReview}
                  >
                    Submit Review
                  </Button>
                </Group>
              </Stack>
            </Modal>

            {/* Mapbox CSS */}
            <link href='https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css' rel='stylesheet' />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default RestaurantMenuPage;
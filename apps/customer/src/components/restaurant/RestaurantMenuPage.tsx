import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from 'react-router-dom';
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
  Progress,
  Tooltip,
  Textarea,
  Rating,
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
  IconShirt,
  IconThumbUp,
    IconShieldCheck,
    IconStarFilled,
} from "@tabler/icons-react";
import { supabase } from '@/integrations/supabase/client';
import cravenLogo from "@/assets/craven-logo.png";
import cravemoreIcon from "@/assets/cravemore-icon.png";
import { useCart } from '@/contexts/CartContext';
import { getLogoBackgroundColor } from '@/utils/logoUtils';
import { createCravenMarkerElement } from '@/utils/createCravenMapPin';

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
}

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
}

interface CustomerReview {
  id: string;
  customer_id: string;
  restaurant_id: string;
  order_id: string;
  rating: number;
  comment: string | null;
  food_quality: number | null;
  delivery_speed: number | null;
  order_accuracy: number | null;
  created_at: string | null;
  // joined fields
  customer_name?: string;
}

interface ReviewStats {
  avg: number;
  total: number;
  distribution: { stars: number; pct: number }[];
  avgFood: number;
  avgDelivery: number;
  avgValue: number;
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
const MobileHeader = ({ restaurant, onBack, onShare, onLike, isLiked = false, cartCount = 0, onCartClick, isHeaderImageScrolled }: { restaurant: Restaurant | null; onBack: () => void; onShare: () => void; onLike: () => void; isLiked?: boolean; cartCount?: number; onCartClick: () => void; isHeaderImageScrolled?: boolean }) => (
  <Box
    style={{
      width: '100%',
      height: '100%',
      backgroundColor: 'white',
      overflow: 'visible',
      padding: '8px 16px',
      pointerEvents: 'none',
      display: 'flex',
      alignItems: 'center',
      paddingTop: 'calc(8px + env(safe-area-inset-top, 0px))',
    }}
    className="lg:hidden"
  >
    <Group 
      justify="space-between" 
      align="center" 
      style={{ 
        overflow: 'visible',
        backgroundColor: 'transparent',
        pointerEvents: 'auto',
        width: '100%',
      }}
    >
      {/* Back Button - Circular */}
      <ActionIcon
        variant="filled"
        onClick={onBack}
        radius="xl"
        size="lg"
        style={{
          backgroundColor: 'white',
          color: 'var(--mantine-color-gray-9)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        <IconChevronLeft size={20} />
      </ActionIcon>
      
      {/* Right Side Icons */}
      <Group gap="xs" style={{ overflow: 'visible' }}>
        {/* Share Button - Circular */}
        <ActionIcon
          variant="filled"
          onClick={onShare}
          radius="xl"
          size="lg"
          style={{
            backgroundColor: 'white',
            color: 'var(--mantine-color-gray-6)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          <IconShare size={18} />
        </ActionIcon>
        
        {/* Favorites Button - Circular */}
        <ActionIcon
          variant="filled"
          onClick={onLike}
          radius="xl"
          size="lg"
          style={{
            backgroundColor: 'white',
            color: isLiked ? 'var(--mantine-color-red-6)' : 'var(--mantine-color-gray-6)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          <IconHeart 
            size={18}
            style={{ 
              fill: isLiked ? 'var(--mantine-color-red-6)' : 'none'
            }} 
          />
        </ActionIcon>
        
        {/* Cart Button - Circular */}
        <Box style={{ position: 'relative', overflow: 'visible' }}>
          <ActionIcon
            variant="filled"
            onClick={onCartClick}
            radius="xl"
            size="lg"
            style={{
              backgroundColor: 'white',
              color: 'var(--mantine-color-gray-6)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            <IconShoppingCart size={18} />
          </ActionIcon>
          {cartCount > 0 && (
            <Badge
              size="xs"
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                minWidth: '18px',
                height: '18px',
                padding: '0 4px',
                backgroundColor: '#ff6b35',
                color: 'white',
                fontSize: '10px',
                fontWeight: 700,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid white',
                zIndex: 10,
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}
            >
              {cartCount > 99 ? '99+' : cartCount}
            </Badge>
          )}
        </Box>
      </Group>
    </Group>
  </Box>
);

// --- Main Component ---
const RestaurantMenuPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
    const tabsRef = useRef<HTMLDivElement>(null);
    
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [promos, setPromos] = useState<PromoCode[]>([]);
  const { cartItems, cartCount, addToCart: addToCartContext, removeFromCart: removeFromCartContext, clearCart } = useCart();
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
  const [mobileReviewSlideIndex, setMobileReviewSlideIndex] = useState(0);

  // Review system state
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats>({ avg: 0, total: 0, distribution: [], avgFood: 0, avgDelivery: 0, avgValue: 0 });
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewFoodQuality, setReviewFoodQuality] = useState(0);
  const [reviewDeliverySpeed, setReviewDeliverySpeed] = useState(0);
  const [reviewAccuracy, setReviewAccuracy] = useState(0);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  // Touch swipe refs for review slider
  const mobileTouchStartX = useRef(0);
  const desktopTouchStartX = useRef(0);
  
    const [activeSection, setActiveSection] = useState('featured');
    const [isMenuFixed, setIsMenuFixed] = useState(false);
    const [deliveryMethod, setDeliveryMethod] = useState('delivery' as 'delivery' | 'pickup');
    const [isDeliveryButtonsScrolled, setIsDeliveryButtonsScrolled] = useState(false);
    const deliveryButtonsRef = useRef<HTMLDivElement>(null);
    const [isHeaderImageScrolled, setIsHeaderImageScrolled] = useState(false);
    const headerImageRef = useRef<HTMLDivElement>(null);
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
           const modalScrollRef = useRef<HTMLDivElement>(null);

    // Navigation categories for side menu
    const navCategories = [
        { id: 'all', label: 'All', icon: IconHome, active: activeCategory === 'all' },
        { id: 'grocery', label: 'Grocery', icon: IconApple, active: activeCategory === 'grocery' },
        { id: 'convenience', label: 'Quick Stops', icon: IconCoffee, active: activeCategory === 'convenience' },
        { id: 'dashmart', label: "Craven'Z", icon: IconBuildingStore, active: activeCategory === 'dashmart' },
        { id: 'beauty', label: 'Cosmetics', icon: IconHeart, active: activeCategory === 'beauty' },
        { id: 'apparel', label: 'Apparel', icon: IconShirt, active: activeCategory === 'apparel' },
        { id: 'pets', label: 'Animals', icon: IconPaw, active: activeCategory === 'pets' },
        { id: 'health', label: 'Self Care', icon: IconPill, active: activeCategory === 'health' },
        { id: 'browse', label: 'Browse All', icon: IconSearch, active: activeCategory === 'browse' },
        { id: 'orders', label: 'Orders', icon: IconReceipt, active: activeCategory === 'orders' },
        { id: 'account', label: 'Account', icon: IconUser, active: activeCategory === 'account' }
    ];

    // Helper functions for header functionality
    const handleAddressSearch = async (query: string) => {
        if (query.length < 3) return;
        
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
        if (['all', 'browse', 'grocery', 'convenience', 'dashmart', 'beauty', 'apparel', 'pets', 'health'].includes(categoryId)) {
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

      // Fetch customer reviews for this restaurant
      const { data: reviewsData } = await supabase
        .from('customer_reviews')
        .select('*')
        .eq('restaurant_id', id)
        .order('created_at', { ascending: false })
        .limit(20);

      const fetchedReviews: CustomerReview[] = (reviewsData || []).map((r: any) => ({
        ...r,
        customer_name: undefined, // will be anonymous
      }));
      setReviews(fetchedReviews);

      // Compute review stats
      if (fetchedReviews.length > 0) {
        const total = fetchedReviews.length;
        const avgRating = fetchedReviews.reduce((s, r) => s + r.rating, 0) / total;
        const foodScores = fetchedReviews.filter(r => r.food_quality != null);
        const deliveryScores = fetchedReviews.filter(r => r.delivery_speed != null);
        const accuracyScores = fetchedReviews.filter(r => r.order_accuracy != null);
        const dist = [5,4,3,2,1].map(stars => {
          const count = fetchedReviews.filter(r => r.rating === stars).length;
          return { stars, pct: Math.round((count / total) * 100) };
        });
        setReviewStats({
          avg: Math.round(avgRating * 10) / 10,
          total,
          distribution: dist,
          avgFood: foodScores.length > 0 ? Math.round(foodScores.reduce((s, r) => s + (r.food_quality || 0), 0) / foodScores.length * 10) / 10 : 0,
          avgDelivery: deliveryScores.length > 0 ? Math.round(deliveryScores.reduce((s, r) => s + (r.delivery_speed || 0), 0) / deliveryScores.length * 10) / 10 : 0,
          avgValue: accuracyScores.length > 0 ? Math.round(accuracyScores.reduce((s, r) => s + (r.order_accuracy || 0), 0) / accuracyScores.length * 10) / 10 : 0,
        });
      }

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

  // Submit a new review
  const handleSubmitReview = async () => {
    if (reviewRating === 0) {
      notifications.show({ title: 'Rating Required', message: 'Please select a star rating', color: 'orange' });
      return;
    }
    try {
      setIsSubmittingReview(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        notifications.show({ title: 'Login Required', message: 'Please sign in to write a review', color: 'orange' });
        return;
      }

      // Find the user's most recent order at this restaurant
      const { data: orderData } = await supabase
        .from('orders')
        .select('id')
        .eq('customer_id', user.id)
        .eq('restaurant_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!orderData) {
        notifications.show({ title: 'Order Required', message: 'You need to have ordered from this restaurant to leave a review', color: 'orange' });
        return;
      }

      const { error } = await supabase
        .from('customer_reviews')
        .insert({
          customer_id: user.id,
          restaurant_id: id!,
          order_id: orderData.id,
          rating: reviewRating,
          comment: reviewComment.trim() || null,
          food_quality: reviewFoodQuality || null,
          delivery_speed: reviewDeliverySpeed || null,
          order_accuracy: reviewAccuracy || null,
        });

      if (error) throw error;

      notifications.show({ title: 'Review Submitted!', message: 'Thanks for your feedback', color: 'green' });
      setShowReviewModal(false);
      setReviewRating(0);
      setReviewComment('');
      setReviewFoodQuality(0);
      setReviewDeliverySpeed(0);
      setReviewAccuracy(0);
      // Re-fetch reviews
      fetchRestaurantData();
    } catch (err: any) {
      console.error('Error submitting review:', err);
      notifications.show({ title: 'Error', message: err?.message || 'Failed to submit review', color: 'red' });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Helper: generate display reviews from real data, falling back to menu-item-aware placeholders
  const getDisplayReviews = useCallback(() => {
    const firstNames = ['Marcus', 'Sarah', 'David', 'Emily', 'James', 'Olivia', 'Michael', 'Sophia', 'Daniel', 'Ava'];
    const lastInitials = ['T', 'K', 'M', 'R', 'L', 'W', 'B', 'J', 'P', 'C'];
    const colors = ['blue', 'violet', 'orange', 'teal', 'pink', 'cyan', 'grape', 'lime', 'indigo', 'red'] as const;
    const topItems = menuItems.slice(0, 10).map(i => i.name);

    if (reviews.length > 0) {
      return reviews.map((r, idx) => {
        const nameIdx = idx % firstNames.length;
        // Pick 1-2 random real menu items to tag on the review
        const taggedItems: string[] = [];
        if (topItems.length > 0) {
          taggedItems.push(topItems[idx % topItems.length]);
          if (topItems.length > 1 && idx % 3 === 0) taggedItems.push(topItems[(idx + 1) % topItems.length]);
        }
        return {
          name: `${firstNames[nameIdx]} ${lastInitials[nameIdx]}`,
          initial: firstNames[nameIdx][0],
          color: colors[nameIdx % colors.length],
          stars: r.rating,
          date: r.created_at ? new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
          orders: Math.floor(Math.random() * 15) + 1,
          badge: idx === 0 ? 'Regular' : idx === 1 ? 'Top Reviewer' : 'New',
          items: taggedItems,
          text: r.comment || 'Great food and fast delivery!',
          helpful: Math.floor(Math.random() * 30) + 1,
        };
      });
    }

    // Fallback: generate placeholder reviews using actual menu items
    const item1 = topItems[0] || 'their signature dish';
    const item2 = topItems[1] || 'the sides';
    const item3 = topItems[2] || 'combo meal';
    return [
      {
        name: 'Marcus T', initial: 'M', color: 'blue' as const, stars: 5, date: 'Nov 15', orders: 12, badge: 'Regular',
        items: topItems.length > 0 ? [topItems[0]] : [],
        text: `This place never disappoints! ${item1} is always fresh and the delivery is super quick. Highly recommend!`,
        helpful: 24,
      },
      {
        name: 'Sarah K', initial: 'S', color: 'violet' as const, stars: 5, date: 'Oct 28', orders: 8, badge: 'Top Reviewer',
        items: topItems.length > 1 ? [topItems[1], topItems[2] || topItems[0]] : topItems.slice(0, 1),
        text: `Amazing food! ${item2} was perfectly prepared. Will definitely order again!`,
        helpful: 18,
      },
      {
        name: 'David M', initial: 'D', color: 'orange' as const, stars: 5, date: 'Dec 2', orders: 3, badge: 'New',
        items: topItems.length > 2 ? [topItems[2]] : topItems.slice(0, 1),
        text: `First time ordering and I'm impressed! ${item3} was great. The packaging was solid. Great value!`,
        helpful: 11,
      },
    ];
  }, [reviews, menuItems]);

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

    // Scroll detection for header image - show white background when scrolled past
    useEffect(() => {
        const handleHeaderImageScroll = () => {
            if (headerImageRef.current) {
                const rect = headerImageRef.current.getBoundingClientRect();
                // Check if the header image has scrolled past the top (accounting for status bar ~40px)
                setIsHeaderImageScrolled(rect.bottom < 40);
            }
        };

        window.addEventListener('scroll', handleHeaderImageScroll);
        handleHeaderImageScroll(); // Check initial state
        return () => window.removeEventListener('scroll', handleHeaderImageScroll);
    }, []);

    // Scroll detection for delivery/pickup buttons section
    useEffect(() => {
        const handleDeliveryButtonsScroll = () => {
            if (deliveryButtonsRef.current) {
                const rect = deliveryButtonsRef.current.getBoundingClientRect();
                // Check if the section has scrolled past the top
                setIsDeliveryButtonsScrolled(rect.top < 0);
            }
        };

        window.addEventListener('scroll', handleDeliveryButtonsScroll);
        handleDeliveryButtonsScroll(); // Check initial state
        return () => window.removeEventListener('scroll', handleDeliveryButtonsScroll);
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
            const offset = tabsRef.current ? tabsRef.current.offsetHeight + 16 : 100;
            const elementPosition = section.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;
            
            window.scrollTo({
                top: offsetPosition,
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

           const openItemModal = useCallback((item: MenuItem) => {
               setSelectedItem(item);
               setShowItemModal(true);
               setModalQuantity(1);
               setSelectedRecommendedOption(1);
               setSelectedMenuItem(null);
           }, []);

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

    // Sidebar links
    const sidebarLinks = [
        { id: 'featured', label: 'Featured Items', href: '#featured' },
        { id: 'most-ordered', label: 'Most Ordered', href: '#most-ordered' },
        { id: 'frequently-ordered', label: 'Frequently Ordered', href: '#frequently-ordered' },
        ...categories.map(cat => ({
            id: cat.id,
            label: cat.name,
            href: `#${cat.id}`
        }))
    ];

    // --- UI Components ---
    const MenuItemCard = ({ item }: { item: MenuItem }) => {
        const rating = item.order_count ? Math.min(95, 75 + Math.floor(item.order_count / 10)) : 85;
        const reviews = item.order_count || Math.floor(Math.random() * 200) + 50;

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
                style: 'mapbox://styles/mapbox/streets-v12',
                center: [restaurant.longitude, restaurant.latitude],
                zoom: 15,
                interactive: true
            });

            // Add restaurant marker — Craven branded pin
            const markerEl = createCravenMarkerElement(40, restaurant.name);
            new window.mapboxgl.Marker({ element: markerEl, anchor: 'center' })
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
                        <Box style={{ flex: 1, height: '120px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--mantine-color-gray-3)', backgroundColor: 'white' }}>
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

        // Helper function to render a modifier section
        const renderModifierSection = (type: string, title: string, maxSelections?: number) => {
            const modifiers = modifiersByType[type] || [];
            if (modifiers.length === 0) return null;

            const maxSelect = maxSelections || modifiers[0]?.max_selections || 999;
            const isRequired = modifiers[0]?.is_required || false;
            const selectedCount = selectedModifiers.filter(id => 
                modifiers.some(m => m.id === id)
            ).length;

            return (
                <Stack gap="md" mb="lg" key={type}>
                    <Stack gap="xs">
                        <Text size="md" fw={600}>{title}</Text>
                        <Text size="sm" c="dimmed">
                            {isRequired ? 'Required' : 'Optional'} • {maxSelect === 999 ? 'Choose any' : `Select up to ${maxSelect}`}
                        </Text>
                    </Stack>
                    <Stack gap="xs">
                        {modifiers.map((modifier) => {
                            const isSelected = selectedModifiers.includes(modifier.id);
                            const canSelect = !isSelected && (maxSelect === 999 || selectedCount < maxSelect);
                            
                            return (
                                <Group
                                    key={modifier.id}
                                    justify="space-between"
                                    p="sm"
                        style={{ 
                                        cursor: canSelect || isSelected ? 'pointer' : 'not-allowed',
                                        borderRadius: '4px',
                                        opacity: canSelect || isSelected ? 1 : 0.5,
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
                                    <Group gap="sm">
                                    <Box
                                        style={{
                                                width: '20px',
                                                height: '20px',
                                                border: isSelected ? '2px solid var(--mantine-color-orange-6)' : '2px solid var(--mantine-color-gray-4)',
                                                borderRadius: '4px',
                                                backgroundColor: isSelected ? 'var(--mantine-color-orange-6)' : 'transparent',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                            {isSelected && (
                                                <IconCircleCheck size={14} style={{ color: 'white' }} />
                                        )}
                                    </Box>
                                        <Text size="sm" fw={500}>{modifier.name}</Text>
                                </Group>
                                    {modifier.price_cents > 0 && (
                                        <Text size="sm" fw={500} c="gray.7">
                                            +${(modifier.price_cents / 100).toFixed(2)}
                                </Text>
                                    )}
                                </Group>
                            );
                        })}
                            </Stack>
                </Stack>
            );
        };

        // Sort modifier entries: required first, then by type priority
        const typeOrder = ['size', 'preparation', 'side', 'addon', 'beverage', 'dessert', 'app', 'removal', 'substitution'];
        const sortedModifierEntries = Object.entries(modifiersByType).sort(([typeA, modsA], [typeB, modsB]) => {
            const aRequired = (modsA as any[])[0]?.is_required ? 0 : 1;
            const bRequired = (modsB as any[])[0]?.is_required ? 0 : 1;
            if (aRequired !== bRequired) return aRequired - bRequired;
            return (typeOrder.indexOf(typeA) === -1 ? 99 : typeOrder.indexOf(typeA)) - (typeOrder.indexOf(typeB) === -1 ? 99 : typeOrder.indexOf(typeB));
        });

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
                <Box style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'white', position: 'relative' }}>
                    {/* Fixed Back/Share Buttons - static position */}
                    <ActionIcon
                        variant="filled"
                        color="white"
                        onClick={closeItemModal}
                        style={{ 
                            position: 'fixed',
                            top: '16px',
                            left: '16px',
                            backgroundColor: 'white',
                            color: 'var(--mantine-color-gray-9)',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                            zIndex: 10001,
                        }}
                        size="lg"
                        radius="xl"
                    >
                        <IconChevronLeft size={24} />
                    </ActionIcon>
                    <ActionIcon
                        variant="filled"
                        color="white"
                        onClick={async () => {
                            const shareData = {
                              title: selectedItem.name,
                              text: selectedItem.description || '',
                              url: window.location.href,
                            };
                            if (navigator.share) {
                              try { await navigator.share(shareData); } catch { /* user cancelled */ }
                            } else {
                              try {
                                await navigator.clipboard.writeText(`${selectedItem.name} — ${window.location.href}`);
                                notifications.show({ title: 'Link Copied', message: 'Item link copied to clipboard!', color: 'green' });
                              } catch {
                                notifications.show({ title: 'Share', message: window.location.href, color: 'blue' });
                              }
                            }
                        }}
                        style={{ 
                            position: 'fixed',
                            top: '16px',
                            right: '16px',
                            backgroundColor: 'white',
                            color: 'var(--mantine-color-gray-9)',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                            zIndex: 10001,
                        }}
                        size="lg"
                        radius="xl"
                    >
                        <IconShare size={20} />
                    </ActionIcon>

                    {/* Scrollable Content - image scrolls with content */}
                    <ScrollArea 
                        style={{ flex: 1 }}
                        ref={modalScrollRef}
                    >
                        <Box>
                            {/* Food Image - scrolls with content */}
                            <Box style={{ width: '100%', height: '300px', overflow: 'hidden' }}>
                                <MantineImage
                                    src={selectedItem.image_url || 'https://placehold.co/600x300/CCCCCC/666666?text=Item'}
                                    alt={selectedItem.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    fit="cover"
                                />
                            </Box>

                            <Box p="md" pb="120px">
                            {/* 1. Item Name, Description & Price */}
                            <Stack gap="xs" mb="lg">
                                <Title order={2} fw={700} style={{ fontSize: '24px', lineHeight: 1.2 }}>
                                    {selectedItem.name}
                                </Title>
                                {selectedItem.description && (
                                    <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
                                        {selectedItem.description}
                                    </Text>
                                )}
                                <Group gap="xs" mt="xs">
                                    {selectedItem.is_vegetarian && <Badge variant="light" color="green" size="sm">Vegetarian</Badge>}
                                    {selectedItem.is_vegan && <Badge variant="light" color="green" size="sm">Vegan</Badge>}
                                    {selectedItem.is_gluten_free && <Badge variant="light" color="blue" size="sm">Gluten Free</Badge>}
                                </Group>
                            </Stack>

                            {/* 2. Your Recommended Options - popular combos */}
                            {sortedModifierEntries.length > 0 && (
                                <Box mb="lg">
                                    <Title order={4} fw={700} mb="sm" style={{ fontSize: '18px' }}>
                                        Your recommended options
                                    </Title>
                                    <ScrollArea scrollbars="x" type="never">
                                        <Group gap="sm" style={{ flexWrap: 'nowrap' }} pb="xs">
                                            {/* Recommended option #1 - auto-generate from required modifiers */}
                                            {(() => {
                                                // Build recommendation from first option of each required modifier group
                                                const requiredEntries = sortedModifierEntries.filter(([, mods]) => (mods as any[])[0]?.is_required);
                                                if (requiredEntries.length === 0) return null;
                                                
                                                const firstOptions = requiredEntries.map(([, mods]) => (mods as any[])[0]?.name).filter(Boolean);
                                                const firstPrice = requiredEntries.reduce((sum, [, mods]) => sum + ((mods as any[])[0]?.price_cents || 0), 0);
                                                const recTotalPrice = ((selectedItem.price_cents + firstPrice) / 100).toFixed(2);
                                                
                                                return (
                                                    <Card
                                                        withBorder
                                                        p="md"
                                                        radius="md"
                                                        style={{ minWidth: '280px', maxWidth: '320px', flexShrink: 0, cursor: 'pointer' }}
                                                        onClick={() => {
                                                            // Auto-select first option from each required group
                                                            const newModifiers: string[] = [];
                                                            requiredEntries.forEach(([, mods]) => {
                                                                if ((mods as any[])[0]?.id) newModifiers.push((mods as any[])[0].id);
                                                            });
                                                            setSelectedModifiers(newModifiers);
                                                        }}
                                                    >
                                                        <Text size="sm" fw={700} mb="xs">#1 • Most Popular</Text>
                                                        <Text size="xs" c="dimmed" lineClamp={2} mb="xs">
                                                            {[selectedItem.name, ...firstOptions].join(' • ')}
                                                        </Text>
                                                        <Text size="sm" fw={600}>${recTotalPrice}</Text>
                                                    </Card>
                                                );
                                            })()}
                                            {/* Recommended option #2 - last option of each required group (e.g. Large) */}
                                            {(() => {
                                                const requiredEntries = sortedModifierEntries.filter(([, mods]) => (mods as any[])[0]?.is_required);
                                                if (requiredEntries.length === 0) return null;
                                                
                                                const lastOptions = requiredEntries.map(([, mods]) => {
                                                    const modArr = mods as any[];
                                                    return modArr[modArr.length - 1]?.name;
                                                }).filter(Boolean);
                                                const lastPrice = requiredEntries.reduce((sum, [, mods]) => {
                                                    const modArr = mods as any[];
                                                    return sum + (modArr[modArr.length - 1]?.price_cents || 0);
                                                }, 0);
                                                const recTotalPrice = ((selectedItem.price_cents + lastPrice) / 100).toFixed(2);
                                                
                                                return (
                                                    <Card
                                                        withBorder
                                                        p="md"
                                                        radius="md"
                                                        style={{ minWidth: '280px', maxWidth: '320px', flexShrink: 0, cursor: 'pointer' }}
                                                        onClick={() => {
                                                            const newModifiers: string[] = [];
                                                            requiredEntries.forEach(([, mods]) => {
                                                                const modArr = mods as any[];
                                                                if (modArr[modArr.length - 1]?.id) newModifiers.push(modArr[modArr.length - 1].id);
                                                            });
                                                            setSelectedModifiers(newModifiers);
                                                        }}
                                                    >
                                                        <Text size="sm" fw={700} mb="xs">#2 • Premium Pick</Text>
                                                        <Text size="xs" c="dimmed" lineClamp={2} mb="xs">
                                                            {[selectedItem.name, ...lastOptions].join(' • ')}
                                                        </Text>
                                                        <Text size="sm" fw={600}>${recTotalPrice}</Text>
                                                    </Card>
                                                );
                                            })()}
                                        </Group>
                                    </ScrollArea>
                                </Box>
                            )}

                            <Divider mb="lg" />

                            {/* 3. Customization Sections - required first, then optional */}
                            {sortedModifierEntries.map(([type, modifiers]) => {
                                const typeDisplayNames: Record<string, string> = {
                                    'side': 'Sides',
                                    'addon': 'Add-ons',
                                    'beverage': 'Recommended Beverages',
                                    'dessert': 'Recommended Desserts',
                                    'app': 'Recommended Sides And Apps',
                                    'size': 'Choose Your Size:',
                                    'preparation': 'Preparation',
                                    'removal': 'Remove Items',
                                    'substitution': 'Substitutions',
                                };
                                
                                const displayName = typeDisplayNames[type] || type.charAt(0).toUpperCase() + type.slice(1);
                                const maxSelections = (modifiers as any[])[0]?.max_selections;
                                
                                return renderModifierSection(type, displayName, maxSelections);
                            })}

                            <Divider mb="lg" />

                            {/* 4. Special Instructions */}
                            <Box mb="lg">
                                <Button
                                    variant="light"
                                    color="gray"
                                    fullWidth
                                    leftSection={<IconMessageCircle size={18} />}
                                    onClick={() => setShowSpecialInstructions(!showSpecialInstructions)}
                                    style={{ 
                                        backgroundColor: 'var(--mantine-color-gray-0)',
                                        border: '1px solid var(--mantine-color-gray-3)',
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

                            <Divider mb="lg" />

                            {/* 5. Quantity Selector */}
                            <Group justify="center" mb="lg">
                                <ActionIcon
                                    variant="light"
                                    color="gray"
                                    radius="xl"
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setModalQuantity((prev) => Math.max(1, prev - 1));
                                    }}
                                    size="lg"
                                    disabled={modalQuantity <= 1}
                                    style={{
                                        backgroundColor: 'var(--mantine-color-gray-0)',
                                        border: '1px solid var(--mantine-color-gray-3)',
                                    }}
                                >
                                    <IconMinus size={18} />
                                </ActionIcon>
                                <Text size="xl" fw={700} style={{ minWidth: '40px', textAlign: 'center' }}>
                                    {modalQuantity}
                                </Text>
                                <ActionIcon
                                    variant="light"
                                    color="gray"
                                    radius="xl"
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setModalQuantity((prev) => prev + 1);
                                    }}
                                    size="lg"
                                    style={{
                                        backgroundColor: 'var(--mantine-color-gray-0)',
                                        border: '1px solid var(--mantine-color-gray-3)',
                                    }}
                                >
                                    <IconPlus size={18} />
                                </ActionIcon>
                            </Group>

                            <Divider mb="lg" />

                            {/* 6. Stack Section - suggest drinks/desserts from this restaurant */}
                            {(() => {
                                // Find drink & dessert categories from the restaurant's menu
                                const drinkKeywords = ['drink', 'beverage', 'juice', 'smoothie', 'shake', 'coffee', 'tea', 'soda', 'water'];
                                const dessertKeywords = ['dessert', 'sweet', 'cake', 'cookie', 'ice cream', 'pastry', 'pie'];
                                const stackKeywords = [...drinkKeywords, ...dessertKeywords, 'side', 'appetizer', 'app'];

                                // Get categories that look like drinks/desserts/sides
                                const stackCategoryIds = categories
                                    .filter(cat => stackKeywords.some(kw => cat.name.toLowerCase().includes(kw)))
                                    .map(cat => cat.id);

                                // Get items from those categories, excluding the current item
                                let stackItems = menuItems.filter(item => 
                                    item.id !== selectedItem.id && 
                                    item.is_available &&
                                    stackCategoryIds.includes(item.category_id)
                                );

                                // If no category-matched items, fall back to random available items from the restaurant
                                if (stackItems.length === 0) {
                                    stackItems = menuItems.filter(item => 
                                        item.id !== selectedItem.id && item.is_available
                                    );
                                }

                                // Shuffle and take up to 6
                                const shuffled = [...stackItems].sort(() => Math.random() - 0.5).slice(0, 6);

                                if (shuffled.length === 0) return null;

                                return (
                                    <Box mb="lg">
                                        <Group gap="sm" mb="xs">
                                            <IconShoppingCart size={20} style={{ color: 'var(--mantine-color-orange-6)' }} />
                                            <Text size="md" fw={700}>Stack your order</Text>
                                        </Group>
                                        <Text size="sm" c="dimmed" mb="sm">
                                            Add a drink or dessert — save on delivery
                                        </Text>
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
                                                            // Quick-add this item to cart with quantity 1
                                                            if (restaurant?.id) {
                                                                addToCartContext({
                                                                    id: item.id,
                                                                    name: item.name,
                                                                    price_cents: item.price_cents,
                                                                    quantity: 1,
                                                                    modifiers: [],
                                                                    restaurant_id: restaurant.id,
                                                                }, restaurant.id);
                                                                notifications.show({
                                                                    title: 'Added to order',
                                                                    message: `${item.name} added`,
                                                                    color: 'green',
                                                                    autoClose: 2000,
                                                                });
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
                        </Box>
                    </ScrollArea>

                    {/* Add to Order Button - Fixed at Bottom */}
                    <Box
                        style={{
                            position: 'sticky',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            backgroundColor: 'white',
                            borderTop: '1px solid var(--mantine-color-gray-3)',
                            padding: '0px 16px',
                            height: '140px',
                            zIndex: 10,
                        }}
                    >
                    <Button
                            fullWidth
                            size="lg"
                        color="orange"
                            radius="md"
                        onClick={addToCartFromModal}
                            style={{
                                height: '56px',
                                fontSize: '16px',
                                fontWeight: 600,
                                marginTop: '10px',
                                marginBottom: '10px',
                            }}
                        >
                            <Group justify="space-between" style={{ width: '100%' }}>
                                <Group gap="xs">
                                    <IconShoppingCart size={20} />
                                    <Text fw={600} size="md">Add to Order</Text>
                </Group>
                                <Text fw={700} size="lg">
                                    ${totalPrice.toFixed(2)}
                                </Text>
                            </Group>
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
              {restaurant?.rating || 4.0} <Text component="span" c="dimmed">({restaurant?.total_reviews || 0}+)</Text> • {(((restaurant?.latitude || 0) - 35) * 100).toFixed(1)} mi
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
                  backgroundColor: activeSection === link.id ? 'var(--mantine-color-orange-0)' : 'transparent',
                  color: activeSection === link.id ? 'var(--mantine-color-orange-6)' : 'var(--mantine-color-gray-7)',
                  fontWeight: activeSection === link.id ? 600 : 500,
                  borderLeft: activeSection === link.id ? '4px solid var(--mantine-color-orange-6)' : 'none',
                  marginLeft: activeSection === link.id ? '-8px' : 0,
                  paddingLeft: activeSection === link.id ? '12px' : '8px',
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
    <Box style={{ minHeight: '100vh', backgroundColor: 'white', position: 'relative' }}>
      {/* White Bar at Top with Buttons — hidden when item modal is open */}
      <Box
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          width: '100%',
          backgroundColor: '#ffffff',
          height: 'calc(56px + env(safe-area-inset-top, 0px))',
          zIndex: 1000,
          borderBottom: '1px solid #e5e7eb',
          display: showItemModal ? 'none' : 'block',
        }}
      >
        {/* Mobile Header - DoorDash Style */}
        <MobileHeader 
        restaurant={restaurant}
        isHeaderImageScrolled={isHeaderImageScrolled}
        onBack={() => navigate('/restaurants')}
        onShare={async () => {
          const shareData = {
            title: restaurant?.name || 'Check out this restaurant',
            text: `Check out ${restaurant?.name} on Crave'N`,
            url: window.location.href,
          };
          if (navigator.share) {
            try { await navigator.share(shareData); } catch { /* user cancelled */ }
          } else {
            try {
              await navigator.clipboard.writeText(window.location.href);
              notifications.show({ title: 'Link Copied', message: 'Restaurant link copied to clipboard!', color: 'green' });
            } catch {
              notifications.show({ title: 'Share', message: shareData.url, color: 'blue' });
            }
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
          cartCount={cartCount}
          onCartClick={() => navigate('/checkout')}
        />
      </Box>

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
                placeholder="Search Crave'N"
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
        <Box style={{ flex: 1, position: 'relative', paddingTop: 'calc(56px + env(safe-area-inset-top, 0px))', marginTop: 0 }}>
          <Box style={{ backgroundColor: 'white', minHeight: '100vh', paddingBottom: 'calc(120px + env(safe-area-inset-bottom, 0px))' }}>
            <Box style={{ maxWidth: '1280px', margin: '0 auto' }}>
              {/* --- Mobile Hero Section (DoorDash Style) --- */}
              <Box className="block lg:hidden">
                {/* Hero Image */}
                <Box ref={headerImageRef} style={{ position: 'relative', height: '250px' }}>
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
                    paddingTop: '16px',
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

                  {/* Delivery/Pickup Toggle - Mobile - Sticky with background on scroll */}
                  <Box
                    ref={deliveryButtonsRef}
                    style={{
                      position: 'sticky',
                      top: '48px',
                      zIndex: 35,
                      backgroundColor: isDeliveryButtonsScrolled ? 'white' : 'transparent',
                      margin: isDeliveryButtonsScrolled ? '0 -16px' : '0',
                      padding: isDeliveryButtonsScrolled ? '12px 16px' : '0',
                      borderBottom: isDeliveryButtonsScrolled ? '1px solid #e5e7eb' : 'none',
                      boxShadow: isDeliveryButtonsScrolled ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                      transition: 'all 0.2s ease-in-out'
                    }}
                  >
                  <Group grow>
                    <Button
                      variant={deliveryMethod === 'delivery' ? 'filled' : 'light'}
                      color={deliveryMethod === 'delivery' ? 'dark' : 'gray'}
                      leftSection={<IconTruck size={16} />}
                      onClick={() => setDeliveryMethod('delivery')}
                      style={{ flex: 1 }}
                    >
                      Delivery
                    </Button>
                    <Button
                      variant={deliveryMethod === 'pickup' ? 'filled' : 'light'}
                      color={deliveryMethod === 'pickup' ? 'dark' : 'gray'}
                      leftSection={<IconBuildingStore size={16} />}
                      onClick={() => setDeliveryMethod('pickup')}
                      style={{ flex: 1 }}
                    >
                      Pickup
                    </Button>
                  </Group>
                  </Box>
                </Box>

                {/* Pickup Interface - Mobile - Show when pickup is selected */}
                {deliveryMethod === 'pickup' && (
                  <Box px="md" pb="md">
                    <PickupInterface />
                  </Box>
                )}

                {/* Sticky Category Tabs - Mobile - Navigation Bar Style */}
                <Box
                  style={{
                    position: 'sticky',
                    top: '48px',
                    zIndex: 40,
                    backgroundColor: 'white',
                    borderBottom: '1px solid var(--mantine-color-gray-3)',
                    margin: '0 -16px',
                  }}
                >
                  <ScrollArea scrollbars="x" style={{ width: '100%' }}>
                    <Group gap={0} style={{ flexWrap: 'nowrap', padding: '0 16px' }}>
                      {/* Search Icon */}
                      <Box
                        onClick={() => {
                          setIsSearchMode(true);
                          setSearchQuery('');
                        }}
                        style={{
                          padding: '12px 16px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          borderBottom: isSearchMode ? '2px solid var(--mantine-color-dark-9)' : '2px solid transparent',
                          color: isSearchMode ? 'var(--mantine-color-dark-9)' : 'var(--mantine-color-gray-7)',
                          fontWeight: isSearchMode ? 600 : 400,
                          transition: 'all 0.2s',
                        }}
                      >
                        <IconSearch size={18} />
                      </Box>
                    {mostOrderedItems.length > 0 && (
                      <Box
                        onClick={() => {
                          setIsSearchMode(false);
                          setSearchQuery('');
                          scrollToSection('most-ordered');
                        }}
                        style={{
                          padding: '12px 16px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          borderBottom: activeSection === 'most-ordered' && !isSearchMode ? '2px solid var(--mantine-color-dark-9)' : '2px solid transparent',
                          color: activeSection === 'most-ordered' && !isSearchMode ? 'var(--mantine-color-dark-9)' : 'var(--mantine-color-gray-7)',
                          fontWeight: activeSection === 'most-ordered' && !isSearchMode ? 600 : 400,
                          transition: 'all 0.2s',
                        }}
                      >
                        <Text size="sm">🔥 Most Ordered</Text>
                      </Box>
                    )}
                    {frequentlyOrderedItems.length > 0 && (
                      <Box
                        onClick={() => {
                          setIsSearchMode(false);
                          setSearchQuery('');
                          scrollToSection('frequently-ordered-mobile');
                        }}
                        style={{
                          padding: '12px 16px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          borderBottom: activeSection === 'frequently-ordered-mobile' && !isSearchMode ? '2px solid var(--mantine-color-dark-9)' : '2px solid transparent',
                          color: activeSection === 'frequently-ordered-mobile' && !isSearchMode ? 'var(--mantine-color-dark-9)' : 'var(--mantine-color-gray-7)',
                          fontWeight: activeSection === 'frequently-ordered-mobile' && !isSearchMode ? 600 : 400,
                          transition: 'all 0.2s',
                        }}
                      >
                        <Text size="sm">⭐ Frequently Ordered</Text>
                      </Box>
                    )}
                    {categories.map(category => (
                        <Box
                        key={category.id}
                          onClick={() => {
                            setIsSearchMode(false);
                            setSearchQuery('');
                            scrollToSection(category.id);
                          }}
                          style={{
                            padding: '12px 16px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            borderBottom: activeSection === category.id && !isSearchMode ? '2px solid var(--mantine-color-dark-9)' : '2px solid transparent',
                            color: activeSection === category.id && !isSearchMode ? 'var(--mantine-color-dark-9)' : 'var(--mantine-color-gray-7)',
                            fontWeight: activeSection === category.id && !isSearchMode ? 600 : 400,
                            transition: 'all 0.2s',
                          }}
                        >
                          <Text size="sm">{category.name}</Text>
                        </Box>
                    ))}
                  </Group>
                </ScrollArea>
                </Box>

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
                    <Box id="featured-mobile" mb="xl" style={{ scrollMarginTop: '96px' }}>
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
                    <Box id="reviews-mobile" mb="xl" style={{ scrollMarginTop: '96px' }}>
                      {/* Section Header */}
                      <Group justify="space-between" align="center" mb="sm">
                        <Group gap={6} align="center">
                          <Title order={2} size="md" fw={800} style={{ letterSpacing: '-0.02em' }}>Community Ratings</Title>
                          <Badge size="xs" variant="light" color="teal" leftSection={<IconShieldCheck size={9} />} style={{ cursor: 'help', textTransform: 'none' }}>
                            Verified
                          </Badge>
                        </Group>
                        <Button variant="outline" color="orange" size="xs" radius="xl" onClick={() => setShowReviewModal(true)}>
                          Write Review
                        </Button>
                      </Group>

                      {/* Rating Summary — Compact Inline */}
                      <Box
                        mb="sm"
                        p="sm"
                        style={{
                          background: 'linear-gradient(135deg, #FFF7ED 0%, #FFFFFF 100%)',
                          borderRadius: 10,
                          border: '1px solid var(--mantine-color-orange-1)',
                        }}
                      >
                        <Group align="flex-start" gap="md" wrap="nowrap">
                          <Stack align="center" gap={2} style={{ flexShrink: 0, minWidth: 56 }}>
                            <Text style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1, color: 'var(--mantine-color-gray-9)', letterSpacing: '-0.03em' }}>{reviewStats.total > 0 ? reviewStats.avg : (restaurant?.rating || 4.4)}</Text>
                            <Group gap={1}>
                              {[1,2,3,4,5].map(i => {
                                const avg = reviewStats.total > 0 ? reviewStats.avg : (restaurant?.rating || 4.4);
                                return i <= Math.floor(avg)
                                  ? <IconStarFilled key={i} size={10} style={{ color: '#F97316' }} />
                                  : <IconStar key={i} size={10} style={{ color: '#F97316' }} />;
                              })}
                            </Group>
                            <Text size="9px" c="dimmed" fw={500}>{reviewStats.total > 0 ? (reviewStats.total >= 1000 ? `${(reviewStats.total / 1000).toFixed(1)}k` : reviewStats.total) : (restaurant?.total_reviews || 0)}</Text>
                          </Stack>

                          <Stack gap={4} style={{ flex: 1 }}>
                            {(reviewStats.total > 0 ? reviewStats.distribution : [
                              { stars: 5, pct: 68 }, { stars: 4, pct: 20 }, { stars: 3, pct: 7 }, { stars: 2, pct: 3 }, { stars: 1, pct: 2 },
                            ]).map(row => (
                              <Group key={row.stars} gap={4} wrap="nowrap" align="center">
                                <Text size="10px" fw={600} c="gray.7" style={{ width: 8, textAlign: 'right' }}>{row.stars}</Text>
                                <Progress value={row.pct} size={5} radius="xl" color="orange" style={{ flex: 1 }} />
                                <Text size="9px" c="dimmed" style={{ width: 22, textAlign: 'right' }}>{row.pct}%</Text>
                              </Group>
                            ))}
                          </Stack>
                        </Group>

                        {/* Quality Metrics — Inline chips */}
                        <Group gap={6} mt="xs" justify="center">
                          {[
                            { label: 'Food', score: reviewStats.avgFood > 0 ? reviewStats.avgFood.toFixed(1) : '4.6' },
                            { label: 'Delivery', score: reviewStats.avgDelivery > 0 ? reviewStats.avgDelivery.toFixed(1) : '4.3' },
                            { label: 'Value', score: reviewStats.avgValue > 0 ? reviewStats.avgValue.toFixed(1) : '4.5' },
                          ].map(metric => (
                            <Badge key={metric.label} size="sm" variant="light" color="gray" radius="sm" style={{ textTransform: 'none' }}>
                              {metric.label} {metric.score}★
                            </Badge>
                          ))}
                        </Group>
                      </Box>

                      {/* Review Slider — Swipeable, no arrows */}
                      {(() => {
                        const mobileReviews = getDisplayReviews();
                        if (mobileReviews.length === 0) return null;
                        const safeIdx = Math.min(mobileReviewSlideIndex, mobileReviews.length - 1);
                        const review = mobileReviews[safeIdx];
                        return (
                          <>
                            <Box
                              p="sm"
                              style={{
                                borderRadius: 10,
                                border: '1px solid var(--mantine-color-gray-2)',
                                borderLeft: '3px solid #F97316',
                                background: 'white',
                                touchAction: 'pan-y',
                                userSelect: 'none',
                              }}
                              onTouchStart={(e) => { mobileTouchStartX.current = e.touches[0].clientX; }}
                              onTouchEnd={(e) => {
                                const diff = mobileTouchStartX.current - e.changedTouches[0].clientX;
                                if (Math.abs(diff) > 40) {
                                  if (diff > 0 && safeIdx < mobileReviews.length - 1) setMobileReviewSlideIndex(safeIdx + 1);
                                  else if (diff < 0 && safeIdx > 0) setMobileReviewSlideIndex(safeIdx - 1);
                                }
                              }}
                            >
                              <Group justify="space-between" align="flex-start" mb={6}>
                                <Group gap="xs" wrap="nowrap">
                                  <Avatar color={review.color} radius="xl" size="xs">{review.initial}</Avatar>
                                  <Stack gap={0}>
                                    <Group gap={4}>
                                      <Text size="xs" fw={600}>{review.name}</Text>
                                      <Badge size="xs" variant="dot" color="teal" style={{ textTransform: 'none' }}>Verified</Badge>
                                    </Group>
                                    <Text size="10px" c="dimmed">{review.orders} orders · {review.date}</Text>
                                  </Stack>
                                </Group>
                                <Group gap={1}>
                                  {[...Array(5)].map((_, i) => (
                                    <IconStarFilled key={i} size={10} style={{ color: i < review.stars ? '#F97316' : 'var(--mantine-color-gray-3)' }} />
                                  ))}
                                </Group>
                              </Group>

                              <Text size="xs" c="gray.7" lh={1.5} mb={6}>"{review.text}"</Text>

                              <Group justify="space-between" align="center">
                                <Group gap={4}>
                                  {review.items.map(item => (
                                    <Badge key={item} size="xs" variant="light" color="gray" radius="sm" style={{ textTransform: 'none' }}>{item}</Badge>
                                  ))}
                                </Group>
                                <Group gap={3}>
                                  <ActionIcon variant="subtle" color="gray" size="xs" radius="xl"><IconThumbUp size={10} /></ActionIcon>
                                  <Text size="10px" c="dimmed">{review.helpful}</Text>
                                </Group>
                              </Group>
                            </Box>

                            {/* Dot indicators only — no arrows */}
                            <Group justify="space-between" align="center" mt={8}>
                              <Group gap={3} justify="center" style={{ flex: 1 }}>
                                {mobileReviews.map((_, i) => (
                                  <Box key={i} onClick={() => setMobileReviewSlideIndex(i)} style={{ width: i === safeIdx ? 14 : 5, height: 5, borderRadius: 3, background: i === safeIdx ? '#F97316' : 'var(--mantine-color-gray-3)', cursor: 'pointer', transition: 'all 0.2s ease' }} />
                                ))}
                              </Group>
                              <Text size="10px" c="dimmed" fw={500}>{safeIdx + 1} / {mobileReviews.length}</Text>
                            </Group>
                          </>
                        );
                      })()}
                    </Box>
                  )}

                  {/* Frequently Ordered Section - Mobile */}
                  {!isSearchMode && frequentlyOrderedItems.length > 0 && (
                    <Box id="frequently-ordered-mobile" mb="xl" style={{ scrollMarginTop: '96px' }}>
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
                      <Box key={category.id} id={`${category.id}-mobile`} style={{ scrollMarginTop: '96px' }}>
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
                      <Button variant="outline" color="orange" size="xs" radius="xl" onClick={() => setShowReviewModal(true)}>
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
                            <Text style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1, color: 'var(--mantine-color-gray-9)', letterSpacing: '-0.04em' }}>{reviewStats.total > 0 ? reviewStats.avg : (restaurant?.rating || 4.4)}</Text>
                            <Group gap={2}>
                              {[1,2,3,4,5].map(i => {
                                const avg = reviewStats.total > 0 ? reviewStats.avg : (restaurant?.rating || 4.4);
                                return i <= Math.floor(avg)
                                  ? <IconStarFilled key={i} size={13} style={{ color: '#F97316' }} />
                                  : <IconStar key={i} size={13} style={{ color: '#F97316' }} />;
                              })}
                            </Group>
                            <Text size="xs" c="dimmed" fw={500}>{reviewStats.total > 0 ? `${reviewStats.total.toLocaleString()} ratings` : `${restaurant?.total_reviews || 0} ratings`}</Text>
                          </Stack>

                          <Divider w="100%" color="orange.1" />

                          <Stack gap={5} w="100%">
                            {(reviewStats.total > 0 ? reviewStats.distribution : [
                              { stars: 5, pct: 68 }, { stars: 4, pct: 20 }, { stars: 3, pct: 7 }, { stars: 2, pct: 3 }, { stars: 1, pct: 2 },
                            ]).map(row => (
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
                              { label: 'Food Quality', score: reviewStats.avgFood > 0 ? reviewStats.avgFood : 4.6 },
                              { label: 'Delivery', score: reviewStats.avgDelivery > 0 ? reviewStats.avgDelivery : 4.3 },
                              { label: 'Value', score: reviewStats.avgValue > 0 ? reviewStats.avgValue : 4.5 },
                            ].map(metric => (
                              <Group key={metric.label} justify="space-between" wrap="nowrap">
                                <Text size="xs" c="gray.6">{metric.label}</Text>
                                <Group gap={3}>
                                  <Text size="xs" fw={700} c="gray.8">{metric.score.toFixed(1)}</Text>
                                  <IconStarFilled size={9} style={{ color: '#F97316' }} />
                                </Group>
                              </Group>
                            ))}
                          </Stack>
                        </Stack>
                      </Box>

                      {/* Review Cards — Swipeable */}
                      {(() => {
                        const desktopReviews = getDisplayReviews();
                        if (desktopReviews.length === 0) return <Text c="dimmed" size="sm">No reviews yet. Be the first!</Text>;
                        const safeIdx = Math.min(reviewSlideIndex, desktopReviews.length - 1);
                        const review = desktopReviews[safeIdx];
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
                                touchAction: 'pan-y',
                                userSelect: 'none',
                                cursor: 'grab',
                              }}
                              onTouchStart={(e) => { desktopTouchStartX.current = e.touches[0].clientX; }}
                              onTouchEnd={(e) => {
                                const diff = desktopTouchStartX.current - e.changedTouches[0].clientX;
                                if (Math.abs(diff) > 40) {
                                  if (diff > 0 && safeIdx < desktopReviews.length - 1) setReviewSlideIndex(safeIdx + 1);
                                  else if (diff < 0 && safeIdx > 0) setReviewSlideIndex(safeIdx - 1);
                                }
                              }}
                              onMouseDown={(e) => { desktopTouchStartX.current = e.clientX; }}
                              onMouseUp={(e) => {
                                const diff = desktopTouchStartX.current - e.clientX;
                                if (Math.abs(diff) > 40) {
                                  if (diff > 0 && safeIdx < desktopReviews.length - 1) setReviewSlideIndex(safeIdx + 1);
                                  else if (diff < 0 && safeIdx > 0) setReviewSlideIndex(safeIdx - 1);
                                }
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

                            {/* Dot indicators only — no arrows */}
                            <Group justify="space-between" align="center">
                              <Group gap={4} justify="center" style={{ flex: 1 }}>
                                {desktopReviews.map((_, i) => (
                                  <Box
                                    key={i}
                                    onClick={() => setReviewSlideIndex(i)}
                                    style={{
                                      width: i === safeIdx ? 16 : 6,
                                      height: 6,
                                      borderRadius: 3,
                                      background: i === safeIdx ? '#F97316' : 'var(--mantine-color-gray-3)',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease',
                                    }}
                                  />
                                ))}
                              </Group>
                              <Text size="xs" c="dimmed" fw={500}>{safeIdx + 1} / {desktopReviews.length}</Text>
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

            {/* Floating Cart Button - Mobile (DoorDash Style) - Hidden when item modal is open */}
            {cartItems.length > 0 && !showItemModal && (
              <Box
                className="block lg:hidden"
                style={{
                  position: 'fixed',
                  bottom: 'calc(76px + env(safe-area-inset-bottom, 0px))',
                  left: 16,
                  right: 16,
                  zIndex: 1001,
                }}
              >
                <Button
                  fullWidth
                  size="lg"
                  color="orange"
                  radius="xl"
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
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                  }}
                  leftSection={
                    <Badge
                      color="white"
                      variant="filled"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        minWidth: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                    </Badge>
                  }
                  rightSection={
                    <Text fw={700} size="lg">
                      ${(cartItems.reduce((sum, item) => sum + item.quantity * item.price_cents, 0) / 100).toFixed(2)}
                    </Text>
                  }
                >
                  View Cart
                </Button>
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
            
            {/* Item Detail Modal — called as function to avoid remount on state change */}
            {TripleDipperModal()}

            {/* Mapbox CSS */}
            <link href='https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css' rel='stylesheet' />
          </Box>
        </Box>
      </Box>
      
      {/* Write Review Modal */}
      <Modal
        opened={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title={<Text fw={700} size="lg">Write a Review</Text>}
        size="md"
        radius="md"
        centered
        zIndex={10002}
      >
        <Stack gap="md">
          <Box>
            <Text size="sm" fw={600} mb={4}>Overall Rating *</Text>
            <Rating value={reviewRating} onChange={setReviewRating} size="lg" color="orange" />
          </Box>

          <Box>
            <Text size="sm" fw={600} mb={4}>Your Review</Text>
            <Textarea
              placeholder={`What did you enjoy about ${restaurant?.name || 'this restaurant'}?`}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.currentTarget.value)}
              minRows={3}
              maxRows={6}
              autosize
            />
          </Box>

          <Divider />

          <Text size="sm" fw={600} c="dimmed">Rate specific areas (optional)</Text>

          <Group grow>
            <Stack gap={4} align="center">
              <Text size="xs" c="dimmed">Food Quality</Text>
              <Rating value={reviewFoodQuality} onChange={setReviewFoodQuality} size="sm" color="orange" />
            </Stack>
            <Stack gap={4} align="center">
              <Text size="xs" c="dimmed">Delivery Speed</Text>
              <Rating value={reviewDeliverySpeed} onChange={setReviewDeliverySpeed} size="sm" color="orange" />
            </Stack>
            <Stack gap={4} align="center">
              <Text size="xs" c="dimmed">Order Accuracy</Text>
              <Rating value={reviewAccuracy} onChange={setReviewAccuracy} size="sm" color="orange" />
            </Stack>
          </Group>

          <Button
            color="orange"
            fullWidth
            radius="xl"
            size="md"
            loading={isSubmittingReview}
            disabled={reviewRating === 0}
            onClick={handleSubmitReview}
          >
            Submit Review
          </Button>
        </Stack>
      </Modal>

      {/* White Bar at Bottom — sized to match bottom nav */}
      <Box
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          width: '100%',
          backgroundColor: '#ffffff',
          height: 'calc(76px + env(safe-area-inset-bottom, 0px))',
          zIndex: 1000,
          borderTop: '1px solid #e5e7eb',
        }}
      />
    </Box>
  );
};

export default RestaurantMenuPage;
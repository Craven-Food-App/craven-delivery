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
} from "@tabler/icons-react";
import { supabase } from '@/integrations/supabase/client';
import cravenLogo from "@/assets/craven-logo.png";
import cravemoreIcon from "@/assets/cravemore-icon.png";
import { useCart } from '@/contexts/CartContext';

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
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      backgroundColor: isHeaderImageScrolled ? 'white' : 'transparent',
      overflow: 'visible',
      padding: isHeaderImageScrolled ? '12px 16px' : '56px 16px 16px 16px',
      pointerEvents: 'none',
      transition: 'all 0.3s ease-in-out',
      boxShadow: isHeaderImageScrolled ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
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

        return (
            <Modal
                opened={showItemModal}
                onClose={closeItemModal}
                fullScreen
                styles={{
                    body: { padding: 0 },
                    content: { height: '100%', maxHeight: '100%' },
                }}
            >
                <Box style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'white' }}>
                    {/* Food Image with Back Button */}
                    <Box style={{ position: 'relative', width: '100%', height: '300px', overflow: 'hidden' }}>
                        <MantineImage
                            src={selectedItem.image_url || 'https://placehold.co/600x300/CCCCCC/666666?text=Item'}
                            alt={selectedItem.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            fit="cover"
                        />
                        {/* Back Button Overlay */}
                        <ActionIcon
                            variant="filled"
                            color="white"
                            onClick={closeItemModal}
                                    style={{ 
                                position: 'absolute',
                                top: '16px',
                                left: '16px',
                                                        backgroundColor: 'white',
                                color: 'var(--mantine-color-gray-9)',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                            }}
                            size="lg"
                            radius="xl"
                        >
                            <IconChevronLeft size={24} />
                        </ActionIcon>
                                        </Box>

                    {/* Scrollable Content */}
                    <ScrollArea 
                        style={{ flex: 1 }}
                        ref={modalScrollRef}
                    >
                        <Box p="md" pb="120px">
                            {/* Dynamically render modifier sections based on modifier_type */}
                            {Object.entries(modifiersByType).map(([type, modifiers]) => {
                                // Get display name for modifier type
                                const typeDisplayNames: Record<string, string> = {
                                    'side': 'Sides',
                                    'addon': 'Add-ons',
                                    'beverage': 'Recommended Beverages',
                                    'dessert': 'Recommended Desserts',
                                    'app': 'Recommended Sides And Apps',
                                    'size': 'Size',
                                    'preparation': 'Preparation',
                                    'removal': 'Remove Items',
                                    'substitution': 'Substitutions',
                                };
                                
                                const displayName = typeDisplayNames[type] || type.charAt(0).toUpperCase() + type.slice(1);
                                const maxSelections = modifiers[0]?.max_selections;
                                const isRequired = modifiers[0]?.is_required || false;
                                
                                return renderModifierSection(type, displayName, maxSelections);
                            })}

                            {/* Special Instructions */}
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
                                        placeholder="Add special instructions..."
                                        value={specialInstructions}
                                        onChange={(e) => setSpecialInstructions(e.target.value)}
                                        multiline
                                        rows={3}
                                    />
                                )}
                            </Box>

                            {/* Quantity Selector */}
                            <Group justify="center" mb="lg">
                        <ActionIcon
                                    variant="light"
                            color="gray"
                            radius="xl"
                                    type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                        // Find the scroll viewport element
                                        const scrollContainer = modalScrollRef.current?.querySelector('.mantine-ScrollArea-viewport') as HTMLElement;
                                        const scrollPosition = scrollContainer?.scrollTop || 0;
                                        
                                        setModalQuantity((prev) => Math.max(1, prev - 1));
                                        
                                        // Restore scroll position after render
                                        requestAnimationFrame(() => {
                                            if (scrollContainer) {
                                                scrollContainer.scrollTop = scrollPosition;
                                            }
                                        });
                                    }}
                                    size="lg"
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
                                        // Find the scroll viewport element
                                        const scrollContainer = modalScrollRef.current?.querySelector('.mantine-ScrollArea-viewport') as HTMLElement;
                                        const scrollPosition = scrollContainer?.scrollTop || 0;
                                        
                                        setModalQuantity((prev) => prev + 1);
                                        
                                        // Restore scroll position after render
                                        requestAnimationFrame(() => {
                                            if (scrollContainer) {
                                                scrollContainer.scrollTop = scrollPosition;
                                            }
                                        });
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
                            padding: '16px',
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
    <Box style={{ minHeight: '100vh', backgroundColor: 'white' }}>
      {/* Mobile Header - DoorDash Style */}
      <MobileHeader 
        restaurant={restaurant}
        isHeaderImageScrolled={isHeaderImageScrolled}
        onBack={() => navigate('/restaurants')}
        onShare={() => {
          if (navigator.share) {
            navigator.share({
              title: restaurant?.name,
              text: `Check out ${restaurant?.name} on Crave'N`,
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
        cartCount={cartCount}
        onCartClick={() => navigate('/checkout')}
      />

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
        <Box style={{ flex: 1, position: 'relative' }}>
          <Box style={{ backgroundColor: 'white', minHeight: '100vh' }}>
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
                        backgroundColor: 'var(--mantine-color-gray-1)',
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

                  {/* Reviews Section - Mobile */}
                  {!isSearchMode && (
                    <Box id="reviews-mobile" mb="xl" style={{ scrollMarginTop: '96px' }}>
                      <Group justify="space-between" align="center" mb="md">
                        <Stack gap={4}>
                          <Title order={2} size="xl" fw={700}>Reviews</Title>
                          <Text size="sm" c="dimmed">3k+ ratings • 80+ public reviews</Text>
                        </Stack>
                        <Button variant="subtle" color="orange" size="sm">
                          Add Review
                        </Button>
                      </Group>

                      {/* Overall Rating Card */}
                      <Card
                        p="md"
                        withBorder
                        shadow="lg"
                        mb="md"
                      >
                        <Stack align="center" gap="sm">
                          <RingProgress
                            size={80}
                            thickness={8}
                            sections={[{ value: 88, color: 'yellow' }]}
                            label={
                              <Stack align="center" gap={2}>
                                <Text size="xl" fw={700}>4.4</Text>
                                <IconStar size={14} style={{ color: 'var(--mantine-color-gray-4)' }} />
                              </Stack>
                            }
                          />
                          <Text size="sm" c="dimmed" ta="center">of 5 stars</Text>
                        </Stack>
                      </Card>

                      {/* Individual Review Cards - Horizontal Scroll */}
                      <ScrollArea scrollbars="x" ref={reviewsScrollRef}>
                        <Group gap="md" style={{ flexWrap: 'nowrap' }} pb="md">
                          {/* Review Card 1 */}
                          <Card
                            p="md"
                            withBorder
                            shadow="lg"
                            style={{ minWidth: '280px', flexShrink: 0 }}
                          >
                            <Group align="flex-start" gap="sm" mb="sm">
                              <Avatar color="blue" radius="xl">M</Avatar>
                              <Stack gap={4} style={{ flex: 1 }}>
                                  <Group gap="xs">
                                  <Text size="sm" fw={600}>Marcus T</Text>
                                  <IconChevronLeft size={12} style={{ color: 'var(--mantine-color-gray-4)', transform: 'rotate(90deg)' }} />
                                  </Group>
                                <Text size="xs" c="dimmed">Regular Customer • 12 orders</Text>
                              </Stack>
                                </Group>
                            <Group gap="xs" mb="xs">
                              <Group gap={2}>
                                {[...Array(5)].map((_, i) => (
                                  <IconStar key={i} size={14} style={{ color: 'var(--mantine-color-yellow-5)', fill: 'var(--mantine-color-yellow-5)' }} />
                                ))}
                              </Group>
                              <Text size="xs" c="dimmed">11/15/23</Text>
                              <Text size="xs" c="dimmed">• Craven order</Text>
                            </Group>
                            <Text size="sm" c="gray.7">
                              This place never disappoints! <Text component="span" fw={600}>Classic Burger</Text> is always fresh and the delivery is super quick. Highly recommend!
                            </Text>
                          </Card>
                          
                          {/* Review Card 2 */}
                          <Card
                            p="md"
                            withBorder
                            shadow="lg"
                            style={{ minWidth: '280px', flexShrink: 0 }}
                          >
                            <Group align="flex-start" gap="sm" mb="sm">
                              <Avatar color="violet" radius="xl">S</Avatar>
                              <Stack gap={4} style={{ flex: 1 }}>
                                <Group gap="xs">
                                  <Text size="sm" fw={600}>Sarah K</Text>
                                  <IconChevronLeft size={12} style={{ color: 'var(--mantine-color-gray-4)', transform: 'rotate(90deg)' }} />
                                </Group>
                                <Text size="xs" c="dimmed">Food Lover • 8 reviews</Text>
                              </Stack>
                            </Group>
                            <Group gap="xs" mb="xs">
                              <Group gap={2}>
                                {[...Array(5)].map((_, i) => (
                                  <IconStar key={i} size={14} style={{ color: 'var(--mantine-color-yellow-5)', fill: 'var(--mantine-color-yellow-5)' }} />
                                ))}
                              </Group>
                              <Text size="xs" c="dimmed">10/28/23</Text>
                              <Text size="xs" c="dimmed">• Craven order</Text>
                            </Group>
                            <Text size="sm" c="gray.7">
                              Amazing food! <Text component="span" fw={600}>Chicken Sandwich</Text> was perfectly cooked and the <Text component="span" fw={600}>seasoned fries</Text> were incredible. Will definitely order again!
                            </Text>
                          </Card>
                          
                          {/* Review Card 3 */}
                          <Card
                            p="md"
                            withBorder
                            shadow="lg"
                            style={{ minWidth: '280px', flexShrink: 0 }}
                          >
                            <Group align="flex-start" gap="sm" mb="sm">
                              <Avatar color="orange" radius="xl">D</Avatar>
                              <Stack gap={4} style={{ flex: 1 }}>
                                <Group gap="xs">
                                  <Text size="sm" fw={600}>David M</Text>
                                  <IconChevronLeft size={12} style={{ color: 'var(--mantine-color-gray-4)', transform: 'rotate(90deg)' }} />
                                </Group>
                                <Text size="xs" c="dimmed">New Customer • 3 orders</Text>
                              </Stack>
                            </Group>
                            <Group gap="xs" mb="xs">
                              <Group gap={2}>
                                {[...Array(5)].map((_, i) => (
                                  <IconStar key={i} size={14} style={{ color: 'var(--mantine-color-yellow-5)', fill: 'var(--mantine-color-yellow-5)' }} />
                                ))}
                              </Group>
                              <Text size="xs" c="dimmed">12/02/23</Text>
                              <Text size="xs" c="dimmed">• Craven order</Text>
                            </Group>
                            <Text size="sm" c="gray.7">
                              First time ordering and I'm impressed! <Text component="span" fw={600}>Fish Sandwich</Text> was crispy and fresh. The <Text component="span" fw={600}>onion rings</Text> were the perfect side. Great value!
                            </Text>
                          </Card>
                        </Group>
                      </ScrollArea>
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

                  {/* Reviews Section - Desktop */}
                  <Box id="reviews" mb="xl" style={{ scrollMarginTop: '80px', marginTop: '-80px', paddingTop: '80px' }}>
                    <Group justify="space-between" align="center" mb="lg">
                      <Stack gap={4}>
                        <Title order={2} size="2xl" fw={700} c="gray.8">Reviews</Title>
                        <Text size="sm" c="dimmed">3k+ ratings • 80+ public reviews</Text>
                      </Stack>
                      <Group gap="xs">
                        <Button variant="subtle" color="orange" size="sm">
                          Add Review
                        </Button>
                        <Group gap="xs">
                          <ActionIcon
                            variant="light"
                            color="gray"
                            radius="xl"
                            onClick={scrollReviewsLeft}
                          >
                            <IconChevronLeft size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="light"
                            color="gray"
                            radius="xl"
                            onClick={scrollReviewsRight}
                          >
                            <IconChevronLeft size={16} style={{ transform: 'rotate(180deg)' }} />
                          </ActionIcon>
                        </Group>
                      </Group>
                    </Group>

                    <Group align="flex-start" gap="lg">
                      {/* Overall Rating Card */}
                      <Card
                        p="xl"
                        withBorder
                        shadow="lg"
                        style={{ flexShrink: 0, width: '192px' }}
                      >
                        <Stack align="center" gap="md">
                          {/* Circular Rating Display */}
                          <RingProgress
                            size={96}
                            thickness={8}
                            sections={[{ value: 88, color: 'yellow' }]}
                            label={
                              <Stack align="center" gap={4}>
                                <Text size="2xl" fw={700}>4.4</Text>
                                <IconStar size={16} style={{ color: 'var(--mantine-color-gray-4)' }} />
                              </Stack>
                            }
                          />
                          <Text size="sm" c="dimmed" ta="center">of 5 stars</Text>
                        </Stack>
                      </Card>

                      {/* Individual Review Cards - Horizontal Scroll */}
                      <ScrollArea scrollbars="x" ref={reviewsScrollRef} style={{ flex: 1 }}>
                        <Group gap="md" style={{ flexWrap: 'nowrap' }} pb="md">
                          {/* Review Card 1 */}
                          <Card
                            p="md"
                            withBorder
                            shadow="lg"
                            style={{ minWidth: '320px', flexShrink: 0 }}
                          >
                            <Group align="flex-start" gap="sm" mb="sm">
                              <Avatar color="blue" radius="xl">M</Avatar>
                              <Stack gap={4} style={{ flex: 1 }}>
                                <Group gap="xs">
                                  <Text size="sm" fw={600}>Marcus T</Text>
                                  <IconChevronLeft size={12} style={{ color: 'var(--mantine-color-gray-4)', transform: 'rotate(90deg)' }} />
                                </Group>
                                <Text size="xs" c="dimmed">Regular Customer • 12 orders</Text>
                              </Stack>
                            </Group>
                            <Group gap="xs" mb="xs">
                              <Group gap={2}>
                                {[...Array(5)].map((_, i) => (
                                  <IconStar key={i} size={16} style={{ color: 'var(--mantine-color-yellow-5)', fill: 'var(--mantine-color-yellow-5)' }} />
                                ))}
                              </Group>
                              <Text size="sm" c="dimmed">11/15/23</Text>
                              <Text size="sm" c="dimmed">• Craven order</Text>
                            </Group>
                            <Text size="sm" c="gray.7">
                              This place never disappoints! <Text component="span" fw={600}>Classic Burger</Text> is always fresh and the delivery is super quick. Highly recommend!
                            </Text>
                          </Card>
                          
                          {/* Review Card 2 */}
                          <Card
                            p="md"
                            withBorder
                            shadow="lg"
                            style={{ minWidth: '320px', flexShrink: 0 }}
                          >
                            <Group align="flex-start" gap="sm" mb="sm">
                              <Avatar color="violet" radius="xl">S</Avatar>
                              <Stack gap={4} style={{ flex: 1 }}>
                                <Group gap="xs">
                                  <Text size="sm" fw={600}>Sarah K</Text>
                                  <IconChevronLeft size={12} style={{ color: 'var(--mantine-color-gray-4)', transform: 'rotate(90deg)' }} />
                                </Group>
                                <Text size="xs" c="dimmed">Food Lover • 8 reviews</Text>
                              </Stack>
                            </Group>
                            <Group gap="xs" mb="xs">
                              <Group gap={2}>
                                {[...Array(5)].map((_, i) => (
                                  <IconStar key={i} size={16} style={{ color: 'var(--mantine-color-yellow-5)', fill: 'var(--mantine-color-yellow-5)' }} />
                                ))}
                              </Group>
                              <Text size="sm" c="dimmed">10/28/23</Text>
                              <Text size="sm" c="dimmed">• Craven order</Text>
                            </Group>
                            <Text size="sm" c="gray.7">
                              Amazing food! <Text component="span" fw={600}>Chicken Sandwich</Text> was perfectly cooked and the <Text component="span" fw={600}>seasoned fries</Text> were incredible. Will definitely order again!
                            </Text>
                          </Card>
                          
                          {/* Review Card 3 */}
                          <Card
                            p="md"
                            withBorder
                            shadow="lg"
                            style={{ minWidth: '320px', flexShrink: 0 }}
                          >
                            <Group align="flex-start" gap="sm" mb="sm">
                              <Avatar color="orange" radius="xl">D</Avatar>
                              <Stack gap={4} style={{ flex: 1 }}>
                                <Group gap="xs">
                                  <Text size="sm" fw={600}>David M</Text>
                                  <IconChevronLeft size={12} style={{ color: 'var(--mantine-color-gray-4)', transform: 'rotate(90deg)' }} />
                                </Group>
                                <Text size="xs" c="dimmed">New Customer • 3 orders</Text>
                              </Stack>
                            </Group>
                            <Group gap="xs" mb="xs">
                              <Group gap={2}>
                                {[...Array(5)].map((_, i) => (
                                  <IconStar key={i} size={16} style={{ color: 'var(--mantine-color-yellow-5)', fill: 'var(--mantine-color-yellow-5)' }} />
                                ))}
                              </Group>
                              <Text size="sm" c="dimmed">12/02/23</Text>
                              <Text size="sm" c="dimmed">• Craven order</Text>
                            </Group>
                            <Text size="sm" c="gray.7">
                              First time ordering and I'm impressed! <Text component="span" fw={600}>Fish Sandwich</Text> was crispy and fresh. The <Text component="span" fw={600}>onion rings</Text> were the perfect side. Great value!
                            </Text>
                          </Card>
                        </Group>
                      </ScrollArea>
                    </Group>
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

            {/* Floating Cart Button - Mobile (DoorDash Style) */}
            {cartItems.length > 0 && (
              <Box
                className="block lg:hidden"
                style={{
                  position: 'fixed',
                  bottom: 24,
                  left: 16,
                  right: 16,
                  zIndex: 50,
                  paddingBottom: 'env(safe-area-inset-bottom)',
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

            {/* Floating Cart Button - Desktop */}
            {cartItems.length > 0 && showCartButton && (
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
            
            {/* Triple Dipper Modal */}
            <TripleDipperModal />

            {/* Mapbox CSS */}
            <link href='https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css' rel='stylesheet' />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default RestaurantMenuPage;
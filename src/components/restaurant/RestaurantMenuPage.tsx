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
const MobileHeader = ({ restaurant, onBack, onShare }: { restaurant: Restaurant | null; onBack: () => void; onShare: () => void }) => (
  <Box
    style={{
      display: 'block',
      '@media (min-width: 1024px)': { display: 'none' },
      position: 'sticky',
      top: 0,
      zIndex: 50,
      backgroundColor: 'white',
      borderBottom: '1px solid var(--mantine-color-gray-3)',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    }}
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
      <ActionIcon
        variant="subtle"
        onClick={onShare}
        style={{ marginRight: '-8px' }}
      >
        <IconShare size={20} style={{ color: 'var(--mantine-color-gray-6)' }} />
      </ActionIcon>
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
  
    const [activeSection, setActiveSection] = useState('featured');
    const [isMenuFixed, setIsMenuFixed] = useState(false);
    const [deliveryMethod, setDeliveryMethod] = useState('delivery' as 'delivery' | 'pickup');
    // Use deliveryMethod for both mobile and desktop - synced state
           const [pickupInfo, setPickupInfo] = useState({
               address: '',
               driveTime: 0,
               readyTime: 0
           });
           const [showItemModal, setShowItemModal] = useState(false);
           const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
           const [modalQuantity, setModalQuantity] = useState(1);
           const reviewsScrollRef = useRef<HTMLDivElement>(null);

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

    // Set pickup info when restaurant data is loaded
  useEffect(() => {
        if (restaurant && deliveryMethod === 'pickup') {
            setPickupInfo({
                address: restaurant.address,
                driveTime: Math.floor(Math.random() * 10) + 5, // Random 5-15 min drive time
                readyTime: restaurant.min_delivery_time || 15
            });
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

      setMenuItems(
        (menuData || []).map((item: any) => ({
          ...item,
          spice_level: item.spice_level !== undefined && item.spice_level !== null
            ? Number(item.spice_level)
            : undefined
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

        const sections = ['featured', 'most-ordered', 'reviews', ...categories.map(c => c.id)];
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
        const section = document.getElementById(sectionId);
        if (section) {
            const offset = tabsRef.current ? tabsRef.current.offsetHeight + 16 : 100;
            window.scrollTo({
                top: section.offsetTop - offset,
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
           }, []);

           const closeItemModal = useCallback(() => {
               setShowItemModal(false);
               setSelectedItem(null);
               setModalQuantity(1);
           }, []);

           const addToCartFromModal = useCallback(async () => {
               if (selectedItem && restaurant?.id) {
                   const cartItem = {
                       id: selectedItem.id,
                       name: selectedItem.name,
                       price_cents: selectedItem.price_cents,
                       quantity: modalQuantity,
                       modifiers: [],
                       special_instructions: undefined,
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
    const featuredItems = menuItems.filter(item => item.is_featured);
    const mostOrderedItems = menuItems
        .filter(item => item.order_count && item.order_count > 0)
        .sort((a, b) => (b.order_count || 0) - (a.order_count || 0))
        .slice(0, 8);

    const getItemsByCategory = (categoryId: string) => {
        return menuItems.filter(item => item.category_id === categoryId);
    };

    const formatPrice = (cents: number) => {
        return `$${(cents / 100).toFixed(2)}`;
    };

    // Sidebar links
    const sidebarLinks = [
        { id: 'featured', label: 'Featured Items', href: '#featured' },
        { id: 'most-ordered', label: 'Most Ordered', href: '#most-ordered' },
        ...categories.map(cat => ({
            id: cat.id,
            label: cat.name,
            href: `#${cat.id}`
        })),
        { id: 'reviews', label: 'Reviews', href: '#reviews' }
    ];

    // --- UI Components ---
    const MenuItemCard = ({ item }: { item: MenuItem }) => {
        const rating = item.order_count ? Math.min(95, 75 + Math.floor(item.order_count / 10)) : 85;
        const reviews = item.order_count || Math.floor(Math.random() * 200) + 50;

        return (
            <Card
                p={0}
                withBorder
                shadow="md"
                style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
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
            </Card>
        );
    };

    const PickupInterface = () => {
        const mapContainer = useRef<HTMLDivElement>(null);
        const map = useRef<any>(null);
        const [mapLoaded, setMapLoaded] = useState(false);

        useEffect(() => {
            if (deliveryMethod === 'pickup' && restaurant && mapContainer.current && !mapLoaded) {
                initializePickupMap();
            }
        }, [deliveryMethod, restaurant, mapLoaded]);

        const initializePickupMap = async () => {
            if (!mapContainer.current) {
                console.log('Map container not found');
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
            if (!mapContainer.current || !window.mapboxgl) return;

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
        };

        return (
            <Card p="sm" mb="lg" withBorder shadow="md">
                <Stack gap="md">
                    {/* Pickup Time Info */}
                    <Group justify="space-between" align="center">
                        <Stack gap={0}>
                            <Text size="lg" fw={700} c="gray.9">{pickupInfo.readyTime} min</Text>
                            <Text size="sm" c="dimmed">ready for pickup</Text>
                        </Stack>
                        <Badge color="green" size="lg">$0 delivery fee</Badge>
                    </Group>
                    
                    {/* Main Content - Address and Map */}
                    <Group align="stretch" gap="md">
                        {/* Address and Info - Left Side */}
                        <Stack justify="space-between" style={{ minWidth: '200px', flex: 1 }}>
                            <Stack gap="xs">
                                <Text size="sm" fw={600} c="gray.9">
                                    Pick up this order at:
                                </Text>
                                <Text size="sm" c="blue.6" td="underline" style={{ cursor: 'pointer' }}>
                                    {pickupInfo.address || restaurant.address}
                                </Text>
                                <Group gap="xs">
                                    <IconCar size={16} style={{ color: 'var(--mantine-color-gray-6)' }} />
                                    <Text size="sm" c="dimmed">{pickupInfo.driveTime} min drive</Text>
                                </Group>
                            </Stack>
                        </Stack>

                        {/* Map Container - Right Side */}
                        <Box style={{ flex: 1, height: '200px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--mantine-color-gray-3)', backgroundColor: '#f5f5f5' }}>
                            {restaurant.latitude && restaurant.longitude ? (
                                <Box 
                                    ref={mapContainer} 
                                    style={{ width: '100%', height: '100%', minHeight: '200px' }}
                                />
                            ) : (
                                <Stack align="center" justify="center" h="100%">
                                    <IconMapPin size={32} style={{ color: 'var(--mantine-color-gray-5)' }} />
                                    <Text size="sm" c="dimmed">Map unavailable</Text>
                                    <Text size="xs" c="dimmed">{restaurant.address}</Text>
                                </Stack>
                            )}
                        </Box>
                    </Group>
                </Stack>
            </Card>
        );
    };

    const TripleDipperModal = () => {
        if (!showItemModal || !selectedItem) return null;

        return (
            <Modal
                opened={showItemModal}
                onClose={closeItemModal}
                size="lg"
                centered
                styles={{
                    body: { maxHeight: '80vh', overflowY: 'auto' },
                }}
            >
                {/* Header */}
                <Group justify="space-between" align="flex-start" mb="md" pb="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
                    <Stack gap="xs" style={{ flex: 1 }}>
                        <Title order={3} size="lg" fw={700}>{selectedItem.name}</Title>
                        <Text size="xs" c="dimmed">77% (213)</Text>
                        <Text size="xs" c="gray.7">Select three appetizers and enjoy! Served with dipping sauces.</Text>
                    </Stack>
                    <ActionIcon variant="subtle" color="gray" onClick={closeItemModal}>
                        <IconX size={20} />
                    </ActionIcon>
                </Group>
            
                {/* Food Image */}
                <Box mb="md">
                    <MantineImage
                        src={selectedItem.image_url || 'https://placehold.co/600x300/CCCCCC/666666?text=Triple+Dipper'}
                        alt={selectedItem.name}
                        style={{ width: '100%', height: '144px', objectFit: 'cover' }}
                        fit="cover"
                        radius="md"
                    />
                </Box>

                {/* Recommended Options */}
                <Stack gap="md" mb="md">
                    <Group justify="space-between" align="center">
                        <Text size="md" fw={600}>Your recommended options</Text>
                        <Group gap="xs">
                            <ActionIcon variant="subtle" color="gray" size="sm">‹</ActionIcon>
                            <ActionIcon variant="subtle" color="gray" size="sm">›</ActionIcon>
                        </Group>
                    </Group>

                    {/* Option #1 (Selected) */}
                    <Card p="md" style={{ backgroundColor: 'var(--mantine-color-gray-0)', border: '2px solid var(--mantine-color-orange-6)' }}>
                        <Group justify="space-between" align="flex-start">
                            <Stack gap="xs" style={{ flex: 1 }}>
                                <Group justify="space-between" align="center">
                                    <Text size="sm" fw={700}>#1 • Ordered recently by 10+ others</Text>
                                    <Box
                                        style={{
                                            width: '16px',
                                            height: '16px',
                                            border: '2px solid var(--mantine-color-orange-6)',
                                            borderRadius: '50%',
                                            backgroundColor: 'var(--mantine-color-orange-6)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Box
                                            style={{
                                                width: '8px',
                                                height: '8px',
                                                backgroundColor: 'white',
                                                borderRadius: '50%',
                                            }}
                                        />
                                    </Box>
                                </Group>
                                <Text size="sm" c="gray.7">
                                    Big Mouth® Bites • Ranch • Bacon Crumbles • Sauteed Onion • American Cheese • Ranch...
                                </Text>
                                <Text size="lg" fw={700}>$16.89</Text>
                            </Stack>
                        </Group>
                    </Card>

                    {/* Option #2 (Partially Visible) */}
                    <Card p="md" withBorder>
                        <Group justify="space-between" align="flex-start">
                            <Stack gap="xs" style={{ flex: 1 }}>
                                <Group justify="space-between" align="center">
                                    <Text size="sm" fw={700}>#2 • Ordered recently by others</Text>
                                    <Box
                                        style={{
                                            width: '16px',
                                            height: '16px',
                                            border: '2px solid var(--mantine-color-gray-3)',
                                            borderRadius: '50%',
                                        }}
                                    />
                                </Group>
                                <Text size="sm" c="gray.7">
                                    Southwestern Eggrolls • Big Mouth® Bites • Ranch...
                                </Text>
                                <Text size="lg" fw={700}>$16.89</Text>
                            </Stack>
                        </Group>
                    </Card>
                </Stack>
      
                {/* Tabs */}
                <Tabs defaultValue="order" mb="md">
                    <Tabs.List>
                        <Tabs.Tab value="order">Order</Tabs.Tab>
                        <Tabs.Tab value="reviews">Reviews (8)</Tabs.Tab>
                    </Tabs.List>

                    {/* Order Content */}
                    <Tabs.Panel value="order" pt="md">
                        <Stack gap="md">
                            <Stack gap="xs">
                                <Text size="md" fw={600}>Selection 1</Text>
                                <Text size="sm" c="dimmed">Required • Select 1</Text>
                            </Stack>
                            
                            <Stack gap="sm">
                                <Card p="sm" withBorder style={{ cursor: 'pointer' }}>
                                    <Group justify="space-between">
                                        <Text size="sm" fw={500}>Big Mouth® Bites</Text>
                                        <Box
                                            style={{
                                                width: '16px',
                                                height: '16px',
                                                border: '2px solid var(--mantine-color-gray-3)',
                                                borderRadius: '50%',
                                            }}
                                        />
                                    </Group>
                                </Card>
                                <Card p="sm" withBorder style={{ cursor: 'pointer' }}>
                                    <Group justify="space-between">
                                        <Text size="sm" fw={500}>Southwestern Eggrolls</Text>
                                        <Box
                                            style={{
                                                width: '16px',
                                                height: '16px',
                                                border: '2px solid var(--mantine-color-gray-3)',
                                                borderRadius: '50%',
                                            }}
                                        />
                                    </Group>
                                </Card>
                            </Stack>
                        </Stack>
                    </Tabs.Panel>
                </Tabs>

                {/* Bottom Action Bar */}
                <Group justify="space-between" p="md" style={{ backgroundColor: 'var(--mantine-color-gray-0)', borderRadius: '8px' }}>
                    <Group gap="md">
                        <ActionIcon
                            variant="outline"
                            color="gray"
                            radius="xl"
                            onClick={() => setModalQuantity(Math.max(1, modalQuantity - 1))}
                        >
                            <IconMinus size={16} />
                        </ActionIcon>
                        <Text size="lg" fw={600}>{modalQuantity}</Text>
                        <ActionIcon
                            variant="outline"
                            color="gray"
                            radius="xl"
                            onClick={() => setModalQuantity(modalQuantity + 1)}
                        >
                            <IconPlus size={16} />
                        </ActionIcon>
                    </Group>
                    <Button
                        color="orange"
                        onClick={addToCartFromModal}
                    >
                        Add to cart - {formatPrice(selectedItem.price_cents * modalQuantity)}
                    </Button>
                </Group>
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
      style={{
        display: 'none',
        '@media (min-width: 1024px)': { display: 'block' },
        ...(isMenuFixed ? {
          position: 'fixed',
          top: 4,
          left: '50%',
          transform: 'translateX(-50%)',
          '@media (min-width: 1024px)': {
            left: 'auto',
            transform: 'none',
            maxWidth: 'calc(25% - 1rem)',
          },
          '@media (min-width: 1280px)': {
            maxWidth: 'calc((1120px * 0.25) - 1rem)',
          },
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
      />

      {/* Desktop Header - Hidden on Mobile */}
      <Box
        style={{
          display: 'none',
          '@media (min-width: 1024px)': { display: 'block' },
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
                style={{
                  display: 'block',
                  '@media (min-width: 1024px)': { display: 'none' },
                }}
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
          style={{
            display: 'none',
            '@media (min-width: 1024px)': { display: 'block' },
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
          <Box style={{ backgroundColor: 'var(--mantine-color-gray-0)', minHeight: '100vh' }}>
            <Box style={{ maxWidth: '1280px', margin: '0 auto' }}>
              {/* --- Mobile Hero Section (DoorDash Style) --- */}
              <Box
                style={{
                  display: 'block',
                  '@media (min-width: 1024px)': { display: 'none' },
                }}
              >
                {/* Hero Image */}
                <Box style={{ position: 'relative', height: '192px' }}>
                  <MantineImage
                    src={restaurant.header_image_url || restaurant.image_url || 'https://placehold.co/600x300/A31D24/ffffff?text=Restaurant'}
                    alt={restaurant.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    fit="cover"
                  />
                </Box>
                
                {/* Restaurant Info Card - Overlapping (DoorDash signature style) */}
                <Card
                  p="md"
                  withBorder
                  shadow="xl"
                  style={{
                    margin: '0 16px',
                    marginTop: '-32px',
                    position: 'relative',
                    zIndex: 10,
                    borderRadius: '16px',
                  }}
                >
                  <Group align="flex-start" gap="sm" mb="md">
                    <Box
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '12px',
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

                  {/* Delivery/Pickup Toggle - Mobile */}
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
                </Card>

                {/* Pickup Interface - Mobile - Show when pickup is selected */}
                {deliveryMethod === 'pickup' && (
                  <Box px="md" pb="md">
                    <PickupInterface />
                  </Box>
                )}

                {/* Sticky Category Tabs - Mobile */}
                <ScrollArea
                  style={{
                    position: 'sticky',
                    top: '48px',
                    zIndex: 40,
                    backgroundColor: 'white',
                    borderBottom: '1px solid var(--mantine-color-gray-3)',
                    margin: '0 -16px',
                    padding: '0 16px',
                  }}
                  scrollbars="x"
                >
                  <Group gap="xs" py="sm" style={{ flexWrap: 'nowrap' }}>
                    {featuredItems.length > 0 && (
                      <Button
                        variant={activeSection === 'featured' ? 'filled' : 'light'}
                        color={activeSection === 'featured' ? 'dark' : 'gray'}
                        size="sm"
                        radius="xl"
                        onClick={() => scrollToSection('featured')}
                        style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                      >
                        ⭐ Featured
                      </Button>
                    )}
                    {mostOrderedItems.length > 0 && (
                      <Button
                        variant={activeSection === 'most-ordered' ? 'filled' : 'light'}
                        color={activeSection === 'most-ordered' ? 'dark' : 'gray'}
                        size="sm"
                        radius="xl"
                        onClick={() => scrollToSection('most-ordered')}
                        style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                      >
                        🔥 Most Ordered
                      </Button>
                    )}
                    {categories.map(category => (
                      <Button
                        key={category.id}
                        variant={activeSection === category.id ? 'filled' : 'light'}
                        color={activeSection === category.id ? 'dark' : 'gray'}
                        size="sm"
                        radius="xl"
                        onClick={() => scrollToSection(category.id)}
                        style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                      >
                        {category.name}
                      </Button>
                    ))}
                  </Group>
                </ScrollArea>

                {/* Mobile Menu Items - Compact List */}
                <Stack gap="lg" p="md">
                  {/* Featured Items - Mobile */}
                  {featuredItems.length > 0 && (
                    <Box id="featured-mobile" style={{ scrollMarginTop: '96px' }}>
                      <Title order={2} size="xl" fw={700} mb="md">Featured Items</Title>
                      <Stack gap="sm">
                        {featuredItems.map(item => (
                          <Card
                            key={item.id}
                            p="sm"
                            withBorder
                            style={{ cursor: 'pointer' }}
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
                          </Card>
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {/* Most Ordered - Mobile */}
                  {mostOrderedItems.length > 0 && (
                    <Box id="most-ordered-mobile" style={{ scrollMarginTop: '96px' }}>
                      <Title order={2} size="xl" fw={700} mb="md">Most Ordered</Title>
                      <Stack gap="sm">
                        {mostOrderedItems.map(item => (
                          <Card
                            key={item.id}
                            p="sm"
                            withBorder
                            style={{ cursor: 'pointer' }}
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
                          </Card>
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {/* Category Sections - Mobile */}
                  {categories.map(category => {
                    const items = getItemsByCategory(category.id);
                    if (items.length === 0) return null;
                    
                    return (
                      <Box key={category.id} id={`${category.id}-mobile`} style={{ scrollMarginTop: '96px' }}>
                        <Title order={2} size="xl" fw={700} mb="md">{category.name}</Title>
                        <Stack gap="sm">
                          {items.map(item => (
                            <Card
                              key={item.id}
                              p="sm"
                              withBorder
                              style={{ cursor: 'pointer' }}
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
                            </Card>
                          ))}
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>

              {/* --- Desktop Header Image Banner --- */}
              <Box
                style={{
                  display: 'none',
                  '@media (min-width: 1024px)': { display: 'block' },
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
              style={{
                display: 'none',
                '@media (min-width: 1024px)': { display: 'block' },
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

                  {/* Reviews Section */}
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

                  {/* Featured Items */}
                  {featuredItems.length > 0 && (
                    <Box id="featured" mb="xl" style={{ scrollMarginTop: '80px', marginTop: '-80px', paddingTop: '80px' }}>
                      <Title order={2} size="2xl" fw={700} c="gray.8" mb="md">Featured Items</Title>
                      <Grid gutter="sm">
                        {featuredItems.map(item => (
                          <Grid.Col key={item.id} span={{ base: 6, sm: 4, md: 3, lg: 2.4, xl: 2 }}>
                            <MenuItemCard item={item} />
                          </Grid.Col>
                        ))}
                      </Grid>
                      <Divider mt="lg" />
                    </Box>
                  )}

                  {/* Most Ordered */}
                  {mostOrderedItems.length > 0 && (
                    <Box id="most-ordered" mb="xl" style={{ scrollMarginTop: '80px', marginTop: '-80px', paddingTop: '80px' }}>
                      <Title order={2} size="2xl" fw={700} c="gray.8" mb="md">Most Ordered</Title>
                      <Grid gutter="sm">
                        {mostOrderedItems.map(item => (
                          <Grid.Col key={item.id} span={{ base: 6, sm: 4, md: 3, lg: 2.4, xl: 2 }}>
                            <MenuItemCard item={item} />
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
                </Grid.Col>
              </Grid>
            </Box>

            {/* Floating Cart Button - Mobile (DoorDash Style) */}
            {cartItems.length > 0 && (
              <Box
                style={{
                  display: 'block',
                  '@media (min-width: 1024px)': { display: 'none' },
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
                style={{
                  display: 'none',
                  '@media (min-width: 1024px)': { display: 'block' },
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
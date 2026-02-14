// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import {
  Box,
  Stack,
  Group,
  Text,
  Title,
  Button,
  TextInput,
  ActionIcon,
  Image as MantineImage,
  Loader,
  Badge,
  Menu,
  Paper,
} from '@mantine/core';
import {
  IconChevronLeft,
  IconSearch,
  IconX,
  IconHeart,
  IconTag,
  IconStar,
  IconClock,
  IconCurrencyDollar,
  IconChevronDown,
} from '@tabler/icons-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface Restaurant {
  id: string;
  name: string;
  description: string;
  cuisine_type: string;
  delivery_fee_cents: number;
  min_delivery_time: number;
  max_delivery_time: number;
  rating: number;
  total_reviews: number;
  image_url: string;
  header_image_url?: string;
  is_promoted?: boolean;
  promotion_description?: string;
  promotion_discount_percentage?: number;
  promotion_discount_amount_cents?: number;
  latitude?: number;
  longitude?: number;
}

const CuisineResults = () => {
  const { cuisine } = useParams<{ cuisine: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';
  const isMobile = useIsMobile();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [ratingFilter, setRatingFilter] = useState<string | null>(null);
  const [priceFilter, setPriceFilter] = useState<string | null>(null);
  const [likedRestaurants, setLikedRestaurants] = useState<Set<string>>(new Set());
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Get cuisine display name
  const cuisineDisplayName = cuisine
    ? cuisine
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    : 'All';

  useEffect(() => {
    fetchLikedRestaurants();
    // Get user's current location for distance calculation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.log('Location access denied or unavailable:', error);
        }
      );
    }
  }, []);

  useEffect(() => {
    fetchRestaurants();
  }, [cuisine, searchQuery, activeFilter, ratingFilter, priceFilter]);

  const fetchLikedRestaurants = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('customer_favorites')
        .select('restaurant_id')
        .eq('customer_id', user.id);

      if (data) {
        setLikedRestaurants(new Set(data.map((fav) => fav.restaurant_id)));
      }
    } catch (error) {
      console.error('Error fetching liked restaurants:', error);
    }
  };

  const fetchRestaurants = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('restaurants')
        .select('*')
        .eq('is_active', true);

      // Filter by cuisine if provided
      if (cuisine && cuisine !== 'all') {
        // Convert slug back to cuisine name (e.g., "mexican" -> "Mexican")
        // Also handle direct cuisine names
        const cuisineName = cuisine
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        // Use case-insensitive matching
        query = query.ilike('cuisine_type', `%${cuisineName}%`);
      }

      const { data, error } = await query.order('is_promoted', { ascending: false })
        .order('rating', { ascending: false });

      if (error) throw error;

      let filteredData = data || [];

      // Apply search filter
      if (searchQuery) {
        filteredData = filteredData.filter(
          (r) =>
            r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.cuisine_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      // Apply filters
      if (activeFilter === 'deals') {
        filteredData = filteredData.filter(
          (r) => r.promotion_description || r.promotion_discount_percentage || r.promotion_discount_amount_cents
        );
      }

      if (ratingFilter === 'high') {
        filteredData = filteredData.filter((r) => r.rating >= 4.5);
      } else if (ratingFilter === 'low') {
        filteredData = filteredData.filter((r) => r.rating < 4.0);
      }

      if (priceFilter === 'low') {
        filteredData = filteredData.filter((r) => r.delivery_fee_cents === 0);
      } else if (priceFilter === 'high') {
        filteredData = filteredData.filter((r) => r.delivery_fee_cents > 500);
      }

      // Sort by fastest if selected
      if (activeFilter === 'fastest') {
        filteredData.sort((a, b) => (a.min_delivery_time || 30) - (b.min_delivery_time || 30));
      }

      setRestaurants(filteredData);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchInput(value);
    if (value.trim()) {
      navigate(`/restaurants/cuisine/${cuisine || 'all'}?q=${encodeURIComponent(value)}`, { replace: true });
    } else {
      navigate(`/restaurants/cuisine/${cuisine || 'all'}`, { replace: true });
    }
  };

  const toggleLike = async (restaurantId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const isLiked = likedRestaurants.has(restaurantId);

      if (isLiked) {
        const { error } = await supabase
          .from('customer_favorites')
          .delete()
          .eq('customer_id', user.id)
          .eq('restaurant_id', restaurantId);

        if (!error) {
          setLikedRestaurants((prev) => {
            const newSet = new Set(prev);
            newSet.delete(restaurantId);
            return newSet;
          });
        }
      } else {
        const { error } = await supabase
          .from('customer_favorites')
          .insert({
            customer_id: user.id,
            restaurant_id: restaurantId,
          });

        if (!error) {
          setLikedRestaurants((prev) => new Set(prev).add(restaurantId));
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const formatPrice = (cents: number) => {
    if (cents === 0) return 'Free';
    return `$${(cents / 100).toFixed(2)}`;
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const formatDistance = (restaurant: Restaurant): string => {
    if (!userLocation || !restaurant.latitude || !restaurant.longitude) {
      return ''; // Return empty if we don't have location data
    }
    const distance = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      restaurant.latitude,
      restaurant.longitude
    );
    return `${distance.toFixed(1)} mi`;
  };

  return (
    <Box style={{ minHeight: '100vh', backgroundColor: '#fafafa' }}>
      {/* Global Header */}
      <Header />
      
      {/* Page Header */}
      <Box
        style={{
          position: 'sticky',
          top: '64px',
          zIndex: 50,
          backgroundColor: 'white',
          borderBottom: '1px solid #e5e7eb',
          padding: '12px 16px',
        }}
      >

        {/* Search Bar with Back Arrow */}
        <TextInput
          placeholder="Search restaurants..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearch(searchInput);
            }
          }}
          leftSection={
            <ActionIcon
              variant="subtle"
              onClick={() => navigate('/restaurants')}
              size="md"
              style={{ color: '#6b7280' }}
            >
              <IconChevronLeft size={20} />
            </ActionIcon>
          }
          rightSection={
            searchInput ? (
              <ActionIcon onClick={() => handleSearch('')} variant="subtle">
                <IconX size={16} />
              </ActionIcon>
            ) : (
              <IconSearch size={16} style={{ color: '#a3a3a3' }} />
            )
          }
          styles={{
            input: {
              paddingLeft: '44px',
              paddingRight: '16px',
              paddingTop: '12px',
              paddingBottom: '12px',
              fontSize: '16px',
              backgroundColor: '#fafafa',
              border: 'none',
              borderRadius: '12px',
            },
          }}
        />

        {/* Category Tabs */}
        <Group gap="md" mt="md">
          <Button
            variant="subtle"
            size="sm"
            onClick={() => navigate('/restaurants/cuisine/all')}
            style={{
              backgroundColor: 'transparent',
              color: cuisine === 'all' ? '#000000' : '#6b7280',
              fontWeight: cuisine === 'all' ? 600 : 400,
              padding: 0,
              height: 'auto',
            }}
          >
            All
          </Button>
          <Button
            variant="subtle"
            size="sm"
            style={{ 
              color: '#6b7280',
              backgroundColor: 'transparent',
              padding: 0,
              height: 'auto',
            }}
          >
            Restaurant
          </Button>
          <Button
            variant="subtle"
            size="sm"
            style={{ 
              color: '#6b7280',
              backgroundColor: 'transparent',
              padding: 0,
              height: 'auto',
            }}
          >
            Grocery
          </Button>
        </Group>

        {/* Filter Buttons */}
        <Group 
          gap="xs" 
          mt="md" 
          wrap="nowrap" 
          style={{ 
            overflowX: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
          sx={{
            '&::-webkit-scrollbar': {
              display: 'none',
            },
          }}
        >
          <Button
            variant={activeFilter === 'deals' ? 'filled' : 'light'}
            size="xs"
            radius="xl"
            leftSection={<IconTag size={14} />}
            onClick={() => setActiveFilter(activeFilter === 'deals' ? null : 'deals')}
            style={{
              backgroundColor: activeFilter === 'deals' ? '#000000' : 'transparent',
              color: activeFilter === 'deals' ? 'white' : '#6b7280',
              flexShrink: 0,
            }}
          >
            Deals
          </Button>

          <Menu position="bottom-start">
            <Menu.Target>
              <Button
                variant={ratingFilter ? 'filled' : 'light'}
                size="xs"
                radius="xl"
                leftSection={<IconStar size={14} />}
                rightSection={<IconChevronDown size={14} />}
                style={{
                  backgroundColor: ratingFilter ? '#000000' : 'transparent',
                  color: ratingFilter ? 'white' : '#6b7280',
                  flexShrink: 0,
                }}
              >
                Ratings
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item onClick={() => setRatingFilter(null)}>All Ratings</Menu.Item>
              <Menu.Item onClick={() => setRatingFilter('high')}>4.5+ Stars</Menu.Item>
              <Menu.Item onClick={() => setRatingFilter('low')}>Below 4.0</Menu.Item>
            </Menu.Dropdown>
          </Menu>

          <Button
            variant={activeFilter === 'fastest' ? 'filled' : 'light'}
            size="xs"
            radius="xl"
            onClick={() => setActiveFilter(activeFilter === 'fastest' ? null : 'fastest')}
            style={{
              backgroundColor: activeFilter === 'fastest' ? '#000000' : 'transparent',
              color: activeFilter === 'fastest' ? 'white' : '#6b7280',
              flexShrink: 0,
            }}
          >
            Fastest
          </Button>

          <Menu position="bottom-start">
            <Menu.Target>
              <Button
                variant={priceFilter ? 'filled' : 'light'}
                size="xs"
                radius="xl"
                leftSection={<IconCurrencyDollar size={14} />}
                rightSection={<IconChevronDown size={14} />}
                style={{
                  backgroundColor: priceFilter ? '#000000' : 'transparent',
                  color: priceFilter ? 'white' : '#6b7280',
                  flexShrink: 0,
                }}
              >
                Price
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item onClick={() => setPriceFilter(null)}>All Prices</Menu.Item>
              <Menu.Item onClick={() => setPriceFilter('low')}>Free Delivery</Menu.Item>
              <Menu.Item onClick={() => setPriceFilter('high')}>Premium</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Box>

      {/* Results */}
      <Box style={{ padding: '16px' }}>
        {loading ? (
          <Box style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Loader size="lg" />
          </Box>
        ) : restaurants.length === 0 ? (
          <Box style={{ textAlign: 'center', padding: '40px' }}>
            <Text c="dimmed" size="lg">
              {searchQuery
                ? `No restaurants found for "${searchQuery}"`
                : `No restaurants found in ${cuisineDisplayName}`}
            </Text>
          </Box>
        ) : (
          <Stack gap="md">
            {restaurants.map((restaurant) => (
              <Paper
                key={restaurant.id}
                shadow="sm"
                radius="md"
                p={0}
                style={{ cursor: 'pointer', overflow: 'hidden' }}
                onClick={() => navigate(`/restaurant/${restaurant.id}/menu`)}
              >
                <Box style={{ position: 'relative' }}>
                  <MantineImage
                    src={restaurant.header_image_url || restaurant.image_url || 'https://placehold.co/600x300'}
                    alt={restaurant.name}
                    height={200}
                    style={{ objectFit: 'cover', width: '100%' }}
                  />

                  {/* Heart Icon */}
                  <ActionIcon
                    variant="filled"
                    size="lg"
                    radius="xl"
                    style={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      backgroundColor: 'white',
                      color: likedRestaurants.has(restaurant.id) ? '#ff5f1f' : '#6b7280',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLike(restaurant.id);
                    }}
                  >
                    <IconHeart
                      size={20}
                      style={{
                        fill: likedRestaurants.has(restaurant.id) ? '#ff5f1f' : 'none',
                      }}
                    />
                  </ActionIcon>

                  {/* Promoted Badge */}
                  {restaurant.is_promoted && (
                    <Badge
                      style={{
                        position: 'absolute',
                        bottom: 12,
                        left: 12,
                        backgroundColor: '#000000',
                        color: 'white',
                      }}
                    >
                      Sponsored
                    </Badge>
                  )}
                </Box>

                <Box p="md">
                  <Group justify="space-between" align="flex-start" mb="xs">
                    <Box style={{ flex: 1 }}>
                      <Title order={4} fw={700} mb="xs">
                        {restaurant.name}
                      </Title>
                      <Group gap="xs" mb="xs">
                        <Group gap={4}>
                          <IconStar size={16} style={{ color: '#fbbf24', fill: '#fbbf24' }} />
                          <Text size="sm" fw={600}>
                            {restaurant.rating?.toFixed(1) || 'N/A'}
                          </Text>
                          <Text size="sm" c="dimmed">
                            ({restaurant.total_reviews || 0}+)
                          </Text>
                        </Group>
                        {formatDistance(restaurant) && (
                          <>
                            <Text size="sm" c="dimmed">•</Text>
                            <Text size="sm" c="dimmed">
                              {formatDistance(restaurant)}
                            </Text>
                          </>
                        )}
                        {restaurant.min_delivery_time && (
                          <>
                            <Text size="sm" c="dimmed">•</Text>
                            <Text size="sm" c="dimmed">
                              {restaurant.min_delivery_time}{restaurant.max_delivery_time ? `-${restaurant.max_delivery_time}` : ''} min
                            </Text>
                          </>
                        )}
                      </Group>
                    </Box>
                  </Group>

                  <Text size="sm" c="dimmed" mb="xs">
                    {formatPrice(restaurant.delivery_fee_cents)} delivery fee
                  </Text>

                  {restaurant.promotion_description && (
                    <Badge
                      color="red"
                      variant="light"
                      size="sm"
                      mb="xs"
                      style={{ display: 'block', width: 'fit-content' }}
                    >
                      {restaurant.promotion_description}
                    </Badge>
                  )}

                  {restaurant.is_promoted && (
                    <Text size="xs" c="dimmed">
                      Sponsored
                    </Text>
                  )}
                </Box>
              </Paper>
            ))}
          </Stack>
        )}
      </Box>

      {/* Bottom spacing */}
      <Box style={{ height: '80px' }} />
    </Box>
  );
};

export default CuisineResults;


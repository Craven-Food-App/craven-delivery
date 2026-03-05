import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Box,
  Card,
  Text,
  Group,
  Stack,
  Grid,
  Badge,
  Image,
  Button,
  Loader,
  Center,
  Tabs,
  ActionIcon,
} from '@mantine/core';
import { IconHeart, IconMapPin, IconStar, IconShoppingCart } from '@tabler/icons-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface FavoriteRestaurant {
  id: string;
  name: string;
  image_url?: string;
  cuisine_type?: string;
  rating?: number;
  delivery_fee_cents?: number;
  address?: string;
  city?: string;
}

interface FavoriteMenuItem {
  id: string;
  name: string;
  description?: string;
  price_cents: number;
  image_url?: string;
  restaurant: {
    id: string;
    name: string;
    image_url?: string;
  };
}

export default function Favorites() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('restaurants');
  const [favoriteRestaurants, setFavoriteRestaurants] = useState<FavoriteRestaurant[]>([]);
  const [favoriteMenuItems, setFavoriteMenuItems] = useState<FavoriteMenuItem[]>([]);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch favorite restaurants
      const { data: restaurantFavorites } = await supabase
        .from('customer_favorites')
        .select(`
          restaurant_id,
          restaurants (
            id,
            name,
            image_url,
            cuisine_type,
            rating,
            delivery_fee_cents,
            address,
            city
          )
        `)
        .eq('customer_id', user.id);

      const restaurants = (restaurantFavorites || [])
        .map((fav: any) => fav.restaurants)
        .filter(Boolean) as FavoriteRestaurant[];

      setFavoriteRestaurants(restaurants);

      // Fetch favorite menu items
      const { data: menuItemFavorites } = await supabase
        .from('menu_item_favorites')
        .select(`
          menu_item_id,
          menu_items (
            id,
            name,
            description,
            price_cents,
            image_url,
            restaurant_id,
            restaurants (
              id,
              name,
              image_url
            )
          )
        `)
        .eq('customer_id', user.id);

      const menuItems = (menuItemFavorites || [])
        .map((fav: any) => ({
          ...fav.menu_items,
          restaurant: fav.menu_items.restaurants,
        }))
        .filter((item: any) => item && item.restaurant) as FavoriteMenuItem[];

      setFavoriteMenuItems(menuItems);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      toast({
        title: 'Error',
        description: 'Failed to load favorites',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRestaurantFavorite = async (restaurantId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('customer_favorites')
        .delete()
        .eq('customer_id', user.id)
        .eq('restaurant_id', restaurantId);

      setFavoriteRestaurants(prev => prev.filter(r => r.id !== restaurantId));
      toast({
        title: 'Removed',
        description: 'Restaurant removed from favorites',
      });
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  const handleRemoveMenuItemFavorite = async (menuItemId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('menu_item_favorites')
        .delete()
        .eq('customer_id', user.id)
        .eq('menu_item_id', menuItemId);

      setFavoriteMenuItems(prev => prev.filter(item => item.id !== menuItemId));
      toast({
        title: 'Removed',
        description: 'Item removed from favorites',
      });
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  if (loading) {
    return (
      <Box style={{ minHeight: '100vh', backgroundColor: 'var(--mantine-color-gray-0)' }}>
        <Center style={{ height: '100vh' }}>
          <Stack align="center" gap="md">
            <Loader size="lg" color="#ff7a00" />
            <Text c="dimmed">Loading your favorites...</Text>
          </Stack>
        </Center>
      </Box>
    );
  }

  const cardStyles = {
    border: '1px solid var(--mantine-color-gray-2)',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'var(--mantine-color-white)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
  };

  return (
    <Box style={{ minHeight: '100vh', backgroundColor: '#f8fafc', paddingBottom: '80px' }}>
      <Box style={{ maxWidth: isMobile ? '100%' : 1120, margin: '0 auto', padding: isMobile ? 20 : 24 }}>
        <Stack gap={28}>
          {/* Header */}
          <Box style={{ paddingBottom: 4 }}>
            <Text fw={600} size="22px" lh={1.3} c="dark.8" mb={4}>
              Your Favorites
            </Text>
            <Text size="sm" c="dimmed" style={{ letterSpacing: '0.01em' }}>
              Restaurants and dishes you've saved
            </Text>
          </Box>

          {/* Tabs */}
          <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'restaurants')}>
            <Tabs.List
              style={{
                borderBottom: '1px solid var(--mantine-color-gray-2)',
                gap: 0,
                marginBottom: 0,
              }}
            >
              <Tabs.Tab
                value="restaurants"
                style={{
                  paddingBottom: 12,
                  paddingTop: 0,
                  fontWeight: 500,
                  fontSize: 14,
                  color: activeTab === 'restaurants' ? 'var(--mantine-color-dark-7)' : 'var(--mantine-color-gray-6)',
                  borderBottom: activeTab === 'restaurants' ? '2px solid #ff7a00' : '2px solid transparent',
                  marginBottom: -1,
                }}
              >
                Restaurants ({favoriteRestaurants.length})
              </Tabs.Tab>
              <Tabs.Tab
                value="dishes"
                style={{
                  paddingBottom: 12,
                  paddingTop: 0,
                  fontWeight: 500,
                  fontSize: 14,
                  color: activeTab === 'dishes' ? 'var(--mantine-color-dark-7)' : 'var(--mantine-color-gray-6)',
                  borderBottom: activeTab === 'dishes' ? '2px solid #ff7a00' : '2px solid transparent',
                  marginBottom: -1,
                }}
              >
                Dishes ({favoriteMenuItems.length})
              </Tabs.Tab>
            </Tabs.List>

            {/* Restaurants Tab */}
            <Tabs.Panel value="restaurants" pt={24}>
              {favoriteRestaurants.length === 0 ? (
                <Card p={40} radius={12} style={{ ...cardStyles, textAlign: 'center' }}>
                  <Stack align="center" gap="md">
                    <Box style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: 'var(--mantine-color-gray-1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <IconHeart size={28} style={{ color: 'var(--mantine-color-gray-4)' }} />
                    </Box>
                    <Text fw={600} size="lg" c="dark.7">No favorite restaurants</Text>
                    <Text size="sm" c="dimmed" ta="center" maw={320}>
                      Start exploring and add restaurants to your favorites to see them here.
                    </Text>
                    <Button onClick={() => navigate('/restaurants')} size="sm" variant="light" color="orange" style={{ fontWeight: 500 }}>
                      Browse restaurants
                    </Button>
                  </Stack>
                </Card>
              ) : (
                <Grid gutter="sm">
                  {favoriteRestaurants.map((restaurant) => (
                    <Grid.Col key={restaurant.id} span={{ base: 6, sm: 6, md: 6 }}>
                      <Card
                        p={0}
                        radius={12}
                        style={{ ...cardStyles, cursor: 'pointer', height: '100%' }}
                        onClick={() => navigate(`/restaurant/${restaurant.id}`)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                          e.currentTarget.style.borderColor = 'var(--mantine-color-gray-3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                          e.currentTarget.style.borderColor = 'var(--mantine-color-gray-2)';
                        }}
                      >
                        <Box style={{ position: 'relative' }}>
                          {restaurant.image_url ? (
                            <Image
                              src={restaurant.image_url}
                              alt={restaurant.name}
                              height={140}
                              style={{ objectFit: 'cover' }}
                            />
                          ) : (
                            <Box
                              style={{
                                height: 140,
                                backgroundColor: 'var(--mantine-color-gray-1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <IconMapPin size={32} style={{ color: 'var(--mantine-color-gray-4)' }} />
                            </Box>
                          )}
                          <ActionIcon
                            variant="white"
                            size="md"
                            radius="xl"
                            style={{
                              position: 'absolute',
                              top: 10,
                              right: 10,
                              boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                              color: '#dc2626',
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveRestaurantFavorite(restaurant.id);
                            }}
                          >
                            <IconHeart size={18} fill="currentColor" />
                          </ActionIcon>
                        </Box>
                        <Stack gap="xs" p="sm" style={{ paddingTop: 12, paddingBottom: 14 }}>
                          <Text fw={600} size="sm" lineClamp={1} c="dark.7">
                            {restaurant.name}
                          </Text>
                          {restaurant.cuisine_type && (
                            <Badge
                              variant="light"
                              size="xs"
                              color="gray"
                              style={{
                                fontWeight: 500,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                                width: 'fit-content',
                              }}
                            >
                              {restaurant.cuisine_type}
                            </Badge>
                          )}
                          <Group gap="xs" wrap="nowrap">
                            {restaurant.rating != null && (
                              <Group gap={4} wrap="nowrap">
                                <IconStar size={12} style={{ color: '#f59e0b', fill: '#f59e0b', flexShrink: 0 }} />
                                <Text size="xs" c="dark.6">{restaurant.rating.toFixed(1)}</Text>
                              </Group>
                            )}
                            {restaurant.delivery_fee_cents !== undefined && (
                              <Text size="xs" c="dimmed">
                                ${(restaurant.delivery_fee_cents / 100).toFixed(2)} delivery
                              </Text>
                            )}
                          </Group>
                          {restaurant.address && (
                            <Group gap={6} wrap="nowrap" style={{ marginTop: 2 }}>
                              <IconMapPin size={12} style={{ color: 'var(--mantine-color-gray-5)', flexShrink: 0 }} />
                              <Text size="xs" c="dimmed" lineClamp={1}>
                                {restaurant.address}{restaurant.city ? `, ${restaurant.city}` : ''}
                              </Text>
                            </Group>
                          )}
                        </Stack>
                      </Card>
                    </Grid.Col>
                  ))}
                </Grid>
              )}
            </Tabs.Panel>

            {/* Dishes Tab */}
            <Tabs.Panel value="dishes" pt={24}>
              {favoriteMenuItems.length === 0 ? (
                <Card p={40} radius={12} style={{ ...cardStyles, textAlign: 'center' }}>
                  <Stack align="center" gap="md">
                    <Box style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: 'var(--mantine-color-gray-1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <IconHeart size={28} style={{ color: 'var(--mantine-color-gray-4)' }} />
                    </Box>
                    <Text fw={600} size="lg" c="dark.7">No favorite dishes</Text>
                    <Text size="sm" c="dimmed" ta="center" maw={320}>
                      Save dishes from restaurant menus to see them here.
                    </Text>
                    <Button onClick={() => navigate('/restaurants')} size="sm" variant="light" color="orange" style={{ fontWeight: 500 }}>
                      Browse restaurants
                    </Button>
                  </Stack>
                </Card>
              ) : (
                <Stack gap="sm">
                  {favoriteMenuItems.map((item) => (
                    <Card
                      key={item.id}
                      p="sm"
                      radius={12}
                      style={{ ...cardStyles, cursor: 'pointer' }}
                      onClick={() => navigate(`/restaurant/${item.restaurant.id}`)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                        e.currentTarget.style.borderColor = 'var(--mantine-color-gray-3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                        e.currentTarget.style.borderColor = 'var(--mantine-color-gray-2)';
                      }}
                    >
                      <Group gap="md" align="center" wrap="nowrap">
                        <Box
                          style={{
                            width: 72,
                            height: 72,
                            borderRadius: 10,
                            overflow: 'hidden',
                            flexShrink: 0,
                            backgroundColor: 'var(--mantine-color-gray-1)',
                          }}
                        >
                          {item.image_url ? (
                            <Image
                              src={item.image_url}
                              alt={item.name}
                              width={72}
                              height={72}
                              style={{ objectFit: 'cover' }}
                            />
                          ) : (
                            <Box style={{ width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <IconShoppingCart size={28} style={{ color: 'var(--mantine-color-gray-4)' }} />
                            </Box>
                          )}
                        </Box>
                        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                          <Group justify="space-between" wrap="nowrap" gap="xs">
                            <Text fw={600} size="sm" lineClamp={1} c="dark.7">
                              {item.name}
                            </Text>
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveMenuItemFavorite(item.id);
                              }}
                            >
                              <IconHeart size={16} fill="currentColor" />
                            </ActionIcon>
                          </Group>
                          {item.description && (
                            <Text size="xs" c="dimmed" lineClamp={2}>
                              {item.description}
                            </Text>
                          )}
                          <Group justify="space-between" wrap="nowrap" gap="xs">
                            <Text fw={600} size="sm" c="#ff7a00">
                              ${(item.price_cents / 100).toFixed(2)}
                            </Text>
                            <Text size="xs" c="dimmed" lineClamp={1}>
                              {item.restaurant.name}
                            </Text>
                          </Group>
                        </Stack>
                      </Group>
                    </Card>
                  ))}
                </Stack>
              )}
            </Tabs.Panel>
          </Tabs>
        </Stack>
      </Box>
    </Box>
  );
}


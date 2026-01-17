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

  return (
    <Box style={{ minHeight: '100vh', backgroundColor: 'var(--mantine-color-gray-0)', paddingBottom: '80px' }}>
      <Box style={{ maxWidth: isMobile ? '100%' : '1200px', margin: '0 auto', padding: '16px' }}>
        <Stack gap="lg">
          {/* Header */}
          <Box>
            <Text fw={700} size="2xl" mb="xs">
              Your Favorites
            </Text>
            <Text c="dimmed">
              Restaurants and dishes you've saved
            </Text>
          </Box>

          {/* Tabs */}
          <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'restaurants')}>
            <Tabs.List>
              <Tabs.Tab value="restaurants">
                Restaurants ({favoriteRestaurants.length})
              </Tabs.Tab>
              <Tabs.Tab value="dishes">
                Dishes ({favoriteMenuItems.length})
              </Tabs.Tab>
            </Tabs.List>

            {/* Restaurants Tab */}
            <Tabs.Panel value="restaurants" pt="lg">
              {favoriteRestaurants.length === 0 ? (
                <Card p="xl">
                  <Stack align="center" gap="md">
                    <IconHeart size={48} style={{ color: 'var(--mantine-color-gray-4)' }} />
                    <Text fw={600} size="lg">No Favorite Restaurants</Text>
                    <Text c="dimmed" ta="center">
                      Start exploring restaurants and add them to your favorites!
                    </Text>
                    <Button onClick={() => navigate('/restaurants')} color="#ff7a00">
                      Browse Restaurants
                    </Button>
                  </Stack>
                </Card>
              ) : (
                <Grid gutter="md">
                  {favoriteRestaurants.map((restaurant) => (
                    <Grid.Col key={restaurant.id} span={{ base: 12, sm: 6, md: 4 }}>
                      <Card
                        withBorder
                        p="md"
                        style={{ cursor: 'pointer', height: '100%' }}
                        onClick={() => navigate(`/restaurant/${restaurant.id}`)}
                      >
                        <Stack gap="md">
                          {restaurant.image_url ? (
                            <Image
                              src={restaurant.image_url}
                              alt={restaurant.name}
                              height={160}
                              radius="md"
                              style={{ objectFit: 'cover' }}
                            />
                          ) : (
                            <Box
                              style={{
                                height: 160,
                                backgroundColor: 'var(--mantine-color-gray-2)',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <IconMapPin size={48} style={{ color: 'var(--mantine-color-gray-5)' }} />
                            </Box>
                          )}
                          <Stack gap="xs">
                            <Group justify="space-between">
                              <Text fw={600} size="lg" lineClamp={1}>
                                {restaurant.name}
                              </Text>
                              <ActionIcon
                                variant="subtle"
                                color="red"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveRestaurantFavorite(restaurant.id);
                                }}
                              >
                                <IconHeart size={20} fill="currentColor" />
                              </ActionIcon>
                            </Group>
                            {restaurant.cuisine_type && (
                              <Badge variant="outline" size="sm">
                                {restaurant.cuisine_type}
                              </Badge>
                            )}
                            <Group gap="xs">
                              {restaurant.rating && (
                                <Group gap={4}>
                                  <IconStar size={14} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
                                  <Text size="sm">{restaurant.rating.toFixed(1)}</Text>
                                </Group>
                              )}
                              {restaurant.delivery_fee_cents !== undefined && (
                                <Text size="sm" c="dimmed">
                                  ${(restaurant.delivery_fee_cents / 100).toFixed(2)} delivery
                                </Text>
                              )}
                            </Group>
                            {restaurant.address && (
                              <Group gap={4}>
                                <IconMapPin size={14} style={{ color: 'var(--mantine-color-gray-6)' }} />
                                <Text size="xs" c="dimmed" lineClamp={1}>
                                  {restaurant.address}, {restaurant.city}
                                </Text>
                              </Group>
                            )}
                          </Stack>
                        </Stack>
                      </Card>
                    </Grid.Col>
                  ))}
                </Grid>
              )}
            </Tabs.Panel>

            {/* Dishes Tab */}
            <Tabs.Panel value="dishes" pt="lg">
              {favoriteMenuItems.length === 0 ? (
                <Card p="xl">
                  <Stack align="center" gap="md">
                    <IconHeart size={48} style={{ color: 'var(--mantine-color-gray-4)' }} />
                    <Text fw={600} size="lg">No Favorite Dishes</Text>
                    <Text c="dimmed" ta="center">
                      Browse menus and add your favorite dishes!
                    </Text>
                    <Button onClick={() => navigate('/restaurants')} color="#ff7a00">
                      Browse Restaurants
                    </Button>
                  </Stack>
                </Card>
              ) : (
                <Stack gap="md">
                  {favoriteMenuItems.map((item) => (
                    <Card
                      key={item.id}
                      withBorder
                      p="md"
                      onClick={() => navigate(`/restaurant/${item.restaurant.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <Group gap="md" align="flex-start">
                        {item.image_url ? (
                          <Image
                            src={item.image_url}
                            alt={item.name}
                            width={80}
                            height={80}
                            radius="md"
                            style={{ objectFit: 'cover' }}
                          />
                        ) : (
                          <Box
                            style={{
                              width: 80,
                              height: 80,
                              backgroundColor: 'var(--mantine-color-gray-2)',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <IconShoppingCart size={32} style={{ color: 'var(--mantine-color-gray-5)' }} />
                          </Box>
                        )}
                        <Stack gap="xs" style={{ flex: 1 }}>
                          <Group justify="space-between">
                            <Text fw={600} size="md">
                              {item.name}
                            </Text>
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveMenuItemFavorite(item.id);
                              }}
                            >
                              <IconHeart size={18} fill="currentColor" />
                            </ActionIcon>
                          </Group>
                          {item.description && (
                            <Text size="sm" c="dimmed" lineClamp={2}>
                              {item.description}
                            </Text>
                          )}
                          <Group justify="space-between">
                            <Text fw={700} size="lg" c="#ff7a00">
                              ${(item.price_cents / 100).toFixed(2)}
                            </Text>
                            <Text size="sm" c="dimmed">
                              from {item.restaurant.name}
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


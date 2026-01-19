import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  Box, 
  Container, 
  Paper, 
  Title, 
  Text, 
  Badge, 
  Group, 
  Stack, 
  Divider, 
  Progress, 
  Timeline, 
  Card,
  Grid,
  Avatar,
  ActionIcon,
  Loader,
  Alert,
  Button
} from '@mantine/core';
import { 
  IconMapPin, 
  IconClock, 
  IconPhone, 
  IconCheck, 
  IconTruck, 
  IconToolsKitchen2, 
  IconNavigation,
  IconChevronLeft,
  IconUser,
  IconRoute,
  IconAlertCircle,
  IconMessageCircle
} from '@tabler/icons-react';
import { useIsMobile } from '@/hooks/use-mobile';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || "pk.eyJ1IjoiY3JhdmUtbiIsImEiOiJjbWZpbXN4NmUwMG0wMmpxNDNkc2lmNWhiIn0._lEfvdpBUJpz-RYDV02ZAA";

interface OrderStatus {
  status: string;
  timestamp: string;
  description: string;
}

const TrackOrder: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  const [order, setOrder] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [feeder, setFeeder] = useState<any>(null);
  const [feederLocation, setFeederLocation] = useState<{lat: number, lng: number} | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [route, setRoute] = useState<any>(null);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const feederMarker = useRef<any>(null);
  const restaurantMarker = useRef<any>(null);
  const customerMarker = useRef<any>(null);
  const routeLayer = useRef<any>(null);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  // Real-time feeder location tracking
  useEffect(() => {
    if (!feeder?.user_id) return;

    const channel = supabase
      .channel(`feeder-location-${feeder.user_id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'driver_profiles',
        filter: `user_id=eq.${feeder.user_id}`
      }, (payload) => {
        const newData = payload.new as any;
        if (newData.current_latitude && newData.current_longitude) {
          setFeederLocation({
            lat: newData.current_latitude,
            lng: newData.current_longitude
          });
          updateFeederMarker(newData.current_latitude, newData.current_longitude);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [feeder?.user_id]);

  // Real-time order status updates
  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`order-status-${orderId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`
      }, (payload) => {
        const newData = payload.new as any;
        setOrder((prev: any) => ({ ...prev, ...newData }));
        
        // If feeder was just assigned, fetch feeder details
        if (newData.driver_id && !feeder) {
          fetchFeederDetails(newData.driver_id);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, feeder]);

  // Initialize map
  useEffect(() => {
    if (!mapLoaded && mapRef.current && (restaurant || order)) {
      initializeMap();
    }
  }, [mapLoaded, restaurant, order]);

  // Update map when feeder location changes
  useEffect(() => {
    if (mapInstance.current && feederLocation && restaurant) {
      updateRoute();
    }
  }, [feederLocation, restaurant, order]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch order with restaurant and delivery address
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          restaurants (
            id,
            name,
            address,
            city,
            state,
            zip_code,
            phone,
            latitude,
            longitude,
            image_url
          )
        `)
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      
      setOrder(orderData);
      setRestaurant(orderData.restaurants);

      // Fetch feeder if assigned
      if (orderData.driver_id) {
        await fetchFeederDetails(orderData.driver_id);
      }
    } catch (error: any) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeederDetails = async (feederId: string) => {
    try {
      const { data: feederData, error: feederError } = await supabase
        .from('driver_profiles')
        .select('*')
        .eq('user_id', feederId)
        .single();

      if (feederError) throw feederError;
      
      setFeeder(feederData);
      
      // Set initial feeder location
      if (feederData?.current_latitude && feederData?.current_longitude) {
        setFeederLocation({
          lat: feederData.current_latitude,
          lng: feederData.current_longitude
        });
      }
    } catch (error) {
      console.error('Error fetching feeder:', error);
    }
  };

  const initializeMap = async () => {
    try {
      // Load Mapbox GL JS
      const mapboxgl = (window as any).mapboxgl;
      if (!mapboxgl) {
        const script = document.createElement('script');
        script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js';
        script.onload = () => {
          const link = document.createElement('link');
          link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
          link.rel = 'stylesheet';
          document.head.appendChild(link);
          createMap();
        };
        document.head.appendChild(script);
      } else {
        createMap();
      }
    } catch (error) {
      console.error('Error loading map:', error);
    }
  };

  const createMap = () => {
    const mapboxgl = (window as any).mapboxgl;
    if (!mapboxgl || !mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    // Center on restaurant initially, or use default location
    const center: [number, number] = restaurant?.longitude && restaurant?.latitude
      ? [restaurant.longitude, restaurant.latitude]
      : [-83.5555, 41.6639]; // Toledo default

    mapInstance.current = new mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: center,
      zoom: 13,
      accessToken: MAPBOX_ACCESS_TOKEN
    });

    mapInstance.current.on('load', () => {
      setMapLoaded(true);
      
      // Add restaurant marker
      if (restaurant?.latitude && restaurant?.longitude) {
        addRestaurantMarker(restaurant.latitude, restaurant.longitude);
      }
      
      // Add customer delivery marker
      if (order?.delivery_address) {
        const deliveryLat = typeof order.delivery_address === 'object' 
          ? order.delivery_address.latitude 
          : null;
        const deliveryLng = typeof order.delivery_address === 'object'
          ? order.delivery_address.longitude
          : null;
        
        if (deliveryLat && deliveryLng) {
          addCustomerMarker(deliveryLat, deliveryLng);
        }
      }
      
      // Add feeder marker if location available
      if (feederLocation) {
        updateFeederMarker(feederLocation.lat, feederLocation.lng);
      }
      
      // Update route if we have all necessary data
      if (feederLocation && restaurant && order?.delivery_address) {
        updateRoute();
      }
    });
  };

  const addRestaurantMarker = (lat: number, lng: number) => {
    if (!mapInstance.current) return;

    const el = document.createElement('div');
    el.className = 'restaurant-marker';
    el.style.cssText = `
      width: 40px;
      height: 40px;
      background: #FF6B35;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 20px;
    `;
    el.innerHTML = '🍽️';

    if (restaurantMarker.current) {
      restaurantMarker.current.remove();
    }

    restaurantMarker.current = new (window as any).mapboxgl.Marker(el)
      .setLngLat([lng, lat])
      .addTo(mapInstance.current);
  };

  const addCustomerMarker = (lat: number, lng: number) => {
    if (!mapInstance.current) return;

    const el = document.createElement('div');
    el.className = 'customer-marker';
    el.style.cssText = `
      width: 40px;
      height: 40px;
      background: #2563EB;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 20px;
    `;
    el.innerHTML = '📍';

    if (customerMarker.current) {
      customerMarker.current.remove();
    }

    customerMarker.current = new (window as any).mapboxgl.Marker(el)
      .setLngLat([lng, lat])
      .addTo(mapInstance.current);
  };

  const updateFeederMarker = (lat: number, lng: number) => {
    if (!mapInstance.current) return;

    const el = document.createElement('div');
    el.className = 'feeder-marker';
    el.style.cssText = `
      width: 48px;
      height: 48px;
      background: #10B981;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 12px rgba(16, 185, 129, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
      animation: pulse 2s infinite;
    `;
    el.innerHTML = '🚚';

    // Add pulse animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.1); opacity: 0.9; }
      }
    `;
    if (!document.head.querySelector('style[data-feeder-pulse]')) {
      style.setAttribute('data-feeder-pulse', 'true');
      document.head.appendChild(style);
    }

    if (feederMarker.current) {
      feederMarker.current.remove();
    }

    feederMarker.current = new (window as any).mapboxgl.Marker(el)
      .setLngLat([lng, lat])
      .addTo(mapInstance.current);

    // Center map on feeder with smooth animation
    mapInstance.current.flyTo({
      center: [lng, lat],
      zoom: 14,
      duration: 1000
    });
  };

  const updateRoute = async () => {
    if (!mapInstance.current || !feederLocation || !restaurant || !order?.delivery_address) {
      return;
    }

    try {
      const deliveryLat = typeof order.delivery_address === 'object' 
        ? order.delivery_address.latitude 
        : null;
      const deliveryLng = typeof order.delivery_address === 'object'
        ? order.delivery_address.longitude
        : null;

      if (!deliveryLat || !deliveryLng) return;

      // Determine route based on order status
      let startLat: number, startLng: number;
      
      if (order.order_status === 'picked_up' || order.order_status === 'in_transit') {
        // Feeder is going from restaurant to customer
        startLat = restaurant.latitude;
        startLng = restaurant.longitude;
      } else {
        // Feeder is going to restaurant
        startLat = feederLocation.lat;
        startLng = feederLocation.lng;
      }

      const endLat = deliveryLat;
      const endLng = deliveryLng;

      // Fetch route from Mapbox Directions API
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${startLng},${startLat};${endLng},${endLat}?` +
        `access_token=${MAPBOX_ACCESS_TOKEN}&geometries=geojson&overview=full`
      );

      const data = await response.json();
      
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const routeGeometry = data.routes[0].geometry;
        
        // Remove existing route layer
        if (mapInstance.current.getLayer('route')) {
          mapInstance.current.removeLayer('route');
        }
        if (mapInstance.current.getSource('route')) {
          mapInstance.current.removeSource('route');
        }

        // Add route source
        mapInstance.current.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: routeGeometry
          }
        });

        // Add route layer
        mapInstance.current.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#10B981',
            'line-width': 4,
            'line-opacity': 0.75
          }
        });

        setRoute(data.routes[0]);
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'yellow';
      case 'confirmed': return 'blue';
      case 'preparing': return 'orange';
      case 'ready': return 'purple';
      case 'picked_up': return 'indigo';
      case 'in_transit': return 'cyan';
      case 'delivered': return 'green';
      default: return 'gray';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Order Received';
      case 'confirmed': return 'Restaurant Confirmed';
      case 'preparing': return 'Preparing Your Order';
      case 'ready': return 'Ready for Pickup';
      case 'picked_up': return 'Feeder Picked Up';
      case 'in_transit': return 'On the Way';
      case 'delivered': return 'Delivered';
      default: return status;
    }
  };

  const getStatusProgress = (status: string) => {
    switch (status) {
      case 'pending': return 10;
      case 'confirmed': return 20;
      case 'preparing': return 40;
      case 'ready': return 60;
      case 'picked_up': return 75;
      case 'in_transit': return 90;
      case 'delivered': return 100;
      default: return 0;
    }
  };

  const getOrderTimeline = (): OrderStatus[] => {
    if (!order) return [];
    
    const timeline: OrderStatus[] = [];
    const statusOrder = ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'in_transit', 'delivered'];
    const currentIndex = statusOrder.indexOf(order.order_status);
    
    statusOrder.forEach((status, index) => {
      const isActive = index <= currentIndex;
      timeline.push({
        status,
        timestamp: isActive ? order.updated_at : '',
        description: getStatusText(status)
      });
    });
    
    return timeline;
  };

  if (loading) {
    return (
      <Box style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack align="center" gap="md">
          <Loader size="lg" color="orange" />
          <Text c="dimmed">Loading order details...</Text>
        </Stack>
      </Box>
    );
  }

  if (!order) {
    return (
      <Container size="lg" py="xl">
        <Paper p="xl" radius="md" withBorder>
          <Stack align="center" gap="md">
            <Title order={2}>Order Not Found</Title>
            <Text c="dimmed">The order you're looking for doesn't exist.</Text>
            <Button onClick={() => navigate('/restaurants')} leftSection={<IconChevronLeft size={18} />}>
              Back to Restaurants
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  const deliveryAddress = order?.delivery_address 
    ? (typeof order.delivery_address === 'object'
      ? order.delivery_address
      : { address: order.delivery_address, name: '' })
    : { address: '', name: '' };

  return (
    <Box style={{ minHeight: '100vh', backgroundColor: '#F8F9FA' }}>
      <Container size="xl" py="md">
        {/* Header */}
        <Paper p="md" radius="md" shadow="sm" mb="md" withBorder>
          <Group justify="space-between" align="center" wrap="nowrap" gap="sm">
            <Group gap="xs">
              <ActionIcon variant="subtle" size="sm" onClick={() => navigate(-1)}>
                <IconChevronLeft size={18} />
              </ActionIcon>
              <div>
                <Title order={3} style={{ fontSize: '18px', marginBottom: 2 }}>Track Your Order</Title>
                <Text c="dimmed" size="xs">Order #{order.order_number || order.id.slice(0, 8).toUpperCase()}</Text>
              </div>
            </Group>
            <Badge 
              size="md" 
              color={getStatusColor(order.order_status)}
              variant="light"
              style={{ fontSize: '12px', padding: '4px 12px' }}
            >
              {getStatusText(order.order_status)}
            </Badge>
          </Group>
          
          {/* Progress Bar */}
          <Progress 
            value={getStatusProgress(order.order_status)} 
            color={getStatusColor(order.order_status)}
            size="sm"
            radius="xl"
            mt="sm"
            animated
          />
        </Paper>

        <Grid gutter="md">
          {/* Main Content */}
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Stack gap="md">
              {/* Live Tracking Map */}
              <Card shadow="sm" padding="md" radius="md" withBorder>
                <Group justify="space-between" mb="xs">
                  <Group gap={4}>
                    <IconRoute size={16} color="#10B981" />
                    <Title order={5} style={{ fontSize: '14px', fontWeight: 600 }}>Live Tracking</Title>
                  </Group>
                  {feederLocation && (
                    <Badge color="green" variant="light" size="sm" leftSection={<div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10B981', animation: 'pulse 2s infinite' }} />}>
                      Live
                    </Badge>
                  )}
                </Group>
                
                <Box style={{ position: 'relative', height: isMobile ? '200px' : '280px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#F3F4F6' }}>
                  {!mapLoaded && (
                    <Box style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                      <Stack align="center" gap={4}>
                        <Loader size="sm" color="orange" />
                        <Text size="xs" c="dimmed">Loading map...</Text>
                      </Stack>
                    </Box>
                  )}
                  <div ref={mapRef} style={{ width: '100%', height: '100%', opacity: mapLoaded ? 1 : 0 }} />
                </Box>

                {!feeder && (
                  <Alert icon={<IconAlertCircle size={14} />} color="blue" mt="xs" radius="md" p="xs">
                    <Text size="xs">Waiting for feeder assignment. Your order will be automatically assigned to an available feeder.</Text>
                  </Alert>
                )}

                {feederLocation && route && (
                  <Group gap={4} mt="xs" c="dimmed">
                    <IconNavigation size={12} />
                    <Text size="xs">
                      ETA: {route.duration ? `${Math.round(route.duration / 60)} min` : 'Calculating...'}
                    </Text>
                  </Group>
                )}
              </Card>

              {/* Restaurant Info */}
              {restaurant && (
                <Card shadow="sm" padding="md" radius="md" withBorder>
                  <Group gap="sm" align="flex-start">
                    <Avatar size={40} radius="sm" color="orange" variant="light">
                      <IconToolsKitchen2 size={20} />
                    </Avatar>
                    <Box style={{ flex: 1 }}>
                      <Title order={5} style={{ fontSize: '14px', fontWeight: 600, marginBottom: 2 }}>{restaurant.name || 'Restaurant'}</Title>
                      {(restaurant.address || restaurant.city) && (
                        <Group gap={4} mb={2}>
                          <IconMapPin size={12} color="#6B7280" />
                          <Text size="xs" c="dimmed" style={{ lineHeight: 1.4 }}>
                            {[restaurant.address, restaurant.city, restaurant.state, restaurant.zip_code].filter(Boolean).join(', ')}
                          </Text>
                        </Group>
                      )}
                      {restaurant.phone && (
                        <Group gap={4}>
                          <IconPhone size={12} color="#6B7280" />
                          <Text size="xs" c="dimmed">{restaurant.phone}</Text>
                        </Group>
                      )}
                    </Box>
                  </Group>
                </Card>
              )}

              {/* Delivery Address */}
              {deliveryAddress && (
                <Card shadow="sm" padding="md" radius="md" withBorder>
                  <Group gap="sm" align="flex-start">
                    <Avatar size={40} radius="sm" color="blue" variant="light">
                      <IconMapPin size={20} />
                    </Avatar>
                    <Box style={{ flex: 1 }}>
                      <Title order={5} style={{ fontSize: '14px', fontWeight: 600, marginBottom: 2 }}>Delivery Address</Title>
                      {deliveryAddress.name && (
                        <Text fw={500} size="xs" mb={2}>{deliveryAddress.name}</Text>
                      )}
                      <Text size="xs" c="dimmed" style={{ lineHeight: 1.4 }}>
                        {deliveryAddress.address || 'Address not available'}
                      </Text>
                      {deliveryAddress.special_instructions && (
                        <Alert color="gray" mt="xs" radius="md" p="xs">
                          <Text size="xs">Note: {deliveryAddress.special_instructions}</Text>
                        </Alert>
                      )}
                    </Box>
                  </Group>
                </Card>
              )}

              {/* Feeder Info */}
              {feeder && (
                <Card shadow="sm" padding="md" radius="md" withBorder>
                  <Group gap="sm" align="flex-start">
                    <Avatar size={40} radius="sm" color="green" variant="light">
                      <IconTruck size={20} />
                    </Avatar>
                    <Box style={{ flex: 1 }}>
                      <Group justify="space-between" mb={2}>
                        <Title order={5} style={{ fontSize: '14px', fontWeight: 600 }}>Your Feeder</Title>
                        <Badge color="green" variant="light" size="xs">Assigned</Badge>
                      </Group>
                      <Group gap={4} mb={2}>
                        <IconUser size={12} color="#6B7280" />
                        <Text size="xs" c="dimmed">
                          {feeder.vehicle_type || 'Vehicle'} • {feeder.license_plate || 'N/A'}
                        </Text>
                      </Group>
                      {feederLocation && (
                        <Text size="xs" c="green" mt={2} mb="xs">
                          <IconNavigation size={10} style={{ display: 'inline', marginRight: 2 }} />
                          Live tracking active
                        </Text>
                      )}
                      {order.driver_id && !['delivered', 'cancelled'].includes(order.order_status) && (
                        <Button
                          fullWidth
                          size="sm"
                          variant="light"
                          color="orange"
                          leftSection={<IconMessageCircle size={16} />}
                          onClick={() => navigate(`/customer-support?orderId=${order.id}&type=driver`)}
                          mt="xs"
                        >
                          Chat with Driver
                        </Button>
                      )}
                    </Box>
                  </Group>
                </Card>
              )}

              {/* Order Timeline */}
              <Card shadow="sm" padding="md" radius="md" withBorder>
                <Title order={5} style={{ fontSize: '14px', fontWeight: 600, marginBottom: 8 }}>Order Timeline</Title>
                <Timeline 
                  active={getOrderTimeline().findIndex(s => s.status === order.order_status)} 
                  bulletSize={18} 
                  lineWidth={1.5}
                  radius="xl"
                >
                  {getOrderTimeline().map((item, index) => (
                    <Timeline.Item
                      key={item.status}
                      bullet={<IconCheck size={10} />}
                      title={<Text size="xs" fw={500}>{item.description}</Text>}
                    >
                      {item.timestamp && (
                        <Text c="dimmed" size="xs" mt={2}>
                          {dayjs(item.timestamp).format('MMM D, h:mm A')}
                        </Text>
                      )}
                    </Timeline.Item>
                  ))}
                </Timeline>
              </Card>
            </Stack>
          </Grid.Col>

          {/* Order Summary Sidebar */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Card shadow="sm" padding="md" radius="md" withBorder style={{ position: 'sticky', top: 10 }}>
              <Title order={5} style={{ fontSize: '14px', fontWeight: 600, marginBottom: 12 }}>Order Summary</Title>
              
              <Stack gap={6} mb="sm">
                <Group justify="space-between">
                  <Text size="xs" c="dimmed">Subtotal</Text>
                  <Text size="xs" fw={500}>${((order.subtotal_cents || 0) / 100).toFixed(2)}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="xs" c="dimmed">Delivery fee</Text>
                  <Text size="xs" fw={500}>${((order.delivery_fee_cents || 0) / 100).toFixed(2)}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="xs" c="dimmed">Tax</Text>
                  <Text size="xs" fw={500}>${((order.tax_cents || 0) / 100).toFixed(2)}</Text>
                </Group>
                {order.tip_cents > 0 && (
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">Tip</Text>
                    <Text size="xs" fw={500}>${((order.tip_cents || 0) / 100).toFixed(2)}</Text>
                  </Group>
                )}
              </Stack>
              
              <Divider my="sm" />
              
              <Group justify="space-between" mb="sm">
                <Text fw={600} size="sm">Total</Text>
                <Text fw={700} size="md">${((order.total_cents || 0) / 100).toFixed(2)}</Text>
              </Group>

              {order.estimated_delivery_time && (
                <Alert color="orange" radius="md" icon={<IconClock size={14} />} p="xs">
                  <Text size="xs" fw={500}>Estimated delivery</Text>
                  <Text size="xs" c="dimmed">
                    {dayjs(order.estimated_delivery_time).format('MMM D, h:mm A')}
                  </Text>
                </Alert>
              )}
            </Card>
          </Grid.Col>
        </Grid>
      </Container>
    </Box>
  );
};

export default TrackOrder;

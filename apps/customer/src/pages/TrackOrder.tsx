import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { createCravenMarkerElement } from '@/utils/createCravenMapPin';
import { MAPBOX_CONFIG } from '@/config/mapbox';
import {
  Box,
  Text,
  Group,
  Stack,
  Badge,
  Progress,
  ActionIcon,
  Loader,
  Button,
  Divider,
} from '@mantine/core';
import {
  IconChevronLeft,
  IconMessageCircle,
  IconNavigation,
  IconAlertCircle,
  IconMapPin,
} from '@tabler/icons-react';
import { useIsMobile } from '@/hooks/use-mobile';
import dayjs from 'dayjs';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_ACCESS_TOKEN = MAPBOX_CONFIG.accessToken;
/** Vivid streets style for live tracking */
const MAP_STYLE = 'mapbox://styles/mapbox/streets-v12';
const BRAND = '#ff5f1f';

interface OrderStatus {
  status: string;
  timestamp: string;
  description: string;
}

type LngLat = { lat: number; lng: number };

function loadMapboxGl(): Promise<any> {
  const w = window as any;
  if (w.mapboxgl) return Promise.resolve(w.mapboxgl);
  return import('mapbox-gl').then((mod) => {
    const mapboxgl = (mod as any).default || mod;
    w.mapboxgl = mapboxgl;
    return mapboxgl;
  });
}

/** Ease marker between positions for motion-accurate tracking */
function animateMarkerTo(
  marker: any,
  from: LngLat,
  to: LngLat,
  durationMs = 900,
  onFrame?: (pos: LngLat, t: number) => void
) {
  const start = performance.now();
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / durationMs);
    // ease-out cubic
    const e = 1 - Math.pow(1 - t, 3);
    const lat = from.lat + (to.lat - from.lat) * e;
    const lng = from.lng + (to.lng - from.lng) * e;
    marker.setLngLat([lng, lat]);
    onFrame?.({ lat, lng }, t);
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function bearingDeg(from: LngLat, to: LngLat): number {
  const φ1 = (from.lat * Math.PI) / 180;
  const φ2 = (to.lat * Math.PI) / 180;
  const Δλ = ((to.lng - from.lng) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

const TrackOrder: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [order, setOrder] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [feeder, setFeeder] = useState<any>(null);
  const [feederLocation, setFeederLocation] = useState<LngLat | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [route, setRoute] = useState<any>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const feederMarker = useRef<any>(null);
  const restaurantMarker = useRef<any>(null);
  const customerMarker = useRef<any>(null);
  const lastFeederPos = useRef<LngLat | null>(null);
  const feederHeadingEl = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (orderId) void fetchOrderDetails();
  }, [orderId]);

  // Real-time feeder location
  useEffect(() => {
    if (!feeder?.user_id) return;

    const channel = supabase
      .channel(`feeder-location-${feeder.user_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'driver_profiles',
          filter: `user_id=eq.${feeder.user_id}`,
        },
        (payload) => {
          const newData = payload.new as any;
          if (newData.current_latitude && newData.current_longitude) {
            const next = {
              lat: newData.current_latitude,
              lng: newData.current_longitude,
            };
            setFeederLocation(next);
            updateFeederMarker(next.lat, next.lng);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [feeder?.user_id]);

  // Real-time order status
  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`order-status-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const newData = payload.new as any;
          setOrder((prev: any) => ({ ...prev, ...newData }));
          if (newData.driver_id && !feeder) {
            void fetchFeederDetails(newData.driver_id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, feeder]);

  useEffect(() => {
    if (!mapLoaded && mapRef.current && (restaurant || order)) {
      setMapError(null);
      void initializeMap();
    }
  }, [mapLoaded, restaurant, order]);

  useEffect(() => {
    if (mapInstance.current && feederLocation && restaurant) {
      void updateRoute();
    }
  }, [feederLocation, restaurant, order?.order_status]);

  useEffect(() => {
    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, []);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(
          `
          *,
          restaurants (
            id,
            name,
            address,
            city,
            state,
            zip_code,
            latitude,
            longitude,
            image_url
          )
        `
        )
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      setOrder(orderData);
      setRestaurant(orderData.restaurants);

      if (orderData.driver_id) {
        await fetchFeederDetails(orderData.driver_id);
      }
    } catch (error) {
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

      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('user_id', feederId)
        .maybeSingle();

      setFeeder({
        ...feederData,
        full_name: profileData?.full_name ?? null,
      });

      if (feederData?.current_latitude && feederData?.current_longitude) {
        setFeederLocation({
          lat: feederData.current_latitude,
          lng: feederData.current_longitude,
        });
      }
    } catch (error) {
      console.error('Error fetching feeder:', error);
    }
  };

  const fitMapToPoints = useCallback((points: Array<[number, number]>) => {
    const map = mapInstance.current;
    if (!map || points.length === 0) return;
    if (points.length === 1) {
      map.easeTo({ center: points[0], zoom: 14, duration: 800 });
      return;
    }
    const mapboxgl = (window as any).mapboxgl;
    const bounds = new mapboxgl.LngLatBounds(points[0], points[0]);
    points.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, { padding: 56, maxZoom: 15, duration: 900 });
  }, []);

  const initializeMap = async () => {
    try {
      const mapboxgl = await loadMapboxGl();
      if (!mapRef.current) return;
      mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

      const center: [number, number] =
        restaurant?.longitude && restaurant?.latitude
          ? [restaurant.longitude, restaurant.latitude]
          : (MAPBOX_CONFIG.center as [number, number]);

      mapInstance.current = new mapboxgl.Map({
        container: mapRef.current,
        style: MAP_STYLE,
        center,
        zoom: 13,
        pitch: 0,
        attributionControl: true,
        antialias: true,
      });

      const map = mapInstance.current;
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

      map.on('error', (e: any) => {
        console.error('Mapbox map error:', e);
        setMapError('Map could not be loaded');
        setMapLoaded(true);
      });

      map.on('load', () => {
        setMapLoaded(true);

        if (restaurant?.latitude && restaurant?.longitude) {
          addRestaurantMarker(restaurant.latitude, restaurant.longitude);
        }

        const deliveryLat =
          typeof order?.delivery_address === 'object'
            ? order.delivery_address.latitude
            : null;
        const deliveryLng =
          typeof order?.delivery_address === 'object'
            ? order.delivery_address.longitude
            : null;
        if (deliveryLat && deliveryLng) {
          addCustomerMarker(deliveryLat, deliveryLng);
        }

        if (feederLocation) {
          updateFeederMarker(feederLocation.lat, feederLocation.lng, true);
        }

        const pts: Array<[number, number]> = [];
        if (restaurant?.longitude && restaurant?.latitude) {
          pts.push([restaurant.longitude, restaurant.latitude]);
        }
        if (deliveryLng && deliveryLat) pts.push([deliveryLng, deliveryLat]);
        if (feederLocation) pts.push([feederLocation.lng, feederLocation.lat]);
        fitMapToPoints(pts);

        if (feederLocation && restaurant) void updateRoute();
      });
    } catch (error) {
      console.error('Error loading map:', error);
      setMapError('Map could not be loaded');
      setMapLoaded(true);
    }
  };

  const addRestaurantMarker = (lat: number, lng: number) => {
    if (!mapInstance.current) return;
    const el = createCravenMarkerElement(36, 'Pickup');
    restaurantMarker.current?.remove();
    restaurantMarker.current = new (window as any).mapboxgl.Marker({
      element: el,
      anchor: 'center',
    })
      .setLngLat([lng, lat])
      .addTo(mapInstance.current);
  };

  const addCustomerMarker = (lat: number, lng: number) => {
    if (!mapInstance.current) return;
    const el = document.createElement('div');
    el.style.cssText = `
      width: 18px; height: 18px; border-radius: 50%;
      background: #111827; border: 3px solid #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.35);
    `;
    el.title = 'Delivery';
    customerMarker.current?.remove();
    customerMarker.current = new (window as any).mapboxgl.Marker({
      element: el,
      anchor: 'center',
    })
      .setLngLat([lng, lat])
      .addTo(mapInstance.current);
  };

  const updateFeederMarker = (lat: number, lng: number, instant = false) => {
    if (!mapInstance.current) return;
    const next = { lat, lng };
    const mapboxgl = (window as any).mapboxgl;

    if (!feederMarker.current) {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'width:44px;height:44px;position:relative;';
      const pin = createCravenMarkerElement(40, 'Feeder');
      pin.style.position = 'absolute';
      pin.style.inset = '2px';
      const ring = document.createElement('div');
      ring.style.cssText = `
        position:absolute; inset:0; border-radius:50%;
        border:2px solid ${BRAND}; opacity:0.45;
        animation: crave-track-pulse 1.6s ease-out infinite;
      `;
      if (!document.getElementById('crave-track-pulse-style')) {
        const style = document.createElement('style');
        style.id = 'crave-track-pulse-style';
        style.textContent = `
          @keyframes crave-track-pulse {
            0% { transform: scale(0.85); opacity: 0.55; }
            70% { transform: scale(1.35); opacity: 0; }
            100% { transform: scale(1.35); opacity: 0; }
          }
        `;
        document.head.appendChild(style);
      }
      wrap.appendChild(ring);
      wrap.appendChild(pin);
      feederHeadingEl.current = wrap;

      feederMarker.current = new mapboxgl.Marker({ element: wrap, anchor: 'center' })
        .setLngLat([lng, lat])
        .addTo(mapInstance.current);
      lastFeederPos.current = next;
      return;
    }

    const from = lastFeederPos.current || next;
    if (instant) {
      feederMarker.current.setLngLat([lng, lat]);
      lastFeederPos.current = next;
      return;
    }

    const dist =
      Math.hypot(next.lat - from.lat, next.lng - from.lng) * 111_000; // ~meters
    if (dist > 2) {
      const heading = bearingDeg(from, next);
      if (feederHeadingEl.current) {
        feederHeadingEl.current.style.transition = 'transform 0.35s ease';
        feederHeadingEl.current.style.transform = `rotate(${heading}deg)`;
      }
      animateMarkerTo(feederMarker.current, from, next, Math.min(1200, 400 + dist * 8));
      mapInstance.current.easeTo({
        center: [lng, lat],
        duration: 900,
        essential: true,
      });
    } else {
      feederMarker.current.setLngLat([lng, lat]);
    }
    lastFeederPos.current = next;
  };

  const updateRoute = async () => {
    if (!mapInstance.current || !feederLocation || !order?.delivery_address) return;

    try {
      const deliveryLat =
        typeof order.delivery_address === 'object'
          ? order.delivery_address.latitude
          : null;
      const deliveryLng =
        typeof order.delivery_address === 'object'
          ? order.delivery_address.longitude
          : null;
      if (!deliveryLat || !deliveryLng) return;

      const pickedUp = ['picked_up', 'in_transit', 'out_for_delivery', 'delivering'].includes(
        order.order_status
      );

      // Motion-accurate remaining path: always from current feeder position
      let endLat = deliveryLat;
      let endLng = deliveryLng;
      if (!pickedUp && restaurant?.latitude && restaurant?.longitude) {
        endLat = restaurant.latitude;
        endLng = restaurant.longitude;
      }

      const startLng = feederLocation.lng;
      const startLat = feederLocation.lat;

      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${startLng},${startLat};${endLng},${endLat}?` +
          `access_token=${MAPBOX_ACCESS_TOKEN}&geometries=geojson&overview=full&annotations=duration,distance`
      );
      const data = await response.json();

      if (data.code !== 'Ok' || !data.routes?.[0]) return;
      const routeGeometry = data.routes[0].geometry;
      const map = mapInstance.current;

      if (map.getSource('route')) {
        (map.getSource('route') as any).setData({
          type: 'Feature',
          properties: {},
          geometry: routeGeometry,
        });
      } else {
        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: routeGeometry,
          },
        });
        map.addLayer({
          id: 'route-casing',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#ffffff',
            'line-width': 8,
            'line-opacity': 0.9,
          },
        });
        map.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': BRAND,
            'line-width': 4.5,
            'line-opacity': 0.95,
          },
        });
      }

      setRoute(data.routes[0]);
    } catch (error) {
      console.error('Error fetching route:', error);
    }
  };

  const formatFeederDisplayName = (fullName: string | null | undefined): string => {
    if (!fullName || typeof fullName !== 'string') return '';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Order received';
      case 'confirmed':
        return 'Confirmed';
      case 'preparing':
        return 'Preparing';
      case 'ready':
      case 'ready_for_pickup':
        return 'Ready for pickup';
      case 'picked_up':
        return 'Picked up';
      case 'in_transit':
      case 'out_for_delivery':
      case 'delivering':
        return 'Out for delivery';
      case 'delivered':
        return 'Delivered';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status?.replace(/_/g, ' ') || 'Updating';
    }
  };

  const getStatusProgress = (status: string) => {
    switch (status) {
      case 'pending':
        return 12;
      case 'confirmed':
        return 24;
      case 'preparing':
        return 42;
      case 'ready':
      case 'ready_for_pickup':
        return 58;
      case 'picked_up':
        return 72;
      case 'in_transit':
      case 'out_for_delivery':
      case 'delivering':
        return 88;
      case 'delivered':
        return 100;
      default:
        return 8;
    }
  };

  const getOrderTimeline = (): OrderStatus[] => {
    if (!order) return [];
    const statusOrder = [
      'pending',
      'confirmed',
      'preparing',
      'ready',
      'picked_up',
      'in_transit',
      'delivered',
    ];
    const currentIndex = statusOrder.indexOf(
      order.order_status === 'ready_for_pickup'
        ? 'ready'
        : order.order_status === 'out_for_delivery' || order.order_status === 'delivering'
          ? 'in_transit'
          : order.order_status
    );

    return statusOrder.map((status, index) => ({
      status,
      timestamp: index <= currentIndex ? order.updated_at : '',
      description: getStatusLabel(status),
    }));
  };

  if (loading) {
    return (
      <Box
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f7f7f8',
        }}
      >
        <Stack align="center" gap="sm">
          <Loader size="md" color="dark" />
          <Text size="sm" c="dimmed">
            Loading tracking…
          </Text>
        </Stack>
      </Box>
    );
  }

  if (!order) {
    return (
      <Box p="xl" style={{ minHeight: '100vh', background: '#f7f7f8' }}>
        <Stack align="center" gap="md" mt={80}>
          <Text fw={700} size="lg">
            Order not found
          </Text>
          <Text size="sm" c="dimmed">
            This tracking link is invalid or expired.
          </Text>
          <Button variant="default" onClick={() => navigate('/restaurants')}>
            Back to restaurants
          </Button>
        </Stack>
      </Box>
    );
  }

  const deliveryAddress =
    order?.delivery_address && typeof order.delivery_address === 'object'
      ? order.delivery_address
      : { address: order?.delivery_address || '', name: '' };

  const restaurantAddress = restaurant
    ? [restaurant.address, restaurant.city, restaurant.state, restaurant.zip_code]
        .filter(Boolean)
        .join(', ')
    : '';

  const timeline = getOrderTimeline();
  const activeStep = timeline.findIndex((s) => s.status === order.order_status);
  const etaMin = route?.duration ? Math.max(1, Math.round(route.duration / 60)) : null;

  const sectionLabel: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: '#6b7280',
    marginBottom: 6,
  };

  return (
    <Box
      style={{
        minHeight: '100vh',
        background: '#f7f7f8',
        paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {/* Compact enterprise header */}
      <Box
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: '#fff',
          borderBottom: '1px solid #e5e7eb',
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
      >
        <Group
          justify="space-between"
          wrap="nowrap"
          gap="sm"
          px="md"
          py={10}
          style={{ maxWidth: 720, margin: '0 auto' }}
        >
          <Group gap={8} wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="md"
              onClick={() => navigate(-1)}
              aria-label="Back"
            >
              <IconChevronLeft size={20} />
            </ActionIcon>
            <Box style={{ minWidth: 0 }}>
              <Text fw={700} size="sm" style={{ lineHeight: 1.2 }}>
                Order tracking
              </Text>
              <Text size="xs" c="dimmed" style={{ lineHeight: 1.2 }}>
                #{(order.order_number || order.id.slice(0, 8)).toUpperCase()}
              </Text>
            </Box>
          </Group>
          <Badge
            variant="outline"
            color="dark"
            radius="sm"
            size="sm"
            styles={{ root: { textTransform: 'none', fontWeight: 600, borderColor: '#d1d5db' } }}
          >
            {getStatusLabel(order.order_status)}
          </Badge>
        </Group>
        <Box px="md" pb={10} style={{ maxWidth: 720, margin: '0 auto' }}>
          <Progress
            value={getStatusProgress(order.order_status)}
            color="orange"
            size={4}
            radius={0}
            animated={order.order_status !== 'delivered'}
          />
        </Box>
      </Box>

      <Box style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* Hero map — full bleed within content width */}
        <Box
          style={{
            position: 'relative',
            height: isMobile ? 280 : 360,
            background: '#e5e7eb',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

          {!mapLoaded && (
            <Box
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#eef0f3',
              }}
            >
              <Stack align="center" gap={6}>
                <Loader size="sm" color="dark" />
                <Text size="xs" c="dimmed">
                  Loading map…
                </Text>
              </Stack>
            </Box>
          )}

          {mapLoaded && mapError && (
            <Box
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f3f4f6',
              }}
            >
              <Text size="sm" c="dimmed">
                {mapError}
              </Text>
            </Box>
          )}

          {/* Map overlay status chip */}
          <Box
            style={{
              position: 'absolute',
              left: 12,
              bottom: 12,
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            {feederLocation && (
              <Box
                style={{
                  background: 'rgba(17,24,39,0.88)',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '6px 10px',
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#34d399',
                    display: 'inline-block',
                  }}
                />
                Live
                {etaMin != null ? ` · ${etaMin} min` : ''}
              </Box>
            )}
          </Box>
        </Box>

        {/* Unified details panel */}
        <Box
          style={{
            background: '#fff',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          {!feeder && (
            <Group gap={8} px="md" py={10} style={{ background: '#f9fafb', borderBottom: '1px solid #eee' }}>
              <IconAlertCircle size={14} color="#6b7280" />
              <Text size="xs" c="dimmed">
                Waiting for feeder assignment. Tracking updates automatically.
              </Text>
            </Group>
          )}

          {/* Merchant */}
          {restaurant && (
            <Box px="md" py={14} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <Text style={sectionLabel}>Merchant</Text>
              <Text fw={600} size="sm" mb={4}>
                {restaurant.name || 'Restaurant'}
              </Text>
              {restaurantAddress && (
                <Text size="xs" c="dimmed" style={{ lineHeight: 1.45 }}>
                  {restaurantAddress}
                </Text>
              )}
            </Box>
          )}

          {/* Delivery */}
          <Box px="md" py={14} style={{ borderBottom: '1px solid #f3f4f6' }}>
            <Text style={sectionLabel}>Delivery</Text>
            {deliveryAddress.name && (
              <Text fw={600} size="sm" mb={2}>
                {deliveryAddress.name}
              </Text>
            )}
            <Group gap={6} align="flex-start" wrap="nowrap">
              <IconMapPin size={14} color="#9ca3af" style={{ marginTop: 2, flexShrink: 0 }} />
              <Text size="xs" c="dimmed" style={{ lineHeight: 1.45 }}>
                {deliveryAddress.address || 'Address not available'}
              </Text>
            </Group>
            {deliveryAddress.special_instructions && (
              <Text size="xs" c="dimmed" mt={8} style={{ fontStyle: 'italic' }}>
                Note: {deliveryAddress.special_instructions}
              </Text>
            )}
          </Box>

          {/* Courier */}
          {feeder && (
            <Box px="md" py={14} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <Group justify="space-between" align="flex-start" mb={6}>
                <Box>
                  <Text style={sectionLabel}>Courier</Text>
                  <Text fw={600} size="sm">
                    {formatFeederDisplayName((feeder as any).full_name) || 'Assigned feeder'}
                  </Text>
                  <Text size="xs" c="dimmed" mt={2}>
                    {(feeder.vehicle_type || 'Vehicle').toString()}
                    {feeder.license_plate ? ` · ${feeder.license_plate}` : ''}
                  </Text>
                </Box>
                {feederLocation && (
                  <Group gap={4}>
                    <IconNavigation size={12} color="#059669" />
                    <Text size="xs" fw={600} c="#059669">
                      En route
                    </Text>
                  </Group>
                )}
              </Group>
              {order.driver_id && !['delivered', 'cancelled'].includes(order.order_status) && (
                <Button
                  fullWidth
                  size="sm"
                  color="orange"
                  variant="filled"
                  leftSection={<IconMessageCircle size={16} />}
                  onClick={() =>
                    navigate(`/customer-support?orderId=${order.id}&type=driver`)
                  }
                  mt={10}
                  styles={{ root: { fontWeight: 600 } }}
                >
                  Chat with driver
                </Button>
              )}
            </Box>
          )}

          {/* Timeline — compact */}
          <Box px="md" py={14} style={{ borderBottom: '1px solid #f3f4f6' }}>
            <Text style={sectionLabel}>Status</Text>
            <Stack gap={0}>
              {timeline.map((item, index) => {
                const done = index <= (activeStep < 0 ? -1 : activeStep);
                const current = index === activeStep;
                return (
                  <Group key={item.status} gap={10} align="flex-start" wrap="nowrap" py={6}>
                    <Box
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        marginTop: 4,
                        flexShrink: 0,
                        background: current ? BRAND : done ? '#111827' : '#d1d5db',
                        boxShadow: current ? `0 0 0 3px rgba(255,95,31,0.2)` : undefined,
                      }}
                    />
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Text size="xs" fw={current ? 700 : 500} c={done ? '#111827' : '#9ca3af'}>
                        {item.description}
                      </Text>
                      {item.timestamp && done && (
                        <Text size="xs" c="dimmed">
                          {dayjs(item.timestamp).format('MMM D · h:mm A')}
                        </Text>
                      )}
                    </Box>
                  </Group>
                );
              })}
            </Stack>
          </Box>

          {/* Summary */}
          <Box px="md" py={14}>
            <Text style={sectionLabel}>Summary</Text>
            <Stack gap={6}>
              <Group justify="space-between">
                <Text size="xs" c="dimmed">
                  Subtotal
                </Text>
                <Text size="xs">${((order.subtotal_cents || 0) / 100).toFixed(2)}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="xs" c="dimmed">
                  Delivery
                </Text>
                <Text size="xs">${((order.delivery_fee_cents || 0) / 100).toFixed(2)}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="xs" c="dimmed">
                  Tax
                </Text>
                <Text size="xs">${((order.tax_cents || 0) / 100).toFixed(2)}</Text>
              </Group>
              {order.tip_cents > 0 && (
                <Group justify="space-between">
                  <Text size="xs" c="dimmed">
                    Tip
                  </Text>
                  <Text size="xs">${((order.tip_cents || 0) / 100).toFixed(2)}</Text>
                </Group>
              )}
              <Divider my={4} color="#f3f4f6" />
              <Group justify="space-between">
                <Text size="sm" fw={700}>
                  Total
                </Text>
                <Text size="sm" fw={700}>
                  ${((order.total_cents || 0) / 100).toFixed(2)}
                </Text>
              </Group>
              {order.estimated_delivery_time && (
                <Text size="xs" c="dimmed" mt={4}>
                  Est. delivery {dayjs(order.estimated_delivery_time).format('MMM D, h:mm A')}
                </Text>
              )}
            </Stack>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default TrackOrder;

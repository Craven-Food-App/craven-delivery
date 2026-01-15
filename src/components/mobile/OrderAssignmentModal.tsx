import React, { useEffect, useState } from 'react';
import { IconUsers, IconMapPin, IconClock, IconCurrencyDollar, IconNavigation, IconX, IconPackage, IconPhone, IconMessage, IconStar } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { supabase } from '@/integrations/supabase/client';
import { DeliveryMap } from './DeliveryMap';
import {
  Box,
  Stack,
  Text,
  Title,
  Button,
  Badge,
  Card,
  Group,
  ActionIcon,
  Modal,
  Grid,
  Divider,
  Progress,
  ThemeIcon,
} from '@mantine/core';

interface OrderAssignment {
  assignment_id: string;
  order_id: string;
  restaurant_name: string;
  pickup_address: any; 
  dropoff_address: any; 
  payout_cents: number;
  distance_km: number;
  distance_mi: string;
  expires_at: string;
  estimated_time: number;
  isTestOrder?: boolean;
}

interface OrderAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: OrderAssignment | null;
  onAccept: (assignment: OrderAssignment) => void;
  onDecline: (assignment: OrderAssignment) => void;
}

// Helper function to calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const OrderAssignmentModal: React.FC<OrderAssignmentModalProps> = ({
  isOpen,
  onClose,
  assignment,
  onAccept,
  onDecline
}) => {
  const [timeLeft, setTimeLeft] = useState(45);

  const [payoutPercent, setPayoutPercent] = useState<number>(70);
  const [subtotalCents, setSubtotalCents] = useState<number>(0);
  const [tipCents, setTipCents] = useState<number>(0);
  const [routeMiles, setRouteMiles] = useState<number | null>(null);
  const [routeMins, setRouteMins] = useState<number | null>(null);
  const [pickupWaitMins, setPickupWaitMins] = useState<number>(5); // Default 5 min pickup wait
  const [locationType, setLocationType] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !assignment) return;

    const run = async () => {
      try {
        const { data: setting } = await supabase
          .from('driver_payout_settings')
          .select('percentage')
          .eq('is_active', true)
          .maybeSingle();
        if (setting?.percentage != null) setPayoutPercent(Number(setting.percentage));

        const { data: order } = await supabase
          .from('orders')
          .select('subtotal_cents, tip_cents, dropoff_address, pickup_address, order_status, created_at, restaurant_id')
          .eq('id', assignment.order_id)
          .maybeSingle();

        if (order) {
          setSubtotalCents(Number(order.subtotal_cents || 0));
          setTipCents(Number(order.tip_cents || 0));

          const dAddr: any = order.dropoff_address;
          const type = dAddr?.type || dAddr?.address_type || dAddr?.location_type || null;
          if (type) setLocationType(String(type));

          // Calculate estimated pickup wait time based on order status and age
          if (order.restaurant_id) {
            const { data: restaurant } = await supabase
              .from('restaurants')
              .select('max_delivery_time, average_prep_time')
              .eq('id', order.restaurant_id)
              .maybeSingle();
            
            let waitTime = 5; // Default 5 minutes
            
            if (restaurant?.average_prep_time) {
              waitTime = restaurant.average_prep_time;
            } else if (restaurant?.max_delivery_time) {
              // Use max_delivery_time as fallback (usually includes prep + delivery)
              waitTime = Math.max(5, Math.min(restaurant.max_delivery_time - 15, 15));
            }
            
            // Adjust based on order age - if order is already being prepared, reduce wait time
            if (order.created_at) {
              const orderAge = (Date.now() - new Date(order.created_at).getTime()) / 60000; // minutes
              if (order.order_status === 'preparing' || order.order_status === 'confirmed') {
                waitTime = Math.max(2, waitTime - Math.min(orderAge, waitTime * 0.5));
              }
            }
            
            setPickupWaitMins(Math.round(waitTime));
          }
        }
      } catch (e) {
        console.warn('Order detail fetch failed', e);
      }
    };

    run();
  }, [isOpen, assignment]);

  useEffect(() => {
    if (!isOpen || !assignment) return;
    let canceled = false;

    const fetchRoute = async () => {
      try {
        const pAddr: any = assignment.pickup_address;
        const dAddr: any = assignment.dropoff_address;

        const tokRes = await supabase.functions.invoke('get-mapbox-token');
        const token = (tokRes.data as any)?.token;
        if (!token) return;

        const buildAddress = (addr: any) => {
          if (!addr) return '';
          if (typeof addr === 'string') return addr;
          if (addr.address) return addr.address;
          const parts = [addr.street, addr.city, addr.state, addr.zip_code].filter(Boolean);
          return parts.join(', ');
        };

        const geocode = async (addr: any): Promise<[number, number] | null> => {
          const q = buildAddress(addr);
          if (!q) return null;
          const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?limit=1&access_token=${token}`);
          const j = await res.json();
          const c = j?.features?.[0]?.center;
          return Array.isArray(c) && c.length === 2 ? [Number(c[0]), Number(c[1])] : null;
        };

        let pLat = Number(pAddr?.lat ?? pAddr?.latitude);
        let pLng = Number(pAddr?.lng ?? pAddr?.longitude);
        let dLat = Number(dAddr?.lat ?? dAddr?.latitude);
        let dLng = Number(dAddr?.lng ?? dAddr?.longitude);

        if ([pLat, pLng].some(isNaN)) {
          const g = await geocode(pAddr);
          if (g) { pLng = g[0]; pLat = g[1]; }
        }
        if ([dLat, dLng].some(isNaN)) {
          const g = await geocode(dAddr);
          if (g) { dLng = g[0]; dLat = g[1]; }
        }

        if ([pLat, pLng, dLat, dLng].some(isNaN)) return;

        let originLat: number | null = null;
        let originLng: number | null = null;
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000 })
          );
          originLat = position.coords.latitude;
          originLng = position.coords.longitude;
        } catch (_) {}

        const coords = originLat && originLng
          ? `${originLng},${originLat};${pLng},${pLat};${dLng},${dLat}`
          : `${pLng},${pLat};${dLng},${dLat}`;

        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}.json?overview=full&geometries=geojson&access_token=${token}`;
        const res = await fetch(url);
        const json = await res.json();
        const route = json?.routes?.[0];

        if (!canceled && route && route.distance && route.duration) {
          // Convert distance from meters to miles
          const totalDistanceMiles = route.distance / 1609.34;
          setRouteMiles(Number(totalDistanceMiles.toFixed(1)));
          
          // Convert duration from seconds to minutes (driving time only)
          const drivingTimeMins = Math.round(route.duration / 60);
          setRouteMins(drivingTimeMins);
        } else if (!canceled) {
          // Fallback: calculate straight-line distance if route fails
          console.warn('Route calculation failed, using fallback distance');
          if (originLat && originLng) {
            // Calculate distance: driver → restaurant → customer
            const dist1 = calculateDistance(originLat, originLng, pLat, pLng);
            const dist2 = calculateDistance(pLat, pLng, dLat, dLng);
            const totalDist = dist1 + dist2;
            setRouteMiles(Number(totalDist.toFixed(1)));
            // Estimate time: 1 mile ≈ 2 minutes driving
            setRouteMins(Math.round(totalDist * 2));
          } else {
            // Just restaurant to customer
            const dist = calculateDistance(pLat, pLng, dLat, dLng);
            setRouteMiles(Number(dist.toFixed(1)));
            setRouteMins(Math.round(dist * 2));
          }
        }
      } catch (e) {
        console.warn('Route fetch failed', e);
      }
    };

    fetchRoute();
    return () => { canceled = true; };
  }, [isOpen, assignment]);

  useEffect(() => {
    if (!isOpen || !assignment) return;

    const playNotificationSequence = async () => {
      try {
        const audioContext = new AudioContext();
        const duration = 0.3;
        const gap = 0.15;
        for (let i = 0; i < 3; i++) {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          oscillator.frequency.setValueAtTime(i % 2 === 0 ? 800 : 600, audioContext.currentTime);
          oscillator.type = 'sine';
          gainNode.gain.setValueAtTime(0, audioContext.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
          const startTime = audioContext.currentTime + (i * (duration + gap));
          oscillator.start(startTime);
          oscillator.stop(startTime + duration);
        }
      } catch (e) {
        console.log('Notification sound failed:', e);
      }
    };

    playNotificationSequence();
    setTimeLeft(45);

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleDecline();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, assignment]);

  const handleAccept = () => {
    if (assignment) {
      onAccept(assignment);
      notifications.show({
        title: 'Order Accepted!',
        message: 'Navigate to the pickup location.',
        color: 'green',
      });
    }
  };

  const handleDecline = () => {
    if (assignment) {
      onDecline(assignment);
      notifications.show({
        title: 'Order Declined',
        message: 'Looking for new offers...',
        color: 'blue',
      });
    }
  };

  if (!isOpen || !assignment) return null;

  const estimatedPayout = (((payoutPercent / 100) * subtotalCents + tipCents) / 100).toFixed(2);
  
  // Calculate total distance: use route calculation if available, otherwise fallback
  const milesParsed = parseFloat(assignment.distance_mi || '0') || 0;
  const totalMiles = routeMiles ?? milesParsed;
  
  // Calculate total time: driving time + pickup wait time
  const drivingMins = routeMins ?? (assignment.estimated_time || 0);
  const totalMins = drivingMins + pickupWaitMins;

  const formatAddress = (addr: any): string => {
    if (typeof addr === 'string') return addr;
    if (addr?.address) return addr.address;
    const parts = [addr?.street, addr?.city, addr?.state].filter(Boolean);
    return parts.join(', ') || 'Address unavailable';
  };

  const getCustomerName = () => {
    if (typeof assignment.dropoff_address === 'object' && assignment.dropoff_address?.name) {
      return assignment.dropoff_address.name;
    }
    return 'Customer';
  };

  const progressPercentage = (timeLeft / 45) * 100;

  return (
    <Modal 
      opened={isOpen} 
      onClose={handleDecline} 
      fullScreen
      transitionProps={{ transition: 'slide-up' }}
      data-testid="order-assignment-modal"
      withCloseButton={false}
      styles={{
        body: {
          padding: 0,
        },
        content: {
          backgroundColor: 'white',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
          maxWidth: '448px',
          margin: '0 auto 80px',
          maxHeight: '92vh',
          overflowY: 'auto',
        },
      }}
    >
      {/* Compact Header with Single Close Button */}
      <Box 
        px="md" 
        py="xs" 
        style={{ 
          borderBottom: '1px solid var(--mantine-color-gray-3)',
          position: 'sticky',
          top: 0,
          backgroundColor: 'white',
          zIndex: 10
        }}
      >
        <Group justify="space-between" align="center" gap="xs">
          <Box style={{ flex: 1 }}>
            <Text size="sm" fw={600} c="dark" style={{ letterSpacing: '0.01em' }}>
              New Delivery Request
            </Text>
            <Text size="xs" c="dimmed" style={{ lineHeight: 1.2 }}>
              Order #{assignment.order_id.slice(-6)}
            </Text>
          </Box>
          <ActionIcon
            variant="subtle"
            size="md"
            onClick={handleDecline}
            style={{ 
              color: 'var(--mantine-color-gray-6)',
              borderRadius: '8px'
            }}
          >
            <IconX size={18} />
          </ActionIcon>
        </Group>
      </Box>

      {/* Compact Timer Bar */}
      <Box 
        px="md" 
        py="xs" 
        bg="red.0" 
        style={{ borderBottom: '1px solid var(--mantine-color-red-1)' }}
      >
        <Group gap="xs" justify="center" align="center">
          <IconClock size={16} color="var(--mantine-color-red-7)" />
          <Text c="red.7" fw={600} size="sm">
            {timeLeft}s remaining
          </Text>
        </Group>
      </Box>
      <Progress value={progressPercentage} color="red" size={3} />

      {/* Compact Content Stack */}
      <Stack gap="xs" p="sm" align="stretch" style={{ paddingBottom: '12px' }}>
        {/* Test Order Badge - Compact */}
        {assignment.isTestOrder && (
          <Badge 
            color="yellow" 
            variant="light" 
            size="sm" 
            style={{ 
              alignSelf: 'flex-start',
              borderRadius: '6px',
              padding: '4px 8px'
            }}
          >
            🧪 Test Order
          </Badge>
        )}

        {/* Compact Map */}
        <Card p={0} style={{ overflow: 'hidden', borderRadius: '8px' }} withBorder>
          <Box h={180} w="100%">
            <DeliveryMap 
              pickupAddress={assignment.pickup_address}
              dropoffAddress={assignment.dropoff_address}
              showRoute={true}
            />
          </Box>
        </Card>

        {/* Combined Location Card - Compact */}
        <Card withBorder style={{ borderRadius: '8px' }} p="xs">
          <Stack gap="xs">
            {/* Pickup */}
            <Group gap="xs" align="flex-start" wrap="nowrap">
              <IconPackage size={16} color="var(--mantine-color-orange-6)" style={{ marginTop: 2, flexShrink: 0 }} />
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Text size="xs" fw={600} c="dark" style={{ lineHeight: 1.3 }}>
                  {assignment.restaurant_name}
                </Text>
                <Text size="xs" c="dimmed" style={{ lineHeight: 1.4 }}>
                  {formatAddress(assignment.pickup_address)}
                </Text>
              </Box>
            </Group>
            
            <Divider size="xs" />
            
            {/* Delivery */}
            <Group gap="xs" align="flex-start" wrap="nowrap">
              <IconUsers size={16} color="var(--mantine-color-blue-6)" style={{ marginTop: 2, flexShrink: 0 }} />
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Text size="xs" fw={600} c="dark" style={{ lineHeight: 1.3 }}>
                  {getCustomerName()}
                </Text>
                <Text size="xs" c="dimmed" style={{ lineHeight: 1.4 }}>
                  {formatAddress(assignment.dropoff_address)}
                </Text>
                {locationType && (
                  <Badge color="orange" variant="light" size="xs" mt={4} style={{ borderRadius: '4px' }}>
                    {locationType}
                  </Badge>
                )}
              </Box>
            </Group>
          </Stack>
        </Card>

        {/* Compact Metrics Row */}
        <Group gap="xs" grow>
          <Card withBorder p="xs" style={{ borderRadius: '8px', textAlign: 'center' }}>
            <Text size="xl" fw={700} c="dark" style={{ lineHeight: 1 }}>
              {totalMiles > 0 ? totalMiles.toFixed(1) : '—'}
            </Text>
            <Text size="xs" c="dimmed" fw={500} style={{ lineHeight: 1.2 }}>
              Total Distance
            </Text>
          </Card>
          <Card withBorder p="xs" style={{ borderRadius: '8px', textAlign: 'center' }}>
            <Text size="xl" fw={700} c="dark" style={{ lineHeight: 1 }}>
              {totalMins > 0 ? totalMins : '—'}
            </Text>
            <Text size="xs" c="dimmed" fw={500} style={{ lineHeight: 1.2 }}>
              Est. Time
            </Text>
          </Card>
        </Group>

        {/* Compact Earnings Card */}
        <Card 
          style={{ 
            background: 'linear-gradient(135deg, var(--mantine-color-orange-0) 0%, var(--mantine-color-orange-1) 100%)',
            borderColor: 'var(--mantine-color-orange-3)',
            borderRadius: '8px'
          }} 
          withBorder 
          p="xs"
        >
          <Group justify="space-between" align="flex-start" gap="xs">
            <Box>
              <Text size="xs" fw={600} c="orange.9" style={{ lineHeight: 1.2 }}>
                Your Earnings
              </Text>
              <Text size="xs" c="orange.7" style={{ lineHeight: 1.2 }}>
                {payoutPercent}% of fee
              </Text>
            </Box>
            <Box style={{ textAlign: 'right' }}>
              <Text size="2xl" fw={700} c="orange.9" style={{ lineHeight: 1 }}>
                ${estimatedPayout}
              </Text>
              <Group gap={8} justify="flex-end" mt={4}>
                <Text size="xs" c="orange.7">
                  Sub: ${(subtotalCents / 100).toFixed(2)}
                </Text>
                <Text size="xs" c="orange.7">
                  Tip: ${(tipCents / 100).toFixed(2)}
                </Text>
              </Group>
            </Box>
          </Group>
        </Card>

        {/* Action Buttons - Compact */}
        <Stack gap="xs" pt="xs">
          <Button
            onClick={handleAccept}
            fullWidth
            size="md"
            color="orange"
            leftSection={<IconPackage size={18} />}
            style={{ 
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              fontWeight: 600
            }}
            data-testid="accept-order-button"
          >
            Accept Delivery
          </Button>
          <Button
            onClick={handleDecline}
            fullWidth
            size="md"
            variant="outline"
            leftSection={<IconX size={18} />}
            style={{ 
              borderRadius: '8px',
              borderColor: 'var(--mantine-color-gray-4)',
              fontWeight: 500
            }}
            data-testid="decline-order-button"
          >
            Decline
          </Button>
        </Stack>
      </Stack>
    </Modal>
  );
};

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { IconMapPin, IconNavigation, IconCurrencyDollar, IconClock, IconPackage, IconHome, IconBell, IconCopy, IconToolsKitchen2, IconCheck, IconVolume, IconMenu2 } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCustomerNameForDriver } from '@/utils/nameFormatting';
import { notifications } from '@mantine/notifications';
import FullscreenCamera from './FullscreenCamera';
import DeliveryPhotoGuide from './DeliveryPhotoGuide';
import ContactlessDeliveryFlow from './ContactlessDeliveryFlow';
import { DeliveryFlowStepOne } from './DeliveryFlowStepOne';
import { DeliveryFlowStepTwo } from './DeliveryFlowStepTwo';
import { DeliveryFlowStepThree } from './DeliveryFlowStepThree';
import { OrderChatOverlay } from './OrderChatOverlay';
import DriverSupportThread from '@/components/driver/DriverSupportThread';
import { HelpCircle, X } from 'lucide-react';
import { useNavigation } from '@/hooks/useNavigation';
import { speakDeliveryInstructions } from './ActiveFeedingMenu';
import SlideToConfirm from '@/components/SlideToConfirm';
import { getStopPickupKey } from '@/lib/deliveryRouteKeys';
import { setOrderDriverArrivedAtStore } from '@/lib/orderDriverPresence';
import {
  logOrderEvent,
  logOrderEventWithPosition,
  getCurrentPosition,
  recordBreadcrumb,
  haversineMeters,
  pointToPolylineMeters,
  openRouteDeviation,
  closeRouteDeviation,
  DELIVERY_GEOFENCE_RADIUS_M,
  ROUTE_DEVIATION_THRESHOLD_M,
} from '@/lib/orderTracking';
import FeederCleanPayCard from '@/components/mobile/FeederCleanPayCard';
import {
  getFeederCleanPaySummary,
  syncFeederCleanPayAdjustmentAtPickup,
  formatCleanPayMoney,
  calculateFinalFeederEarnings,
  type FeederCleanPayFlowStage,
  type FeederCleanPaySummary,
} from '@/lib/feederCleanPaySummary';
import FeederOrderCompleteScreen from '@/components/mobile/FeederOrderCompleteScreen';
import type { CompletedOrderDetailsInput } from '@/components/mobile/FeederCompletedOrderDetailsModal';
import feederAppIcon from '@/assets/feeder_app_icon.png';
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
  ThemeIcon,
  Divider,
  Checkbox,
  Image,
  Avatar,
  Modal,
} from '@mantine/core';

// ===== TYPES =====

type DeliveryStage = 'navigate_to_restaurant' | 'arrived_at_restaurant' | 'verify_pickup' | 'pickup_photo_verification' | 'navigate_to_customer' | 'capture_proof' | 'delivered';

interface OrderItem {
  name: string;
  quantity: number;
  special_instructions?: string;
}

interface DeliveryProgress {
  currentStage: DeliveryStage;
  stageNumber: number;
  totalStages: number;
  stageName: string;
  isCompleted: boolean;
  pickupPhotoUrl?: string;
  deliveryPhotoUrl?: string;
}

interface ActiveDeliveryProps {
  orderDetails: any;
  onCompleteDelivery: () => void;
  onProgressChange?: (progress: DeliveryProgress) => void;
  onCameraStateChange?: (isOpen: boolean) => void;
  /** Optional initial driver status (retail/grocery can skip straight to customer leg) */
  initialDriverStatus?: typeof DRIVER_STATUS[keyof typeof DRIVER_STATUS];
  /** Multi-stop route: list of order details; when length > 1, show stops list between deliveries */
  deliveryStops?: any[];
  /** Index of the current stop to deliver (0-based); completed stops are 0..currentStopIndex-1 */
  currentStopIndex?: number;
  /** 'stops_list' = show route list with slide to start next; 'delivering' = show delivery flow for current stop */
  routeView?: 'stops_list' | 'delivering';
  /** Called when one stop is completed (before last); parent should advance and show list or finish */
  onStopComplete?: (stopIndex: number) => void;
  /** Called when driver slides to start a stop; parent should set routeView to 'delivering' */
  onStartStop?: (stopIndex: number) => void;
}

// ===== DRIVER STATUS =====

const DRIVER_STATUS = {
  TO_STORE: 'to_store',
  AT_STORE: 'at_store',
  AWAITING_PICKUP_PHOTO: 'awaiting_pickup_photo',
  TO_CUSTOMER: 'to_customer',
  AT_CUSTOMER: 'at_customer',
  AWAITING_DELIVERY_PHOTO: 'awaiting_delivery_photo',
  COMPLETE: 'complete',
};

const STATUS_TO_STAGE_MAP: Record<string, DeliveryStage> = {
  [DRIVER_STATUS.TO_STORE]: 'navigate_to_restaurant',
  [DRIVER_STATUS.AT_STORE]: 'arrived_at_restaurant',
  [DRIVER_STATUS.AWAITING_PICKUP_PHOTO]: 'pickup_photo_verification',
  [DRIVER_STATUS.TO_CUSTOMER]: 'navigate_to_customer',
  [DRIVER_STATUS.AT_CUSTOMER]: 'arrived_at_restaurant',
  [DRIVER_STATUS.AWAITING_DELIVERY_PHOTO]: 'capture_proof',
  [DRIVER_STATUS.COMPLETE]: 'delivered',
};

const STAGE_NAMES: Record<DeliveryStage, string> = {
  navigate_to_restaurant: 'Navigate to Restaurant',
  arrived_at_restaurant: 'Arrived at Restaurant',
  verify_pickup: 'Verify Pickup',
  pickup_photo_verification: 'Pickup Photo Verification',
  navigate_to_customer: 'Navigate to Customer',
  capture_proof: 'Capture Delivery Proof',
  delivered: 'Delivered',
};

function driverStatusToCleanPayStage(driverStatus: string): FeederCleanPayFlowStage {
  switch (driverStatus) {
    case DRIVER_STATUS.TO_STORE:
      return 'enRouteToMerchant';
    case DRIVER_STATUS.AT_STORE:
    case DRIVER_STATUS.AWAITING_PICKUP_PHOTO:
      return 'arrivedAtMerchant';
    case DRIVER_STATUS.TO_CUSTOMER:
      return 'enRouteToCustomer';
    case DRIVER_STATUS.AT_CUSTOMER:
    case DRIVER_STATUS.AWAITING_DELIVERY_PHOTO:
      return 'arrivedAtCustomer';
    case DRIVER_STATUS.COMPLETE:
      return 'completed';
    default:
      return 'accepted';
  }
}

// ===== UTILITY FUNCTIONS =====

const formatAddress = (address: any): string => {
  if (!address) return '';
  if (typeof address === 'string') return address;
  if (typeof address === 'object') {
    const parts = [
      address.street || address.address,
      address.city,
      address.state,
      address.zip || address.zip_code
    ].filter(Boolean);
    return parts.join(', ');
  }
  return String(address);
};

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    notifications.show({
      title: 'Copied!',
      message: 'Copied to clipboard',
      color: 'green',
    });
  } catch (err) {
    console.error('Failed to copy text: ', err);
  }
};

// ===== PRESENTATIONAL COMPONENTS =====

const SimulatedMapView: React.FC<{ isToStore: boolean }> = ({ isToStore }) => {
  const driverPos = isToStore ? { top: '75%', left: '15%' } : { top: '20%', left: '70%' };
  const storePos = { top: '35%', left: '40%' };
  const customerPos = { top: '65%', left: '80%' };

  const routePath = isToStore 
    ? "M 20 80 L 45 40 L 85 70"
    : "M 75 25 L 85 70";

  return (
    <Box pos="absolute" top={0} left={0} right={0} bottom={0} bg="dark.9" style={{ overflow: 'hidden' }}>
      <Box pos="absolute" top={0} left={0} right={0} bottom={0} style={{ opacity: 0.2 }}>
        <Box pos="absolute" top={0} bottom={0} left="50%" w={16} bg="dark.7" />
        <Box pos="absolute" top="50%" left={0} right={0} h={16} bg="dark.7" />
        <Box pos="absolute" top="10%" right={0} bottom="60%" w="25%" bg="blue.9" style={{ opacity: 0.5 }} />
      </Box>

      <Box
        component="svg"
        pos="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        w="100%"
        h="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path 
          d={routePath} 
          fill="none" 
          stroke="#FF3D00" 
          strokeWidth="3" 
          strokeLinecap="round"
          strokeDasharray="8 4"
          style={{
            animation: 'routeFlow 1s linear infinite',
          }}
        />
        <style>{`
          @keyframes routeFlow {
            0% { stroke-dashoffset: 0; }
            100% { stroke-dashoffset: -12; }
          }
        `}</style>
      </Box>

      <ThemeIcon
        pos="absolute"
        {...driverPos}
        style={{ zIndex: 30, border: '4px solid white' }}
        size="lg"
        color="blue"
        radius="xl"
      >
        <IconNavigation size={16} style={{ transform: 'rotate(-45deg)' }} />
      </ThemeIcon>
      
      <ThemeIcon
        pos="absolute"
        {...storePos}
        style={{ zIndex: 20, border: '2px solid white' }}
        size="lg"
        color="red"
        radius="xl"
      >
        <IconToolsKitchen2 size={16} />
      </ThemeIcon>

      <ThemeIcon
        pos="absolute"
        {...customerPos}
        style={{ zIndex: 20, border: '2px solid white' }}
        size="lg"
        color="green"
        radius="xl"
      >
        <IconHome size={16} />
      </ThemeIcon>
    </Box>
  );
};

interface MapHeaderProps {
  title: string;
  status: string;
  locationIcon: React.ReactNode;
  distance: number;
  pay: number;
}

const MapHeader: React.FC<MapHeaderProps> = ({ title, status, locationIcon, distance }) => {
  return (
    <Box
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
        color: 'white',
        padding: '10px 16px',
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '48px',
      }}
    >
      <Group gap="sm" style={{ flex: 1, minWidth: 0 }}>
        <ThemeIcon
          size="sm"
          radius="xl"
          style={{ backgroundColor: 'rgba(255,255,255,0.2)', flexShrink: 0 }}
        >
          {locationIcon}
        </ThemeIcon>
        <Box style={{ minWidth: 0 }}>
          <Text size="xs" c="white" opacity={0.8} fw={500} lineClamp={1}>{status}</Text>
          <Text size="sm" fw={600} lineClamp={1}>{title}</Text>
        </Box>
      </Group>
      <Text size="sm" fw={700} style={{ flexShrink: 0 }}>
        {typeof distance === 'number' ? distance.toFixed(1) : '0.0'} mi
      </Text>
    </Box>
  );
};

interface DetailCardProps {
  title: string;
  content: string;
  icon: React.ReactNode;
  actionButton?: React.ReactNode;
  linkHref?: string;
}

const DetailCard: React.FC<DetailCardProps> = ({ title, content, icon, actionButton, linkHref }) => {
  // Check if icon is an Avatar component (restaurant logo)
  const isAvatarElement = React.isValidElement(icon) && 
    (icon.type === Avatar || (icon.props && icon.props.src));
  
  return (
    <Card mb="xs" withBorder p="xs" style={{ borderRadius: '8px' }}>
      <Group align="flex-start" gap="sm">
        {isAvatarElement ? (
          <Box style={{ flexShrink: 0 }}>{icon}</Box>
        ) : (
          <ThemeIcon size="md" radius="md" color="orange" variant="light" style={{ flexShrink: 0 }}>
            {icon}
          </ThemeIcon>
        )}
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={4} style={{ letterSpacing: '0.05em' }}>
            {title}
          </Text>
          {linkHref ? (
            <Text
              component="a"
              href={linkHref}
              size="sm"
              fw={500}
              c="blue"
              style={{ textDecoration: 'none' }}
              lineClamp={1}
              onClick={(e) => { e.preventDefault(); }}
            >
              {content}
            </Text>
          ) : (
            <Text size="sm" fw={500} c="dark" style={{ wordBreak: 'break-word', lineHeight: 1.4 }}>
              {content}
            </Text>
          )}
        </Box>
        {actionButton && <Box style={{ flexShrink: 0 }}>{actionButton}</Box>}
      </Group>
    </Card>
  );
};

// ===== MAIN COMPONENT =====

const CravenDeliveryFlow: React.FC<ActiveDeliveryProps> = ({ 
  orderDetails, 
  onCompleteDelivery, 
  onProgressChange,
  onCameraStateChange,
  initialDriverStatus,
  deliveryStops,
  currentStopIndex = 0,
  routeView = 'delivering',
  onStopComplete,
  onStartStop,
}) => {
  // All hooks must be called before any early returns
  const [status, setStatus] = useState(initialDriverStatus || DRIVER_STATUS.TO_STORE);
  const [pickupCode, setPickupCode] = useState<string | null>(null);
  const [pickupPhotoUrl, setPickupPhotoUrl] = useState<string>();
  const [deliveryPhotoUrl, setDeliveryPhotoUrl] = useState<string>();
  const [showCamera, setShowCamera] = useState(false);
  const [showOrderChat, setShowOrderChat] = useState(false);
  const [showCsSupport, setShowCsSupport] = useState(false);
  const [photoType, setPhotoType] = useState<'pickup' | 'delivery'>('pickup');
  const [showDeliveryPhotoGuide, setShowDeliveryPhotoGuide] = useState(false);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [restaurantLogo, setRestaurantLogo] = useState<string | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [showTransition, setShowTransition] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState('');
  const [transitionType, setTransitionType] = useState<'pickup' | 'arrival'>('pickup');
  const [orderStartTime, setOrderStartTime] = useState<Date | null>(null);
  const [animatedTotal, setAnimatedTotal] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);
  const prevStopIndexRef = useRef<number>(currentStopIndex);
  const multiStopRouteKey = useMemo(
    () =>
      deliveryStops && deliveryStops.length > 1
        ? deliveryStops.map((s: { order_id?: string }) => s.order_id).join('|')
        : '',
    [deliveryStops]
  );
  const routeKeyRef = useRef(multiStopRouteKey);
  // New batch / route: reset index tracking so we don't misfire TO_STORE vs TO_CUSTOMER
  useEffect(() => {
    if (multiStopRouteKey !== routeKeyRef.current) {
      routeKeyRef.current = multiStopRouteKey;
      prevStopIndexRef.current = 0;
    }
  }, [multiStopRouteKey]);

  // Multi-stop: when parent advances, next leg is either same pickup (go to customer) or new merchant (back to store)
  useEffect(() => {
    if (!deliveryStops || deliveryStops.length <= 1) return;
    if (currentStopIndex >= deliveryStops.length) return;
    if (currentStopIndex === prevStopIndexRef.current) return;
    const fallback = {
      restaurant_id: orderDetails?.restaurant_id,
      pickup_address: orderDetails?.pickup_address,
    };
    prevStopIndexRef.current = currentStopIndex;
    if (currentStopIndex === 0) return;
    const prevK = getStopPickupKey(deliveryStops[currentStopIndex - 1], fallback);
    const thisK = getStopPickupKey(deliveryStops[currentStopIndex], fallback);
    if (thisK === prevK) {
      setStatus(DRIVER_STATUS.TO_CUSTOMER);
    } else {
      setStatus(DRIVER_STATUS.TO_STORE);
    }
    setCheckedItems(new Set());
    setPickupPhotoUrl(undefined);
  }, [deliveryStops, currentStopIndex, orderDetails?.order_id, orderDetails?.restaurant_id]);

  // Each stop’s order: clear item checkmarks when the active order id changes
  useEffect(() => {
    setCheckedItems(new Set());
  }, [orderDetails?.order_id]);

  // GPS tracking for automatic instruction reading
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [hasSpokenInstructions, setHasSpokenInstructions] = useState(false);
  const [cleanPaySummary, setCleanPaySummary] = useState<FeederCleanPaySummary | null>(null);
  const [completeCleanPaySummary, setCompleteCleanPaySummary] = useState<FeederCleanPaySummary | null>(null);

  // Navigation hook for external map app deep linking
  const { openExternalNavigation } = useNavigation();

  // Set order start time when component mounts (order is accepted)
  useEffect(() => {
    if (!orderStartTime && orderDetails) {
      setOrderStartTime(new Date());
    }
  }, [orderDetails, orderStartTime]);

  useEffect(() => {
    const oid = orderDetails?.order_id;
    if (!oid || status === DRIVER_STATUS.COMPLETE) return;
    let cancelled = false;
    const stage = driverStatusToCleanPayStage(status);
    void getFeederCleanPaySummary(oid, stage).then((s) => {
      if (!cancelled) setCleanPaySummary(s);
    });
    return () => {
      cancelled = true;
    };
  }, [orderDetails?.order_id, status]);

  useEffect(() => {
    const oid = orderDetails?.order_id;
    if (!oid || status !== DRIVER_STATUS.COMPLETE) return;
    let cancelled = false;
    const run = async () => {
      for (let i = 0; i < 16; i++) {
        if (cancelled) return;
        const s = await getFeederCleanPaySummary(oid, 'completed');
        if (cancelled) return;
        setCompleteCleanPaySummary(s);
        if (s != null && typeof s.finalPayoutCents === 'number') break;
        await new Promise((r) => setTimeout(r, 350));
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [orderDetails?.order_id, status]);

  // GPS tracking - watch driver location continuously
  useEffect(() => {
    if (!orderDetails || status === DRIVER_STATUS.COMPLETE) return;

    const watchId = navigator.geolocation?.watchPosition(
      (position) => {
        setDriverLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        console.warn('GPS tracking error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    );

    return () => {
      if (watchId !== undefined) {
        navigator.geolocation?.clearWatch(watchId);
      }
    };
  }, [orderDetails, status]);

  // Check proximity to customer location and auto-read instructions
  useEffect(() => {
    if (!orderDetails || !driverLocation || hasSpokenInstructions) return;
    
    // Only check when heading to customer (after pickup)
    if (status !== DRIVER_STATUS.TO_CUSTOMER && status !== DRIVER_STATUS.AT_CUSTOMER) {
      return;
    }

    // Get customer coordinates
    const customerLat = orderDetails.dropoff_address?.latitude || orderDetails.dropoff_lat;
    const customerLng = orderDetails.dropoff_address?.longitude || orderDetails.dropoff_lng;
    
    if (!customerLat || !customerLng) return;

    // Calculate distance using Haversine formula
    const R = 6371000; // Earth's radius in meters
    const dLat = (customerLat - driverLocation.lat) * Math.PI / 180;
    const dLng = (customerLng - driverLocation.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(driverLocation.lat * Math.PI / 180) * Math.cos(customerLat * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in meters

    // If within 100 meters (about 1 block), read instructions automatically
    if (distance <= 100) {
      const deliveryNotes = orderDetails.delivery_notes;
      if (deliveryNotes && deliveryNotes.trim()) {
        console.log('🎯 Within 100m of customer - reading instructions:', deliveryNotes);
        speakDeliveryInstructions(deliveryNotes);
        setHasSpokenInstructions(true);
      }
    }
  }, [driverLocation, orderDetails, status, hasSpokenInstructions]);

  // Reset hasSpokenInstructions when starting a new delivery
  useEffect(() => {
    if (status === DRIVER_STATUS.TO_CUSTOMER) {
      setHasSpokenInstructions(false);
    }
  }, [status]);

  // Animate total earnings counter - must be before any early returns
  // Only run once when status changes to COMPLETE
  useEffect(() => {
    if (status !== DRIVER_STATUS.COMPLETE || !orderDetails) return;
    
    // Unified earnings total (matches renderComplete calculation)
    const tipC = deliveryStops?.length
      ? deliveryStops.reduce((sum: number, s: any) => sum + (s.tip_cents ?? 0), 0)
      : (orderDetails?.tip_cents ?? 0);
    const deliveryC = deliveryStops?.length
      ? deliveryStops.reduce((sum: number, s: any) => sum + (s.payout_cents ?? 0), 0)
      : (orderDetails?.payout_cents ?? 0);
    const mileageC = orderDetails?.mileage_pay_cents ?? 0;
    const sum = completeCleanPaySummary || cleanPaySummary;
    const customerTipC = sum?.customerTipCents ?? tipC;
    const promoC = sum?.promoBonusCents ?? 0;
    const adjC = sum?.adjustmentCents ?? 0;
    const totalEarned = (deliveryC + mileageC + customerTipC + promoC + adjC) / 100;
    
    // Reset animation state
    setAnimatedTotal(0);
    setIsAnimating(true);
    
    const duration = 2000; // 2 seconds
    const steps = 60;
    const increment = totalEarned / steps;
    const stepDuration = duration / steps;
    
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      const newValue = Math.min(increment * currentStep, totalEarned);
      setAnimatedTotal(newValue);
      
      if (currentStep >= steps) {
        setAnimatedTotal(totalEarned);
        setIsAnimating(false);
        clearInterval(interval);
      }
    }, stepDuration);
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Early validation - must come after all hooks
  if (!orderDetails) {
    return (
      <Stack flex={1} align="center" justify="center" p="xl">
        <Text size="lg" fw={600} c="dark">Missing Order Details</Text>
        <Text size="sm" c="dimmed">Order information is not available.</Text>
      </Stack>
    );
  }

  const isTestOrder = orderDetails.isTestOrder || false;

  // Fetch customer name from order if not provided
  useEffect(() => {
    if (orderDetails.order_id && !orderDetails.customer_name && !isTestOrder) {
      const fetchCustomerName = async () => {
        try {
          const { data: orderData } = await supabase
            .from('orders')
            .select('customer_name, customer_id')
            .eq('id', orderDetails.order_id)
            .maybeSingle();
          
          if (orderData?.customer_name) {
            setCustomerName(orderData.customer_name);
          } else if (orderData?.customer_id) {
            // Try to get from user_profiles
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('full_name')
              .eq('user_id', orderData.customer_id)
              .maybeSingle();
            
            if (profile?.full_name) {
              setCustomerName(profile.full_name);
            }
          }
        } catch (error) {
          console.error('Error fetching customer name:', error);
        }
      };
      
      fetchCustomerName();
    } else if (orderDetails.customer_name) {
      setCustomerName(orderDetails.customer_name);
    }
  }, [orderDetails.order_id, orderDetails.customer_name, isTestOrder]);

  const currentOrder = useMemo(() => {
    const resolvedCustomerName = customerName || orderDetails?.customer_name;
    const rawId = orderDetails?.id || orderDetails?.order_id;
    const shortId = rawId && typeof rawId === 'string' ? (rawId.split('-')[1] || rawId.slice(-6)) : null;
    return {
      id: rawId || 'CRAVEN-' + Math.floor(Math.random() * 9000 + 1000),
      order_number: orderDetails?.order_number || shortId || undefined,
      pay: orderDetails?.payout_cents ? (orderDetails.payout_cents / 100) : (orderDetails?.pay || orderDetails?.total || 16.25),
      distanceToStore: orderDetails?.distance_mi || (orderDetails?.distance_km ? orderDetails.distance_km * 0.621371 : 0.8),
      distanceToCustomer: orderDetails?.distance_mi || (orderDetails?.distance_km ? orderDetails.distance_km * 0.621371 : 5.1),
      totalDistance: orderDetails?.distance_mi || (orderDetails?.distance_km ? orderDetails.distance_km * 0.621371 : 5.9),
      timeEstimate: orderDetails?.estimated_time || 30,
      store: {
        name: orderDetails?.restaurant_name || '—',
        address: formatAddress(orderDetails?.pickup_address) || '—',
        pickupCode: pickupCode || 'LOADING...',
        phone: orderDetails?.customer_phone || '—',
      },
      customer: {
        name: formatCustomerNameForDriver(resolvedCustomerName) || '—',
        address: formatAddress(orderDetails?.dropoff_address) || '—',
        deliveryNotes: orderDetails?.delivery_notes || '',
        phone: orderDetails?.customer_phone || '—',
      },
      items: orderDetails?.items || [],
    };
  }, [orderDetails, pickupCode, customerName]);

  useEffect(() => {
    if (isTestOrder || !orderDetails.order_id) return;
    
    const fetchOrderData = async () => {
      try {
        const { data: orderData } = await supabase
          .from('orders')
          .select('pickup_code, restaurant_id')
          .eq('id', orderDetails.order_id)
          .maybeSingle();
        
        if (orderData?.pickup_code) {
          setPickupCode(orderData.pickup_code);
        }
        
        if (orderData?.restaurant_id) {
          setRestaurantId(orderData.restaurant_id);
          
          // Fetch restaurant logo
          const { data: restaurant } = await supabase
            .from('restaurants')
            .select('image_url, logo_url')
            .eq('id', orderData.restaurant_id)
            .maybeSingle();
          
          if (restaurant?.logo_url) {
            setRestaurantLogo(restaurant.logo_url);
          } else if (restaurant?.image_url) {
            setRestaurantLogo(restaurant.image_url);
          }
        }
      } catch (error) {
        console.error('Error fetching order data:', error);
      }
    };
    fetchOrderData();
  }, [orderDetails.order_id, isTestOrder]);

  // Load items from orderDetails immediately
  useEffect(() => {
    if (orderDetails.items && orderDetails.items.length > 0) {
      const formattedFromDetails = orderDetails.items.map((item: any, idx: number) => ({
        id: item.id || `item-${idx}`,
        name: item.name || item.menu_items?.name || 'Order Item',
        quantity: item.quantity || item.qty || 1,
        price_cents: item.price_cents || 0,
        special_instructions: item.special_instructions,
        image_url: item.image_url || item.menu_items?.image_url,
      }));
      setOrderItems(formattedFromDetails);
    }
  }, [orderDetails.items]);

  // Fetch order items + latest order status from DB (also exposed for manual refresh).
  const refreshOrderFromDb = useCallback(async () => {
    if (!orderDetails.order_id || isTestOrder) return;
    try {
      const [{ data: items, error: itemsErr }, { data: ord }] = await Promise.all([
        supabase
          .from('order_items')
          .select(`id, quantity, price_cents, special_instructions, menu_items ( name, image_url )`)
          .eq('order_id', orderDetails.order_id),
        supabase
          .from('orders')
          .select('order_status')
          .eq('id', orderDetails.order_id)
          .maybeSingle(),
      ]);
      if (!itemsErr && items && items.length > 0) {
        setOrderItems(items.map((item: any) => ({
          id: item.id,
          name: item.menu_items?.name || 'Unknown Item',
          quantity: item.quantity,
          price_cents: item.price_cents,
          special_instructions: item.special_instructions,
          image_url: item.menu_items?.image_url,
        })));
      }
      if (ord && ord.order_status === 'ready_for_pickup') {
        // Surface ready state — keep the feeder in AT_STORE but allow them to proceed.
        // No status mutation here; the UI button enables once items are checked.
      }
    } catch (error) {
      console.error('Error refreshing order from DB:', error);
    }
  }, [orderDetails.order_id, isTestOrder]);

  useEffect(() => {
    if (status === DRIVER_STATUS.AT_STORE) {
      refreshOrderFromDb();
    }
  }, [status, refreshOrderFromDb]);

  const handleItemCheck = (itemId: string) => {
    setCheckedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const allItemsChecked = orderItems.length > 0 && checkedItems.size === orderItems.length;

  const updateOrderStatus = async (newStatus: string) => {
    if (isTestOrder || !orderDetails.order_id) return;
    
    try {
      const statusMap: Record<string, string> = {
        'at_restaurant': 'assigned',
        'picked_up': 'picked_up',
        'at_customer': 'picked_up',
      };
      
      const dbStatus = statusMap[newStatus] || newStatus;
      
      const { error } = await supabase
        .from('orders')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', orderDetails.order_id);
        
      if (error) throw error;
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const uploadPhoto = async (photoDataUrl: string, type: 'pickup' | 'delivery'): Promise<string | null> => {
    if (isTestOrder) {
      return `https://mock-storage.com/${type}-${Date.now()}.jpg`;
    }

    if (!orderDetails.order_id) return null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const fileName = `${orderDetails.order_id}/${type}-${Date.now()}.jpg`;
      const response = await fetch(photoDataUrl);
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: 'image/jpeg' });

      const { data, error } = await supabase.storage
        .from('delivery-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('delivery-photos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      notifications.show({
        title: 'Upload Failed',
        message: 'Failed to upload photo. Please try again.',
        color: 'red',
      });
      return null;
    }
  };

  useEffect(() => {
    if (onProgressChange) {
      const stage = STATUS_TO_STAGE_MAP[status];
      if (stage) {
        const stageNumber = Object.keys(STATUS_TO_STAGE_MAP).indexOf(status) + 1;
        const progress: DeliveryProgress = {
          currentStage: stage,
          stageNumber,
          totalStages: 7,
          stageName: STAGE_NAMES[stage],
          isCompleted: status === DRIVER_STATUS.COMPLETE,
          pickupPhotoUrl,
          deliveryPhotoUrl,
        };
        onProgressChange(progress);
      }
    }
  }, [status, onProgressChange, pickupPhotoUrl, deliveryPhotoUrl]);

  useEffect(() => {
    if (onCameraStateChange) {
      const isCameraOpen = status === DRIVER_STATUS.AWAITING_PICKUP_PHOTO || status === DRIVER_STATUS.AWAITING_DELIVERY_PHOTO;
      onCameraStateChange(isCameraOpen);
    }
  }, [status, onCameraStateChange]);

  useEffect(() => {
    if (onProgressChange) {
      const stage = STATUS_TO_STAGE_MAP[status];
      if (stage) {
        const stageNumber = Object.keys(STATUS_TO_STAGE_MAP).indexOf(status) + 1;
        const progress: DeliveryProgress = {
          currentStage: stage,
          stageNumber,
          totalStages: 7,
          stageName: STAGE_NAMES[stage],
          isCompleted: status === DRIVER_STATUS.COMPLETE,
          pickupPhotoUrl,
          deliveryPhotoUrl,
        };
        onProgressChange(progress);
      }
    }
  }, [status, onProgressChange, pickupPhotoUrl, deliveryPhotoUrl]);

  const handleConfirmArrivalAtStore = async () => {
    if (orderDetails?.order_id) {
      const { error } = await setOrderDriverArrivedAtStore(orderDetails.order_id);
      if (error) {
        console.warn('Could not record driver arrival (merchant may still use manual status):', error);
      }
      await logOrderEventWithPosition({
        orderId: orderDetails.order_id,
        eventType: 'arrived_at_store',
        notes: 'Feeder marked arrival at merchant.',
      });
    }
    setStatus(DRIVER_STATUS.AT_STORE);
    await updateOrderStatus('at_restaurant');
  };

  const handleStartPickupVerification = () => {
    setPhotoType('pickup');
    setShowCamera(true);
    onCameraStateChange?.(true);
  };
  
  const handleConfirmPickupPhoto = async (photoUrl: string) => {
    const uploadedUrl = await uploadPhoto(photoUrl, 'pickup');
    if (uploadedUrl) {
      setPickupPhotoUrl(uploadedUrl);
      if (orderDetails?.order_id) {
        const pos = await getCurrentPosition();
        await logOrderEvent({
          orderId: orderDetails.order_id,
          eventType: 'pickup_photo_captured',
          lat: pos?.coords.latitude ?? null,
          lng: pos?.coords.longitude ?? null,
          accuracyM: pos?.coords.accuracy ?? null,
          photoUrl: uploadedUrl,
          notes: 'Pickup proof photo captured at merchant.',
        });
        try {
          await (supabase as any)
            .from('orders')
            .update({
              pickup_photo_lat: pos?.coords.latitude ?? null,
              pickup_photo_lng: pos?.coords.longitude ?? null,
            })
            .eq('id', orderDetails.order_id);
        } catch (err) {
          console.warn('Could not stamp pickup photo geo:', err);
        }
      }
      setShowCamera(false);
      onCameraStateChange?.(false);
      
      // Show transition animation
      setTransitionType('pickup');
      setTransitionMessage('Pickup confirmed! Starting delivery to customer...');
      setShowTransition(true);
      
      // Wait for animation, then transition to next step
      setTimeout(async () => {
        if (orderDetails.order_id) {
          const sync = await syncFeederCleanPayAdjustmentAtPickup(orderDetails.order_id);
          if (!sync.ok) console.warn('syncFeederCleanPayAdjustmentAtPickup', sync.error);
          await logOrderEventWithPosition({
            orderId: orderDetails.order_id,
            eventType: 'order_picked_up',
            notes: 'Order handed off to feeder. En route to customer.',
          });
        }
        setStatus(DRIVER_STATUS.TO_CUSTOMER);
        await updateOrderStatus('picked_up');

        // Hide transition after a brief moment to show the new state
        setTimeout(() => {
          setShowTransition(false);
        }, 800);
      }, 2500);
    } else {
      setShowCamera(false);
      onCameraStateChange?.(false);
    }
  };
  
  const handleConfirmArrivalAtCustomer = async () => {
    // Show arrival animation
    setTransitionType('arrival');
    setTransitionMessage('YOU HAVE ARRIVED');
    setShowTransition(true);
    
    // Wait for animation (2.5s drive + 1s beacon), then transition to next step
    setTimeout(async () => {
      setStatus(DRIVER_STATUS.AT_CUSTOMER);
      await updateOrderStatus('at_customer');
      if (orderDetails?.order_id) {
        await logOrderEventWithPosition({
          orderId: orderDetails.order_id,
          eventType: 'arrived_at_customer',
          notes: 'Feeder marked arrival at customer.',
        });
      }
      
      // Read delivery instructions out loud if enabled
      if (currentOrder.customer?.deliveryNotes) {
        speakDeliveryInstructions(currentOrder.customer.deliveryNotes);
      }
      
      // Hide transition after a brief moment
      setTimeout(() => {
        setShowTransition(false);
      }, 800);
    }, 4000);
  };
  
  const openDeliveryCameraDirect = () => {
    setPhotoType('delivery');
    setShowCamera(true);
    onCameraStateChange?.(true);
  };

  const handleStartDeliveryVerification = () => {
    const orderKey = orderDetails?.order_id || orderDetails?.id;
    const seenKey = orderKey ? `craven:delivery-photo-guide:${orderKey}` : null;
    void (async () => {
      // ---- Dropoff geofence enforcement ----
      const dropLat = orderDetails?.dropoff_address?.latitude ?? orderDetails?.dropoff_lat;
      const dropLng = orderDetails?.dropoff_address?.longitude ?? orderDetails?.dropoff_lng;
      const orderId = orderDetails?.order_id || orderDetails?.id;
      if (orderId && typeof dropLat === 'number' && typeof dropLng === 'number') {
        const pos = await getCurrentPosition();
        if (pos) {
          const distance = haversineMeters(
            pos.coords.latitude,
            pos.coords.longitude,
            dropLat,
            dropLng,
          );
          if (distance > DELIVERY_GEOFENCE_RADIUS_M) {
            await logOrderEvent({
              orderId,
              eventType: 'geofence_blocked',
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracyM: pos.coords.accuracy,
              distanceToTargetM: distance,
              notes: `Driver is ${Math.round(distance)}m from drop-off (max ${DELIVERY_GEOFENCE_RADIUS_M}m).`,
            });
            const proceed = window.confirm(
              `You appear to be ${Math.round(distance)} meters away from the drop-off location. ` +
              `Crave'N requires you to be at the customer's address to complete the delivery.\n\n` +
              `Are you sure you are at the right place? This will be logged for review.`,
            );
            if (!proceed) {
              notifications.show({
                color: 'orange',
                title: 'Move closer to the drop-off',
                message: 'Please navigate to the customer location before completing the delivery.',
              });
              return;
            }
            await logOrderEvent({
              orderId,
              eventType: 'geofence_override',
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracyM: pos.coords.accuracy,
              distanceToTargetM: distance,
              notes: 'Feeder confirmed delivery despite being outside the geofence.',
            });
          }
        }
      }
      if (seenKey) {
        try {
          if (localStorage.getItem(seenKey) === '1') {
            openDeliveryCameraDirect();
            return;
          }
        } catch {}
      }
      setShowDeliveryPhotoGuide(true);
    })();
  };
  
  const handleConfirmDeliveryPhoto = async (photoUrl: string) => {
    const uploadedUrl = await uploadPhoto(photoUrl, 'delivery');
    if (uploadedUrl) {
      setDeliveryPhotoUrl(uploadedUrl);
      
      if (orderDetails.order_id) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          await supabase.functions.invoke('finalize-delivery', {
            body: {
              orderId: orderDetails.order_id,
              driverId: user?.id,
              pickupPhotoUrl: pickupPhotoUrl,
              deliveryPhotoUrl: uploadedUrl,
            }
          });
        } catch (error) {
          console.error('Error finalizing delivery:', error);
          // Fallback: ensure merchant sees completion even if function call fails.
          await supabase
            .from('orders')
            .update({
              order_status: 'delivered',
              updated_at: new Date().toISOString(),
            })
            .eq('id', orderDetails.order_id);
        }
      }
      
      setStatus(DRIVER_STATUS.COMPLETE);
    }
    setShowCamera(false);
    onCameraStateChange?.(false);
  };

  const handleCompleteContactlessDropOff = async (opts: {
    deliveryPhotoUrl?: string;
    dropOffLocation?: string;
  }) => {
    let uploadedUrl: string | null = null;
    if (opts.deliveryPhotoUrl) {
      uploadedUrl = await uploadPhoto(opts.deliveryPhotoUrl, 'delivery');
      if (uploadedUrl) setDeliveryPhotoUrl(uploadedUrl);
    }
    if (orderDetails.order_id) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.functions.invoke('finalize-delivery', {
          body: {
            orderId: orderDetails.order_id,
            driverId: user?.id,
            pickupPhotoUrl: pickupPhotoUrl,
            deliveryPhotoUrl: uploadedUrl ?? undefined,
            dropOffLocation: opts.dropOffLocation,
          }
        });
      } catch (error) {
        console.error('Error finalizing delivery:', error);
        // Fallback: ensure merchant sees completion even if function call fails.
        await supabase
          .from('orders')
          .update({
            order_status: 'delivered',
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderDetails.order_id);
      }
    }
    // Multi-stop route: tell parent this stop is done; parent shows list or stays for completion
    if (deliveryStops && deliveryStops.length > 1 && onStopComplete != null) {
      onStopComplete(currentStopIndex);
      if (currentStopIndex === deliveryStops.length - 1) {
        setStatus(DRIVER_STATUS.COMPLETE);
      }
      return;
    }
    setStatus(DRIVER_STATUS.COMPLETE);
  };

  const handleCancelPhoto = () => {
    if (status === DRIVER_STATUS.AWAITING_PICKUP_PHOTO) {
      setStatus(DRIVER_STATUS.AT_STORE);
    } else if (status === DRIVER_STATUS.AWAITING_DELIVERY_PHOTO) {
      setStatus(DRIVER_STATUS.AT_CUSTOMER);
    }
    setShowCamera(false);
    onCameraStateChange?.(false);
  };

  const currentFlow = useMemo(() => {
    switch (status) {
      case DRIVER_STATUS.TO_STORE:
      case DRIVER_STATUS.AT_STORE:
      case DRIVER_STATUS.AWAITING_PICKUP_PHOTO:
        return {
          title: currentOrder.store.name,
          statusText: status === DRIVER_STATUS.TO_STORE ? 'Routing to Kitchen' 
                      : status === DRIVER_STATUS.AT_STORE ? 'Awaiting Hand-off'
                      : 'Verify Pickup',
          address: currentOrder.store.address,
          distance: currentOrder.distanceToStore,
          icon: <IconToolsKitchen2 size={20} />,
          isPickup: true,
        };
      case DRIVER_STATUS.TO_CUSTOMER:
      case DRIVER_STATUS.AT_CUSTOMER:
      case DRIVER_STATUS.AWAITING_DELIVERY_PHOTO:
        return {
          title: currentOrder.customer.name,
          statusText: status === DRIVER_STATUS.TO_CUSTOMER ? 'En Route to Customer' 
                      : status === DRIVER_STATUS.AT_CUSTOMER ? 'At Drop-off Location'
                      : 'Verify Drop-off',
          address: currentOrder.customer.address,
          distance: currentOrder.distanceToCustomer,
          icon: <IconHome size={20} />,
          isPickup: false,
        };
      default:
        return {
          title: currentOrder.store.name,
          statusText: 'Preparing for pickup',
          address: currentOrder.store.address,
          distance: currentOrder.distanceToStore,
          icon: <IconToolsKitchen2 size={20} />,
          isPickup: true,
        };
    }
  }, [status, currentOrder]);

  if (showCamera) {
    return (
      <FullscreenCamera
        isOpen={showCamera}
        onClose={handleCancelPhoto}
        onCapture={photoType === 'pickup' ? handleConfirmPickupPhoto : handleConfirmDeliveryPhoto}
        title={photoType === 'pickup' ? "Kitchen Hand-off Check" : "Customer Drop-off Proof"}
        description={photoType === 'pickup' ? 
          "Snap a photo of the sealed Craven bag with the order ID sticker clearly visible." : 
          "Take a photo showing the delivered bag at the customer's preferred drop-off location."}
        type={photoType}
        onVisibilityChange={onCameraStateChange}
      />
    );
  }

  if (showDeliveryPhotoGuide) {
    return (
      <DeliveryPhotoGuide
        onClose={() => setShowDeliveryPhotoGuide(false)}
        onComplete={() => {
          setShowDeliveryPhotoGuide(false);
          const orderKey = orderDetails?.order_id || orderDetails?.id;
          if (orderKey) {
            try { localStorage.setItem(`craven:delivery-photo-guide:${orderKey}`, '1'); } catch {}
          }
          openDeliveryCameraDirect();
        }}
      />
    );
  }

  // In-app order chat (messages stored for customer service / security lookup)
  if (showOrderChat && orderDetails?.order_id) {
    return (
      <OrderChatOverlay
        orderId={orderDetails.order_id}
        customerId={orderDetails?.customer_id}
        onClose={() => setShowOrderChat(false)}
      />
    );
  }

  // Transition animation overlay
  if (showTransition) {
    // Arrival animation - full screen squiggly route
    if (transitionType === 'arrival') {
      return (
        <>
          <Box
            pos="fixed"
            top={0}
            left={0}
            right={0}
            bottom={0}
            style={{
              zIndex: 9999,
              backgroundColor: '#000000',
              overflow: 'hidden',
            }}
          >
            {/* SVG squiggly route path */}
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
              }}
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <path
                d="M 15 8 
                   Q 85 15, 20 25 
                   Q -15 32, 80 42 
                   Q 115 50, 25 58 
                   Q -10 65, 75 75 
                   Q 110 82, 50 92"
                fill="none"
                stroke="#f97316"
                strokeWidth="0.8"
                strokeDasharray="2 2"
                strokeLinecap="round"
                style={{
                  opacity: 0.7,
                }}
              />
            </svg>
            
            {/* Destination pin at end of route */}
            <Box
              style={{
                position: 'absolute',
                left: '50%',
                bottom: '8%',
                transform: 'translateX(-50%)',
                width: '32px',
                height: '32px',
                backgroundColor: '#22c55e',
                borderRadius: '50%',
                border: '4px solid white',
                boxShadow: '0 0 0 4px #22c55e, 0 4px 12px rgba(0,0,0,0.3)',
                animation: 'destinationPulse 1s ease-out 2.5s infinite',
                zIndex: 5,
              }}
            />
            
            {/* Feeder icon following the squiggly path */}
            <Box
              style={{
                position: 'absolute',
                left: '15%',
                top: '5%',
                transform: 'translate(-50%, -50%)',
                animation: 'driveSquiggly 2.5s ease-in-out forwards',
                zIndex: 10,
              }}
            >
              <img 
                src={feederAppIcon} 
                alt="Feeder" 
                style={{ 
                  width: '70px', 
                  height: '70px', 
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.4))',
                }} 
              />
            </Box>
            
            {/* Beacon rings - appear after feeder arrives */}
            <Box
              style={{
                position: 'absolute',
                left: '50%',
                bottom: '8%',
                transform: 'translateX(-50%)',
                width: '150px',
                height: '150px',
                opacity: 0,
                animation: 'beaconAppear 0.3s ease-out 2.5s forwards',
                zIndex: 4,
              }}
            >
              <Box style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%', height: '100%', borderRadius: '50%', border: '3px solid rgba(34, 197, 94, 0.6)', animation: 'beaconRing 1.5s ease-out 2.7s infinite' }} />
              <Box style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%', height: '100%', borderRadius: '50%', border: '3px solid rgba(34, 197, 94, 0.4)', animation: 'beaconRing 1.5s ease-out 3s infinite' }} />
              <Box style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%', height: '100%', borderRadius: '50%', border: '3px solid rgba(34, 197, 94, 0.2)', animation: 'beaconRing 1.5s ease-out 3.3s infinite' }} />
            </Box>
            
            {/* "YOU HAVE ARRIVED" text at bottom */}
            <Text
              fw={700}
              c="#22c55e"
              style={{
                position: 'absolute',
                bottom: '22%',
                left: '50%',
                transform: 'translateX(-50%)',
                textAlign: 'center',
                letterSpacing: '0.15em',
                fontSize: '24px',
                textTransform: 'uppercase',
                opacity: 0,
                animation: 'fadeInUp 0.5s ease-out 2.6s forwards',
                textShadow: '0 0 20px rgba(34, 197, 94, 0.5)',
                zIndex: 10,
                whiteSpace: 'nowrap',
              }}
            >
              YOU HAVE ARRIVED
            </Text>
          </Box>
          
          {/* CSS Animations for arrival */}
          <style>{`
            @keyframes driveSquiggly {
              0% { left: 15%; top: 8%; }
              12% { left: 75%; top: 18%; }
              25% { left: 20%; top: 28%; }
              37% { left: 80%; top: 40%; }
              50% { left: 25%; top: 52%; }
              62% { left: 75%; top: 64%; }
              75% { left: 30%; top: 74%; }
              100% { left: 50%; top: 88%; }
            }
            @keyframes destinationPulse {
              0%, 100% { box-shadow: 0 0 0 4px #22c55e, 0 4px 12px rgba(0,0,0,0.3); }
              50% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0.5), 0 4px 12px rgba(0,0,0,0.3); }
            }
            @keyframes beaconAppear {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes beaconRing {
              0% { transform: translate(-50%, -50%) scale(0.3); opacity: 1; }
              100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
            }
            @keyframes fadeInUp {
              from { opacity: 0; transform: translateX(-50%) translateY(20px); }
              to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
          `}</style>
        </>
      );
    }
    
    // Pickup transition animation
    return (
      <Box
        pos="fixed"
        top={0}
        left={0}
        right={0}
        bottom={0}
        style={{
          zIndex: 100,
          backgroundColor: '#000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <Stack align="center" gap="xl">
          <Box
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              border: '4px solid #22c55e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              animation: 'scaleIn 0.5s ease-out, pulse 1.5s ease-in-out 0.5s infinite',
            }}
          >
            <IconCheck 
              size={64} 
              color="#22c55e"
              style={{
                animation: 'checkmark 0.5s ease-out 0.3s both',
              }}
            />
          </Box>
          
          <Text
            size="xl"
            fw={700}
            c="white"
            style={{
              textAlign: 'center',
              letterSpacing: '0.02em',
              animation: 'fadeInUp 0.6s ease-out 0.4s both',
            }}
          >
            {transitionMessage}
          </Text>
          
          {/* Loading indicator */}
          <Box
            style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(255, 255, 255, 0.2)',
              borderTop: '3px solid white',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginTop: '16px',
            }}
          />
        </Stack>
        
        {/* CSS Animations */}
        <style>{`
          @keyframes scaleIn {
            from {
              transform: scale(0);
              opacity: 0;
            }
            to {
              transform: scale(1);
              opacity: 1;
            }
          }
          
          @keyframes pulse {
            0%, 100% {
              transform: scale(1);
              box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4);
            }
            50% {
              transform: scale(1.05);
              box-shadow: 0 0 0 20px rgba(34, 197, 94, 0);
            }
          }
          
          @keyframes checkmark {
            from {
              transform: scale(0) rotate(45deg);
              opacity: 0;
            }
            to {
              transform: scale(1) rotate(0deg);
              opacity: 1;
            }
          }
          
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
          @keyframes bounceIn {
            0% {
              transform: scale(0);
              opacity: 0;
            }
            50% {
              transform: scale(1.1);
            }
            70% {
              transform: scale(0.95);
            }
            100% {
              transform: scale(1);
              opacity: 1;
            }
          }
          @keyframes pulseRing {
            0% {
              transform: translate(-50%, -50%) scale(1);
              opacity: 1;
            }
            100% {
              transform: translate(-50%, -50%) scale(1.4);
              opacity: 0;
            }
          }
          @keyframes driveToDestination {
            0% {
              left: 5%;
            }
            100% {
              left: calc(92% - 80px);
            }
          }
          @keyframes driveSquiggly {
            0% {
              left: 15%;
              top: 8%;
            }
            12% {
              left: 75%;
              top: 18%;
            }
            25% {
              left: 20%;
              top: 28%;
            }
            37% {
              left: 80%;
              top: 40%;
            }
            50% {
              left: 25%;
              top: 52%;
            }
            62% {
              left: 75%;
              top: 64%;
            }
            75% {
              left: 30%;
              top: 74%;
            }
            100% {
              left: 50%;
              top: 88%;
            }
          }
          @keyframes destinationPulse {
            0%, 100% {
              box-shadow: 0 0 0 3px #22c55e;
            }
            50% {
              box-shadow: 0 0 0 6px rgba(34, 197, 94, 0.5);
            }
          }
          @keyframes beaconAppear {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
          @keyframes beaconRing {
            0% {
              transform: translate(-50%, -50%) scale(0.3);
              opacity: 1;
            }
            100% {
              transform: translate(-50%, -50%) scale(1.5);
              opacity: 0;
            }
          }
        `}</style>
      </Box>
    );
  }

  const renderActiveFlow = () => {
    const payAmount = typeof currentOrder.pay === 'number' ? currentOrder.pay : parseFloat(String(currentOrder.pay || 0));
    const isToStore = currentFlow?.isPickup ?? true;
    const cleanPayCompact =
      cleanPaySummary ? (
        <FeederCleanPayCard variant="compact" orderEarnings={cleanPaySummary} showAdjustment />
      ) : null;

    // Multi-stop route: show list of stops; completed ones with checkmark, next one with slide to start
    if (deliveryStops && deliveryStops.length > 1 && routeView === 'stops_list' && onStartStop != null) {
      const formatStopAddress = (addr: any) => {
        if (!addr) return '—';
        if (typeof addr === 'string') return addr;
        const parts = [addr.street || addr.address, addr.city, addr.state, addr.zip || addr.zip_code].filter(Boolean);
        return parts.join(', ');
      };
      const headerHeightPx = 'calc(env(safe-area-inset-top, 0px) + 56px)';
      const batchGrad = 'linear-gradient(90deg, #f97316 0%, #ea580c 45%, #dc2626 100%)';
      const batchCardGrad = 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #dc2626 100%)';
      const gradText: React.CSSProperties = {
        background: batchGrad,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        fontWeight: 700,
      };
      const stopsListContent = (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99999,
            background: '#F9FAFB',
            fontFamily: 'system-ui, sans-serif',
            display: 'block',
          }}
        >
          <header
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: headerHeightPx,
              minHeight: 56,
              background: batchGrad,
              paddingTop: 'env(safe-area-inset-top, 0px)',
              paddingLeft: 16,
              paddingRight: 16,
              display: 'flex',
              alignItems: 'center',
              zIndex: 1,
            }}
          >
            <ActionIcon
              variant="white"
              color="dark"
              size="lg"
              radius="xl"
              aria-label="Menu"
              style={{ flexShrink: 0, background: 'rgba(255,255,255,0.95)' }}
            >
              <IconMenu2 size={20} stroke={2} />
            </ActionIcon>
          </header>
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: headerHeightPx,
              bottom: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              WebkitOverflowScrolling: 'touch',
              padding: '20px 16px calc(20px + env(safe-area-inset-bottom, 0px)) 16px',
            }}
          >
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, marginBottom: 4, color: '#111' }}>Your stops</p>
            <p style={{ margin: '0 0 4px 0', fontSize: 12, fontWeight: 600, ...gradText }}>
              Batch route
            </p>
            <p style={{ margin: 0, fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
              {currentStopIndex === 0
                ? "Start the top order when you're ready. At the store, check off each order before you leave. Next stops with the same pickup are drop-offs with bags you already have."
                : `${currentStopIndex} of ${deliveryStops.length} completed. Slide to start the next stop. If the next order is a different store, you’ll be sent there to verify the handoff first.`}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {deliveryStops.map((stop: any, index: number) => {
                const isCompleted = index < currentStopIndex;
                const isNext = index === currentStopIndex;
                const name = stop.customer_name || stop.customerName || 'Customer';
                const address = formatStopAddress(stop.dropoff_address || stop.dropoff_address?.address || stop.address);
                const orderNum = stop.order_number || stop.order_id?.slice(-4) || String(index + 1);
                const stopNumber = index + 1;
                return (
                  <div
                    key={stop.order_id || stop.id || index}
                    style={{
                      borderRadius: 16,
                      background: '#fff',
                      border: isNext ? '2px solid transparent' : '1px solid #E5E7EB',
                      backgroundImage: isNext
                        ? 'linear-gradient(#fff, #fff), ' + batchCardGrad
                        : undefined,
                      backgroundOrigin: isNext ? 'border-box' : undefined,
                      backgroundClip: isNext ? 'padding-box, border-box' : undefined,
                      boxShadow: isNext ? '0 6px 20px rgba(234, 88, 12, 0.18)' : 'none',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ padding: 16, borderBottom: '1px solid #F3F4F6' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>
                          <span style={{ marginRight: 4, ...gradText }}>Stop {stopNumber}.</span> {name}
                        </span>
                        {orderNum && (
                          <span style={{ fontSize: 12, fontWeight: 600, flexShrink: 0, ...gradText }}>Order: {orderNum}</span>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{address}</p>
                    </div>
                    {isCompleted && (
                      <div style={{ padding: 12, background: '#F0FDF4', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <IconCheck size={14} style={{ color: '#16a34a', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: '#15803d' }}>Completed</span>
                      </div>
                    )}
                    {isNext && (
                      <div style={{ padding: 16 }}>
                        <p style={{ margin: '0 0 8px 0', fontSize: 12, color: '#6b7280', textAlign: 'center' }}>Slide to confirm to start this stop</p>
                        <SlideToConfirm
                          variant="batch"
                          label="Slide to confirm to start"
                          onConfirm={() => onStartStop(currentStopIndex)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
      return createPortal(stopsListContent, document.body);
    }

    if (!currentFlow || !currentFlow.title) {
      return (
        <Stack flex={1} align="center" justify="center" p="xl">
          <Text size="lg" fw={600} c="dark" mb="md">Loading delivery details...</Text>
          <Text size="sm" c="dimmed">Please wait while we load your order information.</Text>
        </Stack>
      );
    }

    if (status === DRIVER_STATUS.TO_STORE) {
      const orderNum = currentOrder.order_number ?? currentOrder.id.split('-')[1] ?? currentOrder.id.slice(-6);
      const pa = orderDetails?.pickup_address;
      const storeLat = typeof pa === 'object' && pa != null ? (pa.latitude ?? pa.lat) : undefined;
      const storeLng = typeof pa === 'object' && pa != null ? (pa.longitude ?? pa.lng) : undefined;
      return (
        <DeliveryFlowStepOne
          restaurantName={currentOrder.store.name}
          pickupAddress={currentOrder.store.address}
          storeLat={storeLat != null ? Number(storeLat) : undefined}
          storeLng={storeLng != null ? Number(storeLng) : undefined}
          orderNumber={orderNum}
          customerName={currentOrder.customer.name}
          isTestOrder={isTestOrder}
          estimatedPay={payAmount}
          distanceMi={currentOrder.distanceToStore ?? 0.8}
          estArrivalMin={currentOrder.timeEstimate ?? 4}
          onNavigate={() => {
            openExternalNavigation({
              address: currentOrder.store.address || '',
              name: currentOrder.store.name,
            });
          }}
          onArrived={handleConfirmArrivalAtStore}
          cleanPaySlot={cleanPayCompact}
        />
      );
    }

    if (status === DRIVER_STATUS.AT_STORE) {
      const orderNum = currentOrder.order_number ?? currentOrder.id.split('-')[1] ?? currentOrder.id.slice(-6);
      const pa = orderDetails?.pickup_address;
      const storeLat = typeof pa === 'object' && pa != null ? (pa.latitude ?? pa.lat) : undefined;
      const storeLng = typeof pa === 'object' && pa != null ? (pa.longitude ?? pa.lng) : undefined;
      const stepTwoItems = orderItems.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        special_instructions: item.special_instructions,
      }));
      return (
        <DeliveryFlowStepTwo
          restaurantName={currentOrder.store.name}
          pickupAddress={currentOrder.store.address}
          storeLat={storeLat != null ? Number(storeLat) : undefined}
          storeLng={storeLng != null ? Number(storeLng) : undefined}
          orderNumber={orderNum}
          customerName={currentOrder.customer.name}
          isTestOrder={isTestOrder}
          estimatedPay={payAmount}
          distanceMi={currentOrder.distanceToStore ?? 0.8}
          orderItems={stepTwoItems}
          checkedItemIds={checkedItems}
          onToggleItem={handleItemCheck}
          onNavigate={() => {
            openExternalNavigation({
              address: currentOrder.store.address || '',
              name: currentOrder.store.name,
            });
          }}
          onConfirmPickup={handleStartPickupVerification}
          batchRouteStopCount={deliveryStops && deliveryStops.length > 1 ? deliveryStops.length : undefined}
          cleanPaySlot={cleanPayCompact}
          onRefreshStatus={refreshOrderFromDb}
        />
      );
    }

    if (status === DRIVER_STATUS.TO_CUSTOMER) {
      const orderNum = currentOrder.order_number ?? currentOrder.id.split('-')[1] ?? currentOrder.id.slice(-6);
      const dropoff = orderDetails?.dropoff_address;
      const customerLat = typeof dropoff === 'object' && dropoff != null ? (dropoff.latitude ?? dropoff.lat) : undefined;
      const customerLng = typeof dropoff === 'object' && dropoff != null ? (dropoff.longitude ?? dropoff.lng) : undefined;
      const deliveryByRaw =
        orderDetails?.estimated_delivery_time ??
        orderDetails?.max_delivery_time ??
        orderDetails?.delivery_by;
      const deliveryByTime =
        deliveryByRaw != null
          ? (deliveryByRaw instanceof Date ? deliveryByRaw : new Date(deliveryByRaw)).toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
            })
          : undefined;
      return (
        <DeliveryFlowStepThree
          customerName={currentOrder.customer.name}
          customerAddress={currentOrder.customer.address}
          customerLat={customerLat != null ? Number(customerLat) : undefined}
          customerLng={customerLng != null ? Number(customerLng) : undefined}
          orderNumber={orderNum}
          isTestOrder={isTestOrder}
          estimatedPay={payAmount}
          distanceMi={currentOrder.distanceToCustomer ?? 5.1}
          deliveryNotes={currentOrder.customer.deliveryNotes}
          customerPhone={currentOrder.customer.phone}
          headlineLabel="Head to your stop"
          deliveryByTime={deliveryByTime}
          useSlideToConfirm
          onNavigate={() => {
            openExternalNavigation({
              address: currentOrder.customer.address || '',
              name: currentOrder.customer.name,
            });
          }}
          onCall={
            orderDetails?.order_id
              ? async () => {
                  try {
                    notifications.show({ id: 'masked-call', message: 'Connecting… Your phone will ring.', loading: true });
                    const { data, error } = await supabase.functions.invoke('start-masked-call', {
                      body: { order_id: orderDetails.order_id, caller_role: 'driver' },
                    });
                    notifications.hide('masked-call');
                    if (error) throw error;
                    if (data?.error) throw new Error(data.error);
                    notifications.show({ message: 'Your phone will ring from the delivery number.', color: 'green' });
                  } catch (e) {
                    notifications.show({ message: (e as Error)?.message ?? 'Could not start call.', color: 'red' });
                  }
                }
              : undefined
          }
          onMessage={
            currentOrder.customer.phone || orderDetails?.order_id
              ? () => { setShowOrderChat(true); }
              : undefined
          }
          onSpeakInstructions={
            currentOrder.customer.deliveryNotes
              ? () => speakDeliveryInstructions(currentOrder.customer.deliveryNotes!)
              : undefined
          }
          onCopyInstructions={
            currentOrder.customer.deliveryNotes
              ? () => copyToClipboard(currentOrder.customer.deliveryNotes!)
              : undefined
          }
          onArrived={handleConfirmArrivalAtCustomer}
          cleanPaySlot={cleanPayCompact}
        />
      );
    }

    if (status === DRIVER_STATUS.AT_CUSTOMER) {
      const orderNum = currentOrder.id.split('-')[1] || currentOrder.id.slice(-8);
      const deliveryByRaw =
        orderDetails?.estimated_delivery_time ??
        orderDetails?.max_delivery_time ??
        orderDetails?.delivery_by;
      const dropoffTimeLabel =
        deliveryByRaw != null
          ? (deliveryByRaw instanceof Date ? deliveryByRaw : new Date(deliveryByRaw)).toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
            }) + ' drop-off'
          : 'drop-off';
      return (
        <ContactlessDeliveryFlow
          customerName={currentOrder.customer.name}
          customerAddress={currentOrder.customer.address}
          dropoffTimeLabel={dropoffTimeLabel}
          propertyType="House"
          orderNumber={orderNum}
          orderId={orderDetails?.order_id}
          itemsToScanCount={Math.max(1, orderItems.length)}
          deliveryNotes={currentOrder.customer.deliveryNotes}
          onNavigate={() => {
            openExternalNavigation({
              address: currentOrder.customer.address || '',
              name: currentOrder.customer.name,
            });
          }}
          onContact={
            orderDetails?.order_id
              ? async () => {
                  try {
                    notifications.show({ id: 'masked-call', message: 'Connecting…', loading: true });
                    const { data, error } = await supabase.functions.invoke('start-masked-call', {
                      body: { order_id: orderDetails.order_id, caller_role: 'driver' },
                    });
                    notifications.hide('masked-call');
                    if (error) throw error;
                    if (data?.error) throw new Error(data.error);
                    notifications.show({ message: 'Your phone will ring.', color: 'green' });
                  } catch (e) {
                    notifications.show({ message: (e as Error)?.message ?? 'Could not start call.', color: 'red' });
                  }
                }
              : undefined
          }
          beforeCompleteDeliverySlot={
            cleanPaySummary ? (
              <Card withBorder p="sm" radius="md" bg="orange.0" style={{ borderColor: '#FED7AA' }}>
                <Text size="sm" fw={700} mb={8}>
                  After completion, your final earnings receipt will be generated.
                </Text>
                <Text size="xs" c="dark" fw={600}>
                  Expected Final Payout: {formatCleanPayMoney(cleanPaySummary.expectedFinalPayoutCents)}
                </Text>
                <Text size="xs" c="dimmed" mt={4}>
                  Customer Tip: {formatCleanPayMoney(cleanPaySummary.customerTipCents)}
                </Text>
                <Text size="xs" c="dimmed" mt={8} fw={600}>
                  Complete Delivery
                </Text>
              </Card>
            ) : null
          }
          onCompleteDropOff={handleCompleteContactlessDropOff}
        />
      );
    }

    return (
      <Box 
        style={{ 
          fontFamily: 'sans-serif',
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#fff',
        }} 
        data-testid="delivery-flow"
      >
        {/* Compact map section - hidden at drop-off so this step is full screen */}
        {(status !== DRIVER_STATUS.AT_CUSTOMER && status !== DRIVER_STATUS.AWAITING_DELIVERY_PHOTO) && (
          <Box 
            style={{ 
              height: 140,
              flexShrink: 0,
              position: 'relative',
            }}
          >
            <SimulatedMapView isToStore={isToStore} /> 
            <MapHeader
              title={currentFlow.title}
              status={currentFlow.statusText || ''}
              locationIcon={currentFlow.icon}
              distance={currentFlow.distance || 0}
              pay={payAmount}
            />
          </Box>
        )}

        {/* Content section - scrollable */}
        <Box 
          style={{ 
            flex: 1,
            overflowY: 'auto', 
            backgroundColor: 'white', 
            padding: '8px 16px 16px',
          }}
        >
          <Stack gap="xs" align="stretch">
            {/* Customer name and order number - show customer name during pickup and delivery */}
            {currentFlow.isPickup || status === DRIVER_STATUS.TO_CUSTOMER || status === DRIVER_STATUS.AT_CUSTOMER ? (
              <Stack gap={4}>
                <Text size="sm" fw={600} c="dimmed" style={{ letterSpacing: '0.02em' }}>
                  {currentOrder.customer.name}
                </Text>
                <Group justify="space-between" align="center">
                  <Title order={2} fw={700} c="dark" style={{ lineHeight: 1.2 }}>
                    Order #{currentOrder.order_number ?? currentOrder.id.split('-')[1] ?? currentOrder.id.slice(-6)}
                  </Title>
                  {isTestOrder && (
                    <Badge color="orange" variant="outline">
                      Test Order
                    </Badge>
                  )}
                </Group>
              </Stack>
            ) : (
              <Group justify="space-between" align="center">
                <Title order={2} fw={700} c="dark">
                  Order #{currentOrder.id.split('-')[1] || currentOrder.id.slice(-8)}
                </Title>
                {isTestOrder && (
                  <Badge color="orange" variant="outline">
                    Test Order
                  </Badge>
                )}
              </Group>
            )}
        
            {currentFlow.isPickup ? (
              <>
                <DetailCard 
                  title="PICKUP ADDRESS"
                  content={currentOrder.store.address}
                  icon={
                    restaurantLogo ? (
                      <Avatar src={restaurantLogo} size={32} radius="sm" />
                    ) : (
                      <IconMapPin size={20} />
                    )
                  }
                  actionButton={
                    <Button 
                      variant="outline"
                      size="sm"
                      title="Start Navigation"
                      onClick={() => {
                        openExternalNavigation({
                          address: currentOrder.store.address || '',
                          name: currentOrder.store.name,
                        });
                      }}
                      leftSection={<IconNavigation size={16} />}
                    >
                      Navigate
                    </Button>
                  }
                />
                {pickupCode && (
                  <DetailCard 
                    title="ORDER CODE (FOR KITCHEN)"
                    content={pickupCode}
                    icon={<IconPackage size={20} />}
                    actionButton={
                      <ActionIcon
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          copyToClipboard(pickupCode);
                        }} 
                        title="Copy Code"
                      >
                        <IconCopy size={16} />
                      </ActionIcon>
                    }
                  />
                )}
                
                {/* Show order items when arrived at restaurant */}
                {status === DRIVER_STATUS.AT_STORE && (
                  <Card bg="orange.0" style={{ borderColor: 'var(--mantine-color-orange-2)', flexShrink: 0 }} withBorder p="sm">
                    <Title order={5} fw={600} c="orange.7" mb="sm">
                      Order Items {orderItems.length > 0 ? `(${orderItems.length})` : ''}
                    </Title>
                    {orderItems.length > 0 ? (
                      <>
                        <Box
                          style={{
                            maxHeight: orderItems.length >= 3 ? '160px' : 'none',
                            overflowY: orderItems.length >= 3 ? 'auto' : 'visible',
                            overflowX: 'hidden',
                            paddingRight: orderItems.length >= 3 ? '8px' : '0',
                          }}
                        >
                          <Stack gap="xs" align="stretch">
                            {orderItems.map((item) => {
                              const isChecked = checkedItems.has(item.id);
                              return (
                                <Group 
                                  key={item.id} 
                                  justify="space-between" 
                                  align="center" 
                                  p="xs"
                                  style={{ 
                                    backgroundColor: isChecked ? 'var(--mantine-color-orange-1)' : 'transparent',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s'
                                  }}
                                  onClick={() => handleItemCheck(item.id)}
                                >
                                  <Group gap="xs" style={{ flex: 1 }}>
                                    <Checkbox
                                      checked={isChecked}
                                      onChange={() => handleItemCheck(item.id)}
                                      onClick={(e) => e.stopPropagation()}
                                      size="sm"
                                      color="orange"
                                    />
                                    <Box style={{ flex: 1 }}>
                                      <Text size="sm" fw={isChecked ? 600 : 500} c="dark" style={{ textDecoration: isChecked ? 'line-through' : 'none' }}>
                                        {item.name}
                                      </Text>
                                      {item.special_instructions && (
                                        <Text size="xs" c="dimmed" mt={2}>
                                          {item.special_instructions}
                                        </Text>
                                      )}
                                    </Box>
                                  </Group>
                                  <Badge color="gray" size="sm">
                                    x{item.quantity}
                                  </Badge>
                                </Group>
                              );
                            })}
                          </Stack>
                        </Box>
                        {allItemsChecked && (
                          <Text size="xs" c="green.7" fw={500} mt={4} ta="center" style={{ lineHeight: 1.2 }}>
                            ✓ All items confirmed
                          </Text>
                        )}
                      </>
                    ) : (
                      <Text size="sm" c="dimmed" ta="center" py="md">
                        Loading order items...
                      </Text>
                    )}
                  </Card>
                )}

                <Card withBorder p="sm">
                  <Group justify="space-between" align="center">
                    <Group gap={4}>
                      <IconCurrencyDollar size={16} color="var(--mantine-color-green-6)" />
                      <Text size="sm" fw={500} c="dimmed">Estimated Pay</Text>
                    </Group>
                    <Text size="xl" fw={700} c="green.7" style={{ lineHeight: 'none' }}>
                      ${typeof payAmount === 'number' ? payAmount.toFixed(2) : String(payAmount || '0.00')}
                    </Text>
                  </Group>
                </Card>

                {status === DRIVER_STATUS.TO_STORE && (
                  <Button 
                    onClick={handleConfirmArrivalAtStore}
                    size="md"
                    fullWidth
                    color="gray"
                    data-testid="arrived-at-restaurant-button"
                    style={{ borderRadius: '8px' }}
                  >
                    Arrived at {orderDetails.restaurant_name || 'pickup location'}
                  </Button>
                )}
                
                {status === DRIVER_STATUS.AT_STORE && (
                  <Button 
                    onClick={handleStartPickupVerification}
                    size="md"
                    fullWidth
                    color="orange"
                    disabled={!allItemsChecked && orderItems.length > 0}
                    data-testid="verify-pickup-button"
                    style={{ borderRadius: '8px' }}
                  >
                    {allItemsChecked || orderItems.length === 0 
                      ? 'Order Ready? Start Hand-off Check' 
                      : `Confirm ${orderItems.length - checkedItems.size} item(s) first`}
                  </Button>
                )}
              </>
            ) : (
              <>
                <DetailCard 
                  title="CUSTOMER ADDRESS"
                  content={currentOrder.customer.address}
                  icon={<IconHome size={20} />}
                  actionButton={
                    <Button 
                      variant="outline"
                      size="sm"
                      title="Start Navigation"
                      onClick={() => {
                        openExternalNavigation({
                          address: currentOrder.customer.address || '',
                          name: currentOrder.customer.name,
                        });
                      }}
                      leftSection={<IconNavigation size={16} />}
                    >
                      Navigate
                    </Button>
                  }
                />
                {currentOrder.customer.deliveryNotes && (
                  <DetailCard 
                    title="SPECIAL INSTRUCTIONS"
                    content={currentOrder.customer.deliveryNotes}
                    icon={<IconBell size={20} />}
                    actionButton={
                      <Box style={{ display: 'flex', gap: 8 }}>
                        <ActionIcon
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            speakDeliveryInstructions(currentOrder.customer.deliveryNotes);
                          }} 
                          title="Read Out Loud"
                        >
                          <IconVolume size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            copyToClipboard(currentOrder.customer.deliveryNotes);
                          }} 
                          title="Copy Instructions"
                        >
                          <IconCopy size={16} />
                        </ActionIcon>
                      </Box>
                    }
                  />
                )}

                <Card withBorder p="sm">
                  <Group justify="space-between" align="center">
                    <Group gap={4}>
                      <IconCurrencyDollar size={16} color="var(--mantine-color-green-6)" />
                      <Text size="sm" fw={500} c="dimmed">Estimated Pay</Text>
                    </Group>
                    <Text size="xl" fw={700} c="green.7" style={{ lineHeight: 'none' }}>
                      ${typeof payAmount === 'number' ? payAmount.toFixed(2) : String(payAmount || '0.00')}
                    </Text>
                  </Group>
                </Card>

                {status === DRIVER_STATUS.TO_CUSTOMER && (
                  <Button 
                    onClick={handleConfirmArrivalAtCustomer}
                    size="md"
                    fullWidth
                    color="gray"
                    data-testid="arrived-at-customer-button"
                    style={{ borderRadius: '8px' }}
                  >
                    Arrived at Customer's Location
                  </Button>
                )}
                
                {status === DRIVER_STATUS.AT_CUSTOMER && (
                  <Button 
                    onClick={handleStartDeliveryVerification}
                    size="md"
                    fullWidth
                    color="gray"
                    data-testid="complete-delivery-button"
                    style={{ borderRadius: '8px' }}
                  >
                    Drop-off & Complete Delivery
                  </Button>
                )}
              </>
            )}
          </Stack>
        </Box>
      </Box>
    );
  };

  const renderComplete = () => {
    const displayOrderId = orderDetails?.order_id ?? orderDetails?.id ?? currentOrder.id ?? '';
    const summary = completeCleanPaySummary || cleanPaySummary;

    const finalEarnings = calculateFinalFeederEarnings(summary, {
      mileage_pay_cents: orderDetails?.mileage_pay_cents,
      tip_cents: orderDetails?.tip_cents,
      payout_cents: orderDetails?.payout_cents,
    });

    let elapsedTime = '0 min';
    if (orderStartTime) {
      const elapsed = Math.floor((Date.now() - orderStartTime.getTime()) / 1000 / 60);
      if (elapsed < 60) {
        elapsedTime = `${elapsed} min`;
      } else {
        const hours = Math.floor(elapsed / 60);
        const minutes = elapsed % 60;
        elapsedTime = minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
      }
    }

    const orderItems: Array<{ name?: string; quantity?: number; special_instructions?: string }> =
      Array.isArray(orderDetails?.order_items)
        ? orderDetails.order_items
        : Array.isArray(orderDetails?.items)
          ? orderDetails.items
          : [];

    const completedDetails: CompletedOrderDetailsInput = {
      displayOrderId,
      restaurantName: currentOrder.store.name,
      pickupAddress: currentOrder.store.address,
      dropoffAddress: orderDetails?.dropoff_address,
      totalMiles: currentOrder.totalDistance || 0,
      elapsedTime,
      deliveryCompletedAt: summary?.deliveryCompletedAt ?? null,
      offerAcceptedAt: summary?.offerAcceptedAt ?? null,
      pickupConfirmedAt: summary?.pickupConfirmedAt ?? null,
      orderStatus: orderDetails?.order_status ?? 'delivered',
      items: orderItems.map((item: any) => ({
        name: item.name || 'Item',
        quantity: item.quantity ?? 1,
        special_instructions: item.special_instructions,
      })),
      stopCount: deliveryStops?.length,
    };

    const fallbackFinalPayoutCents =
      (orderDetails?.payout_cents ?? 0) + (orderDetails?.mileage_pay_cents ?? 0) + (orderDetails?.tip_cents ?? 0);

    return (
      <FeederOrderCompleteScreen
        earnings={
          finalEarnings ?? {
            orderId: displayOrderId,
            deliveryPayCents: orderDetails?.payout_cents ?? 0,
            mileagePayCents: orderDetails?.mileage_pay_cents ?? 0,
            customerTipCents: orderDetails?.tip_cents ?? 0,
            promoBonusCents: 0,
            adjustmentCents: 0,
            finalPayoutCents: fallbackFinalPayoutCents,
            originalAcceptedOfferCents: null,
            cleanPayVerified: false,
            tipStatus: 'Paid to Feeder',
            payoutStatus: 'ready',
            offerAcceptedAt: null,
            pickupConfirmedAt: null,
            deliveryCompletedAt: null,
            adjustmentReason: null,
          }
        }
        displayOrderId={displayOrderId}
        orderDetails={completedDetails}
        onContinue={onCompleteDelivery}
      />
    );
  };

  const supportOverlay = (
    <>
      {/* Floating Help button — opens CS support thread (same portal merchants/customers use) */}
      <button
        type="button"
        onClick={() => setShowCsSupport(true)}
        aria-label="Contact Crave'N customer service"
        style={{
          position: 'fixed',
          right: 16,
          bottom: 96,
          zIndex: 9998,
          width: 52,
          height: 52,
          borderRadius: 26,
          background: '#EA580C',
          color: '#fff',
          border: 'none',
          boxShadow: '0 6px 16px rgba(234,88,12,0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <HelpCircle size={26} />
      </button>

      {showCsSupport && createPortal(
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
          onClick={() => setShowCsSupport(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 520, height: '85vh',
              background: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18,
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', borderBottom: '1px solid #e5e7eb', background: '#EA580C', color: '#fff',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                <HelpCircle size={18} />
                <span>Crave'N Customer Service</span>
              </div>
              <button
                onClick={() => setShowCsSupport(false)}
                aria-label="Close support"
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              {orderDetails?.id ? (
                <DriverSupportThread
                  orderId={orderDetails.id}
                  restaurantId={orderDetails.restaurant_id ?? null}
                />
              ) : (
                <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
                  No active order to attach a support thread to.
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );

  if (status === DRIVER_STATUS.COMPLETE) {
    return <>{renderComplete()}{supportOverlay}</>;
  }

  return <>{renderActiveFlow()}{supportOverlay}</>;
}

export default CravenDeliveryFlow;

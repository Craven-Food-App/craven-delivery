import React, { useState, useEffect, useMemo, useRef } from 'react';
import { IconMapPin, IconNavigation, IconCurrencyDollar, IconClock, IconPackage, IconHome, IconBell, IconCopy, IconToolsKitchen2, IconCheck } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCustomerNameForDriver } from '@/utils/nameFormatting';
import { notifications } from '@mantine/notifications';
import FullscreenCamera from './FullscreenCamera';
import { speakDeliveryInstructions } from './ActiveFeedingMenu';
import feederAppIcon from '@/assets/feeder_app_icon.png';
import FeederCleanPayCard from '@/components/mobile/FeederCleanPayCard';
import {
  getFeederCleanPaySummary,
  syncFeederCleanPayAdjustmentAtPickup,
  calculateFinalFeederEarnings,
  type FeederCleanPayFlowStage,
  type FeederCleanPaySummary,
} from '@/lib/feederCleanPaySummary';
import FeederOrderCompleteScreen from '@/components/mobile/FeederOrderCompleteScreen';
import type { CompletedOrderDetailsInput } from '@/components/mobile/FeederCompletedOrderDetailsModal';
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
    const street =
      address.street ||
      address.address ||
      address.street_address ||
      address.line1 ||
      address.address_line_1 ||
      address.address_line1 ||
      address.addr1 ||
      '';
    const unitRaw =
      address.unit ||
      address.apt ||
      address.apartment ||
      address.suite ||
      address.line2 ||
      address.address_line_2 ||
      address.address_line2 ||
      '';
    const unit = unitRaw
      ? /^(apt|unit|ste|suite|#)/i.test(String(unitRaw).trim())
        ? String(unitRaw).trim()
        : `Apt ${String(unitRaw).trim()}`
      : '';
    const streetFull = [street, unit].filter(Boolean).join(' ').trim();
    const cityState = [address.city, address.state].filter(Boolean).join(', ');
    const zip = address.zip || address.zip_code || address.postal_code;
    const parts = [streetFull, cityState, zip].filter(Boolean);
    if (parts.length === 0 && address.formatted) return String(address.formatted);
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
      p="md"
      style={{
        background: 'linear-gradient(to bottom right, var(--mantine-color-orange-6), var(--mantine-color-red-6))',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        position: 'relative',
        zIndex: 40,
        opacity: 0.8,
        paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
      }}
    >
      <Group justify="space-between" mb="xl">
        <Title order={2} fw={700}>CRAVEN</Title>
        <Badge color="white" variant="light" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}>
          <Group gap={4}>
            <Text size="sm" fw={600}>ON FIRE</Text>
            <IconClock size={16} />
          </Group>
        </Badge>
      </Group>

      <Group justify="space-between" align="flex-end">
        <Group gap="md">
          <ThemeIcon
            size="xl"
            radius="xl"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.5)' }}
          >
            {locationIcon}
          </ThemeIcon>
          <Box>
            <Text size="xs" c="white" opacity={0.8} fw={500}>{status}</Text>
            <Title order={4} fw={700} lineClamp={1}>{title}</Title>
          </Box>
        </Group>

        <Box style={{ textAlign: 'right' }}>
          <Text size="xl" fw={700} style={{ lineHeight: 'none' }}>
            {typeof distance === 'number' ? distance.toFixed(1) : '0.0'} mi
          </Text>
          <Text size="xs" c="white" opacity={0.8} fw={500}>to destination</Text>
        </Box>
      </Group>
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
    <Card mb="sm" withBorder p="sm" style={{ borderRadius: '8px' }}>
      <Group align="flex-start" gap="sm">
        {isAvatarElement ? (
          <Box style={{ flexShrink: 0 }}>{icon}</Box>
        ) : (
          <ThemeIcon size="lg" radius="md" color="orange" variant="light" style={{ flexShrink: 0 }}>
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
  onCameraStateChange 
}) => {
  // All hooks must be called before any early returns
  const [status, setStatus] = useState(DRIVER_STATUS.TO_STORE);
  const [pickupCode, setPickupCode] = useState<string | null>(null);
  const [pickupPhotoUrl, setPickupPhotoUrl] = useState<string>();
  const [deliveryPhotoUrl, setDeliveryPhotoUrl] = useState<string>();
  const [showCamera, setShowCamera] = useState(false);
  const [photoType, setPhotoType] = useState<'pickup' | 'delivery'>('pickup');
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
  const [cleanPaySummary, setCleanPaySummary] = useState<FeederCleanPaySummary | null>(null);
  const [completeCleanPaySummary, setCompleteCleanPaySummary] = useState<FeederCleanPaySummary | null>(null);

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

  // Animate total earnings counter - must be before any early returns
  // Only run once when status changes to COMPLETE
  useEffect(() => {
    if (status !== DRIVER_STATUS.COMPLETE || !orderDetails) return;
    
    // Calculate total once
    const totalEarned = orderDetails?.payout_cents ? (orderDetails.payout_cents / 100) : (orderDetails?.pay || orderDetails?.total || 16.25);
    
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
    return {
      id: orderDetails?.id || orderDetails?.order_id || 'CRAVEN-' + Math.floor(Math.random() * 9000 + 1000),
      pay: orderDetails?.payout_cents ? (orderDetails.payout_cents / 100) : (orderDetails?.pay || orderDetails?.total || 16.25),
      distanceToStore: orderDetails?.distance_mi || (orderDetails?.distance_km ? orderDetails.distance_km * 0.621371 : 0.8),
      distanceToCustomer: orderDetails?.distance_mi || (orderDetails?.distance_km ? orderDetails.distance_km * 0.621371 : 5.1),
      totalDistance: orderDetails?.distance_mi || (orderDetails?.distance_km ? orderDetails.distance_km * 0.621371 : 5.9),
      timeEstimate: orderDetails?.estimated_time || 30,
      store: {
        name: orderDetails?.restaurant_name || 'Craven Restaurant',
        address: formatAddress(orderDetails?.pickup_address) || '123 Main St',
        pickupCode: pickupCode || 'LOADING...',
        phone: orderDetails?.customer_phone || '(555) 555-5555',
      },
      customer: {
        name: formatCustomerNameForDriver(resolvedCustomerName),
        address: formatAddress(orderDetails?.dropoff_address) || '456 Oak Ave',
        deliveryNotes: orderDetails?.delivery_notes || 'Ring doorbell',
        phone: orderDetails?.customer_phone || '(555) 555-1234',
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

  // Fetch from database when driver arrives at restaurant (for more complete data)
  useEffect(() => {
    if (status === DRIVER_STATUS.AT_STORE && orderDetails.order_id && !isTestOrder) {
      const fetchOrderItems = async () => {
        try {
          const { data: items, error } = await supabase
            .from('order_items')
            .select(`
              id,
              quantity,
              price_cents,
              special_instructions,
              menu_items (
                name,
                image_url
              )
            `)
            .eq('order_id', orderDetails.order_id);
          
          if (error) {
            console.warn('Error fetching order items from DB:', error);
            // Keep existing items from orderDetails
            return;
          }
          
          if (items && items.length > 0) {
            const formattedItems = items.map((item: any) => ({
              id: item.id,
              name: item.menu_items?.name || 'Unknown Item',
              quantity: item.quantity,
              price_cents: item.price_cents,
              special_instructions: item.special_instructions,
              image_url: item.menu_items?.image_url,
            }));
            setOrderItems(formattedItems);
          }
        } catch (error) {
          console.error('Error fetching order items:', error);
          // Keep existing items from orderDetails if fetch fails
        }
      };
      
      fetchOrderItems();
    }
  }, [status, orderDetails.order_id, isTestOrder]);

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
      
      // Read delivery instructions out loud if enabled
      if (currentOrder.customer?.special_instructions) {
        speakDeliveryInstructions(currentOrder.customer.special_instructions);
      }
      
      // Hide transition after a brief moment
      setTimeout(() => {
        setShowTransition(false);
      }, 800);
    }, 4000);
  };
  
  const handleStartDeliveryVerification = () => {
    setPhotoType('delivery');
    setShowCamera(true);
    onCameraStateChange?.(true);
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
        }
      }
      
      setStatus(DRIVER_STATUS.COMPLETE);
    }
    setShowCamera(false);
    onCameraStateChange?.(false);
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

    if (!currentFlow || !currentFlow.title) {
      return (
        <Stack flex={1} align="center" justify="center" p="xl">
          <Text size="lg" fw={600} c="dark" mb="md">Loading delivery details...</Text>
          <Text size="sm" c="dimmed">Please wait while we load your order information.</Text>
        </Stack>
      );
    }

    return (
      <Stack 
        flex={1} 
        style={{ 
          fontFamily: 'sans-serif',
        }} 
        data-testid="delivery-flow" 
        gap={0}
      >
        {/* Full-screen map section */}
        <Box 
          h={status === DRIVER_STATUS.TO_CUSTOMER ? "calc(45% + 50px)" : "45%"} 
          w="100%" 
          pos="relative" 
          style={{ 
            flexShrink: 0,
            paddingTop: 'env(safe-area-inset-top, 0px)',
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

        {/* Content section - more compact */}
        <Box 
          flex={1} 
          px="sm" 
          pb="sm" 
          style={{ 
            overflowY: 'auto', 
            backgroundColor: 'white', 
            borderTopLeftRadius: '20px', 
            borderTopRightRadius: '20px', 
            marginTop: -16,
            paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
          }}
        >
          <Stack gap="sm" pt="md" align="stretch">
            {/* Customer name and order number - show customer name during pickup and delivery */}
            {currentFlow.isPickup || status === DRIVER_STATUS.TO_CUSTOMER || status === DRIVER_STATUS.AT_CUSTOMER ? (
              <Stack gap={4} style={{ marginTop: '20px' }}>
                <Text size="sm" fw={600} c="dimmed" style={{ letterSpacing: '0.02em' }}>
                  {currentOrder.customer.name}
                </Text>
                <Group justify="space-between" align="center">
                  <Title order={2} fw={700} c="dark" style={{ lineHeight: 1.2 }}>
                    Order #{currentOrder.id.split('-')[1] || currentOrder.id.slice(-8)}
                  </Title>
                  {isTestOrder && (
                    <Badge color="orange" variant="outline">
                      Test Order
                    </Badge>
                  )}
                </Group>
              </Stack>
            ) : (
              <Group justify="space-between" align="center" style={{ marginTop: '20px' }}>
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
                        const address = encodeURIComponent(currentOrder.store.address || '');
                        window.open(`https://maps.apple.com/?daddr=${address}`, '_blank');
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

                {cleanPayCompact}

                {status === DRIVER_STATUS.TO_STORE && (
                  <Button 
                    onClick={handleConfirmArrivalAtStore}
                    size="md"
                    fullWidth
                    color="gray"
                    data-testid="arrived-at-restaurant-button"
                    style={{ borderRadius: '8px' }}
                  >
                    Arrived at Craven Kitchen
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
                        const address = encodeURIComponent(currentOrder.customer.address || '');
                        window.open(`https://maps.apple.com/?daddr=${address}`, '_blank');
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
                    }
                  />
                )}

                <Card mt="md" withBorder>
                  <Group justify="space-between" align="center" p="md">
                    <Group gap={4}>
                      <IconCurrencyDollar size={16} color="var(--mantine-color-green-6)" />
                      <Text size="sm" fw={500} c="dimmed">Estimated Pay</Text>
                    </Group>
                    <Text size="2xl" fw={700} c="green.7" style={{ lineHeight: 'none' }}>
                      ${typeof payAmount === 'number' ? payAmount.toFixed(2) : String(payAmount || '0.00')}
                    </Text>
                  </Group>
                </Card>

                {cleanPayCompact}

                {status === DRIVER_STATUS.TO_CUSTOMER && (
                  <Button 
                    onClick={handleConfirmArrivalAtCustomer}
                    size="lg"
                    fullWidth
                    mt="md"
                    color="gray"
                    data-testid="arrived-at-customer-button"
                  >
                    Arrived at Customer's Location
                  </Button>
                )}
                
                {status === DRIVER_STATUS.AT_CUSTOMER && (
                  <Button 
                    onClick={handleStartDeliveryVerification}
                    size="lg"
                    fullWidth
                    mt="md"
                    color="gray"
                    data-testid="complete-delivery-button"
                  >
                    Drop-off & Complete Delivery
                  </Button>
                )}
              </>
            )}
          </Stack>
        </Box>
      </Stack>
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
      items: (orderItems.length > 0 ? orderItems : orderDetails?.items ?? []).map((item: any) => ({
        name: item.name || 'Item',
        quantity: item.quantity ?? 1,
        special_instructions: item.special_instructions,
      })),
    };

    if (finalEarnings) {
      return (
        <FeederOrderCompleteScreen
          earnings={finalEarnings}
          displayOrderId={displayOrderId}
          orderDetails={completedDetails}
          onContinue={onCompleteDelivery}
        />
      );
    }

    const fallbackTotal =
      (orderDetails?.payout_cents ?? 0) / 100 +
      (orderDetails?.mileage_pay_cents ?? 0) / 100 +
      (orderDetails?.tip_cents ?? 0) / 100;

    return (
      <FeederOrderCompleteScreen
        earnings={{
          orderId: displayOrderId,
          deliveryPayCents: orderDetails?.payout_cents ?? 0,
          mileagePayCents: orderDetails?.mileage_pay_cents ?? 0,
          customerTipCents: orderDetails?.tip_cents ?? 0,
          promoBonusCents: 0,
          adjustmentCents: 0,
          finalPayoutCents: Math.round(fallbackTotal * 100),
          originalAcceptedOfferCents: null,
          cleanPayVerified: false,
          tipStatus: 'Paid to Feeder',
          payoutStatus: 'ready',
          offerAcceptedAt: null,
          pickupConfirmedAt: null,
          deliveryCompletedAt: null,
          adjustmentReason: null,
        }}
        displayOrderId={displayOrderId}
        orderDetails={completedDetails}
        onContinue={onCompleteDelivery}
      />
    );
  };

  if (status === DRIVER_STATUS.COMPLETE) {
    return (
      <>
        {renderComplete()}
        {/* Android Bottom Bar */}
        <Box 
          style={{ 
            position: 'fixed', 
            bottom: 0, 
            left: 0, 
            right: 0, 
            height: 'calc(48px + env(safe-area-inset-bottom, 0px))', 
            backgroundColor: '#000',
            zIndex: 1000,
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }} 
        />
      </>
    );
  }
  
  return (
    <>
      {renderActiveFlow()}
      {/* Android Bottom Bar */}
      <Box 
        style={{ 
          position: 'fixed', 
          bottom: 0, 
          left: 0, 
          right: 0, 
          height: 'calc(48px + env(safe-area-inset-bottom, 0px))', 
          backgroundColor: '#000',
          zIndex: 1000,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }} 
      />
    </>
  );
}

export default CravenDeliveryFlow;

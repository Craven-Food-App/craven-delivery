import React, { useState, useEffect, useMemo } from 'react';
import { IconMapPin, IconNavigation, IconCurrencyDollar, IconClock, IconPackage, IconHome, IconBell, IconCopy, IconToolsKitchen2, IconCheck } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';
import FullscreenCamera from './FullscreenCamera';
import { speakDeliveryInstructions } from './ActiveFeedingMenu';
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
      p="md"
      className="safe-area-top"
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

const DetailCard: React.FC<DetailCardProps> = ({ title, content, icon, actionButton, linkHref }) => (
  <Card mb="md" withBorder>
    <Group align="flex-start" gap="md">
      <ThemeIcon size="xl" radius="xl" color="orange" variant="light">
        {icon}
      </ThemeIcon>
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
          <Text size="sm" fw={500} c="dark" style={{ wordBreak: 'break-word' }}>
            {content}
          </Text>
        )}
      </Box>
      {actionButton && <Box>{actionButton}</Box>}
    </Group>
  </Card>
);

// ===== MAIN COMPONENT =====

const CravenDeliveryFlow: React.FC<ActiveDeliveryProps> = ({ 
  orderDetails, 
  onCompleteDelivery, 
  onProgressChange,
  onCameraStateChange 
}) => {
  // Early validation
  if (!orderDetails) {
    return (
      <Stack flex={1} align="center" justify="center" p="xl">
        <Text size="lg" fw={600} c="dark">Missing Order Details</Text>
        <Text size="sm" c="dimmed">Order information is not available.</Text>
      </Stack>
    );
  }

  const [status, setStatus] = useState(DRIVER_STATUS.TO_STORE);
  const [pickupCode, setPickupCode] = useState<string | null>(null);
  const [pickupPhotoUrl, setPickupPhotoUrl] = useState<string>();
  const [deliveryPhotoUrl, setDeliveryPhotoUrl] = useState<string>();
  const [showCamera, setShowCamera] = useState(false);
  const [photoType, setPhotoType] = useState<'pickup' | 'delivery'>('pickup');

  const isTestOrder = orderDetails.isTestOrder || false;

  const currentOrder = useMemo(() => {
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
        name: orderDetails?.customer_name || 'Customer',
        address: formatAddress(orderDetails?.dropoff_address) || '456 Oak Ave',
        deliveryNotes: orderDetails?.delivery_notes || 'Ring doorbell',
        phone: orderDetails?.customer_phone || '(555) 555-1234',
      },
      items: orderDetails?.items || [],
    };
  }, [orderDetails, pickupCode]);

  useEffect(() => {
    if (isTestOrder || !orderDetails.order_id) return;
    
    const fetchPickupCode = async () => {
      try {
        const { data } = await supabase
          .from('orders')
          .select('pickup_code')
          .eq('id', orderDetails.order_id)
          .maybeSingle();
        if (data?.pickup_code) {
          setPickupCode(data.pickup_code);
        }
      } catch (error) {
        console.error('Error fetching pickup code:', error);
      }
    };
    fetchPickupCode();
  }, [orderDetails.order_id, isTestOrder]);

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
      setStatus(DRIVER_STATUS.TO_CUSTOMER);
      await updateOrderStatus('picked_up');
    }
    setShowCamera(false);
    onCameraStateChange?.(false);
  };
  
  const handleConfirmArrivalAtCustomer = async () => {
    setStatus(DRIVER_STATUS.AT_CUSTOMER);
    await updateOrderStatus('at_customer');
    
    // Read delivery instructions out loud if enabled
    if (currentOrder.customer?.special_instructions) {
      speakDeliveryInstructions(currentOrder.customer.special_instructions);
    }
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
      
      if (!isTestOrder && orderDetails.order_id) {
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

  const renderActiveFlow = () => {
    const payAmount = typeof currentOrder.pay === 'number' ? currentOrder.pay : parseFloat(String(currentOrder.pay || 0));
    const isToStore = currentFlow?.isPickup ?? true;

    if (!currentFlow || !currentFlow.title) {
      return (
        <Stack flex={1} align="center" justify="center" p="xl">
          <Text size="lg" fw={600} c="dark" mb="md">Loading delivery details...</Text>
          <Text size="sm" c="dimmed">Please wait while we load your order information.</Text>
        </Stack>
      );
    }

    return (
      <Stack flex={1} style={{ fontFamily: 'sans-serif' }}>
        <Box h="40%" w="100%" pos="relative" style={{ flexShrink: 0 }}>
          <SimulatedMapView isToStore={isToStore} /> 
          <MapHeader
            title={currentFlow.title}
            status={currentFlow.statusText || ''}
            locationIcon={currentFlow.icon}
            distance={currentFlow.distance || 0}
            pay={payAmount}
          />
        </Box>
        <Box h={24} />

        <Box flex={1} px="md" pb="md" style={{ overflowY: 'auto', backgroundColor: 'white', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', marginTop: -24 }}>
          <Stack gap="md" pt="xl" align="stretch">
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
        
            {currentFlow.isPickup ? (
              <>
                <DetailCard 
                  title="PICKUP ADDRESS"
                  content={currentOrder.store.address}
                  icon={<IconMapPin size={20} />}
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
                
                {currentOrder.items && currentOrder.items.length > 0 && (
                  <Card bg="orange.0" style={{ borderColor: 'var(--mantine-color-orange-2)' }} withBorder>
                    <Card.Section p="md" pb="xs">
                      <Title order={4} fw={600} c="orange.7">
                        Items ({currentOrder.items.length})
                      </Title>
                    </Card.Section>
                    <Card.Section px="md" pb="md">
                      <Stack gap="xs" align="stretch">
                        {currentOrder.items.map((item: any, index: number) => (
                          <Group key={index} justify="space-between" align="center" py={4} style={{ borderBottom: index < currentOrder.items.length - 1 ? '1px solid var(--mantine-color-orange-1)' : 'none' }}>
                            <Text size="sm" c="dark">{item.name}</Text>
                            <Badge color="gray">
                              x{item.qty || item.quantity}
                            </Badge>
                          </Group>
                        ))}
                      </Stack>
                    </Card.Section>
                  </Card>
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

                {status === DRIVER_STATUS.TO_STORE && (
                  <Button 
                    onClick={handleConfirmArrivalAtStore}
                    size="lg"
                    fullWidth
                    mt="md"
                    color="gray"
                  >
                    Arrived at Craven Kitchen
                  </Button>
                )}
                
                {status === DRIVER_STATUS.AT_STORE && (
                  <Button 
                    onClick={handleStartPickupVerification}
                    size="lg"
                    fullWidth
                    mt="md"
                    color="gray"
                  >
                    Order Ready? Start Hand-off Check
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

                {status === DRIVER_STATUS.TO_CUSTOMER && (
                  <Button 
                    onClick={handleConfirmArrivalAtCustomer}
                    size="lg"
                    fullWidth
                    mt="md"
                    color="gray"
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
    return (
      <Box
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          background: 'linear-gradient(to bottom right, var(--mantine-color-orange-6), var(--mantine-color-red-6))',
          overflowY: 'auto',
        }}
      >
        <Stack
          align="center"
          justify="center"
          p="xl"
          style={{
            minHeight: '100vh',
            textAlign: 'center',
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 2rem)',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 100px)',
          }}
        >
          <ThemeIcon size={80} radius="xl" color="green" style={{ border: '4px solid white', opacity: 0.8 }}>
            <IconCheck size={40} />
          </ThemeIcon>
          <Title order={1} fw={700} c="white" mb="md">Delivery Complete!</Title>
          <Text c="white" opacity={0.9} mb={4} fw={500} size="lg">Great job! You earned:</Text>
          <Text size="5xl" fw={700} c="white" mb="xl" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
            ${typeof currentOrder.pay === 'number' ? currentOrder.pay.toFixed(2) : parseFloat(String(currentOrder.pay || 0)).toFixed(2)}
          </Text>

          <Card w="100%" maw={400} mb="xl" withBorder bg="white" p="lg" style={{ width: '90%', maxWidth: '400px' }}>
            <Text size="sm" fw={600} c="dimmed" tt="uppercase" mb="lg" ta="center" style={{ letterSpacing: '0.05em' }}>
              Order Summary
            </Text>
            <Stack gap="lg" align="stretch">
              <Group justify="space-between" align="center" wrap="nowrap" gap="md">
                <Text size="sm" fw={500} c="dimmed" style={{ flexShrink: 0, minWidth: '100px' }}>
                  Order ID:
                </Text>
                <Text size="sm" fw={600} c="dark" style={{ textAlign: 'right', flex: 1 }}>
                  {currentOrder.id.split('-')[1] || currentOrder.id.slice(-8)}
                </Text>
              </Group>
              <Group justify="space-between" align="center" wrap="nowrap" gap="md">
                <Text size="sm" fw={500} c="dimmed" style={{ flexShrink: 0, minWidth: '100px' }}>
                  Total Distance:
                </Text>
                <Text size="sm" fw={600} c="dark" style={{ textAlign: 'right', flex: 1 }}>
                  {currentOrder.totalDistance.toFixed(1)} mi
                </Text>
              </Group>
            </Stack>
          </Card>

          <Button
            onClick={onCompleteDelivery}
            size="lg"
            color="gray"
            fullWidth
            maw="sm"
            h={56}
            style={{ fontSize: '18px', fontWeight: 600 }}
          >
            Continue Accepting Orders
          </Button>
        </Stack>
      </Box>
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
            height: '48px', 
            backgroundColor: '#000',
            zIndex: 1000 
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
          height: '48px', 
          backgroundColor: '#000',
          zIndex: 1000 
        }} 
      />
    </>
  );
}

export default CravenDeliveryFlow;

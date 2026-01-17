import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Navigation, Clock, Phone, MessageCircle, Camera, CheckCircle, ChevronLeft, AlertCircle, Package, Home, X, Users, Store, Truck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast as showToast } from 'sonner';
import { useNavigation } from '@/hooks/useNavigation';
import { useToast } from '@/hooks/use-toast';
import { DeliveryMap } from './DeliveryMap';
import { 
  DeliveryCard, 
  DeliveryButton, 
  DeliveryHeader, 
  DeliveryInfoCard, 
  DeliveryActionGroup,
  DeliveryDivider,
  DeliveryMapContainer,
  DeliveryProgressBar,
  DeliveryStatusBadge,
  DeliveryPhotoPreview,
  DeliverySuccessState,
  typography 
} from '@/components/delivery/DeliveryDesignSystem';

// ===== TYPES =====
type DeliveryStage = 'navigate_to_restaurant' | 'arrived_at_restaurant' | 'verify_pickup' | 'pickup_photo_verification' | 'navigate_to_customer' | 'capture_proof' | 'delivered';

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
  orderDetails: {
    id: string;
    order_number: string;
    restaurant_name: string;
    customer_name: string;
    customer_phone?: string;
    pickup_address: any;
    dropoff_address: any;
    items: any[];
    subtotal_cents: number;
    delivery_notes?: string;
    payout_cents: number;
    pickup_by?: string;
    isTestOrder?: boolean;
  };
  onCompleteDelivery: () => void;
  onProgressChange?: (progress: DeliveryProgress) => void;
}

// ===== DELIVERY STAGES CONFIGURATION =====
const DELIVERY_STAGES = [
  { id: 'navigate_to_restaurant', name: 'Navigate to Restaurant', icon: Navigation },
  { id: 'arrived_at_restaurant', name: 'Arrived at Restaurant', icon: MapPin },
  { id: 'verify_pickup', name: 'Verify Pickup', icon: Package },
  { id: 'pickup_photo_verification', name: 'Photo Verification', icon: Camera },
  { id: 'navigate_to_customer', name: 'Navigate to Customer', icon: Navigation },
  { id: 'capture_proof', name: 'Capture Proof', icon: Camera },
  { id: 'delivered', name: 'Delivered', icon: CheckCircle },
];

const getStageInfo = (stage: DeliveryStage) => {
  const stageMap = {
    'navigate_to_restaurant': { stageNumber: 1, stageName: 'Navigate to Restaurant' },
    'arrived_at_restaurant': { stageNumber: 2, stageName: 'Arrived at Restaurant' },
    'verify_pickup': { stageNumber: 3, stageName: 'Verify Pickup' },
    'pickup_photo_verification': { stageNumber: 4, stageName: 'Photo Verification' },
    'navigate_to_customer': { stageNumber: 5, stageName: 'Navigate to Customer' },
    'capture_proof': { stageNumber: 6, stageName: 'Capture Proof' },
    'delivered': { stageNumber: 7, stageName: 'Delivered' },
  };
  
  return stageMap[stage] || { stageNumber: 1, stageName: 'Unknown' };
};

// ===== MAIN COMPONENT =====
const ProfessionalActiveDeliveryFlow = ({ orderDetails, onCompleteDelivery, onProgressChange }: ActiveDeliveryProps) => {
  const [currentStage, setCurrentStage] = useState<DeliveryStage>('navigate_to_restaurant');
  const [deliveryPhoto, setDeliveryPhoto] = useState<string | null>(null);
  const [pickupPhoto, setPickupPhoto] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [restaurantAddress, setRestaurantAddress] = useState<string>('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  
  const { toast } = useToast();
  const { openExternalNavigation } = useNavigation();

  // Timer for elapsed time
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Update progress whenever stage changes
  useEffect(() => {
    if (onProgressChange) {
      const stageInfo = getStageInfo(currentStage);
      const progress: DeliveryProgress = {
        currentStage,
        stageNumber: stageInfo.stageNumber,
        totalStages: 7,
        stageName: stageInfo.stageName,
        isCompleted: currentStage === 'delivered',
        pickupPhotoUrl: pickupPhoto || undefined,
        deliveryPhotoUrl: deliveryPhoto || undefined
      };
      onProgressChange(progress);
    }
  }, [currentStage, pickupPhoto, deliveryPhoto, onProgressChange]);

  // Fetch restaurant address
  useEffect(() => {
    const fetchRestaurantAddress = async () => {
      try {
        const { data: restaurant } = await supabase
          .from('restaurants')
          .select('address')
          .eq('name', orderDetails.restaurant_name)
          .single();
        
        if (restaurant?.address) {
          setRestaurantAddress(restaurant.address);
        }
      } catch (error) {
        console.error('Error fetching restaurant address:', error);
      }
    };

    fetchRestaurantAddress();
  }, [orderDetails.restaurant_name]);

  // Format elapsed time
  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Photo upload handler
  const handlePhotoUpload = async (file: File, type: 'pickup' | 'delivery') => {
    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('order_id', orderDetails.id);
      formData.append('type', type);

      const { data, error } = await supabase.storage
        .from('delivery-photos')
        .upload(`${orderDetails.id}/${type}_${Date.now()}.jpg`, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('delivery-photos')
        .getPublicUrl(data.path);

      if (type === 'pickup') {
        setPickupPhoto(publicUrl);
      } else {
        setDeliveryPhoto(publicUrl);
      }

      toast({
        title: "Photo uploaded successfully",
        description: `${type === 'pickup' ? 'Pickup' : 'Delivery'} photo has been saved.`
      });

      return publicUrl;
    } catch (error) {
      console.error('Photo upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Navigation handlers
  const handleNavigateToRestaurant = () => {
    const address = restaurantAddress || orderDetails.pickup_address?.address || orderDetails.pickup_address;
    openExternalNavigation({
      address: typeof address === 'string' ? address : address?.address || '',
      name: orderDetails.restaurant_name
    });
  };

  const handleNavigateToCustomer = () => {
    const address = orderDetails.dropoff_address?.address || orderDetails.dropoff_address;
    openExternalNavigation({
      address: typeof address === 'string' ? address : address?.address || '',
      name: orderDetails.customer_name
    });
  };

  // Stage progression handlers
  const handleArrivedAtRestaurant = () => {
    setCurrentStage('verify_pickup');
    toast({
      title: "Arrived at restaurant",
      description: "Please verify the pickup details."
    });
  };

  const handlePickupVerified = () => {
    setCurrentStage('pickup_photo_verification');
    toast({
      title: "Pickup verified",
      description: "Please take a photo of the order."
    });
  };

  const handlePickupPhotoTaken = () => {
    setCurrentStage('navigate_to_customer');
    toast({
      title: "Photo captured",
      description: "Navigate to the customer location."
    });
  };

  const handleArrivedAtCustomer = () => {
    setCurrentStage('capture_proof');
    toast({
      title: "Arrived at customer",
      description: "Please capture proof of delivery."
    });
  };

  const handleDeliveryCompleted = () => {
    setCurrentStage('delivered');
    toast({
      title: "Delivery completed!",
      description: "Thank you for completing the delivery."
    });
  };

  // Format address helper
  const formatAddress = (address: any) => {
    if (typeof address === 'string') return address;
    if (typeof address === 'object' && address) {
      return address.address || `${address.street || ''} ${address.city || ''} ${address.state || ''} ${address.zip || ''}`.trim();
    }
    return 'Address not available';
  };

  // ===== STAGE RENDERERS =====

  const renderNavigateToRestaurant = () => (
    <div className="flex-1 bg-gray-50 overflow-y-auto">
      <DeliveryHeader
        title="Navigate to Restaurant"
        subtitle={`Order #${orderDetails.order_number}`}
        onBack={() => window.history.back()}
      />
      
      <div className="p-4 space-y-4">
        {/* Map */}
        <DeliveryCard variant="elevated" padding="none" className="overflow-hidden">
          <DeliveryMapContainer>
            <DeliveryMap 
              pickupAddress={orderDetails.pickup_address}
              dropoffAddress={orderDetails.dropoff_address}
              className="w-full h-full"
            />
          </DeliveryMapContainer>
        </DeliveryCard>

        {/* Restaurant Info */}
        <DeliveryInfoCard
          title="Pickup Location"
          subtitle={orderDetails.restaurant_name}
          icon={Store}
        >
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-600 leading-relaxed">
                {formatAddress(orderDetails.pickup_address)}
              </p>
            </div>
            
            {orderDetails.pickup_by && (
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-orange-500" />
                <span className="text-sm text-orange-600 font-medium">
                  Pickup by: {orderDetails.pickup_by}
                </span>
              </div>
            )}
          </div>
        </DeliveryInfoCard>

        {/* Order Details */}
        <DeliveryCard>
          <h3 className="font-semibold text-gray-900 mb-3">Order Details</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Items:</span>
              <span className="font-medium">{orderDetails.items.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">${(orderDetails.subtotal_cents / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Your Earnings:</span>
              <span className="font-medium text-green-600">${(orderDetails.payout_cents / 100).toFixed(2)}</span>
            </div>
          </div>
        </DeliveryCard>

        {/* Action Buttons */}
        <DeliveryActionGroup
          primaryAction={{
            children: "I've Arrived",
            onClick: handleArrivedAtRestaurant,
            icon: <MapPin className="w-5 h-5" />
          }}
          secondaryAction={{
            children: "Get Directions",
            onClick: handleNavigateToRestaurant,
            icon: <Navigation className="w-5 h-5" />
          }}
        />
      </div>
    </div>
  );

  const renderArrivedAtRestaurant = () => (
    <div className="flex-1 bg-gray-50 overflow-y-auto">
      <DeliveryHeader
        title="Arrived at Restaurant"
        subtitle="Verify pickup details"
        onBack={() => setCurrentStage('navigate_to_restaurant')}
      />
      
      <div className="p-4 space-y-4">
        {/* Restaurant Info */}
        <DeliveryInfoCard
          title="Restaurant"
          subtitle={orderDetails.restaurant_name}
          icon={Store}
        >
          <div className="flex items-start space-x-3">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-600 leading-relaxed">
              {formatAddress(orderDetails.pickup_address)}
            </p>
          </div>
        </DeliveryInfoCard>

        {/* Order Verification */}
        <DeliveryCard>
          <h3 className="font-semibold text-gray-900 mb-3">Order Verification</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Package className="w-5 h-5 text-orange-500" />
              <div>
                <p className="font-medium text-gray-900">Order #{orderDetails.order_number}</p>
                <p className="text-sm text-gray-600">{orderDetails.items.length} items</p>
              </div>
            </div>
            
            <DeliveryDivider />
            
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Order Items:</h4>
              {orderDetails.items.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-gray-600">{item.name} x{item.quantity}</span>
                  <span className="font-medium">${(item.price_cents / 100).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </DeliveryCard>

        {/* Action Buttons */}
        <DeliveryActionGroup
          primaryAction={{
            children: "Order Verified",
            onClick: handlePickupVerified,
            icon: <CheckCircle className="w-5 h-5" />
          }}
          secondaryAction={{
            children: "Call Restaurant",
            onClick: () => toast({ title: "Calling restaurant...", description: "Feature coming soon!" }),
            icon: <Phone className="w-5 h-5" />
          }}
        />
      </div>
    </div>
  );

  const renderVerifyPickup = () => (
    <div className="flex-1 bg-gray-50 overflow-y-auto">
      <DeliveryHeader
        title="Verify Pickup"
        subtitle="Confirm order details"
        onBack={() => setCurrentStage('arrived_at_restaurant')}
      />
      
      <div className="p-4 space-y-4">
        {/* Order Summary */}
        <DeliveryCard>
          <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Order #</span>
              <span className="font-medium">{orderDetails.order_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Restaurant</span>
              <span className="font-medium">{orderDetails.restaurant_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Items</span>
              <span className="font-medium">{orderDetails.items.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">${(orderDetails.subtotal_cents / 100).toFixed(2)}</span>
            </div>
            <DeliveryDivider />
            <div className="flex justify-between text-lg font-semibold">
              <span>Your Earnings</span>
              <span className="text-green-600">${(orderDetails.payout_cents / 100).toFixed(2)}</span>
            </div>
          </div>
        </DeliveryCard>

        {/* Action Buttons */}
        <DeliveryActionGroup
          primaryAction={{
            children: "Pickup Verified",
            onClick: handlePickupVerified,
            icon: <CheckCircle className="w-5 h-5" />
          }}
          secondaryAction={{
            children: "Back",
            onClick: () => setCurrentStage('arrived_at_restaurant'),
            icon: <ChevronLeft className="w-5 h-5" />
          }}
        />
      </div>
    </div>
  );

  const renderPhotoVerification = (type: 'pickup' | 'delivery') => (
    <div className="flex-1 bg-gray-50 overflow-y-auto">
      <DeliveryHeader
        title={type === 'pickup' ? 'Pickup Photo' : 'Delivery Photo'}
        subtitle="Capture verification photo"
        onBack={() => setCurrentStage(type === 'pickup' ? 'verify_pickup' : 'navigate_to_customer')}
      />
      
      <div className="p-4 space-y-4">
        {/* Photo Instructions */}
        <DeliveryCard>
          <h3 className="font-semibold text-gray-900 mb-3">
            {type === 'pickup' ? 'Pickup' : 'Delivery'} Photo Instructions
          </h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• Ensure the order is clearly visible</p>
            <p>• Include the restaurant/customer name in the photo</p>
            <p>• Make sure the photo is well-lit and clear</p>
          </div>
        </DeliveryCard>

        {/* Photo Preview */}
        {(type === 'pickup' ? pickupPhoto : deliveryPhoto) && (
          <DeliveryCard>
            <h3 className="font-semibold text-gray-900 mb-3">Captured Photo</h3>
            <DeliveryPhotoPreview
              src={type === 'pickup' ? pickupPhoto! : deliveryPhoto!}
              alt={`${type} photo`}
              onRemove={() => {
                if (type === 'pickup') {
                  setPickupPhoto(null);
                } else {
                  setDeliveryPhoto(null);
                }
              }}
            />
          </DeliveryCard>
        )}

        {/* Photo Upload */}
        <DeliveryCard>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                await handlePhotoUpload(file, type);
              }
            }}
            className="hidden"
            id={`${type}-photo-input`}
          />
          <label
            htmlFor={`${type}-photo-input`}
            className="block w-full"
          >
            <DeliveryButton
              onClick={() => {}}
              variant="outline"
              fullWidth
              disabled={isUploadingPhoto}
              loading={isUploadingPhoto}
              icon={<Camera className="w-5 h-5" />}
            >
              {isUploadingPhoto ? 'Uploading...' : 'Take Photo'}
            </DeliveryButton>
          </label>
        </DeliveryCard>

        {/* Action Buttons */}
        <DeliveryActionGroup
          primaryAction={{
            children: "Continue",
            onClick: type === 'pickup' ? handlePickupPhotoTaken : handleDeliveryCompleted,
            disabled: !(type === 'pickup' ? pickupPhoto : deliveryPhoto),
            icon: <CheckCircle className="w-5 h-5" />
          }}
          secondaryAction={{
            children: "Skip Photo",
            onClick: type === 'pickup' ? handlePickupPhotoTaken : handleDeliveryCompleted,
            variant: "ghost"
          }}
        />
      </div>
    </div>
  );

  const renderNavigateToCustomer = () => (
    <div className="flex-1 bg-gray-50 overflow-y-auto">
      <DeliveryHeader
        title="Navigate to Customer"
        subtitle={`${orderDetails.customer_name}`}
        onBack={() => setCurrentStage('pickup_photo_verification')}
      />
      
      <div className="p-4 space-y-4">
        {/* Map */}
        <DeliveryCard variant="elevated" padding="none" className="overflow-hidden">
          <DeliveryMapContainer>
            <DeliveryMap 
              pickupAddress={orderDetails.pickup_address}
              dropoffAddress={orderDetails.dropoff_address}
              className="w-full h-full"
            />
          </DeliveryMapContainer>
        </DeliveryCard>

        {/* Customer Info */}
        <DeliveryInfoCard
          title="Delivery Location"
          subtitle={orderDetails.customer_name}
          icon={Users}
        >
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-600 leading-relaxed">
                {formatAddress(orderDetails.dropoff_address)}
              </p>
            </div>
            
            {orderDetails.delivery_notes && (
              <div className="flex items-start space-x-3">
                <MessageCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-600 leading-relaxed">
                  {orderDetails.delivery_notes}
                </p>
              </div>
            )}
          </div>
        </DeliveryInfoCard>

        {/* Contact Options */}
        <DeliveryCard>
          <h3 className="font-semibold text-gray-900 mb-3">Contact Customer</h3>
          <div className="grid grid-cols-2 gap-3">
            <DeliveryButton
              variant="outline"
              onClick={() => {
                if (orderDetails.customer_phone) {
                  window.open(`tel:${orderDetails.customer_phone}`);
                } else {
                  toast({ title: "No phone number", description: "Customer phone number not available", variant: "destructive" });
                }
              }}
              icon={<Phone className="w-4 h-4" />}
            >
              Call
            </DeliveryButton>
            <DeliveryButton
              variant="outline"
              onClick={() => {
                if (orderDetails.customer_phone) {
                  window.open(`sms:${orderDetails.customer_phone}`);
                } else {
                  toast({ title: "No phone number", description: "Customer phone number not available", variant: "destructive" });
                }
              }}
              icon={<MessageCircle className="w-4 h-4" />}
            >
              Message
            </DeliveryButton>
          </div>
        </DeliveryCard>

        {/* Action Buttons */}
        <DeliveryActionGroup
          primaryAction={{
            children: "I've Arrived",
            onClick: handleArrivedAtCustomer,
            icon: <MapPin className="w-5 h-5" />
          }}
          secondaryAction={{
            children: "Get Directions",
            onClick: handleNavigateToCustomer,
            icon: <Navigation className="w-5 h-5" />
          }}
        />
      </div>
    </div>
  );

  const renderDelivered = () => (
    <div className="flex-1 bg-gray-50 overflow-y-auto">
      <DeliveryHeader
        title="Delivery Complete"
        subtitle="Thank you for your service"
        onBack={() => window.history.back()}
      />
      
      <div className="p-4 space-y-4">
        <DeliverySuccessState
          title="Delivery Completed Successfully!"
          description={`Order #${orderDetails.order_number} has been delivered to ${orderDetails.customer_name}`}
          action={{
            children: "Continue Accepting Orders",
            onClick: onCompleteDelivery,
            icon: <Package className="w-5 h-5" />
          }}
        />

        {/* Delivery Summary */}
        <DeliveryCard>
          <h3 className="font-semibold text-gray-900 mb-3">Delivery Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Order #</span>
              <span className="font-medium">{orderDetails.order_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Customer</span>
              <span className="font-medium">{orderDetails.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Delivery Time</span>
              <span className="font-medium">{formatElapsedTime(elapsedSeconds)}</span>
            </div>
            <DeliveryDivider />
            <div className="flex justify-between text-lg font-semibold">
              <span>Earnings</span>
              <span className="text-green-600">${(orderDetails.payout_cents / 100).toFixed(2)}</span>
            </div>
          </div>
        </DeliveryCard>

        {/* Action Buttons */}
        <DeliveryActionGroup
          primaryAction={{
            children: "Continue Accepting Orders",
            onClick: onCompleteDelivery,
            icon: <Package className="w-5 h-5" />
          }}
          secondaryAction={{
            children: "Pause After This Delivery",
            onClick: () => {
              onCompleteDelivery();
              window.dispatchEvent(new CustomEvent('pauseAfterDelivery'));
            },
            icon: <X className="w-5 h-5" />
          }}
        />
      </div>
    </div>
  );

  // ===== MAIN RENDER =====
  const getCurrentStageComponent = () => {
    switch (currentStage) {
      case 'navigate_to_restaurant':
        return renderNavigateToRestaurant();
      case 'arrived_at_restaurant':
        return renderArrivedAtRestaurant();
      case 'verify_pickup':
        return renderVerifyPickup();
      case 'pickup_photo_verification':
        return renderPhotoVerification('pickup');
      case 'navigate_to_customer':
        return renderNavigateToCustomer();
      case 'capture_proof':
        return renderPhotoVerification('delivery');
      case 'delivered':
        return renderDelivered();
      default:
        return renderNavigateToRestaurant();
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Progress Bar */}
      <DeliveryProgressBar
        currentStep={DELIVERY_STAGES.findIndex(s => s.id === currentStage)}
        totalSteps={DELIVERY_STAGES.length}
      />
      
      {/* Stage Content */}
      {getCurrentStageComponent()}
    </div>
  );
};

export default ProfessionalActiveDeliveryFlow;

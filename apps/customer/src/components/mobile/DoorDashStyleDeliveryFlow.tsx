import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Clock, 
  Phone, 
  MessageCircle, 
  Camera, 
  CheckCircle, 
  Navigation, 
  Package, 
  User, 
  ChevronLeft,
  AlertCircle,
  X,
  ArrowRight,
  Star,
  DollarSign,
  Zap,
  Shield,
  Truck,
  Settings,
  Copy
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Import Design System Components
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

// Import Custom Components
import FullscreenCamera from './FullscreenCamera';
import NavigationSettings from './NavigationSettings';

// ===== TYPES =====

type DeliveryStage = 'navigate_to_restaurant' | 'arrived_at_restaurant' | 'verify_pickup' | 'pickup_photo_verification' | 'navigate_to_customer' | 'capture_proof' | 'delivered';

interface OrderItem {
  name: string;
  quantity: number;
  special_instructions?: string;
  price?: number;
}

interface Customer {
  name: string;
  phone: string;
  address: string;
  instructions?: string;
  rating?: number;
}

interface Restaurant {
  name: string;
  address: string;
  phone: string;
  estimated_prep_time: number;
  rating: number;
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

interface DoorDashStyleDeliveryFlowProps {
  orderDetails: any;
  onCompleteDelivery: () => void;
  onProgressChange?: (progress: DeliveryProgress) => void;
  onCameraStateChange?: (isOpen: boolean) => void;
}

// Main Delivery Stages - DoorDash Style
const DELIVERY_STAGES = [
  { 
    id: 'navigate_to_restaurant', 
    name: 'Head to Restaurant', 
    icon: Navigation,
    description: 'Navigate to the restaurant to pick up the order',
    estimatedTime: '5-10 min'
  },
  { 
    id: 'arrived_at_restaurant', 
    name: 'Arrived at Restaurant', 
    icon: MapPin,
    description: 'You\'ve arrived at the restaurant',
    estimatedTime: '0 min'
  },
  { 
    id: 'verify_pickup', 
    name: 'Verify Order', 
    icon: Package,
    description: 'Check that all items are correct',
    estimatedTime: '2-3 min'
  },
  { 
    id: 'pickup_photo_verification', 
    name: 'Take Photo', 
    icon: Camera,
    description: 'Take a photo of the order',
    estimatedTime: '1 min'
  },
  { 
    id: 'navigate_to_customer', 
    name: 'Head to Customer', 
    icon: Navigation,
    description: 'Navigate to the customer\'s location',
    estimatedTime: '8-15 min'
  },
  { 
    id: 'capture_proof', 
    name: 'Complete Delivery', 
    icon: Camera,
    description: 'Take a photo to confirm delivery',
    estimatedTime: '1 min'
  },
  { 
    id: 'delivered', 
    name: 'Delivered', 
    icon: CheckCircle,
    description: 'Order successfully delivered',
    estimatedTime: '0 min'
  }
];

const DoorDashStyleDeliveryFlow: React.FC<DoorDashStyleDeliveryFlowProps> = ({ 
  orderDetails, 
  onCompleteDelivery, 
  onProgressChange,
  onCameraStateChange
}) => {
  const [currentStage, setCurrentStage] = useState<DeliveryStage>('navigate_to_restaurant');
  const [pickupPhoto, setPickupPhoto] = useState<string | null>(null);
  const [deliveryPhoto, setDeliveryPhoto] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [photoType, setPhotoType] = useState<'pickup' | 'delivery'>('pickup');
  const [selectedNavigationApp, setSelectedNavigationApp] = useState<'apple' | 'google' | 'waze'>('apple');
  const [showNavigationSettings, setShowNavigationSettings] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [pickupCode, setPickupCode] = useState<string | null>(null);

  // Fetch pickup code from order
  useEffect(() => {
    const fetchPickupCode = async () => {
      if (!orderDetails?.order_id) return;
      
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
  }, [orderDetails?.order_id]);

  // Mock data - in real app, this would come from props
  const customer: Customer = {
    name: orderDetails.customer?.name || 'John Smith',
    phone: orderDetails.customer?.phone || '(555) 123-4567',
    address: orderDetails.customer?.address || '456 Customer St, City, State 12345',
    instructions: orderDetails.customer?.instructions || 'Leave at door, ring doorbell',
    rating: 4.8
  };

  const restaurant: Restaurant = {
    name: orderDetails.restaurant?.name || 'McDonald\'s',
    address: orderDetails.restaurant?.address || '123 Main St, City, State 12345',
    phone: orderDetails.restaurant?.phone || '(555) 987-6543',
    estimated_prep_time: 8,
    rating: 4.2
  };

  const orderItems: OrderItem[] = orderDetails.items || [
    { name: 'Big Mac', quantity: 1, price: 5.99 },
    { name: 'Large Fries', quantity: 1, price: 2.49 },
    { name: 'Coca-Cola', quantity: 1, price: 1.99 }
  ];

  // Calculate progress
  const currentIndex = DELIVERY_STAGES.findIndex(s => s.id === currentStage);
  const progress = {
    currentStage,
    stageNumber: currentIndex + 1,
    totalStages: DELIVERY_STAGES.length,
    stageName: DELIVERY_STAGES[currentIndex]?.name || '',
    isCompleted: currentStage === 'delivered',
    pickupPhotoUrl: pickupPhoto,
    deliveryPhotoUrl: deliveryPhoto
  };

  // Notify parent of progress changes
  useEffect(() => {
    onProgressChange?.(progress);
  }, [currentStage, pickupPhoto, deliveryPhoto]);

  const handleStageComplete = (stage: DeliveryStage) => {
    const currentIndex = DELIVERY_STAGES.findIndex(s => s.id === stage);
    const nextStage = DELIVERY_STAGES[currentIndex + 1];
    
    if (nextStage) {
      setCurrentStage(nextStage.id as DeliveryStage);
    } else {
      // All stages completed
      onCompleteDelivery();
    }
  };

  const handlePhotoCapture = (type: 'pickup' | 'delivery') => {
    setPhotoType(type);
    setShowCamera(true);
    onCameraStateChange?.(true);
  };

  const handlePhotoConfirm = (photoUrl: string) => {
    if (photoType === 'pickup') {
      setPickupPhoto(photoUrl);
      handleStageComplete('pickup_photo_verification');
    } else {
      setDeliveryPhoto(photoUrl);
      handleStageComplete('capture_proof');
    }
    setShowCamera(false);
    onCameraStateChange?.(false);
  };

  const handleNavigation = () => {
    // In a real app, this would open the selected navigation app
    const address = currentStage.includes('restaurant') ? restaurant.address : customer.address;
    
    // For demo purposes, we'll just complete the stage
    if (currentStage === 'navigate_to_restaurant') {
      handleStageComplete('navigate_to_restaurant');
    } else if (currentStage === 'navigate_to_customer') {
      handleStageComplete('navigate_to_customer');
    }
  };

  const handleNavigationAppChange = (app: 'apple' | 'google' | 'waze') => {
    setSelectedNavigationApp(app);
    setShowNavigationSettings(false);
  };

  const getStageIcon = (stage: DeliveryStage) => {
    const stageData = DELIVERY_STAGES.find(s => s.id === stage);
    return stageData?.icon || Navigation;
  };

  const getStageColor = (stage: DeliveryStage) => {
    if (stage === currentStage) return 'text-orange-600';
    if (DELIVERY_STAGES.findIndex(s => s.id === stage) < currentIndex) return 'text-green-600';
    return 'text-gray-400';
  };

  const renderStageContent = () => {
    switch (currentStage) {
      case 'navigate_to_restaurant':
        return (
          <div className="space-y-6">
            {/* Restaurant Header */}
            <DeliveryCard className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">{restaurant.name}</h2>
                  <div className="flex items-center space-x-2 mb-2">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="text-sm font-medium text-gray-700">{restaurant.rating}</span>
                    <span className="text-sm text-gray-500">•</span>
                    <span className="text-sm text-gray-500">{restaurant.estimated_prep_time} min prep</span>
                  </div>
                  <p className="text-sm text-gray-600">{restaurant.address}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Truck className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              
              <div className="space-y-3">
                <DeliveryButton
                  onClick={handleNavigation}
                  variant="primary"
                  fullWidth
                  size="lg"
                  icon={<Navigation className="w-5 h-5" />}
                >
                  Start Navigation
                </DeliveryButton>
                <button
                  onClick={() => setShowNavigationSettings(true)}
                  className="w-full flex items-center justify-center space-x-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span>Navigation Settings</span>
                </button>
              </div>
            </DeliveryCard>

            {/* Order Summary */}
            <DeliveryCard className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
              <div className="space-y-3">
                {orderItems.map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-2">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      {item.special_instructions && (
                        <p className="text-sm text-gray-500">{item.special_instructions}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-gray-900">x{item.quantity}</span>
                      {item.price && (
                        <p className="text-sm text-gray-500">${item.price.toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <DeliveryDivider />
              <div className="flex justify-between items-center pt-2">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-bold text-lg text-gray-900">
                  ${orderItems.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0).toFixed(2)}
                </span>
              </div>
            </DeliveryCard>

            {/* Customer Info Preview */}
            <DeliveryCard className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Delivery Info</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <User className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900">{customer.name}</p>
                    <p className="text-sm text-gray-500">{customer.address}</p>
                  </div>
                </div>
                {customer.instructions && (
                  <div className="flex items-start space-x-3">
                    <MessageCircle className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Special Instructions</p>
                      <p className="text-sm text-gray-600">{customer.instructions}</p>
                    </div>
                  </div>
                )}
              </div>
            </DeliveryCard>
          </div>
        );

      case 'arrived_at_restaurant':
        return (
          <div className="space-y-6">
            <DeliveryCard className="p-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">You've Arrived!</h3>
              <p className="text-sm text-gray-600">You're at the restaurant. Let them know you're here for pickup.</p>
            </DeliveryCard>
            
            <DeliveryCard className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Restaurant Contact</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-gray-500" />
                  <span className="text-sm text-gray-700">{restaurant.phone}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-gray-500" />
                  <span className="text-sm text-gray-700">{restaurant.address}</span>
                </div>
              </div>
            </DeliveryCard>
            
            <DeliveryActionGroup
              primaryAction={{
                onClick: () => handleStageComplete('arrived_at_restaurant'),
                children: 'I\'m Here for Pickup'
              }}
            />
          </div>
        );

      case 'verify_pickup':
        return (
          <div className="space-y-6">
            {/* Pickup Code Display */}
            {pickupCode && (
              <DeliveryCard className="p-6 bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-1">
                      Pickup Code
                    </p>
                    <p className="text-3xl font-black text-orange-900 font-mono tracking-wider">
                      {pickupCode}
                    </p>
                    <p className="text-xs text-orange-600 mt-1">
                      Show this code to the restaurant staff
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(pickupCode);
                    }}
                    className="p-2 hover:bg-orange-200 rounded-lg transition-colors"
                  >
                    <Copy className="h-5 w-5 text-orange-700" />
                  </button>
                </div>
              </DeliveryCard>
            )}
            
            <DeliveryCard className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Verify Your Order</h3>
              <p className="text-sm text-gray-600 mb-6">
                Please check that all items are correct before leaving the restaurant.
              </p>
              
              <div className="space-y-4">
                {orderItems.map((item, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 text-orange-600 rounded border-gray-300 focus:ring-orange-500" 
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            </DeliveryCard>
            
            <DeliveryActionGroup
              primaryAction={{
                onClick: () => handleStageComplete('verify_pickup'),
                children: 'Order Verified'
              }}
            />
          </div>
        );

      case 'pickup_photo_verification':
        return (
          <div className="space-y-6">
            <DeliveryCard className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Take Pickup Photo</h3>
              <p className="text-sm text-gray-600 mb-6">
                Take a clear photo of the order to confirm pickup.
              </p>
              
              {pickupPhoto ? (
                <div className="space-y-4">
                  <DeliveryPhotoPreview
                    src={pickupPhoto}
                    alt="Pickup verification"
                    onRemove={() => setPickupPhoto(null)}
                  />
                  <DeliveryActionGroup
                    secondaryAction={{
                      onClick: () => setPickupPhoto(null),
                      children: 'Retake Photo'
                    }}
                    primaryAction={{
                      onClick: () => handleStageComplete('pickup_photo_verification'),
                      children: 'Photo Looks Good'
                    }}
                  />
                </div>
              ) : (
                <DeliveryButton
                  onClick={() => handlePhotoCapture('pickup')}
                  variant="primary"
                  fullWidth
                  size="lg"
                  icon={<Camera className="w-5 h-5" />}
                >
                  Take Pickup Photo
                </DeliveryButton>
              )}
            </DeliveryCard>
          </div>
        );

      case 'navigate_to_customer':
        return (
          <div className="space-y-6">
            {/* Customer Header */}
            <DeliveryCard className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">{customer.name}</h2>
                  <div className="flex items-center space-x-2 mb-2">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="text-sm font-medium text-gray-700">{customer.rating}</span>
                    <span className="text-sm text-gray-500">•</span>
                    <span className="text-sm text-gray-500">Regular customer</span>
                  </div>
                  <p className="text-sm text-gray-600">{customer.address}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              
              <div className="space-y-3">
                <DeliveryButton
                  onClick={handleNavigation}
                  variant="primary"
                  fullWidth
                  size="lg"
                  icon={<Navigation className="w-5 h-5" />}
                >
                  Start Navigation
                </DeliveryButton>
                <button
                  onClick={() => setShowNavigationSettings(true)}
                  className="w-full flex items-center justify-center space-x-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span>Navigation Settings</span>
                </button>
              </div>
            </DeliveryCard>

            {/* Customer Instructions */}
            {customer.instructions && (
              <DeliveryCard className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Delivery Instructions</h3>
                <div className="flex items-start space-x-3">
                  <MessageCircle className="w-5 h-5 text-gray-500 mt-0.5" />
                  <p className="text-sm text-gray-700">{customer.instructions}</p>
                </div>
              </DeliveryCard>
            )}

            {/* Contact Customer */}
            <DeliveryCard className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact Customer</h3>
              <div className="space-y-3">
                <DeliveryButton
                  onClick={() => {}}
                  variant="outline"
                  fullWidth
                  icon={<Phone className="w-5 h-5" />}
                >
                  Call Customer
                </DeliveryButton>
                <DeliveryButton
                  onClick={() => {}}
                  variant="outline"
                  fullWidth
                  icon={<MessageCircle className="w-5 h-5" />}
                >
                  Send Message
                </DeliveryButton>
              </div>
            </DeliveryCard>
          </div>
        );

      case 'capture_proof':
        return (
          <div className="space-y-6">
            <DeliveryCard className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Complete Delivery</h3>
              <p className="text-sm text-gray-600 mb-6">
                Take a photo to confirm the order was delivered successfully.
              </p>
              
              {deliveryPhoto ? (
                <div className="space-y-4">
                  <DeliveryPhotoPreview
                    src={deliveryPhoto}
                    alt="Delivery proof"
                    onRemove={() => setDeliveryPhoto(null)}
                  />
                  <DeliveryActionGroup
                    secondaryAction={{
                      onClick: () => setDeliveryPhoto(null),
                      children: 'Retake Photo'
                    }}
                    primaryAction={{
                      onClick: () => handleStageComplete('capture_proof'),
                      children: 'Complete Delivery'
                    }}
                  />
                </div>
              ) : (
                <DeliveryButton
                  onClick={() => handlePhotoCapture('delivery')}
                  variant="primary"
                  fullWidth
                  size="lg"
                  icon={<Camera className="w-5 h-5" />}
                >
                  Take Delivery Photo
                </DeliveryButton>
              )}
            </DeliveryCard>
          </div>
        );

      case 'delivered':
        return (
          <div className="space-y-6">
            <DeliveryCard className="p-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold text-green-900 mb-2">Delivery Complete! 🎉</h3>
              <p className="text-sm text-green-600 mb-6">Great job! Your delivery has been completed successfully.</p>
            </DeliveryCard>
            
            <DeliveryCard className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Earnings Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Base Pay</span>
                  <span className="font-semibold">$8.50</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Tip</span>
                  <span className="font-semibold">$3.00</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Bonus</span>
                  <span className="font-semibold">$2.00</span>
                </div>
                <DeliveryDivider />
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">Total</span>
                  <span className="font-bold text-lg text-green-600">$13.50</span>
                </div>
              </div>
            </DeliveryCard>
            
            <DeliveryActionGroup
              primaryAction={{
                onClick: onCompleteDelivery,
                children: 'Finish'
              }}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DeliveryHeader
        title="Delivery"
        subtitle={`Step ${currentIndex + 1} of ${DELIVERY_STAGES.length}`}
        onBack={() => window.history.back()}
      />
      
      <DeliveryProgressBar 
        currentStep={currentIndex} 
        totalSteps={DELIVERY_STAGES.length} 
      />

      <div className="p-4 pb-24 space-y-6">
        {renderStageContent()}
      </div>

      {/* Fullscreen Camera */}
      <FullscreenCamera
        isOpen={showCamera}
        onClose={() => {
          setShowCamera(false);
          onCameraStateChange?.(false);
        }}
        onCapture={handlePhotoConfirm}
        title={photoType === 'pickup' ? 'Pickup Photo' : 'Delivery Photo'}
        description={photoType === 'pickup' 
          ? 'Take a clear photo of the order' 
          : 'Take a photo to confirm delivery'
        }
        type={photoType}
        onVisibilityChange={(isVisible) => {
          setIsCameraOpen(isVisible);
          onCameraStateChange?.(isVisible);
        }}
      />

      {/* Navigation Settings Modal */}
      {showNavigationSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <DeliveryCard className="w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Navigation Settings</h3>
                <button 
                  onClick={() => setShowNavigationSettings(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <NavigationSettings
                onNavigationAppChange={handleNavigationAppChange}
              />
            </div>
          </DeliveryCard>
        </div>
      )}
    </div>
  );
};

export default DoorDashStyleDeliveryFlow;

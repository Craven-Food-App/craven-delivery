import React, { useState, useEffect, useCallback, useMemo } from 'react';
// The incorrect imports that were previously here were removed in the last revision,
// which correctly leaves the mock components defined below.
import {
  Navigation,
  Phone,
  MessageSquare,
  MapPin,
  Clock,
  DollarSign,
  Camera,
  CheckCircle,
  ArrowRight,
  Package,
  User,
  Store,
  Map,
  ClipboardList
} from 'lucide-react';
import { CustomerNavigationStep } from './CustomerNavigationStep';
import { useNavigation } from '@/hooks/useNavigation';

// --- MAPBOX CONFIGURATION ---
// Using the API key provided by the user to generate a static map image.
const MAPBOX_ACCESS_TOKEN = "pk.eyJ1IjoiY3JhdmUtbiIsImEiOiJjbWZpbXN4NmUwMG0wMmpxNDNkc2lmNWhiIn0._lEfvdpBUJpz-RYDV02ZAA";

// Mock Geolocation Data (Mapbox requires coordinates, not just addresses)
// Using coordinates near San Francisco/Oakland for a realistic feel
const MOCK_COORDS = {
  driver: { lat: 37.77, lng: -122.45 }, // Current driver location
  pickup: { lat: 37.7915, lng: -122.4048 }, // Restaurant (e.g., Fisherman's Wharf area)
  dropoff: { lat: 37.7550, lng: -122.4475 }, // Customer (e.g., Mission District area)
};

// --- MOCK UI COMPONENTS (Simulating shadcn/ui for single-file deployment) ---
const CardContainer = ({ children, className = '' }) => <div className={`bg-white rounded-xl shadow-lg ${className}`}>{children}</div>;
const CardContentMock = ({ children, className = '' }) => <div className={`p-4 ${className}`}>{children}</div>;
const CardHeaderMock = ({ children, className = '' }) => <div className={`p-4 border-b border-gray-100 ${className}`}>{children}</div>;
const CardTitleMock = ({ children, className = '' }) => <h2 className="text-xl font-bold">{children}</h2>;
const ButtonMock = ({ children, onClick, className = '', variant = 'default', disabled = false }) => {
  let baseStyle = "w-full h-14 text-base font-semibold transition-all duration-200 rounded-lg flex items-center justify-center"; // Increased height slightly
  if (variant === 'default') {
    baseStyle = `${baseStyle} bg-green-600 text-white hover:bg-green-700 shadow-xl shadow-green-400/50`;
  } else if (variant === 'outline') {
    baseStyle = `${baseStyle} border-2 border-gray-300 text-gray-700 hover:bg-gray-50`;
  } else if (variant === 'ghost') {
    baseStyle = `${baseStyle} text-gray-600 hover:bg-gray-100`;
  }

  if (disabled) {
      baseStyle = `${baseStyle} opacity-50 cursor-not-allowed`;
  }

  return <button onClick={disabled ? null : onClick} className={`${baseStyle} ${className}`}>{children}</button>;
};
const BadgeMock = ({ children, className = '' }) => <span className={`px-3 py-1 text-xs font-semibold rounded-full ${className}`}>{children}</span>;
const ProgressMock = ({ value, className = '' }) => (
  <div className={`w-full h-2 bg-gray-200 rounded-full overflow-hidden ${className}`}>
    <div
      style={{ width: `${value}%` }}
      className="h-full bg-orange-500 transition-all duration-500 ease-out"
    ></div>
  </div>
);

// --- MAPBOX STATIC IMAGE COMPONENT ---
const MapboxStaticMap = ({ destinationName, type, currentCoords, destinationCoords }) => {
  if (!MAPBOX_ACCESS_TOKEN) return (
    <div className="w-full h-48 bg-gray-100 relative overflow-hidden rounded-t-xl flex items-center justify-center">
      <p className="text-gray-500">Mapbox Token Missing</p>
    </div>
  );

  const markerColor = type === 'pickup' ? '00BFFF' : '00FF00'; // Blue for pickup, Green for dropoff
  const centerLat = (currentCoords.lat + destinationCoords.lat) / 2;
  const centerLng = (currentCoords.lng + destinationCoords.lng) / 2;
  
  // Markers: Driver (red), Destination (colored)
  const markers = [
    `pin-s-car+FF0000(${currentCoords.lng},${currentCoords.lat})`,
    `pin-s-flag+${markerColor}(${destinationCoords.lng},${destinationCoords.lat})`
  ].join(',');

  // The style is 'mapbox/navigation-preview-day'
  // The center is calculated as the midpoint between driver and destination
  // Zoom is set to 12 for a good city view, and the image size is 600x480
  const mapUrl = `https://api.mapbox.com/styles/v1/mapbox/navigation-preview-day/static/${markers}/${centerLng},${centerLat},12,0/600x480?access_token=${MAPBOX_ACCESS_TOKEN}&attribution=false&logo=false`;

  return (
    <div className="w-full h-48 relative overflow-hidden rounded-t-xl">
      <img
        src={mapUrl}
        alt={`Map navigating to ${destinationName}`}
        className="w-full h-full object-cover"
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = `https://placehold.co/600x480/cccccc/333333?text=Map+Error`;
          console.error("Mapbox image failed to load. Check API key and network.");
        }}
      />
      <div className="absolute bottom-4 left-4 right-4 bg-white p-3 rounded-lg shadow-xl border-l-4 border-orange-500 flex items-center gap-2">
        <MapPin className="h-5 w-5 text-orange-500" />
        <span className="text-sm font-semibold text-gray-800">
          Navigating to: {destinationName}
        </span>
      </div>
    </div>
  );
};



// --- MOCK HOOKS AND UTILITIES ---
const useToast = () => ({
  toast: (options) => {},
});
// Remove mock useNavigation - using real one from imports
const supabase = {
  from: (table) => ({
    select: (cols) => ({
      eq: (key, value) => ({
        single: async () => {
          // Mock fetch for restaurant address
          if (table === 'restaurants' && key === 'id') {
            return { data: { address: "123 Mock Street, Unit B" }, error: null };
          }
          return { data: null, error: new Error("Mock DB Error") };
        }
      })
    })
  })
};

// --- CORE DELIVERY FLOW LOGIC ---

interface OrderDetails {
  restaurant_name: string;
  restaurant_id?: string;
  // NOTE: For a real app, pickup/dropoff address must include lat/lng fields.
  pickup_address: string | any;
  dropoff_address: string | any;
  customer_name?: string;
  customer_phone?: string;
  delivery_notes?: string;
  payout_cents: number;
  estimated_time: number;
}

// Renamed props interface to align with main component name (App)
interface AppProps {
  orderDetails: OrderDetails;
  onCompleteDelivery: () => void;
}

type DeliveryStep = 'accepted' | 'heading_to_pickup' | 'at_restaurant' | 'picked_up' | 'heading_to_customer' | 'at_customer' | 'delivered';

const DELIVERY_STEPS = [
  { id: 'accepted', label: 'Order Accepted', emoji: '✅' },
  { id: 'heading_to_pickup', label: 'Driving to Pickup', emoji: '🚗' },
  { id: 'at_restaurant', label: 'Arrived at Restaurant', emoji: '🏪' },
  { id: 'picked_up', label: 'Package Secured', emoji: '📦' },
  { id: 'heading_to_customer', label: 'Driving to Customer', emoji: '🚚' },
  { id: 'at_customer', label: 'Arrived at Dropoff', emoji: '📍' },
  { id: 'delivered', label: 'Delivery Complete', emoji: '🎉' }
] as const;

// Renamed component to App and exporting as default to fix the element type error.
const App: React.FC<AppProps> = ({
  orderDetails,
  onCompleteDelivery
}) => {
  // FIX: Added defensive check to handle cases where orderDetails might be undefined on initial render.
  if (!orderDetails) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center bg-gray-100">
        <div className="text-center p-6 bg-white rounded-xl shadow-lg border-t-4 border-red-500">
          <p className="text-xl font-semibold text-red-600">Loading Order Details...</p>
          <p className="text-sm text-gray-500 mt-2">The 'orderDetails' prop is missing or not fully loaded.</p>
        </div>
      </div>
    );
  }

  const [currentStep, setCurrentStep] = useState<DeliveryStep>('accepted');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [estimatedArrival, setEstimatedArrival] = useState<Date | null>(null);
  const [proofPhoto, setProofPhoto] = useState<string | null>(null); // State for mock proof of delivery photo
  const [restaurantAddress, setRestaurantAddress] = useState<string>('');

  const { toast } = useToast();

  // --- Data Fetching & Timers ---

  // Fetch restaurant address if pickup_address is not detailed
  useEffect(() => {
    const fetchRestaurantAddress = async () => {
      // Logic only runs if pickup_address is not a string (i.e., requires lookup)
      if (typeof orderDetails.pickup_address !== 'string' && orderDetails.restaurant_id) {
        try {
          const { data, error } = await supabase
            .from('restaurants')
            .select('address')
            .eq('id', orderDetails.restaurant_id)
            .single();

          if (data && !error && data.address) {
            setRestaurantAddress(data.address);
          }
        } catch (error) {
          console.error('Error fetching restaurant address:', error);
        }
      } else if (typeof orderDetails.pickup_address === 'string') {
          // If it's already a string, use it directly
          setRestaurantAddress(orderDetails.pickup_address);
      }
    };
    fetchRestaurantAddress();
  }, [orderDetails.pickup_address, orderDetails.restaurant_id]);

  // Timer for elapsed time
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-advance logic (from accepted to first driving step)
  useEffect(() => {
    if (currentStep === 'accepted') {
      const timer = setTimeout(() => {
        setCurrentStep('heading_to_pickup');
        calculateETA('pickup');
      }, 3000); // 3-second delay after accepting
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  // --- Helper Functions ---

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toString().padStart(2, '0')}s`;
  };

  const formatETA = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const calculateETA = useCallback((destination: 'pickup' | 'customer') => {
    const baseTime = destination === 'pickup' ? 12 : 18; // Mock time in minutes
    const eta = new Date();
    eta.setMinutes(eta.getMinutes() + baseTime);
    setEstimatedArrival(eta);
  }, []);

  const getCurrentStepIndex = useCallback(() => {
    return DELIVERY_STEPS.findIndex(step => step.id === currentStep);
  }, [currentStep]);

  const getStepProgress = useCallback(() => {
    const currentIndex = getCurrentStepIndex();
    return ((currentIndex + 1) / DELIVERY_STEPS.length) * 100;
  }, [getCurrentStepIndex]);

  const formatAddress = (addressData: string | any): string => {
    if (typeof addressData === 'string' && addressData) return addressData;
    if (addressData?.address) return addressData.address;

    // Use fetched restaurantAddress as fallback if needed for pickup
    if (['accepted', 'heading_to_pickup', 'at_restaurant'].includes(currentStep) && restaurantAddress) {
        return restaurantAddress;
    }

    const formatted = `${addressData?.street || ''}, ${addressData?.city || ''}, ${addressData?.state || ''}`.trim();
    if (formatted.length > 5) return formatted;

    return 'Address loading/unavailable';
  };

  const getCurrentDestination = useMemo(() => {
    const isPickupPhase = ['accepted', 'heading_to_pickup', 'at_restaurant'].includes(currentStep);
    
    // Determine coordinates based on phase
    const currentCoords = MOCK_COORDS.driver;
    const destinationCoords = isPickupPhase ? MOCK_COORDS.pickup : MOCK_COORDS.dropoff;

    return {
      address: isPickupPhase ? formatAddress(orderDetails.pickup_address) : formatAddress(orderDetails.dropoff_address),
      name: isPickupPhase ? orderDetails.restaurant_name : orderDetails.customer_name || 'Customer Dropoff',
      type: isPickupPhase ? 'pickup' as const : 'delivery' as const,
      currentCoords,
      destinationCoords
    };
  }, [currentStep, orderDetails, restaurantAddress]);


  // --- Action Handlers ---

  const handleNextStep = useCallback(() => {
    const currentIndex = getCurrentStepIndex();
    const nextStep = DELIVERY_STEPS[currentIndex + 1]?.id as DeliveryStep;

    if (nextStep) {
      setCurrentStep(nextStep);

      if (nextStep === 'picked_up') {
        calculateETA('customer');
      }

      toast({
        title: "Status Updated",
        description: `${DELIVERY_STEPS[currentIndex + 1].label} confirmed.`,
      });
    }
  }, [getCurrentStepIndex, calculateETA, toast]);

  const getActionButton = () => {
    switch (currentStep) {
      case 'heading_to_pickup':
      case 'heading_to_customer':
        return {
          text: "I've Arrived",
          action: handleNextStep,
          icon: <MapPin className="h-5 w-5" />,
          variant: 'default' as const
        };
      case 'at_restaurant':
        return {
          text: "Order Picked Up",
          action: handleNextStep,
          icon: <Package className="h-5 w-5" />,
          variant: 'default' as const
        };
      case 'at_customer':
        return {
          text: "Complete Delivery",
          action: handleNextStep, // This will advance to 'delivered'
          icon: <CheckCircle className="h-5 w-5" />,
          variant: 'default' as const
        };
      default:
        return null;
    }
  };

  const actionButton = getActionButton();

  // --- Conditional Renders ---

  // Renders the specialized Customer Dropoff screen
  if (['heading_to_customer', 'at_customer'].includes(currentStep)) {
    return (
      <CustomerNavigationStep
        customerName={orderDetails.customer_name}
        deliveryTime={estimatedArrival ? formatETA(estimatedArrival) : '12:44 PM'}
        customerPhone={orderDetails.customer_phone}
        dropoffAddress={getCurrentDestination.address}
        deliveryInstructions={orderDetails.delivery_notes}
        onCall={() => {
          if (orderDetails.customer_phone) {
            window.open(`tel:${orderDetails.customer_phone}`);
          } else {
            toast({ title: "No phone number", description: "Customer phone number not available", variant: "destructive" });
          }
        }}
        onMessage={() => {
          if (orderDetails.customer_phone) {
            window.open(`sms:${orderDetails.customer_phone}`);
          } else {
            toast({ title: "No phone number", description: "Customer phone number not available", variant: "destructive" });
          }
        }}
        onDirections={() => {
          const { openExternalNavigation } = useNavigation();
          openExternalNavigation({
            address: getCurrentDestination.address,
            name: orderDetails.customer_name
          });
        }}
      />
    );
  }

  // Renders the Success Screen
  if (currentStep === 'delivered') {
    return (
      <div className="p-4 bg-gray-50 min-h-screen flex items-center justify-center">
        <CardContainer className="w-full max-w-sm text-center p-8 bg-gradient-to-br from-green-500 to-green-700 text-white shadow-2xl shadow-green-500/50">
          <CheckCircle className="h-16 w-16 mx-auto mb-4 text-white animate-pulse" />
          <h2 className="text-3xl font-extrabold mb-2">Delivery Complete!</h2>
          <p className="text-lg mb-6">
            Great job! You earned <span className="font-extrabold">${(orderDetails.payout_cents / 100).toFixed(2)}</span>
          </p>
          <ButtonMock
            onClick={onCompleteDelivery}
            className="w-full h-14 bg-white text-green-700 hover:bg-gray-100 font-bold shadow-none"
            variant="ghost"
          >
            Continue to Next Offer <ArrowRight className="ml-2 h-5 w-5" />
          </ButtonMock>
        </CardContainer>
      </div>
    );
  }


  // --- Main Pickup/Initial Flow UI ---

  const currentStepData = DELIVERY_STEPS[getCurrentStepIndex()];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Fixed Top Section: Map & Payout */}
      <div className="relative z-10 shadow-xl bg-white rounded-b-3xl overflow-hidden">
        {/* Progress and Header - MOVED TO TOP */}
        <div className="p-4 bg-orange-600 text-white safe-area-top">
          <ProgressMock value={getStepProgress()} className="h-1 bg-orange-300 mb-2" />
          <div className="flex justify-between items-center mb-3">
            <BadgeMock className="bg-white text-orange-600 font-extrabold text-sm shadow-md">
              {currentStepData.label}
            </BadgeMock>
            <span className="text-sm font-light text-orange-100">
              {formatTime(elapsedTime)} elapsed
            </span>
          </div>
          <h1 className="text-2xl font-extrabold">{getCurrentDestination.name}</h1>
          <p className="text-sm font-light text-orange-100">{getCurrentDestination.address}</p>
        </div>
        
        {/* REPLACED MOCK MAP COMPONENT WITH MAPBOX STATIC MAP */}
        <MapboxStaticMap
          destinationName={getCurrentDestination.name}
          type={getCurrentDestination.type}
          currentCoords={getCurrentDestination.currentCoords}
          destinationCoords={getCurrentDestination.destinationCoords}
        />

        {/* Payout Strip (Walmart Spark style) */}
        <div className="bg-gray-800 text-white p-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-400" />
            <span className="text-xl font-extrabold text-green-400">
              ${(orderDetails.payout_cents / 100).toFixed(2)}
            </span>
            <span className="text-xs font-light text-gray-400">PAYOUT</span>
          </div>
          {estimatedArrival && (
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-400" />
              <span className="text-sm font-semibold text-blue-400">
                ETA: {formatETA(estimatedArrival)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable Content Section */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto pb-28">
        
        {/* Current Task & Next Step */}
        <CardContainer className="p-4 border-l-4 border-orange-500 shadow-md">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <ArrowRight className="h-5 w-5 text-orange-500" /> Your Current Task
            </h3>
            {/* FIX: Replaced markdown bolding (**) with JSX span for correct rendering */}
            <p className="text-sm text-gray-600 mt-1">
                Proceed to <span className="font-bold">{getCurrentDestination.name}</span> to collect the items.
            </p>
        </CardContainer>

        {/* Order Details Card */}
        <CardContainer>
          <CardHeaderMock>
            <h3 className="font-extrabold text-xl text-gray-800 flex items-center gap-2">
                <ClipboardList className="h-6 w-6 text-gray-500" /> Full Order Summary
            </h3>
          </CardHeaderMock>
          <CardContentMock className="space-y-4">
            {/* Pickup Info */}
            <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg">
              <Store className="h-6 w-6 text-blue-600 shrink-0" />
              <div>
                <p className="font-bold text-blue-800">{orderDetails.restaurant_name}</p>
                <p className="text-sm text-blue-600">{formatAddress(orderDetails.pickup_address)}</p>
              </div>
            </div>

            {/* Dropoff Info */}
            <div className="flex items-center gap-3 p-2 bg-green-50 rounded-lg">
              <User className="h-6 w-6 text-green-600 shrink-0" />
              <div>
                <p className="font-bold text-green-800">{orderDetails.customer_name || 'Customer Dropoff'}</p>
                <p className="text-sm text-green-600">{formatAddress(orderDetails.dropoff_address)}</p>
              </div>
            </div>

            {/* Delivery Notes */}
            {orderDetails.delivery_notes && (
              <div className="p-3 bg-orange-50 border border-orange-300 rounded-lg text-sm text-orange-800 shadow-inner">
                <h4 className="font-bold mb-1">Driver Instructions:</h4>
                <p>{orderDetails.delivery_notes}</p>
              </div>
            )}
          </CardContentMock>
        </CardContainer>

      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] z-20">
        <div className="flex items-center gap-3">
            {/* Primary Action */}
            {actionButton && (
                <ButtonMock
                    onClick={actionButton.action}
                    className="flex-1 h-14"
                    variant={actionButton.variant}
                >
                    {actionButton.icon}
                    <span className="ml-2">{actionButton.text}</span>
                </ButtonMock>
            )}

            {/* Quick Contact Buttons */}
            <ButtonMock
                variant="outline"
                className="w-1/4 h-14 border-gray-400 hover:bg-orange-50"
                onClick={() => {
                  if (orderDetails.customer_phone) {
                    window.open(`tel:${orderDetails.customer_phone}`);
                  } else {
                    toast({ title: "No phone number", description: "Customer phone number not available", variant: "destructive" });
                  }
                }}
            >
                <Phone className="h-6 w-6 text-orange-600" />
            </ButtonMock>
            <ButtonMock
                variant="outline"
                className="w-1/4 h-14 border-gray-400 hover:bg-orange-50"
                onClick={() => {
                  if (orderDetails.customer_phone) {
                    window.open(`sms:${orderDetails.customer_phone}`);
                  } else {
                    toast({ title: "No phone number", description: "Customer phone number not available", variant: "destructive" });
                  }
                }}
            >
                <MessageSquare className="h-6 w-6 text-orange-600" />
            </ButtonMock>
        </div>
      </div>
    </div>
  );
};

export default App;

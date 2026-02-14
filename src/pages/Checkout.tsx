// @ts-nocheck
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/contexts/CartContext';
import { AddressSelector } from '@/components/checkout/AddressSelector';
import { PaymentMethodSelector } from '@/components/checkout/PaymentMethodSelector';
import { PaymentMethodModal } from '@/components/checkout/PaymentMethodModal';
import { PromoCodeInput } from '@/components/checkout/PromoCodeInput';
import { SplitPayment } from '@/components/checkout/SplitPayment';
import { StackOrderModal } from '@/components/checkout/StackOrderModal';
import { CheckoutErrorBanner } from '@/components/checkout/CheckoutErrorBanner';
import { PaymentFailedModal } from '@/components/checkout/PaymentFailedModal';
import { parsePaymentError, validateCheckoutFields, type ParsedPaymentError } from '@/utils/paymentErrors';
import { IconTrash, IconPlus } from '@tabler/icons-react';
import { SwipeToDelete } from '@/components/ui/SwipeToDelete';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { CreditCard } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { DeliveryMap } from '@/components/mobile/DeliveryMap';
import feederNavIcon from '@/assets/feeder_nav_button_compressed.png';

// Initialize Stripe - only if publishable key is available
let stripePromise: Promise<any> | null = null;
try {
  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  if (publishableKey && publishableKey.trim() !== '') {
    stripePromise = loadStripe(publishableKey);
  } else {
    console.warn('VITE_STRIPE_PUBLISHABLE_KEY is not set - Stripe payment methods will not be available');
  }
} catch (error) {
  console.error('Failed to initialize Stripe:', error);
  stripePromise = null;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-5">
    <h2 className="text-lg font-semibold mb-3">{title}</h2>
    {children}
  </div>
);

// Add Address Form Component
const AddAddressForm: React.FC<{
  onSave: (address: any) => Promise<void>;
  onCancel: () => void;
}> = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    label: '',
    street_address: '',
    apt_suite: '',
    city: '',
    state: '',
    zip_code: '',
    is_default: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.street_address || !formData.city || !formData.state || !formData.zip_code) {
      return;
    }
    await onSave(formData);
  };

  return (
    <div className="space-y-4 overflow-y-auto max-h-[65vh] pb-4">
      <button
        onClick={onCancel}
        className="flex items-center gap-2 text-sm text-gray-600 mb-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
          <input
            type="text"
            placeholder="Home, Work, etc."
            value={formData.label}
            onChange={(e) => setFormData({...formData, label: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
          <input
            type="text"
            placeholder="123 Main St"
            value={formData.street_address}
            onChange={(e) => setFormData({...formData, street_address: e.target.value})}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Apt/Suite (Optional)</label>
          <input
            type="text"
            placeholder="Apt 4B"
            value={formData.apt_suite}
            onChange={(e) => setFormData({...formData, apt_suite: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input
              type="text"
              placeholder="Toledo"
              value={formData.city}
              onChange={(e) => setFormData({...formData, city: e.target.value})}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <input
              type="text"
              placeholder="OH"
              value={formData.state}
              onChange={(e) => setFormData({...formData, state: e.target.value})}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
          <input
            type="text"
            placeholder="43615"
            value={formData.zip_code}
            onChange={(e) => setFormData({...formData, zip_code: e.target.value})}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="set-default"
            checked={formData.is_default}
            onChange={(e) => setFormData({...formData, is_default: e.target.checked})}
            className="w-4 h-4"
          />
          <label htmlFor="set-default" className="text-sm text-gray-700">Set as default address</label>
        </div>
        <div className="pt-4 border-t">
          <button
            type="submit"
            disabled={!formData.street_address || !formData.city || !formData.state || !formData.zip_code}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-white rounded-lg py-3 text-sm font-semibold"
          >
            Save Address
          </button>
        </div>
      </form>
    </div>
  );
};

// Card Form Component using Stripe Elements
const CardForm: React.FC<{
  onSubmit: (paymentMethodId: string) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  customerAddress: any;
}> = ({ onSubmit, onCancel, isSubmitting, customerAddress }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [holderName, setHolderName] = useState('');
  const [billingZip, setBillingZip] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      return;
    }

    // Create payment method using Stripe.js
    const { paymentMethod, error } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
      billing_details: {
        name: holderName,
        address: {
          line1: customerAddress?.street_address || '',
          city: customerAddress?.city || '',
          state: customerAddress?.state || '',
          postal_code: billingZip || customerAddress?.zip_code || '',
          country: 'US',
        },
      },
    });

    if (error) {
      // Provide more helpful error messages
      let errorMessage = error.message || 'Failed to create payment method';
      
      // Check if it's a test card in live mode issue
      if (error.message?.includes('test card') || error.message?.includes('live mode')) {
        errorMessage = 'You are using a test card with a live Stripe key. Please use a real card or switch to test mode (pk_test_... key).';
      }
      
      throw new Error(errorMessage);
    }

    if (!paymentMethod || !paymentMethod.id) {
      throw new Error('Payment method was not created');
    }

    await onSubmit(paymentMethod.id);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-600">Add a credit or debit card to your account to use for payments.</p>
      
      <div className="space-y-4">
        {/* Cardholder Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Cardholder Name</label>
          <input
            type="text"
            placeholder="John Doe"
            value={holderName}
            onChange={(e) => setHolderName(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* Stripe Card Element */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Card Details</label>
          <div className="border border-gray-300 rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-orange-500">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '14px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                  invalid: {
                    color: '#9e2146',
                  },
                },
              }}
            />
          </div>
        </div>

        {/* ZIP Code */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">ZIP Code</label>
          <input
            type="text"
            placeholder="12345"
            value={billingZip}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 5);
              setBillingZip(value);
            }}
            maxLength={5}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {!customerAddress && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-800">
              Please add a delivery address in your account settings. The card billing address must match your account address.
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-3.5 text-base font-semibold hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !customerAddress || !holderName.trim() || !billingZip || billingZip.length < 5}
          className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-white rounded-lg py-3.5 text-base font-semibold"
        >
          {isSubmitting ? 'Adding Card...' : 'Add Card'}
        </button>
      </div>
    </form>
  );
};

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // ── DoorDash-style error handling state (declared early – used by effects below) ──
  const [checkoutError, setCheckoutError] = useState<ParsedPaymentError | null>(null);
  const [paymentFailedModal, setPaymentFailedModal] = useState<{
    isOpen: boolean;
    error: ParsedPaymentError | null;
    cardLast4?: string;
  }>({ isOpen: false, error: null });

  /** Show a validation-level inline banner (not a modal) */
  const showValidationError = useCallback((title: string, message: string, field?: ParsedPaymentError['field']) => {
    setCheckoutError({ type: 'validation', title, message, shouldShowModal: false, field });
  }, []);

  /** Clear all checkout errors */
  const clearCheckoutError = useCallback(() => {
    setCheckoutError(null);
  }, []);

  // Check authentication on mobile - guests cannot checkout
  useEffect(() => {
    const checkMobileAuth = async () => {
      const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile) {
        const isGuest = localStorage.getItem('guest_mode') === 'true';
        if (isGuest) {
          showValidationError('Sign in Required', 'Please sign in to place an order.');
          navigate('/auth?redirect=/checkout');
          return;
        }

        // Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          showValidationError('Sign in Required', 'Please sign in to place an order.');
          navigate('/auth?redirect=/checkout');
        }
      }
    };
    
    checkMobileAuth();
  }, [navigate, showValidationError]);
  
  // Detect desktop vs mobile for layout switching
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 768);
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth > 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Safety check for Stripe
  useEffect(() => {
    if (!stripePromise && import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
      console.warn('Stripe failed to initialize - payment methods may not work');
    }
  }, []);
  const { cartItems: contextCartItems, restaurantId: contextRestaurantId, removeFromCart, addToCart: addToCartContext } = useCart();
  const [cart, setCart] = useState<any[]>([]);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [menuItemImages, setMenuItemImages] = useState<Record<string, string>>({});
  const [suggestedMenuItems, setSuggestedMenuItems] = useState<any[]>([]);
  const [userDeliveryPreferences, setUserDeliveryPreferences] = useState<{
    instructions?: string;
    leaveAtDoor?: boolean;
  }>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<any>(null);
  const [hasPaymentMethods, setHasPaymentMethods] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentType, setSelectedPaymentType] = useState<string | null>(null);
  const [showPaymentSetup, setShowPaymentSetup] = useState(false);
  const [paymentSetupValue, setPaymentSetupValue] = useState<string>('');
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [customerAddress, setCustomerAddress] = useState<any>(null);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [showDealsModal, setShowDealsModal] = useState(false);
  const [availableDeals, setAvailableDeals] = useState<any[]>([]);
  const [appliedDeal, setAppliedDeal] = useState<any>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [savedPhoneNumbers, setSavedPhoneNumbers] = useState<string[]>([]);
  const [showAddPhoneForm, setShowAddPhoneForm] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [giftInfo, setGiftInfo] = useState<{
    isGift: boolean;
    recipientName: string;
    recipientPhone: string;
    recipientAddress: string;
    recipientCity: string;
    recipientState: string;
    recipientZip: string;
    giftMessage: string;
  }>({
    isGift: false,
    recipientName: '',
    recipientPhone: '',
    recipientAddress: '',
    recipientCity: '',
    recipientState: '',
    recipientZip: '',
    giftMessage: ''
  });
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedScheduleDate, setSelectedScheduleDate] = useState<string>('');
  const [selectedScheduleTime, setSelectedScheduleTime] = useState<string>('');
  const [isAdjustingPin, setIsAdjustingPin] = useState(false);
  const [pinLocation, setPinLocation] = useState<{ lng: number; lat: number } | null>(null);
  const [splitPaymentMethods, setSplitPaymentMethods] = useState<Array<{ paymentMethodId: string; amount: number }>>([]);
  const [showStackOrderModal, setShowStackOrderModal] = useState(false);
  const [completedOrderId, setCompletedOrderId] = useState<string>('');
  const [completedOrderItems, setCompletedOrderItems] = useState<any[]>([]);

  /** Route an error to either the inline banner or the payment-failed modal */
  const showCheckoutError = useCallback((error: any) => {
    const parsed = parsePaymentError(error);
    if (parsed.shouldShowModal) {
      setPaymentFailedModal({
        isOpen: true,
        error: parsed,
        cardLast4: selectedPaymentMethod?.last4 || undefined,
      });
    } else {
      setCheckoutError(parsed);
    }
  }, [selectedPaymentMethod]);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    aptSuite: '',
    city: '',
    state: '',
    zip: '',
    instructions: '',
    tip: 0,
    tipType: 'percentage',
    tipPercent: 15,
    deliveryMethod: 'delivery',
    deliverySpeed: 'standard', // 'express', 'standard', 'scheduled'
    leaveAtDoor: false,
    schedule: 'ASAP'
  });

  // Fee-related state - declared early to avoid TDZ issues
  const [deliveryFee, setDeliveryFee] = useState(300); // Default $3.00
  const [cravemoreEligible, setCravemoreEligible] = useState(false);
  const [hasCravemore, setHasCravemore] = useState(false);
  const [cravemoreAmountNeeded, setCravemoreAmountNeeded] = useState<number | null>(null);
  const [processingFeePercentCard, setProcessingFeePercentCard] = useState<number | null>(null);
  const [processingFeePercentAch, setProcessingFeePercentAch] = useState<number | null>(null);

  // Load cart from localStorage (from restaurant page) or fallback to CartContext
  useEffect(() => {
    const savedCart = localStorage.getItem('checkout_cart');
    const savedRestaurant = localStorage.getItem('checkout_restaurant');
    const savedDeliveryMethod = localStorage.getItem('checkout_delivery_method');
    const pendingOrderId = localStorage.getItem('pending_order_id');
    
    let loadedCart: any[] = [];
    
    // If there's a pending order ID, we're coming from CartSidebar after order creation
    // The order is already created, we just need to process payment
    if (pendingOrderId) {
      console.log('Pending order found:', pendingOrderId);
      // Order already exists, we'll use it when processing payment
    }
    
    // Try localStorage first
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        if (Array.isArray(parsedCart) && parsedCart.length > 0) {
          loadedCart = parsedCart;
          setCart(parsedCart);
        }
      } catch (e) {
        console.error('Error parsing saved cart:', e);
      }
    }
    
    // Fallback to CartContext if localStorage is empty
    if (loadedCart.length === 0 && contextCartItems.length > 0) {
      console.log('Using cart from CartContext:', contextCartItems);
      loadedCart = contextCartItems;
      setCart(contextCartItems);
      
      // Also try to load restaurant from context
      if (contextRestaurantId && !savedRestaurant) {
        // Fetch restaurant data
        supabase
          .from('restaurants')
          .select('*')
          .eq('id', contextRestaurantId)
          .single()
          .then(({ data, error }) => {
            if (data && !error) {
              setRestaurant(data);
            }
          });
      }
    }
    
    if (savedRestaurant) {
      try {
        setRestaurant(JSON.parse(savedRestaurant));
      } catch (e) {
        console.error('Error parsing saved restaurant:', e);
      }
    }
    
    if (savedDeliveryMethod) {
      setFormData(prev => ({ ...prev, deliveryMethod: savedDeliveryMethod as 'delivery' | 'pickup' }));
    }
    
    // Redirect if cart is still empty after trying both sources
    if (loadedCart.length === 0 && contextCartItems.length === 0) {
      console.warn('Cart is empty, redirecting to restaurants');
      showValidationError('Your Cart is Empty', 'Add items to your cart before checking out.');
      setTimeout(() => {
        navigate('/restaurants');
      }, 2000);
    }
  }, [contextCartItems, contextRestaurantId, navigate, showValidationError]);

  // Fetch menu item images when cart changes
  useEffect(() => {
    if (cart.length > 0) {
      const itemIds = cart.map(item => item.id).filter(Boolean);
      if (itemIds.length > 0) {
        supabase
          .from('menu_items')
          .select('id, image_url')
          .in('id', itemIds)
          .then(({ data, error }) => {
            if (error) {
              console.error('Error fetching menu item images:', error);
              return;
            }
            if (data) {
              const imageMap: Record<string, string> = {};
              data.forEach(item => {
                if (item.image_url) {
                  imageMap[item.id] = item.image_url;
                }
              });
              setMenuItemImages(prev => ({ ...prev, ...imageMap }));
            }
          });
      }
    }
  }, [cart]);

  // Load customer profile, address data, and payment methods
  useEffect(() => {
    const loadCustomerData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Load user profile with preferences/settings
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('full_name, phone, preferences, settings')
          .eq('user_id', user.id)
          .single();

        // Load default delivery address
        const { data: address } = await supabase
          .from('delivery_addresses')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_default', true)
          .single();

        // Load payment methods (Stripe only)
        const { data: paymentMethods, error: pmError } = await supabase
          .from('payment_methods')
          .select('*')
          .eq('user_id', user.id)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false });

        if (!pmError && paymentMethods && paymentMethods.length > 0) {
          setHasPaymentMethods(true);
          // Auto-select the default payment method or the first one
          const defaultMethod = paymentMethods.find((m: any) => m.is_default) || paymentMethods[0];
          if (defaultMethod) {
            setSelectedPaymentMethod({
              id: defaultMethod.id,
              type: (defaultMethod as any).type || 'card',
              stripe_payment_method_id: (defaultMethod as any).stripe_payment_method_id,
              brand: defaultMethod.brand,
              last4: defaultMethod.last4,
              is_default: defaultMethod.is_default
            });
          }
        } else {
          setHasPaymentMethods(false);
        }

        // Extract delivery preferences from profile
        const prefs = profile?.preferences || {};
        const settings = profile?.settings || {};
        setUserDeliveryPreferences({
          instructions: prefs.default_delivery_instructions || settings.default_delivery_instructions || '',
          leaveAtDoor: prefs.default_leave_at_door || settings.default_leave_at_door || false,
        });

        // Update form data with profile info (used for order creation, not displayed)
        if (profile || address || user.email) {
          setFormData(prev => ({
            ...prev,
            name: profile?.full_name || prev.name,
            phone: profile?.phone || prev.phone,
            email: user.email || prev.email,
            address: address?.street_address || prev.address,
            aptSuite: address?.apt_suite || prev.aptSuite,
            city: address?.city || prev.city,
            state: address?.state || prev.state,
            zip: address?.zip_code || prev.zip,
          }));
          
          // Store customer address for card billing address
          if (address) {
            setCustomerAddress(address);
            // Note: CardForm component handles its own state for cardholder name and ZIP
          }
        }
      } catch (error) {
        console.error('Error loading customer data:', error);
        // Continue with empty form if profile doesn't exist
      }
    };

    loadCustomerData();
    loadCustomerDeals();
  }, []);

  // Load saved delivery addresses
  useEffect(() => {
    const loadSavedAddresses = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('delivery_addresses')
          .select('*')
          .eq('user_id', user.id)
          .order('is_default', { ascending: false });

        if (error) throw error;
        if (data) {
          setSavedAddresses(data);
        }
      } catch (error) {
        console.error('Error loading saved addresses:', error);
      }
    };

    loadSavedAddresses();
  }, []);

  // Load customer deals/perks
  const loadCustomerDeals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const deals: any[] = [];

      // Fetch referral bonuses that can be used
      const { data: referralBonuses } = await supabase
        .from('referral_bonuses')
        .select('*, referrals(*)')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (referralBonuses) {
        referralBonuses.forEach((bonus: any) => {
          deals.push({
            id: bonus.id,
            type: 'referral_bonus',
            title: 'Referral Bonus',
            description: `Earned from referral program`,
            discount_amount_cents: bonus.amount,
            discount_type: 'fixed_amount',
            expires_at: null,
            source: 'referral'
          });
        });
      }

      // You can add more deal sources here:
      // - Promo codes earned through loyalty
      // - Subscription benefits
      // - Special promotions
      // - etc.

      setAvailableDeals(deals);
    } catch (error) {
      console.error('Error loading customer deals:', error);
    }
  };

  // Fetch suggested menu items from the restaurant
  useEffect(() => {
    if (restaurant?.id) {
      supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .eq('is_available', true)
        .limit(20)
        .then(({ data, error }) => {
          if (error) {
            console.error('Error fetching suggested menu items:', error);
            return;
          }
          if (data) {
            // Filter out items already in cart
            const cartItemIds = new Set(cart.map(item => item.id));
            const suggested = data.filter(item => !cartItemIds.has(item.id));
            setSuggestedMenuItems(suggested);
          }
        });
    }
  }, [restaurant?.id, cart]);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + (item.price_cents * item.quantity), 0),
    [cart]
  );

  // Check CraveMore membership and calculate fees
  useEffect(() => {
    const checkCravemoreAndCalculateFees = async () => {
      if (!restaurant || cart.length === 0) {
        setDeliveryFee(300);
        return;
      }
      
      // No delivery fee for pickup orders
      if (formData.deliveryMethod !== 'delivery') {
        setDeliveryFee(0);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Check membership
        if (user) {
          const { data: membership, error: membershipError } = await supabase
            .from('user_memberships')
            .select('status, renews_at')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .maybeSingle();

          // Silently handle membership query errors (RLS may block access)
          if (membershipError && membershipError.code !== 'PGRST116') {
            console.warn('Error checking membership:', membershipError);
          }

          if (membership && (!membership.renews_at || new Date(membership.renews_at) > new Date())) {
            setHasCravemore(true);
            
            // Check eligibility
            const MIN_SUBTOTAL = 1200; // $12.00
            if (subtotal >= MIN_SUBTOTAL) {
              // Check merchant eligibility
              const { data: merchant } = await supabase
                .from('merchants')
                .select('cravemore_eligible')
                .eq('id', restaurant.id)
                .single();

              if (merchant?.cravemore_eligible !== false) {
                setCravemoreEligible(true);
                setDeliveryFee(0);
                return;
              }
            } else {
              setCravemoreAmountNeeded(MIN_SUBTOTAL - subtotal);
            }
          }
        }

        // Calculate fees using the function
        if (formData.address && restaurant.latitude && restaurant.longitude) {
          // Get coordinates for address (simplified - you may want to use geocoding)
          const { data: fees, error } = await supabase.functions.invoke('calculate-order-fees', {
            body: {
              orderData: {
                subtotal_cents: subtotal,
                restaurant_id: restaurant.id,
                customer_id: user?.id,
                delivery_address: {
                  lat: 0, // Would need geocoding
                  lng: 0,
                },
                pickup_address: {
                  lat: restaurant.latitude,
                  lng: restaurant.longitude,
                },
              },
            },
          });

          if (!error && fees?.data) {
            setDeliveryFee(fees.data.delivery_fee_cents || 300);
            setCravemoreEligible(fees.data.cravemore_delivery_fee_waived || false);

            // Capture processing fee configuration (Stripe)
            if (typeof fees.data.processing_fee_percent_card === 'number') {
              setProcessingFeePercentCard(fees.data.processing_fee_percent_card);
            }
            if (typeof fees.data.processing_fee_percent_ach === 'number') {
              setProcessingFeePercentAch(fees.data.processing_fee_percent_ach);
            }
          }
        } else {
          setDeliveryFee(300);
        }
      } catch (error) {
        console.error('Error checking CraveMore:', error);
        setDeliveryFee(300);
      }
    };

    checkCravemoreAndCalculateFees();
  }, [cart, subtotal, restaurant, formData.deliveryMethod, formData.address]);

  const subtotalAfterPromo = useMemo(
    () => Math.max(0, subtotal - promoDiscount),
    [subtotal, promoDiscount]
  );

  // Express delivery fee ($2.99 = 299 cents)
  const expressFee = useMemo(
    () => formData.deliverySpeed === 'express' ? 299 : 0,
    [formData.deliverySpeed]
  );

  const tax = useMemo(
    () => Math.round((subtotalAfterPromo + deliveryFee + expressFee) * 0.08), // 8% tax
    [subtotalAfterPromo, deliveryFee, expressFee]
  );
  const tipAmount = useMemo(
    () => formData.tipType === 'percentage' 
    ? Math.round(subtotal * (formData.tipPercent / 100))
      : formData.tip,
    [formData.tipType, formData.tipPercent, formData.tip, subtotal]
  );

  // Stripe processing fee is applied to the full customer charge (including tip),
  // using the configured card/ACH percentages from the backend.
  const processingFeeCents = useMemo(() => {
    const percent =
      typeof processingFeePercentCard === 'number'
        ? processingFeePercentCard
        : typeof processingFeePercentAch === 'number'
          ? processingFeePercentAch
          : 0;

    if (!percent) return 0;

    const base = subtotalAfterPromo + deliveryFee + expressFee + tax + tipAmount;
    return Math.round(base * (percent / 100));
  }, [processingFeePercentCard, processingFeePercentAch, subtotalAfterPromo, deliveryFee, expressFee, tax, tipAmount]);

  const total = useMemo(
    () => subtotalAfterPromo + deliveryFee + expressFee + tax + tipAmount + processingFeeCents,
    [subtotalAfterPromo, deliveryFee, expressFee, tax, tipAmount, processingFeeCents]
  );

  const handleAddressSelect = (address: any) => {
    setFormData({
      ...formData,
      name: address.name || '',
      address: address.address || '',
      aptSuite: address.apt_suite || '',
      city: address.city || '',
      state: address.state || '',
      zip: address.zip || ''
    });
  };

  // Format phone number for display
  const formatPhoneNumber = (phone: string): string => {
    if (!phone) return '';
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    
    // Return as-is if not 10 digits
    return phone;
  };

  const handlePromoApplied = (discount: number, promo: any) => {
    setPromoDiscount(discount);
    setAppliedPromo(promo);
  };

  const handlePlaceOrder = async () => {
    // Clear any previous error when user retries
    clearCheckoutError();

    const validationError = validateCheckoutFields({
      hasCartItems: !!restaurant && cart.length > 0,
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      zip: formData.zip,
      isDelivery: formData.deliveryMethod === 'delivery',
      hasPaymentMethod: splitPaymentMethods.length > 0 || !!selectedPaymentMethod,
    });

    if (validationError) {
      setCheckoutError(validationError);
      return;
    }

    // Process order directly (payment methods now visible on page)
    await processOrder();
  };

  const processOrder = async () => {
    // Payment method is required for Stripe processing
    if (!selectedPaymentMethod) {
      showValidationError('Payment Method Required', 'Please select or add a payment method to complete your order.');
      return;
    }

    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Check if order was already created (coming from CartSidebar)
      const pendingOrderId = localStorage.getItem('pending_order_id');
      let newOrder;
      
      if (pendingOrderId) {
        // Order already exists, fetch it
        const { data: existingOrder, error: fetchError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', pendingOrderId)
          .single();
        
        if (fetchError || !existingOrder) {
          throw new Error('Pending order not found. Please try again.');
        }
        
        newOrder = existingOrder;
        console.log('Using existing order from CartSidebar:', newOrder.id);
      } else {
        // Check if this is a stacked order
        const stackParentId = localStorage.getItem('stack_parent_order_id');
        const isStackMode = localStorage.getItem('stack_mode') === 'true';

        // Determine stack order number if stacking
        let stackOrderNumber = 1;
        if (stackParentId && isStackMode) {
          const { data: existingStacks } = await supabase
            .from('orders')
            .select('stack_order_number')
            .or(`id.eq.${stackParentId},stack_parent_order_id.eq.${stackParentId}`)
            .order('stack_order_number', { ascending: false })
            .limit(1);
          
          if (existingStacks && existingStacks.length > 0) {
            stackOrderNumber = (existingStacks[0].stack_order_number || 1) + 1;
          }
        }

        // Create new order
        const { data: createdOrder, error: orderError } = await supabase
          .from('orders')
          .insert({
            customer_id: user?.id || null,
            restaurant_id: restaurant.id,
            subtotal_cents: subtotal,
            delivery_fee_cents: formData.deliveryMethod === 'delivery' ? deliveryFee : 0,
            tax_cents: tax,
            tip_cents: tipAmount, // 100% of this tip amount goes directly to the Feeder
            total_cents: total,
            order_status: 'pending',
            customer_name: formData.name,
            customer_phone: formData.phone,
            delivery_address: formData.deliveryMethod === 'delivery' ? {
              name: formData.name,
              phone: formData.phone,
              email: formData.email,
              address: `${formData.address}, ${formData.city}, ${formData.state} ${formData.zip}`,
              special_instructions: userDeliveryPreferences.instructions || null,
              apt_suite: formData.aptSuite,
              leave_at_door: userDeliveryPreferences.leaveAtDoor || false,
              scheduled_time: 'ASAP',
              // Exact pin-drop coordinates from the customer's adjusted map pin
              lat: pinLocation?.lat || null,
              lng: pinLocation?.lng || null
            } : null,
            pickup_address: {
              name: restaurant.name,
              address: restaurant.address || 'Restaurant address',
              lat: restaurant.latitude,
              lng: restaurant.longitude
            },
            estimated_delivery_time: new Date(Date.now() + 45 * 60000).toISOString(),
            is_stacked: isStackMode,
            stack_parent_order_id: stackParentId || null,
            stack_order_number: stackOrderNumber
          })
          .select()
          .single();

        if (orderError) {
          console.error('Order creation error:', orderError);
          throw new Error(`Failed to create order: ${orderError.message || 'Unknown error'}`);
        }

        if (!createdOrder || !createdOrder.id) {
          console.error('Order creation failed - createdOrder:', createdOrder);
          throw new Error('Order was not created or is missing ID');
        }

        newOrder = createdOrder;
        console.log('Order created successfully:', newOrder.id);

        // Create order items
        const orderItems = cart.map(item => ({
          order_id: newOrder!.id,
          menu_item_id: item.id,
          quantity: item.quantity,
          price_cents: item.price_cents,
          special_instructions: item.special_instructions || null
        }));

        const { error: orderItemsError } = await supabase.from('order_items').insert(orderItems);
        
        if (orderItemsError) {
          console.error('Order items error:', orderItemsError);
          throw new Error(`Failed to create order items: ${orderItemsError.message}`);
        }

        // If this is a stacked order, alert feeders
        if (isStackMode && stackParentId && newOrder?.id) {
          console.log('Alerting feeders about stacked order...');
          const { error: alertError } = await supabase.functions.invoke('alert-feeder-stack-order', {
            body: {
              parentOrderId: stackParentId,
              stackedOrderId: newOrder.id
            }
          });

          if (alertError) {
            console.error('Feeder alerting error:', alertError);
            // Don't throw - alerting failure shouldn't stop the order
          }

          // Clear stack mode flags
          localStorage.removeItem('stack_parent_order_id');
          localStorage.removeItem('stack_mode');
        }
      }
      
      // Ensure newOrder is defined before proceeding
      if (!newOrder || !newOrder.id) {
        throw new Error('Order was not created or is missing ID');
      }

      // Record promo code usage if applied
      if (appliedPromo && user) {
        const { error: promoError } = await supabase.from('promo_code_usage').insert({
          promo_code_id: appliedPromo.id,
          user_id: user.id,
          order_id: newOrder.id,
          discount_applied_cents: promoDiscount
        });
        
        if (promoError) {
          console.error('Promo code usage error:', promoError);
          // Don't throw - this is non-critical
        }
      }

      // Create payment with Stripe (single or split)
      let paymentData;
      let paymentError;

      if (splitPaymentMethods.length > 1) {
        // Split payment between 2 cards
        const { data, error } = await supabase.functions.invoke('create-split-payment', {
          body: {
            orderTotal: total,
            orderId: newOrder.id,
            customerInfo: {
              name: formData.name,
              email: formData.email,
              phone: formData.phone
            },
            payments: splitPaymentMethods,
            provider: 'stripe'
          }
        });
        paymentData = data;
        paymentError = error;
      } else {
        // Single payment method
        if (!selectedPaymentMethod && splitPaymentMethods.length === 0) {
          showValidationError('Payment Method Required', 'Please select or add a payment method to complete your order.');
          setIsProcessing(false);
          return;
        }

        const paymentMethodId = splitPaymentMethods.length === 1 
          ? splitPaymentMethods[0].paymentMethodId 
          : selectedPaymentMethod?.stripe_payment_method_id;

        const { data, error } = await supabase.functions.invoke('create-payment', {
          body: {
            orderTotal: total,
            orderId: newOrder.id,
            customerInfo: {
              name: formData.name,
              email: formData.email,
              phone: formData.phone
            },
            paymentMethodId: paymentMethodId,
            paymentMethodType: selectedPaymentMethod?.type || 'card',
            provider: 'stripe'
          }
        });
        paymentData = data;
        paymentError = error;
      }

      if (paymentError) {
        console.error('Payment error:', paymentError);
        throw new Error(`Payment creation failed: ${paymentError.message || 'Unknown error'}`);
      }

      // Stripe processes payments directly - no redirect URL needed
      if (!paymentData) {
        console.error('Payment response:', paymentData);
        throw new Error('Payment processing failed - no response received');
      }

      // Check payment status
      if (paymentData.status === 'succeeded' || paymentData.status === 'pending' || paymentData.status === 'processing') {
        // Payment successful — clear any residual errors
        clearCheckoutError();
        setPaymentFailedModal({ isOpen: false, error: null });

        // Store order info for stack order modal
        setCompletedOrderId(newOrder.id);
        setCompletedOrderItems(cart);

        // Clear cart
        localStorage.removeItem('checkout_cart');
        localStorage.removeItem('checkout_restaurant');
        localStorage.removeItem('checkout_delivery_method');
        localStorage.removeItem('pending_order_id');

        // Show stack order modal (5-minute window to add more)
        setShowStackOrderModal(true);

        // If user doesn't stack, redirect after modal closes
        // Modal will handle navigation
      } else {
        throw new Error(`Payment failed with status: ${paymentData.status}`);
      }
      
    } catch (error: any) {
      console.error('Order error:', error);
      showCheckoutError(error);
      setIsProcessing(false);
    }
  };

  // Show compact delivery details view on mobile when payment method exists;
  // Desktop always gets the full wide layout
  const showDeliveryDetailsView = !isDesktop && hasPaymentMethods && selectedPaymentMethod;

  return (
    <div className="min-h-screen bg-white">
      {showDeliveryDetailsView ? (
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 z-10 px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 -ml-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Checkout</p>
                <h1 className="text-lg font-bold text-gray-900">{restaurant?.name || 'Restaurant'}</h1>
              </div>
            </div>
          </div>

          {/* Error Banner — Delivery Details View */}
          <div className="px-4 pt-3">
            <CheckoutErrorBanner error={checkoutError} onDismiss={clearCheckoutError} onRetry={() => processOrder()} />
          </div>

          {/* Delivery Details Section */}
          <div className="px-4 py-6">
            <h2 className="text-2xl font-bold mb-6">Delivery details</h2>

            {/* Map View */}
            <div className="mb-6">
              <DeliveryMap
                dropoffAddress={customerAddress || (formData.address ? {
                  street_address: formData.address,
                  city: formData.city,
                  state: formData.state,
                  zip_code: formData.zip
                } : undefined)}
                className="w-full h-48 rounded-lg overflow-hidden mb-2"
                editable={isAdjustingPin}
                customPinIcon={feederNavIcon}
                onLocationChange={(lng, lat) => {
                  // Store pending pin location — only committed on "Save pin"
                  setPinLocation({ lng, lat });
                }}
              />
              {isAdjustingPin ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      // Cancel — discard pending pin
                      setPinLocation(null);
                      setIsAdjustingPin(false);
                    }}
                    className="flex-1 bg-white border border-gray-300 px-3 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      // Save the pin — reverse geocode and lock coordinates
                      if (pinLocation) {
                        try {
                          const { data: tokenData } = await supabase.functions.invoke('get-mapbox-token');
                          if (tokenData?.token) {
                            const response = await fetch(
                              `https://api.mapbox.com/geocoding/v5/mapbox.places/${pinLocation.lng},${pinLocation.lat}.json?access_token=${tokenData.token}&limit=1`
                            );
                            const data = await response.json();
                            if (data.features && data.features.length > 0) {
                              const feature = data.features[0];
                              const context = feature.context || [];
                              const street = feature.text || '';
                              const city = context.find((c: any) => c.id.startsWith('place'))?.text || '';
                              const state = context.find((c: any) => c.id.startsWith('region'))?.text || '';
                              const zip = context.find((c: any) => c.id.startsWith('postcode'))?.text || '';

                              setFormData({
                                ...formData,
                                address: feature.properties?.address || street,
                                city: city,
                                state: state,
                                zip: zip
                              });
                            }
                          }
                        } catch (error) {
                          console.error('Reverse geocoding error:', error);
                        }
                      }
                      setIsAdjustingPin(false);
                    }}
                    className="flex-1 bg-orange-500 text-white px-3 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors hover:bg-orange-600"
                  >
                    Save pin
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsAdjustingPin(true)}
                  className="w-full bg-white border border-gray-200 hover:border-orange-500 px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm transition-colors"
                >
                  Adjust pin
                </button>
              )}
            </div>

            {/* Delivery Time */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-gray-900">Delivery Time</span>
                <span className="text-sm text-gray-600">20-35 min</span>
              </div>
              
              <div className="space-y-2">
                {/* Express */}
                <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  formData.deliverySpeed === 'express' 
                    ? 'border-2 border-black bg-gray-50' 
                    : 'border border-gray-200 hover:border-orange-500'
                }`}>
                  <input 
                    type="radio" 
                    name="deliverySpeed" 
                    value="express" 
                    checked={formData.deliverySpeed === 'express'}
                    onChange={(e) => setFormData({...formData, deliverySpeed: e.target.value})}
                    className="w-4 h-4" 
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">Express</span>
                      <span className="text-sm text-red-500">+ $2.99</span>
                    </div>
                    <div className="text-xs text-gray-500">15-30 min</div>
                    <div className="text-xs text-red-500 mt-0.5">Direct to you</div>
                  </div>
                </label>

                {/* Standard */}
                <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  formData.deliverySpeed === 'standard' 
                    ? 'border-2 border-black bg-gray-50' 
                    : 'border border-gray-200 hover:border-orange-500'
                }`}>
                  <input 
                    type="radio" 
                    name="deliverySpeed" 
                    value="standard" 
                    checked={formData.deliverySpeed === 'standard'}
                    onChange={(e) => setFormData({...formData, deliverySpeed: e.target.value})}
                    className="w-4 h-4" 
                  />
                  <div className="flex-1">
                    <span className="font-medium text-sm">Standard</span>
                    <div className="text-xs text-gray-500">20-35 min</div>
                  </div>
                </label>

                {/* Scheduled */}
                <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  formData.deliverySpeed === 'scheduled' 
                    ? 'border-2 border-black bg-gray-50' 
                    : 'border border-gray-200 hover:border-orange-500'
                }`}>
                  <input 
                    type="radio" 
                    name="deliverySpeed" 
                    value="scheduled" 
                    checked={formData.deliverySpeed === 'scheduled'}
                    onChange={(e) => {
                      if (e.target.value === 'scheduled') {
                        setShowScheduleModal(true);
                      } else {
                        setFormData({...formData, deliverySpeed: e.target.value});
                      }
                    }}
                    className="w-4 h-4" 
                  />
                  <div className="flex-1">
                    <span className="font-medium text-sm">Scheduled</span>
                    <div className="text-xs text-gray-500">
                      {selectedScheduleDate && selectedScheduleTime 
                        ? `${new Date(selectedScheduleDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${selectedScheduleTime}`
                        : 'Choose time'
                      }
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="mb-4">
              <button
                onClick={() => setShowAddressModal(true)}
                className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-orange-500 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <div className="flex-1 text-left">
                  <div className="font-medium text-sm text-gray-900">
                    {formData.address || customerAddress?.street_address || 'Add delivery address'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formData.city && formData.state && formData.zip 
                      ? `${formData.city}, ${formData.state} ${formData.zip}`
                      : customerAddress 
                        ? `${customerAddress.city}, ${customerAddress.state} ${customerAddress.zip_code}`
                        : 'Tap to select address'
                    }
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Delivery Instructions */}
            <div className="mb-4">
              <button
                onClick={() => setShowInstructionsModal(true)}
                className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-orange-500 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <div className="flex-1 text-left">
                  <div className="font-medium text-sm text-gray-900">
                    {formData.instructions || 'Add instructions'}
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Contact Number */}
            <div className="mb-4">
              <button
                onClick={() => setShowPhoneModal(true)}
                className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-orange-500 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <div className="flex-1 text-left">
                  <div className="font-medium text-sm text-gray-900">
                    {formData.phone ? formatPhoneNumber(formData.phone) : 'Add phone number'}
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Gift Option */}
            <div className="mb-6">
              <button
                onClick={() => setShowGiftModal(true)}
                className={`w-full flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                  giftInfo.isGift
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-orange-500 hover:border-orange-600 bg-orange-50'
                }`}
              >
                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
                <div className="flex-1 text-left">
                  <div className="font-medium text-sm text-orange-500">
                    {giftInfo.isGift ? `Gift to ${giftInfo.recipientName || 'Recipient'}` : 'Gift It'}
                  </div>
                </div>
                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Payment Method Section */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-semibold text-gray-900">Payment Method</span>
              </div>
              
              {hasPaymentMethods && selectedPaymentMethod ? (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-orange-500 transition-colors bg-white"
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate">
                      {selectedPaymentMethod.type === 'card' 
                        ? `${selectedPaymentMethod.brand || 'Card'} •••• ${selectedPaymentMethod.last4}`
                        : `Bank Account •••• ${selectedPaymentMethod.last4}`
                      }
                    </div>
                    <div className="text-xs text-gray-500">
                      {selectedPaymentMethod.is_default ? 'Default payment method' : 'Payment method'}
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-orange-500 transition-colors bg-white"
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-sm text-gray-900">Add Payment Method</div>
                    <div className="text-xs text-gray-500">Tap to add a card or bank account</div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>

            {/* Cart Summary Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="font-semibold text-gray-900">Cart Summary</span>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </div>
              <div className="text-sm text-gray-600 mb-3">
                {restaurant?.name || 'Restaurant'} • {cart.length} {cart.length === 1 ? 'item' : 'items'}
              </div>
              
              {/* Cart Items - Swipe left to delete */}
              <div className="space-y-1">
                {cart.map((item, i) => {
                  const modifierTotal = item.modifiers?.reduce((sum: number, mod: any) => sum + (mod.price_cents || 0), 0) || 0;
                  const itemTotal = ((item.price_cents + modifierTotal) * item.quantity) / 100;
                  const modifiersText = item.modifiers?.map((m: any) => m.name).join(', ') || '';
                  
                  return (
                    <SwipeToDelete
                      key={item.id || i}
                      onDelete={() => {
                        const newCart = cart.filter((_, idx) => idx !== i);
                        setCart(newCart);
                        localStorage.setItem('checkout_cart', JSON.stringify(newCart));
                        if (removeFromCart) {
                          removeFromCart(item.id);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between py-2">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {item.quantity} x {item.name}
                          </div>
                          {modifiersText && (
                            <div className="text-xs text-gray-600 mt-0.5">{modifiersText}</div>
                          )}
                        </div>
                        <div className="text-sm font-semibold text-gray-900">
                          ${itemTotal.toFixed(2)}
                        </div>
                      </div>
                    </SwipeToDelete>
                  );
                })}
              </div>
            </div>

            {/* Summary Section */}
            <div className="mb-6 space-y-3">
              {/* Deals */}
              <button 
                onClick={() => setShowDealsModal(true)}
                className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-orange-500 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-900">Deals</span>
                  {availableDeals.length > 0 && (
                    <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">
                      {availableDeals.length}
                    </span>
                  )}
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Subtotal */}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium text-gray-900">${(subtotal / 100).toFixed(2)}</span>
              </div>

              {/* Delivery Fee */}
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-1">
                  <span className="text-gray-600">Delivery Fee</span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="font-medium text-gray-900">
                  {cravemoreEligible ? '$0.00' : `$${(deliveryFee / 100).toFixed(2)}`}
                </span>
              </div>

              {/* Express Delivery Fee */}
              {expressFee > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Express Delivery</span>
                  <span className="font-medium text-gray-900">
                    ${(expressFee / 100).toFixed(2)}
                  </span>
                </div>
              )}

              {/* Fees & Estimated Tax */}
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-1">
                  <span className="text-gray-600">Fees & Estimated Tax</span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="font-medium text-gray-900">
                  ${((tax + processingFeeCents) / 100).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Feeder Tip Section */}
            <div className="mb-6">
              <div className="flex items-center gap-1 mb-3">
                <span className="text-sm font-semibold text-gray-900">Feeder Tip</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              
              {/* Tip Amount Buttons */}
              <div className="flex items-center gap-2 mb-2">
                {[550, 600, 650].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => {
                      setFormData({...formData, tip: amount, tipType: 'fixed'});
                    }}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      formData.tip === amount && formData.tipType === 'fixed'
                        ? 'bg-black text-white'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    ${(amount / 100).toFixed(2)}
                  </button>
                ))}
                <button
                  onClick={() => {
                    const customAmount = prompt("Enter custom tip amount:");
                    if (customAmount) {
                      setFormData({...formData, tip: Math.round(parseFloat(customAmount) * 100), tipType: 'fixed'});
                    }
                  }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    formData.tipType === 'fixed' && ![550, 600, 650].includes(formData.tip)
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  Other
                </button>
                <div className="text-sm font-semibold text-gray-900 ml-2">
                  ${(tipAmount / 100).toFixed(2)}
                </div>
              </div>
              
              <p className="text-xs text-gray-500">100% of the tip goes to your Feeder.</p>
            </div>

            {/* Total Section */}
            <div className="mb-6 pb-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-base font-semibold text-gray-900">Total</span>
                <div className="text-right">
                  {promoDiscount > 0 && (
                    <div className="text-sm text-gray-400 line-through mb-1">
                      ${((subtotal + deliveryFee + tax + tipAmount + processingFeeCents) / 100).toFixed(2)}
                    </div>
                  )}
                  <div className="text-xl font-bold text-red-500">
                    ${(total / 100).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Place Order Button */}
            <button
              onClick={processOrder}
              disabled={isProcessing}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-white rounded-lg py-4 text-base font-semibold mb-6"
            >
              {isProcessing ? 'Processing...' : 'Place order'}
            </button>
          </div>
        </div>
      ) : (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Checkout</h1>

        {/* Error Banner — Main Checkout View */}
        <CheckoutErrorBanner error={checkoutError} onDismiss={clearCheckoutError} onRetry={() => processOrder()} />

        {/* Delivery/Pickup Selection - At the very top */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <div className="flex items-center justify-center gap-4">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="method" 
                checked={formData.deliveryMethod === 'delivery'}
                onChange={() => setFormData({...formData, deliveryMethod: 'delivery'})}
              />
              <span>Delivery</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="method" 
                checked={formData.deliveryMethod === 'pickup'}
                onChange={() => setFormData({...formData, deliveryMethod: 'pickup'})}
              />
              <span>Pickup</span>
            </label>
          </div>
        </div>

        {/* Cart Items List */}
        {cart.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
            <h2 className="text-base font-semibold mb-3">Your Order</h2>
            <div className="space-y-3">
              {cart.map((item, i) => {
                const modifierTotal = item.modifiers?.reduce((sum: number, mod: any) => sum + (mod.price_cents || 0), 0) || 0;
                const itemTotal = ((item.price_cents + modifierTotal) * item.quantity) / 100;
                const modifiersText = item.modifiers?.map((m: any) => m.name).join(', ') || '';
                const itemImage = menuItemImages[item.id] || item.image_url || null;
                
                return (
                  <SwipeToDelete
                    key={item.id || i}
                    onDelete={() => {
                      const newCart = cart.filter((_, idx) => idx !== i);
                      setCart(newCart);
                      localStorage.setItem('checkout_cart', JSON.stringify(newCart));
                      if (removeFromCart) {
                        removeFromCart(item.id);
                      }
                    }}
                  >
                    <div className="flex items-start gap-2.5 pb-3 border-b last:border-0">
                      {/* Image with quantity badge */}
                      <div className="relative flex-shrink-0">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                          {itemImage ? (
                            <img 
                              src={itemImage} 
                              alt={item.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = 'https://placehold.co/80x80/CCCCCC/666666?text=Item';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                              No image
                            </div>
                          )}
                        </div>
                        {/* Quantity badge */}
                        <div className="absolute bottom-0 left-0 bg-black text-white text-[10px] font-semibold rounded-full w-5 h-5 flex items-center justify-center">
                          {item.quantity}×
                        </div>
                      </div>
                      
                      {/* Item details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 text-sm">{item.name}</h4>
                            {modifiersText && (
                              <p className="text-xs text-gray-600 mt-0.5">{modifiersText}</p>
                            )}
                            <p className="text-base font-bold text-gray-900 mt-0.5">${itemTotal.toFixed(2)}</p>
                          </div>
                          {/* Trash icon - also available as tap target */}
                          <button
                            onClick={() => {
                              const newCart = cart.filter((_, idx) => idx !== i);
                              setCart(newCart);
                              localStorage.setItem('checkout_cart', JSON.stringify(newCart));
                              if (removeFromCart) {
                                removeFromCart(item.id);
                              }
                            }}
                            className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <IconTrash size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </SwipeToDelete>
                );
              })}
              
              {/* Add more items button */}
              <button
                onClick={() => {
                  if (restaurant?.id) {
                    navigate(`/restaurant/${restaurant.id}`);
                  } else {
                    navigate('/restaurants');
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-700 font-medium text-sm mt-2"
              >
                <IconPlus size={16} />
                <span>Add more items</span>
              </button>
            </div>
          </div>
        )}

        {/* Add more to your cart section */}
        {suggestedMenuItems.length > 0 && restaurant?.id && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <h2 className="text-lg font-semibold mb-4">Add more to your cart</h2>
            <div className="overflow-x-auto -mx-5 px-5">
              <div className="flex gap-4 pb-2" style={{ width: 'max-content' }}>
                {suggestedMenuItems.map((item) => {
                  const itemPrice = (item.price_cents / 100).toFixed(2);
                  return (
                    <div
                      key={item.id}
                      className="flex-shrink-0 w-24"
                    >
                      <div className="relative">
                        {/* Item image */}
                        <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 mb-2">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = 'https://placehold.co/96x96/CCCCCC/666666?text=Item';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                              No image
                            </div>
                          )}
                        </div>
                        {/* Plus button overlay */}
                        <button
                          onClick={async () => {
                            const cartItem = {
                              id: item.id,
                              name: item.name,
                              price_cents: item.price_cents,
                              quantity: 1,
                              modifiers: [],
                              restaurant_id: restaurant.id,
                              image_url: item.image_url,
                            };
                            
                            // Add to context cart
                            await addToCartContext(cartItem, restaurant.id);
                            
                            // Update local cart state
                            const existingItem = cart.find(cartItem => cartItem.id === item.id);
                            if (existingItem) {
                              const newCart = cart.map(cartItem =>
                                cartItem.id === item.id
                                  ? { ...cartItem, quantity: cartItem.quantity + 1 }
                                  : cartItem
                              );
                              setCart(newCart);
                              localStorage.setItem('checkout_cart', JSON.stringify(newCart));
                            } else {
                              const newCart = [...cart, cartItem];
                              setCart(newCart);
                              localStorage.setItem('checkout_cart', JSON.stringify(newCart));
                            }
                            
                            // Remove from suggested items
                            setSuggestedMenuItems(prev => prev.filter(i => i.id !== item.id));
                            
                            toast({
                              title: 'Added to cart',
                              description: `${item.name} added to your cart`,
                            });
                          }}
                          className="absolute bottom-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-shadow"
                        >
                          <IconPlus size={16} className="text-black" />
                        </button>
                      </div>
                      {/* Item name */}
                      <p className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">{item.name}</p>
                      {/* Item price */}
                      <p className="text-sm font-semibold text-gray-900">${itemPrice}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Forms */}
          <div className="lg:col-span-2 space-y-6">
            {formData.deliveryMethod === 'delivery' && (
              <Section title="Delivery Address">
                <AddressSelector onAddressSelect={handleAddressSelect} initialAddress={formData} />
              </Section>
            )}

            {/* Payment method section - only show if payment methods exist */}
            {hasPaymentMethods && selectedPaymentMethod && (
              <Section title="Payment">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50">
                    <CreditCard className="h-5 w-5 text-gray-600" />
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">
                        {selectedPaymentMethod.type === 'card' 
                          ? `${selectedPaymentMethod.brand || 'Card'} •••• ${selectedPaymentMethod.last4}`
                          : `Bank Account •••• ${selectedPaymentMethod.last4}`
                        }
                      </div>
                      <div className="text-xs text-gray-500">
                        {selectedPaymentMethod.is_default ? 'Default payment method' : 'Payment method'}
                      </div>
                    </div>
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      className="text-sm text-orange-500 hover:text-orange-600 font-medium"
                    >
                      Change
                    </button>
                  </div>
                  <div className="text-xs text-gray-500">
                    You won't be charged until the order is accepted.
                  </div>
                </div>
              </Section>
            )}
            
            {/* Show payment method selector button if no payment methods exist */}
            {!hasPaymentMethods && (
              <Section title="Payment">
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-500 transition-colors text-gray-600 hover:text-orange-500"
                >
                  <IconPlus size={20} />
                  <span className="font-medium">Add Payment Method</span>
                </button>
              </Section>
            )}
          </div>

          {/* Right: Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                <h2 className="text-lg font-semibold">Order Summary</h2>
                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">Your cart is empty</p>
                    <button
                      onClick={() => navigate('/restaurants')}
                      className="text-orange-500 hover:text-orange-600 font-medium"
                    >
                      Continue Shopping
                    </button>
                  </div>
                ) : (
                  <>
                    <PromoCodeInput subtotal={subtotal} onPromoApplied={handlePromoApplied} />
                    {/* Tip selector */}
                    <div>
                      <div className="text-sm font-medium mb-2">Tip your Feeder</div>
                      <div className="flex gap-2 flex-wrap">
                        {["$0","10%","15%","20%","Custom"].map((t, i) => (
                          <button 
                            key={i} 
                            onClick={() => {
                              if (t === "Custom") {
                                const customAmount = prompt("Enter custom tip amount:");
                                if (customAmount) {
                                  setFormData({...formData, tip: Math.round(parseFloat(customAmount) * 100), tipType: 'fixed'});
                                }
                              } else if (t === "$0") {
                                setFormData({...formData, tipPercent: 0, tipType: 'percentage'});
                              } else {
                                const percent = parseInt(t);
                                setFormData({...formData, tipPercent: percent, tipType: 'percentage'});
                              }
                            }}
                            className={`px-3 py-2 rounded-full border text-sm hover:bg-gray-50 ${
                              (formData.tipPercent === 0 && t === "$0") ||
                              (formData.tipPercent === 10 && t === "10%") ||
                              (formData.tipPercent === 15 && t === "15%") ||
                              (formData.tipPercent === 20 && t === "20%")
                                ? 'bg-orange-500 text-white border-orange-500' : ''
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Payment Method Section - Always Visible */}
                    <div className="border-t pt-4">
                      <h3 className="text-sm font-semibold mb-3">Payment Method</h3>
                      <SplitPayment
                        totalAmount={total}
                        onPaymentMethodsChange={setSplitPaymentMethods}
                        selectedMethod={selectedPaymentMethod}
                      />
                    </div>

                    <div className="border-t pt-3 space-y-2 text-sm">
                  <div className="flex justify-between"><span>Subtotal</span><span>${(subtotal / 100).toFixed(2)}</span></div>
                  {promoDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Promo discount</span>
                      <span>-${(promoDiscount / 100).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="space-y-2">
                    {formData.deliveryMethod === 'delivery' && (
                      <div className="flex justify-between">
                        <span>Delivery fee</span>
                        <span className={cravemoreEligible ? 'text-green-600 font-semibold' : ''}>
                          {cravemoreEligible ? '$0.00' : `$${(deliveryFee / 100).toFixed(2)}`}
                        </span>
                      </div>
                    )}
                    {cravemoreEligible && (
                      <p className="text-xs text-green-600">✓ CraveMore benefit applied</p>
                    )}
                    {!hasCravemore && formData.deliveryMethod === 'delivery' && (
                      <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                        <span>CraveMore could waive this fee. </span>
                        <button 
                          className="underline font-semibold" 
                          onClick={() => navigate('/cravemore')}
                        >
                          Join now
                        </button>
                      </div>
                    )}
                    {hasCravemore && !cravemoreEligible && cravemoreAmountNeeded && (
                      <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                        Add ${(cravemoreAmountNeeded / 100).toFixed(2)} more to unlock $0 delivery fee
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between"><span>Tax</span><span>${(tax / 100).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Tip</span><span>${(tipAmount / 100).toFixed(2)}</span></div>
                  {processingFeeCents > 0 && (
                    <div className="flex justify-between">
                      <span>Processing fee (Stripe)</span>
                      <span>${(processingFeeCents / 100).toFixed(2)}</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center font-semibold text-base border-t pt-3">
                  <span>Total</span>
                  <span>${(total / 100).toFixed(2)}</span>
                </div>
                <div className="text-[11px] text-gray-500">By placing your order, you agree to the Terms and acknowledge the Privacy Policy.</div>
                    <button 
                      onClick={handlePlaceOrder}
                      disabled={isProcessing || cart.length === 0}
                      className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white rounded-md py-3 text-sm font-semibold"
                    >
                      {isProcessing ? 'Processing...' : 'Place Order'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Payment Method Selection Modal - Enterprise Grade */}
      <PaymentMethodModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setShowPaymentSetup(false);
          setSelectedPaymentType(null);
        }}
        selectedPaymentMethod={selectedPaymentMethod}
        onSelect={(method) => {
          setSelectedPaymentMethod(method);
          setHasPaymentMethods(!!method);
        }}
        onAddNew={() => {
          // Handled internally by modal
        }}
        customerAddress={customerAddress}
        onError={(error) => {
          // Only show critical errors that prevent the modal from working
          // Setup/save errors are handled inline in the modal
          console.error('Payment method modal error:', error);
          // Don't show payment failed modal for setup errors
        }}
      />
      
      {/* Legacy Sheet - keeping for now but will be removed */}
      {false && <Sheet open={showPaymentModal} onOpenChange={(open) => {
        setShowPaymentModal(open);
        if (!open) {
          setShowPaymentSetup(false);
          setSelectedPaymentType(null);
        }
      }}>
        <SheetContent side="top" className="h-auto max-h-[90vh] overflow-y-auto rounded-b-2xl p-4">
          <div className="flex items-center justify-center mb-2">
            <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
          </div>
          <SheetHeader className="mb-3">
            <SheetTitle className="text-center text-lg font-semibold">Select Payment Method</SheetTitle>
            <SheetDescription className="sr-only">Choose your preferred payment method for this order</SheetDescription>
          </SheetHeader>
          
          {!showPaymentSetup ? (
            <div className="space-y-2 pb-2">
              {/* Saved Credit/Debit Card */}
              {hasPaymentMethods && selectedPaymentMethod && (
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    processOrder();
                  }}
                  className="w-full flex items-center gap-3 p-2.5 border border-gray-200 rounded-lg hover:border-orange-500 transition-colors bg-white"
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate">
                      {selectedPaymentMethod.type === 'card' 
                        ? `${selectedPaymentMethod.brand || 'Card'} •••• ${selectedPaymentMethod.last4}`
                        : `Bank Account •••• ${selectedPaymentMethod.last4}`
                      }
                    </div>
                    <div className="text-xs text-gray-500">Credit/Debit Card</div>
                  </div>
                </button>
              )}

              {/* Credit/Debit Card */}
              <button
                onClick={() => {
                  // Always show card entry form when clicking Credit/Debit Card
                  setSelectedPaymentType('card');
                  setShowPaymentSetup(true);
                }}
                className="w-full flex items-center gap-3 p-2.5 border border-gray-200 rounded-lg hover:border-orange-500 transition-colors bg-white"
              >
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-5 h-5 text-gray-600" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-sm text-gray-900">Credit/Debit Card</div>
                </div>
              </button>

              {/* Google Pay */}
              <button
                onClick={() => {
                  setSelectedPaymentType('googlepay');
                  setShowPaymentSetup(true);
                }}
                className="w-full flex items-center gap-3 p-2.5 border border-gray-200 rounded-lg hover:border-orange-500 transition-colors bg-white"
              >
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-gray-200 flex-shrink-0">
                  <div className="text-[10px] font-semibold text-gray-700">G Pay</div>
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-sm text-gray-900">Google Pay</div>
                </div>
              </button>

              {/* Cash App Pay */}
              <button
                onClick={() => {
                  setSelectedPaymentType('cashapp');
                  setShowPaymentSetup(true);
                }}
                className="w-full flex items-center gap-3 p-2.5 border border-gray-200 rounded-lg hover:border-orange-500 transition-colors bg-white"
              >
                <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0">
                  <div className="text-white font-bold text-sm">$</div>
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-sm text-gray-900">Cash App Pay</div>
                </div>
              </button>

              {/* Klarna */}
              <button
                onClick={() => {
                  setSelectedPaymentType('klarna');
                  setShowPaymentSetup(true);
                }}
                className="w-full flex items-center gap-3 p-2.5 border border-gray-200 rounded-lg hover:border-orange-500 transition-colors bg-white"
              >
                <div className="w-10 h-10 rounded-lg bg-pink-500 flex items-center justify-center flex-shrink-0">
                  <div className="text-white font-bold text-sm">K</div>
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-sm text-gray-900">Klarna</div>
                </div>
              </button>

              {/* PayPal */}
              <button
                onClick={() => {
                  setSelectedPaymentType('paypal');
                  setShowPaymentSetup(true);
                }}
                className="w-full flex items-center gap-3 p-2.5 border border-gray-200 rounded-lg hover:border-orange-500 transition-colors bg-white"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <div className="text-white font-bold text-sm">P</div>
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-sm text-gray-900">PayPal</div>
                </div>
              </button>

              {/* Venmo */}
              <button
                onClick={() => {
                  setSelectedPaymentType('venmo');
                  setShowPaymentSetup(true);
                }}
                className="w-full flex items-center gap-3 p-2.5 border border-gray-200 rounded-lg hover:border-orange-500 transition-colors bg-white"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-400 flex items-center justify-center flex-shrink-0">
                  <div className="text-white font-bold text-sm">V</div>
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-sm text-gray-900">Venmo</div>
                </div>
              </button>
            </div>
          ) : (
            <div className="space-y-4 pb-2">
              <button
                onClick={() => {
                  setShowPaymentSetup(false);
                  setSelectedPaymentType(null);
                }}
                className="flex items-center gap-2 text-sm text-gray-600 mb-2"
              >
                <span>←</span> Back
              </button>
              
              {selectedPaymentType === 'card' && (
                stripePromise ? (
                  <Elements stripe={stripePromise}>
                    <CardForm
                    onSubmit={async (paymentMethodId: string) => {
                      setIsAddingCard(true);
                      try {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (!user) {
                          showValidationError('Sign In Required', 'Please sign in to add a payment method.');
                          return;
                        }

                        if (!customerAddress) {
                          showValidationError('Address Required', 'Please add a delivery address in your account settings first.');
                          return;
                        }

                        // Attach payment method to customer via edge function
                        const { data: stripeData, error: stripeError } = await supabase.functions.invoke('create-stripe-payment-method', {
                          body: {
                            paymentMethodId: paymentMethodId,
                              billingAddress: {
                                addressLine1: customerAddress.street_address || formData.address || '',
                                city: customerAddress.city || formData.city || '',
                                state: customerAddress.state || formData.state || '',
                              postalCode: customerAddress.zip_code || '',
                                country: 'US'
                            }
                          }
                        });

                        // Check for error - extract actual error message
                        if (stripeError || (stripeData && (stripeData as any).error)) {
                          console.error('Stripe error details:', stripeError);
                          console.error('Stripe data (may contain error):', stripeData);
                          
                          let errorMessage = 'Failed to create payment method';
                          let extractedError: Error | null = null;
                          
                          // Try to get error from response body - this is the most reliable source
                          const errorContext = (stripeError as any)?.context;
                          if (errorContext) {
                            // Try response.text() if it's a Response object (most reliable)
                            if (errorContext instanceof Response || errorContext.text) {
                              try {
                                const text = await errorContext.clone().text();
                                const parsed = JSON.parse(text);
                                if (parsed.error) {
                                  errorMessage = parsed.error;
                                  extractedError = new Error(errorMessage);
                                  console.error('✅ Extracted error from response:', errorMessage);
                                }
                              } catch (e) {
                                // Ignore parsing errors
                              }
                            }
                            
                            // Try to read the response body if we didn't get it from text()
                            if (!extractedError && errorContext.body) {
                              try {
                                const bodyText = typeof errorContext.body === 'string' 
                                  ? errorContext.body 
                                  : JSON.stringify(errorContext.body);
                                const parsed = JSON.parse(bodyText);
                                if (parsed.error) {
                                  errorMessage = parsed.error;
                                  extractedError = new Error(errorMessage);
                                  console.error('✅ Extracted error from body:', errorMessage);
                                }
                              } catch (e) {
                                // Ignore parsing errors
                              }
                            }
                          }
                          
                          // If we extracted an error, use it immediately
                          if (extractedError) {
                            throw extractedError;
                          }
                          
                          // Fallback to error data
                          if (stripeData && typeof stripeData === 'object' && (stripeData as any).error) {
                            errorMessage = (stripeData as any).error || (stripeData as any).message || errorMessage;
                          } else if ((stripeError as any)?.data) {
                            const errorData = (stripeError as any).data;
                            if (typeof errorData === 'object') {
                              errorMessage = errorData.error || errorData.message || errorData.details || errorMessage;
                            } else if (typeof errorData === 'string') {
                              try {
                                const parsed = JSON.parse(errorData);
                                errorMessage = parsed.error || parsed.message || parsed.details || errorData;
                              } catch {
                                errorMessage = errorData || errorMessage;
                              }
                            }
                          } else if (stripeError?.message) {
                            errorMessage = stripeError.message;
                          }
                          
                          console.error('Final extracted error message:', errorMessage);
                          throw new Error(errorMessage);
                        }

                        if (!stripeData?.paymentMethodID) {
                          throw new Error('Payment method was not created. Please try again.');
                        }

                        // Save to payment_methods table
                        // Note: token is required by schema but we use stripe_payment_method_id for Stripe
                        // Run migration 20260116000002_make_payment_methods_token_nullable.sql to make token nullable
                        const { data: savedMethod, error: saveError } = await supabase
                          .from('payment_methods')
                          .insert({
                            user_id: user.id,
                            type: 'card',
                            provider: 'stripe',
                            token: stripeData.paymentMethodID, // Use payment method ID as token for now (legacy field)
                            stripe_payment_method_id: stripeData.paymentMethodID,
                            last4: stripeData.last4 || '****',
                            brand: stripeData.brand || 'card',
                            is_default: !hasPaymentMethods
                          } as any)
                          .select()
                          .single();

                        if (saveError) {
                          throw saveError;
                        }

                        // Set as selected payment method
                        setSelectedPaymentMethod({
                          id: savedMethod.id,
                          type: 'card',
                          stripe_payment_method_id: stripeData.paymentMethodID,
                          brand: stripeData.brand || 'card',
                          last4: stripeData.last4 || '****',
                          is_default: savedMethod.is_default
                        });

                        setHasPaymentMethods(true);
                        setShowPaymentModal(false);
                        setShowPaymentSetup(false);
                        setSelectedPaymentType(null);

                        // Card added successfully — clear any previous errors
                        clearCheckoutError();
                        
                        // Automatically proceed - payment method is now selected and delivery details are visible
                      } catch (error: any) {
                        console.error('Error adding card:', error);
                        showCheckoutError(error);
                        throw error; // Re-throw to prevent form submission
                      } finally {
                        setIsAddingCard(false);
                      }
                    }}
                    onCancel={() => {
                      setShowPaymentSetup(false);
                      setSelectedPaymentType(null);
                    }}
                    isSubmitting={isAddingCard}
                    customerAddress={customerAddress}
                  />
                  </Elements>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-yellow-800">
                        Stripe is not configured. Please set VITE_STRIPE_PUBLISHABLE_KEY in your environment variables.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowPaymentSetup(false);
                        setSelectedPaymentType(null);
                      }}
                      className="w-full border border-gray-300 text-gray-700 rounded-lg py-3.5 text-base font-semibold hover:bg-gray-50"
                    >
                      Back
                  </button>
                </div>
                )
              )}

              {(selectedPaymentType === 'googlepay' || selectedPaymentType === 'cashapp' || selectedPaymentType === 'klarna' || selectedPaymentType === 'paypal' || selectedPaymentType === 'venmo') && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    {selectedPaymentType === 'googlepay' && 'Connect your Google Pay account to use for payments.'}
                    {selectedPaymentType === 'cashapp' && 'Enter your Cash App details to use for payments.'}
                    {selectedPaymentType === 'klarna' && 'Connect your Klarna account for buy now, pay later options.'}
                    {selectedPaymentType === 'paypal' && 'Connect your PayPal account to use for payments.'}
                    {selectedPaymentType === 'venmo' && 'Enter your Venmo username to use for payments.'}
                  </p>
                  <div className="space-y-2">
                    {selectedPaymentType === 'cashapp' && (
                      <input
                        type="text"
                        placeholder="$username"
                        value={paymentSetupValue}
                        onChange={(e) => setPaymentSetupValue(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    )}
                    {selectedPaymentType === 'paypal' && (
                      <input
                        type="email"
                        placeholder="PayPal email"
                        value={paymentSetupValue}
                        onChange={(e) => setPaymentSetupValue(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    )}
                    {selectedPaymentType === 'venmo' && (
                      <input
                        type="text"
                        placeholder="@username"
                        value={paymentSetupValue}
                        onChange={(e) => setPaymentSetupValue(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    )}
                    {(selectedPaymentType === 'googlepay' || selectedPaymentType === 'klarna') && (
                      <button
                        onClick={() => {
                          // Integrate with Google Pay/Klarna SDK
                          toast({ title: "Integration", description: `${selectedPaymentType === 'googlepay' ? 'Google Pay' : 'Klarna'} integration will be handled by their SDK.`, variant: "default" });
                        }}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-left"
                      >
                        Connect {selectedPaymentType === 'googlepay' ? 'Google Pay' : 'Klarna'}
                      </button>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      // Validate input for methods that require it
                      if ((selectedPaymentType === 'cashapp' || selectedPaymentType === 'paypal' || selectedPaymentType === 'venmo') && !paymentSetupValue.trim()) {
                        showValidationError('Details Required', 'Please enter your payment details to continue.');
                        return;
                      }

                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) {
                        showValidationError('Sign In Required', 'Please sign in to continue.');
                        return;
                      }

                      // Set the selected payment method
                      setSelectedPaymentMethod({
                        type: selectedPaymentType,
                        provider: selectedPaymentType,
                        id: `temp-${selectedPaymentType}-${Date.now()}`,
                        account_identifier: paymentSetupValue || undefined
                      });
                      
                      setShowPaymentModal(false);
                      setShowPaymentSetup(false);
                      setSelectedPaymentType(null);
                      setPaymentSetupValue('');
                      await processOrder();
                    }}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-2.5 text-sm font-semibold"
                  >
                    Continue with {selectedPaymentType === 'googlepay' ? 'Google Pay' : selectedPaymentType === 'cashapp' ? 'Cash App' : selectedPaymentType === 'klarna' ? 'Klarna' : selectedPaymentType === 'paypal' ? 'PayPal' : 'Venmo'}
                  </button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>}

      {/* Deals Modal */}
      <Sheet open={showDealsModal} onOpenChange={setShowDealsModal}>
        <SheetContent side="bottom" className="h-auto max-h-[60vh] rounded-t-2xl px-4 pt-3 pb-4 overflow-hidden">
          <div className="flex items-center justify-center mb-1.5">
            <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
          </div>
          <SheetHeader className="mb-2">
            <SheetTitle className="text-center text-base font-semibold">Deals & Perks</SheetTitle>
            <SheetDescription className="text-center text-xs text-gray-500">
              Apply rewards to this order
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-2 overflow-y-auto max-h-[40vh] pb-2">
            {availableDeals.length === 0 ? (
              <div className="text-center py-6">
                <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <p className="text-gray-500 text-sm font-medium">No deals available</p>
                <p className="text-gray-400 text-xs mt-0.5">Earn perks by ordering, referring friends, and more</p>
              </div>
            ) : (
              availableDeals.map((deal) => (
                <div
                  key={deal.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-all ${
                    appliedDeal?.id === deal.id
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-orange-300'
                  }`}
                  onClick={() => {
                    if (appliedDeal?.id === deal.id) {
                      setAppliedDeal(null);
                      setPromoDiscount(0);
                      setAppliedPromo(null);
                    } else {
                      setAppliedDeal(deal);
                      setPromoDiscount(deal.discount_amount_cents || 0);
                      setAppliedPromo(deal);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm text-gray-900 truncate">{deal.title}</h3>
                        {appliedDeal?.id === deal.id && (
                          <span className="text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded-full whitespace-nowrap">Applied</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{deal.description}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                      <span className="text-sm font-bold text-orange-500">
                        -${((deal.discount_amount_cents || 0) / 100).toFixed(2)}
                      </span>
                      {appliedDeal?.id === deal.id ? (
                        <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-3 pt-3 border-t">
            <button
              onClick={() => setShowDealsModal(false)}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
            >
              {appliedDeal ? 'Apply & Close' : 'Close'}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Address Selection Modal */}
      <Sheet open={showAddressModal} onOpenChange={setShowAddressModal}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-4">
          <div className="flex items-center justify-center mb-2">
            <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
          </div>
          <SheetHeader className="mb-4">
            <SheetTitle className="text-center text-lg font-semibold">Select Delivery Address</SheetTitle>
            <SheetDescription className="text-center text-sm text-gray-500">
              Choose a saved address or add a new one
            </SheetDescription>
          </SheetHeader>

          {!showAddAddressForm ? (
            <div className="space-y-3 overflow-y-auto max-h-[65vh] pb-4">
              {savedAddresses.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <p className="text-gray-500 text-sm mb-2">No saved addresses</p>
                  <p className="text-gray-400 text-xs">Add an address to get started</p>
                </div>
              ) : (
                savedAddresses.map((addr) => (
                  <div
                    key={addr.id}
                    onClick={() => {
                      handleAddressSelect({
                        name: '',
                        address: addr.street_address,
                        apt_suite: addr.apt_suite || '',
                        city: addr.city,
                        state: addr.state,
                        zip: addr.zip_code,
                      });
                      setCustomerAddress(addr);
                      setShowAddressModal(false);
                    }}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      customerAddress?.id === addr.id
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <svg className="w-5 h-5 text-gray-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-sm text-gray-900">{addr.label || 'Home'}</p>
                            {addr.is_default && (
                              <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">Default</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-900 font-medium">
                            {addr.street_address}
                            {addr.apt_suite && `, ${addr.apt_suite}`}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {addr.city}, {addr.state} {addr.zip_code}
                          </p>
                        </div>
                      </div>
                      {customerAddress?.id === addr.id && (
                        <div className="ml-4">
                          <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

              {/* Add New Address Button */}
              <button
                onClick={() => setShowAddAddressForm(true)}
                className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-500 transition-colors text-center"
              >
                <div className="flex flex-col items-center gap-2">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">Add New Address</span>
                </div>
              </button>
            </div>
          ) : (
            <AddAddressForm
              onSave={async (newAddress) => {
                try {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) {
                    showValidationError('Sign In Required', 'Please sign in to save your address.');
                    return;
                  }

                  // If setting as default, unset other defaults first
                  if (newAddress.is_default) {
                    await supabase
                      .from('delivery_addresses')
                      .update({ is_default: false })
                      .eq('user_id', user.id);
                  }

                  // Save new address
                  const { data: savedAddress, error } = await supabase
                    .from('delivery_addresses')
                    .insert({
                      user_id: user.id,
                      label: newAddress.label || 'Home',
                      street_address: newAddress.street_address,
                      apt_suite: newAddress.apt_suite || null,
                      city: newAddress.city,
                      state: newAddress.state,
                      zip_code: newAddress.zip_code,
                      is_default: newAddress.is_default || false
                    })
                    .select()
                    .single();

                  if (error) throw error;

                  // Reload addresses and select the new one
                  const { data: updatedAddresses } = await supabase
                    .from('delivery_addresses')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('is_default', { ascending: false });
                  
                  if (updatedAddresses) {
                    setSavedAddresses(updatedAddresses);
                  }

                  handleAddressSelect({
                    name: '',
                    address: savedAddress.street_address,
                    apt_suite: savedAddress.apt_suite || '',
                    city: savedAddress.city,
                    state: savedAddress.state,
                    zip: savedAddress.zip_code,
                  });
                  setCustomerAddress(savedAddress);
                  setShowAddAddressForm(false);
                  setShowAddressModal(false);
                  toast({ title: "Success", description: "Address added successfully" });
                } catch (error: any) {
                  console.error('Error saving address:', error);
                  showValidationError('Address Error', error.message || 'Failed to save address. Please try again.');
                }
              }}
              onCancel={() => setShowAddAddressForm(false)}
            />
          )}

          {!showAddAddressForm && (
            <div className="mt-4 pt-4 border-t">
              <button
                onClick={() => setShowAddressModal(false)}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg py-3 text-sm font-semibold"
              >
                Done
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delivery Instructions Modal */}
      <Sheet open={showInstructionsModal} onOpenChange={setShowInstructionsModal}>
        <SheetContent side="bottom" className="h-auto max-h-[70vh] rounded-t-2xl p-4">
          <div className="flex items-center justify-center mb-2">
            <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
          </div>
          <SheetHeader className="mb-4">
            <SheetTitle className="text-center text-lg font-semibold">Delivery Instructions</SheetTitle>
            <SheetDescription className="text-center text-sm text-gray-500">
              Add a message for your Feeder to read when they arrive
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 pb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message for Feeder
              </label>
              <textarea
                value={formData.instructions || ''}
                onChange={(e) => setFormData({...formData, instructions: e.target.value})}
                placeholder="e.g., Please ring the doorbell twice, Leave at the back door, Call when you arrive..."
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm min-h-[120px] resize-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                maxLength={500}
              />
              <div className="text-xs text-gray-500 mt-1 text-right">
                {(formData.instructions || '').length}/500
              </div>
            </div>

            <div className="pt-4 border-t">
              <button
                onClick={() => setShowInstructionsModal(false)}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg py-3 text-sm font-semibold"
              >
                Save Instructions
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Phone Number Selection Modal */}
      <Sheet open={showPhoneModal} onOpenChange={setShowPhoneModal}>
        <SheetContent side="bottom" className="h-auto max-h-[70vh] rounded-t-2xl p-4">
          <div className="flex items-center justify-center mb-2">
            <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
          </div>
          <SheetHeader className="mb-4">
            <SheetTitle className="text-center text-lg font-semibold">Contact Number</SheetTitle>
            <SheetDescription className="text-center text-sm text-gray-500">
              Select a saved number or add a new one
            </SheetDescription>
          </SheetHeader>

          {!showAddPhoneForm ? (
            <div className="space-y-3 overflow-y-auto max-h-[50vh] pb-4">
              {savedPhoneNumbers.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <p className="text-gray-500 text-sm mb-2">No saved phone numbers</p>
                  <p className="text-gray-400 text-xs">Add a phone number to get started</p>
                </div>
              ) : (
                savedPhoneNumbers.map((phone, index) => (
                  <div
                    key={index}
                    onClick={() => {
                      setFormData({...formData, phone: phone.replace(/\D/g, '')});
                      setShowPhoneModal(false);
                    }}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      formData.phone === phone.replace(/\D/g, '')
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <div className="flex-1">
                          <p className="font-semibold text-sm text-gray-900">
                            {formatPhoneNumber(phone)}
                          </p>
                        </div>
                      </div>
                      {formData.phone === phone.replace(/\D/g, '') && (
                        <div className="ml-4">
                          <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

              {/* Add New Phone Number Button */}
              <button
                onClick={() => setShowAddPhoneForm(true)}
                className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-500 transition-colors text-center"
              >
                <div className="flex flex-col items-center gap-2">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">Add New Number</span>
                </div>
              </button>
            </div>
          ) : (
            <AddPhoneForm
              onSave={async (phoneNumber) => {
                try {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) {
                    showValidationError('Sign In Required', 'Please sign in to save your phone number.');
                    return;
                  }

                  // Update user profile with new phone number
                  const { error } = await supabase
                    .from('user_profiles')
                    .update({ phone: phoneNumber })
                    .eq('user_id', user.id);

                  if (error) throw error;

                  // Update form data
                  setFormData({...formData, phone: phoneNumber.replace(/\D/g, '')});
                  
                  // Reload saved phone numbers
                  const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('phone')
                    .eq('user_id', user.id)
                    .single();

                  if (profile?.phone) {
                    setSavedPhoneNumbers([profile.phone]);
                  }
                  
                  setShowAddPhoneForm(false);
                  setShowPhoneModal(false);
                  toast({ title: "Success", description: "Phone number saved" });
                } catch (error: any) {
                  console.error('Error saving phone number:', error);
                  showValidationError('Phone Error', error.message || 'Failed to save phone number. Please try again.');
                }
              }}
              onCancel={() => setShowAddPhoneForm(false)}
            />
          )}

          {!showAddPhoneForm && (
            <div className="mt-4 pt-4 border-t">
              <button
                onClick={() => setShowPhoneModal(false)}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg py-3 text-sm font-semibold"
              >
                Done
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Gift It Modal */}
      <Sheet open={showGiftModal} onOpenChange={setShowGiftModal}>
        <SheetContent side="bottom" className="h-auto max-h-[75vh] rounded-t-2xl px-4 pt-3 pb-4 overflow-hidden">
          <div className="flex items-center justify-center mb-1.5">
            <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
          </div>
          <SheetHeader className="mb-2">
            <SheetTitle className="text-center text-base font-semibold">Send as a Gift</SheetTitle>
            <SheetDescription className="text-center text-xs text-gray-500">
              Recipient details for gift delivery
            </SheetDescription>
          </SheetHeader>

          <GiftForm
            giftInfo={giftInfo}
            onSave={(info) => {
              setGiftInfo(info);
              setShowGiftModal(false);
              toast({ title: "Success", description: "Gift details saved" });
            }}
            onCancel={() => {
              if (!giftInfo.isGift) {
                setShowGiftModal(false);
              } else {
                // Allow canceling gift option
                setGiftInfo({
                  isGift: false,
                  recipientName: '',
                  recipientPhone: '',
                  recipientAddress: '',
                  recipientCity: '',
                  recipientState: '',
                  recipientZip: '',
                  giftMessage: ''
                });
                setShowGiftModal(false);
              }
            }}
          />
        </SheetContent>
      </Sheet>

      {/* Schedule Delivery Modal */}
      <Sheet open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-2xl p-4">
          <div className="flex items-center justify-center mb-2">
            <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
          </div>
          <SheetHeader className="mb-4">
            <SheetTitle className="text-center text-lg font-semibold">Schedule Delivery</SheetTitle>
            <SheetDescription className="text-center text-sm text-gray-500">
              Choose a date and time for your delivery (up to 4 days ahead)
            </SheetDescription>
          </SheetHeader>

          <ScheduleDeliveryForm
            selectedDate={selectedScheduleDate}
            selectedTime={selectedScheduleTime}
            onDateChange={setSelectedScheduleDate}
            onTimeChange={setSelectedScheduleTime}
            onSave={(date, time) => {
              setSelectedScheduleDate(date);
              setSelectedScheduleTime(time);
              setFormData({
                ...formData,
                schedule: `${date} ${time}`,
                deliverySpeed: 'scheduled'
              });
              setShowScheduleModal(false);
              toast({ title: "Success", description: "Delivery scheduled" });
            }}
            onCancel={() => {
              if (!selectedScheduleDate || !selectedScheduleTime) {
                // If no schedule was set, revert to standard
                setFormData({...formData, deliverySpeed: 'standard'});
              }
              setShowScheduleModal(false);
            }}
          />
        </SheetContent>
      </Sheet>

      {/* Payment Failed Modal — DoorDash-style centered error dialog */}
      <PaymentFailedModal
        isOpen={paymentFailedModal.isOpen}
        error={paymentFailedModal.error}
        cardLast4={paymentFailedModal.cardLast4}
        onClose={() => setPaymentFailedModal({ isOpen: false, error: null })}
        onRetry={() => {
          setPaymentFailedModal({ isOpen: false, error: null });
          processOrder();
        }}
        onChangePayment={() => {
          setPaymentFailedModal({ isOpen: false, error: null });
          setShowPaymentModal(true);
        }}
      />

      {/* Stack Order Modal - After Payment Success */}
      <StackOrderModal
        isOpen={showStackOrderModal}
        onClose={() => {
          setShowStackOrderModal(false);
          // Redirect to order tracking when modal closes
          if (completedOrderId) {
            navigate(`/order-tracking/${completedOrderId}`);
          }
        }}
        orderId={completedOrderId}
        orderItems={completedOrderItems}
        orderCategory={restaurant?.cuisine_type}
      />
    </div>
  );
};

// Schedule Delivery Form Component
const ScheduleDeliveryForm: React.FC<{
  selectedDate: string;
  selectedTime: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onSave: (date: string, time: string) => void;
  onCancel: () => void;
}> = ({ selectedDate, selectedTime, onDateChange, onTimeChange, onSave, onCancel }) => {
  const [localDate, setLocalDate] = useState(selectedDate || '');
  const [localTime, setLocalTime] = useState(selectedTime || '');

  // Generate available dates (today + 4 days)
  const getAvailableDates = (): string[] => {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 0; i <= 4; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  // Generate time slots (20-minute intervals, 10 slots starting 1 hour ahead)
  const getTimeSlots = (selectedDate: string): string[] => {
    const slots: string[] = [];
    const now = new Date();
    const selected = selectedDate ? new Date(selectedDate) : now;
    const isToday = selectedDate === now.toISOString().split('T')[0];

    // Start time: 1 hour from now if today, otherwise start of day
    let startTime: Date;
    if (isToday) {
      startTime = new Date(now);
      startTime.setHours(now.getHours() + 1);
      // Round up to next 20-minute interval
      const minutes = startTime.getMinutes();
      const remainder = minutes % 20;
      if (remainder !== 0) {
        startTime.setMinutes(minutes + (20 - remainder));
      }
      startTime.setSeconds(0);
      startTime.setMilliseconds(0);
    } else {
      startTime = new Date(selected);
      startTime.setHours(10, 0, 0, 0); // Start at 10 AM for future dates
    }

    // Generate 10 slots with 20-minute intervals
    for (let i = 0; i < 10; i++) {
      const slotTime = new Date(startTime);
      slotTime.setMinutes(startTime.getMinutes() + (i * 20));
      
      // Format as HH:MM AM/PM
      const hours = slotTime.getHours();
      const minutes = slotTime.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      const displayMinutes = minutes.toString().padStart(2, '0');
      slots.push(`${displayHours}:${displayMinutes} ${ampm}`);
    }

    return slots;
  };

  const availableDates = getAvailableDates();
  const timeSlots = localDate ? getTimeSlots(localDate) : [];

  const handleSave = () => {
    if (localDate && localTime) {
      onSave(localDate, localTime);
    }
  };

  const formatDateDisplay = (dateStr: string): string => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    if (dateOnly.getTime() === today.getTime()) {
      return 'Today';
    } else if (dateOnly.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="space-y-6 overflow-y-auto max-h-[60vh] pb-4">
      {/* Date Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Select Date</label>
        <div className="grid grid-cols-5 gap-2">
          {availableDates.map((date) => (
            <button
              key={date}
              type="button"
              onClick={() => {
                setLocalDate(date);
                setLocalTime(''); // Reset time when date changes
                onTimeChange('');
              }}
              className={`p-3 border rounded-lg text-sm font-medium transition-colors ${
                localDate === date
                  ? 'border-orange-500 bg-orange-50 text-orange-700'
                  : 'border-gray-200 hover:border-orange-300 text-gray-700'
              }`}
            >
              <div className="text-xs text-gray-500 mb-1">
                {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
              <div className="text-xs font-semibold">
                {formatDateDisplay(date)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Time Selection */}
      {localDate && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Select Time</label>
          <div className="grid grid-cols-2 gap-2">
            {timeSlots.map((time) => (
              <button
                key={time}
                type="button"
                onClick={() => {
                  setLocalTime(time);
                  onTimeChange(time);
                }}
                className={`p-3 border rounded-lg text-sm font-medium transition-colors ${
                  localTime === time
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 hover:border-orange-300 text-gray-700'
                }`}
              >
                {time}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="pt-4 border-t">
        <button
          type="button"
          onClick={handleSave}
          disabled={!localDate || !localTime}
          className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-white rounded-lg py-3 text-sm font-semibold"
        >
          Confirm Schedule
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="w-full mt-2 text-gray-600 py-2 text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

// Gift Form Component
const GiftForm: React.FC<{
  giftInfo: any;
  onSave: (info: any) => void;
  onCancel: () => void;
}> = ({ giftInfo, onSave, onCancel }) => {
  const [formData, setFormData] = useState(giftInfo);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, isGift: true });
  };

  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none";
  const labelCls = "block text-xs font-medium text-gray-600 mb-0.5";

  return (
    <div className="overflow-y-auto max-h-[55vh] pb-2">
      <button
        onClick={onCancel}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <form onSubmit={handleSubmit} className="space-y-2.5">
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className={labelCls}>Name *</label>
            <input type="text" placeholder="John Doe" value={formData.recipientName}
              onChange={(e) => setFormData({...formData, recipientName: e.target.value})}
              required className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Phone *</label>
            <input type="tel" placeholder="(567) 225-1495" value={formData.recipientPhone}
              onChange={(e) => setFormData({...formData, recipientPhone: e.target.value})}
              required className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Delivery Address *</label>
          <input type="text" placeholder="123 Main St" value={formData.recipientAddress}
            onChange={(e) => setFormData({...formData, recipientAddress: e.target.value})}
            required className={inputCls} />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className={labelCls}>City *</label>
            <input type="text" placeholder="Toledo" value={formData.recipientCity}
              onChange={(e) => setFormData({...formData, recipientCity: e.target.value})}
              required className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>State *</label>
            <input type="text" placeholder="OH" value={formData.recipientState}
              onChange={(e) => setFormData({...formData, recipientState: e.target.value})}
              required className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>ZIP *</label>
            <input type="text" placeholder="43615" value={formData.recipientZip}
              onChange={(e) => setFormData({...formData, recipientZip: e.target.value})}
              required className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Gift Message <span className="text-gray-400 font-normal">(Optional)</span></label>
          <textarea
            placeholder="Happy Birthday! Enjoy your meal!"
            value={formData.giftMessage}
            onChange={(e) => setFormData({...formData, giftMessage: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm min-h-[56px] resize-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none"
            maxLength={200}
          />
          <div className="text-[10px] text-gray-400 text-right">{formData.giftMessage.length}/200</div>
        </div>

        <div className="pt-2.5 border-t">
          <button
            type="submit"
            disabled={!formData.recipientName || !formData.recipientPhone || !formData.recipientAddress || !formData.recipientCity || !formData.recipientState || !formData.recipientZip}
            className="w-full bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            Save Gift Details
          </button>
        </div>
      </form>
    </div>
  );
};

// Add Phone Form Component
const AddPhoneForm: React.FC<{
  onSave: (phone: string) => Promise<void>;
  onCancel: () => void;
}> = ({ onSave, onCancel }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');

  const formatPhoneInput = (value: string): string => {
    // Remove all non-digits
    const cleaned = value.replace(/\D/g, '');
    
    // Limit to 10 digits
    const limited = cleaned.slice(0, 10);
    
    // Format as (XXX) XXX-XXXX
    if (limited.length === 0) return '';
    if (limited.length <= 3) return `(${limited}`;
    if (limited.length <= 6) return `(${limited.slice(0, 3)}) ${limited.slice(3)}`;
    return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneInput(e.target.value);
    setPhoneNumber(formatted);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    if (cleaned.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    await onSave(cleaned);
  };

  return (
    <div className="space-y-4 overflow-y-auto max-h-[50vh] pb-4">
      <button
        onClick={onCancel}
        className="flex items-center gap-2 text-sm text-gray-600 mb-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <input
            type="tel"
            placeholder="(567) 225-1495"
            value={phoneNumber}
            onChange={handlePhoneChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            maxLength={14}
          />
          {error && (
            <p className="text-xs text-red-500 mt-1">{error}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">Enter your 10-digit phone number</p>
        </div>

        <div className="pt-4 border-t">
          <button
            type="submit"
            disabled={phoneNumber.replace(/\D/g, '').length !== 10}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-white rounded-lg py-3 text-sm font-semibold"
          >
            Save Phone Number
          </button>
        </div>
      </form>
    </div>
  );
};

export default Checkout;



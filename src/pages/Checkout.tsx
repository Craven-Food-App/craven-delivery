import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/contexts/CartContext';
import { AddressSelector } from '@/components/checkout/AddressSelector';
import { PaymentMethodSelector } from '@/components/checkout/PaymentMethodSelector';
import { PromoCodeInput } from '@/components/checkout/PromoCodeInput';
import { IconTrash, IconPlus } from '@tabler/icons-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { CreditCard } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

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
          className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg py-3.5 text-base font-semibold"
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
    leaveAtDoor: false,
    schedule: 'ASAP'
  });

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
      toast({
        title: "Cart is Empty",
        description: "Please add items to your cart before checking out.",
        variant: "destructive",
      });
      setTimeout(() => {
        navigate('/restaurants');
      }, 2000);
    }
  }, [contextCartItems, contextRestaurantId, navigate, toast]);

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

  // Load customer profile and address data (for order creation, not displayed)
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
  }, []);

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

  const [deliveryFee, setDeliveryFee] = useState(300); // Default $3.00
  const [cravemoreEligible, setCravemoreEligible] = useState(false);
  const [hasCravemore, setHasCravemore] = useState(false);
  const [cravemoreAmountNeeded, setCravemoreAmountNeeded] = useState<number | null>(null);
  const [processingFeePercentCard, setProcessingFeePercentCard] = useState<number | null>(null);
  const [processingFeePercentAch, setProcessingFeePercentAch] = useState<number | null>(null);

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

  const tax = useMemo(
    () => Math.round((subtotalAfterPromo + deliveryFee) * 0.08), // 8% tax
    [subtotalAfterPromo, deliveryFee]
  );
  const tipAmount = formData.tipType === 'percentage' 
    ? Math.round(subtotal * (formData.tipPercent / 100))
    : formData.tip;

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

    const base = subtotalAfterPromo + deliveryFee + tax + tipAmount;
    return Math.round(base * (percent / 100));
  }, [processingFeePercentCard, processingFeePercentAch, subtotalAfterPromo, deliveryFee, tax, tipAmount]);

  const total = subtotalAfterPromo + deliveryFee + tax + tipAmount + processingFeeCents;

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

  const handlePromoApplied = (discount: number, promo: any) => {
    setPromoDiscount(discount);
    setAppliedPromo(promo);
  };

  const handlePlaceOrder = async () => {
    if (!restaurant || cart.length === 0) {
      toast({ title: "Error", description: "No items in cart", variant: "destructive" });
      return;
    }

    // Validate required fields
    if (!formData.name || !formData.phone || !formData.email) {
      toast({ title: "Error", description: "Please complete your profile with name, phone, and email", variant: "destructive" });
      return;
    }

    // For delivery orders, validate address
    if (formData.deliveryMethod === 'delivery' && (!formData.address || !formData.city || !formData.state || !formData.zip)) {
      toast({ title: "Error", description: "Please add a delivery address in your account settings", variant: "destructive" });
      return;
    }

    // Show payment method selection modal
    setShowPaymentModal(true);
  };

  const processOrder = async () => {
    // Payment method is required for Stripe processing
    if (!selectedPaymentMethod) {
      toast({ title: "Error", description: "Please select a payment method", variant: "destructive" });
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
        // Create new order
        const { data: createdOrder, error: orderError } = await supabase
          .from('orders')
          .insert({
            customer_id: user?.id || null,
            restaurant_id: restaurant.id,
            subtotal_cents: subtotal,
            delivery_fee_cents: formData.deliveryMethod === 'delivery' ? deliveryFee : 0,
            tax_cents: tax,
            tip_cents: tipAmount,
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
              scheduled_time: 'ASAP'
            } : null,
            pickup_address: {
              name: restaurant.name,
              address: restaurant.address || 'Restaurant address',
              lat: restaurant.latitude,
              lng: restaurant.longitude
            },
            estimated_delivery_time: new Date(Date.now() + 45 * 60000).toISOString()
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

      // Create payment with Stripe
      if (!selectedPaymentMethod) {
        toast({ title: "Error", description: "Please select a payment method", variant: "destructive" });
        setIsProcessing(false);
        return;
      }

      const paymentBody: any = {
        orderTotal: total,
        orderId: newOrder.id,
        customerInfo: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone
        },
        paymentMethodId: selectedPaymentMethod.stripe_payment_method_id || selectedPaymentMethod.moov_payment_method_id, // Support both during migration
        paymentMethodType: selectedPaymentMethod.type,
        provider: 'stripe' // Explicitly set provider
      };

      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-payment', {
        body: paymentBody
      });

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
        // Payment successful or pending (ACH payments may be pending)
        toast({
          title: "Payment Processed",
          description: paymentData.status === 'succeeded' 
            ? "Your payment was successful! Order confirmed." 
            : "Your payment is being processed. Order confirmed.",
        });

        // Clear cart
        localStorage.removeItem('checkout_cart');
        localStorage.removeItem('checkout_restaurant');
        localStorage.removeItem('checkout_delivery_method');
        localStorage.removeItem('pending_order_id');

        // Redirect to payment success page
        setTimeout(() => {
          navigate(`/payment-success?order_id=${newOrder.id}&payment_id=${paymentData.payment_id}`);
        }, 1500);
      } else {
        throw new Error(`Payment failed with status: ${paymentData.status}`);
      }
      
    } catch (error: any) {
      console.error('Order error:', error);
      const errorMessage = error?.message || error?.error?.message || 'Failed to place order. Please try again.';
      toast({ 
        title: "Error", 
        description: errorMessage,
        variant: "destructive" 
      });
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Checkout</h1>

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
                  <div key={i} className="flex items-start gap-2.5 pb-3 border-b last:border-0">
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
                        {/* Trash icon */}
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

            {hasPaymentMethods && (
              <Section title="Payment">
                <PaymentMethodSelector 
                  onPaymentMethodSelect={setSelectedPaymentMethod}
                  onPaymentMethodsLoaded={setHasPaymentMethods}
                />
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
                      <div className="text-sm font-medium mb-2">Tip your driver</div>
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

      {/* Payment Method Selection Modal */}
      <Sheet open={showPaymentModal} onOpenChange={(open) => {
        setShowPaymentModal(open);
        if (!open) {
          setShowPaymentSetup(false);
          setSelectedPaymentType(null);
        }
      }}>
        <SheetContent side="top" className="h-auto max-h-[70vh] rounded-b-2xl p-4">
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
                          toast({ title: "Error", description: "Please sign in", variant: "destructive" });
                          return;
                        }

                        if (!customerAddress) {
                          toast({ title: "Error", description: "Please add a delivery address in your account settings first", variant: "destructive" });
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

                        // Check for error
                        if (stripeError || (stripeData && (stripeData as any).error)) {
                          console.error('Stripe error details:', stripeError);
                          console.error('Stripe data (may contain error):', stripeData);
                          
                          let errorMessage = 'Failed to create payment method';
                          if (stripeData && typeof stripeData === 'object' && (stripeData as any).error) {
                            errorMessage = (stripeData as any).error || (stripeData as any).message || errorMessage;
                          } else if ((stripeError as any)?.data) {
                            const errorData = (stripeError as any).data;
                            if (typeof errorData === 'object') {
                              errorMessage = errorData.error || errorData.message || errorMessage;
                            } else if (typeof errorData === 'string') {
                              try {
                                const parsed = JSON.parse(errorData);
                                errorMessage = parsed.error || parsed.message || errorData;
                              } catch {
                                errorMessage = errorData || errorMessage;
                              }
                            }
                          } else if (stripeError?.message) {
                            errorMessage = stripeError.message;
                          }
                          
                          throw new Error(errorMessage);
                        }

                        if (!stripeData?.paymentMethodID) {
                          throw new Error('Payment method was not created. Please try again.');
                        }

                        // Save to payment_methods table
                        const { data: savedMethod, error: saveError } = await supabase
                          .from('payment_methods')
                          .insert({
                            user_id: user.id,
                            type: 'card',
                            provider: 'stripe',
                            stripe_payment_method_id: stripeData.paymentMethodID,
                            last4: stripeData.last4 || '****',
                            brand: stripeData.brand || 'card',
                            is_default: !hasPaymentMethods
                          })
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

                        toast({
                          title: "Success",
                          description: "Card added successfully"
                        });
                      } catch (error: any) {
                        console.error('Error adding card:', error);
                        let errorMessage = "Failed to add card. Please try again.";
                        if (error?.message) {
                          errorMessage = error.message;
                        } else if (error?.error?.message) {
                          errorMessage = error.error.message;
                        } else if (typeof error === 'string') {
                          errorMessage = error;
                        }
                        
                        toast({
                          title: "Error",
                          description: errorMessage,
                          variant: "destructive"
                        });
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
                        toast({ title: "Error", description: "Please enter your payment details", variant: "destructive" });
                        return;
                      }

                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) {
                        toast({ title: "Error", description: "Please sign in", variant: "destructive" });
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
      </Sheet>
    </div>
  );
};

export default Checkout;



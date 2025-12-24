import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/contexts/CartContext';
import { AddressSelector } from '@/components/checkout/AddressSelector';
import { PaymentMethodSelector } from '@/components/checkout/PaymentMethodSelector';
import { PromoCodeInput } from '@/components/checkout/PromoCodeInput';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-5">
    <h2 className="text-lg font-semibold mb-3">{title}</h2>
    {children}
  </div>
);

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { cartItems: contextCartItems, restaurantId: contextRestaurantId } = useCart();
  const [cart, setCart] = useState<any[]>([]);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<any>(null);
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

  // Load customer profile and address data
  useEffect(() => {
    const loadCustomerData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Load user profile
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('full_name, phone')
          .eq('user_id', user.id)
          .single();

        // Load default delivery address
        const { data: address } = await supabase
          .from('delivery_addresses')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_default', true)
          .single();

        // Update form data with profile info
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
        }
      } catch (error) {
        console.error('Error loading customer data:', error);
        // Continue with empty form if profile doesn't exist
      }
    };

    loadCustomerData();
  }, []);

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
          const { data: membership } = await supabase
            .from('user_memberships')
            .select('status, renews_at')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .single();

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

            // Capture processing fee configuration (Moov)
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

  // Moov processing fee is applied to the full customer charge (including tip),
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

    // Payment method is required for Moov processing
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
              special_instructions: formData.instructions,
              apt_suite: formData.aptSuite,
              leave_at_door: formData.leaveAtDoor,
              scheduled_time: formData.schedule
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

      // Create payment with Moov
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
        paymentMethodId: selectedPaymentMethod.moov_payment_method_id,
        paymentMethodType: selectedPaymentMethod.type
      };

      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-payment', {
        body: paymentBody
      });

      if (paymentError) {
        console.error('Payment error:', paymentError);
        throw new Error(`Payment creation failed: ${paymentError.message || 'Unknown error'}`);
      }

      // Moov processes payments directly - no redirect URL needed
      if (!paymentData) {
        console.error('Payment response:', paymentData);
        throw new Error('Payment processing failed - no response received');
      }

      // Check payment status
      if (paymentData.status === 'succeeded' || paymentData.status === 'pending') {
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Forms */}
          <div className="lg:col-span-2 space-y-6">
            {formData.deliveryMethod === 'delivery' && (
              <Section title="Delivery Address">
                <AddressSelector onAddressSelect={handleAddressSelect} initialAddress={formData} />
              </Section>
            )}

            <Section title="Delivery Options">
              <div className="flex items-center gap-4">
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
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <textarea 
                  className="w-full border rounded-lg px-3 py-2 md:col-span-2" 
                  rows={3} 
                  placeholder="Delivery instructions (optional)"
                  value={formData.instructions}
                  onChange={(e) => setFormData({...formData, instructions: e.target.value})}
                />
                <div className="flex items-center gap-2">
                  <input 
                    id="leaveAtDoor" 
                    type="checkbox" 
                    className="accent-orange-500 cursor-pointer" 
                    checked={formData.leaveAtDoor}
                    onChange={(e) => setFormData({...formData, leaveAtDoor: e.target.checked})}
                  />
                  <label htmlFor="leaveAtDoor" className="text-sm cursor-pointer">Leave at door</label>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Schedule</label>
                  <select 
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm cursor-pointer"
                    value={formData.schedule}
                    onChange={(e) => setFormData({...formData, schedule: e.target.value})}
                  >
                    <option>ASAP</option>
                    <option>In 30 minutes</option>
                    <option>In 1 hour</option>
                    <option>Pick a time…</option>
                  </select>
                </div>
              </div>
            </Section>

            <Section title="Contact Info">
              <div className="text-sm text-gray-600 mb-3">
                This information is from your account profile. You can update it in your account settings.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input 
                  className="border rounded-lg px-3 py-2 bg-gray-50" 
                  placeholder="Full name" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  readOnly
                />
                <input 
                  className="border rounded-lg px-3 py-2 bg-gray-50" 
                  placeholder="Phone number" 
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  readOnly
                />
                <input 
                  className="sm:col-span-2 border rounded-lg px-3 py-2 bg-gray-50" 
                  placeholder="Email (receipt)" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  readOnly
                />
              </div>
            </Section>

            <Section title="Payment">
              <PaymentMethodSelector onPaymentMethodSelect={setSelectedPaymentMethod} />
            </Section>
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
                    <div className="space-y-2">
                      {cart.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span>{item.quantity}x {item.name}</span>
                          <span>${((item.price_cents * item.quantity) / 100).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
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
                      <span>Processing fee (Moov)</span>
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
    </div>
  );
};

export default Checkout;



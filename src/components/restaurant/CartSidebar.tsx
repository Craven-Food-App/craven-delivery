
// @ts-nocheck

import { useState } from "react";
import {
  Drawer,
  Button,
  Badge,
  Divider,
  Stack,
  Group,
  Text,
  Title,
  Box,
  ActionIcon,
  ScrollArea,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconMinus,
  IconPlus,
  IconTrash,
  IconTruck,
} from "@tabler/icons-react";
import { supabase } from "@/integrations/supabase/client";
import { CustomerOrderForm } from "./CustomerOrderForm";
import { PromoCodeInput } from "./PromoCodeInput";
import { usePromoCode } from "@/hooks/usePromoCode";

interface Modifier {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  modifier_type: string;
  is_required: boolean;
}

interface SelectedModifier extends Modifier {
  selected: boolean;
}

interface CartItem {
  id: string;
  name: string;
  price_cents: number;
  quantity: number;
  special_instructions?: string;
  modifiers?: SelectedModifier[];
}

interface Restaurant {
  name: string;
  delivery_fee_cents: number;
  min_delivery_time: number;
  max_delivery_time: number;
  latitude?: number;
  longitude?: number;
  address: string;
  city: string;
  state: string;
}

interface CartTotals {
  subtotal: number;
  deliveryFee: number;
  tax: number;
  total: number;
}

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  restaurant: Restaurant & { id: string };
  totals: CartTotals;
  deliveryMethod: 'delivery' | 'pickup';
  onDeliveryMethodChange: (method: 'delivery' | 'pickup') => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onOrderComplete: () => void;
}

export const CartSidebar = ({ 
  isOpen, 
  onClose, 
  cart, 
  restaurant, 
  totals, 
  deliveryMethod,
  onDeliveryMethodChange,
  onUpdateQuantity,
  onOrderComplete 
}: CartSidebarProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  
  const {
    appliedPromoCode,
    isValidating: isValidatingPromo,
    validatePromoCode,
    removePromoCode,
    recordPromoCodeUsage
  } = usePromoCode();

  const handleCheckout = () => {
    setShowOrderForm(true);
  };

  const handleApplyPromoCode = async (code: string): Promise<boolean> => {
    const subtotal = cart.reduce((sum, item) => {
      const modifierPrice = item.modifiers?.reduce((modSum, mod) => modSum + mod.price_cents, 0) || 0;
      return sum + ((item.price_cents + modifierPrice) * item.quantity);
    }, 0);
    
    return await validatePromoCode(code, subtotal, deliveryMethod);
  };

  const handleOrderSubmit = async (customerInfo: any) => {
    setIsProcessing(true);
    
    try {
      // Get current user if authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      // Calculate final totals with promo code (robust)
      const subtotal = cart.reduce((sum, item) => {
        const modifierPrice = item.modifiers?.reduce((modSum, mod) => modSum + mod.price_cents, 0) || 0;
        return sum + ((item.price_cents + modifierPrice) * item.quantity);
      }, 0);
      
      const promoDiscount = appliedPromoCode?.discount_applied_cents ?? 0;
      const promoType = appliedPromoCode?.type?.toLowerCase();
      const isTotalFree = promoType === 'total_free' || (subtotal - promoDiscount) <= 0;
      
      let adjustedDeliveryFee = totals.deliveryFee;
      
      // Handle different promo code types
      if (isTotalFree) {
        adjustedDeliveryFee = 0;
      } else if (promoType === 'free_delivery' && deliveryMethod === 'delivery') {
        adjustedDeliveryFee = 0;
      }
      
      const finalTotal = isTotalFree ? 0 : subtotal + adjustedDeliveryFee + totals.tax - promoDiscount;
      
      console.log('Order submission details:', {
        subtotal,
        adjustedDeliveryFee,
        tax: totals.tax,
        promoDiscount,
        promoType: appliedPromoCode?.type,
        finalTotal,
        appliedPromoCode
      });
      
      // Create order with correct schema
      const orderData = {
        customer_id: user?.id || null,
        restaurant_id: restaurant.id,
        subtotal_cents: subtotal,
        delivery_fee_cents: adjustedDeliveryFee,
        tax_cents: totals.tax,
        total_cents: finalTotal,
        order_status: 'pending',
        pickup_address: {
          name: restaurant.name,
          address: restaurant.address,
          phone: restaurant.phone || restaurant.email,
          lat: restaurant.latitude,
          lng: restaurant.longitude
        },
        dropoff_address: deliveryMethod === 'delivery' ? {
          name: customerInfo.name,
          phone: customerInfo.phone,
          address: customerInfo.deliveryAddress,
          lat: customerInfo.addressCoordinates?.lat || null,
          lng: customerInfo.addressCoordinates?.lng || null,
          special_instructions: customerInfo.specialInstructions
        } : null,
        delivery_address: deliveryMethod === 'delivery' ? {
          name: customerInfo.name,
          email: customerInfo.email,
          phone: customerInfo.phone,
          address: customerInfo.deliveryAddress,
          lat: customerInfo.addressCoordinates?.lat || null,
          lng: customerInfo.addressCoordinates?.lng || null,
          special_instructions: customerInfo.specialInstructions
        } : null,
        estimated_delivery_time: deliveryMethod === 'delivery' 
          ? new Date(Date.now() + restaurant.max_delivery_time * 60000).toISOString() 
          : new Date(Date.now() + 20 * 60000).toISOString() // 20 min for pickup
      };

      // Create order
      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      // Record promo code usage if applied
      if (appliedPromoCode) {
        await recordPromoCodeUsage(newOrder.id);
      }

      // Trigger auto-assignment for delivery orders to send to drivers
      if (deliveryMethod === 'delivery') {
        try {
          console.log('Triggering auto-assignment for menu order:', newOrder.id);
          await supabase.functions.invoke('auto-assign-orders', {
            body: { orderId: newOrder.id }
          });
          console.log('Auto-assignment triggered successfully for menu order');
        } catch (autoAssignError) {
          console.error('Auto-assignment error:', autoAssignError);
          // Don't fail the order if auto-assignment fails
        }
      }

      console.log('Checking if order is free:', finalTotal, finalTotal <= 0);
      
      // If total is $0.00, skip payment and directly complete the order
      if (finalTotal <= 0) {
        console.log('Processing free order - skipping payment');
        
        // Update order status to confirmed since no payment is needed
        await supabase
          .from('orders')
          .update({ 
            order_status: 'confirmed',
            customer_name: customerInfo.name,
            customer_phone: customerInfo.phone 
          })
          .eq('id', newOrder.id);

        // Show success message and redirect
        notifications.show({
          title: "Order placed successfully! 🎉",
          message: "Your free order has been confirmed and sent to the restaurant.",
          color: "green",
        });

        // Close cart and reset form
        onOrderComplete();
        setShowOrderForm(false);
        return;
      }

      // For paid orders, redirect to checkout page to select payment method and complete payment
      // Save order info to localStorage for checkout page
      localStorage.setItem('pending_order_id', newOrder.id);
      localStorage.setItem('checkout_cart', JSON.stringify(cart));
      localStorage.setItem('checkout_restaurant', JSON.stringify(restaurant));
      localStorage.setItem('checkout_delivery_method', deliveryMethod);
      
      // Redirect to checkout page where user can select payment method and complete payment
      window.location.href = '/checkout';
      
    } catch (error) {
      console.error('Error placing order:', error);
      notifications.show({
        title: "Error placing order",
        message: "Please try again or contact the restaurant directly.",
        color: "red",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (cart.length === 0) {
    return (
      <Drawer opened={isOpen} onClose={onClose} title="Your Cart" position="right" size="md">
        <Box style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
          <Stack align="center" gap="xs">
            <Text c="dimmed">Your cart is empty</Text>
            <Text size="sm" c="dimmed">Add some delicious items to get started!</Text>
          </Stack>
        </Box>
      </Drawer>
    );
  }

  return (
    <Drawer opened={isOpen} onClose={onClose} title={`Your Cart • ${restaurant.name}`} position="right" size="md">
      <Stack gap="md" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <ScrollArea style={{ flex: 1 }}>
          <Stack gap="md">
            {cart.map((item) => (
              <Box key={item.id}>
                <Group justify="space-between" align="flex-start" gap="sm">
                  <Stack gap="xs" style={{ flex: 1 }}>
                    <Group justify="space-between" align="flex-start">
                      <Text fw={500}>{item.name}</Text>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        onClick={() => onUpdateQuantity(item.id, 0)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                    {item.modifiers && item.modifiers.length > 0 && (
                      <Stack gap="xs">
                        {item.modifiers.map((modifier) => (
                          <Group key={modifier.id} justify="space-between" gap="xs">
                            <Text size="sm" c="dimmed">• {modifier.name}</Text>
                            {modifier.price_cents > 0 && (
                              <Text size="sm" c="dimmed">+${(modifier.price_cents / 100).toFixed(2)}</Text>
                            )}
                          </Group>
                        ))}
                      </Stack>
                    )}
                    {item.special_instructions && (
                      <Text size="sm" c="dimmed">
                        Note: {item.special_instructions}
                      </Text>
                    )}
                    <Group justify="space-between" align="center" mt="xs">
                      <Group gap="xs">
                        <ActionIcon
                          variant="outline"
                          size="sm"
                          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          <IconMinus size={14} />
                        </ActionIcon>
                        <Text fw={500} style={{ minWidth: '32px', textAlign: 'center' }}>{item.quantity}</Text>
                        <ActionIcon
                          variant="outline"
                          size="sm"
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        >
                          <IconPlus size={14} />
                        </ActionIcon>
                      </Group>
                      <Text fw={500}>
                        ${(((item.price_cents + (item.modifiers?.reduce((sum, mod) => sum + mod.price_cents, 0) || 0)) * item.quantity) / 100).toFixed(2)}
                      </Text>
                    </Group>
                  </Stack>
                </Group>
              </Box>
            ))}
          </Stack>
        </ScrollArea>

        <Box style={{ borderTop: '1px solid var(--mantine-color-gray-3)', paddingTop: '16px' }}>
          <Stack gap="md">
            {/* Delivery/Pickup Selection */}
            <Stack gap="xs">
              <Text fw={500} size="sm">Order Type</Text>
              <Group gap="xs">
                <Button
                  variant={deliveryMethod === 'delivery' ? 'filled' : 'outline'}
                  size="sm"
                  onClick={() => onDeliveryMethodChange('delivery')}
                  style={{ flex: 1 }}
                  leftSection={<IconTruck size={16} />}
                >
                  <Stack gap={0} align="center">
                    <Text size="xs">Delivery</Text>
                    <Text size="xs" c="dimmed">
                      {restaurant.min_delivery_time}-{restaurant.max_delivery_time} min
                    </Text>
                  </Stack>
                </Button>
                <Button
                  variant={deliveryMethod === 'pickup' ? 'filled' : 'outline'}
                  size="sm"
                  onClick={() => onDeliveryMethodChange('pickup')}
                  style={{ flex: 1 }}
                >
                  <Stack gap={0} align="center">
                    <Box style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'currentColor' }} />
                    <Text size="xs">Pickup</Text>
                    <Text size="xs" c="dimmed">15-25 min</Text>
                  </Stack>
                </Button>
              </Group>
            </Stack>

            {/* Promo Code Section */}
            <PromoCodeInput
              onApplyPromoCode={handleApplyPromoCode}
              onRemovePromoCode={removePromoCode}
              appliedPromoCode={appliedPromoCode}
              isValidating={isValidatingPromo}
              disabled={isProcessing}
            />

            {/* Order Summary */}
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm">Subtotal</Text>
                <Text size="sm">${(cart.reduce((sum, item) => {
                  const modifierPrice = item.modifiers?.reduce((modSum, mod) => modSum + mod.price_cents, 0) || 0;
                  return sum + ((item.price_cents + modifierPrice) * item.quantity);
                }, 0) / 100).toFixed(2)}</Text>
              </Group>
              {deliveryMethod === 'delivery' && (
                <Group justify="space-between">
                  <Text size="sm">Delivery Fee</Text>
                  <Text size="sm" td={appliedPromoCode?.type === 'free_delivery' ? 'line-through' : undefined} c={appliedPromoCode?.type === 'free_delivery' ? 'dimmed' : undefined}>
                    ${(totals.deliveryFee / 100).toFixed(2)}
                  </Text>
                </Group>
              )}
              {((appliedPromoCode?.type === 'free_delivery' && deliveryMethod === 'delivery') || appliedPromoCode?.type === 'total_free') && totals.deliveryFee > 0 && (
                <Group justify="space-between">
                  <Text size="sm" c="orange.6">{appliedPromoCode?.type === 'total_free' ? 'Everything FREE!' : 'Free delivery applied'}</Text>
                  <Text size="sm" c="orange.6">-${(totals.deliveryFee / 100).toFixed(2)}</Text>
                </Group>
              )}
              {appliedPromoCode && appliedPromoCode.type !== 'free_delivery' && appliedPromoCode.type !== 'total_free' && appliedPromoCode.discount_applied_cents > 0 && (
                <Group justify="space-between">
                  <Text size="sm" c="orange.6">Promo discount</Text>
                  <Text size="sm" c="orange.6">-${(appliedPromoCode.discount_applied_cents / 100).toFixed(2)}</Text>
                </Group>
              )}
              <Group justify="space-between">
                <Text size="sm">Tax</Text>
                <Text size="sm">${(totals.tax / 100).toFixed(2)}</Text>
              </Group>
              <Divider />
              <Group justify="space-between">
                <Text fw={600}>Total</Text>
                <Text fw={600}>
                  {(() => {
                    const subtotal = cart.reduce((sum, item) => {
                      const modifierPrice = item.modifiers?.reduce((modSum, mod) => modSum + mod.price_cents, 0) || 0;
                      return sum + ((item.price_cents + modifierPrice) * item.quantity);
                    }, 0);
                    
                    const promoDiscount = appliedPromoCode?.discount_applied_cents || 0;
                    let adjustedDeliveryFee = totals.deliveryFee;
                    
                    if (appliedPromoCode?.type === 'free_delivery' && deliveryMethod === 'delivery') {
                      adjustedDeliveryFee = 0;
                    } else if (appliedPromoCode?.type === 'total_free') {
                      adjustedDeliveryFee = 0;
                    }
                    
                    const finalTotal = appliedPromoCode?.type === 'total_free' ? 0 : subtotal + adjustedDeliveryFee + totals.tax - promoDiscount;
                    
                    return finalTotal <= 0 ? (
                      <Text c="orange.6" fw={700}>FREE!</Text>
                    ) : (
                      `$${(finalTotal / 100).toFixed(2)}`
                    );
                  })()}
                </Text>
              </Group>
            </Stack>

            <Text size="sm" c="dimmed" ta="center">
              {deliveryMethod === 'delivery' 
                ? `Estimated delivery: ${restaurant.min_delivery_time}-${restaurant.max_delivery_time} minutes`
                : 'Ready for pickup in 15-25 minutes'
              }
            </Text>

            <Button 
              fullWidth
              size="lg" 
              onClick={handleCheckout}
              disabled={isProcessing}
            >
              {(() => {
                const subtotal = cart.reduce((sum, item) => {
                  const modifierPrice = item.modifiers?.reduce((modSum, mod) => modSum + mod.price_cents, 0) || 0;
                  return sum + ((item.price_cents + modifierPrice) * item.quantity);
                }, 0);
                
                const promoDiscount = appliedPromoCode?.discount_applied_cents || 0;
                let adjustedDeliveryFee = totals.deliveryFee;
                
                if (appliedPromoCode?.type === 'free_delivery' && deliveryMethod === 'delivery') {
                  adjustedDeliveryFee = 0;
                } else if (appliedPromoCode?.type === 'total_free') {
                  adjustedDeliveryFee = 0;
                }
                
                const finalTotal = appliedPromoCode?.type === 'total_free' ? 0 : subtotal + adjustedDeliveryFee + totals.tax - promoDiscount;
                
                if (isProcessing) return "Processing...";
                if (finalTotal <= 0) return 'Place Free Order';
                return `Place Order • $${(finalTotal / 100).toFixed(2)}`;
              })()}
            </Button>
          </Stack>
        </Box>

        <CustomerOrderForm
          isOpen={showOrderForm}
          onClose={() => setShowOrderForm(false)}
          onSubmit={handleOrderSubmit}
          deliveryMethod={deliveryMethod}
          isProcessing={isProcessing}
          orderTotal={(() => {
            const subtotal = cart.reduce((sum, item) => {
              const modifierPrice = item.modifiers?.reduce((modSum, mod) => modSum + mod.price_cents, 0) || 0;
              return sum + ((item.price_cents + modifierPrice) * item.quantity);
            }, 0);
            
            const promoDiscount = appliedPromoCode?.discount_applied_cents || 0;
            let adjustedDeliveryFee = totals.deliveryFee;
            
            if (appliedPromoCode?.type === 'free_delivery' && deliveryMethod === 'delivery') {
              adjustedDeliveryFee = 0;
            } else if (appliedPromoCode?.type === 'total_free') {
              adjustedDeliveryFee = 0;
            }
            
            return appliedPromoCode?.type === 'total_free' ? 0 : subtotal + adjustedDeliveryFee + totals.tax - promoDiscount;
          })()}
        />
      </Stack>
    </Drawer>
  );
};

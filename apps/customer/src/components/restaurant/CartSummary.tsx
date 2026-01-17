import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Plus, Minus, ShoppingCart } from 'lucide-react';
import { PromoCodeInput } from './PromoCodeInput';

interface CartItem {
  id: string;
  name: string;
  price_cents: number;
  quantity: number;
  image_url?: string;
}

interface CartSummaryProps {
  items: CartItem[];
  deliveryFee: number;
  onUpdateQuantity: (id: string, delta: number) => void;
  onCheckout: () => void;
  className?: string;
  promoCodeDiscount?: number;
  deliveryMethod?: 'delivery' | 'pickup';
  onApplyPromoCode?: (code: string) => Promise<boolean>;
  onRemovePromoCode?: () => void;
  appliedPromoCode?: {
    code: string;
    name: string;
    discount_applied_cents: number;
    type: string;
  } | null;
  isValidatingPromo?: boolean;
}

const CartSummary = ({ 
  items, 
  deliveryFee, 
  onUpdateQuantity, 
  onCheckout,
  className,
  promoCodeDiscount = 0,
  deliveryMethod = 'delivery',
  onApplyPromoCode,
  onRemovePromoCode,
  appliedPromoCode,
  isValidatingPromo = false
}: CartSummaryProps) => {
  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  
  const subtotal = items.reduce((sum, item) => sum + (item.price_cents * item.quantity), 0);
  
  // Handle different promo code types
  let adjustedDeliveryFee = deliveryFee;
  let finalTotal = subtotal + deliveryFee - promoCodeDiscount;
  
  if (appliedPromoCode?.type === 'free_delivery' && deliveryMethod === 'delivery') {
    adjustedDeliveryFee = 0;
    finalTotal = subtotal - promoCodeDiscount;
  } else if (appliedPromoCode?.type === 'total_free') {
    adjustedDeliveryFee = 0;
    finalTotal = 0;
  }
  
  const total = finalTotal;
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  if (items.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">Your cart is empty</h3>
            <p className="text-sm text-muted-foreground">Add some delicious items to get started!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Your Order ({totalItems} {totalItems === 1 ? 'item' : 'items'})
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              {item.image_url && (
                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                  <img 
                    src={item.image_url} 
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{item.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatPrice(item.price_cents)} each
                </p>
              </div>
              
              <div className="flex items-center gap-2 bg-background rounded-lg p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onUpdateQuantity(item.id, -1)}
                  className="h-8 w-8 p-0 hover:bg-muted"
                >
                  <Minus className="h-3 w-3" />
                </Button>
                
                <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onUpdateQuantity(item.id, 1)}
                  className="h-8 w-8 p-0 hover:bg-muted"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        <Separator className="my-6" />
        
        {/* Promo Code Section */}
        {onApplyPromoCode && onRemovePromoCode && (
          <div className="mb-4">
            <PromoCodeInput
              onApplyPromoCode={onApplyPromoCode}
              onRemovePromoCode={onRemovePromoCode}
              appliedPromoCode={appliedPromoCode}
              isValidating={isValidatingPromo}
            />
          </div>
        )}
        
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{formatPrice(subtotal)}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Delivery fee</span>
            <span className={`font-medium ${(appliedPromoCode?.type === 'free_delivery' || appliedPromoCode?.type === 'total_free') && adjustedDeliveryFee === 0 ? 'line-through text-muted-foreground' : ''}`}>
              {deliveryFee === 0 ? 'Free' : formatPrice(deliveryFee)}
            </span>
          </div>
          
          {appliedPromoCode?.type === 'free_delivery' && deliveryMethod === 'delivery' && deliveryFee > 0 && (
            <div className="flex justify-between text-sm text-primary">
              <span>Free delivery applied</span>
              <span>-{formatPrice(deliveryFee)}</span>
            </div>
          )}
          
          {appliedPromoCode?.type === 'total_free' && (
            <div className="flex justify-between text-sm text-primary">
              <span>Everything FREE!</span>
              <span>-{formatPrice(subtotal + deliveryFee)}</span>
            </div>
          )}
          
          {promoCodeDiscount > 0 && appliedPromoCode?.type !== 'free_delivery' && appliedPromoCode?.type !== 'total_free' && (
            <div className="flex justify-between text-sm text-primary">
              <span>Promo discount</span>
              <span>-{formatPrice(promoCodeDiscount)}</span>
            </div>
          )}
          
          <Separator />
          
          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>
        
        <Button 
          onClick={onCheckout}
          className="w-full mt-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow-md transition-all duration-200" 
          size="lg"
        >
          Proceed to Checkout
        </Button>
        
        <p className="text-xs text-muted-foreground text-center mt-3">
          Tax and fees will be calculated at checkout
        </p>
      </CardContent>
    </Card>
  );
};

export default CartSummary;
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PromoCode {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: string;
  discount_percentage: number | null;
  discount_amount_cents: number | null;
  minimum_order_cents: number | null;
  maximum_discount_cents: number | null;
  usage_limit: number | null;
  usage_count: number;
  per_user_limit: number | null;
  valid_from: string;
  valid_until: string | null;
  customer_eligibility: string;
  applicable_to: string;
  is_active: boolean;
}

interface AppliedPromoCode extends PromoCode {
  discount_applied_cents: number;
}

export const usePromoCode = () => {
  const [appliedPromoCode, setAppliedPromoCode] = useState<AppliedPromoCode | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();

  const validatePromoCode = async (
    code: string, 
    subtotalCents: number, 
    deliveryMethod: 'delivery' | 'pickup'
  ): Promise<boolean> => {
    if (!code.trim()) return false;
    
    setIsValidating(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Fetch promo code
      const { data: promoCode, error: fetchError } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .single();

      if (fetchError || !promoCode) {
        toast({
          title: "Invalid promo code",
          description: "The promo code you entered is not valid or has expired.",
          variant: "destructive",
        });
        return false;
      }

      // Check validity period
      const now = new Date();
      const validFrom = new Date(promoCode.valid_from);
      const validUntil = promoCode.valid_until ? new Date(promoCode.valid_until) : null;

      if (now < validFrom || (validUntil && now > validUntil)) {
        toast({
          title: "Promo code expired",
          description: "This promo code is no longer valid.",
          variant: "destructive",
        });
        return false;
      }

      // Check usage limits
      if (promoCode.usage_limit && promoCode.usage_count >= promoCode.usage_limit) {
        toast({
          title: "Promo code limit reached",
          description: "This promo code has reached its usage limit.",
          variant: "destructive",
        });
        return false;
      }

      // Check per-user limits
      if (user && promoCode.per_user_limit) {
        const { data: userUsage } = await supabase
          .from('promo_code_usage')
          .select('id')
          .eq('promo_code_id', promoCode.id)
          .eq('user_id', user.id);

        if (userUsage && userUsage.length >= promoCode.per_user_limit) {
          toast({
            title: "Promo code limit reached",
            description: "You have already used this promo code the maximum number of times.",
            variant: "destructive",
          });
          return false;
        }
      }

      // Check minimum order amount
      if (promoCode.minimum_order_cents && subtotalCents < promoCode.minimum_order_cents) {
        const minOrder = (promoCode.minimum_order_cents / 100).toFixed(2);
        toast({
          title: "Minimum order not met",
          description: `This promo code requires a minimum order of $${minOrder}.`,
          variant: "destructive",
        });
        return false;
      }

      // Check delivery method compatibility
      if (promoCode.applicable_to === 'delivery_only' && deliveryMethod === 'pickup') {
        toast({
          title: "Delivery only promo",
          description: "This promo code is only valid for delivery orders.",
          variant: "destructive",
        });
        return false;
      }

      if (promoCode.applicable_to === 'pickup_only' && deliveryMethod === 'delivery') {
        toast({
          title: "Pickup only promo",
          description: "This promo code is only valid for pickup orders.",
          variant: "destructive",
        });
        return false;
      }

      // Calculate discount
      let discountCents = 0;
      
      switch (promoCode.type) {
        case 'percentage':
          if (promoCode.discount_percentage) {
            discountCents = Math.round(subtotalCents * (promoCode.discount_percentage / 100));
            if (promoCode.maximum_discount_cents) {
              discountCents = Math.min(discountCents, promoCode.maximum_discount_cents);
            }
          }
          break;
        case 'fixed_amount':
          if (promoCode.discount_amount_cents) {
            discountCents = Math.min(promoCode.discount_amount_cents, subtotalCents);
          }
          break;
        case 'free_delivery':
          // This will be handled in the cart calculation
          discountCents = 0;
          break;
        case 'total_free':
          // Makes everything free - subtotal becomes the discount
          discountCents = subtotalCents;
          break;
        case 'bogo':
          // For simplicity, implement as 50% off
          discountCents = Math.round(subtotalCents * 0.5);
          break;
      }

      const appliedCode: AppliedPromoCode = {
        ...promoCode,
        type: (promoCode.type || '').toLowerCase(),
        discount_applied_cents: discountCents
      };

      setAppliedPromoCode(appliedCode);
      
      toast({
        title: "Promo code applied!",
        description: `${promoCode.name} - You saved $${(discountCents / 100).toFixed(2)}!`,
      });

      return true;
    } catch (error) {
      console.error('Error validating promo code:', error);
      toast({
        title: "Error",
        description: "Failed to validate promo code. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const removePromoCode = () => {
    setAppliedPromoCode(null);
    toast({
      title: "Promo code removed",
      description: "The promo code has been removed from your order.",
    });
  };

  const recordPromoCodeUsage = async (orderId: string) => {
    if (!appliedPromoCode) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase
        .from('promo_code_usage')
        .insert({
          promo_code_id: appliedPromoCode.id,
          user_id: user?.id || null,
          order_id: orderId,
          discount_applied_cents: appliedPromoCode.discount_applied_cents
        });

      // Update usage count
      await supabase
        .from('promo_codes')
        .update({ usage_count: appliedPromoCode.usage_count + 1 })
        .eq('id', appliedPromoCode.id);
        
    } catch (error) {
      console.error('Error recording promo code usage:', error);
    }
  };

  return {
    appliedPromoCode,
    isValidating,
    validatePromoCode,
    removePromoCode,
    recordPromoCodeUsage
  };
};
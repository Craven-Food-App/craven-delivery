import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PromoCode {
  id: string;
  code: string;
  type: string;
  discount_percentage: number;
  discount_amount_cents: number;
  minimum_order_cents: number;
  maximum_discount_cents: number | null;
}

interface PromoCodeInputProps {
  subtotal: number;
  onPromoApplied: (discount: number, promoCode: PromoCode | null) => void;
}

export const PromoCodeInput: React.FC<PromoCodeInputProps> = ({ subtotal, onPromoApplied }) => {
  const { toast } = useToast();
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      toast({ title: "Error", description: "Please enter a promo code", variant: "destructive" });
      return;
    }

    setIsApplying(true);

    try {
      // Fetch promo code
      const { data: promo, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', promoCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !promo) {
        toast({ title: "Invalid Code", description: "This promo code is not valid", variant: "destructive" });
        setIsApplying(false);
        return;
      }

      // Check if promo code is still valid
      const now = new Date();
      if (promo.valid_until && new Date(promo.valid_until) < now) {
        toast({ title: "Expired", description: "This promo code has expired", variant: "destructive" });
        setIsApplying(false);
        return;
      }

      // Check minimum order
      if (subtotal < promo.minimum_order_cents) {
        toast({ 
          title: "Minimum Order Not Met", 
          description: `Minimum order of $${(promo.minimum_order_cents / 100).toFixed(2)} required`,
          variant: "destructive" 
        });
        setIsApplying(false);
        return;
      }

      // Check if user has already used this promo
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: usage } = await supabase
          .from('promo_code_usage')
          .select('*')
          .eq('promo_code_id', promo.id)
          .eq('user_id', user.id)
          .single();

        if (usage) {
          toast({ title: "Already Used", description: "You've already used this promo code", variant: "destructive" });
          setIsApplying(false);
          return;
        }
      }

      // Calculate discount
      let discount = 0;
      if (promo.type === 'percentage' && promo.discount_percentage) {
        discount = Math.round((subtotal * Number(promo.discount_percentage)) / 100);
      } else {
        discount = promo.discount_amount_cents;
      }

      // Apply max discount cap if exists
      if (promo.maximum_discount_cents && discount > promo.maximum_discount_cents) {
        discount = promo.maximum_discount_cents;
      }

      setAppliedPromo(promo);
      onPromoApplied(discount, promo);
      toast({ 
        title: "Promo Applied!", 
        description: `You saved $${(discount / 100).toFixed(2)}` 
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to apply promo code", variant: "destructive" });
    }

    setIsApplying(false);
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCode('');
    onPromoApplied(0, null);
    toast({ title: "Promo Removed", description: "Promo code has been removed" });
  };

  return (
    <div className="space-y-2">
      {appliedPromo ? (
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
          <div>
            <p className="text-sm font-medium text-green-800">{appliedPromo.code}</p>
            <p className="text-xs text-green-600">
              {appliedPromo.type === 'percentage' 
                ? `${appliedPromo.discount_percentage}% off` 
                : `$${(appliedPromo.discount_amount_cents / 100).toFixed(2)} off`}
            </p>
          </div>
          <button
            onClick={handleRemovePromo}
            className="text-sm text-red-600 hover:text-red-700"
          >
            Remove
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            className="flex-1 border rounded-lg px-3 py-2 text-sm uppercase"
            placeholder="Promo code"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleApplyPromo()}
          />
          <button
            onClick={handleApplyPromo}
            disabled={isApplying}
            className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {isApplying ? 'Applying...' : 'Apply'}
          </button>
        </div>
      )}
    </div>
  );
};

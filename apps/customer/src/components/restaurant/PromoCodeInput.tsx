import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Tag, X } from 'lucide-react';

interface PromoCodeInputProps {
  onApplyPromoCode: (code: string) => Promise<boolean>;
  onRemovePromoCode: () => void;
  appliedPromoCode: {
    code: string;
    name: string;
    discount_applied_cents: number;
    type: string;
  } | null;
  isValidating: boolean;
  disabled?: boolean;
}

export const PromoCodeInput: React.FC<PromoCodeInputProps> = ({
  onApplyPromoCode,
  onRemovePromoCode,
  appliedPromoCode,
  isValidating,
  disabled = false
}) => {
  const [promoCode, setPromoCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (promoCode.trim() && !disabled) {
      const success = await onApplyPromoCode(promoCode.trim());
      if (success) {
        setPromoCode('');
      }
    }
  };

  if (appliedPromoCode) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Applied Promo Code</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemovePromoCode}
            className="h-6 px-2 text-muted-foreground hover:text-foreground"
            disabled={disabled}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            <div>
              <Badge variant="secondary" className="text-xs">
                {appliedPromoCode.code}
              </Badge>
              <p className="text-sm text-muted-foreground mt-1">
                {appliedPromoCode.name}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-primary">
              -{appliedPromoCode.type === 'free_delivery' ? 'Free Delivery' : `$${(appliedPromoCode.discount_applied_cents / 100).toFixed(2)}`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label htmlFor="promo-code" className="text-sm font-medium">
        Promo Code
      </label>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="promo-code"
            type="text"
            placeholder="Enter promo code"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            className="pl-10"
            disabled={disabled || isValidating}
          />
        </div>
        <Button 
          type="submit" 
          variant="outline" 
          disabled={!promoCode.trim() || disabled || isValidating}
          className="px-4"
        >
          {isValidating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Apply'
          )}
        </Button>
      </form>
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { CreditCard } from 'lucide-react';
import { IconTrash } from '@tabler/icons-react';

interface PaymentMethod {
  id: string;
  type: string;
  brand?: string;
  last4: string;
  stripe_payment_method_id?: string;
  moov_payment_method_id?: string;
  is_default: boolean;
}

interface SplitPaymentProps {
  totalAmount: number;
  onPaymentMethodsChange: (methods: Array<{ paymentMethodId: string; amount: number }>) => void;
  selectedMethod?: PaymentMethod | null;
}

export const SplitPayment: React.FC<SplitPaymentProps> = ({
  totalAmount,
  onPaymentMethodsChange,
  selectedMethod
}) => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [primaryMethod, setPrimaryMethod] = useState<PaymentMethod | null>(null);
  const [secondaryMethod, setSecondaryMethod] = useState<PaymentMethod | null>(null);
  const [splitPercentage, setSplitPercentage] = useState(50); // Primary gets this %

  // Fetch user's payment methods
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('payment_methods')
          .select('*')
          .eq('user_id', user.id)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false });

        if (!error && data) {
          setPaymentMethods(data);
          
          // Auto-select default or first method as primary
          const defaultMethod = data.find(m => m.is_default) || data[0];
          if (defaultMethod) {
            setPrimaryMethod(defaultMethod);
          }
        }
      } catch (error) {
        console.error('Error fetching payment methods:', error);
      }
    };

    fetchPaymentMethods();
  }, []);

  // Update parent when split config changes
  useEffect(() => {
    if (!splitEnabled && primaryMethod) {
      // Single payment
      onPaymentMethodsChange([{
        paymentMethodId: primaryMethod.stripe_payment_method_id || primaryMethod.moov_payment_method_id || '',
        amount: totalAmount
      }]);
    } else if (splitEnabled && primaryMethod && secondaryMethod) {
      // Split payment
      const primaryAmount = Math.round(totalAmount * (splitPercentage / 100));
      const secondaryAmount = totalAmount - primaryAmount;
      
      onPaymentMethodsChange([
        {
          paymentMethodId: primaryMethod.stripe_payment_method_id || primaryMethod.moov_payment_method_id || '',
          amount: primaryAmount
        },
        {
          paymentMethodId: secondaryMethod.stripe_payment_method_id || secondaryMethod.moov_payment_method_id || '',
          amount: secondaryAmount
        }
      ]);
    }
  }, [splitEnabled, primaryMethod, secondaryMethod, splitPercentage, totalAmount, onPaymentMethodsChange]);

  const formatAmount = (amount: number) => {
    return `$${(amount / 100).toFixed(2)}`;
  };

  const primaryAmount = Math.round(totalAmount * (splitPercentage / 100));
  const secondaryAmount = totalAmount - primaryAmount;

  return (
    <div className="space-y-4">
      {/* Primary Payment Method */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {splitEnabled ? 'First Card' : 'Payment Method'}
        </label>
        <select
          value={primaryMethod?.id || ''}
          onChange={(e) => {
            const method = paymentMethods.find(m => m.id === e.target.value);
            setPrimaryMethod(method || null);
          }}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        >
          {paymentMethods.map((method) => (
            <option key={method.id} value={method.id}>
              {method.type === 'card' 
                ? `${method.brand || 'Card'} •••• ${method.last4}`
                : `Bank •••• ${method.last4}`
              }
              {method.is_default && ' (Default)'}
            </option>
          ))}
        </select>
        {splitEnabled && (
          <div className="mt-2 text-sm text-gray-600">
            Will charge: <span className="font-semibold text-gray-900">{formatAmount(primaryAmount)}</span>
          </div>
        )}
      </div>

      {/* Split Payment Toggle */}
      {paymentMethods.length >= 2 && (
        <div>
          <button
            onClick={() => {
              setSplitEnabled(!splitEnabled);
              if (!splitEnabled) {
                // When enabling, set secondary to first non-primary card
                const otherMethod = paymentMethods.find(m => m.id !== primaryMethod?.id);
                setSecondaryMethod(otherMethod || null);
              } else {
                setSecondaryMethod(null);
              }
            }}
            className="flex items-center gap-2 text-sm font-medium text-orange-600 hover:text-orange-700"
          >
            {splitEnabled ? '− Remove split payment' : '+ Split payment between 2 cards'}
          </button>
        </div>
      )}

      {/* Secondary Payment Method (when split enabled) */}
      {splitEnabled && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Second Card</label>
            <select
              value={secondaryMethod?.id || ''}
              onChange={(e) => {
                const method = paymentMethods.find(m => m.id === e.target.value);
                setSecondaryMethod(method || null);
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              {paymentMethods
                .filter(m => m.id !== primaryMethod?.id)
                .map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.type === 'card' 
                      ? `${method.brand || 'Card'} •••• ${method.last4}`
                      : `Bank •••• ${method.last4}`
                    }
                    {method.is_default && ' (Default)'}
                  </option>
                ))}
            </select>
            <div className="mt-2 text-sm text-gray-600">
              Will charge: <span className="font-semibold text-gray-900">{formatAmount(secondaryAmount)}</span>
            </div>
          </div>

          {/* Split Percentage Slider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Adjust split amount
            </label>
            <div className="space-y-3">
              <Slider
                value={[splitPercentage]}
                onValueChange={(value) => setSplitPercentage(value[0])}
                min={1}
                max={99}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-sm">
                <div className="text-gray-600">
                  First card: <span className="font-semibold text-gray-900">{splitPercentage}%</span>
                </div>
                <div className="text-gray-600">
                  Second card: <span className="font-semibold text-gray-900">{100 - splitPercentage}%</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* No Payment Methods */}
      {paymentMethods.length === 0 && (
        <div className="text-center py-4 text-gray-500 text-sm">
          No payment methods saved. Add one to continue.
        </div>
      )}
    </div>
  );
};


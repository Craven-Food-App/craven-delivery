import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, Building2 } from 'lucide-react';

interface PaymentMethod {
  id: string;
  stripe_payment_method_id: string;
  provider: 'stripe';
  type: 'card' | 'ach-debit-fund-source';
  last4: string | null;
  brand?: string | null;
  bank_name?: string | null;
  account_type?: 'checking' | 'savings' | null;
  is_default: boolean;
}

interface PaymentMethodSelectorProps {
  onPaymentMethodSelect: (paymentMethod: PaymentMethod | null) => void;
  onPaymentMethodsLoaded?: (hasMethods: boolean) => void;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({ onPaymentMethodSelect, onPaymentMethodsLoaded }) => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);


  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'stripe')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPaymentMethods(data as PaymentMethod[]);
      const hasMethods = data.length > 0;
      if (onPaymentMethodsLoaded) {
        onPaymentMethodsLoaded(hasMethods);
      }
      const defaultMethod = data.find(m => m.is_default) || data[0];
      if (defaultMethod) {
        setSelectedMethod(defaultMethod.id);
        onPaymentMethodSelect(defaultMethod as PaymentMethod);
      }
    } else {
      if (onPaymentMethodsLoaded) {
        onPaymentMethodsLoaded(false);
      }
    }
  };

  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method.id);
    onPaymentMethodSelect(method);
  };

  return (
    <div className="space-y-3">
      {paymentMethods.map((method) => (
        <label
          key={method.id}
          className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
        >
          <input
            type="radio"
            name="payment"
            checked={selectedMethod === method.id}
            onChange={() => handleMethodSelect(method)}
          />
          <div className="flex items-center gap-2 flex-1">
            {method.type === 'card' ? (
              <CreditCard className="h-5 w-5 text-gray-600" />
            ) : (
              <Building2 className="h-5 w-5 text-gray-600" />
            )}
            <span className="text-sm">
              {method.type === 'card' 
                ? `${method.brand || 'Card'} •••• ${method.last4}`
                : `Bank Account •••• ${method.last4} (${method.account_type || 'checking'})`
              }
            </span>
          </div>
        </label>
      ))}


      <div className="text-xs text-gray-500">
        You won't be charged until the order is accepted.
      </div>
    </div>
  );
};

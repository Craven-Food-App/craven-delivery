import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Building2 } from 'lucide-react';

interface PaymentMethod {
  id: string;
  moov_payment_method_id: string;
  provider: 'moov';
  type: 'card' | 'ach-debit-fund-source';
  last4: string | null;
  brand?: string | null;
  bank_name?: string | null;
  account_type?: 'checking' | 'savings' | null;
  is_default: boolean;
}

interface PaymentMethodSelectorProps {
  onPaymentMethodSelect: (paymentMethod: PaymentMethod | null) => void;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({ onPaymentMethodSelect }) => {
  const { toast } = useToast();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [paymentType, setPaymentType] = useState<'card' | 'ach'>('card');
  const [loading, setLoading] = useState(false);

  // Card form state
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    expMonth: '',
    expYear: '',
    cvv: '',
    cardholderName: '',
    billingZip: ''
  });

  // ACH form state
  const [achDetails, setAchDetails] = useState({
    accountType: 'checking' as 'checking' | 'savings',
    routingNumber: '',
    accountNumber: '',
    accountHolderName: '',
    accountHolderType: 'individual' as 'individual' | 'business'
  });

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
      .eq('provider', 'moov')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPaymentMethods(data as PaymentMethod[]);
      const defaultMethod = data.find(m => m.is_default) || data[0];
      if (defaultMethod) {
        setSelectedMethod(defaultMethod.id);
        onPaymentMethodSelect(defaultMethod as PaymentMethod);
      }
    }
  };

  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method.id);
    onPaymentMethodSelect(method);
    setShowAddMethod(false);
  };

  const handleAddCard = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Error", description: "Please sign in to add payment methods", variant: "destructive" });
      return;
    }

    // Validate card details
    if (!cardDetails.cardNumber || !cardDetails.expMonth || !cardDetails.expYear || 
        !cardDetails.cvv || !cardDetails.cardholderName || !cardDetails.billingZip) {
      toast({ title: "Error", description: "Please fill all card details", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Create Moov payment method via edge function
      const { data, error } = await supabase.functions.invoke('create-moov-payment-method', {
        body: {
          type: 'card',
          card: {
            number: cardDetails.cardNumber.replace(/\s/g, ''),
            expMonth: parseInt(cardDetails.expMonth),
            expYear: 2000 + parseInt(cardDetails.expYear),
            cvv: cardDetails.cvv,
            holderName: cardDetails.cardholderName,
            billingZip: cardDetails.billingZip,
          }
        }
      });

      if (error) throw error;

      if (data.paymentMethodID) {
        // Save to database
        const { data: savedMethod, error: saveError } = await supabase
          .from('payment_methods')
          .insert({
            user_id: user.id,
            provider: 'moov',
            type: 'card',
            moov_payment_method_id: data.paymentMethodID,
            last4: cardDetails.cardNumber.slice(-4),
            brand: data.brand || 'Card',
            is_default: paymentMethods.length === 0,
          })
          .select()
          .single();

        if (saveError) throw saveError;

        toast({ title: "Success", description: "Card added successfully" });
        setPaymentMethods([savedMethod as PaymentMethod, ...paymentMethods]);
        handleMethodSelect(savedMethod as PaymentMethod);
        setCardDetails({
          cardNumber: '',
          expMonth: '',
          expYear: '',
          cvv: '',
          cardholderName: '',
          billingZip: ''
        });
        setShowAddMethod(false);
      }
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to add card", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddAch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Error", description: "Please sign in to add payment methods", variant: "destructive" });
      return;
    }

    // Validate ACH details
    if (!achDetails.routingNumber || !achDetails.accountNumber || !achDetails.accountHolderName) {
      toast({ title: "Error", description: "Please fill all bank account details", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Create Moov ACH payment method via edge function
      const { data, error } = await supabase.functions.invoke('create-moov-payment-method', {
        body: {
          type: 'ach-debit-fund-source',
          ach: {
            accountType: achDetails.accountType,
            routingNumber: achDetails.routingNumber,
            accountNumber: achDetails.accountNumber,
            holderName: achDetails.accountHolderName,
            holderType: achDetails.accountHolderType,
          }
        }
      });

      if (error) throw error;

      if (data.paymentMethodID) {
        // Save to database
        const { data: savedMethod, error: saveError } = await supabase
          .from('payment_methods')
          .insert({
            user_id: user.id,
            provider: 'moov',
            type: 'ach-debit-fund-source',
            moov_payment_method_id: data.paymentMethodID,
            last4: achDetails.accountNumber.slice(-4),
            account_type: achDetails.accountType,
            is_default: paymentMethods.length === 0,
          })
          .select()
          .single();

        if (saveError) throw saveError;

        toast({ title: "Success", description: "Bank account added successfully" });
        setPaymentMethods([savedMethod as PaymentMethod, ...paymentMethods]);
        handleMethodSelect(savedMethod as PaymentMethod);
        setAchDetails({
          accountType: 'checking',
          routingNumber: '',
          accountNumber: '',
          accountHolderName: '',
          accountHolderType: 'individual'
        });
        setShowAddMethod(false);
      }
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to add bank account", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
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

      {showAddMethod ? (
        <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setPaymentType('card')}
              className={`px-3 py-1 rounded text-sm ${
                paymentType === 'card' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-white border text-gray-700'
              }`}
            >
              Card
            </button>
            <button
              onClick={() => setPaymentType('ach')}
              className={`px-3 py-1 rounded text-sm ${
                paymentType === 'ach' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-white border text-gray-700'
              }`}
            >
              Bank Account (ACH)
            </button>
          </div>

          {paymentType === 'card' ? (
            <div className="space-y-3">
              <h3 className="font-medium text-sm">Add New Card</h3>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Card number"
                value={cardDetails.cardNumber}
                maxLength={19}
                onChange={(e) => setCardDetails({ ...cardDetails, cardNumber: formatCardNumber(e.target.value) })}
              />
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Cardholder name"
                value={cardDetails.cardholderName}
                onChange={(e) => setCardDetails({ ...cardDetails, cardholderName: e.target.value })}
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  className="border rounded-lg px-3 py-2 text-sm"
                  placeholder="MM"
                  maxLength={2}
                  value={cardDetails.expMonth}
                  onChange={(e) => setCardDetails({ ...cardDetails, expMonth: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                />
                <input
                  className="border rounded-lg px-3 py-2 text-sm"
                  placeholder="YY"
                  maxLength={2}
                  value={cardDetails.expYear}
                  onChange={(e) => setCardDetails({ ...cardDetails, expYear: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                />
                <input
                  className="border rounded-lg px-3 py-2 text-sm"
                  placeholder="CVV"
                  maxLength={4}
                  type="password"
                  value={cardDetails.cvv}
                  onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                />
              </div>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Billing ZIP code"
                maxLength={5}
                value={cardDetails.billingZip}
                onChange={(e) => setCardDetails({ ...cardDetails, billingZip: e.target.value.replace(/\D/g, '').slice(0, 5) })}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddCard}
                  disabled={loading}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Card'}
                </button>
                <button
                  onClick={() => setShowAddMethod(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="font-medium text-sm">Add Bank Account</h3>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={achDetails.accountType}
                onChange={(e) => setAchDetails({ ...achDetails, accountType: e.target.value as 'checking' | 'savings' })}
              >
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
              </select>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Routing number"
                maxLength={9}
                value={achDetails.routingNumber}
                onChange={(e) => setAchDetails({ ...achDetails, routingNumber: e.target.value.replace(/\D/g, '').slice(0, 9) })}
              />
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Account number"
                value={achDetails.accountNumber}
                onChange={(e) => setAchDetails({ ...achDetails, accountNumber: e.target.value.replace(/\D/g, '') })}
              />
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Account holder name"
                value={achDetails.accountHolderName}
                onChange={(e) => setAchDetails({ ...achDetails, accountHolderName: e.target.value })}
              />
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={achDetails.accountHolderType}
                onChange={(e) => setAchDetails({ ...achDetails, accountHolderType: e.target.value as 'individual' | 'business' })}
              >
                <option value="individual">Individual</option>
                <option value="business">Business</option>
              </select>
              <div className="flex gap-2">
                <button
                  onClick={handleAddAch}
                  disabled={loading}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Bank Account'}
                </button>
                <button
                  onClick={() => setShowAddMethod(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-500">
            Payment information is securely processed by Moov
          </p>
        </div>
      ) : (
        <button
          onClick={() => setShowAddMethod(true)}
          className="w-full p-3 border border-dashed rounded-lg hover:bg-gray-50 text-sm text-gray-600"
        >
          + Add payment method
        </button>
      )}

      <div className="text-xs text-gray-500">
        You won't be charged until the order is accepted.
      </div>
    </div>
  );
};

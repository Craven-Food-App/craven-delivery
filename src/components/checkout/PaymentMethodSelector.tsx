import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PaymentMethod {
  id: string;
  token: string;
  provider: string;
  last4: string | null;
  brand: string | null;
  is_default: boolean;
  stripe_card_id?: string | null;
}

interface PaymentMethodSelectorProps {
  onPaymentMethodSelect: (paymentMethod: PaymentMethod | null) => void;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({ onPaymentMethodSelect }) => {
  const { toast } = useToast();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    expMonth: '',
    expYear: '',
    cvv: '',
    cardholderName: ''
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
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPaymentMethods(data);
      const defaultMethod = data.find(m => m.is_default) || data[0];
      if (defaultMethod) {
        setSelectedMethod(defaultMethod.id);
        onPaymentMethodSelect(defaultMethod);
      }
    }
  };

  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method.id);
    onPaymentMethodSelect(method);
    setShowAddCard(false);
  };

  const handleAddCard = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Error", description: "Please sign in to add payment methods", variant: "destructive" });
      return;
    }

    // Validate card details
    if (!cardDetails.cardNumber || !cardDetails.expMonth || !cardDetails.expYear || !cardDetails.cvv || !cardDetails.cardholderName) {
      toast({ title: "Error", description: "Please fill all card details", variant: "destructive" });
      return;
    }

    // In production, you would tokenize the card with Stripe.js here
    // For now, we'll create a mock payment method
    const mockStripeId = `stripe_card_${Date.now()}`;
    const lastFour = cardDetails.cardNumber.slice(-4);
    
    const { data, error } = await supabase
      .from('payment_methods')
      .insert({
        user_id: user.id,
        provider: 'stripe',
        token: mockStripeId,
        last4: lastFour,
        brand: 'Visa', // In production, detect from card number
        is_default: paymentMethods.length === 0,
        stripe_card_id: mockStripeId
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: "Failed to add card", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Card added successfully" });
      setPaymentMethods([data, ...paymentMethods]);
      handleMethodSelect(data);
      setCardDetails({
        cardNumber: '',
        expMonth: '',
        expYear: '',
        cvv: '',
        cardholderName: ''
      });
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
          <span className="text-sm">
            {method.brand} •••• {method.last4}
          </span>
        </label>
      ))}

      {showAddCard ? (
        <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
          <h3 className="font-medium text-sm">Add New Card</h3>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Card number"
            value={cardDetails.cardNumber}
            maxLength={16}
            onChange={(e) => setCardDetails({ ...cardDetails, cardNumber: e.target.value.replace(/\D/g, '') })}
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
              onChange={(e) => setCardDetails({ ...cardDetails, expMonth: e.target.value.replace(/\D/g, '') })}
            />
            <input
              className="border rounded-lg px-3 py-2 text-sm"
              placeholder="YY"
              maxLength={2}
              value={cardDetails.expYear}
              onChange={(e) => setCardDetails({ ...cardDetails, expYear: e.target.value.replace(/\D/g, '') })}
            />
            <input
              className="border rounded-lg px-3 py-2 text-sm"
              placeholder="CVV"
              maxLength={4}
              value={cardDetails.cvv}
              onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value.replace(/\D/g, '') })}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddCard}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm"
            >
              Add Card
            </button>
            <button
              onClick={() => setShowAddCard(false)}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Card information is securely processed by Stripe
          </p>
        </div>
      ) : (
        <button
          onClick={() => setShowAddCard(true)}
          className="w-full p-3 border border-dashed rounded-lg hover:bg-gray-50 text-sm text-gray-600"
        >
          + Add new card
        </button>
      )}

      <div className="text-xs text-gray-500">
        You won't be charged until the order is accepted.
      </div>
    </div>
  );
};

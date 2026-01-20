import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CreditCard, Plus, Trash2, Check, Shield, Lock } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Initialize Stripe
let stripePromise: Promise<any> | null = null;
try {
  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  if (publishableKey && publishableKey.trim() !== '') {
    stripePromise = loadStripe(publishableKey);
  }
} catch (error) {
  console.error('Failed to initialize Stripe:', error);
}

interface PaymentMethod {
  id: string;
  type: string;
  provider: string;
  brand: string;
  last4: string;
  is_default: boolean;
  stripe_payment_method_id?: string;
}

const CardForm: React.FC<{
  onSubmit: (paymentMethodId: string) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  customerAddress: any;
}> = ({ onSubmit, onCancel, isSubmitting, customerAddress }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [holderName, setHolderName] = useState('');
  const [billingZip, setBillingZip] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      return;
    }

    const { paymentMethod, error } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
      billing_details: {
        name: holderName,
        address: {
          line1: customerAddress?.street_address || '',
          city: customerAddress?.city || '',
          state: customerAddress?.state || '',
          postal_code: billingZip || customerAddress?.zip_code || '',
          country: 'US',
        },
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to create payment method');
    }

    if (!paymentMethod || !paymentMethod.id) {
      throw new Error('Payment method was not created');
    }

    await onSubmit(paymentMethod.id);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Cardholder Name</label>
          <input
            type="text"
            placeholder="John Doe"
            value={holderName}
            onChange={(e) => setHolderName(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Card Details</label>
          <div className="border border-gray-300 rounded-lg px-4 py-3 focus-within:ring-2 focus-within:ring-red-500">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                  invalid: {
                    color: '#9e2146',
                  },
                },
              }}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">ZIP Code</label>
          <input
            type="text"
            placeholder="12345"
            value={billingZip}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 5);
              setBillingZip(value);
            }}
            maxLength={5}
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          className="flex-1 h-12 text-base"
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || !customerAddress || !holderName.trim() || !billingZip || billingZip.length < 5}
          className="flex-1 h-12 text-base bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
        >
          {isSubmitting ? 'Adding Card...' : 'Add Card'}
        </Button>
      </div>
    </form>
  );
};

const PaymentMethods: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [showAddCard, setShowAddCard] = useState(false);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [customerAddress, setCustomerAddress] = useState<any>(null);

  useEffect(() => {
    fetchPaymentMethods();
    fetchCustomerAddress();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/account');
        return;
      }

      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (error: any) {
      console.error('Error fetching payment methods:', error);
      toast({
        title: "Error",
        description: "Failed to load payment methods",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerAddress = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('delivery_addresses')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .maybeSingle();

      if (data) {
        setCustomerAddress(data);
      }
    } catch (error) {
      console.error('Error fetching address:', error);
    }
  };

  const handleAddCard = async (paymentMethodId: string) => {
    setIsAddingCard(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Use the add-payment-method function to save the payment method
      const { data: savedMethod, error: saveError } = await supabase.functions.invoke('add-payment-method', {
        body: { payment_method_id: paymentMethodId }
      });

      if (saveError) {
        throw new Error(saveError.message || 'Failed to save payment method');
      }

      toast({
        title: "Success",
        description: "Payment method added successfully",
      });

      setShowAddCard(false);
      await fetchPaymentMethods();
    } catch (error: any) {
      console.error('Error adding card:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add payment method",
        variant: "destructive"
      });
    } finally {
      setIsAddingCard(false);
    }
  };

  const setDefaultPaymentMethod = async (paymentId: string) => {
    setUpdating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('user_id', user.id);

      const { error } = await supabase
        .from('payment_methods')
        .update({ is_default: true })
        .eq('id', paymentId);

      if (error) throw error;

      await fetchPaymentMethods();
      
      toast({
        title: "Success",
        description: "Default payment method updated"
      });
    } catch (error: any) {
      console.error('Error setting default payment method:', error);
      toast({
        title: "Error",
        description: "Failed to update default payment method",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const removePaymentMethod = async (paymentId: string) => {
    if (!confirm('Are you sure you want to remove this payment method?')) {
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;

      await fetchPaymentMethods();
      
      toast({
        title: "Success",
        description: "Payment method removed"
      });
    } catch (error: any) {
      console.error('Error removing payment method:', error);
      toast({
        title: "Error",
        description: "Failed to remove payment method",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" style={{ paddingTop: 'calc(64px + env(safe-area-inset-top, 0px))' }}>
      {/* Header - Fixed at Top matching Chat Header Structure */}
      <div className="flex items-center gap-3 px-4 py-3 bg-background border-b border-border" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        width: '100%',
        zIndex: 1000,
        paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
        flexShrink: 0
      }}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/account')}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-gray-900">Payment Methods</h1>
      </div>

      {/* Content */}
      <div className="p-4 pb-32">
        {/* Security Notice */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-900 mb-1">Secure Payment Processing</p>
              <p className="text-xs text-blue-700">
                Your payment information is encrypted and securely processed by Stripe. We never store your full card details.
              </p>
            </div>
          </div>
        </div>

        {/* Add New Card Button */}
        {!showAddCard && (
          <Button
            onClick={() => setShowAddCard(true)}
            className="w-full mb-6 h-12 text-base bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add New Card
          </Button>
        )}

        {/* Add Card Form */}
        {showAddCard && stripePromise && (
          <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Add New Card</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAddCard(false)}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>
            <Elements stripe={stripePromise}>
              <CardForm
                onSubmit={handleAddCard}
                onCancel={() => setShowAddCard(false)}
                isSubmitting={isAddingCard}
                customerAddress={customerAddress}
              />
            </Elements>
          </div>
        )}

        {!stripePromise && showAddCard && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              Stripe is not configured. Please contact support.
            </p>
          </div>
        )}

        {/* Saved Payment Methods */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Saved Payment Methods</h2>
          
          {paymentMethods.length === 0 ? (
            <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
              <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium mb-2">No payment methods saved</p>
              <p className="text-sm text-gray-500">Add a payment method to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paymentMethods.map((payment) => (
                <div key={payment.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                        <CreditCard className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-900">
                            {payment.brand ? payment.brand.charAt(0).toUpperCase() + payment.brand.slice(1) : 'Card'} •••• {payment.last4 || '****'}
                          </p>
                          {payment.is_default && (
                            <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs">
                              Default
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 capitalize">
                          {payment.provider || 'stripe'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!payment.is_default && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDefaultPaymentMethod(payment.id)}
                          disabled={updating}
                          className="h-9"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Set Default
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removePaymentMethod(payment.id)}
                        disabled={updating}
                        className="h-9 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security Footer */}
        <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-gray-600" />
            <p className="text-sm font-semibold text-gray-900">Your payment information is secure</p>
          </div>
          <p className="text-xs text-gray-600">
            All transactions are encrypted and processed securely through Stripe. Your card details are never stored on our servers.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethods;


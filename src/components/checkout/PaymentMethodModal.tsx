import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, Building2, Plus, Check, Loader2, AlertCircle } from 'lucide-react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

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
  exp_month?: number | null;
  exp_year?: number | null;
}

interface PaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPaymentMethod: PaymentMethod | null;
  onSelect: (method: PaymentMethod | null) => void;
  onAddNew: () => void;
  customerAddress?: any;
  onError?: (error: any) => void;
}

const CARD_BRAND_COLORS: Record<string, { bg: string; text: string }> = {
  visa: { bg: 'bg-[#1A1F71]', text: 'text-white' },
  mastercard: { bg: 'bg-[#EB001B]', text: 'text-white' },
  amex: { bg: 'bg-[#006FCF]', text: 'text-white' },
  discover: { bg: 'bg-[#FF6000]', text: 'text-white' },
  jcb: { bg: 'bg-[#0066CC]', text: 'text-white' },
  diners: { bg: 'bg-[#0079BE]', text: 'text-white' },
  unionpay: { bg: 'bg-[#E21836]', text: 'text-white' },
};

const getCardBrandColor = (brand: string | null | undefined): { bg: string; text: string } => {
  if (!brand) return { bg: 'bg-gray-700', text: 'text-white' };
  const normalized = brand.toLowerCase().replace(/\s+/g, '');
  return CARD_BRAND_COLORS[normalized] || { bg: 'bg-gray-700', text: 'text-white' };
};

const formatExpiry = (month: number | null, year: number | null): string => {
  if (!month || !year) return '';
  const monthStr = month.toString().padStart(2, '0');
  const yearStr = year.toString().slice(-2);
  return `${monthStr}/${yearStr}`;
};

const CardForm: React.FC<{
  onSubmit: (paymentMethodId: string) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  customerAddress?: any;
}> = ({ onSubmit, onCancel, isSubmitting, customerAddress }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [holderName, setHolderName] = useState('');
  const [billingZip, setBillingZip] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!stripe || !elements) {
      setError('Stripe is not initialized. Please refresh the page.');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError('Card element not found. Please refresh the page.');
      return;
    }

    if (!holderName.trim() || !billingZip || billingZip.length < 5) {
      setError('Please enter cardholder name and billing ZIP code.');
      return;
    }

    try {
      const { error: createError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: holderName.trim(),
          address: {
            postal_code: billingZip,
            line1: customerAddress?.street_address || '',
            city: customerAddress?.city || '',
            state: customerAddress?.state || '',
            country: 'US',
          },
        },
      });

      if (createError) {
        setError(createError.message || 'Failed to create payment method');
        return;
      }

      if (!paymentMethod?.id) {
        setError('Payment method was not created. Please try again.');
        return;
      }

      await onSubmit(paymentMethod.id);
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Cardholder Name</label>
        <input
          type="text"
          value={holderName}
          onChange={(e) => setHolderName(e.target.value)}
          placeholder="John Doe"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Card Details</label>
        <div className="border border-gray-300 rounded-lg p-3 focus-within:ring-2 focus-within:ring-orange-500 focus-within:border-orange-500">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '15px',
                  color: '#1f2937',
                  '::placeholder': { color: '#9ca3af' },
                },
                invalid: { color: '#ef4444' },
              },
            }}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Billing ZIP Code</label>
        <input
          type="text"
          value={billingZip}
          onChange={(e) => setBillingZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
          placeholder="12345"
          maxLength={5}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          required
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2.5 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !holderName.trim() || !billingZip || billingZip.length < 5}
          className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-white rounded-lg py-2.5 text-sm font-semibold transition-all flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            'Add Card'
          )}
        </button>
      </div>
    </form>
  );
};

export const PaymentMethodModal: React.FC<PaymentMethodModalProps> = ({
  isOpen,
  onClose,
  selectedPaymentMethod,
  onSelect,
  onAddNew,
  customerAddress,
  onError,
}) => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);

  useEffect(() => {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (publishableKey && publishableKey.trim() !== '') {
      setStripePromise(loadStripe(publishableKey));
    }
  }, []);

  const loadPaymentMethods = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPaymentMethods([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'stripe')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading payment methods:', error);
        if (onError) onError(error);
        setPaymentMethods([]);
      } else {
        setPaymentMethods((data as PaymentMethod[]) || []);
      }
    } catch (err) {
      console.error('Error loading payment methods:', err);
      if (onError) onError(err);
      setPaymentMethods([]);
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    if (isOpen) {
      loadPaymentMethods();
      setShowAddForm(false);
    }
  }, [isOpen, loadPaymentMethods]);

  const handleAddCard = async (paymentMethodId: string) => {
    setIsAddingCard(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Please sign in to add a payment method.');
      }

      if (!customerAddress) {
        throw new Error('Please add a delivery address in your account settings first.');
      }

      const { data: stripeData, error: stripeError } = await supabase.functions.invoke('create-stripe-payment-method', {
        body: {
          paymentMethodId: paymentMethodId,
          billingAddress: {
            addressLine1: customerAddress.street_address || '',
            city: customerAddress.city || '',
            state: customerAddress.state || '',
            postalCode: customerAddress.zip_code || '',
            country: 'US',
          },
        },
      });

      if (stripeError || (stripeData && (stripeData as any).error)) {
        throw new Error((stripeData as any)?.error || stripeError?.message || 'Failed to create payment method');
      }

      if (!stripeData?.paymentMethodID) {
        throw new Error('Payment method was not created. Please try again.');
      }

      const { data: savedMethod, error: saveError } = await supabase
        .from('payment_methods')
        .insert({
          user_id: user.id,
          type: 'card',
          provider: 'stripe',
          token: stripeData.paymentMethodID,
          stripe_payment_method_id: stripeData.paymentMethodID,
          last4: stripeData.last4 || '****',
          brand: stripeData.brand || 'card',
          exp_month: stripeData.exp_month || null,
          exp_year: stripeData.exp_year || null,
          is_default: paymentMethods.length === 0,
        } as any)
        .select()
        .single();

      if (saveError) {
        throw saveError;
      }

      await loadPaymentMethods();
      onSelect(savedMethod as PaymentMethod);
      setShowAddForm(false);
    } catch (error: any) {
      console.error('Error adding card:', error);
      if (onError) onError(error);
      throw error;
    } finally {
      setIsAddingCard(false);
    }
  };

  const handleSelect = (method: PaymentMethod) => {
    onSelect(method);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 rounded-2xl overflow-hidden border-0 shadow-2xl">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 bg-white">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-bold text-gray-900">Payment Method</h2>
            <button
              onClick={onClose}
              className="p-1.5 -mr-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">Select or add a payment method</p>
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
            </div>
          ) : showAddForm ? (
            <div className="space-y-4">
              <button
                onClick={() => setShowAddForm(false)}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to payment methods
              </button>

              {stripePromise ? (
                <Elements stripe={stripePromise}>
                  <CardForm
                    onSubmit={handleAddCard}
                    onCancel={() => setShowAddForm(false)}
                    isSubmitting={isAddingCard}
                    customerAddress={customerAddress}
                  />
                </Elements>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    Stripe is not configured. Please set VITE_STRIPE_PUBLISHABLE_KEY in your environment variables.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {/* Saved Payment Methods */}
              {paymentMethods.length > 0 && (
                <div className="space-y-2 mb-4">
                  {paymentMethods.map((method) => {
                    const isSelected = selectedPaymentMethod?.id === method.id;
                    const brandColor = getCardBrandColor(method.brand);

                    return (
                      <button
                        key={method.id}
                        onClick={() => handleSelect(method)}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'border-orange-500 bg-orange-50 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                        }`}
                      >
                        {/* Icon */}
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${brandColor.bg} ${brandColor.text}`}>
                          {method.type === 'card' ? (
                            <CreditCard className="h-6 w-6" />
                          ) : (
                            <Building2 className="h-6 w-6" />
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 text-left min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-semibold text-gray-900 text-sm">
                              {method.type === 'card'
                                ? `${method.brand ? method.brand.charAt(0).toUpperCase() + method.brand.slice(1) : 'Card'} •••• ${method.last4}`
                                : `${method.bank_name || 'Bank Account'} •••• ${method.last4}`}
                            </span>
                            {method.is_default && (
                              <span className="text-[10px] font-medium text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">
                                DEFAULT
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            {method.type === 'card' && method.exp_month && method.exp_year && (
                              <span>Expires {formatExpiry(method.exp_month, method.exp_year)}</span>
                            )}
                            {method.type === 'ach-debit-fund-source' && method.account_type && (
                              <span className="capitalize">{method.account_type}</span>
                            )}
                          </div>
                        </div>

                        {/* Checkmark */}
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Add New Payment Method */}
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-dashed border-gray-300 bg-white hover:border-orange-400 hover:bg-orange-50 transition-all group"
              >
                <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-100 transition-colors">
                  <Plus className="h-6 w-6 text-gray-600 group-hover:text-orange-600" />
                </div>
                <div className="flex-1 text-left">
                  <span className="font-semibold text-gray-900 text-sm">Add New Card</span>
                  <p className="text-xs text-gray-500 mt-0.5">Add a credit or debit card</p>
                </div>
              </button>

              {paymentMethods.length === 0 && (
                <p className="text-xs text-gray-500 text-center py-4">
                  Your payment methods are securely stored and encrypted.
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentMethodModal;


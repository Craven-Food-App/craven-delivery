// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, Building2, Plus, Check, Loader2, AlertCircle, Smartphone, Wallet } from 'lucide-react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

interface PaymentMethod {
  id: string;
  stripe_payment_method_id: string;
  provider: 'stripe';
  type: 'card' | 'ach_debit' | 'apple_pay' | 'google_pay' | 'link' | 'paypal' | 'venmo';
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

const getPaymentMethodIcon = (type: string) => {
  switch (type) {
    case 'card':
      return <CreditCard className="h-6 w-6" />;
    case 'ach_debit':
      return <Building2 className="h-6 w-6" />;
    case 'apple_pay':
      return <Smartphone className="h-6 w-6" />;
    case 'google_pay':
      return <Smartphone className="h-6 w-6" />;
    case 'link':
      return <Wallet className="h-6 w-6" />;
    case 'paypal':
      return <Wallet className="h-6 w-6" />;
    case 'venmo':
      return <Wallet className="h-6 w-6" />;
    default:
      return <CreditCard className="h-6 w-6" />;
  }
};

const getPaymentMethodName = (type: string, brand?: string | null, last4?: string | null): string => {
  switch (type) {
    case 'card':
      return `${brand ? brand.charAt(0).toUpperCase() + brand.slice(1) : 'Card'} •••• ${last4 || '****'}`;
    case 'ach_debit':
      return `Bank Account •••• ${last4 || '****'}`;
    case 'apple_pay':
      return `Apple Pay •••• ${last4 || '****'}`;
    case 'google_pay':
      return `Google Pay •••• ${last4 || '****'}`;
    case 'link':
      return `Stripe Link •••• ${last4 || '****'}`;
    case 'paypal':
      return `PayPal •••• ${last4 || '****'}`;
    case 'venmo':
      return `Venmo •••• ${last4 || '****'}`;
    default:
      return `Payment Method •••• ${last4 || '****'}`;
  }
};

const getPaymentMethodColor = (type: string, brand?: string | null): { bg: string; text: string } => {
  switch (type) {
    case 'card':
      return getCardBrandColor(brand);
    case 'ach_debit':
      return { bg: 'bg-blue-600', text: 'text-white' };
    case 'apple_pay':
      return { bg: 'bg-black', text: 'text-white' };
    case 'google_pay':
      return { bg: 'bg-[#4285F4]', text: 'text-white' };
    case 'link':
      return { bg: 'bg-[#635BFF]', text: 'text-white' };
    case 'paypal':
      return { bg: 'bg-[#0070BA]', text: 'text-white' };
    case 'venmo':
      return { bg: 'bg-[#3D95CE]', text: 'text-white' };
    default:
      return { bg: 'bg-gray-700', text: 'text-white' };
  }
};

const formatExpiry = (month: number | null, year: number | null): string => {
  if (!month || !year) return '';
  const monthStr = month.toString().padStart(2, '0');
  const yearStr = year.toString().slice(-2);
  return `${monthStr}/${yearStr}`;
};

const PaymentForm: React.FC<{
  onSubmit: (paymentMethodId: string, paymentMethodType: string) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  customerAddress?: any;
  clientSecret: string | null;
}> = ({ onSubmit, onCancel, isSubmitting, customerAddress, clientSecret }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!stripe || !elements || !clientSecret) {
      setError('Stripe is not initialized. Please refresh the page.');
      return;
    }

    try {
      // Submit the form with the PaymentElement
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || 'Please check your payment details.');
        return;
      }

      // Confirm the SetupIntent (this only saves the payment method, does NOT charge)
      // The SetupIntent is created with usage: 'off_session' so it won't process payments
      const { error: confirmError, setupIntent } = await stripe.confirmSetup({
        elements,
        clientSecret,
        redirect: 'if_required',
        confirmParams: {
          // Explicitly set that we're only saving, not charging
          return_url: window.location.href,
        },
      });

      if (confirmError) {
        // Setup errors should not look like payment errors
        const errorMessage = confirmError.message || 'Failed to save payment method';
        // Make it clear this is about saving, not paying
        if (errorMessage.toLowerCase().includes('payment') && !errorMessage.toLowerCase().includes('method')) {
          setError(`Unable to save payment method: ${errorMessage.replace(/payment/gi, 'payment method')}`);
        } else {
          setError(errorMessage);
        }
        return;
      }

      if (!setupIntent?.payment_method) {
        setError('Payment method was not saved. Please try again.');
        return;
      }

      // Verify the setup intent status
      if (setupIntent.status !== 'succeeded') {
        setError(`Payment method setup ${setupIntent.status}. Please try again.`);
        return;
      }

      // Retrieve payment method to get its type
      const paymentMethod = await stripe.paymentMethods.retrieve(setupIntent.payment_method as string);
      const pmType = paymentMethod.type || 'card';

      await onSubmit(setupIntent.payment_method as string, pmType);
    } catch (err: any) {
      // Make sure error messages are about saving, not paying
      let errorMessage = err.message || 'An error occurred while saving your payment method.';
      if (errorMessage.toLowerCase().includes('payment failed') || errorMessage.toLowerCase().includes('declined')) {
        errorMessage = 'Unable to save payment method. Please check your details and try again.';
      }
      setError(errorMessage);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Details</label>
        <div className="border border-gray-300 rounded-lg p-3 focus-within:ring-2 focus-within:ring-orange-500 focus-within:border-orange-500">
          <PaymentElement
            options={{
              layout: 'tabs',
              paymentMethodTypes: ['card', 'apple_pay', 'google_pay', 'link', 'us_bank_account'],
              wallets: {
                applePay: 'auto',
                googlePay: 'auto',
              },
            }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1.5">
          Supports cards, Apple Pay, Google Pay, Link, and bank accounts. 
          <span className="font-medium text-gray-700"> No charge will be made</span> - this only saves your payment method for future use.
        </p>
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
          disabled={isSubmitting}
          className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-white rounded-lg py-2.5 text-sm font-semibold transition-all flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            'Add Payment Method'
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
  const [setupIntentClientSecret, setSetupIntentClientSecret] = useState<string | null>(null);
  const [loadingSetupIntent, setLoadingSetupIntent] = useState(false);

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
      setSetupIntentClientSecret(null);
    }
  }, [isOpen, loadPaymentMethods]);

  // Create SetupIntent when add form is shown
  useEffect(() => {
    if (showAddForm && !setupIntentClientSecret && !loadingSetupIntent) {
      createSetupIntent();
    }
  }, [showAddForm, setupIntentClientSecret, loadingSetupIntent]);

  const createSetupIntent = async () => {
    setLoadingSetupIntent(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Please sign in to add a payment method.');
      }

      // Create SetupIntent via edge function
      const { data, error } = await supabase.functions.invoke('create-setup-intent', {
        body: {
          customerId: null, // Will be created/retrieved on backend
        },
      });

      if (error || !data?.clientSecret) {
        throw new Error(error?.message || 'Failed to create setup intent');
      }

      setSetupIntentClientSecret(data.clientSecret);
    } catch (err: any) {
      console.error('Error creating setup intent:', err);
      if (onError) onError(err);
      // Fallback: we can still try to create payment method directly
    } finally {
      setLoadingSetupIntent(false);
    }
  };

  const handleAddPaymentMethod = async (paymentMethodId: string, paymentMethodType: string) => {
    setIsAddingCard(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Please sign in to add a payment method.');
      }

      // Map Stripe payment method type to our type
      const mapStripeType = (type: string): PaymentMethod['type'] => {
        switch (type) {
          case 'card':
            return 'card';
          case 'us_bank_account':
            return 'ach_debit';
          case 'link':
            return 'link';
          case 'apple_pay':
            return 'apple_pay';
          case 'google_pay':
            return 'google_pay';
          case 'paypal':
            return 'paypal';
          case 'venmo':
            return 'venmo';
          default:
            return 'card';
        }
      };

      const mappedType = mapStripeType(paymentMethodType);

      // Get payment method details from Stripe via edge function
      // Note: This is just for saving/attaching, NOT for processing payments
      const { data: stripeData, error: stripeError } = await supabase.functions.invoke('create-stripe-payment-method', {
        body: {
          paymentMethodId: paymentMethodId,
          billingAddress: customerAddress ? {
            addressLine1: customerAddress.street_address || '',
            city: customerAddress.city || '',
            state: customerAddress.state || '',
            postalCode: customerAddress.zip_code || '',
            country: 'US',
          } : undefined,
        },
      });

      if (stripeError || (stripeData && (stripeData as any).error)) {
        const errorMsg = (stripeData as any)?.error || stripeError?.message || 'Failed to save payment method';
        // Make sure error messages don't sound like payment failures
        if (errorMsg.toLowerCase().includes('payment failed') || errorMsg.toLowerCase().includes('declined')) {
          throw new Error('Unable to save payment method. Please check your details and try again.');
        }
        throw new Error(errorMsg);
      }

      if (!stripeData?.paymentMethodID) {
        throw new Error('Payment method was not created. Please try again.');
      }

      // Extract payment method details based on type
      let last4 = '****';
      let brand: string | null = null;
      let bank_name: string | null = null;
      let account_type: 'checking' | 'savings' | null = null;
      let exp_month: number | null = null;
      let exp_year: number | null = null;

      if (mappedType === 'card' && stripeData.card) {
        last4 = stripeData.card.last4 || '****';
        brand = stripeData.card.brand || null;
        exp_month = stripeData.card.exp_month || null;
        exp_year = stripeData.card.exp_year || null;
      } else if (mappedType === 'ach_debit' && stripeData.us_bank_account) {
        last4 = stripeData.us_bank_account.last4 || '****';
        bank_name = stripeData.us_bank_account.bank_name || null;
        account_type = stripeData.us_bank_account.account_type as 'checking' | 'savings' || null;
      } else {
        last4 = stripeData.last4 || stripeData.account_last4 || '****';
        brand = stripeData.brand || null;
      }

      const { data: savedMethod, error: saveError } = await supabase
        .from('payment_methods')
        .insert({
          user_id: user.id,
          type: mappedType,
          provider: 'stripe',
          token: stripeData.paymentMethodID,
          stripe_payment_method_id: stripeData.paymentMethodID,
          last4,
          brand,
          bank_name,
          account_type,
          exp_month,
          exp_year,
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
      setSetupIntentClientSecret(null);
    } catch (error: any) {
      console.error('Error adding payment method:', error);
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

              {loadingSetupIntent ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                  <span className="ml-3 text-sm text-gray-600">Setting up payment form...</span>
                </div>
              ) : stripePromise && setupIntentClientSecret ? (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret: setupIntentClientSecret,
                    appearance: {
                      theme: 'stripe',
                      variables: {
                        colorPrimary: '#f97316',
                        colorBackground: '#ffffff',
                        colorText: '#1f2937',
                        colorDanger: '#ef4444',
                        fontFamily: 'system-ui, sans-serif',
                        spacingUnit: '4px',
                        borderRadius: '8px',
                      },
                    },
                  }}
                >
                  <PaymentForm
                    onSubmit={handleAddPaymentMethod}
                    onCancel={() => setShowAddForm(false)}
                    isSubmitting={isAddingCard}
                    customerAddress={customerAddress}
                    clientSecret={setupIntentClientSecret}
                  />
                </Elements>
              ) : stripePromise ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    Unable to initialize payment form. Please try again.
                  </p>
                </div>
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
                    const methodColor = getPaymentMethodColor(method.type, method.brand);

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
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${methodColor.bg} ${methodColor.text}`}>
                          {getPaymentMethodIcon(method.type)}
                        </div>

                        {/* Details */}
                        <div className="flex-1 text-left min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-semibold text-gray-900 text-sm">
                              {getPaymentMethodName(method.type, method.brand, method.last4)}
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
                            {method.type === 'ach_debit' && method.account_type && (
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
                  <span className="font-semibold text-gray-900 text-sm">Add Payment Method</span>
                  <p className="text-xs text-gray-500 mt-0.5">Card, Apple Pay, Google Pay, Link, or bank account</p>
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

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Building2, ChevronLeft } from 'lucide-react';
import { validateRoutingNumber } from '@/utils/bankingValidation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EnhancedBankingStepProps {
  data: any;
  updateData: (updates: any) => void;
  onNext: () => void;
  onBack: () => void;
}

export function EnhancedBankingStep({ data, updateData, onNext, onBack }: EnhancedBankingStepProps) {
  const [showManualBankEntry, setShowManualBankEntry] = useState(false);
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);
  
  const isRoutingNumberValid = data.routingNumber?.length === 9 && validateRoutingNumber(data.routingNumber);
  const showRoutingError = data.routingNumber?.length === 9 && !isRoutingNumberValid;

  const handleStripeConnect = async () => {
    try {
      setIsConnectingStripe(true);
      
      // Get user session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        toast.error('Please sign in to continue');
        return;
      }

      // Create Financial Connections session
      const { data: result, error } = await supabase.functions.invoke('create-stripe-financial-connection', {
        body: {
          restaurantId: data.restaurantId || user.id,
        },
      });

      if (error) throw error;

      // Load Stripe.js
      const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_live_51SKpbkLTHUzAWwQrpeD8B1TXtBgH1aN2q0tM8CuobPHtAMeBZI6lqem4Kb7zcKI7RaAG9QT9806lxchjZMHrSbx100WC0Vq7Oe';
      const stripe = await (window as any).Stripe(stripePublishableKey);
      
      // Launch the Financial Connections flow
      const { financialConnectionsSession, error: sessionError } = await stripe.collectFinancialConnectionsAccounts({
        clientSecret: result.clientSecret,
      });

      if (sessionError) {
        throw sessionError;
      }

      if (financialConnectionsSession) {
        // Store the connected account
        updateData({ 
          stripeFinancialConnectionId: financialConnectionsSession.id,
          bankConnected: true 
        });
        toast.success('Bank account connected successfully!');
      }
    } catch (error) {
      console.error('Error connecting to Stripe:', error);
      toast.error('Failed to connect bank account. Please try again.');
    } finally {
      setIsConnectingStripe(false);
    }
  };
  
  const isValid = 
    data.legalName?.trim() &&
    data.dateOfBirth &&
    data.legalBusinessName?.trim() &&
    data.businessType &&
    data.locationCount &&
    (showManualBankEntry ? (
      data.bankAccountType &&
      isRoutingNumberValid &&
      data.accountNumber?.length >= 4
    ) : true) &&
    data.termsAgreed;

  return (
    <div className="space-y-4 sm:space-y-6 pb-6 sm:pb-8">
      <div className="mb-4 sm:mb-6">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3 sm:mb-4 touch-manipulation"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <h2 className="text-2xl sm:text-3xl font-bold mb-2">Last step — verify your payout info</h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Add your business and bank account info to receive payouts.
        </p>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {/* Bank Account Information */}
        <div className="space-y-3 sm:space-y-4">
          <h3 className="text-base sm:text-lg font-semibold">Bank account information</h3>
          
          {!showManualBankEntry ? (
            <div className="border rounded-lg p-3 sm:p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <Building2 className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base">Connect to your bank</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Use Stripe's secure setup to{' '}
                      <button 
                        className="text-blue-600 hover:underline touch-manipulation"
                        onClick={() => setShowManualBankEntry(true)}
                      >
                        link
                      </button>{' '}
                      your bank.
                    </p>
                    <div className="mt-2">
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        Powered by Stripe
                      </span>
                    </div>
                  </div>
                </div>
                <Button 
                  variant="outline"
                  onClick={handleStripeConnect}
                  disabled={isConnectingStripe}
                  className="w-full sm:w-auto touch-manipulation"
                  size="sm"
                >
                  {isConnectingStripe ? 'Connecting...' : 'Connect'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="border rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bankAccountType" className="text-sm sm:text-base">Account Type *</Label>
                <Select
                  value={data.bankAccountType || ''}
                  onValueChange={(value) => updateData({ bankAccountType: value })}
                >
                  <SelectTrigger id="bankAccountType" className="h-10 sm:h-11 touch-manipulation">
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Checking Account</SelectItem>
                    <SelectItem value="savings">Savings Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="routingNumber" className="text-sm sm:text-base">Routing Number *</Label>
                <Input
                  id="routingNumber"
                  type="text"
                  maxLength={9}
                  placeholder="123456789"
                  value={data.routingNumber || ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    updateData({ routingNumber: value });
                  }}
                  className={`h-10 sm:h-11 ${showRoutingError ? 'border-red-500' : ''}`}
                />
                {showRoutingError ? (
                  <p className="text-xs text-red-600">Invalid routing number. Please enter a valid 9-digit bank routing number.</p>
                ) : (
                  <p className="text-xs text-muted-foreground">9-digit bank routing number</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountNumber" className="text-sm sm:text-base">Account Number *</Label>
                <Input
                  id="accountNumber"
                  type="password"
                  placeholder="••••••••••"
                  value={data.accountNumber || ''}
                  onChange={(e) => updateData({ accountNumber: e.target.value })}
                  className="h-10 sm:h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountNumberConfirm" className="text-sm sm:text-base">Confirm Account Number *</Label>
                <Input
                  id="accountNumberConfirm"
                  type="text"
                  placeholder="Re-enter account number"
                  value={data.accountNumberConfirm || ''}
                  onChange={(e) => updateData({ accountNumberConfirm: e.target.value })}
                  className="h-10 sm:h-11"
                />
                {data.accountNumber && data.accountNumberConfirm && data.accountNumber !== data.accountNumberConfirm && (
                  <p className="text-xs text-red-600">Account numbers don't match</p>
                )}
              </div>
            </div>
          )}
          
          {!showManualBankEntry && (
            <button
              onClick={() => setShowManualBankEntry(true)}
              className="text-xs sm:text-sm text-blue-600 hover:underline touch-manipulation"
            >
              Enter bank info manually
            </button>
          )}
        </div>

        {/* Business Information */}
        <div className="space-y-3 sm:space-y-4">
          <h3 className="text-base sm:text-lg font-semibold">Business information</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            We're required to collect and verify your business info for compliance and tax purposes.
          </p>

          <div className="space-y-2">
            <Label htmlFor="legalName" className="text-sm sm:text-base">Your legal name *</Label>
            <Input
              id="legalName"
              type="text"
              placeholder="Jane Smith"
              value={data.legalName || ''}
              onChange={(e) => updateData({ legalName: e.target.value })}
              className="h-10 sm:h-11"
            />
            <p className="text-xs text-muted-foreground">As it appears on legal or tax documents</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateOfBirth" className="text-sm sm:text-base">Date of birth *</Label>
            <Input
              id="dateOfBirth"
              type="date"
              placeholder="MM/DD/YYYY"
              value={data.dateOfBirth || ''}
              onChange={(e) => updateData({ dateOfBirth: e.target.value })}
              className="h-10 sm:h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="legalBusinessName" className="text-sm sm:text-base">Legal business name *</Label>
            <Input
              id="legalBusinessName"
              type="text"
              placeholder="10000 Ontario, Inc."
              value={data.legalBusinessName || ''}
              onChange={(e) => updateData({ legalBusinessName: e.target.value })}
              className="h-10 sm:h-11"
            />
            <p className="text-xs text-muted-foreground">As it appears on legal or tax documents</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessType" className="text-sm sm:text-base">Type of business *</Label>
            <Select
              value={data.businessType || ''}
              onValueChange={(value) => updateData({ businessType: value })}
            >
              <SelectTrigger id="businessType" className="h-10 sm:h-11 touch-manipulation">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brick_and_mortar">Brick and mortar</SelectItem>
                <SelectItem value="food_truck">Food Truck</SelectItem>
                <SelectItem value="ghost_kitchen">Ghost Kitchen</SelectItem>
                <SelectItem value="pop_up">Pop-up</SelectItem>
                <SelectItem value="catering">Catering</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="websiteUrl" className="text-sm sm:text-base">
              Website URL <span className="text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Input
              id="websiteUrl"
              type="url"
              placeholder="https://www.example.com"
              value={data.websiteUrl || ''}
              onChange={(e) => updateData({ websiteUrl: e.target.value })}
              className="h-10 sm:h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="locationCount" className="text-sm sm:text-base">How many locations do you have? *</Label>
            <Select
              value={data.locationCount || ''}
              onValueChange={(value) => updateData({ locationCount: value })}
            >
              <SelectTrigger id="locationCount" className="h-10 sm:h-11 touch-manipulation">
                <SelectValue placeholder="Select a number" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3-5">3-5</SelectItem>
                <SelectItem value="6-10">6-10</SelectItem>
                <SelectItem value="11-20">11-20</SelectItem>
                <SelectItem value="21+">21+</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="einTaxId" className="text-sm sm:text-base">
              EIN/Tax ID number <span className="text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Input
              id="einTaxId"
              type="text"
              placeholder="XX-XXXXXXX"
              maxLength={10}
              value={data.einTaxId || ''}
              onChange={(e) => {
                const value = e.target.value.replace(/[^\d-]/g, '');
                updateData({ einTaxId: value });
              }}
              className="h-10 sm:h-11"
            />
            <p className="text-xs text-muted-foreground">
              Optional for setup. Required once your sales exceed IRS reporting thresholds.
            </p>
          </div>
        </div>

        {/* Terms Agreement */}
        <div className="flex items-start gap-2 pt-3 sm:pt-4">
          <Checkbox
            id="termsAgreed"
            checked={data.termsAgreed || false}
            onCheckedChange={(checked) => updateData({ termsAgreed: checked })}
            className="mt-0.5"
          />
          <Label htmlFor="termsAgreed" className="text-xs sm:text-sm cursor-pointer leading-normal">
            By clicking 'Finish setup', I agree to 'Crave'N Merchant Sign-Up Sheet' including the{' '}
            <a href="/terms-of-service" target="_blank" className="text-blue-600 hover:underline">
              Terms of Service
            </a>{' '}
            incorporated therein.
          </Label>
        </div>
      </div>

      <div className="pt-4 sm:pt-6 sticky bottom-0 bg-background pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sm:static">
        <Button 
          onClick={onNext} 
          disabled={!isValid || (showManualBankEntry && data.accountNumber !== data.accountNumberConfirm)}
          className="w-full h-12 sm:h-11 bg-red-600 hover:bg-red-700 text-base sm:text-sm touch-manipulation"
        >
          Finish setup
        </Button>
      </div>
    </div>
  );
}

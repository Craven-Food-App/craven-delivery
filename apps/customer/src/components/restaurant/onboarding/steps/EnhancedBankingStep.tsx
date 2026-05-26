import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronLeft } from 'lucide-react';
import { validateRoutingNumber } from '@/utils/bankingValidation';

interface EnhancedBankingStepProps {
  data: any;
  updateData: (updates: any) => void;
  onNext: () => void;
  onBack: () => void;
}

export function EnhancedBankingStep({ data, updateData, onNext, onBack }: EnhancedBankingStepProps) {
  const isRoutingNumberValid = data.routingNumber?.length === 9 && validateRoutingNumber(data.routingNumber);
  const showRoutingError = data.routingNumber?.length === 9 && !isRoutingNumberValid;
  
  const isValid = 
    data.legalName?.trim() &&
    data.dateOfBirth &&
    data.legalBusinessName?.trim() &&
    data.businessType &&
    data.locationCount &&
    data.bankAccountType &&
    isRoutingNumberValid &&
    data.accountNumber?.length >= 4 &&
    data.accountNumber === data.accountNumberConfirm &&
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
          Add your business and bank account info. You'll complete payment setup with Stripe Connect after approval.
        </p>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {/* Bank Account Information */}
        <div className="space-y-3 sm:space-y-4">
          <h3 className="text-base sm:text-lg font-semibold">Bank account information</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            This information will be used for payouts. You'll complete secure payment setup with Stripe Connect after your account is approved.
          </p>
          
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
                type="password"
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
            By clicking 'Finish setup', I agree to 'Crave'n Merchant Sign-Up Sheet' including the{' '}
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
          disabled={!isValid}
          className="w-full h-12 sm:h-11 bg-red-600 hover:bg-red-700 text-base sm:text-sm touch-manipulation"
        >
          Finish setup
        </Button>
      </div>
    </div>
  );
}

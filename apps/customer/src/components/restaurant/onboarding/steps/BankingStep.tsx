import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowRight, ArrowLeft, DollarSign, Shield } from 'lucide-react';
import { OnboardingData } from '../RestaurantOnboardingWizard';
import { Card } from '@/components/ui/card';

interface BankingStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function BankingStep({ data, updateData, onNext, onBack }: BankingStepProps) {
  const isValid =
    data.bankAccountType &&
    data.routingNumber.length === 9 &&
    data.accountNumber.length >= 4 &&
    data.w9Completed;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <DollarSign className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-3xl font-bold mb-2">Banking Information</h2>
        <p className="text-muted-foreground">
          Set up how you'll receive payments from deliveries
        </p>
      </div>

      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900">Your information is secure</p>
            <p className="text-xs text-blue-700 mt-1">
              All banking information is encrypted and stored securely. We use bank-level
              security to protect your data.
            </p>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <div>
          <Label htmlFor="bankAccountType">Account Type *</Label>
          <Select
            value={data.bankAccountType}
            onValueChange={(value: any) => updateData({ bankAccountType: value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select account type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="checking">Checking</SelectItem>
              <SelectItem value="savings">Savings</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="routingNumber">Routing Number *</Label>
            <Input
              id="routingNumber"
              value={data.routingNumber}
              onChange={(e) => updateData({ routingNumber: e.target.value.replace(/\D/g, '').slice(0, 9) })}
              placeholder="123456789"
              className="mt-1"
              maxLength={9}
            />
            <p className="text-xs text-muted-foreground mt-1">9-digit bank routing number</p>
          </div>

          <div>
            <Label htmlFor="accountNumber">Account Number *</Label>
            <Input
              id="accountNumber"
              type="password"
              value={data.accountNumber}
              onChange={(e) => updateData({ accountNumber: e.target.value.replace(/\D/g, '') })}
              placeholder="••••••••"
              className="mt-1"
            />
          </div>
        </div>

        <div className="border-t pt-4 mt-6">
          <h3 className="font-semibold mb-3">Tax Information</h3>
          
          <div className="flex items-start space-x-3 p-4 border rounded-lg">
            <Checkbox
              id="w9"
              checked={data.w9Completed}
              onCheckedChange={(checked) => updateData({ w9Completed: checked as boolean })}
            />
            <div className="flex-1">
              <Label htmlFor="w9" className="cursor-pointer">
                <p className="font-medium">W-9 Tax Form *</p>
                <p className="text-sm text-muted-foreground mt-1">
                  I confirm that I will provide a completed W-9 form for tax reporting purposes.
                  This will be required before your first payout.
                </p>
              </Label>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-900">
            <strong>💰 Payout Schedule:</strong> Earnings are deposited weekly, every Monday,
            for the previous week's deliveries (Sunday-Saturday).
          </p>
        </div>
      </div>

      <div className="flex justify-between pt-6 border-t">
        <Button onClick={onBack} variant="outline" size="lg">
          <ArrowLeft className="mr-2 w-4 h-4" />
          Back
        </Button>
        <Button onClick={onNext} disabled={!isValid} size="lg">
          Continue
          <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

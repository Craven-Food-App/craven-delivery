import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, Store } from 'lucide-react';
import { OnboardingData } from '../RestaurantOnboardingWizard';

interface BasicInfoStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export function BasicInfoStep({ data, updateData, onNext }: BasicInfoStepProps) {
  const isValid =
    data.restaurantName.trim().length >= 2 &&
    data.contactName.trim().length >= 2 &&
    data.contactPhone.trim().length >= 10 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactEmail);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Store className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-3xl font-bold mb-2">Let's get started</h2>
        <p className="text-muted-foreground">
          Tell us a bit about your restaurant and who we'll be working with
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="restaurantName">Restaurant Name *</Label>
          <Input
            id="restaurantName"
            value={data.restaurantName}
            onChange={(e) => updateData({ restaurantName: e.target.value })}
            placeholder="e.g., Bella's Italian Kitchen"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="contactName">Primary Contact Name *</Label>
          <Input
            id="contactName"
            value={data.contactName}
            onChange={(e) => updateData({ contactName: e.target.value })}
            placeholder="e.g., John Smith"
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            This person will receive important updates about your partnership
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="contactPhone">Phone Number *</Label>
            <Input
              id="contactPhone"
              type="tel"
              value={data.contactPhone}
              onChange={(e) => updateData({ contactPhone: e.target.value })}
              placeholder="(555) 123-4567"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="contactEmail">Email Address *</Label>
            <Input
              id="contactEmail"
              type="email"
              value={data.contactEmail}
              onChange={(e) => updateData({ contactEmail: e.target.value })}
              placeholder="john@restaurant.com"
              className="mt-1"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-6 border-t">
        <Button onClick={onNext} disabled={!isValid} size="lg" className="min-w-[150px]">
          Continue
          <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

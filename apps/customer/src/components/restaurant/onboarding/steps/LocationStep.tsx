import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, ArrowLeft, MapPin } from 'lucide-react';
import { OnboardingData } from '../RestaurantOnboardingWizard';
import { AddressAutocomplete } from '@/components/common/AddressAutocomplete';

interface LocationStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function LocationStep({ data, updateData, onNext, onBack }: LocationStepProps) {
  const isValid =
    data.streetAddress.trim().length >= 5 &&
    data.city.trim().length >= 2 &&
    data.state.trim().length >= 2 &&
    data.zipCode.trim().length >= 5;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <MapPin className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-3xl font-bold mb-2">Restaurant Location</h2>
        <p className="text-muted-foreground">
          Where can customers find your delicious food?
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="streetAddress">Street Address *</Label>
          <AddressAutocomplete
            value={data.streetAddress}
            onChange={(value) => updateData({ streetAddress: value })}
            onAddressParsed={(parsed) => {
              updateData({
                streetAddress: parsed.street,
                city: parsed.city,
                state: parsed.state,
                zipCode: parsed.zipCode
              });
            }}
            placeholder="123 Main Street"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              value={data.city}
              onChange={(e) => updateData({ city: e.target.value })}
              placeholder="San Francisco"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="state">State *</Label>
            <Input
              id="state"
              value={data.state}
              onChange={(e) => updateData({ state: e.target.value.toUpperCase().slice(0, 2) })}
              placeholder="CA"
              className="mt-1"
              maxLength={2}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="zipCode">ZIP Code *</Label>
          <Input
            id="zipCode"
            value={data.zipCode}
            onChange={(e) => updateData({ zipCode: e.target.value.replace(/\D/g, '').slice(0, 5) })}
            placeholder="94102"
            className="mt-1"
            maxLength={5}
          />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <p className="text-sm text-blue-900">
            <strong>📍 Note:</strong> This address will be used for deliveries and shown to customers.
            Make sure it's accurate!
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

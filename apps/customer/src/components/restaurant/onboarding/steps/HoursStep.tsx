import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowRight, ArrowLeft, Clock } from 'lucide-react';
import { OnboardingData } from '../RestaurantOnboardingWizard';

interface HoursStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

export function HoursStep({ data, updateData, onNext, onBack }: HoursStepProps) {
  const updateHours = (day: string, field: string, value: any) => {
    updateData({
      hours: {
        ...data.hours,
        [day]: {
          ...data.hours[day],
          [field]: value,
        },
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Clock className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-3xl font-bold mb-2">Operating Hours</h2>
        <p className="text-muted-foreground">
          When is your restaurant open for business?
        </p>
      </div>

      <div className="space-y-4">
        {DAYS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-4 p-4 border rounded-lg">
            <div className="w-32">
              <p className="font-medium">{label}</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                checked={data.hours[key].isOpen}
                onCheckedChange={(checked) => updateHours(key, 'isOpen', checked)}
              />
              <span className="text-sm text-muted-foreground">
                {data.hours[key].isOpen ? 'Open' : 'Closed'}
              </span>
            </div>

            {data.hours[key].isOpen && (
              <>
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={data.hours[key].openTime}
                    onChange={(e) => updateHours(key, 'openTime', e.target.value)}
                    className="w-32"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="time"
                    value={data.hours[key].closeTime}
                    onChange={(e) => updateHours(key, 'closeTime', e.target.value)}
                    className="w-32"
                  />
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-sm text-amber-900">
          <strong>💡 Tip:</strong> You can always update your hours later in the dashboard.
          Customers will see these hours when browsing your restaurant.
        </p>
      </div>

      <div className="flex justify-between pt-6 border-t">
        <Button onClick={onBack} variant="outline" size="lg">
          <ArrowLeft className="mr-2 w-4 h-4" />
          Back
        </Button>
        <Button onClick={onNext} size="lg">
          Continue
          <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

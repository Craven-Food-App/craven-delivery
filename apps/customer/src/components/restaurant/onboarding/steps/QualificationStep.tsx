import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { CheckCircle2 } from 'lucide-react';

interface QualificationStepProps {
  data: any;
  updateData: (updates: any) => void;
  onNext: () => void;
  onBack?: () => void;
  isFirstStep?: boolean;
  isLastStep?: boolean;
}

export function QualificationStep({ data, updateData, onNext }: QualificationStepProps) {
  const isValid = 
    data.restaurantType &&
    data.hasPhysicalLocation !== undefined &&
    data.expectedMonthlyOrders &&
    data.posSystem !== undefined;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Let's Get Started</h2>
        <p className="text-gray-600">Help us understand your restaurant better</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="restaurantType">What type of restaurant do you operate? *</Label>
          <Select
            value={data.restaurantType || ''}
            onValueChange={(value) => updateData({ restaurantType: value })}
          >
            <SelectTrigger id="restaurantType">
              <SelectValue placeholder="Select restaurant type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full_service">Full Service Restaurant</SelectItem>
              <SelectItem value="fast_casual">Fast Casual</SelectItem>
              <SelectItem value="quick_service">Quick Service (Fast Food)</SelectItem>
              <SelectItem value="cafe">Café or Coffee Shop</SelectItem>
              <SelectItem value="bakery">Bakery</SelectItem>
              <SelectItem value="ghost_kitchen">Ghost Kitchen/Virtual Brand</SelectItem>
              <SelectItem value="catering">Catering Only</SelectItem>
              <SelectItem value="food_truck">Food Truck</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="hasPhysicalLocation">Do you have a physical location? *</Label>
          <Select
            value={data.hasPhysicalLocation?.toString() || ''}
            onValueChange={(value) => updateData({ hasPhysicalLocation: value === 'true' })}
          >
            <SelectTrigger id="hasPhysicalLocation">
              <SelectValue placeholder="Select option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Yes, operating now</SelectItem>
              <SelectItem value="false">No, opening soon</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="expectedMonthlyOrders">Expected monthly order volume *</Label>
          <Select
            value={data.expectedMonthlyOrders?.toString() || ''}
            onValueChange={(value) => updateData({ expectedMonthlyOrders: parseInt(value) })}
          >
            <SelectTrigger id="expectedMonthlyOrders">
              <SelectValue placeholder="Select order volume" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="50">0-50 orders</SelectItem>
              <SelectItem value="100">50-100 orders</SelectItem>
              <SelectItem value="250">100-250 orders</SelectItem>
              <SelectItem value="500">250-500 orders</SelectItem>
              <SelectItem value="1000">500-1000 orders</SelectItem>
              <SelectItem value="2000">1000+ orders</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="posSystem">Current POS System (if any) *</Label>
          <Select
            value={data.posSystem || ''}
            onValueChange={(value) => updateData({ posSystem: value })}
          >
            <SelectTrigger id="posSystem">
              <SelectValue placeholder="Select POS system" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No POS system</SelectItem>
              <SelectItem value="square">Square</SelectItem>
              <SelectItem value="toast">Toast</SelectItem>
              <SelectItem value="clover">Clover</SelectItem>
              <SelectItem value="lightspeed">Lightspeed</SelectItem>
              <SelectItem value="shopify">Shopify</SelectItem>
              <SelectItem value="touchbistro">TouchBistro</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-semibold text-blue-900 mb-1">What happens next?</p>
              <ul className="text-blue-800 space-y-1">
                <li>• Complete your restaurant profile (~10 minutes)</li>
                <li>• Upload required business documents</li>
                <li>• Build your menu or import from your POS</li>
                <li>• We'll review and approve within 24-48 hours</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button 
          onClick={onNext} 
          disabled={!isValid}
          className="px-8"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}

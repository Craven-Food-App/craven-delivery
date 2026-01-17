import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Store, MapPin, Phone, Mail, Clock, Users, Package, 
  Plus, Check, ArrowRight, ArrowLeft, Building2, Navigation,
  User, Star, Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StoreSetupData {
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string;
  manager_name: string;
  manager_phone: string;
  manager_email: string;
  delivery_radius_miles: number;
  is_primary: boolean;
  operating_hours: {
    monday: { open: string; close: string; closed: boolean };
    tuesday: { open: string; close: string; closed: boolean };
    wednesday: { open: string; close: string; closed: boolean };
    thursday: { open: string; close: string; closed: boolean };
    friday: { open: string; close: string; closed: boolean };
    saturday: { open: string; close: string; closed: boolean };
    sunday: { open: string; close: string; closed: boolean };
  };
}

interface StoreSetupWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

export default function StoreSetupWizard({ onComplete, onCancel }: StoreSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [storeData, setStoreData] = useState<StoreSetupData>({
    name: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    email: '',
    manager_name: '',
    manager_phone: '',
    manager_email: '',
    delivery_radius_miles: 5,
    is_primary: true,
    operating_hours: {
      monday: { open: '09:00', close: '22:00', closed: false },
      tuesday: { open: '09:00', close: '22:00', closed: false },
      wednesday: { open: '09:00', close: '22:00', closed: false },
      thursday: { open: '09:00', close: '22:00', closed: false },
      friday: { open: '09:00', close: '23:00', closed: false },
      saturday: { open: '09:00', close: '23:00', closed: false },
      sunday: { open: '10:00', close: '21:00', closed: false }
    }
  });

  const { toast } = useToast();

  const steps = [
    { id: 1, title: 'Basic Information', description: 'Store name and location details' },
    { id: 2, title: 'Contact Information', description: 'Phone, email, and manager details' },
    { id: 3, title: 'Operating Hours', description: 'Set your store hours for each day' },
    { id: 4, title: 'Delivery Settings', description: 'Configure delivery radius and preferences' },
    { id: 5, title: 'Review & Complete', description: 'Review all information and create store' }
  ];

  const progress = (currentStep / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get restaurant ID
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!restaurant) return;

      const { error } = await supabase
        .from('store_locations')
        .insert({
          restaurant_id: restaurant.id,
          ...storeData
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Store location created successfully!"
      });

      onComplete();
    } catch (error) {
      console.error('Error creating store:', error);
      toast({
        title: "Error",
        description: "Failed to create store location",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="store-name">Store Name</Label>
              <Input
                id="store-name"
                value={storeData.name}
                onChange={(e) => setStoreData({ ...storeData, name: e.target.value })}
                placeholder="e.g., Downtown Location, Mall Location"
              />
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={storeData.address}
                onChange={(e) => setStoreData({ ...storeData, address: e.target.value })}
                placeholder="123 Main Street"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={storeData.city}
                  onChange={(e) => setStoreData({ ...storeData, city: e.target.value })}
                  placeholder="City"
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={storeData.state}
                  onChange={(e) => setStoreData({ ...storeData, state: e.target.value })}
                  placeholder="State"
                />
              </div>
              <div>
                <Label htmlFor="zip">ZIP Code</Label>
                <Input
                  id="zip"
                  value={storeData.zip_code}
                  onChange={(e) => setStoreData({ ...storeData, zip_code: e.target.value })}
                  placeholder="12345"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Store Phone</Label>
                <Input
                  id="phone"
                  value={storeData.phone}
                  onChange={(e) => setStoreData({ ...storeData, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <Label htmlFor="email">Store Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={storeData.email}
                  onChange={(e) => setStoreData({ ...storeData, email: e.target.value })}
                  placeholder="store@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="manager-name">Manager Name</Label>
                <Input
                  id="manager-name"
                  value={storeData.manager_name}
                  onChange={(e) => setStoreData({ ...storeData, manager_name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <Label htmlFor="manager-phone">Manager Phone</Label>
                <Input
                  id="manager-phone"
                  value={storeData.manager_phone}
                  onChange={(e) => setStoreData({ ...storeData, manager_phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="manager-email">Manager Email</Label>
              <Input
                id="manager-email"
                type="email"
                value={storeData.manager_email}
                onChange={(e) => setStoreData({ ...storeData, manager_email: e.target.value })}
                placeholder="manager@example.com"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            {Object.entries(storeData.operating_hours).map(([day, hours]) => (
              <div key={day} className="flex items-center space-x-4">
                <div className="w-24">
                  <Label className="capitalize">{day}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={!hours.closed}
                    onCheckedChange={(checked) => 
                      setStoreData({
                        ...storeData,
                        operating_hours: {
                          ...storeData.operating_hours,
                          [day]: { ...hours, closed: !checked }
                        }
                      })
                    }
                  />
                  <span className="text-sm text-gray-500">
                    {hours.closed ? 'Closed' : 'Open'}
                  </span>
                </div>
                {!hours.closed && (
                  <div className="flex items-center space-x-2">
                    <Input
                      type="time"
                      value={hours.open}
                      onChange={(e) => 
                        setStoreData({
                          ...storeData,
                          operating_hours: {
                            ...storeData.operating_hours,
                            [day]: { ...hours, open: e.target.value }
                          }
                        })
                      }
                      className="w-32"
                    />
                    <span>to</span>
                    <Input
                      type="time"
                      value={hours.close}
                      onChange={(e) => 
                        setStoreData({
                          ...storeData,
                          operating_hours: {
                            ...storeData.operating_hours,
                            [day]: { ...hours, close: e.target.value }
                          }
                        })
                      }
                      className="w-32"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="delivery-radius">Delivery Radius (miles)</Label>
              <Input
                id="delivery-radius"
                type="number"
                value={storeData.delivery_radius_miles}
                onChange={(e) => setStoreData({ ...storeData, delivery_radius_miles: parseInt(e.target.value) })}
                min="1"
                max="50"
              />
              <p className="text-sm text-gray-500 mt-1">
                Set the maximum distance you'll deliver to from this location
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is-primary"
                checked={storeData.is_primary}
                onCheckedChange={(checked) => setStoreData({ ...storeData, is_primary: checked })}
              />
              <Label htmlFor="is-primary">Set as primary location</Label>
            </div>
            <p className="text-sm text-gray-500">
              Primary locations receive orders by default and are shown first to customers
            </p>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Store Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Name:</strong> {storeData.name}
                </div>
                <div>
                  <strong>Address:</strong> {storeData.address}
                </div>
                <div>
                  <strong>City:</strong> {storeData.city}, {storeData.state} {storeData.zip_code}
                </div>
                <div>
                  <strong>Phone:</strong> {storeData.phone}
                </div>
                <div>
                  <strong>Email:</strong> {storeData.email}
                </div>
                <div>
                  <strong>Manager:</strong> {storeData.manager_name}
                </div>
                <div>
                  <strong>Delivery Radius:</strong> {storeData.delivery_radius_miles} miles
                </div>
                <div>
                  <strong>Primary Location:</strong> {storeData.is_primary ? 'Yes' : 'No'}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Operating Hours</h3>
              <div className="space-y-1 text-sm">
                {Object.entries(storeData.operating_hours).map(([day, hours]) => (
                  <div key={day} className="flex justify-between">
                    <span className="capitalize">{day}:</span>
                    <span>
                      {hours.closed ? 'Closed' : `${hours.open} - ${hours.close}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Store className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <CardTitle>Add New Store Location</CardTitle>
              <CardDescription>
                {steps[currentStep - 1].description}
              </CardDescription>
            </div>
          </div>
          <Progress value={progress} className="mt-4" />
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {renderStepContent()}
            
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={currentStep === 1 ? onCancel : handlePrevious}
                disabled={loading}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {currentStep === 1 ? 'Cancel' : 'Previous'}
              </Button>
              
              {currentStep === steps.length ? (
                <Button
                  onClick={handleComplete}
                  disabled={loading}
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating Store...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Create Store Location
                    </>
                  )}
                </Button>
              ) : (
                <Button onClick={handleNext} className="bg-red-500 hover:bg-red-600 text-white">
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

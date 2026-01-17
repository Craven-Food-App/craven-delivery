import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Car,
  MapPin,
  DollarSign,
  Clock,
  Navigation,
  Smartphone,
  Star,
  Plus
} from 'lucide-react';
import { MockEnhancedDriverFlow } from './MockEnhancedDriverFlow';

export const TestDriver = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showMockFlow, setShowMockFlow] = useState(false);
  const { toast } = useToast();

  const createTestDriverProfile = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user logged in');

      // Create driver profile
      const { error: profileError } = await supabase
        .from('driver_profiles')
        .upsert({
          user_id: user.id,
          vehicle_type: 'car',
          vehicle_make: 'Toyota',
          vehicle_model: 'Camry',
          vehicle_year: 2020,
          license_plate: 'TEST123',
          is_available: true,
          status: 'online',
          rating: 4.8,
          total_deliveries: 50
        });

      if (profileError) throw profileError;

      // Update user profile role
      await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          full_name: 'Test Driver',
          role: 'driver'
        });
      
      toast({
        title: 'Test driver profile created',
        description: 'Set up complete driver profile for testing',
      });
    } catch (error: any) {
      toast({
        title: 'Error creating driver profile',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createTestOrder = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user logged in');

      // Get first restaurant for test order
      const { data: restaurants } = await supabase
        .from('restaurants')
        .select('id')
        .limit(1);

      if (!restaurants || restaurants.length === 0) {
        throw new Error('No restaurants found. Create a test restaurant first.');
      }

      const { data: orderData, error } = await supabase
        .from('orders')
        .insert({
          restaurant_id: restaurants[0].id,
          customer_id: user.id,
          subtotal_cents: 2500,
          tax_cents: 200,
          delivery_fee_cents: 300,
          tip_cents: 500,
          total_cents: 3500,
          payout_cents: 800, // Driver payout
          distance_km: 3.5,
          order_status: 'pending',
          pickup_address: {
            street: '123 Restaurant Street',
            city: 'Test City',
            state: 'TX',
            zip: '12345'
          },
          dropoff_address: {
            street: '456 Customer Street',
            city: 'Test City',
            state: 'TX',
            zip: '12345'
          },
          delivery_address: {
            street: '456 Customer Street',
            city: 'Test City',
            state: 'TX',
            zip: '12345'
          }
        })
        .select()
        .single();

      if (error) throw error;

      // Trigger auto-assignment to notify drivers
      if (orderData) {
        try {
          const { error: assignError } = await supabase.functions.invoke('auto-assign-orders', {
            body: { orderId: orderData.id }
          });
          
          if (assignError) {
            console.error('Auto-assignment error:', assignError);
          }
        } catch (err) {
          console.error('Failed to trigger auto-assignment:', err);
        }
      }
      
      toast({
        title: 'Test order created',
        description: 'Added a test order and notified available drivers',
      });
    } catch (error: any) {
      toast({
        title: 'Error creating test order',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testingScenarios = [
    {
      title: 'Order Management',
      description: 'Test order acceptance and delivery flow',
      icon: MapPin,
      tests: [
        'View available orders on map',
        'Accept delivery requests',
        'Navigate to pickup location',
        'Mark order as picked up',
        'Navigate to delivery location',
        'Complete delivery and collect payment'
      ]
    },
    {
      title: 'Earnings Tracking',
      description: 'Test driver earning features',
      icon: DollarSign,
      tests: [
        'View daily earnings summary',
        'Track tips and bonuses',
        'Weekly earnings reports',
        'Payout processing',
        'Tax documentation'
      ]
    },
    {
      title: 'Vehicle Management',
      description: 'Test vehicle and profile settings',
      icon: Car,
      tests: [
        'Update vehicle information',
        'Upload insurance documents',
        'Vehicle inspection status',
        'License verification',
        'Profile photo updates'
      ]
    },
    {
      title: 'Navigation & GPS',
      description: 'Test location and navigation features',
      icon: Navigation,
      tests: [
        'Real-time location tracking',
        'Optimal route calculation',
        'Turn-by-turn navigation',
        'Traffic conditions',
        'Location sharing with customers'
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Driver Testing Environment</h2>
        <p className="text-muted-foreground">
          Test all driver-facing features including order management, earnings tracking, and vehicle management.
        </p>
      </div>

      {/* Quick Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Quick Driver Setup
          </CardTitle>
          <CardDescription>
            Set up test data for a complete driver testing experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <Button 
              onClick={createTestDriverProfile} 
              disabled={isLoading}
              variant="outline"
            >
              <Car className="h-4 w-4 mr-2" />
              Create Driver Profile
            </Button>
            <Button 
              onClick={createTestOrder} 
              disabled={isLoading}
              variant="outline"
            >
              <MapPin className="h-4 w-4 mr-2" />
              Create Test Order
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Feeder Application Flow */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Test Feeder Application Flow
          </CardTitle>
          <CardDescription>
            Run a full simulated enhanced onboarding journey end-to-end with no production data.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Watch the enhanced flow auto-progress from submission to activation and review each milestone at your own pace.
          </p>
          <Button onClick={() => setShowMockFlow(true)}>
            Launch Mock Enhanced Flow
          </Button>
        </CardContent>
      </Card>

      {/* Testing Scenarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {testingScenarios.map((scenario, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <scenario.icon className="h-5 w-5 text-primary" />
                {scenario.title}
              </CardTitle>
              <CardDescription>{scenario.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {scenario.tests.map((test, testIndex) => (
                  <li key={testIndex} className="flex items-start gap-2 text-sm">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                    {test}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Driver Status Indicators */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Test Status Indicators
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <Badge variant="secondary">Online</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Available for orders</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <Badge variant="secondary">Busy</Badge>
              </div>
              <p className="text-xs text-muted-foreground">On active delivery</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <Badge variant="secondary">Offline</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Not accepting orders</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Star className="h-6 w-6 mx-auto text-primary mb-2" />
              <p className="text-sm font-medium">4.8★</p>
              <p className="text-xs text-muted-foreground">Driver rating</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <MockEnhancedDriverFlow open={showMockFlow} onOpenChange={setShowMockFlow} />
    </div>
  );
};
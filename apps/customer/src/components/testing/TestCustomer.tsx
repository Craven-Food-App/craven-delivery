import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  ShoppingCart, 
  MapPin, 
  Heart, 
  CreditCard, 
  Clock,
  Star,
  Plus
} from 'lucide-react';

export const TestCustomer = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const createTestAddress = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user logged in');

      const { error } = await supabase
        .from('delivery_addresses')
        .insert({
          user_id: user.id,
          label: 'Test Home',
          street_address: '123 Test Street',
          city: 'Test City',
          state: 'TX',
          zip_code: '12345',
          is_default: true
        });

      if (error) throw error;
      
      toast({
        title: 'Test address created',
        description: 'Added test delivery address to your account',
      });
    } catch (error: any) {
      toast({
        title: 'Error creating address',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createTestPaymentMethod = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user logged in');

      const { error } = await supabase
        .from('payment_methods')
        .insert({
          user_id: user.id,
          provider: 'test',
          token: 'test_card_token_' + Date.now(),
          last4: '4242',
          brand: 'visa',
          is_default: true
        });

      if (error) throw error;
      
      toast({
        title: 'Test payment method added',
        description: 'Added test Visa ending in 4242',
      });
    } catch (error: any) {
      toast({
        title: 'Error adding payment method',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testingScenarios = [
    {
      title: 'Order Flow Testing',
      description: 'Test the complete customer ordering experience',
      icon: ShoppingCart,
      tests: [
        'Browse restaurants and menus',
        'Add items to cart with modifiers',
        'Apply promo codes and discounts',
        'Select delivery address',
        'Choose payment method',
        'Place order and track delivery'
      ]
    },
    {
      title: 'Address Management',
      description: 'Test delivery address functionality',
      icon: MapPin,
      tests: [
        'Add new delivery addresses',
        'Edit existing addresses',
        'Set default addresses',
        'Delete unused addresses'
      ]
    },
    {
      title: 'Favorites & Preferences',
      description: 'Test user preference features',
      icon: Heart,
      tests: [
        'Add restaurants to favorites',
        'Save favorite menu items',
        'Set dietary preferences',
        'Rate and review orders'
      ]
    },
    {
      title: 'Payment Methods',
      description: 'Test payment processing',
      icon: CreditCard,
      tests: [
        'Add credit/debit cards',
        'Test different payment providers',
        'Set default payment method',
        'Handle payment failures'
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Customer Testing Environment</h2>
        <p className="text-muted-foreground">
          Test all customer-facing features including ordering, payments, and account management.
        </p>
      </div>

      {/* Quick Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Quick Test Setup
          </CardTitle>
          <CardDescription>
            Set up test data for a complete customer testing experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <Button 
              onClick={createTestAddress} 
              disabled={isLoading}
              variant="outline"
            >
              <MapPin className="h-4 w-4 mr-2" />
              Add Test Address
            </Button>
            <Button 
              onClick={createTestPaymentMethod} 
              disabled={isLoading}
              variant="outline"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Add Test Payment
            </Button>
          </div>
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

      {/* Customer Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Test Metrics to Verify
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Clock className="h-6 w-6 mx-auto text-primary mb-2" />
              <p className="text-sm font-medium">Order Speed</p>
              <p className="text-xs text-muted-foreground">Time to complete order</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <ShoppingCart className="h-6 w-6 mx-auto text-primary mb-2" />
              <p className="text-sm font-medium">Cart Functionality</p>
              <p className="text-xs text-muted-foreground">Add/remove items</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <CreditCard className="h-6 w-6 mx-auto text-primary mb-2" />
              <p className="text-sm font-medium">Payment Flow</p>
              <p className="text-xs text-muted-foreground">Successful transactions</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Heart className="h-6 w-6 mx-auto text-primary mb-2" />
              <p className="text-sm font-medium">User Experience</p>
              <p className="text-xs text-muted-foreground">Favorites & preferences</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Store, 
  Menu, 
  Users, 
  DollarSign,
  Clock,
  ChefHat,
  Settings,
  Plus
} from 'lucide-react';

export const TestRestaurant = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const createTestRestaurant = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user logged in');

      // Create restaurant
      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .insert({
          owner_id: user.id,
          name: 'Test Restaurant',
          description: 'A test restaurant for development',
          cuisine_type: 'American',
          address: '123 Restaurant Street',
          city: 'Test City',
          state: 'TX',
          zip_code: '12345',
          phone: '(555) 123-4567',
          email: 'test@restaurant.com',
          delivery_fee_cents: 250,
          minimum_order_cents: 1000,
          estimated_delivery_time: 30,
          rating: 4.5,
          is_active: true
        })
        .select()
        .single();

      if (restaurantError) throw restaurantError;

      // Create test menu category
      const { data: category, error: categoryError } = await supabase
        .from('menu_categories')
        .insert({
          restaurant_id: restaurant.id,
          name: 'Test Category',
          description: 'Test menu category',
          display_order: 1
        })
        .select()
        .single();

      if (categoryError) throw categoryError;

      // Create test menu items
      const testMenuItems = [
        {
          name: 'Test Burger',
          description: 'A delicious test burger',
          price_cents: 1200,
          category_id: category.id,
          restaurant_id: restaurant.id
        },
        {
          name: 'Test Pizza',
          description: 'A tasty test pizza',
          price_cents: 1500,
          category_id: category.id,
          restaurant_id: restaurant.id
        }
      ];

      const { error: itemsError } = await supabase
        .from('menu_items')
        .insert(testMenuItems);

      if (itemsError) throw itemsError;

      // Update user profile role
      await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          full_name: 'Test Restaurant Owner',
          role: 'restaurant_owner'
        });
      
      toast({
        title: 'Test restaurant created',
        description: 'Set up complete restaurant with menu items for testing',
      });
    } catch (error: any) {
      toast({
        title: 'Error creating test restaurant',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createTestEmployee = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user logged in');

      // Get user's restaurant
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!restaurant) {
        throw new Error('No restaurant found. Create a test restaurant first.');
      }

      const { error } = await supabase
        .from('restaurant_employees')
        .insert({
          restaurant_id: restaurant.id,
          employee_id: 'TEST001',
          full_name: 'Test Employee',
          role: 'cashier',
          pin_code: '1234',
          is_active: true
        });

      if (error) throw error;
      
      toast({
        title: 'Test employee created',
        description: 'Added test employee for POS testing',
      });
    } catch (error: any) {
      toast({
        title: 'Error creating test employee',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testingScenarios = [
    {
      title: 'Menu Management',
      description: 'Test restaurant menu features',
      icon: Menu,
      tests: [
        'Add new menu items',
        'Create menu categories',
        'Set item pricing and descriptions',
        'Upload item photos',
        'Manage item availability',
        'Set preparation times'
      ]
    },
    {
      title: 'Order Processing',
      description: 'Test order management workflow',
      icon: Clock,
      tests: [
        'Receive new orders',
        'Update order status',
        'Prepare orders efficiently',
        'Communicate with drivers',
        'Handle special requests',
        'Process refunds/cancellations'
      ]
    },
    {
      title: 'Staff Management',
      description: 'Test employee and role management',
      icon: Users,
      tests: [
        'Add new employees',
        'Set employee roles and permissions',
        'POS system login',
        'Track employee performance',
        'Schedule management',
        'Employee training materials'
      ]
    },
    {
      title: 'POS System',
      description: 'Test point-of-sale functionality',
      icon: DollarSign,
      tests: [
        'Process walk-in orders',
        'Handle phone orders',
        'Split payments',
        'Apply discounts and coupons',
        'Generate receipts',
        'End-of-day reports'
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Restaurant Testing Environment</h2>
        <p className="text-muted-foreground">
          Test all restaurant-facing features including menu management, order processing, and POS systems.
        </p>
      </div>

      {/* Quick Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Quick Restaurant Setup
          </CardTitle>
          <CardDescription>
            Set up test data for a complete restaurant testing experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <Button 
              onClick={createTestRestaurant} 
              disabled={isLoading}
              variant="outline"
            >
              <Store className="h-4 w-4 mr-2" />
              Create Test Restaurant
            </Button>
            <Button 
              onClick={createTestEmployee} 
              disabled={isLoading}
              variant="outline"
            >
              <Users className="h-4 w-4 mr-2" />
              Add Test Employee
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

      {/* Restaurant Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            Restaurant Status Testing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <Badge variant="secondary">Open</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Accepting orders</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <Badge variant="secondary">Busy</Badge>
              </div>
              <p className="text-xs text-muted-foreground">High order volume</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <Badge variant="secondary">Closed</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Not accepting orders</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Settings className="h-6 w-6 mx-auto text-primary mb-2" />
              <p className="text-sm font-medium">Settings</p>
              <p className="text-xs text-muted-foreground">Hours & preferences</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
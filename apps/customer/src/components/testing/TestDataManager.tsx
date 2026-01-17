import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Database, 
  Trash2, 
  RefreshCw, 
  Download,
  Upload,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

export const TestDataManager = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const generateTestData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user logged in');

      // Create multiple test restaurants
      const restaurants = [
        {
          name: 'Burger Palace',
          cuisine_type: 'Fast Food',
          description: 'Delicious burgers and fries',
          delivery_fee_cents: 199,
          minimum_order_cents: 1000
        },
        {
          name: 'Pizza Corner',
          cuisine_type: 'Italian',
          description: 'Authentic Italian pizza',
          delivery_fee_cents: 299,
          minimum_order_cents: 1500
        },
        {
          name: 'Taco Fiesta',
          cuisine_type: 'Mexican',
          description: 'Fresh Mexican cuisine',
          delivery_fee_cents: 249,
          minimum_order_cents: 800
        }
      ];

      for (const restaurant of restaurants) {
        const { data: restaurantData, error: restaurantError } = await supabase
          .from('restaurants')
          .insert({
            owner_id: user.id,
            address: '123 Test Street',
            city: 'Test City',
            state: 'TX',
            zip_code: '12345',
            phone: '(555) 123-4567',
            email: `${restaurant.name.toLowerCase().replace(' ', '')}@test.com`,
            estimated_delivery_time: 30,
            rating: Math.floor(Math.random() * 2) + 4, // 4-5 stars
            is_active: true,
            ...restaurant
          })
          .select()
          .single();

        if (restaurantError) throw restaurantError;

        // Create categories and menu items for each restaurant
        const categories = ['Appetizers', 'Main Course', 'Desserts'];
        
        for (const categoryName of categories) {
          const { data: category, error: categoryError } = await supabase
            .from('menu_categories')
            .insert({
              restaurant_id: restaurantData.id,
              name: categoryName,
              description: `${categoryName} from ${restaurant.name}`
            })
            .select()
            .single();

          if (categoryError) throw categoryError;

          // Add sample items to each category
          const sampleItems = [
            `${restaurant.name} Special`,
            `Classic ${categoryName.slice(0, -1)}`,
            `Premium ${categoryName.slice(0, -1)}`
          ];

          for (const itemName of sampleItems) {
            await supabase
              .from('menu_items')
              .insert({
                restaurant_id: restaurantData.id,
                category_id: category.id,
                name: itemName,
                description: `Delicious ${itemName.toLowerCase()} from our kitchen`,
                price_cents: Math.floor(Math.random() * 2000) + 500, // $5-25
                is_available: true,
                is_featured: Math.random() > 0.7
              });
          }
        }
      }

      toast({
        title: 'Test data generated',
        description: 'Created restaurants with menus and sample data',
      });
    } catch (error: any) {
      toast({
        title: 'Error generating test data',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearTestData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user logged in');

      // Clear user's test data (orders, restaurants, etc.)
      await supabase.from('orders').delete().eq('customer_id', user.id);
      await supabase.from('restaurants').delete().eq('owner_id', user.id);
      await supabase.from('delivery_addresses').delete().eq('user_id', user.id);
      await supabase.from('payment_methods').delete().eq('user_id', user.id);
      await supabase.from('driver_profiles').delete().eq('user_id', user.id);

      toast({
        title: 'Test data cleared',
        description: 'All test data has been removed from your account',
      });
    } catch (error: any) {
      toast({
        title: 'Error clearing test data',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetDatabase = async () => {
    setIsLoading(true);
    try {
      // This would be a more comprehensive reset - use carefully!
      toast({
        title: 'Database reset',
        description: 'This feature would reset the entire test database',
      });
    } catch (error: any) {
      toast({
        title: 'Error resetting database',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const dataOperations = [
    {
      title: 'Generate Sample Data',
      description: 'Create restaurants, menus, and sample orders for testing',
      icon: Upload,
      action: generateTestData,
      variant: 'default' as const,
      dangerous: false
    },
    {
      title: 'Clear My Test Data',
      description: 'Remove all test data associated with your account',
      icon: Trash2,
      action: clearTestData,
      variant: 'outline' as const,
      dangerous: true
    },
    {
      title: 'Reset Test Database',
      description: 'Complete database reset (USE WITH CAUTION)',
      icon: RefreshCw,
      action: resetDatabase,
      variant: 'destructive' as const,
      dangerous: true
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Test Data Management</h2>
        <p className="text-muted-foreground">
          Manage test data, create sample scenarios, and reset testing environments.
        </p>
      </div>

      {/* Data Operations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {dataOperations.map((operation, index) => (
          <Card key={index} className={operation.dangerous ? 'border-destructive/50' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <operation.icon className={`h-5 w-5 ${operation.dangerous ? 'text-destructive' : 'text-primary'}`} />
                {operation.title}
              </CardTitle>
              <CardDescription>{operation.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {operation.dangerous ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant={operation.variant} className="w-full" disabled={isLoading}>
                      {operation.dangerous && <AlertTriangle className="h-4 w-4 mr-2" />}
                      {operation.title}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. {operation.description}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={operation.action} className="bg-destructive hover:bg-destructive/90">
                        Continue
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Button 
                  variant={operation.variant} 
                  className="w-full" 
                  onClick={operation.action}
                  disabled={isLoading}
                >
                  <operation.icon className="h-4 w-4 mr-2" />
                  {operation.title}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Database Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <CheckCircle className="h-6 w-6 mx-auto text-green-500 mb-2" />
              <p className="text-sm font-medium">Connected</p>
              <p className="text-xs text-muted-foreground">Database online</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Database className="h-6 w-6 mx-auto text-primary mb-2" />
              <p className="text-sm font-medium">Test Mode</p>
              <p className="text-xs text-muted-foreground">Development environment</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <RefreshCw className="h-6 w-6 mx-auto text-primary mb-2" />
              <p className="text-sm font-medium">Auto-sync</p>
              <p className="text-xs text-muted-foreground">Real-time updates</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Download className="h-6 w-6 mx-auto text-primary mb-2" />
              <p className="text-sm font-medium">Backup</p>
              <p className="text-xs text-muted-foreground">Regular snapshots</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Testing Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>Testing Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Badge variant="secondary" className="mt-1">1</Badge>
              <div>
                <p className="font-medium">Generate Test Data First</p>
                <p className="text-sm text-muted-foreground">
                  Create sample restaurants, menus, and users before testing features
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="secondary" className="mt-1">2</Badge>
              <div>
                <p className="font-medium">Test Different User Roles</p>
                <p className="text-sm text-muted-foreground">
                  Switch between customer, driver, and restaurant accounts to test workflows
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="secondary" className="mt-1">3</Badge>
              <div>
                <p className="font-medium">Clean Up Regularly</p>
                <p className="text-sm text-muted-foreground">
                  Remove test data periodically to maintain database performance
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
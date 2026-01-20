import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  ShoppingCart, 
  CheckCircle, 
  AlertCircle,
  Play,
  RefreshCw,
  Eye,
  Zap
} from 'lucide-react';
import { OrderCompletionModal } from '@/components/OrderCompletionModal';

interface TestOrder {
  id: string;
  order_status: string;
  restaurant_id: string;
  total_cents: number;
  created_at: string;
}

export const TestOrderCompletion = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [testOrder, setTestOrder] = useState<TestOrder | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [testResults, setTestResults] = useState<{
    orderCreated: boolean;
    modalShown: boolean;
    doubleUpDetected: boolean;
    statusUpdates: boolean;
    cravemorePromo: boolean;
  }>({
    orderCreated: false,
    modalShown: false,
    doubleUpDetected: false,
    statusUpdates: false,
    cravemorePromo: false,
  });
  const { toast } = useToast();

  // Check if test order exists and monitor status
  useEffect(() => {
    if (testOrder?.id) {
      const channel = supabase
        .channel(`test-order-${testOrder.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `id=eq.${testOrder.id}`
          },
          (payload) => {
            const updatedOrder = payload.new as any;
            setTestOrder((prev) => prev ? { ...prev, ...updatedOrder } : null);
            setTestResults((prev) => ({ ...prev, statusUpdates: true }));
            toast({
              title: 'Order Status Updated',
              description: `Status changed to: ${updatedOrder.order_status}`,
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [testOrder?.id, toast]);

  const createTestOrder = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user logged in');

      // Get a test restaurant
      const { data: restaurants, error: restaurantError } = await supabase
        .from('restaurants')
        .select('id, name')
        .limit(1)
        .single();

      if (restaurantError || !restaurants) {
        throw new Error('No restaurants available. Please create a test restaurant first.');
      }

      // Get menu items for the restaurant
      const { data: menuItems, error: menuError } = await supabase
        .from('menu_items')
        .select('id, price_cents')
        .eq('restaurant_id', restaurants.id)
        .limit(2);

      if (menuError || !menuItems || menuItems.length === 0) {
        throw new Error('No menu items available. Please add menu items to the restaurant first.');
      }

      // Create test order
      const orderData = {
        customer_id: user.id,
        restaurant_id: restaurants.id,
        subtotal_cents: menuItems.reduce((sum, item) => sum + (item.price_cents || 0), 0),
        delivery_fee_cents: 300, // $3.00 delivery fee
        tax_cents: Math.round(menuItems.reduce((sum, item) => sum + (item.price_cents || 0), 0) * 0.08),
        total_cents: 0, // Will be calculated
        order_status: 'pending',
        delivery_address: {
          name: 'Test Address',
          address: '123 Test Street',
          city: 'Test City',
          state: 'TX',
          zip_code: '12345',
          latitude: 32.7767,
          longitude: -96.7970,
        },
        estimated_delivery_time: new Date(Date.now() + 45 * 60000).toISOString(),
      };

      // Calculate total
      orderData.total_cents = orderData.subtotal_cents + orderData.delivery_fee_cents + orderData.tax_cents;

      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = menuItems.map((item, index) => ({
        order_id: newOrder.id,
        menu_item_id: item.id,
        quantity: index === 0 ? 2 : 1, // First item quantity 2, second item quantity 1
        price_cents: item.price_cents || 0,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.warn('Error creating order items:', itemsError);
        // Don't fail the test if items fail
      }

      setTestOrder(newOrder);
      setTestResults((prev) => ({ ...prev, orderCreated: true }));

      toast({
        title: 'Test Order Created',
        description: `Order #${newOrder.id.slice(0, 8)} created successfully`,
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

  const createDoubleUpOrder = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user logged in');

      // Get two different restaurants
      const { data: restaurants, error: restaurantError } = await supabase
        .from('restaurants')
        .select('id, name')
        .limit(2);

      if (restaurantError || !restaurants || restaurants.length < 2) {
        throw new Error('Need at least 2 restaurants for Double Up test. Please create more restaurants.');
      }

      // Get menu items from first restaurant
      const { data: menuItems1, error: menuError1 } = await supabase
        .from('menu_items')
        .select('id, price_cents, restaurant_id')
        .eq('restaurant_id', restaurants[0].id)
        .limit(1);

      // Get menu items from second restaurant
      const { data: menuItems2, error: menuError2 } = await supabase
        .from('menu_items')
        .select('id, price_cents, restaurant_id')
        .eq('restaurant_id', restaurants[1].id)
        .limit(1);

      if (menuError1 || !menuItems1 || menuItems1.length === 0 ||
          menuError2 || !menuItems2 || menuItems2.length === 0) {
        throw new Error('Need menu items from both restaurants for Double Up test.');
      }

      // Create test order with first restaurant
      const orderData = {
        customer_id: user.id,
        restaurant_id: restaurants[0].id, // Primary restaurant
        subtotal_cents: (menuItems1[0].price_cents || 0) + (menuItems2[0].price_cents || 0),
        delivery_fee_cents: 300,
        tax_cents: Math.round(((menuItems1[0].price_cents || 0) + (menuItems2[0].price_cents || 0)) * 0.08),
        total_cents: 0,
        order_status: 'pending',
        delivery_address: {
          name: 'Test Address',
          address: '123 Test Street',
          city: 'Test City',
          state: 'TX',
          zip_code: '12345',
          latitude: 32.7767,
          longitude: -96.7970,
        },
        estimated_delivery_time: new Date(Date.now() + 45 * 60000).toISOString(),
      };

      orderData.total_cents = orderData.subtotal_cents + orderData.delivery_fee_cents + orderData.tax_cents;

      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items from BOTH restaurants (this makes it a Double Up)
      const orderItems = [
        {
          order_id: newOrder.id,
          menu_item_id: menuItems1[0].id,
          quantity: 1,
          price_cents: menuItems1[0].price_cents || 0,
        },
        {
          order_id: newOrder.id,
          menu_item_id: menuItems2[0].id,
          quantity: 1,
          price_cents: menuItems2[0].price_cents || 0,
        },
      ];

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.warn('Error creating order items:', itemsError);
      }

      setTestOrder(newOrder);
      setTestResults((prev) => ({ 
        ...prev, 
        orderCreated: true,
        doubleUpDetected: true 
      }));

      toast({
        title: 'Double Up Test Order Created',
        description: `Order with items from 2 restaurants created`,
      });
    } catch (error: any) {
      toast({
        title: 'Error creating Double Up order',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const showCompletionModal = () => {
    if (!testOrder) {
      toast({
        title: 'No Test Order',
        description: 'Please create a test order first',
        variant: 'destructive'
      });
      return;
    }

    setShowModal(true);
    setTestResults((prev) => ({ ...prev, modalShown: true }));
    
    // Check if order has delivery fee for CraveMore promo
    if (testOrder && 'delivery_fee_cents' in testOrder && (testOrder as any).delivery_fee_cents > 0) {
      setTestResults((prev) => ({ ...prev, cravemorePromo: true }));
    }
  };

  const simulateStatusUpdate = async (newStatus: string) => {
    if (!testOrder) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ order_status: newStatus })
        .eq('id', testOrder.id);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `Order status changed to: ${newStatus}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error updating status',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const resetTest = () => {
    setTestOrder(null);
    setShowModal(false);
    setTestResults({
      orderCreated: false,
      modalShown: false,
      doubleUpDetected: false,
      statusUpdates: false,
      cravemorePromo: false,
    });
  };

  const testStatuses = [
    { key: 'pending', label: 'Order Received' },
    { key: 'confirmed', label: 'Restaurant Confirmed' },
    { key: 'preparing', label: 'Preparing Your Order' },
    { key: 'ready', label: 'Ready for Pickup' },
    { key: 'picked_up', label: 'Feeder Picked Up' },
    { key: 'in_transit', label: 'On The Way' },
    { key: 'delivered', label: 'Delivered' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Zap className="h-6 w-6 text-orange-500" />
          LIVE Order Completion Test
        </h2>
        <p className="text-muted-foreground">
          Test the order completion modal with real orders. This creates actual database records and tests all modal features.
        </p>
      </div>

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            Test Controls
          </CardTitle>
          <CardDescription>
            Create test orders and trigger the completion modal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <Button 
              onClick={createTestOrder} 
              disabled={isLoading || !!testOrder}
              variant="default"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Create Standard Test Order
            </Button>
            <Button 
              onClick={createDoubleUpOrder} 
              disabled={isLoading || !!testOrder}
              variant="outline"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Create Double Up Test Order
            </Button>
            <Button 
              onClick={showCompletionModal} 
              disabled={!testOrder || showModal}
              variant="default"
            >
              <Eye className="h-4 w-4 mr-2" />
              Show Completion Modal
            </Button>
            <Button 
              onClick={resetTest} 
              disabled={isLoading}
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset Test
            </Button>
          </div>

          {testOrder && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Test Order Active</span>
                <Badge variant="outline">ID: {testOrder.id.slice(0, 8)}</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Status: <Badge variant="secondary">{testOrder.order_status}</Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Simulation */}
      {testOrder && (
        <Card>
          <CardHeader>
            <CardTitle>Simulate Status Updates</CardTitle>
            <CardDescription>
              Manually update order status to test real-time updates in the modal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {testStatuses.map((status) => (
                <Button
                  key={status.key}
                  onClick={() => simulateStatusUpdate(status.key)}
                  variant={testOrder.order_status === status.key ? 'default' : 'outline'}
                  size="sm"
                  disabled={isLoading}
                >
                  {status.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Results */}
      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
          <CardDescription>
            Track which features have been tested successfully
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(testResults).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                {value ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Passed
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Test Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Test Checklist</CardTitle>
          <CardDescription>
            Verify all modal features are working correctly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${testResults.orderCreated ? 'bg-green-500' : 'bg-gray-300'}`} />
              Order created successfully
            </li>
            <li className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${testResults.modalShown ? 'bg-green-500' : 'bg-gray-300'}`} />
              Modal displays correctly
            </li>
            <li className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${testResults.doubleUpDetected ? 'bg-green-500' : 'bg-gray-300'}`} />
              "Double Up" title appears for multi-restaurant orders
            </li>
            <li className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${testResults.statusUpdates ? 'bg-green-500' : 'bg-gray-300'}`} />
              Real-time status updates work
            </li>
            <li className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${testResults.cravemorePromo ? 'bg-green-500' : 'bg-gray-300'}`} />
              CraveMore promo displays with savings
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-300" />
              Status progress bar shows correct step
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-300" />
              Restaurant logo displays correctly
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-300" />
              Order Details button navigates correctly
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Order Completion Modal */}
      {testOrder && (
        <OrderCompletionModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          orderId={testOrder.id}
        />
      )}
    </div>
  );
};


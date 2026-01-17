// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, ArrowLeft, Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const sessionId = searchParams.get('session_id');
  const orderId = searchParams.get('order_id');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId || !orderId) {
        setIsLoading(false);
        return;
      }

      try {
        // Verify payment with Stripe
        const { data, error } = await supabase.functions.invoke('verify-payment', {
          body: { sessionId, orderId }
        });

        if (error) throw error;

        if (data.success) {
          // Fetch order details
          const { data: orderData, error: orderError } = await supabase
            .from('customer_orders')
            .select(`
              *,
              restaurants (
                name,
                address,
                city,
                state,
                phone
              )
            `)
            .eq('id', orderId)
            .single();

          if (orderError) throw orderError;
          
          setOrder(orderData);
          
          toast({
            title: "Payment successful! 🎉",
            description: "Your order has been confirmed and sent to the restaurant.",
          });
        } else {
          throw new Error('Payment verification failed');
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        toast({
          title: "Payment verification failed",
          description: "Please contact support if you were charged.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    verifyPayment();
  }, [sessionId, orderId, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <p className="text-destructive mb-4">Unable to verify payment</p>
            <Link to="/">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="container mx-auto max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-600">Payment Successful!</CardTitle>
            <p className="text-muted-foreground">
              Your order has been confirmed and sent to the restaurant
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Order Summary */}
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Order Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Order ID:</span>
                  <span className="font-mono">#{order.id.slice(-8)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Restaurant:</span>
                  <span>{order.restaurants.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span className="font-semibold">${(order.total_cents / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Order Type:</span>
                  <span className="capitalize">{order.delivery_method}</span>
                </div>
              </div>
            </div>

            {/* Estimated Time */}
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">
                  {order.delivery_method === 'delivery' ? 'Estimated Delivery' : 'Ready for Pickup'}
                </p>
                <p className="text-sm text-blue-700">
                  {order.delivery_method === 'delivery' 
                    ? new Date(order.estimated_delivery_time).toLocaleTimeString()
                    : new Date(order.estimated_pickup_time).toLocaleTimeString()
                  }
                </p>
              </div>
            </div>

            {/* Restaurant Info */}
            <div className="space-y-3">
              <h3 className="font-semibold">Restaurant Information</h3>
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                  <div className="text-sm">
                    <p>{order.restaurants.name}</p>
                    <p className="text-muted-foreground">
                      {order.restaurants.address}, {order.restaurants.city}, {order.restaurants.state}
                    </p>
                  </div>
                </div>
                {order.restaurants.phone && (
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4" />
                    <p className="text-sm">📞 {order.restaurants.phone}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Order Items */}
            <div className="space-y-3">
              <h3 className="font-semibold">Items Ordered</h3>
              <div className="space-y-2">
                {order.order_items.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-start text-sm">
                    <div className="flex-1">
                      <p className="font-medium">{item.quantity}x {item.name}</p>
                      {item.modifiers && item.modifiers.length > 0 && (
                        <div className="text-muted-foreground ml-4">
                          {item.modifiers.map((mod: any, modIndex: number) => (
                            <p key={modIndex}>• {mod.name}</p>
                          ))}
                        </div>
                      )}
                      {item.special_instructions && (
                        <p className="text-muted-foreground ml-4 italic">
                          Note: {item.special_instructions}
                        </p>
                      )}
                    </div>
                    <span className="font-medium">
                      ${((item.price_cents + (item.modifiers?.reduce((sum: number, mod: any) => sum + mod.price_cents, 0) || 0)) * item.quantity / 100).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Link to="/" className="flex-1">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
              <Link to="/orders" className="flex-1">
                <Button className="w-full">
                  Track Order
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentSuccess;
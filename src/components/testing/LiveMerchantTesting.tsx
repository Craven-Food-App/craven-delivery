import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Store, MapPin, Zap, Send, Clock, CheckCircle, AlertTriangle, Car } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { fetchActiveOnlineFeeders, type OnlineFeederRow } from '@/lib/activeOnlineFeeders';

type RestaurantRow = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  restaurant_type?: string | null;
  address?: string | null;
};

export const LiveMerchantTesting = () => {
  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('');
  const [optionalDriver, setOptionalDriver] = useState<string>('_none_');
  const [onlineFeeders, setOnlineFeeders] = useState<OnlineFeederRow[]>([]);
  const [orderType, setOrderType] = useState<'restaurant' | 'retail'>('restaurant');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    void fetchRestaurants();
    void fetchFeeders();
  }, []);

  const fetchRestaurants = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, city, state, restaurant_type, address')
        .eq('is_active', true)
        .order('name', { ascending: true });
      if (error) throw error;
      setRestaurants((data as RestaurantRow[]) || []);
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Error', description: e?.message || 'Failed to load restaurants', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFeeders = async () => {
    const { feeders, error } = await fetchActiveOnlineFeeders();
    if (error) {
      console.warn('Active feeders', error);
    }
    setOnlineFeeders(feeders || []);
  };

  const sendMerchantTestOrder = async () => {
    if (!selectedRestaurant) {
      toast({
        title: 'No store selected',
        description: 'Choose a restaurant to receive the test order on the tablet.',
        variant: 'destructive',
      });
      return;
    }
    setIsSending(true);
    try {
      const driverId = optionalDriver && optionalDriver !== '_none_' ? optionalDriver : undefined;
      const { data: result, error: fnError } = await supabase.functions.invoke('create-merchant-test-order', {
        body: { restaurantId: selectedRestaurant, orderType, driverId: driverId ?? null },
      });
      if (fnError || !result) {
        throw new Error((fnError as { message?: string })?.message || 'Failed to create merchant test order');
      }
      const { notificationPayload, restaurant, assignment } = result as {
        notificationPayload: Record<string, unknown>;
        restaurant: { name?: string };
        assignment: { id: string } | null;
      };

      if (driverId && assignment) {
        const driverChannel = supabase.channel(`driver_${driverId}`);
        await driverChannel.subscribe();
        await driverChannel.send({
          type: 'broadcast',
          event: 'order_assignment',
          payload: notificationPayload,
        });
        const userChannel = supabase.channel(`user_notifications_${driverId}`);
        await userChannel.subscribe();
        await userChannel.send({
          type: 'broadcast',
          event: 'push_notification',
          payload: {
            title: `Test (merchant) — ${restaurant.name || 'Store'}`,
            message: 'Test order for merchant flow — you have a pending offer.',
            data: notificationPayload,
          },
        });
        supabase.removeChannel(driverChannel);
        supabase.removeChannel(userChannel);
      }

      toast({
        title: 'Merchant test order created',
        description: restaurant?.name
          ? `Order is pending in ${restaurant.name}. The tablet should show a new order${driverId ? ', and the feeder a pending offer' : ''}.`
          : 'Order created. Open the restaurant tablet orders view.',
        duration: 8000,
      });
      setSelectedRestaurant('');
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Error', description: e?.message || 'Failed to send', variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-orange-500" />
            Live merchant / tablet test
          </CardTitle>
          <CardDescription>
            Creates a <strong>pending</strong> test order for a chosen store so the merchant can verify the receiving
            flow (bell, list, status). Optional: also assign an online feeder to test driver assignment + app offer.
            Feeder arrival and curbside spot appear in the order view after the driver confirms arrival in the app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Admin only. The store sees a real new order in their dashboard.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4" />
            Create test order
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Order type (store profile)</Label>
            <Select value={orderType} onValueChange={(v) => setOrderType(v as 'restaurant' | 'retail')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="restaurant">Restaurant delivery path</SelectItem>
                <SelectItem value="retail">Retail / curbside path</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Retail still targets the test retail store in the function when you pick any store, or you can pick a retail-tagged store from the list.</p>
          </div>

          <div className="space-y-2">
            <Label>Restaurant (tablet that should receive the order)</Label>
            <Select
              value={selectedRestaurant}
              onValueChange={setSelectedRestaurant}
              disabled={isLoading || restaurants.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? 'Loading…' : 'Select store…'} />
              </SelectTrigger>
              <SelectContent>
                {restaurants.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    <span className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {r.name}
                      {r.city && r.state ? ` — ${r.city}, ${r.state}` : null}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => void fetchRestaurants()}>
                Refresh list
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Also notify an online feeder (optional)</Label>
            <Select value={optionalDriver} onValueChange={setOptionalDriver}>
              <SelectTrigger>
                <SelectValue placeholder="No feeder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none_">None — merchant-only test</SelectItem>
                {onlineFeeders.map((f) => (
                  <SelectItem key={f.user_id} value={f.user_id}>
                    <span className="flex items-center gap-2">
                      <Car className="h-3.5 w-3.5" />
                      {f.full_name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="secondary" size="sm" onClick={() => void fetchFeeders()}>
              Refresh online feeders
            </Button>
          </div>

          <Button
            onClick={() => void sendMerchantTestOrder()}
            disabled={!selectedRestaurant || isSending || isLoading}
            className="w-full"
            size="lg"
          >
            {isSending ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send merchant test order
              </>
            )}
          </Button>

          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Open <strong>Restaurant / merchant orders</strong> (same store) to hear the chime and see the card. When
              a feeder is assigned, they can accept, arrive at the store, and select a curbside spot; the order row
              updates in real time.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveMerchantTesting;

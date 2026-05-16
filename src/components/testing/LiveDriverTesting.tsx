import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Car, MapPin, Zap, Send, Clock, CheckCircle, AlertTriangle, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { fetchActiveOnlineFeeders, type OnlineFeederRow } from '@/lib/activeOnlineFeeders';
import { TestingCleanPayOrderPreview } from '@/components/testing/TestingCleanPayOrderPreview';

type OnlineDriver = OnlineFeederRow;

export const LiveDriverTesting = () => {
  const [onlineDrivers, setOnlineDrivers] = useState<OnlineDriver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [orderType, setOrderType] = useState<'restaurant' | 'retail'>('restaurant');
  const [previewOrderId, setPreviewOrderId] = useState<string | null>(null);
  const { toast } = useToast();

  // Fixed useEffect with async function inside
  useEffect(() => {
    const fetchData = async () => {
      await fetchOnlineDrivers();
    };

    fetchData();

    // Subscribe to both driver_sessions and driver_profiles changes
    const sessionsChannel = supabase
      .channel('driver_sessions_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'driver_sessions' },
        () => fetchOnlineDrivers()
      )
      .subscribe();

    const profilesChannel = supabase
      .channel('driver_profiles_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'driver_profiles' },
        () => fetchOnlineDrivers()
      )
      .subscribe();

    return () => {
      sessionsChannel.unsubscribe();
      profilesChannel.unsubscribe();
    };
  }, []);

  const fetchOnlineDrivers = async () => {
    setIsLoading(true);
    try {
      const { feeders, error } = await fetchActiveOnlineFeeders();
      if (error) {
        throw error;
      }
      setOnlineDrivers(feeders);
    } catch (error: any) {
      console.error('Error fetching online feeders:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to fetch online feeders',
        variant: 'destructive',
      });
    }
    setIsLoading(false);
  };

  const sendTestOrder = async () => {
    if (!selectedDriver) {
      toast({
        title: 'No Feeder Selected',
        description: 'Please select a feeder to send the test order to',
        variant: 'destructive',
      });
      return;
    }

    setIsSendingTest(true);
    try {
      // Step 1: Create order (must complete first)
      const { data: result, error: fnError } = await supabase.functions.invoke('create-test-order', {
        body: { driverId: selectedDriver, orderType }
      });
      if (fnError || !result) {
        throw new Error((fnError as any)?.message || 'Failed to create test order');
      }

      const { notificationPayload, restaurant } = result as any;
      setPreviewOrderId(typeof notificationPayload?.order_id === 'string' ? notificationPayload.order_id : null);

      // Step 2: Set up channels in parallel
      const driverChannel = supabase.channel(`driver_${selectedDriver}`);
      const userChannel = supabase.channel(`user_notifications_${selectedDriver}`);
      
      // Subscribe to both channels in parallel
      await Promise.all([
        driverChannel.subscribe(),
        userChannel.subscribe()
      ]);

      // Step 3: Send broadcasts in parallel
      const broadcastPromises = [
        driverChannel.send({
        type: 'broadcast',
        event: 'order_assignment',
        payload: notificationPayload,
        }),
        userChannel.send({
        type: 'broadcast',
        event: 'push_notification',
        payload: {
          title: `Test Order: ${restaurant.name || 'Test Restaurant'}`,
          message: `Test pickup - this is a test order`,
          data: notificationPayload
        }
        })
      ];

      // Step 4: Run notifications in parallel (don't block on push notification)
      const notificationPromises = [
        // Insert notification record
        supabase.from('order_notifications').insert({
        user_id: selectedDriver,
        order_id: (notificationPayload as any).order_id,
        title: `Test Order: ${restaurant.name || 'Test Restaurant'}`,
        message: `Test pickup - this is a test order`,
        notification_type: 'order_assignment'
        }),
        // Send push notification (fire and forget - don't block)
        supabase.functions.invoke('send-push-notification', {
        body: {
          userId: selectedDriver,
          title: `Test Order: ${restaurant.name || 'Test Restaurant'}`,
          message: 'Test pickup - this is a test order',
          data: notificationPayload
        }
        }).catch(err => {
          console.warn('send-push-notification failed:', (err as any)?.message || err);
        })
      ];

      // Wait for broadcasts to complete
      await Promise.all(broadcastPromises);
      
      // Start notifications but don't wait (non-blocking)
      Promise.all(notificationPromises).catch(err => {
        console.warn('Some notifications failed:', err);
      });

      // Show success immediately after broadcasts complete
      toast({
        title: 'Test Order Sent!',
        description: 'Test order has been assigned to the selected feeder.',
        duration: 5000,
      });
      setSelectedDriver('');
    } catch (error: any) {
      console.error(error);
      toast({ title: 'Error', description: error.message || 'Failed to send test order', variant: 'destructive' });
    }
    setIsSendingTest(false);
  };

  const getDriverInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-500" />
            Live Feeder Testing
          </CardTitle>
          <CardDescription>
            Send test orders to real online feeders for testing push notifications and order flow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This sends real push notifications to actual feeders. Only use for testing purposes.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Online Feeders ({onlineDrivers.length})
          </CardTitle>
          <CardDescription>
            Feeders in an active feed session (online, heartbeat, searching for orders — not paused or stale).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchOnlineDrivers} variant="outline" className="mb-4" disabled={isLoading}>
            {isLoading ? 'Refreshing...' : 'Refresh Feeders'}
          </Button>
          {onlineDrivers.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>No feeders are currently online.</AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4">
              {onlineDrivers.map(driver => (
                <div
                  key={driver.id}
                  className={`p-4 border rounded-lg transition-colors ${
                    selectedDriver === driver.user_id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{getDriverInitials(driver.full_name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{driver.full_name}</p>
                        <p className="text-sm text-muted-foreground">Feeder ID: {driver.user_id.slice(0, 8)}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Car className="h-3 w-3" />
                          <span className="text-xs">{driver.vehicle_make} {driver.vehicle_model}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-500 hover:bg-green-600">Online</Badge>
                      <Badge variant="outline">⭐ {driver.rating.toFixed(1)}</Badge>
                    </div>
                  </div>
                  {driver.current_latitude && driver.current_longitude && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>Location: {driver.current_latitude.toFixed(4)}, {driver.current_longitude.toFixed(4)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Send className="h-5 w-5" />Send Test Order</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Order Type</Label>
            <Select value={orderType} onValueChange={(v) => setOrderType(v as 'restaurant' | 'retail')}>
              <SelectTrigger>
                <SelectValue placeholder="Choose order type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="restaurant">Driver delivery flow – CMIH Kitchen</SelectItem>
                <SelectItem value="retail">Retail driver flow – Crave&apos;n Stylz</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Select value={selectedDriver} onValueChange={setSelectedDriver}>
            <SelectTrigger><SelectValue placeholder="Choose a feeder..." /></SelectTrigger>
            <SelectContent>
              {onlineDrivers.map(driver => (
                <SelectItem key={driver.user_id} value={driver.user_id}>
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    {driver.full_name}
                    <Badge variant="outline" className="ml-2">{driver.vehicle_type}</Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={sendTestOrder}
            disabled={!selectedDriver || isSendingTest || onlineDrivers.length === 0}
            className="w-full"
            size="lg"
          >
            {isSendingTest
              ? <><Clock className="h-4 w-4 mr-2 animate-spin" />Sending Test Order...</>
              : <><Send className="h-4 w-4 mr-2" />Send Test Order</>
            }
          </Button>

          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              The selected feeder will receive a push notification and see a test order assignment modal.
            </AlertDescription>
          </Alert>

          <TestingCleanPayOrderPreview
            orderId={previewOrderId}
            title="Itemized earnings (same data as feeder Clean Pay)"
            description="Uses your admin session: you are the test customer on this order, so you can preview the live RPC summary. Refresh after the feeder accepts to see locked offer / pickup states."
          />
        </CardContent>
      </Card>
    </div>
  );
};

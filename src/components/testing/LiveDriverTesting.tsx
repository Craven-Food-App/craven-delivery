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

interface OnlineDriver {
  id: string;
  user_id: string;
  full_name: string;
  vehicle_type: string;
  vehicle_make: string;
  vehicle_model: string;
  current_latitude: number | null;
  current_longitude: number | null;
  is_available: boolean;
  rating: number;
}

export const LiveDriverTesting = () => {
  const [onlineDrivers, setOnlineDrivers] = useState<OnlineDriver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [orderType, setOrderType] = useState<'restaurant' | 'retail'>('restaurant');
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
      // Primary source: driver_profiles with is_available=true AND status='online'
      // This is the authoritative source — a feeder is "actively feeding" when they
      // chose "Feed Now", selected an end time, and their profile reflects that.
      // driver_sessions may not exist for all feeders (not all create session records).
      const { data: activeProfiles, error: profilesError } = await supabase
        .from('driver_profiles')
        .select('id, user_id, vehicle_type, vehicle_make, vehicle_model, rating, is_available, status, last_location_update')
        .eq('is_available', true)
        .eq('status', 'online');

      if (profilesError) {
        console.error('Error fetching active feeder profiles:', profilesError);
        throw profilesError;
      }

      console.log('Active feeder profiles (is_available + online):', activeProfiles?.length || 0);

      if (!activeProfiles || activeProfiles.length === 0) {
        setOnlineDrivers([]);
        setIsLoading(false);
        return;
      }

      const driverUserIds = [...new Set(activeProfiles.map(d => d.user_id))];

      // Fetch names and locations in parallel
      const [profilesResult, locationsResult] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('user_id, full_name')
          .in('user_id', driverUserIds),
        supabase
          .from('craver_locations')
          .select('user_id, lat, lng')
          .in('user_id', driverUserIds),
      ]);

      const profiles = profilesResult.data;
      const locations = locationsResult.data;

      const seenUserIds = new Set<string>();
      const combinedDrivers: OnlineDriver[] = activeProfiles
        .filter(driver => {
          if (seenUserIds.has(driver.user_id)) return false;
          seenUserIds.add(driver.user_id);
          return true;
        })
        .map(driver => {
          const profile = profiles?.find(p => p.user_id === driver.user_id);
          const location = locations?.find(l => l.user_id === driver.user_id);
          return {
            ...driver,
            full_name: profile?.full_name || 'Unknown Feeder',
            current_latitude: location?.lat || null,
            current_longitude: location?.lng || null,
            is_available: true,
            rating: driver.rating || 5.0,
          };
        });

      setOnlineDrivers(combinedDrivers);
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
          <CardDescription>Currently available feeders</CardDescription>
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
        </CardContent>
      </Card>
    </div>
  );
};

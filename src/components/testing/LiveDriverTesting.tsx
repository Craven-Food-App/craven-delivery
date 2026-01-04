import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
      // Check current user and their role
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      console.log('=== CURRENT USER CHECK ===');
      console.log('Current user ID:', currentUser?.id);
      
      if (currentUser) {
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', currentUser.id);
        console.log('Current user roles:', userRoles);
      }
      // Try to use a join query first (more efficient)
      // Note: driver_sessions.driver_id = driver_profiles.user_id (both are auth user IDs)
      let drivers: any[] = [];
      
      // Manual join approach - driver_sessions.driver_id = user.id (auth user ID)
      // driver_profiles.user_id = user.id (auth user ID)
      // So we match: driver_sessions.driver_id = driver_profiles.user_id
      
      // First, check if ANY sessions exist at all (for debugging)
      const { data: allSessionsCheck, error: allSessionsError } = await supabase
        .from('driver_sessions')
        .select('driver_id, is_online, last_activity, session_data')
        .limit(10);
      
      console.log('=== ALL SESSIONS CHECK (first 10) ===');
      console.log('Total sessions found:', allSessionsCheck?.length || 0);
      console.log('Sessions:', allSessionsCheck);
      if (allSessionsError) {
        console.error('Error fetching all sessions:', allSessionsError);
      }

      // Get active sessions where drivers are actively searching
      // Only show drivers with driver_state = 'online_searching' in session_data
      const { data: activeSessions, error: sessionsError } = await supabase
        .from('driver_sessions')
        .select('driver_id, is_online, last_activity, session_data')
        .eq('is_online', true);
      
      if (sessionsError) {
        console.error('Error fetching driver sessions:', sessionsError);
        throw sessionsError;
      }

      // Debug: Log all active sessions to see what we have
      console.log('=== DRIVER SESSIONS DEBUG ===');
      console.log('Total active sessions (is_online=true):', activeSessions?.length || 0);
      activeSessions?.forEach((session, idx) => {
        const sessionData = session.session_data as any;
        console.log(`Session ${idx + 1}:`, {
          driver_id: session.driver_id,
          is_online: session.is_online,
          last_activity: session.last_activity,
          driver_state: sessionData?.driver_state || 'NOT SET',
          full_session_data: sessionData
        });
      });

      // Filter to only drivers who are actively searching (not paused, not on delivery)
      // Also include drivers without driver_state set (legacy sessions) - treat them as searching
      const searchingSessions = (activeSessions || []).filter(session => {
        const sessionData = session.session_data as any;
        const driverState = sessionData?.driver_state;
        // Include drivers in 'online_searching' state OR drivers without driver_state set (legacy)
        const isSearching = driverState === 'online_searching' || driverState === undefined || driverState === null;
        if (!isSearching) {
          console.log(`⚠️ Driver ${session.driver_id} filtered out - state: ${driverState}`);
        } else if (driverState === undefined || driverState === null) {
          console.log(`ℹ️ Driver ${session.driver_id} included (no driver_state set - treating as searching)`);
        }
        return isSearching;
      });

      console.log('Actively searching sessions (driver_state=online_searching):', searchingSessions.length);
      
      if (searchingSessions.length === 0) {
        console.warn('⚠️ No drivers found in "online_searching" state.');
        
        // Fallback: Check driver_profiles.is_available as backup indicator
        // This handles the case where sessions aren't being created properly
        // Show drivers who are marked as available and online
        // Use a longer time window (30 minutes) to catch drivers who may not have updated location recently
        console.log('Checking driver_profiles.is_available as fallback...');
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const { data: availableDrivers, error: availableError } = await supabase
          .from('driver_profiles')
          .select('id, user_id, vehicle_type, vehicle_make, vehicle_model, rating, is_available, status, last_location_update')
          .eq('is_available', true)
          .eq('status', 'online')
          .or(`last_location_update.gte.${thirtyMinutesAgo},last_location_update.is.null`); // Drivers active in last 30 min OR no location update recorded
        
        console.log('Available drivers from driver_profiles:', availableDrivers?.length || 0, availableDrivers);
        
        if (availableDrivers && availableDrivers.length > 0) {
          console.log('⚠️ Found drivers with is_available=true but no matching sessions. Using driver_profiles as fallback.');
          
          // Use available drivers as fallback - treat them as actively searching
          const driverUserIds = [...new Set(availableDrivers.map(d => d.user_id))];
          
          const { data: profiles } = await supabase
            .from('user_profiles')
            .select('user_id, full_name')
            .in('user_id', driverUserIds);

          const { data: locations } = await supabase
            .from('craver_locations')
            .select('user_id, lat, lng')
            .in('user_id', driverUserIds);

          const seenUserIds = new Set();
          const combinedDrivers: OnlineDriver[] = availableDrivers
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
                full_name: profile?.full_name || 'Unknown Driver',
                current_latitude: location?.lat || null,
                current_longitude: location?.lng || null,
                is_available: true,
                rating: driver.rating || 5.0,
              };
            });

          setOnlineDrivers(combinedDrivers);
          setIsLoading(false);
          return;
        }
        
        setOnlineDrivers([]);
        setIsLoading(false);
        return;
      }

      // Get unique driver profile IDs from actively searching sessions
      // IMPORTANT: driver_sessions.driver_id references driver_profiles.id (not user_id)
      const activeDriverProfileIds = [...new Set(searchingSessions.map(s => s.driver_id))];
      console.log('Actively searching driver profile IDs:', activeDriverProfileIds);

      // Fetch driver profiles where id matches session driver_id
      const { data: profilesData, error: profilesError } = await supabase
        .from('driver_profiles')
        .select(`
          id,
          user_id,
          vehicle_type,
          vehicle_make,
          vehicle_model,
          rating
        `)
        .in('id', activeDriverProfileIds);

      if (profilesError) {
        console.error('Error fetching driver profiles:', profilesError);
        throw profilesError;
      }

      drivers = profilesData || [];
      console.log('Driver profiles found:', drivers.length, drivers);

      if (!drivers || drivers.length === 0) {
        setOnlineDrivers([]);
        setIsLoading(false);
        return;
      }

      const driverUserIds = [...new Set(drivers.map(d => d.user_id))];

      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, full_name')
        .in('user_id', driverUserIds);

      const { data: locations } = await supabase
        .from('craver_locations')
        .select('user_id, lat, lng')
        .in('user_id', driverUserIds);

      const seenUserIds = new Set();
      const combinedDrivers: OnlineDriver[] = drivers
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
            full_name: profile?.full_name || 'Unknown Driver',
            current_latitude: location?.lat || null,
            current_longitude: location?.lng || null,
            is_available: true, // They're available if they have an active session
            rating: driver.rating || 5.0,
          };
        });

      setOnlineDrivers(combinedDrivers);
    } catch (error: any) {
      console.error('Error fetching online drivers:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to fetch online drivers',
        variant: 'destructive',
      });
    }
    setIsLoading(false);
  };

  const sendTestOrder = async () => {
    if (!selectedDriver) {
      toast({
        title: 'No Driver Selected',
        description: 'Please select a driver to send the test order to',
        variant: 'destructive',
      });
      return;
    }

    setIsSendingTest(true);
    try {
      // Step 1: Create order (must complete first)
      const { data: result, error: fnError } = await supabase.functions.invoke('create-test-order', {
        body: { driverId: selectedDriver }
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
        description: 'Test order has been assigned to the selected driver.',
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
            Live Driver Testing
          </CardTitle>
          <CardDescription>
            Send test orders to real online drivers for testing push notifications and order flow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This sends real push notifications to actual drivers. Only use for testing purposes.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Online Drivers ({onlineDrivers.length})
          </CardTitle>
          <CardDescription>Currently available drivers</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchOnlineDrivers} variant="outline" className="mb-4" disabled={isLoading}>
            {isLoading ? 'Refreshing...' : 'Refresh Drivers'}
          </Button>
          {onlineDrivers.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>No drivers are currently online.</AlertDescription>
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
                        <p className="text-sm text-muted-foreground">Driver ID: {driver.user_id.slice(0, 8)}</p>
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
          <Select value={selectedDriver} onValueChange={setSelectedDriver}>
            <SelectTrigger><SelectValue placeholder="Choose a driver..." /></SelectTrigger>
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
              The selected driver will receive a push notification and see a test order assignment modal.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

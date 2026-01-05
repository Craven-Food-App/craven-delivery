import React, { useCallback, useState, useEffect } from 'react';
import { MapPin, Settings, Pause, Play, Square, Clock, Car, DollarSign, Calendar, Bell, User, Star, ChevronRight, Menu, X, Home, TrendingUp, HelpCircle, LogOut, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { OrderAssignmentModal } from './OrderAssignmentModal';
import ActiveDeliveryFlow from './ActiveDeliveryFlow';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { useIOSNotifications } from '@/hooks/useIOSNotifications';
import { IOSNotificationBanner } from './IOSNotificationBanner';
import { MobileMapbox } from './MobileMapbox';
import { DriveTimeSelector } from './DriveTimeSelector';
import LoadingScreen from './LoadingScreen';
import MobileDriverWelcomeScreen from './MobileDriverWelcomeScreen';
import { SpeedLimitSign } from './SpeedLimitSign';
import { useDriverLocation } from '@/hooks/useDriverLocation';
import { useNavigate, useSearchParams } from 'react-router-dom';
import FeederPromotionsTab from './FeederPromotionsTab';
import { DeliveryZone, getZoneForLocation } from '@/data/deliveryZones';
import FeederScheduleTab from './FeederScheduleTab';
import CorporateEarningsDashboard from './CorporateEarningsDashboard';
import FeederAccountPage from './FeederAccountPage';
import FeederRatingsTab from './FeederRatingsTab';
import CravenAppComm from './CravenAppComm';
import { getRatingColor, getRatingTier, formatRating, getTrendIcon, getTrendColor } from '@/utils/ratingHelpers';
import NotificationsPage from '@/components/notifications/NotificationsPage';
import FeederSidebarMenu from './FeederSidebarMenu';
import CravenFillCountdownFlow from '@/components/CravenFillCountdownFlow';
import NearbyRestaurantCards from './NearbyRestaurantCards';
import ActiveFeedingMenu from './ActiveFeedingMenu';
import GetBackToFeedingCard from './GetBackToFeedingCard';
// Production readiness imports
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';
import { useCrashReporting } from '@/hooks/useCrashReporting';
import { useAnalytics } from '@/hooks/useAnalytics';
import { LoadingState, LoadingOverlay } from '@/components/LoadingStates';
import OfflineIndicator from '@/components/OfflineIndicator';
type DriverState = 'offline' | 'online_searching' | 'online_paused' | 'on_delivery';
type VehicleType = 'car' | 'bike' | 'scooter' | 'walk' | 'motorcycle';
type EarningMode = 'perHour' | 'perOffer';
interface OrderAssignment {
  assignment_id: string;
  order_id: string;
  restaurant_name: string;
  pickup_address: any; // JSON address object
  dropoff_address: any; // JSON address object
  payout_cents: number;
  distance_km: number;
  distance_mi: string;
  expires_at: string;
  estimated_time: number;
  isTestOrder?: boolean; // Add test order flag
}
export const MobileDriverDashboard: React.FC = () => {
  // Production readiness hooks
  const { isOnline, isSlowConnection } = useNetworkStatus();
  const { data: offlineData, setData: setOfflineData } = useOfflineStorage({
    key: 'driver_state',
    defaultValue: { state: 'offline', timestamp: Date.now() }
  });
  const { trackEvent, trackUserAction, trackError } = useAnalytics();
  const { reportCustomError } = useCrashReporting();
  const { trackApiCall } = usePerformanceMonitoring('MobileDriverDashboard');

  // Function to get current time index for highlighting
  const getCurrentTimeIndex = () => {
    const now = new Date();
    const currentHour = now.getHours();
    
    // Map 24-hour time to our time slots (6a = 6, 7a = 7, etc.)
    const timeMap: { [key: number]: number } = {
      6: 0,   // 6a
      7: 1,   // 7a  
      8: 2,   // 8a
      9: 3,   // 9a
      10: 4,  // 10a
      11: 5,  // 11a
      12: 6,  // 12p
      13: 7,  // 1p
      14: 8,  // 2p
      15: 9,  // 3p
      16: 10, // 4p
      17: 11, // 5p
      18: 12, // 6p
      19: 13, // 7p
      20: 14, // 8p
      21: 15, // 9p
      22: 16, // 10p
      23: 17  // 11p
    };
    
    return timeMap[currentHour] ?? -1; // -1 if no match
  };

  const [driverState, setDriverState] = useState<DriverState>('offline');
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('car');
  const [earningMode, setEarningMode] = useState<EarningMode>('perHour');
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [onlineTime, setOnlineTime] = useState(0);
  const [currentCity, setCurrentCity] = useState<string>('');
  const [user, setUser] = useState<any>(null);
  
  // Session earnings - accumulates as deliveries are completed
  const [sessionEarnings, setSessionEarnings] = useState<number>(0);
  
  // Persistent session management
  const [sessionData, setSessionData] = useState<any>(null);
  const [isSessionRestored, setIsSessionRestored] = useState(false);
  const [heartbeatInterval, setHeartbeatInterval] = useState<NodeJS.Timeout | null>(null);
  const [isGoingOnline, setIsGoingOnline] = useState(false);
  
  // Pause timer state
  const [pauseTimeRemaining, setPauseTimeRemaining] = useState(1800); // 30 minutes in seconds
  const [pauseStartTime, setPauseStartTime] = useState<Date | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isInDeliveryZone, setIsInDeliveryZone] = useState(true);
  const [lastZoneCheck, setLastZoneCheck] = useState<Date | null>(null);
  const handleZoneStatusChange = useCallback(({ isInZone, zone }: { isInZone: boolean; zone: DeliveryZone | null }) => {
    setIsInDeliveryZone(isInZone);
    setLastZoneCheck(new Date());
    if (zone) {
      setCurrentCity(zone.name);
    }
  }, []);
  
  // Check delivery availability
  const checkDeliveryAvailability = async (lat: number, lng: number) => {
    const zone = getZoneForLocation([lat, lng]);
    return Boolean(zone);
  };
  
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  
  // Fetch and maintain user state
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    
    fetchUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  // Fast session restoration on app startup
  useEffect(() => {
    const restoreSession = async () => {
      try {
        // First, check auth quickly
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsSessionRestored(true);
          return;
        }
        
        // Check for active session with timeout
        const sessionPromise = supabase
          .from('driver_sessions')
          .select('session_data, is_online')
          .eq('driver_id', user.id)
          .eq('is_online', true)
          .maybeSingle();
          
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), 2000)
        );
        
        const { data: session, error } = await Promise.race([sessionPromise, timeoutPromise]) as any;
          
        if (session && !error && session.session_data?.online_since) {
          setSessionData(session.session_data);
          setDriverState('online_searching');
          
          // Calculate online time
          const onlineSince = new Date(session.session_data.online_since).getTime();
          setOnlineTime(Math.max(0, Date.now() - onlineSince));
          
          // Restore end time if set
          if (session.session_data?.end_time) {
            setEndTime(new Date(session.session_data.end_time));
          }
          
          // Start background tasks after UI is ready
          setTimeout(() => {
            setupRealtimeListener(user.id);
            const interval = startSessionHeartbeat(user.id);
            setHeartbeatInterval(interval);
          }, 100);
        }
        
        setIsSessionRestored(true);
      } catch (error) {
        console.error('Session restore error:', error);
        setIsSessionRestored(true);
      }
    };
    
    restoreSession();
    
    // Fallback: force restore after 3 seconds if still loading
    const fallbackTimer = setTimeout(() => {
      setIsSessionRestored(true);
    }, 3000);
    
    return () => clearTimeout(fallbackTimer);
  }, []);
  
  // Session heartbeat to keep driver online when app is backgrounded
  const startSessionHeartbeat = (userId: string) => {
    const heartbeat = setInterval(async () => {
      try {
        await supabase.from('driver_sessions').update({
          last_activity: new Date().toISOString(),
          session_data: {
            ...sessionData,
            last_heartbeat: new Date().toISOString()
          }
        }).eq('driver_id', userId);
      } catch (error) {
        console.error('Session heartbeat error:', error);
      }
    }, 30000); // Every 30 seconds
    
    return heartbeat;
  };
  
  // Setup push notifications for background order assignments
  useEffect(() => {
    const setupPushNotifications = async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          
          if (!subscription) {
            // Request permission and subscribe
            const newSubscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY
            });
            
            // Save subscription to database
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase.from('driver_push_subscriptions').upsert({
                driver_id: user.id,
                endpoint: newSubscription.endpoint,
              p256dh_key: (newSubscription as any).keys?.p256dh || '',
                auth_key: (newSubscription as any).keys?.auth || '',
                created_at: new Date().toISOString()
              } as any);
            }
          }
        } catch (error) {
          console.error('Push notification setup error:', error);
        }
      }
    };
    
    if (driverState === 'online_searching' || driverState === 'on_delivery') {
      setupPushNotifications();
    }
  }, [driverState]);
  
  // Listen for pause after delivery event
  useEffect(() => {
    const handlePauseAfterDelivery = () => {
      handlePause();
    };

    window.addEventListener('pauseAfterDelivery', handlePauseAfterDelivery);

    return () => {
      window.removeEventListener('pauseAfterDelivery', handlePauseAfterDelivery);
    };
  }, []);

  // Pause timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (driverState === 'online_paused' && pauseStartTime) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - pauseStartTime.getTime()) / 1000);
        const remaining = Math.max(0, 1800 - elapsed); // 30 minutes in seconds
        setPauseTimeRemaining(remaining);
        
        // Auto-end pause after 30 minutes (but allow 35 minutes before booting offline)
        if (remaining === 0) {
          // Check if they've been paused for 35+ minutes total
          const totalPaused = Math.floor((now.getTime() - pauseStartTime.getTime()) / 1000);
          if (totalPaused >= 2100) { // 35 minutes = 2100 seconds
            // Boot them offline automatically
            handleGoOffline();
          } else {
            // Just end the pause, they can resume
            handleUnpause();
          }
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [driverState, pauseStartTime]);
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isActiveFeedingMenuOpen, setIsActiveFeedingMenuOpen] = useState(false);
  const [isViewingHomeWhileFeeding, setIsViewingHomeWhileFeeding] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'schedule' | 'earnings' | 'notifications' | 'account' | 'ratings' | 'promos' | 'preferences' | 'help' | 'messages'>('home');
  const [driverRating, setDriverRating] = useState<number>(5.0);
  const [driverDeliveries, setDriverDeliveries] = useState<number>(0);
  const [ratingTrend, setRatingTrend] = useState<number>(0);
  const [notifications, setNotifications] = useState<any[]>([]); // Add notifications state
  
  // Get location and speed data
  const {
    location,
    isTracking,
    error: locationError,
    startTracking,
    stopTracking
  } = useDriverLocation();
  
  // Navigation
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Handle URL parameter changes
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['schedule', 'earnings', 'notifications', 'account', 'ratings', 'promos', 'preferences', 'help', 'messages'].includes(tab)) {
      setActiveTab(tab as 'schedule' | 'earnings' | 'notifications' | 'account' | 'ratings' | 'promos' | 'preferences' | 'help' | 'messages');
    } else {
      setActiveTab('home');
    }
  }, [searchParams]);

  // Listen for switchTab custom events (for in-app navigation without page reload)
  useEffect(() => {
    const handleSwitchTab = (event: CustomEvent<{ tab: string; section?: string }>) => {
      const { tab, section } = event.detail;
      if (['schedule', 'earnings', 'notifications', 'account', 'ratings', 'promos', 'preferences', 'help', 'messages'].includes(tab)) {
        setActiveTab(tab as any);
        // Update URL without causing reload
        const newUrl = section ? `/mobile?tab=${tab}&section=${section}` : `/mobile?tab=${tab}`;
        window.history.pushState({}, '', newUrl);
      }
    };

    window.addEventListener('switchTab', handleSwitchTab as EventListener);
    return () => window.removeEventListener('switchTab', handleSwitchTab as EventListener);
  }, []);

  // Fetch driver rating data
  useEffect(() => {
    const fetchDriverRating = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Use driver_profiles table for now (has rating field)
        const { data: profile } = await supabase
          .from('driver_profiles')
          .select('rating, total_deliveries')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profile) {
          setDriverRating(Number(profile.rating) || 5.0);
          setDriverDeliveries(profile.total_deliveries || 0);
          setRatingTrend(0); // Will calculate from metrics table once migration runs
        }
      } catch (error) {
        console.error('Error fetching driver rating:', error);
      }
    };

    fetchDriverRating();
  }, []);
  
  // Logout handler
  const handleLogout = async () => {
    try {
      // Clear session heartbeat
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        setHeartbeatInterval(null);
      }
      
      // Clear driver session
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('driver_sessions').update({
          is_online: false,
          session_data: {}
        }).eq('driver_id', user.id);
        
        await supabase.from('driver_profiles').update({
          status: 'offline',
          is_available: false
        }).eq('user_id', user.id);
      }
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Close menu
      setIsMenuOpen(false);
      
      // Redirect to mobile splash page
      navigate('/mobile');
    } catch (error) {
      console.error('Error during logout:', error);
      // Clear session heartbeat even on error
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        setHeartbeatInterval(null);
      }
      // Force logout even if there's an error
      await supabase.auth.signOut();
      setIsMenuOpen(false);
      // Redirect to mobile splash page
      navigate('/mobile');
    }
  };

  // Menu navigation handlers
  const handleMenuNavigation = (menuItem: string) => {
    setIsMenuOpen(false); // Close menu first
    
    switch (menuItem) {
      case 'Home':
        setActiveTab('home');
        navigate('/mobile');
        break;
      case 'Schedule':
        // Navigate to mobile schedule section
        navigate('/mobile?tab=schedule');
        break;
      case 'Account':
        // Navigate to mobile account section
        navigate('/mobile?tab=account');
        break;
      case 'Ratings':
        setActiveTab('ratings');
        navigate('/mobile?tab=ratings');
        break;
      case 'Earnings':
        // Navigate to mobile earnings section
        navigate('/mobile?tab=earnings');
        break;
      case 'Promos':
        setActiveTab('promos');
        navigate('/mobile?tab=promos');
        break;
      case 'Help':
      case 'Chat':
      case 'Messages':
        setActiveTab('messages');
        navigate('/mobile?tab=messages');
        break;
      case 'Logout':
        // Handle logout
        handleLogout();
        break;
      default:
        break;
    }
  };
  const [currentOrderAssignment, setCurrentOrderAssignment] = useState<OrderAssignment | null>(null);
  const [activeDelivery, setActiveDelivery] = useState<any>(null);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [tripCount, setTripCount] = useState(0);
  const [isAvailable, setIsAvailable] = useState(false);
  const [showTimeSelector, setShowTimeSelector] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const {
    playNotification
  } = useNotificationSettings();
  const { showNotification, notifications: iosNotifications, dismissNotification } = useIOSNotifications();

  const handleStartFeeding = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session && session.user) {
        // User is logged in - check onboarding and route accordingly
        const { data: application } = await supabase
          .from('craver_applications')
          .select('onboarding_completed_at, status')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!application) {
          // No application - keep welcome screen visible (they can apply)
          return;
        }

        // If onboarding not complete, redirect to enhanced onboarding
        if (!application.onboarding_completed_at) {
          window.location.href = '/enhanced-onboarding';
          return;
        }

        // Onboarding complete - hide welcome screen
        setShowWelcomeScreen(false);
        // Note: checkSessionPersistence will be called separately after component mounts
      } else {
        // No session - welcome screen will handle showing the login
        // Keep welcome screen visible
      }
    } catch (error) {
      console.error('handleStartFeeding: Error checking session:', error);
      // On error, keep welcome screen visible
    }
  }, []);

  // Setup real-time listener for order assignments (broadcast + DB changes)
  const setupRealtimeListener = (userId: string) => {
    const broadcastChannel = supabase.channel(`driver_${userId}`).on('broadcast', {
      event: 'order_assignment'
    }, payload => {
      setCurrentOrderAssignment({
        assignment_id: payload.payload.assignment_id,
        order_id: payload.payload.order_id,
        restaurant_name: payload.payload.restaurant_name,
        pickup_address: payload.payload.pickup_address,
        dropoff_address: payload.payload.dropoff_address,
        payout_cents: payload.payload.payout_cents,
        distance_km: payload.payload.distance_km,
        distance_mi: payload.payload.distance_mi,
        expires_at: payload.payload.expires_at,
        estimated_time: payload.payload.estimated_time,
        isTestOrder: payload.payload.isTestOrder // Add test order flag
      });
      setShowOrderModal(true);

      // Show iOS notification
      const pickup = typeof payload.payload.pickup_address === 'string'
        ? payload.payload.pickup_address
        : payload.payload.pickup_address && typeof payload.payload.pickup_address === 'object'
          ? [
              (payload.payload.pickup_address as any).address, 
              (payload.payload.pickup_address as any).city, 
              (payload.payload.pickup_address as any).state
            ].filter(Boolean).join(', ')
          : 'restaurant';
      showNotification(
        `New Order: ${payload.payload.restaurant_name || 'Pickup'}`,
        `Pickup at ${pickup}`,
        8000
      );

      // Play notification sound
      playNotification();
    }).subscribe();
    const dbChannel = supabase.channel(`order_assignments_${userId}`).on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'order_assignments',
      filter: `driver_id=eq.${userId}`
    }, async (payload: any) => {
      const assignment = payload.new as {
        id: string;
        order_id: string;
        expires_at: string;
      };
      // Fetch order summary to populate modal
      const {
        data: order
      } = await supabase.from('orders').select('pickup_address, dropoff_address, payout_cents, distance_km').eq('id', assignment.order_id).maybeSingle();
      if (order) {
        setCurrentOrderAssignment({
          assignment_id: assignment.id,
          order_id: assignment.order_id,
          restaurant_name: 'New Order',
          pickup_address: order.pickup_address,
          dropoff_address: order.dropoff_address,
          payout_cents: order.payout_cents || 0,
          distance_km: Number(order.distance_km) || 0,
          distance_mi: ((Number(order.distance_km) || 0) * 0.621371).toFixed(1),
          expires_at: assignment.expires_at,
          estimated_time: Math.ceil((Number(order.distance_km) || 0) * 2.5)
        });
        setShowOrderModal(true);

        // Show iOS notification
        const pickup = typeof order.pickup_address === 'string'
          ? order.pickup_address
          : order.pickup_address && typeof order.pickup_address === 'object' && order.pickup_address !== null
            ? [
                (order.pickup_address as any).address, 
                (order.pickup_address as any).city, 
                (order.pickup_address as any).state
              ].filter(Boolean).join(', ')
            : 'restaurant';
        showNotification(
          'New Order Available',
          `Pickup at ${pickup}`,
          8000
        );

        // Play notification sound
        playNotification();
      }
    }).subscribe();
    return () => {
      supabase.removeChannel(broadcastChannel);
      supabase.removeChannel(dbChannel);
    };
  };

  // Check session persistence and onboarding on component mount
  useEffect(() => {
    let isMounted = true;
    let loadingTimer: NodeJS.Timeout;
    let failsafeTimer: NodeJS.Timeout;
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        // Clear any ongoing timers/intervals
        if (loadingTimer) clearTimeout(loadingTimer);
        if (failsafeTimer) clearTimeout(failsafeTimer);
        // Show welcome screen on logout (not redirect to wrong auth page)
        setShowWelcomeScreen(true);
        return;
      }
    });
    
    const initializeDashboard = async () => {
      // Failsafe: If loading takes more than 5 seconds, force show welcome screen
      failsafeTimer = setTimeout(() => {
        if (isMounted && isLoading) {
          setIsLoading(false);
          setShowWelcomeScreen(true);
          setLoadingError(true);
        }
      }, 5000);
      
      try {
        await checkOnboardingAndSession();
        // If checkOnboardingAndSession sets showWelcomeScreen to false, don't override it
      } catch (error) {
        console.error('MobileDriverDashboard: Error during initialization:', error);
        // On error, show welcome screen
          if (isMounted) {
            setIsLoading(false);
            setShowWelcomeScreen(true);
          }
      }
    };

    initializeDashboard();
    
    return () => {
      isMounted = false;
      if (loadingTimer) clearTimeout(loadingTimer);
      if (failsafeTimer) clearTimeout(failsafeTimer);
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      subscription?.unsubscribe();
    };
  }, []);

  const checkOnboardingAndSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // No user - show welcome screen with login
        return;
      }

      // Check application and onboarding status with timeout
      const queryPromise = supabase
        .from('craver_applications')
        .select('onboarding_completed_at, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Onboarding check timeout')), 10000)
      );

      const result = await Promise.race([
        queryPromise,
        timeoutPromise
      ]) as { data: any, error: any };

      const { data: application, error } = result;

      if (error) {
        console.warn('⚠️ Could not check onboarding status:', error.message);
        // Continue - don't block user if query fails
        return;
      }

      if (!application) {
        // No application - show welcome screen with login (they can apply)
        return;
      }

      // If application exists but onboarding not complete, redirect to enhanced onboarding
      if (!application.onboarding_completed_at) {
        console.log('📚 Onboarding not complete, redirecting to enhanced-onboarding');
        window.location.href = '/enhanced-onboarding';
        return;
      }

      // User is logged in and onboarded - skip welcome screen and go straight to dashboard
      console.log('✅ User is logged in and onboarded - showing dashboard');
      setShowWelcomeScreen(false);
      setIsLoading(false);
      
      // Check session persistence for returning drivers
      await checkSessionPersistence();
    } catch (error) {
      console.warn('⚠️ Error checking onboarding (non-critical):', error);
      // Continue - don't block user if check fails
    }
  };
  const checkSessionPersistence = async () => {
    try {
      // First, refresh the session to ensure it's valid
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      
      if (sessionError) {
        console.error('Session refresh failed:', sessionError);
        // If session refresh fails, show welcome screen with login
        setShowWelcomeScreen(true);
        return;
      }
      
      if (!session?.user) {
        // No session - show welcome screen with login
        setShowWelcomeScreen(true);
        return;
      }
      
      const user = session.user;

      // Check if driver was previously online
      const {
        data: driverSession
      } = await supabase.from('driver_sessions').select('*').eq('driver_id', user.id).maybeSingle();
      if (driverSession?.is_online && driverSession.session_data) {
        const sessionData = driverSession.session_data as any;

        // Check if session is still valid (end time hasn't passed)
        if (sessionData.end_time) {
          const endTime = new Date(sessionData.end_time);
          const now = new Date();
          if (now >= endTime) {
            // Session expired, clear it
            await supabase.from('driver_sessions').update({
              is_online: false,
              session_data: {}
            }).eq('driver_id', user.id);
            return;
          }

          // Restore end time
          setEndTime(endTime);
        }

        // Auto-restore online state
        setDriverState('online_searching');

        // Restore online time if available
        if (sessionData.online_since) {
          const onlineSince = new Date(sessionData.online_since);
          const now = new Date();
          const timeOnline = Math.floor((now.getTime() - onlineSince.getTime()) / 1000);
          setOnlineTime(timeOnline > 0 ? timeOnline : 0);
        }

        // Update driver profile to online
        await supabase.from('driver_profiles').update({
          status: 'online',
          is_available: true,
          last_location_update: new Date().toISOString()
        }).eq('user_id', user.id);

        // Update last activity
        await supabase.from('driver_sessions').update({
          last_activity: new Date().toISOString()
        }).eq('driver_id', user.id);

        // Setup realtime listener
        setupRealtimeListener(user.id);

        // Show seamless welcome back message
        const timeMessage = sessionData.end_time ? ` until ${new Date(sessionData.end_time).toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit'
        })}` : '';
      }
    } catch (error) {
      console.error('Error checking session persistence:', error);
    }
  };

  // Track online time and keep session updated
  useEffect(() => {
    if (driverState === 'online_searching') {
      const timer = setInterval(() => {
        setOnlineTime(prev => prev + 1);
      }, 1000);
      
      // Update session every 30 seconds to keep driver marked as online and searching
      // This ensures drivers in "Still searching" state remain visible as online
      const sessionUpdateInterval = setInterval(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Get current session data
          const { data: currentSession } = await supabase
            .from('driver_sessions')
            .select('session_data')
            .eq('driver_id', user.id)
            .maybeSingle();
          
          const currentSessionData = currentSession?.session_data || {};
          
          // Update session to keep driver_state as 'online_searching' and is_online as true
          // @ts-ignore - session_data type compatibility
          await supabase.from('driver_sessions').upsert({
            driver_id: user.id,
            is_online: true,
            last_activity: new Date().toISOString(),
            session_data: {
              ...(currentSessionData as any || {}),
              driver_state: 'online_searching', // Ensure state is maintained
              online_since: (currentSessionData as any)?.online_since || new Date().toISOString(),
              vehicle_type: (currentSessionData as any)?.vehicle_type || selectedVehicle,
              earning_mode: (currentSessionData as any)?.earning_mode || earningMode,
              current_city: (currentSessionData as any)?.current_city || currentCity,
              ...(endTime && { end_time: endTime.toISOString() }),
            }
          }, {
            onConflict: 'driver_id'
          });
        }
      }, 30000); // Update every 30 seconds
      
      return () => {
        clearInterval(timer);
        clearInterval(sessionUpdateInterval);
      };
    }
  }, [driverState, selectedVehicle, earningMode, currentCity, endTime]);

  // Listen for schedule status changes to sync START FEEDING button
  useEffect(() => {
    const handleStatusChange = (event: CustomEvent) => {
      const { status } = event.detail;
      if (status === 'online' && driverState === 'offline') {
        setDriverState('online_searching');
      } else if (status === 'offline' && driverState !== 'offline') {
        setDriverState('offline');
        setEndTime(null);
      }
    };
    
    window.addEventListener('driverStatusChange', handleStatusChange as EventListener);
    return () => window.removeEventListener('driverStatusChange', handleStatusChange as EventListener);
  }, [driverState]);
  const handleGoOnline = async () => {
    const startTime = Date.now();
    
    try {
      setIsGoingOnline(true);
      trackUserAction('driver_go_online');
      
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user found');
        const error = new Error('No authenticated user');
        trackError('driver_go_online_failed', { reason: 'no_user' });
        reportCustomError(error, 'handleGoOnline');
        toast.error('Authentication error. Please log in again.');
        setIsGoingOnline(false);
        return;
      }

      // Use the database function to ensure driver can go online
      const {
        error: ensureError
      } = await supabase.rpc('ensure_driver_can_go_online', {
        target_user_id: user.id
      });
      if (ensureError) {
        console.error('Failed to ensure driver can go online:', ensureError);
        toast.error('Unable to go online. Please try again.');
        setIsGoingOnline(false);
        return;
      }

      // Create session data with online timestamp
      const sessionData: Record<string, any> = {
        online_since: new Date().toISOString(),
        driver_state: 'online_searching',
        vehicle_type: selectedVehicle,
        earning_mode: earningMode,
        current_city: currentCity
      };
      if (endTime) {
        sessionData.end_time = endTime.toISOString();
      }
      
      // CRITICAL: Set driver state FIRST before any async operations
      setDriverState('online_searching');
      setOnlineTime(0);
      
      // Save session data to state for persistence
      setSessionData(sessionData);

      // Ensure driver profile exists before creating session
      let { data: existingProfile } = await supabase
        .from('driver_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      let profileExists = !!existingProfile;
      
      if (!existingProfile) {
        // Create driver profile if it doesn't exist
        const { data: newProfile, error: createProfileError } = await supabase
          .from('driver_profiles')
          .insert({
            user_id: user.id,
            status: 'online',
            is_available: true,
            last_location_update: new Date().toISOString()
          })
          .select('id')
          .single();
        if (createProfileError) {
          console.error('Error creating driver profile:', createProfileError);
        } else {
          profileExists = true;
          // Update existingProfile so we can use its id for session creation
          if (newProfile) {
            existingProfile = newProfile;
          }
        }
      }

      // Update driver profile to online
      const { error: profileError } = await supabase.from('driver_profiles').update({
        status: 'online',
        is_available: true,
        last_location_update: new Date().toISOString()
      }).eq('user_id', user.id);
      
      if (profileError) {
        console.error('Error updating driver profile:', profileError);
      }

      // Update or create driver session for persistence (only if profile exists)
      // NOTE: driver_sessions.driver_id must reference driver_profiles.id, not user.id
      if (profileExists && existingProfile) {
        const {
          error: sessionError
        } = await supabase.from('driver_sessions').upsert({
          driver_id: existingProfile.id, // Use profile.id, not user.id (FK constraint)
          is_online: true,
          last_activity: new Date().toISOString(),
          session_data: sessionData
        }, {
          onConflict: 'driver_id'
        });
        if (sessionError) {
          console.error('Error updating driver session:', sessionError);
          console.error('Session error details:', JSON.stringify(sessionError, null, 2));
        } else {
          console.log('✅ Driver session created/updated successfully');
        }
      } else {
        console.warn('⚠️ Cannot create session: profile does not exist');
      }

      // Get location and update craver_locations table
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async position => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);

          const zone = getZoneForLocation([location.lat, location.lng]);
          const isInZone = Boolean(zone);
          setIsInDeliveryZone(isInZone);
          setLastZoneCheck(new Date());
          if (zone) {
            setCurrentCity(zone.name);
          }

          // Update driver location in database for auto-assignment
          const {
            error: locationError
          } = await supabase.from('craver_locations').upsert({
            user_id: user.id,
            lat: location.lat,
            lng: location.lng,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });
          if (locationError) {
            console.error('Error updating driver location:', locationError);
          }
        });
      }
      
      // Update schedule availability status to sync with online/offline
      window.dispatchEvent(new CustomEvent('driverStatusChange', { 
        detail: { status: 'online' } 
      }));

      // Only show time selector if no end time is already set
      if (!endTime) {
        setShowTimeSelector(true);
      }
      setupRealtimeListener(user.id);
      
      // Start session heartbeat to keep driver online  
      const interval = startSessionHeartbeat(user.id);
      setHeartbeatInterval(interval);
      
      toast.success('You are now online and searching for orders!');
    } catch (error) {
      console.error('Error going online:', error);
      toast.error('Failed to go online. Please try again.');
      setDriverState('offline');
    } finally {
      setIsGoingOnline(false);
    }
  };
  const handleGoOffline = async () => {
    try {
      // Clear session heartbeat when going offline
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        setHeartbeatInterval(null);
      }
      
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (user) {
        const {
          error: profileError
        } = await supabase.from('driver_profiles').update({
          status: 'offline',
          is_available: false,
          last_location_update: new Date().toISOString()
        }).eq('user_id', user.id);
        if (profileError) {
          console.error('Error updating driver profile:', profileError);
        }

        // Clear session data when going offline
        await supabase.from('driver_sessions').upsert({
          driver_id: user.id,
          is_online: false,
          last_activity: new Date().toISOString(),
          session_data: {} // Clear session data
        }, {
          onConflict: 'driver_id'
        });
      }
      
      // Update schedule availability status to sync with online/offline
      window.dispatchEvent(new CustomEvent('driverStatusChange', { 
        detail: { status: 'offline' } 
      }));
      
      setDriverState('offline');
      setOnlineTime(0);
      setEndTime(null); // Clear end time
      setSessionEarnings(0); // Reset session earnings when ending feed
    } catch (error) {
      console.error('Error going offline:', error);
    }
  };
  const handlePause = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (user) {
        const {
          error: profileError
        } = await supabase.from('driver_profiles').update({
          status: 'paused',
          is_available: false,
          last_location_update: new Date().toISOString()
        }).eq('user_id', user.id);
        if (profileError) {
          console.error('Error updating driver profile:', profileError);
        }
      }
      
      // Start pause timer
      setPauseStartTime(new Date());
      setPauseTimeRemaining(2100); // 35 minutes
      
      // Update schedule availability status to sync with paused state
      window.dispatchEvent(new CustomEvent('driverStatusChange', { 
        detail: { status: 'offline' } 
      }));
      
      setDriverState('online_paused');
    } catch (error) {
      console.error('Error pausing:', error);
    }
  };
  const handleUnpause = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (user) {
        const {
          error: profileError
        } = await supabase.from('driver_profiles').update({
          status: 'online',
          is_available: true,
          last_location_update: new Date().toISOString()
        }).eq('user_id', user.id);
        if (profileError) {
          console.error('Error updating driver profile:', profileError);
        }
      }
      
      // Clear pause timer
      setPauseStartTime(null);
      setPauseTimeRemaining(1800); // 30 minutes
      
      // Update schedule availability status to sync with online state
      window.dispatchEvent(new CustomEvent('driverStatusChange', { 
        detail: { status: 'online' } 
      }));
      
      setDriverState('online_searching');
    } catch (error) {
      console.error('Error unpausing:', error);
    }
  };

  const handleAddTime = () => {
    if (endTime) {
      const newEndTime = new Date(endTime.getTime() + 30 * 60 * 1000); // Add 30 minutes
      setEndTime(newEndTime);
    }
  };

  const handleContactSupport = () => {
    // TODO: Implement customer service chat functionality
    // This could open a modal or navigate to a support page
  };
  const handleSelectDriveTime = async (minutes: number) => {
    const now = new Date();
    const selectedEnd = new Date(now.getTime() + minutes * 60 * 1000);
    setEndTime(selectedEnd);
    setShowTimeSelector(false);

    // Update session with end time
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (user) {
        const {
          data: currentSession
        } = await supabase.from('driver_sessions').select('session_data').eq('driver_id', user.id).maybeSingle();
        const sessionData: Record<string, any> = {
          ...(currentSession?.session_data as object || {}),
          end_time: selectedEnd.toISOString()
        };
        await supabase.from('driver_sessions').update({
          session_data: sessionData
        }).eq('driver_id', user.id);
      }
    } catch (error) {
      console.error('Error updating session with end time:', error);
    }
  };
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };
  const getVehicleIcon = () => {
    switch (selectedVehicle) {
      case 'car':
        return '🚗';
      case 'bike':
        return '🚲';
      case 'scooter':
        return '🛴';
      case 'motorcycle':
        return '🏍️';
      case 'walk':
        return '🚶';
      default:
        return '🚗';
    }
  };

  return <>
    {/* iOS Notification Banners */}
    {iosNotifications.map((notification) => (
      <IOSNotificationBanner
        key={notification.id}
        title={notification.title}
        message={notification.message}
        duration={notification.duration}
        onDismiss={() => dismissNotification(notification.id)}
      />
    ))}
    
    <LoadingScreen isLoading={isLoading} />
    
    {showWelcomeScreen && (
      <MobileDriverWelcomeScreen onStartFeeding={handleStartFeeding} />
    )}
    
    {/* Session restoration loading */}
    {!isSessionRestored && (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Restoring your session...</p>
        </div>
      </div>
    )}

    {!isLoading && !showWelcomeScreen && isSessionRestored && (
    <div className="fixed inset-0 h-[100dvh] w-screen bg-background overflow-hidden safe-area-top">
      {/* Offline Indicator */}
      <OfflineIndicator />
      
      {/* Full Screen Map Background - Full height */}
      <div className="absolute inset-0 z-0 map-touch">
        <MobileMapbox onZoneStatusChange={handleZoneStatusChange} />
      </div>

      {/* Hamburger Menu Button - Top Left - Only on Home Tab, but NOT during delivery */}
      {activeTab === 'home' && driverState !== 'on_delivery' && (
        <div className="fixed left-4 z-50 pointer-events-auto" style={{ top: 'calc(env(safe-area-inset-top, 150px) + 43px)' }}>
          <button
            onClick={() => {
              // Open ActiveFeedingMenu ONLY when on secondary feeding dashboard (not viewing home)
              // When viewing home while feeding, show regular menu
              if ((driverState === 'online_searching' || driverState === 'online_paused') && !isViewingHomeWhileFeeding) {
                setIsActiveFeedingMenuOpen(true);
              } else {
                setIsMenuOpen(true);
              }
            }}
            className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-all"
          >
            <Menu className="h-5 w-5 text-gray-700" />
          </button>
        </div>
      )}

      {/* Speed Limit & Current Speed - Under Hamburger Menu - Only on Home Tab */}
      {activeTab === 'home' && (
        <div className="fixed left-4 z-40 pointer-events-auto" style={{ top: 'calc(env(safe-area-inset-top, 150px) + 95px)' }}>
          <SpeedLimitSign 
            currentSpeed={location?.speed ? location.speed * 2.237 : 0} // Convert m/s to mph
            location={location ? {
              latitude: location.latitude,
              longitude: location.longitude
            } : undefined} 
          />
        </div>
      )}

      {/* Main Content Overlay - Non-interactive overlay */}
      <div className={`fixed inset-0 z-10 flex flex-col py-0 safe-area-top ${activeTab === 'home' ? 'pointer-events-none' : 'pointer-events-auto'}`}>
        
        {/* Tab-based Content Rendering */}
        {activeTab === 'schedule' && (
          <div className="fixed inset-0 z-20 overflow-hidden">
            <FeederScheduleTab 
              onOpenMenu={() => setIsMenuOpen(true)}
              onOpenNotifications={() => {
                setActiveTab('notifications');
                navigate('/mobile?tab=notifications');
              }}
            />
          </div>
        )}
        
        {activeTab === 'earnings' && (
          <div className="fixed inset-0 z-20 overflow-hidden">
            <CorporateEarningsDashboard 
              onOpenMenu={() => setIsMenuOpen(true)}
              onOpenNotifications={() => {
                setActiveTab('notifications');
                navigate('/mobile?tab=notifications');
              }}
            />
          </div>
        )}
        
        {activeTab === 'account' && (
          <div className="fixed inset-0 z-20 overflow-hidden">
            <FeederAccountPage 
              onOpenMenu={() => setIsMenuOpen(true)}
              onOpenNotifications={() => {
                setActiveTab('notifications');
                navigate('/mobile?tab=notifications');
              }}
            />
          </div>
        )}
        
        {activeTab === 'ratings' && (
          <div className="fixed inset-0 z-20 overflow-hidden">
            <FeederRatingsTab 
              onOpenMenu={() => setIsMenuOpen(true)}
              onOpenNotifications={() => {
                setActiveTab('notifications');
                navigate('/mobile?tab=notifications');
              }}
            />
          </div>
        )}
        
        {activeTab === 'promos' && (
          <div className="fixed inset-0 z-20 overflow-hidden">
            <FeederPromotionsTab 
              onOpenMenu={() => setIsMenuOpen(true)}
              onOpenNotifications={() => {
                setActiveTab('notifications');
                navigate('/mobile?tab=notifications');
              }}
            />
          </div>
        )}
        
        {activeTab === 'notifications' && (
          <div className="fixed inset-0 z-20 bg-background overflow-y-auto">
            <div className="min-h-screen">
              <NotificationsPage userId={user?.id || ''} />
            </div>
          </div>
        )}
        
        {activeTab === 'help' && (
          <div className="fixed inset-0 z-20 bg-background">
            <CravenAppComm />
          </div>
        )}
        
        {activeTab === 'messages' && (
          <div className="fixed inset-0 z-20 bg-background">
            <CravenAppComm />
          </div>
        )}
        
        {/* VIEWING HOME WHILE ACTIVELY FEEDING - Shows Get Back to Feeding Card */}
        {activeTab === 'home' && isViewingHomeWhileFeeding && (driverState === 'online_searching' || driverState === 'online_paused') && <>
            {/* Content Container */}
            <div className="flex flex-col justify-end h-full px-4 space-y-4 pointer-events-auto" style={{ paddingBottom: '100px' }}>
              <GetBackToFeedingCard 
                onContinueFeeding={() => {
                  setIsViewingHomeWhileFeeding(false);
                }}
              />
            </div>
          </>}

        {/* OFFLINE STATE */}
        {activeTab === 'home' && driverState === 'offline' && !isViewingHomeWhileFeeding && <>
            {/* Content Container */}
            <div className="flex flex-col justify-end h-full space-y-4 pointer-events-auto" style={{ paddingBottom: '60px' }}>

              {/* Popular Times Chart with START FEEDING Button */}
              <div className="bg-card/95 backdrop-blur-sm p-4 shadow-sm border-t border-border/10 overflow-hidden">
                {/* Main Action Button - Centered at top */}
                <div className="flex justify-center mb-4">
                  <Button 
                    onClick={handleGoOnline} 
                    disabled={isGoingOnline}
                    className="w-full h-12 text-lg font-bold bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGoingOnline ? 'GOING ONLINE...' : 'START FEEDING'}
                  </Button>
                </div>
                
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">Popular offer times: Today</h3>
                    <p className="text-xs text-muted-foreground">Explore additional days to drive this week.</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                
                <div className="flex items-end gap-0.5 overflow-hidden" style={{ height: '105px' }}>
                  {[
                    { time: '6a', value: 90, showLabel: true },   // Early morning peak
                    { time: '7a', value: 95, showLabel: false },  // Early morning peak
                    { time: '8a', value: 85, showLabel: false },  // Early morning peak
                    { time: '9a', value: 80, showLabel: true },   // Early morning peak
                    { time: '10a', value: 60, showLabel: false },
                    { time: '11a', value: 55, showLabel: false },
                    { time: '12p', value: 90, showLabel: true },  // Lunch peak
                    { time: '1p', value: 95, showLabel: false },   // Lunch peak
                    { time: '2p', value: 85, showLabel: false },   // Lunch peak
                    { time: '3p', value: 70, showLabel: true },
                    { time: '4p', value: 30, showLabel: false },  // Low time
                    { time: '5p', value: 25, showLabel: false },   // Low time
                    { time: '6p', value: 35, showLabel: true },   // Low time
                    { time: '7p', value: 50, showLabel: false },
                    { time: '8p', value: 60, showLabel: false },
                    { time: '9p', value: 70, showLabel: true },
                    { time: '10p', value: 75, showLabel: false },
                    { time: '11p', value: 85, showLabel: false }  // Night peak
                  ].map((data, index) => (
                    <div key={data.time} className="flex flex-col items-center justify-end flex-1 min-w-0">
                      <div className="w-full mb-1" style={{ height: `${(data.value / 95) * 64}px`, minHeight: '2px' }}>
                         <div className={`w-full h-full rounded-t-sm transition-all duration-300 ${index === getCurrentTimeIndex() ? 'bg-red-500' : 'bg-orange-500'}`} />
                      </div>
                      <span className="text-xs text-muted-foreground font-medium whitespace-nowrap" style={{ 
                        visibility: data.showLabel ? 'visible' : 'hidden',
                        height: '16px'
                      }}>
                        {data.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Orange footer bar */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-orange-500 to-orange-600" style={{ height: '48px' }} />
          </>}

        {/* ONLINE SEARCHING STATE */}
        {activeTab === 'home' && driverState === 'online_searching' && !isViewingHomeWhileFeeding && <>
            {/* Change Zone Button - Top Left */}
            <div className="absolute left-4 z-20 pointer-events-auto py-0 my-[525px] mx-0 px-0" style={{ top: 'calc(env(safe-area-inset-top, 150px) + 16px)' }}>
              
            </div>

            {/* Pause Button - Top Right - Level with menu button - LOCKED POSITION */}
            <div className="fixed z-50 pointer-events-auto" style={{ top: 'calc(env(safe-area-inset-top, 150px) + 43px)', right: '66px' }}>
              <Button onClick={handlePause} variant="ghost" size="sm" className="w-10 h-10 bg-white/90 backdrop-blur-sm border border-border/20 rounded-full p-2 shadow-lg hover:bg-white">
                <Pause className="h-5 w-5 text-gray-700" />
              </Button>
            </div>

            {/* Get Offers Until Section - Top */}
            {/* Bottom Content - Still Searching + Restaurant Cards */}
            <div className="absolute bottom-[80px] left-4 right-4 z-20 space-y-3 pointer-events-auto">
              {/* Still Searching Section with Get offers until */}
              <div className="bg-card/95 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-border/20 overflow-hidden">
                <div className="flex items-center justify-between">
                  {/* Left: Still searching text */}
                  <div className="flex items-center gap-2">
                    <span className="text-base text-foreground font-medium">Still searching...</span>
                  </div>
                  
                  {/* Right: "Get offers until" + Time + Rotating circle grouped together */}
                  <div className="flex items-center gap-2">
                    {/* "Get offers until" text */}
                    <span className="text-xs text-muted-foreground">Get offers until</span>
                    {/* Time badge */}
                    <span className="text-xs font-semibold text-foreground bg-muted/50 px-2 py-1 rounded-full">
                      {endTime ? endTime.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : '11:00 PM'}
                    </span>
                    {/* Rotating C logo */}
                    <div className="w-6 h-6">
                      <img 
                        src="/crave-c-logo.png" 
                        alt="Crave'n C logo" 
                        className="animate-spin w-full h-full object-contain"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Nearby Restaurant Cards */}
              <NearbyRestaurantCards 
                driverLocation={location ? { latitude: location.latitude, longitude: location.longitude } : null} 
              />
                </div>
                
            {/* Orange footer bar - same as main dashboard */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-orange-500 to-orange-600" style={{ height: '48px' }} />
          </>}

        {/* PAUSED STATE - DoorDash Style */}
        {activeTab === 'home' && driverState === 'online_paused' && (
          <div className="fixed inset-0 bg-white z-50" style={{ pointerEvents: 'auto' }}>

            {/* Header - Level with hamburger menu */}
            <div className="flex items-center justify-between px-4 safe-area-top" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 43px)' }}>
              {/* Hamburger menu button */}
              <button
                onClick={() => setIsMenuOpen(true)}
                className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-all"
              >
                <Menu className="h-5 w-5 text-gray-700" />
              </button>
              
              {/* Title */}
              <h1 className="text-xl font-bold text-gray-900">Feeding Paused</h1>
              
              {/* Orange buttons */}
              <div className="flex items-center space-x-3">
                <button 
                  onClick={handleAddTime}
                  className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center hover:bg-orange-600 transition-colors shadow-lg"
                >
                  <span className="text-lg text-white font-bold">+</span>
                </button>
                <button 
                  onClick={handleContactSupport}
                  className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center hover:bg-orange-600 transition-colors shadow-lg"
                >
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
              {/* Crave'n C Logo Timer */}
              <div className="relative w-64 h-64 mb-8 flex items-center justify-center">
                <CravenFillCountdownFlow 
                  duration={1800} // 30 minutes in seconds
                  size={256}
                  logoPng="/crave-c-logo.png"
                />
              </div>

              {/* Information Text */}
              <div className="text-center mb-8 max-w-sm">
                 <p className="text-lg font-semibold text-gray-900 mb-2">
                   You won't get offers while you're paused
                 </p>
                 <p className="text-sm text-gray-600">
                   Timer shows 30 minutes. If paused for 35+ minutes total, your Feeding will end.
                 </p>
              </div>

              {/* Action Buttons */}
              <div className="w-full max-w-sm space-y-4">
                 <button 
                   onClick={handleUnpause}
                   className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-300 shadow-lg active:scale-95 touch-manipulation"
                   style={{ touchAction: 'manipulation' }}
                 >
                   Resume Feeding
                 </button>
                 <button 
                   onClick={handleGoOffline}
                   className="w-full text-orange-600 hover:text-orange-700 font-semibold py-2 border border-orange-200 hover:border-orange-300 rounded-lg transition-all duration-300 active:scale-95 touch-manipulation"
                   style={{ touchAction: 'manipulation' }}
                 >
                   End Feeding
                 </button>
              </div>
            </div>

            {/* Android Bottom Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-black" style={{ height: '48px' }} />
          </div>
        )}

        {/* ON DELIVERY STATE */}
        {activeTab === 'home' && driverState === 'on_delivery' && activeDelivery && <div className="pointer-events-auto">
          <ActiveDeliveryFlow 
            orderDetails={{
              id: activeDelivery.id || activeDelivery.order_id || 'missing-order-id',
              order_id: activeDelivery.order_id || activeDelivery.id, // Ensure order_id is passed for pickup code lookup
              order_number: activeDelivery.order_number || 'MISSING-ORDER',
              restaurant_name: activeDelivery.restaurant_name || 'Restaurant',
              pickup_address: activeDelivery.pickup_address || 'Pickup Address',
              dropoff_address: activeDelivery.dropoff_address || 'Delivery Address',
              customer_name: activeDelivery.customer_name || 'Customer',
              customer_phone: activeDelivery.customer_phone,
              delivery_notes: activeDelivery.delivery_notes,
              payout_cents: activeDelivery.payout_cents || 0,
              subtotal_cents: activeDelivery.subtotal_cents || activeDelivery.payout_cents || 1200,
              estimated_time: activeDelivery.estimated_time || 30,
              items: activeDelivery.items && activeDelivery.items.length > 0 ? activeDelivery.items : [{
                name: 'Order Items',
                quantity: 1,
                price_cents: activeDelivery.subtotal_cents || 1200
              }],
              isTestOrder: activeDelivery.isTestOrder || false // Only true if explicitly marked as test
            }} onCompleteDelivery={async () => {
            // Add delivery earnings to session total
            const deliveryPayout = (activeDelivery.payout_cents || 0) / 100; // Convert cents to dollars
            setSessionEarnings(prev => prev + deliveryPayout);
            
            // Record final driver earnings
            try {
              const {
                data: {
                  user
                }
              } = await supabase.auth.getUser();
              await supabase.functions.invoke('finalize-delivery', {
                body: {
                  orderId: activeDelivery.order_id,
                  driverId: user?.id
                }
              });
            } catch (e) {
              console.error('finalize-delivery failed', e);
            }
            // Reset state
            setActiveDelivery(null);
            setDriverState('online_searching');
          }} 
          onCameraStateChange={setIsCameraOpen}
        />
        </div>}

      </div>

      {/* Order Assignment Modal */}
      <OrderAssignmentModal isOpen={showOrderModal} onClose={() => {
        setShowOrderModal(false);
        setCurrentOrderAssignment(null);
      }} assignment={currentOrderAssignment} onAccept={assignment => {
        setActiveDelivery({
          ...assignment,
          order_id: assignment.order_id,
          assignment_id: assignment.assignment_id,
          restaurant_name: assignment.restaurant_name,
          pickup_address: assignment.pickup_address,
          dropoff_address: assignment.dropoff_address,
          payout_cents: assignment.payout_cents,
          distance_mi: assignment.distance_mi,
          isTestOrder: assignment.isTestOrder // Pass through test order flag
        });
        setDriverState('on_delivery');
        setShowOrderModal(false);
        setCurrentOrderAssignment(null);
      }} onDecline={() => {
        setShowOrderModal(false);
        setCurrentOrderAssignment(null);
      }} />

      {/* Drive Time Selector */}
      <DriveTimeSelector open={showTimeSelector} onClose={() => setShowTimeSelector(false)} onSelect={handleSelectDriveTime} />



      {/* Side Menu Overlay - Regular menu for when not actively feeding */}
      <FeederSidebarMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        activeTab={activeTab}
        onNavigate={(path) => handleMenuNavigation(path)}
      />

      {/* Active Feeding Menu - Shows when actively feeding */}
      <ActiveFeedingMenu
        isOpen={isActiveFeedingMenuOpen}
        onClose={() => setIsActiveFeedingMenuOpen(false)}
        onPauseOrders={() => {
          if (driverState === 'online_paused') {
            setDriverState('online_searching');
          } else {
            setDriverState('online_paused');
          }
        }}
        onEndFeeding={() => {
          handleGoOffline();
          setIsActiveFeedingMenuOpen(false);
          setIsViewingHomeWhileFeeding(false);
        }}
        onGoHome={() => {
          setIsViewingHomeWhileFeeding(true);
          setIsActiveFeedingMenuOpen(false);
        }}
        currentEarnings={sessionEarnings}
        isPaused={driverState === 'online_paused'}
      />

    </div>
    )}
  </>;
};
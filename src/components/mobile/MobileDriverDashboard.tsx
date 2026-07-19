// @ts-nocheck
import React, { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { MapPin, Settings, Pause, Play, Square, Clock, Car, DollarSign, Calendar, Bell, User, Star, ChevronRight, Menu, X, Home, TrendingUp, HelpCircle, LogOut, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RetailGroceryOfferFlow } from './RetailGroceryOfferFlow';
import RetailGroceryPickupFlow from './RetailGroceryPickupFlow';
import { DeliveryMap } from './DeliveryMap';
import ActiveDeliveryFlow from './ActiveDeliveryFlow';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { useIOSNotifications } from '@/hooks/useIOSNotifications';
import { IOSNotificationBanner } from './IOSNotificationBanner';
import { MobileMapbox } from './MobileMapbox';
import { EndTimePickerSheet } from './EndTimePickerSheet';
import LoadingScreen from './LoadingScreen';
import MobileDriverWelcomeScreen from './MobileDriverWelcomeScreen';
import { SpeedLimitSign } from './SpeedLimitSign';
import { useDriverLocation } from '@/hooks/useDriverLocation';
import { useResumeAudioOnGesture } from '@/hooks/useResumeAudioOnGesture';
import { useNavigate, useSearchParams } from 'react-router-dom';
import FeederPromotionsTab from './FeederPromotionsTab';
import { DeliveryZone, getZoneForLocation } from '@/data/deliveryZones';
import { useDeliveryZones } from '@/hooks/useDeliveryZones';
import FeederScheduleTab from './FeederScheduleTab';
import OnFireDashboard from './CorporateEarningsDashboard';
import EarningsDashboard from './EarningsDashboard';
import FeederAccountPage from './FeederAccountPage';
import { CXDriverJobsPage } from './CXDriverJobsPage';
import FeederRatingsTab from './FeederRatingsTab';
import CravenAppComm from './CravenAppComm';
import { SafetySettings } from '@/components/settings/SafetySettings';
import { useCravingWheel } from '@/hooks/useCravingWheel';
import { speedDetectionService } from '@/services/speedDetectionService';
import { getRatingColor, getRatingTier, formatRating, getTrendIcon, getTrendColor } from '@/utils/ratingHelpers';
import NotificationsPage from '@/components/notifications/NotificationsPage';
import FeederSidebarMenu from './FeederSidebarMenu';
import CravenFillCountdownFlow from '@/components/CravenFillCountdownFlow';
import cravenCLogo from '@/assets/craven-c-new.png';
import NearbyRestaurantCards from './NearbyRestaurantCards';
import ActiveFeedingMenu from './ActiveFeedingMenu';
import GetBackToFeedingCard from './GetBackToFeedingCard';
import QuickSchedulerModal from './QuickSchedulerModal';
// Production readiness imports
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';
import { useCrashReporting } from '@/hooks/useCrashReporting';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useFeederSingleDeviceSession } from '@/hooks/useFeederSingleDeviceSession';
import { LoadingState, LoadingOverlay } from '@/components/LoadingStates';
import OfflineIndicator from '@/components/OfflineIndicator';
import type { OrderAssignment } from '@/components/mobile/feederOrderTypes';
import FeederPendingOffersPanel from '@/components/mobile/FeederPendingOffersPanel';
import { claimOrderAssignment, claimOrderAssignmentsBatch } from '@/lib/claimOrderAssignment';
import { formatPickupKey } from '@/lib/deliveryRouteKeys';
import { formatAddress, resolveOrderCustomerPhone, resolveOrderDropoffAddress } from '@/lib/formatAddress';
import { setOrderDriverArrivedAtStore, setOrderPickupParkingSpot } from '@/lib/orderDriverPresence';
import { DEFAULT_MAX_BATCH_DROPOFF_MILES, sumPayoutCents } from '@/lib/feederOfferBatching';
import FeederCleanPayCard from '@/components/mobile/FeederCleanPayCard';
import {
  getFeederCleanPaySummary,
  mergeFeederCleanPaySummaries,
  saveFeederCleanPayOfferAcceptance,
  syncFeederCleanPayAdjustmentAtPickup,
  type FeederCleanPaySummary,
} from '@/lib/feederCleanPaySummary';
type DriverState = 'offline' | 'online_searching' | 'online_paused' | 'on_delivery' | 'on_retail_pickup';
type VehicleType = 'car' | 'bike' | 'scooter' | 'walk' | 'motorcycle';
type EarningMode = 'perHour' | 'perOffer';
export const MobileDriverDashboard: React.FC = () => {
  const { zones } = useDeliveryZones();
  // Production readiness hooks
  const { isOnline, isSlowConnection } = useNetworkStatus();
  const { data: offlineData, setData: setOfflineData } = useOfflineStorage({
    key: 'driver_state',
    defaultValue: { state: 'offline', timestamp: Date.now() }
  });
  const { trackEvent, trackUserAction, trackError } = useAnalytics();
  const { reportCustomError } = useCrashReporting();
  const { trackApiCall } = usePerformanceMonitoring('MobileDriverDashboard');
  useFeederSingleDeviceSession();
  const driverProfileIdRef = useRef<string | null>(null);
  const realtimeCleanupRef = useRef<(() => void) | null>(null);

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
    const zone = getZoneForLocation([lat, lng], zones);
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
        
        // Get driver_profile id first (driver_sessions.driver_id references driver_profiles.id, not auth user.id)
        const { data: driverProfile } = await supabase
          .from('driver_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (!driverProfile) {
          console.log('No driver profile found');
          setIsSessionRestored(true);
          return;
        }
        driverProfileIdRef.current = driverProfile.id;

        // Check for active session with timeout
        const sessionPromise = supabase
          .from('driver_sessions')
          .select('session_data, is_online')
          .eq('driver_id', driverProfile.id) // Use driver_profile.id, not user.id
          .eq('is_online', true)
          .maybeSingle();
          
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), 5000)
        );
        
        const { data: session, error } = await Promise.race([sessionPromise, timeoutPromise]) as any;
          
        if (session && !error && session.session_data?.online_since) {
          // Check if session has expired based on end_time
          if (session.session_data?.end_time) {
            const endTime = new Date(session.session_data.end_time);
            const now = new Date();
            if (now >= endTime) {
              console.log('⏰ Session expired - ending session');
              // Session expired, clear it
              await supabase.from('driver_sessions').update({
                is_online: false,
                session_data: {}
              }).eq('driver_id', driverProfile.id);
              
              await supabase.from('driver_profiles').update({
                status: 'offline',
                is_available: false
              }).eq('id', driverProfile.id);
              
              setIsSessionRestored(true);
              toast.info('Your feeding session has ended');
              return;
            }
            setEndTime(endTime);
          }
          
          console.log('✅ Restoring active feeding session');
          setSessionData(session.session_data);
          setDriverState('online_searching');
          
          // Calculate online time
          const onlineSince = new Date(session.session_data.online_since).getTime();
          setOnlineTime(Math.max(0, Date.now() - onlineSince));
          
          // Realtime: useEffect on driverState + user re-subscribes. Heartbeat here.
          setTimeout(() => {
            const interval = startSessionHeartbeat();
            setHeartbeatInterval(interval);
          }, 100);
          
          toast.success('Welcome back! Your feeding session is still active.');
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
  
  // Continuous end_time monitoring - automatically end session when time is up
  useEffect(() => {
    if (!endTime || driverState === 'offline') {
      return;
    }
    
    const checkEndTime = async () => {
      const now = new Date();
      if (now >= endTime) {
        console.log('⏰ Feeding time ended - automatically ending session');
        toast.info('Your scheduled feeding time has ended');
        
        // End the session
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: driverProfile } = await supabase
              .from('driver_profiles')
              .select('id')
              .eq('user_id', user.id)
              .maybeSingle();
            
            if (driverProfile) {
              await supabase.from('driver_sessions').update({
                is_online: false,
                session_data: {}
              }).eq('driver_id', driverProfile.id);
              
              await supabase.from('driver_profiles').update({
                status: 'offline',
                is_available: false
              }).eq('id', driverProfile.id);
            }
          }
          
          setDriverState('offline');
          setEndTime(null);
          setOnlineTime(0);
          setSessionData(null);
        } catch (error) {
          console.error('Error ending session:', error);
        }
      }
    };
    
    // Check immediately
    checkEndTime();
    
    // Then check every 30 seconds
    const interval = setInterval(checkEndTime, 30000);
    
    return () => clearInterval(interval);
  }, [endTime, driverState]);
  
  // Session heartbeat to keep driver online when app is backgrounded
  const startSessionHeartbeat = () => {
    const heartbeat = setInterval(async () => {
      try {
        const profileId = driverProfileIdRef.current;
        if (!profileId) return;
        await supabase.from('driver_sessions').update({
          last_activity: new Date().toISOString(),
          session_data: {
            ...sessionData,
            last_heartbeat: new Date().toISOString()
          }
        }).eq('driver_id', profileId);
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
  const [resetMapZoom, setResetMapZoom] = useState(false);
  /** Full-screen offer detail (one order) */
  const [orderDetailAssignment, setOrderDetailAssignment] = useState<OrderAssignment | null>(null);
  const [activeOfferCleanPay, setActiveOfferCleanPay] = useState<FeederCleanPaySummary | null>(null);
  const [retailCleanPaySummary, setRetailCleanPaySummary] = useState<FeederCleanPaySummary | null>(null);
  /** Full-screen batch offer (retail review or combined) */
  const [batchDetailOffers, setBatchDetailOffers] = useState<OrderAssignment[] | null>(null);
  const [retailOfferStep, setRetailOfferStep] = useState<1 | 2 | null>(null);
  /** Map assignment_id -> offer (queue; new offers append, do not replace). */
  const [pendingOrderOffers, setPendingOrderOffers] = useState<Record<string, OrderAssignment>>({});
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [hasCompletedRetailPickup, setHasCompletedRetailPickup] = useState(false);
  const [previewRetailStep, setPreviewRetailStep] = useState<1 | 2>(1);
  const [showQuickScheduler, setShowQuickScheduler] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'schedule' | 'earnings' | 'onfire' | 'notifications' | 'account' | 'ratings' | 'promos' | 'preferences' | 'help' | 'messages' | 'cx'>('home');
  const [driverRating, setDriverRating] = useState<number>(5.0);
  const [driverDeliveries, setDriverDeliveries] = useState<number>(0);
  const [ratingTrend, setRatingTrend] = useState<number>(0);
  const [notifications, setNotifications] = useState<any[]>([]); // Add notifications state
  const [showOnFireSettings, setShowOnFireSettings] = useState(false);
  const [gameSettings, setGameSettings] = useState({
    onFireGameEnabled: false,
    speedDetectionEnabled: false,
  });
  
  // Get location and speed data
  const {
    location,
    isTracking,
    error: locationError,
    startTracking,
    stopTracking
  } = useDriverLocation();

  /** Single GPS source for map + speed UI: same Web watchPosition stream as MobileMapbox. */
  useEffect(() => {
    startTracking();
  }, [startTracking]);

  // Resume AudioContext and prime TTS on first tap (required for sounds/read-out-loud in built Android app)
  useResumeAudioOnGesture();
  
  // Navigation
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Dev: preview retail offer flow or force all offers to use retail flow
  const previewRetailOffer = searchParams.get('previewRetailOffer') === '1';
  const forceRetailFlow = searchParams.get('retailFlow') === '1';

  // Real retail store data for preview (fetched from DB when ?previewRetailOffer=1)
  const [previewRetailStore, setPreviewRetailStore] = useState<{
    name: string;
    address: string;
    logoUrl?: string;
  } | null>(null);

  useEffect(() => {
    if (!previewRetailOffer) return;
    const fetchRetailStore = async () => {
      const { data } = await supabase
        .from('restaurants')
        .select('id, name, address, city, state, zip_code, logo_url, image_url')
        .in('restaurant_type', ['retail_store', 'grocery'])
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      if (data) {
        const parts = [data.address, data.city, data.state, data.zip_code].filter(Boolean);
        setPreviewRetailStore({
          name: data.name,
          address: parts.length ? parts.join(', ') : data.address || '',
          logoUrl: data.logo_url || data.image_url || undefined,
        });
      }
    };
    fetchRetailStore();
  }, [previewRetailOffer]);

  // Handle URL parameter changes
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['schedule', 'earnings', 'onfire', 'notifications', 'account', 'ratings', 'promos', 'preferences', 'help', 'messages', 'cx'].includes(tab)) {
      setActiveTab(tab as 'schedule' | 'earnings' | 'onfire' | 'notifications' | 'account' | 'ratings' | 'promos' | 'preferences' | 'help' | 'messages' | 'cx');
    } else {
      setActiveTab('home');
    }
  }, [searchParams]);

  // Listen for switchTab custom events (for in-app navigation without page reload)
  useEffect(() => {
    const handleSwitchTab = (event: CustomEvent<{ tab: string; section?: string }>) => {
      const { tab, section } = event.detail;
      if (['schedule', 'earnings', 'onfire', 'notifications', 'account', 'ratings', 'promos', 'preferences', 'help', 'messages', 'cx'].includes(tab)) {
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

  // Load ON FIRE game settings
  useEffect(() => {
    const loadSettings = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) return;

      const { data } = await supabase
        .from('driver_settings')
        .select('*')
        .eq('user_id', session.session.user.id)
        .maybeSingle();

      if (data) {
        setGameSettings({
          onFireGameEnabled: data.on_fire_game_enabled,
          speedDetectionEnabled: data.speed_detection_enabled,
        });
      }
    };

    loadSettings();
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
      case 'On Fire':
        setActiveTab('onfire');
        navigate('/mobile?tab=onfire');
        break;
      case 'Earnings':
        setActiveTab('earnings');
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
  const [activeDelivery, setActiveDelivery] = useState<any>(null);
  const [merchantRetailOrderStatus, setMerchantRetailOrderStatus] = useState<string | null>(null);
  const [deliveryRouteStops, setDeliveryRouteStops] = useState<any[]>([]);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [routeView, setRouteView] = useState<'stops_list' | 'delivering'>('delivering');
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [tripCount, setTripCount] = useState(0);
  const [isAvailable, setIsAvailable] = useState(false);
  const [showTimeSelector, setShowTimeSelector] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const deliveryPickupLocation = useMemo(() => {
    if (!activeDelivery?.pickup_address) return null;
    const pa = activeDelivery.pickup_address;
    if (typeof pa !== 'object') return null;
    const lat = pa.latitude ?? pa.lat;
    const lng = pa.longitude ?? pa.lng;
    if (lat == null || lng == null) return null;
    return {
      latitude: Number(lat),
      longitude: Number(lng),
      name: activeDelivery.restaurant_name,
    };
  }, [activeDelivery]);

  // Build delivery stops for route: backend list, or from ordersForPickup (retail), or dropoff_count, or single stop
  const deliveryStops = useMemo(() => {
    if (!activeDelivery) return [];
    const fromBackend = (activeDelivery as any).deliveryStops;
    const basePickupKey = formatPickupKey(
      (activeDelivery as any).restaurant_id,
      (activeDelivery as any).pickup_address
    );
    if (Array.isArray(fromBackend) && fromBackend.length > 0) {
      return fromBackend.map((s: any) => ({
        ...s,
        pickup_key:
          s.pickup_key ??
          formatPickupKey(
            s.restaurant_id ?? (activeDelivery as any).restaurant_id,
            s.pickup_address ?? (activeDelivery as any).pickup_address
          ),
        restaurant_id: s.restaurant_id ?? (activeDelivery as any).restaurant_id,
        pickup_address: s.pickup_address ?? (activeDelivery as any).pickup_address,
      }));
    }
    const orders = (activeDelivery as any).ordersForPickup;
    const dropoffCount = (activeDelivery as any).dropoff_count ?? (activeDelivery as any).dropoffCount ?? 0;
    const baseAddress = activeDelivery.dropoff_address || 'Delivery Address';
    const addressStr = formatAddress(baseAddress) || 'Delivery Address';
    if (Array.isArray(orders) && orders.length > 0) {
      const list = orders.map((o: any, i: number) => ({
        order_id: o.id || `${activeDelivery.order_id}-${i}`,
        id: o.id || `stop-${i}`,
        order_number: o.order_number ?? (typeof o.id === 'string' ? o.id.replace(/\D/g, '').slice(-4) || String(i + 1).padStart(3, '0') : String(i + 1).padStart(3, '0')),
        customer_name: o.label || o.customer_name || 'Customer',
        dropoff_address: o.address != null && o.address !== '' ? o.address : addressStr,
        payout_cents: Math.round((activeDelivery.payout_cents || 0) / Math.max(1, orders.length)),
        tip_cents: o.tip_cents ?? Math.round(((activeDelivery as any).tip_cents || 0) / Math.max(1, orders.length)),
        delivery_notes: activeDelivery.delivery_notes,
        customer_phone: activeDelivery.customer_phone,
        items: o.items?.length > 0 ? o.items : activeDelivery.items || [],
        estimated_delivery_time: activeDelivery.estimated_delivery_time,
        restaurant_id: (activeDelivery as any).restaurant_id,
        pickup_address: (activeDelivery as any).pickup_address,
        pickup_key: basePickupKey,
      }));
      return list;
    }
    // Route has 23 drop-offs but no per-stop list: build N stops from dropoff_count so we don't show completion early
    const n = Math.max(1, Number(dropoffCount) || 0);
    if (n > 1) {
      return Array.from({ length: n }, (_, i) => ({
        order_id: `${activeDelivery.order_id || 'route'}-${i}`,
        id: `stop-${i}`,
        customer_name: activeDelivery.customer_name || `Stop ${i + 1}`,
        dropoff_address: addressStr,
        payout_cents: Math.round((activeDelivery.payout_cents || 0) / n),
        tip_cents: Math.round(((activeDelivery as any).tip_cents || 0) / n),
        delivery_notes: activeDelivery.delivery_notes,
        customer_phone: activeDelivery.customer_phone,
        items: activeDelivery.items || [],
        estimated_delivery_time: activeDelivery.estimated_delivery_time,
        restaurant_id: (activeDelivery as any).restaurant_id,
        pickup_address: (activeDelivery as any).pickup_address,
        pickup_key: basePickupKey,
      }));
    }
    const withKey = { ...activeDelivery, pickup_key: (activeDelivery as any).pickup_key ?? basePickupKey };
    return [withKey];
  }, [activeDelivery]);

  // Only set initial route list view when we first start this delivery (new activeDelivery), not on every render
  const prevActiveDeliveryRef = useRef<any>(null);
  useEffect(() => {
    if (driverState !== 'on_delivery' || !activeDelivery) {
      if (!activeDelivery) prevActiveDeliveryRef.current = null;
      return;
    }
    if (deliveryStops.length <= 1) {
      setRouteView('delivering');
      return;
    }
    if (prevActiveDeliveryRef.current !== activeDelivery) {
      prevActiveDeliveryRef.current = activeDelivery;
      setCurrentStopIndex(0);
      setRouteView('stops_list');
    }
  }, [driverState, activeDelivery, deliveryStops.length]);
  const {
    playNotification
  } = useNotificationSettings();

  useEffect(() => {
    if (driverState !== 'on_retail_pickup' || !activeDelivery) {
      setMerchantRetailOrderStatus(null);
      return;
    }
    const oid = activeDelivery.order_id || activeDelivery.id;
    if (!oid) return;
    let cancelled = false;
    const fetchStatus = async () => {
      const { data } = await supabase
        .from('orders')
        .select('order_status')
        .eq('id', oid)
        .maybeSingle();
      if (!cancelled) {
        setMerchantRetailOrderStatus((data as any)?.order_status ?? null);
      }
    };
    fetchStatus();
    const channel = supabase
      .channel(`retail_order_status_${oid}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${oid}`,
        },
        (payload: any) => {
          if (cancelled) return;
          setMerchantRetailOrderStatus(payload?.new?.order_status ?? null);
        }
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [driverState, activeDelivery?.order_id, activeDelivery?.id]);

  const retailMerchantStatusStep = useMemo(() => {
    const status = String(merchantRetailOrderStatus || activeDelivery?.order_status || '').toLowerCase();
    if (status === 'pending') return 0; // Order received
    if (status === 'confirmed') return 1; // Preparing
    if (status === 'preparing') return 2; // Packaging order
    if (status === 'ready' || status === 'picked_up' || status === 'out_for_delivery' || status === 'delivered') return 3; // Ready+
    return 0;
  }, [merchantRetailOrderStatus, activeDelivery?.order_status]);
  const { showNotification, notifications: iosNotifications, dismissNotification } = useIOSNotifications();
  const { state: cravingState, addDeliveryPoints, updateAcceptanceRate, startSpeedMonitoring } = useCravingWheel(user?.id || '');

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

  const removePendingByIds = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setPendingOrderOffers((prev) => {
      const next = { ...prev };
      for (const id of ids) delete next[id];
      return next;
    });
  }, []);

  // Clock + drop expired offers from the queue
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      setNowTick(now);
      setPendingOrderOffers((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const [id, o] of Object.entries(next)) {
          if (new Date(o.expires_at).getTime() <= now) {
            delete next[id];
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Setup real-time listener: broadcast + INSERT/UPDATE/DELETE (queue does not replace on new offers)
  const setupRealtimeListener = (userId: string) => {
    realtimeCleanupRef.current?.();
    /** supabase-js broadcast may pass { payload }, or the payload object directly, or double-wrapped */
    const normalizeBroadcastData = (msg: any): any => {
      if (!msg) return null;
      if (msg.assignment_id != null || msg.order_id) return msg;
      const p = msg.payload;
      if (p && (p.assignment_id != null || p.order_id)) return p;
      if (p?.payload && (p.payload.assignment_id != null || p.payload.order_id)) return p.payload;
      return p ?? msg;
    };
    const handleBroadcast = (raw: any) => {
      const pp: any = normalizeBroadcastData(raw) || {};
      const a: OrderAssignment = {
        assignment_id: pp.assignment_id,
        order_id: pp.order_id,
        order_number: pp.order_number,
        restaurant_name: pp.restaurant_name,
        pickup_address: pp.pickup_address,
        dropoff_address: pp.dropoff_address,
        payout_cents: pp.payout_cents || 0,
        distance_km: Number(pp.distance_km) || 0,
        distance_mi: String(pp.distance_mi || '0'),
        expires_at: pp.expires_at,
        estimated_time: Number(pp.estimated_time) || 0,
        isTestOrder: pp.isTestOrder,
        items: pp.items || [],
        customer_name: pp.customer_name,
        subtotal_cents: pp.subtotal_cents,
        tip_cents: pp.tip_cents,
        mileage_pay_cents: pp.mileage_pay_cents || 0,
        storeType: pp.store_type || pp.restaurant_type,
        storeLogoUrl: pp.store_logo_url || pp.logo_url || pp.image_url,
        parking_spot_count: pp.parking_spot_count || pp.pickup_parking_spots || pp.curbside_spot_count,
        restaurant_id: pp.restaurant_id || undefined,
      };
      if (!a.assignment_id) return;
      setPendingOrderOffers((prev) => {
        const isNew = !(a.assignment_id in prev);
        const next = { ...prev, [a.assignment_id]: { ...prev[a.assignment_id], ...a } };
        if (isNew) {
          const pickup = typeof pp.pickup_address === 'string'
            ? pp.pickup_address
            : pp.pickup_address && typeof pp.pickup_address === 'object'
              ? [pp.pickup_address?.address, pp.pickup_address?.city, pp.pickup_address?.state].filter(Boolean).join(', ')
              : 'restaurant';
          showNotification(
            `New order: ${pp.restaurant_name || 'Pickup'}`,
            `Pickup at ${pickup}`,
            8000
          );
          playNotification();
        }
        return next;
      });
    };

    const broadcastChannel = supabase
      .channel(`driver_${userId}`)
      .on('broadcast', { event: 'order_assignment' }, (ev: any) => {
        const raw = ev?.payload !== undefined && ev !== null ? ev.payload : ev;
        const data = normalizeBroadcastData(raw);
        if (data) handleBroadcast(data);
      })
      .subscribe();

    const cxChannel = supabase
      .channel(`cx_driver_${userId}`)
      .on('broadcast', { event: 'cx_job_offer' }, (ev: any) => {
        const payload = ev?.payload ?? ev ?? {};
        showNotification(
          `CX courier job: ${payload.courier_name || "Crave'N Express"}`,
          `$${((payload.payout_cents || 0) / 100).toFixed(2)} courier gig available`,
          8000
        );
        playNotification();
        setActiveTab('cx');
        navigate('/mobile?tab=cx');
      })
      .subscribe();

    const dbChannel = supabase
      .channel(`order_assignments_q_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_assignments',
          filter: `driver_id=eq.${userId}`,
        },
        async (payload: any) => {
          const row = payload.new as { id: string; order_id: string; expires_at: string; status: string };
          if (row.status && row.status !== 'pending') return;
          const { data: order } = await supabase
            .from('orders')
            .select('pickup_address, dropoff_address, delivery_address, payout_cents, distance_km, restaurant_id, order_number, tip_cents, restaurants(name, restaurant_type, logo_url, image_url)')
            .eq('id', row.order_id)
            .maybeSingle();
          if (!order) {
            setPendingOrderOffers((prev) => {
              if (row.id in prev) return prev;
              return {
                ...prev,
                [row.id]: {
                  assignment_id: row.id,
                  order_id: row.order_id,
                  restaurant_name: 'New order',
                  pickup_address: {},
                  dropoff_address: {},
                  payout_cents: 0,
                  distance_km: 0,
                  distance_mi: '0',
                  expires_at: row.expires_at,
                  estimated_time: 15,
                } as OrderAssignment,
              };
            });
            return;
          }
          const restaurants = (order as any).restaurants;
          const restaurantName =
            restaurants?.name ||
            (typeof order.pickup_address === 'object' && order.pickup_address
              ? (order.pickup_address as any).name
              : null) ||
            'New Order';
          const a: OrderAssignment = {
            assignment_id: row.id,
            order_id: row.order_id,
            order_number: (order as any).order_number,
            restaurant_id: (order as any).restaurant_id,
            restaurant_name: restaurantName,
            pickup_address: order.pickup_address,
            dropoff_address: resolveOrderDropoffAddress(order as any) ?? order.dropoff_address,
            payout_cents: (order as any).payout_cents || 0,
            distance_km: Number(order.distance_km) || 0,
            distance_mi: ((Number(order.distance_km) || 0) * 0.621371).toFixed(1),
            expires_at: row.expires_at,
            estimated_time: Math.ceil((Number(order.distance_km) || 0) * 2.5),
            storeType: restaurants?.restaurant_type,
            storeLogoUrl: restaurants?.logo_url || restaurants?.image_url,
            tip_cents: (order as any).tip_cents,
          };
          setPendingOrderOffers((prev) => {
            const isNew = !(row.id in prev);
            const next = { ...prev, [row.id]: a };
            if (isNew) {
              const pickup =
                typeof order.pickup_address === 'string'
                  ? order.pickup_address
                  : order.pickup_address && typeof order.pickup_address === 'object'
                    ? [ (order.pickup_address as any).address, (order.pickup_address as any).city, (order.pickup_address as any).state ].filter(Boolean).join(', ')
                    : 'restaurant';
              showNotification('New order available', `Pickup at ${pickup}`, 8000);
              playNotification();
            }
            return next;
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'order_assignments',
          filter: `driver_id=eq.${userId}`,
        },
        (payload: any) => {
          const row = payload.new as { id: string; status: string };
          if (row.status && row.status !== 'pending') {
            setPendingOrderOffers((prev) => {
              if (!(row.id in prev)) return prev;
              const n = { ...prev };
              delete n[row.id];
              return n;
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'order_assignments',
          filter: `driver_id=eq.${userId}`,
        },
        (payload: any) => {
          const old = payload.old as { id: string };
          if (old?.id) {
            setPendingOrderOffers((prev) => {
              if (!(old.id in prev)) return prev;
              const n = { ...prev };
              delete n[old.id];
              return n;
            });
          }
        }
      )
      .subscribe();
    const cleanup = () => {
      supabase.removeChannel(broadcastChannel);
      supabase.removeChannel(cxChannel);
      supabase.removeChannel(dbChannel);
    };
    realtimeCleanupRef.current = cleanup;
    return cleanup;
  };

  useEffect(() => {
    return () => {
      realtimeCleanupRef.current?.();
    };
  }, []);

  /** Always subscribe to assignment broadcasts + DB while feeder is in-session (covers unpause, missed early setup). */
  useEffect(() => {
    if (!user?.id) return;
    if (driverState !== 'online_searching' && driverState !== 'online_paused') {
      realtimeCleanupRef.current?.();
      realtimeCleanupRef.current = null;
      return;
    }
    const cleanup = setupRealtimeListener(user.id);
    return () => {
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setupRealtimeListener rebuilt each render; only re-subscribe on user/session mode
  }, [user?.id, driverState]);

  // Enrich open single-offer detail with store type / logo when missing
  useEffect(() => {
    if (!orderDetailAssignment?.order_id || orderDetailAssignment.storeType !== undefined) return;
    let cancelled = false;
    (async () => {
      const { data: order } = await supabase
        .from('orders')
        .select('restaurant_id, restaurants(restaurant_type, logo_url, image_url, curbside_spot_count)')
        .eq('id', orderDetailAssignment.order_id)
        .maybeSingle();
      if (cancelled || !order) return;
      const r = (order as any).restaurants;
      setOrderDetailAssignment((prev) =>
        prev
          ? {
              ...prev,
              storeType: r?.restaurant_type || prev.storeType,
              storeLogoUrl: r?.logo_url || r?.image_url || prev.storeLogoUrl,
              parking_spot_count: r?.curbside_spot_count ?? prev.parking_spot_count,
              restaurant_id: (order as any).restaurant_id || prev.restaurant_id,
            }
          : null
      );
    })();
    return () => { cancelled = true; };
  }, [orderDetailAssignment?.order_id, orderDetailAssignment?.storeType]);

  /** Clean Pay: live offer preview (single or batch) on the order-offer overlay. */
  useEffect(() => {
    if (orderDetailAssignment?.order_id) {
      let cancelled = false;
      void getFeederCleanPaySummary(orderDetailAssignment.order_id, 'offered').then((s) => {
        if (!cancelled) setActiveOfferCleanPay(s);
      });
      return () => {
        cancelled = true;
      };
    }
    if (batchDetailOffers?.length) {
      let cancelled = false;
      void Promise.all(batchDetailOffers.map((o) => getFeederCleanPaySummary(o.order_id, 'offered'))).then((rows) => {
        const ok = rows.filter(Boolean) as FeederCleanPaySummary[];
        if (!cancelled) setActiveOfferCleanPay(mergeFeederCleanPaySummaries(ok));
      });
      return () => {
        cancelled = true;
      };
    }
    setActiveOfferCleanPay(null);
    return undefined;
  }, [orderDetailAssignment?.order_id, batchDetailOffers]);

  /** Clean Pay: compact card during retail curbside pickup. */
  useEffect(() => {
    const oid = activeDelivery?.order_id;
    if (!oid || driverState !== 'on_retail_pickup') {
      setRetailCleanPaySummary(null);
      return;
    }
    let cancelled = false;
    void getFeederCleanPaySummary(oid, 'arrivedAtMerchant').then((s) => {
      if (!cancelled) setRetailCleanPaySummary(s);
    });
    return () => {
      cancelled = true;
    };
  }, [activeDelivery?.order_id, driverState]);

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

  // Start/stop ON FIRE speed monitoring based on driver online state
  useEffect(() => {
    if (!user?.id) return;

    if (cravingState.gameEnabled && (driverState === 'online_searching' || driverState === 'on_delivery')) {
      startSpeedMonitoring();
    } else {
      speedDetectionService.stopMonitoring();
    }

    return () => {
      speedDetectionService.stopMonitoring();
    };
  }, [driverState, cravingState.gameEnabled, user?.id, startSpeedMonitoring]);

  const checkOnboardingAndSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        setShowWelcomeScreen(true);
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
        setIsLoading(false);
        setShowWelcomeScreen(true);
        return;
      }

      if (!application) {
        setIsLoading(false);
        setShowWelcomeScreen(true);
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
      setIsLoading(false);
      setShowWelcomeScreen(true);
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

      // Get driver_profile id first (driver_sessions.driver_id references driver_profiles.id)
      const { data: driverProfile } = await supabase
        .from('driver_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (!driverProfile) {
        console.log('No driver profile found');
        return;
      }
      driverProfileIdRef.current = driverProfile.id;

      // Check if driver was previously online
      const {
        data: driverSession
      } = await supabase.from('driver_sessions').select('*').eq('driver_id', driverProfile.id).maybeSingle();
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
            }).eq('driver_id', driverProfile.id);
            
            await supabase.from('driver_profiles').update({
              status: 'offline',
              is_available: false
            }).eq('id', driverProfile.id);
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
        }).eq('id', driverProfile.id);

        // Update last activity
        await supabase.from('driver_sessions').update({
          last_activity: new Date().toISOString()
        }).eq('driver_id', driverProfile.id);

        // Realtime: useEffect re-subscribes when driverState is online_searching

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
          const profileId = driverProfileIdRef.current;
          if (!profileId) return;
          const { data: currentSession } = await supabase
            .from('driver_sessions')
            .select('session_data')
            .eq('driver_id', profileId)
            .maybeSingle();
          
          const currentSessionData = currentSession?.session_data || {};
          
          // Update session to keep driver_state as 'online_searching' and is_online as true
          // @ts-ignore - session_data type compatibility
          await supabase.from('driver_sessions').upsert({
            driver_id: profileId,
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

      if (existingProfile?.id) {
        driverProfileIdRef.current = existingProfile.id;
      }

      // Get location and update craver_locations table
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async position => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);

          const zone = getZoneForLocation([location.lat, location.lng], zones);
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
      // Realtime: useEffect re-subscribes when driverState is online_searching

      // Start session heartbeat to keep driver online  
      const interval = startSessionHeartbeat();
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
  
  // Helper to convert time string to minutes from now
  const convertTimeStringToMinutes = (timeString: string): number => {
    const now = new Date();
    const [time, period] = timeString.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let hours24 = hours;
    if (period === 'PM' && hours !== 12) hours24 += 12;
    if (period === 'AM' && hours === 12) hours24 = 0;
    
    const selectedEnd = new Date(now);
    selectedEnd.setHours(hours24, minutes, 0, 0);
    
    // If selected time is earlier today, assume it's tomorrow
    if (selectedEnd <= now) {
      selectedEnd.setDate(selectedEnd.getDate() + 1);
    }
    
    return Math.round((selectedEnd.getTime() - now.getTime()) / (1000 * 60));
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

  const isOfferRetail = (o: OrderAssignment) => forceRetailFlow || o.storeType === 'retail_store';
  const pendingOffersList = useMemo(() => Object.values(pendingOrderOffers), [pendingOrderOffers]);
  const showOfferPanel =
    (driverState === 'online_searching' || driverState === 'online_paused') &&
    pendingOffersList.length > 0;

  const closeOfferDetail = () => {
    setOrderDetailAssignment(null);
    setBatchDetailOffers(null);
    setRetailOfferStep(null);
  };

  const mapCleanPayOffer = (s: FeederCleanPaySummary | null) =>
    s
      ? {
          basePayDollars: s.basePayCents / 100,
          deliveryFeeShareDollars: s.deliveryFeeShareCents / 100,
          customerTipDollars: s.customerTipCents / 100,
          promoBonusDollars: s.promoBonusCents / 100,
          totalGuaranteedDollars: s.totalGuaranteedCents / 100,
        }
      : null;

  const runAcceptAndStartDelivery = async (
    current: OrderAssignment,
    opts?: { skipClaim?: boolean; batch?: OrderAssignment[] }
  ) => {
    const batch = opts?.batch;
    if (!opts?.skipClaim) {
      if (batch && batch.length > 0) {
        const r = await claimOrderAssignmentsBatch(batch.map((b) => b.assignment_id));
        if (!r.ok) {
          toast.error(r.error || 'This batch is no longer available.');
          removePendingByIds(batch.map((b) => b.assignment_id));
          return;
        }
      } else {
        const r = await claimOrderAssignment(current.assignment_id);
        if (!r.ok) {
          toast.error(r.error || 'This offer is no longer available.');
          removePendingByIds([current.assignment_id]);
          return;
        }
      }
    }

    const cleanPayOrderIds =
      batch && batch.length > 0 ? batch.map((b) => b.order_id) : [current.order_id];
    for (const oid of cleanPayOrderIds) {
      const cp = await saveFeederCleanPayOfferAcceptance(oid);
      if (!cp.ok) {
        console.warn('saveFeederCleanPayOfferAcceptance', oid, cp.error);
      }
    }

    if (batch && batch.length > 1) {
      const orderRows: any[] = [];
      const orderItemsByOrderId = new Map<string, any[]>();
      for (const b of batch) {
        const { data: od } = await supabase
          .from('orders')
          .select('id, order_number, subtotal_cents, customer_name, customer_id, customer_phone, delivery_notes, dropoff_address, delivery_address, payout_cents, tip_cents, distance_km')
          .eq('id', b.order_id)
          .maybeSingle();
        if (od) {
          orderRows.push({ ...od, dropoff_address: resolveOrderDropoffAddress(od as any) });
        } else {
          const addr = resolveOrderDropoffAddress(b as any) ?? b.dropoff_address;
          const addressStr = formatAddress(addr) || '—';
          orderRows.push({
            id: b.order_id,
            order_number: b.order_number,
            subtotal_cents: b.subtotal_cents,
            customer_name: b.customer_name,
            customer_id: null,
            customer_phone: null,
            delivery_notes: null,
            dropoff_address: addr,
            payout_cents: b.payout_cents,
            tip_cents: b.tip_cents,
            distance_km: b.distance_km,
            _fromOfferOnly: true,
            _labelFallback: addressStr,
          } as any);
        }

        const { data: orderItems } = await supabase
          .from('order_items')
          .select('id, quantity, menu_items (name, image_url, barcode)')
          .eq('order_id', b.order_id);

        orderItemsByOrderId.set(b.order_id, orderItems || []);
      }
      const first = batch[0];
      const totalPayout = sumPayoutCents(batch);
      const totalTips = batch.reduce((s, b) => s + (b.tip_cents || 0), 0);
      const ordersForPickup = orderRows.map((o) => {
        const addr = resolveOrderDropoffAddress(o) ?? o.dropoff_address;
        const addressStr = o._labelFallback ? o._labelFallback : formatAddress(addr) || '—';
        return {
          id: o.id,
          order_number: o.order_number,
          label: o.customer_name || o.order_number || o.id,
          totalPackages: Math.max(
            1,
            (orderItemsByOrderId.get(o.id) || []).reduce((sum, item: any) => sum + Number(item.quantity || 0), 0)
          ),
          itemBarcodes: (orderItemsByOrderId.get(o.id) || []).flatMap((item: any) =>
            Array.from({ length: Math.max(1, Number(item.quantity || 0)) }, () => item.menu_items?.barcode).filter(Boolean)
          ),
          address: addressStr,
          customer_name: o.customer_name,
          payout_cents: o.payout_cents,
          tip_cents: o.tip_cents,
        };
      });
      setActiveDelivery({
        ...first,
        order_id: first.order_id,
        assignment_id: first.assignment_id,
        order_number: orderRows[0].order_number,
        restaurant_name: first.restaurant_name,
        pickup_address: first.pickup_address,
        dropoff_address: orderRows[0].dropoff_address || first.dropoff_address,
        payout_cents: totalPayout,
        distance_mi: first.distance_mi,
        isTestOrder: first.isTestOrder,
        items: (first as any).items || [],
        subtotal_cents: totalPayout,
        tip_cents: totalTips,
        customer_name: orderRows[0].customer_name,
        customer_phone: orderRows[0].customer_phone,
        delivery_notes: orderRows[0].delivery_notes,
        dropoff_count: batch.length,
        batch_order_ids: batch.map((b) => b.order_id),
        batch_assignment_ids: batch.map((b) => b.assignment_id),
        ordersForPickup,
        storeType: isOfferRetail(first) ? 'retail_store' : first.storeType,
        storeLogoUrl: first.storeLogoUrl,
      } as any);
      removePendingByIds(batch.map((b) => b.assignment_id));
      closeOfferDetail();
      if (isOfferRetail(first)) {
        setHasCompletedRetailPickup(false);
        setDriverState('on_retail_pickup');
      } else {
        setDriverState('on_delivery');
      }
      return;
    }

    const { data: orderData } = await supabase
      .from('orders')
      .select(`
        id, order_number, subtotal_cents, customer_name, customer_id, customer_phone, delivery_notes, tip_cents, dropoff_address, delivery_address, payout_cents, distance_km
      `)
      .eq('id', current.order_id)
      .maybeSingle();

    let resolvedCustomerName = current.customer_name;
    if (orderData) {
      resolvedCustomerName = orderData.customer_name ?? resolvedCustomerName;
      if (!resolvedCustomerName && orderData.customer_id) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('user_id', orderData.customer_id)
          .maybeSingle();
        if (profile?.full_name) resolvedCustomerName = profile.full_name;
      }
    }
    const { data: orderItemsData } = await supabase
      .from('order_items')
      .select(
        'id, quantity, price_cents, special_instructions, menu_items (name, image_url, barcode)'
      )
      .eq('order_id', current.order_id);
    const formattedItems = (orderItemsData || []).map((item: any) => ({
      id: item.id,
      name: item.menu_items?.name || 'Menu Item',
      quantity: item.quantity,
      price_cents: item.price_cents,
      special_instructions: item.special_instructions,
      image_url: item.menu_items?.image_url,
      barcode: item.menu_items?.barcode,
    }));
    const itemsToUse = (current as any).items?.length > 0 ? (current as any).items : formattedItems;
    const retailPickupOrders = [
      {
        id: current.order_id,
        orderNumber: orderData?.order_number || current.order_number,
        label: resolvedCustomerName || current.order_number || current.order_id,
        totalPackages: Math.max(
          1,
          itemsToUse.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0)
        ),
        itemBarcodes: itemsToUse
          .flatMap((item: any) =>
            Array.from({ length: Math.max(1, Number(item.quantity || 0)) }, () => item.barcode).filter(Boolean)
          ),
        address: formatAddress(
          resolveOrderDropoffAddress({
            dropoff_address: (orderData as any)?.dropoff_address ?? current.dropoff_address,
            delivery_address: (orderData as any)?.delivery_address,
          })
        ) || '—',
      },
    ];
    if (!orderData) {
      // Claim succeeded; DB read can still fail (RLS/replica) — use offer payload so the trip can start.
      setActiveDelivery({
        ...current,
        order_id: current.order_id,
        assignment_id: current.assignment_id,
        order_number: current.order_number,
        restaurant_name: current.restaurant_name,
        pickup_address: current.pickup_address,
        dropoff_address: resolveOrderDropoffAddress(current as any) ?? current.dropoff_address,
        payout_cents: current.payout_cents,
        distance_mi: current.distance_mi,
        isTestOrder: current.isTestOrder,
        items: itemsToUse,
        subtotal_cents: current.subtotal_cents ?? current.payout_cents,
        tip_cents: (current as any).tip_cents,
        customer_name: resolvedCustomerName,
        customer_phone: resolveOrderCustomerPhone(current as any) || undefined,
        delivery_notes: undefined,
        ordersForPickup: retailPickupOrders,
      });
    } else {
      setActiveDelivery({
        ...current,
        order_id: current.order_id,
        assignment_id: current.assignment_id,
        order_number: (orderData as any).order_number,
        restaurant_name: current.restaurant_name,
        pickup_address: current.pickup_address,
        dropoff_address:
          resolveOrderDropoffAddress(orderData as any) ??
          resolveOrderDropoffAddress(current as any) ??
          current.dropoff_address,
        payout_cents: (orderData as any).payout_cents || current.payout_cents,
        distance_mi: current.distance_mi,
        isTestOrder: current.isTestOrder,
        items: itemsToUse,
        subtotal_cents: (orderData as any).subtotal_cents || current.payout_cents,
        tip_cents: (orderData as any).tip_cents ?? (current as any).tip_cents,
        customer_name: resolvedCustomerName,
        customer_phone:
          resolveOrderCustomerPhone(orderData as any) ||
          resolveOrderCustomerPhone(current as any) ||
          undefined,
        delivery_notes: (orderData as any).delivery_notes,
        ordersForPickup: retailPickupOrders,
      });
    }
    if (isOfferRetail(current)) {
      setHasCompletedRetailPickup(false);
      setDriverState('on_retail_pickup');
    } else {
      setDriverState('on_delivery');
    }
    closeOfferDetail();
    removePendingByIds([current.assignment_id]);
  };

  const handleDeclineOne = async (id: string) => {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (u) {
      await supabase.from('order_assignments').update({ status: 'declined' }).eq('id', id).eq('driver_id', u.id);
    }
    removePendingByIds([id]);
  };
  const handleDeclineBatch = async (ids: string[]) => {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (u) {
      for (const id of ids) {
        await supabase.from('order_assignments').update({ status: 'declined' }).eq('id', id).eq('driver_id', u.id);
      }
    }
    removePendingByIds(ids);
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
        <MobileMapbox 
          driverLocation={location}
          onZoneStatusChange={handleZoneStatusChange}
          resetToDefaultZoom={resetMapZoom}
          onScheduleClick={() => setShowQuickScheduler(true)}
          deliveryPickupLocation={driverState === 'on_delivery' ? deliveryPickupLocation : null}
        />
      </div>

      {/* Hamburger Menu Button - Top Left - Only on Home Tab, but NOT during delivery */}
      {activeTab === 'home' && driverState !== 'on_delivery' && (
        <div 
          className={`fixed left-4 pointer-events-auto ${isMenuOpen || isActiveFeedingMenuOpen ? 'z-10' : 'z-50'}`} 
          style={{ top: `calc(env(safe-area-inset-top, 0px) + 12px)` }}
        >
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
        <div className="fixed left-4 z-40 pointer-events-auto" style={{ top: `calc(env(safe-area-inset-top, 0px) + 64px)` }}>
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
        
        {activeTab === 'onfire' && (
          <div className="fixed inset-0 z-20 overflow-hidden bg-background">
            <div className="h-full overflow-y-auto">
              <OnFireDashboard 
                onOpenMenu={() => setIsMenuOpen(true)}
                onOpenNotifications={() => setActiveTab('notifications')}
              />
            </div>
          </div>
        )}
        
        {activeTab === 'earnings' && (
          <div className="fixed inset-0 z-20 overflow-hidden bg-background">
            <div className="h-full overflow-y-auto">
              <EarningsDashboard 
                onOpenMenu={() => setIsMenuOpen(true)}
                onOpenNotifications={() => setActiveTab('notifications')}
              />
            </div>
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

        {activeTab === 'cx' && (
          <div className="fixed inset-0 z-20 overflow-hidden bg-background pointer-events-auto">
            <CXDriverJobsPage onClose={() => {
              setActiveTab('home');
              navigate('/mobile');
            }} />
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
                    data-testid="start-feeding-button"
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
            {/* Bottom safe area padding */}
            <div className="absolute bottom-0 left-0 right-0" style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
          </>}

        {/* ONLINE SEARCHING STATE */}
        {activeTab === 'home' && driverState === 'online_searching' && !isViewingHomeWhileFeeding && <>
            {/* Change Zone Button - Top Left */}
            <div className="absolute left-4 z-20 pointer-events-auto py-0 my-[525px] mx-0 px-0" style={{ top: `calc(env(safe-area-inset-top, 0px) + 16px)` }}>
              
            </div>

            {/* Pause Button - Top Right - Level with menu button - LOCKED POSITION */}
            <div className="fixed z-50 pointer-events-auto" style={{ top: `calc(env(safe-area-inset-top, 0px) + 12px)`, right: '66px' }}>
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
                        src={cravenCLogo} 
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
                
            {/* Bottom safe area padding */}
            <div className="absolute bottom-0 left-0 right-0" style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
          </>}

        {/* PAUSED STATE - DoorDash Style */}
        {activeTab === 'home' && driverState === 'online_paused' && (
          <div className="fixed inset-0 bg-white z-50" style={{ pointerEvents: 'auto' }}>

            {/* Header - Level with hamburger menu */}
            <div className="flex items-center justify-between px-4 safe-area-top" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
              {/* Hamburger menu button */}
              <button
                onClick={() => setIsMenuOpen(true)}
                className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-all"
              >
                <Menu className="h-5 w-5 text-gray-700" />
              </button>
              
              {/* Title */}
              <h1 className="text-xl font-bold text-gray-900">Feeding Paused</h1>
              
              {/* Spacer to keep title centered */}
              <div className="w-10" aria-hidden />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
              {/* Crave'n C Logo Timer */}
              <div className="relative w-64 h-64 mb-8 flex items-center justify-center">
                <CravenFillCountdownFlow 
                  duration={1800} // 30 minutes in seconds
                  size={256}
                  logoPng={cravenCLogo}
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

            {/* Bottom safe area spacer */}
            <div className="fixed bottom-0 left-0 right-0" style={{ height: 'env(safe-area-inset-bottom, 0px)', background: '#fff' }} />
          </div>
        )}

        {/* RETAIL / GROCERY PICKUP FLOW (arrival + parking spot selection) */}
        {activeTab === 'home' && driverState === 'on_retail_pickup' && activeDelivery && (
          <div className="pointer-events-auto">
            <RetailGroceryPickupFlow
              storeName={activeDelivery.restaurant_name || 'Store'}
              storeAddress={
                typeof activeDelivery.pickup_address === 'string'
                  ? activeDelivery.pickup_address
                  : activeDelivery.pickup_address?.address ||
                    [activeDelivery.pickup_address?.street, activeDelivery.pickup_address?.city, activeDelivery.pickup_address?.state, activeDelivery.pickup_address?.zip_code]
                      .filter(Boolean)
                      .join(', ')
              }
              orderId={activeDelivery.order_id || activeDelivery.id}
              ordersForPickup={
                (activeDelivery as any).ordersForPickup?.length > 0
                  ? (activeDelivery as any).ordersForPickup
                  : [{ id: 'order-001', label: '—', totalPackages: 1 }]
              }
              pickupTimeLabel="Curbside pickup"
              storeLogoUrl={(activeDelivery as any).storeLogoUrl}
              pickupTagLabel="Curbside pickup"
              tripLabel={activeDelivery.order_id ? `Trip ${activeDelivery.order_id.slice(-4)}` : undefined}
              parkingSpotCount={(activeDelivery as any).parking_spot_count}
              orderStatusStep={retailMerchantStatusStep}
              cleanPaySlot={
                retailCleanPaySummary ? (
                  <FeederCleanPayCard variant="compact" orderEarnings={retailCleanPaySummary} showAdjustment />
                ) : null
              }
              onArrivalConfirmed={async () => {
                const oid = activeDelivery.order_id || activeDelivery.id;
                const { error } = await setOrderDriverArrivedAtStore(oid);
                if (error) {
                  console.warn('setOrderDriverArrivedAtStore', error);
                }
              }}
              onParkingSpotSelected={async (spot: number) => {
                const oid = activeDelivery.order_id || activeDelivery.id;
                const { error } = await setOrderPickupParkingSpot(oid, spot);
                if (error) {
                  console.warn('setOrderPickupParkingSpot', error);
                }
              }}
              onQrConfirmed={async () => {
                // QR confirms feeder identity / right vehicle at handoff point.
                // Do NOT mark picked_up here; picked_up is set when feeder starts route.
              }}
              onStartScanning={async () => {
                // After starting scanning, transition into the main delivery flow (to customer)
                const oid = activeDelivery.order_id || activeDelivery.id;
                const { error } = await supabase
                  .from('orders')
                  .update({
                    order_status: 'picked_up',
                    pickup_confirmed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', oid);
                if (error) {
                  console.warn('mark picked_up on pickup completion failed', error);
                }
                const syncCp = await syncFeederCleanPayAdjustmentAtPickup(oid);
                if (!syncCp.ok) {
                  console.warn('syncFeederCleanPayAdjustmentAtPickup', syncCp.error);
                }
                setHasCompletedRetailPickup(true);
                setDriverState('on_delivery');
              }}
            />
          </div>
        )}

        {/* ON DELIVERY STATE */}
        {activeTab === 'home' && driverState === 'on_delivery' && activeDelivery && (() => {
          const stops = deliveryStops.length > 0 ? deliveryStops : [activeDelivery];
          const currentStop = stops[currentStopIndex] || activeDelivery;
          const toOrderDetails = (s: any) => ({
            id: s.id || s.order_id || 'missing-order-id',
            order_id: s.order_id || s.id,
            order_number: s.order_number || activeDelivery.order_number || undefined,
            restaurant_name: s.restaurant_name || activeDelivery.restaurant_name || '',
            restaurant_id: s.restaurant_id ?? (activeDelivery as any).restaurant_id,
            pickup_key: s.pickup_key,
            pickup_address: s.pickup_address ?? activeDelivery.pickup_address ?? '',
            dropoff_address:
              resolveOrderDropoffAddress({
                dropoff_address: s.dropoff_address ?? activeDelivery.dropoff_address,
                delivery_address: s.delivery_address ?? (activeDelivery as any).delivery_address,
              }) ??
              s.dropoff_address ??
              activeDelivery.dropoff_address ??
              '',
            delivery_address: s.delivery_address ?? (activeDelivery as any).delivery_address,
            customer_name: s.customer_name ?? s.customerName ?? activeDelivery.customer_name ?? '',
            customer_phone:
              resolveOrderCustomerPhone({
                customer_phone: s.customer_phone ?? activeDelivery.customer_phone,
                dropoff_address: s.dropoff_address ?? activeDelivery.dropoff_address,
                delivery_address: s.delivery_address ?? (activeDelivery as any).delivery_address,
              }) || undefined,
            delivery_notes: s.delivery_notes ?? activeDelivery.delivery_notes ?? '',
            payout_cents: s.payout_cents ?? activeDelivery.payout_cents ?? 0,
            tip_cents: s.tip_cents ?? (activeDelivery as any).tip_cents ?? 0,
            mileage_pay_cents: s.mileage_pay_cents ?? (activeDelivery as any).mileage_pay_cents ?? 0,
            subtotal_cents: s.subtotal_cents ?? activeDelivery.subtotal_cents ?? 0,
            estimated_time: s.estimated_time ?? activeDelivery.estimated_time ?? 30,
            estimated_delivery_time: s.estimated_delivery_time ?? activeDelivery.estimated_delivery_time,
            items: (s.items && s.items.length > 0 ? s.items : activeDelivery.items)?.length > 0
              ? (s.items || activeDelivery.items)
              : [],
            isTestOrder: (s.isTestOrder ?? activeDelivery.isTestOrder) || false,
          });
          const orderDetails = toOrderDetails(currentStop);
          const isMultiStop = stops.length > 1;
          return (
            <div className="pointer-events-auto">
              <ActiveDeliveryFlow
                orderDetails={orderDetails}
                initialDriverStatus={
                  hasCompletedRetailPickup &&
                  ((activeDelivery as any).storeType === 'retail_store' || (activeDelivery as any).storeType === 'grocery')
                    ? 'to_customer'
                    : undefined
                }
                deliveryStops={isMultiStop ? stops : undefined}
                currentStopIndex={isMultiStop ? currentStopIndex : 0}
                routeView={isMultiStop ? routeView : 'delivering'}
                onStopComplete={isMultiStop ? (stopIndex: number) => {
                  const stop = stops[stopIndex];
                  const payout = (stop?.payout_cents ?? 0) / 100;
                  setSessionEarnings((prev) => prev + payout);
                  setCurrentStopIndex(stopIndex + 1);
                  if (stopIndex + 1 >= stops.length) {
                    // Last stop done – flow will show completion screen; don't clear until onCompleteDelivery
                  } else {
                    setRouteView('stops_list');
                  }
                } : undefined}
                onStartStop={isMultiStop ? () => setRouteView('delivering') : undefined}
                onCompleteDelivery={async () => {
                  const deliveryPayout = (currentStop?.payout_cents ?? activeDelivery.payout_cents ?? 0) / 100;
                  setSessionEarnings((prev) => prev + deliveryPayout);
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    await supabase.functions.invoke('finalize-delivery', {
                      body: { orderId: currentStop?.order_id || activeDelivery.order_id, driverId: user?.id },
                    });
                  } catch (e) {
                    console.error('finalize-delivery failed', e);
                  }
                  setActiveDelivery(null);
                  setDriverState('online_searching');
                  setHasCompletedRetailPickup(false);
                }}
                onCameraStateChange={setIsCameraOpen}
              />
            </div>
          );
        })()}

      </div>

      {/* Dev: ?previewRetailOffer=1 — retail offer preview with real store from database */}
      {previewRetailOffer && !orderDetailAssignment && !batchDetailOffers && !activeDelivery && (
            <RetailGroceryOfferFlow
              step={previewRetailStep}
              estimateAmount={50}
              mileageEarnings={10}
              stops={5}
              totalMiles={15}
              durationText="45 mins"
              pickupLabel="Pickup"
              pickupStoreName={previewRetailStore?.name ?? 'Loading…'}
              dropoffCount={4}
              tags={['Multi-stop route']}
              getOffersUntil={undefined}
              cleanPayOffer={{
                basePayDollars: 2.5,
                deliveryFeeShareDollars: 4.25,
                customerTipDollars: 3.0,
                promoBonusDollars: 0,
                totalGuaranteedDollars: 6.75,
              }}
              onAccept={() => setPreviewRetailStep(2)}
          onReject={() => navigate('/mobile')}
          onStartRoute={() => {
            const mockOrderId = 'PREVIEW-ROUTE';
            const dropoffCount = 4;
            const storeName = previewRetailStore?.name ?? 'Retail pickup location';
            const storeAddress = previewRetailStore?.address ?? 'Pickup address';
            setActiveDelivery({
              order_id: mockOrderId,
              id: mockOrderId,
              order_number: mockOrderId,
              restaurant_name: storeName,
              pickup_address: storeAddress,
              dropoff_address: 'Multiple nearby customers',
              payout_cents: 5000,
              mileage_pay_cents: 1000,
              distance_km: 24,
              distance_mi: '15.0',
              estimated_time: 45,
              items: [],
              isTestOrder: true,
              storeType: 'retail_store',
              storeLogoUrl: previewRetailStore?.logoUrl,
              parking_spot_count: 10,
              dropoff_count: dropoffCount,
              ordersForPickup: Array.from({ length: dropoffCount }, (_, i) => ({
                id: `order-${String(i + 1).padStart(3, '0')}`,
                label: `Customer ${i + 1}`,
                address: '—',
              })),
            } as any);
            setHasCompletedRetailPickup(false);
            setDriverState('on_retail_pickup');
          }}
        />
      )}

      {showOfferPanel && (
        <FeederPendingOffersPanel
          offers={pendingOffersList}
          nowMs={nowTick}
          maxDropoffMiles={DEFAULT_MAX_BATCH_DROPOFF_MILES}
          isRetailOffer={isOfferRetail}
          onDeclineOne={handleDeclineOne}
          onDeclineBatch={handleDeclineBatch}
          onAcceptSingle={(o) => {
            void runAcceptAndStartDelivery(o);
          }}
          onAcceptBatch={(list) => void runAcceptAndStartDelivery(list[0], { batch: list })}
          onOpenDetails={(o) => {
            setOrderDetailAssignment(o);
            setBatchDetailOffers(null);
            setRetailOfferStep(1);
          }}
          onOpenBatchDetails={(list) => {
            setBatchDetailOffers(list);
            setOrderDetailAssignment(null);
            setRetailOfferStep(1);
          }}
        />
      )}

      {/* Full-screen offer detail: single or batch (RetailGroceryOfferFlow) */}
      {orderDetailAssignment && (() => {
        const a = orderDetailAssignment;
        const isRetailOrder = isOfferRetail(a);
        const distance = parseFloat(a.distance_mi || '0') || 0;
        const estimateAmount = (a.payout_cents || 0) / 100;
        const mileagePayCents = a.mileage_pay_cents ?? Math.round(distance * 0.5 * 100);
        const mileageEarnings = mileagePayCents / 100;
        const eta = a.estimated_time ?? Math.ceil(distance * 2.5);
        const expiresAt = a.expires_at ? new Date(a.expires_at) : null;
        const getOffersUntil = expiresAt
          ? expiresAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
          : undefined;
        const durationText =
          eta < 60
            ? `${eta} mins`
            : `${Math.floor(eta / 60)} hr${Math.floor(eta / 60) > 1 ? 's' : ''}${
                eta % 60 ? `, ${eta % 60} mins` : ''
              }`;
        const offerStep: 1 | 2 = isRetailOrder ? ((retailOfferStep ?? 1) as 1 | 2) : 1;
        return (
          <div className="fixed inset-0 z-[200]">
            <RetailGroceryOfferFlow
              step={offerStep}
              estimateAmount={estimateAmount}
              mileageEarnings={mileageEarnings}
              stops={1}
              totalMiles={distance}
              durationText={durationText}
              pickupLabel="Pickup"
              pickupStoreName={a.restaurant_name || 'Store'}
              pickupStoreLogoUrl={a.storeLogoUrl}
              dropoffCount={1}
              tags={[]}
              getOffersUntil={getOffersUntil}
              pickupAddress={a.pickup_address}
              dropoffAddress={a.dropoff_address}
              cleanPayOffer={mapCleanPayOffer(activeOfferCleanPay)}
              onAccept={() => {
                if (isRetailOrder) setRetailOfferStep(2);
                else void runAcceptAndStartDelivery(a);
              }}
              onReject={closeOfferDetail}
              onStartRoute={() => void runAcceptAndStartDelivery(a)}
            />
          </div>
        );
      })()}

      {!orderDetailAssignment && batchDetailOffers && batchDetailOffers.length > 0 && (() => {
        const list = batchDetailOffers;
        const a = list[0];
        const isRo = list.some((x) => isOfferRetail(x));
        const dist = list.reduce((m, x) => Math.max(m, parseFloat(x.distance_mi || '0') || 0), 0);
        const amount = sumPayoutCents(list) / 100;
        const mPay = Math.round((dist * 0.5 * 100)) / 100;
        const eta0 = a.estimated_time ?? Math.ceil(dist * 2.5);
        const minExp = list
          .map((x) => new Date(x.expires_at).getTime())
          .sort((a, b) => a - b)[0];
        const getUntil = new Date(minExp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        const durText =
          eta0 < 60
            ? `${eta0} mins`
            : `${Math.floor(eta0 / 60)} hr${
                Math.floor(eta0 / 60) > 1 ? 's' : ''
              }${eta0 % 60 ? `, ${eta0 % 60} mins` : ''}`;
        const st: 1 | 2 = isRo ? ((retailOfferStep ?? 1) as 1 | 2) : 1;
        return (
          <div className="fixed inset-0 z-[200]">
            <RetailGroceryOfferFlow
              step={st}
              estimateAmount={amount}
              mileageEarnings={mPay}
              stops={list.length}
              totalMiles={dist}
              durationText={durText}
              pickupLabel="Batch pickup"
              pickupStoreName={a.restaurant_name || 'Store'}
              pickupStoreLogoUrl={a.storeLogoUrl}
              dropoffCount={list.length}
              tags={['Same pickup · nearby drop-offs']}
              getOffersUntil={getUntil}
              pickupAddress={a.pickup_address}
              dropoffAddress={list[list.length - 1]?.dropoff_address ?? a.dropoff_address}
              cleanPayOffer={mapCleanPayOffer(activeOfferCleanPay)}
              onAccept={() => {
                if (isRo) setRetailOfferStep(2);
                else void runAcceptAndStartDelivery(a, { batch: list });
              }}
              onReject={closeOfferDetail}
              onStartRoute={() => void runAcceptAndStartDelivery(a, { batch: list })}
            />
          </div>
        );
      })()}

      {/* Drive Time Selector */}
      <EndTimePickerSheet 
        open={showTimeSelector} 
        onClose={() => setShowTimeSelector(false)} 
        onContinue={(timeString) => {
          const minutes = convertTimeStringToMinutes(timeString);
          handleSelectDriveTime(minutes);
        }}
      />



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
          // Reset map to default zoom when navigating to home
          setResetMapZoom(true);
          // Reset the flag after a short delay so it can trigger again next time
          setTimeout(() => setResetMapZoom(false), 100);
        }}
        currentEarnings={sessionEarnings}
        isPaused={driverState === 'online_paused'}
      />

      {/* ON FIRE Safety Settings Modal */}
      {showOnFireSettings && user && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">Safety Settings</h2>
                <button
                  onClick={() => setShowOnFireSettings(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  ✕
                </button>
              </div>
              <SafetySettings
                userId={user.id}
                currentSettings={gameSettings}
                onSettingsUpdate={() => {
                  setShowOnFireSettings(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

    </div>
    )}
      {/* Quick Scheduler Modal */}
      <QuickSchedulerModal 
        isOpen={showQuickScheduler} 
        onClose={() => setShowQuickScheduler(false)} 
      />
  </>;
};
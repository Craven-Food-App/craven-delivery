import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDriverLocation } from './useDriverLocation';
import { toast } from 'sonner';

interface NavigationDestination {
  address: string;
  latitude?: number;
  longitude?: number;
  name?: string;
}

interface NavigationState {
  isNavigating: boolean;
  currentRoute: any | null;
  nextTurn: string | null;
  distanceToNext: number | null;
  estimatedArrival: Date | null;
  routeDuration: number | null; // in minutes
  routeDistance: number | null; // in miles
}

interface NavigationSettings {
  provider: 'mapbox' | 'google' | 'apple' | 'waze';
  voiceGuidance: boolean;
  avoidTolls: boolean;
  avoidHighways: boolean;
}

interface UseNavigationReturn {
  navigationState: NavigationState;
  navigationSettings: NavigationSettings;
  startNavigation: (destination: NavigationDestination) => Promise<void>;
  stopNavigation: () => void;
  updateSettings: (settings: Partial<NavigationSettings>) => void;
  openExternalNavigation: (destination: NavigationDestination) => void;
}

export const useNavigation = (): UseNavigationReturn => {
  const { location } = useDriverLocation();
  const [navigationState, setNavigationState] = useState<NavigationState>({
    isNavigating: false,
    currentRoute: null,
    nextTurn: null,
    distanceToNext: null,
    estimatedArrival: null,
    routeDuration: null,
    routeDistance: null
  });

  const [navigationSettings, setNavigationSettings] = useState<NavigationSettings>({
    provider: 'mapbox',
    voiceGuidance: true,
    avoidTolls: false,
    avoidHighways: false
  });

  const routeUpdateInterval = useRef<NodeJS.Timeout | null>(null);
  const speechSynthesis = useRef<SpeechSynthesis | null>(null);

  // Initialize speech synthesis
  useEffect(() => {
    if ('speechSynthesis' in window) {
      speechSynthesis.current = window.speechSynthesis;
    }
  }, []);

  // Load user navigation preferences
  useEffect(() => {
    loadNavigationSettings();
  }, []);

  const loadNavigationSettings = async () => {
    try {
      // 1) Load from localStorage (fast, works offline)
      const local = localStorage.getItem('craven_nav_settings');
      if (local) {
        const parsed = JSON.parse(local);
        setNavigationSettings(prev => ({ ...prev, ...parsed }));
      }

      // 2) Load from driver_preferences table
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prefs } = await supabase
        .from('driver_preferences')
        .select('preferred_nav_app, avoid_tolls, avoid_highways')
        .eq('driver_id', user.id)
        .maybeSingle();

      if (prefs) {
        const navSettings: Partial<NavigationSettings> = {};
        
        // Map preferred_nav_app to provider format
        if (prefs.preferred_nav_app === 'mapbox') navSettings.provider = 'mapbox';
        else if (prefs.preferred_nav_app === 'google_maps') navSettings.provider = 'google';
        else if (prefs.preferred_nav_app === 'apple_maps') navSettings.provider = 'apple';
        else if (prefs.preferred_nav_app === 'waze') navSettings.provider = 'waze';
        
        if (prefs.avoid_tolls !== undefined) navSettings.avoidTolls = prefs.avoid_tolls;
        if (prefs.avoid_highways !== undefined) navSettings.avoidHighways = prefs.avoid_highways;
        
        setNavigationSettings(prev => ({ ...prev, ...navSettings }));
        
        // Save to localStorage for offline access
        localStorage.setItem('craven_nav_settings', JSON.stringify(navSettings));
      }
    } catch (error) {
      console.error('Error loading navigation settings:', error);
    }
  };

  const saveNavigationSettings = async (settings: NavigationSettings) => {
    try {
      // Persist locally for reliability
      localStorage.setItem('craven_nav_settings', JSON.stringify(settings));

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get current profile settings (if table exists)
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('settings')
        .eq('user_id', user.id)
        .maybeSingle();

      const currentSettings = (profile?.settings && typeof profile.settings === 'object')
        ? (profile.settings as any)
        : {};

      const updatedSettings = {
        ...currentSettings,
        navigation: settings
      };

      await supabase
        .from('user_profiles')
        .update({ settings: updatedSettings })
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error saving navigation settings:', error);
    }
  };

  const updateSettings = useCallback((newSettings: Partial<NavigationSettings>) => {
    setNavigationSettings(prev => {
      const updated = { ...prev, ...newSettings };
      saveNavigationSettings(updated);
      return updated;
    });
  }, []);

  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      // Get Mapbox token from edge function  
      const { data } = await supabase.functions.invoke('get-mapbox-token');
      if (!data?.token) {
        throw new Error('Mapbox token not available');
      }

      const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${data.token}`);
      const result = await response.json();
      
      if (result.features && result.features.length > 0) {
        const [lng, lat] = result.features[0].center;
        return { lat, lng };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  const calculateRoute = async (origin: { lat: number; lng: number }, destination: { lat: number; lng: number }) => {
    try {
      // Get Mapbox token from edge function
      const { data } = await supabase.functions.invoke('get-mapbox-token');
      if (!data?.token) {
        throw new Error('Mapbox token not available');
      }

      const profile = navigationSettings.avoidHighways ? 'driving-traffic' : 'driving';
      const avoidOptions = [];
      if (navigationSettings.avoidTolls) avoidOptions.push('toll');
      if (navigationSettings.avoidHighways) avoidOptions.push('highway');
      
      const avoidParam = avoidOptions.length > 0 ? `&exclude=${avoidOptions.join(',')}` : '';
      
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/${profile}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?steps=true&geometries=geojson&access_token=${data.token}${avoidParam}`
      );
      
      const result = await response.json();
      
      if (result.routes && result.routes.length > 0) {
        const route = result.routes[0];
        return {
          geometry: route.geometry,
          duration: route.duration / 60, // Convert to minutes
          distance: route.distance * 0.000621371, // Convert to miles
          steps: route.legs[0].steps
        };
      }
      return null;
    } catch (error) {
      console.error('Route calculation error:', error);
      return null;
    }
  };

  const startNavigation = async (destination: NavigationDestination) => {
    if (!location) {
      toast.error('Current location not available');
      return;
    }

    try {
      // If using external navigation, open the external app
      if (navigationSettings.provider !== 'mapbox') {
        openExternalNavigation(destination);
        return;
      }

      toast.info('Calculating route...');

      let destCoords = { lat: 0, lng: 0 };
      
      if (destination.latitude && destination.longitude) {
        destCoords = { lat: destination.latitude, lng: destination.longitude };
      } else {
        const coords = await geocodeAddress(destination.address);
        if (!coords) {
          toast.error('Could not find destination');
          return;
        }
        destCoords = coords;
      }

      const route = await calculateRoute(
        { lat: location.latitude, lng: location.longitude },
        destCoords
      );

      if (!route) {
        toast.error('Could not calculate route');
        return;
      }

      const eta = new Date();
      eta.setMinutes(eta.getMinutes() + route.duration);

      setNavigationState({
        isNavigating: true,
        currentRoute: route,
        nextTurn: route.steps[0]?.maneuver?.instruction || null,
        distanceToNext: route.steps[0]?.distance * 0.000621371 || null, // Convert to miles
        estimatedArrival: eta,
        routeDuration: route.duration,
        routeDistance: route.distance
      });

      // Start route monitoring
      startRouteMonitoring();

      toast.success('Navigation started');

      // Voice guidance for start
      if (navigationSettings.voiceGuidance) {
        speakInstruction('Navigation started. Follow the route to your destination.');
      }
    } catch (error) {
      console.error('Navigation start error:', error);
      toast.error('Failed to start navigation');
    }
  };

  const stopNavigation = () => {
    setNavigationState({
      isNavigating: false,
      currentRoute: null,
      nextTurn: null,
      distanceToNext: null,
      estimatedArrival: null,
      routeDuration: null,
      routeDistance: null
    });

    if (routeUpdateInterval.current) {
      clearInterval(routeUpdateInterval.current);
      routeUpdateInterval.current = null;
    }

    toast.info('Navigation stopped');
  };

  const startRouteMonitoring = () => {
    if (routeUpdateInterval.current) {
      clearInterval(routeUpdateInterval.current);
    }

    routeUpdateInterval.current = setInterval(() => {
      updateNavigationProgress();
    }, 5000); // Update every 5 seconds
  };

  const updateNavigationProgress = () => {
    if (!navigationState.isNavigating || !navigationState.currentRoute || !location) {
      return;
    }

    // In a real implementation, this would:
    // 1. Check current position against route
    // 2. Update next turn instruction
    // 3. Recalculate if off route
    // 4. Provide voice guidance

    // Simulate progress update
    const steps = navigationState.currentRoute.steps;
    if (steps && steps.length > 0) {
      const nextStep = steps[0];
      if (nextStep && navigationSettings.voiceGuidance) {
        // Only speak if instruction has changed
        if (nextStep.maneuver.instruction !== navigationState.nextTurn) {
          speakInstruction(nextStep.maneuver.instruction);
        }
      }
    }
  };

  const speakInstruction = (instruction: string) => {
    if (!navigationSettings.voiceGuidance || !speechSynthesis.current) {
      return;
    }

    // Cancel any ongoing speech
    speechSynthesis.current.cancel();

    const utterance = new SpeechSynthesisUtterance(instruction);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;

    speechSynthesis.current.speak(utterance);
  };

  const openExternalNavigation = (destination: NavigationDestination) => {
    // If using in-app navigation (mapbox), start in-app navigation instead
    if (navigationSettings.provider === 'mapbox') {
      startNavigation(destination);
      toast.success('In-App Navigation Started');
      return;
    }

    const encodedAddress = encodeURIComponent(destination.address);
    let url = '';

    switch (navigationSettings.provider) {
      case 'google':
        url = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
        break;
      case 'apple':
        // Check if on iOS
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
          url = `maps://maps.apple.com/?daddr=${encodedAddress}`;
        } else {
          url = `https://maps.apple.com/?daddr=${encodedAddress}`;
        }
        break;
      case 'waze':
        url = `https://waze.com/ul?q=${encodedAddress}&navigate=yes`;
        break;
      default:
        url = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
    }

    window.open(url, '_blank');
    toast.info(`Opening ${navigationSettings.provider === 'apple' ? 'Apple Maps' : navigationSettings.provider === 'waze' ? 'Waze' : 'Google Maps'}`);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (routeUpdateInterval.current) {
        clearInterval(routeUpdateInterval.current);
      }
    };
  }, []);

  return {
    navigationState,
    navigationSettings,
    startNavigation,
    stopNavigation,
    updateSettings,
    openExternalNavigation
  };
};
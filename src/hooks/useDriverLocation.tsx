import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { hasLocationDisclosureConsent } from '@/utils/locationDisclosure';

export interface DriverLocationData {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
}

interface UseDriverLocationReturn {
  location: DriverLocationData | null;
  isTracking: boolean;
  error: string | null;
  startTracking: () => void;
  stopTracking: () => void;
}

const WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  /** iOS may need a generous timeout; still request fresh fixes */
  timeout: 20000,
  /** 0 = do not use a cached position; critical for live map following while driving */
  maximumAge: 0,
};

export const useDriverLocation = (): UseDriverLocationReturn => {
  const [location, setLocation] = useState<DriverLocationData | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  const updateInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryCount = useRef(0);
  const maxRetries = 3;
  const isBlockingUI = useRef(false);
  /** Latest fix for DB sync (interval must not read stale React state). */
  const locationRef = useRef<DriverLocationData | null>(null);
  const permissionChangeHandler = useRef<(() => void) | null>(null);

  const setLocationAndRef = useCallback((data: DriverLocationData | null) => {
    locationRef.current = data;
    setLocation(data);
  }, []);

  const updateLocationInDatabase = useCallback(async (locationData: DriverLocationData) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error: profileError } = await supabase
        .from('driver_profiles')
        .update({
          current_latitude: locationData.latitude,
          current_longitude: locationData.longitude,
          last_location_update: new Date().toISOString(),
          heading: locationData.heading,
          speed: locationData.speed,
        })
        .eq('user_id', user.id);

      if (profileError) {
        console.error('Error updating driver profile location:', profileError);
        return;
      }

      const { error: historyError } = await supabase.from('driver_location_history').insert({
        driver_id: user.id,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        heading: locationData.heading,
        speed: locationData.speed,
        accuracy: locationData.accuracy,
      });

      if (historyError) {
        console.error('Error inserting location history:', historyError);
      }
    } catch (err) {
      console.error('Database update error:', err);
    }
  }, []);

  const clearWatchAndInterval = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (updateInterval.current) {
      clearInterval(updateInterval.current);
      updateInterval.current = null;
    }
  }, []);

  const startLocationTracking = useCallback(() => {
    if (!navigator.geolocation) return;

    clearWatchAndInterval();
    setIsTracking(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const locationData: DriverLocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          heading: position.coords.heading ?? undefined,
          speed: position.coords.speed ?? undefined,
          accuracy: position.coords.accuracy,
        };
        setLocationAndRef(locationData);
        void updateLocationInDatabase(locationData);
        retryCount.current = 0;
      },
      (err) => {
        console.error('Error getting initial position:', {
          code: err.code,
          message: err.message,
        });
        retryCount.current += 1;
        if (retryCount.current >= maxRetries) {
          let errorMessage = 'Location services unavailable. ';
          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMessage += 'Please enable location access in browser settings.';
              break;
            case err.POSITION_UNAVAILABLE:
              errorMessage += 'GPS hardware not available.';
              break;
            case err.TIMEOUT:
              errorMessage += 'GPS signal weak or unavailable.';
              break;
            default:
              errorMessage += 'Please check your device settings.';
          }
          setError(errorMessage);
          isBlockingUI.current = true;
          setIsTracking(false);
          return;
        }
        console.log(`GPS retry ${retryCount.current}/${maxRetries}`);
      },
      WATCH_OPTIONS
    );

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const locationData: DriverLocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          heading: position.coords.heading ?? undefined,
          speed: position.coords.speed ?? undefined,
          accuracy: position.coords.accuracy,
        };
        setLocationAndRef(locationData);
      },
      (err) => {
        console.error('Error watching position:', {
          code: err.code,
          message: err.message,
        });
        if (err.code === err.TIMEOUT) {
          console.log('Location timeout, continuing...');
          return;
        }
        if (err.code === err.PERMISSION_DENIED) {
          setError('GPS permission denied. Please allow location access.');
          isBlockingUI.current = true;
          setIsTracking(false);
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setError('GPS position unavailable. Check your device settings.');
          isBlockingUI.current = true;
          setIsTracking(false);
        }
      },
      WATCH_OPTIONS
    );

    updateInterval.current = setInterval(() => {
      const current = locationRef.current;
      if (current) {
        void updateLocationInDatabase(current);
      }
    }, 30000);
  }, [clearWatchAndInterval, setLocationAndRef, updateLocationInDatabase]);

  const startTracking = useCallback(() => {
    if (!hasLocationDisclosureConsent()) {
      return;
    }
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    const attachPermissionListener = (result: PermissionStatus) => {
      if (permissionChangeHandler.current) {
        result.removeEventListener('change', permissionChangeHandler.current);
      }
      permissionChangeHandler.current = () => {
        if (result.state === 'denied') {
          setError('GPS permission denied. Please enable location access in your browser settings.');
          return;
        }
        if (result.state === 'granted' && hasLocationDisclosureConsent() && !watchId.current) {
          startLocationTracking();
        }
      };
      result.addEventListener('change', permissionChangeHandler.current);
    };

    if ('permissions' in navigator) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((result) => {
          attachPermissionListener(result);
          if (result.state === 'denied') {
            setError('GPS permission denied. Please enable location access in your browser settings.');
            return;
          }
          /** Before our disclosure, block starting (no system dialog). After consent, "prompt" is OK — getCurrentPosition triggers the OS prompt. */
          if (result.state === 'prompt' && !hasLocationDisclosureConsent()) {
            return;
          }
          startLocationTracking();
        })
        .catch(() => {
          startLocationTracking();
        });
    } else {
      startLocationTracking();
    }
  }, [startLocationTracking]);

  const stopTracking = useCallback(() => {
    clearWatchAndInterval();
    retryCount.current = 0;
    isBlockingUI.current = false;
    setIsTracking(false);
    setLocationAndRef(null);
    setError(null);
  }, [clearWatchAndInterval, setLocationAndRef]);

  /** Unmount: clear watch/interval only (no setState after unmount). */
  useEffect(() => {
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      if (updateInterval.current) {
        clearInterval(updateInterval.current);
        updateInterval.current = null;
      }
    };
  }, []);

  return {
    location,
    isTracking,
    error,
    startTracking,
    stopTracking,
  };
};

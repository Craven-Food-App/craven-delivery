import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LocationData {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
}

interface UseDriverLocationReturn {
  location: LocationData | null;
  isTracking: boolean;
  error: string | null;
  startTracking: () => void;
  stopTracking: () => void;
}

export const useDriverLocation = (): UseDriverLocationReturn => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  const updateInterval = useRef<NodeJS.Timeout | null>(null);
  const retryCount = useRef<number>(0);
  const maxRetries = useRef<number>(3);
  const isBlockingUI = useRef<boolean>(false);

  const updateLocationInDatabase = async (locationData: LocationData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update driver's current location in driver_profiles
      const { error: profileError } = await supabase
        .from('driver_profiles')
        .update({
          current_latitude: locationData.latitude,
          current_longitude: locationData.longitude,
          last_location_update: new Date().toISOString(),
          heading: locationData.heading,
          speed: locationData.speed
        })
        .eq('user_id', user.id);

      if (profileError) {
        console.error('Error updating driver profile location:', profileError);
        return;
      }

      // Add to location history
      const { error: historyError } = await supabase
        .from('driver_location_history')
        .insert({
          driver_id: user.id,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          heading: locationData.heading,
          speed: locationData.speed,
          accuracy: locationData.accuracy
        });

      if (historyError) {
        console.error('Error inserting location history:', historyError);
      }
    } catch (err) {
      console.error('Database update error:', err);
    }
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    // Request permission explicitly first
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        console.log('Geolocation permission status:', result.state);
        if (result.state === 'denied') {
          setError('GPS permission denied. Please enable location access in your browser settings.');
          return;
        }
        startLocationTracking();
      }).catch(() => {
        // Fallback if permissions API is not available
        startLocationTracking();
      });
    } else {
      startLocationTracking();
    }
  };

  const startLocationTracking = () => {
    setIsTracking(true);
    setError(null);

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000, // Increased timeout
      maximumAge: 10000 // Allow slightly older positions
    };

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          heading: position.coords.heading || undefined,
          speed: position.coords.speed || undefined,
          accuracy: position.coords.accuracy
        };

        setLocation(locationData);
        updateLocationInDatabase(locationData);
      },
      (err) => {
        console.error('Error getting initial position:', {
          code: err.code,
          message: err.message,
          PERMISSION_DENIED: err.PERMISSION_DENIED,
          POSITION_UNAVAILABLE: err.POSITION_UNAVAILABLE,
          TIMEOUT: err.TIMEOUT
        });
        
        retryCount.current += 1;
        
        // Stop retrying after max attempts to prevent UI blocking
        if (retryCount.current >= maxRetries.current) {
          let errorMessage = 'Location services unavailable. ';
          switch(err.code) {
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
        
        // For retries, just log and continue without blocking UI
        console.log(`GPS retry ${retryCount.current}/${maxRetries.current}`);
      },
      options
    );

    // Start watching position
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          heading: position.coords.heading || undefined,
          speed: position.coords.speed || undefined,
          accuracy: position.coords.accuracy
        };

        setLocation(locationData);
        console.log('Location updated:', locationData);
      },
      (err) => {
        console.error('Error watching position:', {
          code: err.code,
          message: err.message,
          PERMISSION_DENIED: err.PERMISSION_DENIED,
          POSITION_UNAVAILABLE: err.POSITION_UNAVAILABLE,
          TIMEOUT: err.TIMEOUT
        });
        
        // Don't stop tracking for timeouts, but limit retries
        if (err.code === err.TIMEOUT) {
          console.log('Location timeout, continuing...');
          return;
        }
        
        // For critical errors, stop tracking to prevent UI blocking
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
      options
    );

    // Update database every 30 seconds
    updateInterval.current = setInterval(() => {
      if (location) {
        updateLocationInDatabase(location);
      }
    }, 30000);
  };

  const stopTracking = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }

    if (updateInterval.current) {
      clearInterval(updateInterval.current);
      updateInterval.current = null;
    }

    // Reset retry counters
    retryCount.current = 0;
    isBlockingUI.current = false;
    
    setIsTracking(false);
    setLocation(null);
    setError(null);
  };

  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, []);

  return {
    location,
    isTracking,
    error,
    startTracking,
    stopTracking
  };
};
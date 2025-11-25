import { Capacitor } from '@capacitor/core';
import { Plugin, PluginListenerHandle } from '@capacitor/core';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed?: number;
  heading?: number;
  timestamp: number;
}

export interface BackgroundLocationPlugin extends Plugin {
  startTracking(): Promise<void>;
  stopTracking(): Promise<void>;
  addListener(
    eventName: 'locationUpdate',
    listenerFunc: (location: LocationData) => void
  ): PluginListenerHandle;
}

// For web, we'll use the browser geolocation API
class BackgroundLocationWeb implements BackgroundLocationPlugin {
  private watchId: number | null = null;
  private listeners: Array<(location: LocationData) => void> = [];

  async startTracking(): Promise<void> {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported');
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000,
    };

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed || undefined,
          heading: position.coords.heading || undefined,
          timestamp: position.timestamp,
        };

        // Notify all listeners
        this.listeners.forEach((listener) => listener(location));
      },
      (error) => {
        console.error('Background location error:', error);
      },
      options
    );
  }

  async stopTracking(): Promise<void> {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  addListener(
    eventName: 'locationUpdate',
    listenerFunc: (location: LocationData) => void
  ): PluginListenerHandle {
    this.listeners.push(listenerFunc);

    return {
      remove: () => {
        const index = this.listeners.indexOf(listenerFunc);
        if (index > -1) {
          this.listeners.splice(index, 1);
        }
      },
    };
  }
}

// For native platforms, we'll use Capacitor's plugin system
// Note: You'll need to create a native plugin for full background support
const BackgroundLocation = Capacitor.isNativePlatform()
  ? (Capacitor.Plugins.BackgroundLocation as BackgroundLocationPlugin) || new BackgroundLocationWeb()
  : new BackgroundLocationWeb();

export const useBackgroundLocation = () => {
  const startTracking = async () => {
    try {
      await BackgroundLocation.startTracking();
      console.log('Background location tracking started');
    } catch (error) {
      console.error('Failed to start background tracking:', error);
      throw error;
    }
  };

  const stopTracking = async () => {
    try {
      await BackgroundLocation.stopTracking();
      console.log('Background location tracking stopped');
    } catch (error) {
      console.error('Failed to stop background tracking:', error);
      throw error;
    }
  };

  const addLocationListener = (
    callback: (location: LocationData) => void
  ): PluginListenerHandle => {
    return BackgroundLocation.addListener('locationUpdate', callback);
  };

  return {
    startTracking,
    stopTracking,
    addLocationListener,
    BackgroundLocation,
  };
};


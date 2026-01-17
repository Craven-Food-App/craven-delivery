import { useState, useEffect, useCallback } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { safeLocalStorage } from '@/utils/safeStorage';

interface OfflineStorageOptions {
  key: string;
  defaultValue?: any;
  syncOnReconnect?: boolean;
  maxAge?: number; // in milliseconds
}

export const useOfflineStorage = <T>(options: OfflineStorageOptions) => {
  const { key, defaultValue, syncOnReconnect = true, maxAge } = options;
  const { isOnline } = useNetworkStatus();
  const [data, setData] = useState<T | null>(defaultValue || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const stored = safeLocalStorage.getItem(`offline_${key}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        
        // Check if data is expired
        if (maxAge && parsed.timestamp) {
          const age = Date.now() - parsed.timestamp;
          if (age > maxAge) {
            safeLocalStorage.removeItem(`offline_${key}`);
            setData(defaultValue || null);
            return;
          }
        }
        
        setData(parsed.data);
      }
    } catch (err) {
      console.error('Error loading offline data:', err);
      setError('Failed to load offline data');
      setData(defaultValue || null);
    }
  }, [key, defaultValue, maxAge]);

  // Save data to localStorage
  const saveData = useCallback((newData: T) => {
    try {
      const dataToStore = {
        data: newData,
        timestamp: Date.now(),
        version: 1
      };
      safeLocalStorage.setItem(`offline_${key}`, JSON.stringify(dataToStore));
      setData(newData);
      setError(null);
    } catch (err) {
      console.error('Error saving offline data:', err);
      setError('Failed to save offline data');
      // Still update state even if storage fails
      setData(newData);
    }
  }, [key]);

  // Clear offline data
  const clearData = useCallback(() => {
    try {
      safeLocalStorage.removeItem(`offline_${key}`);
      setData(defaultValue || null);
      setError(null);
    } catch (err) {
      console.error('Error clearing offline data:', err);
      setError('Failed to clear offline data');
      // Still update state even if storage fails
      setData(defaultValue || null);
    }
  }, [key, defaultValue]);

  // Sync data when coming back online
  useEffect(() => {
    if (isOnline && syncOnReconnect && data) {
      // Trigger sync - this would typically call an API to sync data
      console.log(`Syncing offline data for key: ${key}`, data);
    }
  }, [isOnline, syncOnReconnect, key, data]);

  return {
    data,
    setData: saveData,
    clearData,
    isLoading,
    error,
    isOnline
  };
};

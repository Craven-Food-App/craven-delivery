import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';
import { safeLocalStorage } from '@/utils/safeStorage';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
const CHECK_INTERVAL = 60 * 1000; // Check every minute
const WARNING_TIME = 5 * 60 * 1000; // Warn 5 minutes before logout

interface DraftData {
  [key: string]: any;
}

/**
 * Hook to automatically log out users after 30 minutes of inactivity
 * Saves work as draft before logging out
 */
export const useAutoLogout = (portalType: string, onSaveDraft?: () => DraftData | null) => {
  const navigate = useNavigate();
  const lastActivityRef = useRef<number>(Date.now());
  const warningShownRef = useRef<boolean>(false);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activityListenersRef = useRef<(() => void)[]>([]);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const pendingUpdateRef = useRef<boolean>(false);
  const consecutiveErrorsRef = useRef<number>(0);

  // Save draft to localStorage
  const saveDraft = useCallback(() => {
    try {
      const draftData = onSaveDraft ? onSaveDraft() : null;
      
      if (draftData) {
        const draftKey = `draft_${portalType}_${Date.now()}`;
        safeLocalStorage.setItem(draftKey, JSON.stringify({
          data: draftData,
          timestamp: Date.now(),
          portalType,
        }));
        
        // Also save to a "latest" key for easy retrieval
        safeLocalStorage.setItem(`draft_${portalType}_latest`, JSON.stringify({
          data: draftData,
          timestamp: Date.now(),
          portalType,
        }));
        
        console.log('💾 Draft saved before auto-logout');
      }
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  }, [onSaveDraft, portalType]);

  // Log out user and save draft
  const performLogout = useCallback(async () => {
    try {
      // Save draft before logging out
      saveDraft();

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Mark session as inactive
        await supabase
          .from('user_sessions')
          .update({ is_active: false })
          .eq('user_id', user.id)
          .eq('portal_type', portalType);

        // Log logout activity
        await supabase.from('user_activity_log').insert({
          user_id: user.id,
          activity_type: 'logout',
          portal_type: portalType,
          location: window.location.pathname,
          user_agent: navigator.userAgent,
          metadata: { reason: 'auto_logout_inactivity' },
        });
      }

      // Sign out from Supabase
      await supabase.auth.signOut();

      // Show notification
      notifications.show({
        title: 'Session Expired',
        message: 'You have been automatically logged out due to inactivity. Your work has been saved as a draft.',
        color: 'orange',
        autoClose: 5000,
      });

      // Redirect to login
      navigate('/auth');
    } catch (error) {
      console.error('Error during auto-logout:', error);
      // Force logout even if there's an error
      await supabase.auth.signOut();
      navigate('/auth');
    }
  }, [saveDraft, portalType, navigate]);

  // Update last activity timestamp with debouncing and error handling
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;
    
    // Clear any pending update
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }
    
    // Debounce: Only update database at most once every 5 seconds
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;
    const DEBOUNCE_INTERVAL = 5000; // 5 seconds
    
    // If too many consecutive errors, stop trying for a while
    if (consecutiveErrorsRef.current >= 3) {
      // Reset error count after 30 seconds
      if (timeSinceLastUpdate > 30000) {
        consecutiveErrorsRef.current = 0;
      } else {
        return; // Skip update if we have too many errors
      }
    }
    
    // Schedule update if enough time has passed
    if (timeSinceLastUpdate >= DEBOUNCE_INTERVAL && !pendingUpdateRef.current) {
      updateTimeoutRef.current = setTimeout(async () => {
        if (pendingUpdateRef.current) return; // Already updating
        
        pendingUpdateRef.current = true;
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { error } = await supabase
              .from('user_sessions')
              .update({ last_activity_at: new Date().toISOString() })
              .eq('user_id', user.id)
              .eq('portal_type', portalType)
              .eq('is_active', true);
            
            if (error) {
              // Check if it's a connection error
              if (error.message?.includes('Failed to fetch') || 
                  error.message?.includes('ERR_CONNECTION_CLOSED') ||
                  error.message?.includes('NetworkError')) {
                consecutiveErrorsRef.current += 1;
                // Don't log connection errors to avoid spam
                return;
              }
              // Log other errors
              console.error('Error updating session activity:', error);
              consecutiveErrorsRef.current += 1;
            } else {
              // Success - reset error count
              consecutiveErrorsRef.current = 0;
              lastUpdateRef.current = Date.now();
            }
          }
        } catch (error: any) {
          // Handle connection errors silently
          if (error?.message?.includes('Failed to fetch') || 
              error?.message?.includes('ERR_CONNECTION_CLOSED') ||
              error?.message?.includes('NetworkError')) {
            consecutiveErrorsRef.current += 1;
            return;
          }
          console.error('Error updating session activity:', error);
          consecutiveErrorsRef.current += 1;
        } finally {
          pendingUpdateRef.current = false;
        }
      }, 100); // Small delay to batch rapid events
    }
  }, [portalType]);

  // Check for inactivity
  const checkInactivity = useCallback(() => {
    const now = Date.now();
    const timeSinceActivity = now - lastActivityRef.current;

    // Show warning 5 minutes before logout
    if (timeSinceActivity >= INACTIVITY_TIMEOUT - WARNING_TIME && !warningShownRef.current) {
      warningShownRef.current = true;
      notifications.show({
        title: 'Inactivity Warning',
        message: 'You will be logged out in 5 minutes due to inactivity. Your work will be saved automatically.',
        color: 'yellow',
        autoClose: 60000,
      });
    }

    // Log out if inactive for 30 minutes
    if (timeSinceActivity >= INACTIVITY_TIMEOUT) {
      performLogout();
    }
  }, [performLogout]);

  // Set up activity listeners
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      updateActivity();
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
      activityListenersRef.current.push(() => {
        window.removeEventListener(event, handleActivity);
      });
    });

    return () => {
      activityListenersRef.current.forEach(cleanup => cleanup());
      activityListenersRef.current = [];
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }
    };
  }, [updateActivity]);

  // Set up inactivity check interval
  useEffect(() => {
    // Initialize last activity
    updateActivity();

    // Check for inactivity every minute
    checkIntervalRef.current = setInterval(checkInactivity, CHECK_INTERVAL);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [checkInactivity, updateActivity]);

  return {
    updateActivity,
    performLogout,
  };
};


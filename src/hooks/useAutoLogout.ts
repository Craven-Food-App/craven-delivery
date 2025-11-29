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

  // Update last activity timestamp
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;
    
    // Update session activity in database
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from('user_sessions')
          .update({ last_activity_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('portal_type', portalType)
          .eq('is_active', true)
          .then(() => {
            // Silently handle errors
          });
      }
    });
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


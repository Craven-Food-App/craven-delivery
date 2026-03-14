// @ts-nocheck
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export const useActivityTracking = (portalType: string) => {
  const location = useLocation();
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const trackActivity = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !mounted) return;

        const currentLocation = location.pathname;
        const pt = (portalType && String(portalType).trim()) || 'company';

        // Get IP and user agent if available
        const userAgent = navigator.userAgent;
        // Note: IP address would need to be captured server-side

        // Create or update session
        if (!sessionIdRef.current) {
          // Check for existing active session first
          const { data: existingSession, error: checkError } = await supabase
            .from('user_sessions')
            .select('id')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .eq('portal_type', pt)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // If table doesn't exist, silently skip tracking
          if (checkError && (checkError.code === 'PGRST116' || checkError.message?.includes('does not exist'))) {
            return;
          }

          if (existingSession) {
            sessionIdRef.current = existingSession.id;
            // Update existing session
            const { error: updateError } = await supabase
              .from('user_sessions')
              .update({
                current_location: currentLocation,
                last_activity_at: new Date().toISOString(),
                user_agent: userAgent,
              })
              .eq('id', existingSession.id);
            
            if (updateError && updateError.code !== 'PGRST116') {
              console.error('Error updating session:', updateError);
            }
          } else {
            // Create new session (ignore 400/403 - table or RLS may differ by env)
            const { data: session, error } = await supabase
              .from('user_sessions')
              .insert({
                user_id: user.id,
                session_token: crypto.randomUUID(),
                portal_type: pt,
                current_location: currentLocation,
                is_active: true,
                user_agent: userAgent,
                expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours
              })
              .select()
              .single();

            if (session && !error) {
              sessionIdRef.current = session.id;
              
              // Log login activity (ignore errors if table doesn't exist)
              const { error: logError } = await supabase.from('user_activity_log').insert({
                user_id: user.id,
                activity_type: 'login',
                portal_type: portalType,
                location: currentLocation,
                user_agent: userAgent,
              });
              
              if (logError && logError.code !== 'PGRST116') {
                console.error('Error logging activity:', logError);
              }
            }
          }
        } else {
          // Get previous location BEFORE updating to new location
          // This ensures we log where they WERE before moving to where they ARE now
          const { data: currentSession } = await supabase
            .from('user_sessions')
            .select('current_location')
            .eq('id', sessionIdRef.current)
            .single();

          const previousLocation = currentSession?.current_location || '';

          // If location changed, log the previous location to history IMMEDIATELY
          if (previousLocation && previousLocation !== currentLocation) {
            // Log previous location to activity history - this is the audit trail
            const { error: logError } = await supabase.from('user_activity_log').insert({
              user_id: user.id,
              activity_type: 'section_change',
              portal_type: portalType,
              location: previousLocation, // Log where they WERE
              user_agent: userAgent,
              metadata: { moved_to: currentLocation }, // Track where they moved to
            });
            
            if (logError && logError.code !== 'PGRST116') {
              console.error('Error logging previous location to history:', logError);
            }
          }

          // NOW update session to new location
          const { error: updateError } = await supabase
            .from('user_sessions')
            .update({
              current_location: currentLocation,
              last_activity_at: new Date().toISOString(),
            })
            .eq('id', sessionIdRef.current);

          if (updateError && updateError.code !== 'PGRST116') {
            console.error('Error updating session:', updateError);
          }
        }
      } catch (error: any) {
        // Only log errors that aren't "table doesn't exist"
        if (error?.code !== 'PGRST116' && !error?.message?.includes('does not exist')) {
          console.error('Error tracking activity:', error);
        }
      }
    };

    // Initial track
    trackActivity();

    // Track consecutive errors to prevent spam
    let consecutiveErrors = 0;
    
    // Update activity every 30 seconds to keep session active
    const interval = setInterval(async () => {
      if (mounted && sessionIdRef.current) {
        try {
          const { error } = await supabase
            .from('user_sessions')
            .update({ 
              last_activity_at: new Date().toISOString(),
              is_active: true // Ensure session stays active
            })
            .eq('id', sessionIdRef.current);
          
          if (error) {
            // Check if it's a connection error
            if (error.message?.includes('Failed to fetch') || 
                error.message?.includes('ERR_CONNECTION_CLOSED') ||
                error.message?.includes('NetworkError')) {
              consecutiveErrors += 1;
              // Stop trying after 3 consecutive connection errors
              if (consecutiveErrors >= 3) {
                clearInterval(interval);
                return;
              }
              return; // Don't log connection errors
            }
            
            if (error.code !== 'PGRST116') {
              console.error('Error updating session activity:', error);
              consecutiveErrors += 1;
            } else {
              consecutiveErrors = 0; // Reset on expected errors
            }
          } else {
            consecutiveErrors = 0; // Reset on success
          }
        } catch (error: any) {
          // Handle connection errors silently
          if (error?.message?.includes('Failed to fetch') || 
              error?.message?.includes('ERR_CONNECTION_CLOSED') ||
              error?.message?.includes('NetworkError')) {
            consecutiveErrors += 1;
            if (consecutiveErrors >= 3) {
              clearInterval(interval);
            }
            return;
          }
          
          if (error?.code !== 'PGRST116') {
            console.error('Error updating session activity:', error);
            consecutiveErrors += 1;
          } else {
            consecutiveErrors = 0;
          }
        }
      }
    }, 30000);

    // Cleanup on unmount
    return () => {
      mounted = false;
      clearInterval(interval);
      
      // Mark session as inactive on logout/unmount (fire and forget)
      if (sessionIdRef.current) {
        const sessionId = sessionIdRef.current;
        
        // Update session to inactive - don't await, just fire
        supabase
          .from('user_sessions')
          .update({ is_active: false })
          .eq('id', sessionId)
          .then(() => {
            // After session is updated, try to log logout
            return supabase.auth.getUser();
          })
          .then(({ data: { user } }) => {
            if (user) {
              return supabase.from('user_activity_log').insert({
                user_id: user.id,
                activity_type: 'logout',
                portal_type: portalType,
                location: location.pathname,
                user_agent: navigator.userAgent,
              });
            }
          })
          // @ts-ignore - Promise type compatibility
          .catch((error) => {
            // Silently handle errors during cleanup
            console.error('Error during cleanup:', error);
          });
      }
    };
  }, [location.pathname, portalType]);
};


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
            .eq('portal_type', portalType)
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
            // Create new session
            const { data: session, error } = await supabase
              .from('user_sessions')
              .insert({
                user_id: user.id,
                session_token: crypto.randomUUID(),
                portal_type: portalType,
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
          // Update existing session
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

          // Log section change (ignore errors if table doesn't exist)
          const { error: logError } = await supabase.from('user_activity_log').insert({
            user_id: user.id,
            activity_type: 'section_change',
            portal_type: portalType,
            location: currentLocation,
            user_agent: userAgent,
          });
          
          if (logError && logError.code !== 'PGRST116') {
            console.error('Error logging activity:', logError);
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

    // Update activity every 30 seconds
    const interval = setInterval(async () => {
      if (mounted && sessionIdRef.current) {
        try {
          const { error } = await supabase
            .from('user_sessions')
            .update({ last_activity_at: new Date().toISOString() })
            .eq('id', sessionIdRef.current);
          
          if (error && error.code !== 'PGRST116') {
            console.error('Error updating session activity:', error);
          }
        } catch (error: any) {
          if (error?.code !== 'PGRST116') {
            console.error('Error updating session activity:', error);
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


import { useEffect, useCallback } from 'react';
import { safeSessionStorage } from '@/utils/safeStorage';
import { analyticsConfig, environment } from '@/config/environment';
import { mobileAnalyticsService } from '@/services/mobileAnalyticsService';

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp?: string;
  userId?: string;
  sessionId?: string;
}

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

export const useAnalytics = () => {
  // Initialize Google Analytics
  useEffect(() => {
    if (analyticsConfig.ENABLED && environment.ANALYTICS_ID) {
      // Load Google Analytics script
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${environment.ANALYTICS_ID}`;
      document.head.appendChild(script);

      window.dataLayer = window.dataLayer || [];
      window.gtag = function() {
        window.dataLayer.push(arguments);
      };

      window.gtag('js', new Date());
      window.gtag('config', environment.ANALYTICS_ID, {
        page_path: window.location.pathname,
        anonymize_ip: true,
      });
    }
  }, []);

  const trackEvent = useCallback((event: string, properties?: Record<string, any>) => {
    const analyticsEvent: AnalyticsEvent = {
      event,
      properties: {
        ...properties,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      },
      sessionId: getSessionId()
    };

    // Send to Google Analytics if enabled
    if (analyticsConfig.ENABLED && environment.ANALYTICS_ID && window.gtag) {
      try {
        window.gtag('event', event, {
          ...properties,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error('Failed to send analytics event:', error);
      }
    }

    // Send to Supabase database via mobileAnalyticsService
    if (analyticsConfig.ENABLED) {
      try {
        mobileAnalyticsService.trackEvent({
          event_type: event === 'page_view' ? 'page_view' : 'user_action',
          event_name: event,
          properties: properties,
        });
      } catch (error) {
        console.error('Failed to send analytics to database:', error);
      }
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Analytics Event:', analyticsEvent);
    }
  }, []);

  const trackPageView = useCallback((page: string, title?: string) => {
    // Send to Google Analytics
    if (analyticsConfig.ENABLED && environment.ANALYTICS_ID && window.gtag) {
      try {
        window.gtag('config', environment.ANALYTICS_ID, {
          page_path: page,
          page_title: title || document.title,
        });
      } catch (error) {
        console.error('Failed to track page view:', error);
      }
    }
    
    trackEvent('page_view', {
      page,
      title: title || document.title
    });
  }, [trackEvent]);

  const trackUserAction = useCallback((action: string, properties?: Record<string, any>) => {
    trackEvent('user_action', {
      action,
      ...properties
    });
  }, [trackEvent]);

  const trackError = useCallback((error: string, properties?: Record<string, any>) => {
    trackEvent('error', {
      error,
      ...properties
    });
    
    // Also send to error tracking service
    if (analyticsConfig.ENABLED) {
      try {
        mobileAnalyticsService.trackError(new Error(error), JSON.stringify(properties));
      } catch (err) {
        console.error('Failed to track error:', err);
      }
    }
  }, [trackEvent]);

  const trackPerformance = useCallback((metric: string, value: number, properties?: Record<string, any>) => {
    trackEvent('performance', {
      metric,
      value,
      ...properties
    });
    
    // Also send to performance metrics service
    if (analyticsConfig.ENABLED) {
      try {
        mobileAnalyticsService.trackPerformance({
          loadTime: properties?.loadTime || (metric === 'load_time' ? value : undefined),
          renderTime: properties?.renderTime || (metric === 'render_time' ? value : undefined),
          memoryUsage: properties?.memoryUsage || (metric === 'memory_usage' ? value : undefined),
          networkLatency: properties?.networkLatency || (metric === 'network_latency' ? value : undefined),
        });
      } catch (err) {
        console.error('Failed to track performance:', err);
      }
    }
  }, [trackEvent]);

  // Initialize mobile analytics service
  useEffect(() => {
    if (analyticsConfig.ENABLED) {
      mobileAnalyticsService.initialize().catch((error) => {
        console.error('Failed to initialize mobile analytics:', error);
      });
    }

    // Cleanup on unmount
    return () => {
      if (analyticsConfig.ENABLED) {
        mobileAnalyticsService.cleanup().catch(() => {
          // Silently fail on cleanup
        });
      }
    };
  }, []);

  // Track page views automatically
  useEffect(() => {
    trackPageView(window.location.pathname);
  }, [trackPageView]);

  return {
    trackEvent,
    trackPageView,
    trackUserAction,
    trackError,
    trackPerformance
  };
};

// Helper function to get or create session ID (iOS-safe)
const getSessionId = (): string => {
  let sessionId = safeSessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    safeSessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
};

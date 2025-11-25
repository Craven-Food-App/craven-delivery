import { useEffect } from 'react';
import * as Sentry from "@sentry/react";
import { errorReportingConfig } from "@/config/environment";
import { supabase } from "@/integrations/supabase/client";

interface CrashReport {
  error: Error;
  componentStack?: string;
  errorBoundary?: string;
  timestamp: string;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId?: string;
}

export const useCrashReporting = () => {
  useEffect(() => {
    if (!errorReportingConfig.ENABLED) {
      return;
    }

    // Global error handler for unhandled errors
    const handleGlobalError = (event: ErrorEvent) => {
      // Filter out known harmless errors
      if (event.message?.includes('LockManager') || 
          event.message?.includes('CacheStorage') ||
          event.message?.includes('Failed to open cache')) {
        return;
      }

      if (errorReportingConfig.ENABLED && errorReportingConfig.DSN) {
        Sentry.captureException(event.error || new Error(event.message), {
          contexts: {
            error: {
              message: event.message,
              filename: event.filename,
              lineno: event.lineno,
              colno: event.colno,
            },
          },
          tags: {
            errorType: 'global_error',
          },
        });
      }
    };

    // Global handler for unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Filter out known harmless rejections
      if (event.reason?.toString().includes('LockManager') ||
          event.reason?.toString().includes('CacheStorage')) {
        return;
      }

      if (errorReportingConfig.ENABLED && errorReportingConfig.DSN) {
        Sentry.captureException(
          new Error(event.reason?.toString() || 'Unhandled Promise Rejection'),
          {
            contexts: {
              rejection: {
                reason: event.reason,
              },
            },
            tags: {
              errorType: 'unhandled_rejection',
            },
          }
        );
      }
    };

    // Set user context when available
    const setUserContext = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && errorReportingConfig.ENABLED) {
          Sentry.setUser({
            id: user.id,
            email: user.email,
          });
        }
      } catch (error) {
        // Silently fail - user context is optional
      }
    };

    setUserContext();

    // Add event listeners
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const reportCustomError = (error: Error, context?: string) => {
    if (errorReportingConfig.ENABLED && errorReportingConfig.DSN) {
      Sentry.captureException(error, {
        tags: {
          context: context || 'custom_error',
        },
        extra: {
          componentStack: context,
        },
      });
    } else {
      console.error('Crash Report:', {
        error: error.message,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString(),
      });
    }
  };

  return {
    reportCustomError
  };
};

// Helper function to get or create session ID
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('crash_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('crash_session_id', sessionId);
  }
  return sessionId;
};

import * as Sentry from "@sentry/react";
import { errorReportingConfig } from "@/config/environment";

export const initSentry = () => {
  if (!errorReportingConfig.ENABLED || !errorReportingConfig.DSN) {
    console.log("Sentry disabled or DSN not configured");
    return;
  }

  try {
    Sentry.init({
      dsn: errorReportingConfig.DSN,
      environment: errorReportingConfig.ENVIRONMENT,
      release: errorReportingConfig.RELEASE,
      tracesSampleRate: errorReportingConfig.SAMPLE_RATE,
      maxBreadcrumbs: errorReportingConfig.MAX_BREADCRUMBS,
      attachStacktrace: errorReportingConfig.ATTACH_STACKTRACE,
      integrations: [
        new Sentry.BrowserTracing({
          // Set sampling rate for performance monitoring
          tracePropagationTargets: ["localhost", /^https:\/\/.*\.supabase\.co/],
        }),
        new Sentry.Replay({
          maskAllText: true,
          blockAllMedia: true,
          sampleRate: errorReportingConfig.SAMPLE_RATE,
        }),
      ],
      beforeSend(event, hint) {
        // Filter out known harmless errors
        if (event.exception) {
          const error = hint.originalException;
          if (error instanceof Error) {
            // Filter out LockManager warnings (known browser compatibility issue)
            if (error.message.includes('LockManager') || error.message.includes('@supabase/gotrue-js')) {
              return null;
            }
            // Filter out CacheStorage errors (handled gracefully)
            if (error.message.includes('CacheStorage') || error.message.includes('Failed to open cache')) {
              return null;
            }
          }
        }
        return event;
      },
    });

    console.log("✅ Sentry initialized successfully");
  } catch (error) {
    console.error("Failed to initialize Sentry:", error);
  }
};


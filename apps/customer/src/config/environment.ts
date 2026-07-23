// Environment configuration for production readiness

export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  API_URL: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  MAPBOX_ACCESS_TOKEN: string;
  VAPID_PUBLIC_KEY: string;
  SENTRY_DSN?: string;
  ANALYTICS_ID?: string;
  CRASH_REPORTING_ENABLED: boolean;
  PERFORMANCE_MONITORING_ENABLED: boolean;
  OFFLINE_MODE_ENABLED: boolean;
  DEBUG_MODE: boolean;
  VERSION: string;
  BUILD_NUMBER: string;
}

// Validate environment variables (non-blocking)
const validateEnvironment = (): void => {
  const optionalVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_MAPBOX_ACCESS_TOKEN'
  ];

  const missingVars = optionalVars.filter(varName => !import.meta.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn(`⚠️ Optional environment variables not set: ${missingVars.join(', ')}`);
    console.warn('ℹ️ App will continue with limited functionality. Some features may not work.');
  } else {
    console.log('✅ All environment variables configured');
  }
};

// Run validation (never throws errors)
validateEnvironment();

// Environment configuration
export const environment: EnvironmentConfig = {
  NODE_ENV: import.meta.env.MODE as 'development' | 'production' | 'test',
  API_URL: import.meta.env.VITE_API_URL || 'https://api.craven-delivery.com',
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  MAPBOX_ACCESS_TOKEN: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '',
  VAPID_PUBLIC_KEY: import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BPgLUmyCVcWgjxTTQiwY0FSiD7pm-X5u6z7OCU1sXpypwvrrXXja_ADXlEVVGkoisV2XdFpoNMMS_yKFp2FpIC8',
  SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
  ANALYTICS_ID: import.meta.env.VITE_ANALYTICS_ID,
  CRASH_REPORTING_ENABLED: import.meta.env.VITE_CRASH_REPORTING_ENABLED === 'true',
  PERFORMANCE_MONITORING_ENABLED: import.meta.env.VITE_PERFORMANCE_MONITORING_ENABLED === 'true',
  OFFLINE_MODE_ENABLED: import.meta.env.VITE_OFFLINE_MODE_ENABLED === 'true',
  DEBUG_MODE: import.meta.env.VITE_DEBUG_MODE === 'true',
  VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  BUILD_NUMBER: import.meta.env.VITE_BUILD_NUMBER || '1'
};

// Feature flags for gradual rollout
export const featureFlags = {
  NEW_DELIVERY_FLOW: environment.NODE_ENV === 'development' || environment.DEBUG_MODE,
  ENHANCED_ANALYTICS: environment.PERFORMANCE_MONITORING_ENABLED,
  OFFLINE_MODE: environment.OFFLINE_MODE_ENABLED,
  CRASH_REPORTING: environment.CRASH_REPORTING_ENABLED,
  BETA_FEATURES: environment.NODE_ENV === 'development'
};

// API endpoints configuration
export const apiEndpoints = {
  base: environment.API_URL,
  auth: `${environment.API_URL}/auth`,
  drivers: `${environment.API_URL}/drivers`,
  orders: `${environment.API_URL}/orders`,
  earnings: `${environment.API_URL}/earnings`,
  analytics: `${environment.API_URL}/analytics`,
  crashes: `${environment.API_URL}/crashes`
};

// Performance thresholds
export const performanceThresholds = {
  API_TIMEOUT: 10000, // 10 seconds
  MAX_RETRY_ATTEMPTS: 3,
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  LONG_TASK_THRESHOLD: 50, // 50ms
  MEMORY_WARNING_THRESHOLD: 100 * 1024 * 1024, // 100MB
  NETWORK_TIMEOUT: 30000 // 30 seconds
};

// Security configuration
export const securityConfig = {
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
  MAX_LOGIN_ATTEMPTS: 5,
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  PASSWORD_MIN_LENGTH: 8,
  TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes
  ENCRYPTION_KEY: 'your-encryption-key-here' // Should be from environment
};

// Logging configuration
export const loggingConfig = {
  LEVEL: environment.DEBUG_MODE ? 'debug' : 'info',
  ENABLE_CONSOLE: environment.NODE_ENV !== 'production',
  ENABLE_REMOTE: environment.NODE_ENV === 'production',
  MAX_LOG_SIZE: 1000,
  LOG_RETENTION_DAYS: 30
};

// Analytics configuration
export const analyticsConfig = {
  ENABLED: !!environment.ANALYTICS_ID,
  TRACK_PAGE_VIEWS: true,
  TRACK_USER_ACTIONS: true,
  TRACK_PERFORMANCE: environment.PERFORMANCE_MONITORING_ENABLED,
  TRACK_ERRORS: environment.CRASH_REPORTING_ENABLED,
  SAMPLE_RATE: environment.NODE_ENV === 'production' ? 0.1 : 1.0
};

// Error reporting configuration
export const errorReportingConfig = {
  ENABLED: environment.CRASH_REPORTING_ENABLED,
  DSN: environment.SENTRY_DSN,
  ENVIRONMENT: environment.NODE_ENV,
  RELEASE: `${environment.VERSION}-${environment.BUILD_NUMBER}`,
  SAMPLE_RATE: environment.NODE_ENV === 'production' ? 0.1 : 1.0,
  MAX_BREADCRUMBS: 100,
  ATTACH_STACKTRACE: true
};

// Network configuration
export const networkConfig = {
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  TIMEOUT: 10000,
  OFFLINE_CHECK_INTERVAL: 5000,
  CONNECTION_TIMEOUT: 30000
};

// Storage configuration
export const storageConfig = {
  PREFIX: 'craven_driver_',
  VERSION: '1.0',
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ENCRYPTION_ENABLED: environment.NODE_ENV === 'production',
  COMPRESSION_ENABLED: true
};

// Development tools configuration
export const devToolsConfig = {
  ENABLE_REDUX_DEVTOOLS: environment.NODE_ENV === 'development',
  ENABLE_REACT_DEVTOOLS: environment.NODE_ENV === 'development',
  ENABLE_PERFORMANCE_PROFILER: environment.DEBUG_MODE,
  ENABLE_NETWORK_INSPECTOR: environment.DEBUG_MODE
};

// Export environment-specific configurations
export const isDevelopment = environment.NODE_ENV === 'development';
export const isProduction = environment.NODE_ENV === 'production';
export const isTest = environment.NODE_ENV === 'test';

// Environment validation
export const validateEnvironmentConfig = (): boolean => {
  try {
    validateEnvironment();
    return true;
  } catch (error) {
    console.error('Environment validation failed:', error);
    return false;
  }
};

// Get environment info for debugging
export const getEnvironmentInfo = () => ({
  nodeEnv: environment.NODE_ENV,
  version: environment.VERSION,
  buildNumber: environment.BUILD_NUMBER,
  debugMode: environment.DEBUG_MODE,
  featureFlags,
  performanceThresholds,
  securityConfig
});

import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';
import { safeSessionStorage } from '@/utils/safeStorage';

interface DeviceInfo {
  platform: 'ios' | 'android' | 'web';
  os_version?: string;
  app_version?: string;
  device_model?: string;
}

interface AnalyticsEvent {
  event_type: 'page_view' | 'user_action' | 'error' | 'performance';
  event_name: string;
  properties?: Record<string, any>;
}

interface PerformanceMetrics {
  loadTime?: number;
  renderTime?: number;
  memoryUsage?: number;
  networkLatency?: number;
}

/**
 * Service for sending mobile app analytics to Supabase database
 * This allows the CTO portal to track mobile app usage, uptime, feature completion, and performance
 */
class MobileAnalyticsService {
  private sessionId: string | null = null;
  private currentUserId: string | null = null;
  private currentDriverId: string | null = null;
  private uptimeSessionStart: Date | null = null;
  private lastUptimeStatus: 'online' | 'offline' | 'crashed' | 'background' | null = null;

  /**
   * Initialize the analytics service
   */
  async initialize(): Promise<void> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        this.currentUserId = user.id;
        
        // Try to get driver_id from drivers table
        const { data: driver } = await supabase
          .from('drivers' as any)
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        if (driver) {
          this.currentDriverId = (driver as any).id;
        }
      }

      // Generate or retrieve session ID
      this.sessionId = this.getSessionId();
      
      // Track app start
      await this.trackUptimeStatus('online');
    } catch (error) {
      console.error('Failed to initialize mobile analytics:', error);
    }
  }

  /**
   * Get or create a session ID
   */
  private getSessionId(): string {
    if (this.sessionId) {
      return this.sessionId;
    }

    try {
      const stored = safeSessionStorage.getItem('mobile_analytics_session_id');
      if (stored) {
        this.sessionId = stored;
        return stored;
      }
    } catch (e) {
      // Storage might be blocked (iOS)
    }

    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.sessionId = newSessionId;
    
    try {
      safeSessionStorage.setItem('mobile_analytics_session_id', newSessionId);
    } catch (e) {
      // Storage might be blocked, continue anyway
    }

    return newSessionId;
  }

  /**
   * Get device information
   */
  private getDeviceInfo(): DeviceInfo {
    const platform = Capacitor.isNativePlatform()
      ? (Capacitor.getPlatform() === 'ios' ? 'ios' : 'android')
      : 'web';

    return {
      platform,
      // Add more device info if available via Capacitor plugins
    };
  }

  /**
   * Track an analytics event
   */
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    if (!this.currentUserId) {
      await this.initialize();
    }

    try {
      const { error } = await supabase
        .from('mobile_app_analytics_events' as any)
        .insert({
          user_id: this.currentUserId,
          driver_id: this.currentDriverId,
          event_type: event.event_type,
          event_name: event.event_name,
          properties: event.properties || {},
          session_id: this.sessionId,
          device_info: this.getDeviceInfo(),
        });

      if (error) {
        console.error('Failed to track analytics event:', error);
      }
    } catch (error) {
      console.error('Error tracking analytics event:', error);
      // Silently fail - analytics is non-critical
    }
  }

  /**
   * Track uptime/downtime status
   */
  async trackUptimeStatus(status: 'online' | 'offline' | 'crashed' | 'background'): Promise<void> {
    if (!this.currentUserId) {
      await this.initialize();
    }

    try {
      const now = new Date();

      // If status changed, end the previous session
      if (this.lastUptimeStatus && this.lastUptimeStatus !== status && this.uptimeSessionStart) {
        const duration = Math.floor((now.getTime() - this.uptimeSessionStart.getTime()) / 1000);
        
        await supabase
          .from('mobile_app_uptime_downtime' as any)
          .insert({
            user_id: this.currentUserId,
            driver_id: this.currentDriverId,
            session_id: this.sessionId,
            status: this.lastUptimeStatus,
            start_time: this.uptimeSessionStart.toISOString(),
            end_time: now.toISOString(),
            duration_seconds: duration,
            device_info: this.getDeviceInfo(),
          });
      }

      // Start new session
      this.lastUptimeStatus = status;
      this.uptimeSessionStart = now;

      // Insert current status (will be updated when status changes)
      await supabase
        .from('mobile_app_uptime_downtime' as any)
        .insert({
          user_id: this.currentUserId,
          driver_id: this.currentDriverId,
          session_id: this.sessionId,
          status,
          start_time: now.toISOString(),
          device_info: this.getDeviceInfo(),
        });
    } catch (error) {
      console.error('Error tracking uptime status:', error);
      // Silently fail - analytics is non-critical
    }
  }

  /**
   * Track feature completion
   */
  async trackFeatureCompletion(
    featureName: string,
    status: 'started' | 'completed' | 'failed' | 'abandoned',
    completionPercentage: number = 0,
    timeSpentSeconds?: number,
    properties?: Record<string, any>
  ): Promise<void> {
    if (!this.currentUserId) {
      await this.initialize();
    }

    try {
      await supabase
        .from('mobile_app_feature_completion')
        .insert({
          user_id: this.currentUserId,
          driver_id: this.currentDriverId,
          feature_name: featureName,
          feature_status: status,
          completion_percentage: Math.max(0, Math.min(100, completionPercentage)),
          time_spent_seconds: timeSpentSeconds,
          properties: properties || {},
        });
    } catch (error) {
      console.error('Error tracking feature completion:', error);
      // Silently fail - analytics is non-critical
    }
  }

  /**
   * Track performance metrics
   */
  async trackPerformance(metrics: PerformanceMetrics): Promise<void> {
    if (!this.currentUserId) {
      await this.initialize();
    }

    try {
      await supabase
        .from('mobile_app_performance_metrics' as any)
        .insert({
          user_id: this.currentUserId,
          driver_id: this.currentDriverId,
          session_id: this.sessionId,
          load_time_ms: metrics.loadTime,
          render_time_ms: metrics.renderTime,
          memory_usage_mb: metrics.memoryUsage,
          network_latency_ms: metrics.networkLatency,
          device_info: this.getDeviceInfo(),
        });
    } catch (error) {
      console.error('Error tracking performance metrics:', error);
      // Silently fail - analytics is non-critical
    }
  }

  /**
   * Track an error
   */
  async trackError(error: Error, context?: string): Promise<void> {
    if (!this.currentUserId) {
      await this.initialize();
    }

    try {
      // Track in error logs table
      await supabase
        .from('mobile_app_error_logs' as any)
        .insert({
          user_id: this.currentUserId,
          driver_id: this.currentDriverId,
          session_id: this.sessionId,
          error_type: 'javascript_error',
          error_message: error.message,
          error_stack: error.stack,
          error_context: context ? { context } : {},
          device_info: this.getDeviceInfo(),
        });

      // Also track as analytics event
      await this.trackEvent({
        event_type: 'error',
        event_name: 'error_occurred',
        properties: {
          error_message: error.message,
          error_type: error.name,
          context,
        },
      });
    } catch (err) {
      console.error('Error tracking error:', err);
      // Silently fail - analytics is non-critical
    }
  }

  /**
   * Clean up when app closes or user logs out
   */
  async cleanup(): Promise<void> {
    if (this.lastUptimeStatus && this.uptimeSessionStart) {
      await this.trackUptimeStatus('offline');
    }
  }
}

// Export singleton instance
export const mobileAnalyticsService = new MobileAnalyticsService();


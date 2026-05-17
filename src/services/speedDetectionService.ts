// @ts-nocheck
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

interface SpeedData {
  currentSpeed: number;
  speedLimit: number;
  isOverLimit: boolean;
  violationAmount: number;
  timestamp: Date;
  latitude: number;
  longitude: number;
}

interface SpeedViolation {
  userId: string;
  timestamp: Date;
  speedLimit: number;
  actualSpeed: number;
  excessSpeed: number;
  location: { lat: number; lng: number };
  pointsPenalty: number;
}

class SpeedDetectionService {
  private watchId: string | null = null;
  private isMonitoring = false;
  private speedLimit = 25;
  private violationThreshold = 5;
  private onSpeedUpdate?: (data: SpeedData) => void;
  private onViolation?: (violation: SpeedViolation) => void;
  private userId = '';
  private warnedUnsupportedPlatform = false;

  isSupported() {
    return Capacitor.isNativePlatform();
  }

  async startMonitoring(
    userId: string,
    callbacks: {
      onSpeedUpdate?: (data: SpeedData) => void;
      onViolation?: (violation: SpeedViolation) => void;
    }
  ) {
    if (!this.isSupported()) {
      if (!this.warnedUnsupportedPlatform) {
        console.info('Speed monitoring is disabled on web previews.');
        this.warnedUnsupportedPlatform = true;
      }
      this.isMonitoring = false;
      return false;
    }

    if (this.isMonitoring) {
      return true;
    }

    this.userId = userId;
    this.onSpeedUpdate = callbacks.onSpeedUpdate;
    this.onViolation = callbacks.onViolation;

    try {
      const permission = await Geolocation.requestPermissions();
      if (permission.location !== 'granted') {
        throw new Error('Location permission denied');
      }

      this.isMonitoring = true;

      this.watchId = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        },
        (position, err) => {
          if (err) {
            console.error('Position error:', err);
            return;
          }

          if (position) {
            this.handlePositionUpdate(position);
          }
        }
      );

      console.log('✅ Speed monitoring started');
      return true;
    } catch (error) {
      console.error('Failed to start speed monitoring:', error);
      this.isMonitoring = false;
      return false;
    }
  }

  async stopMonitoring() {
    if (!this.isSupported()) {
      this.isMonitoring = false;
      return;
    }

    if (this.watchId) {
      await Geolocation.clearWatch({ id: this.watchId });
      this.watchId = null;
    }
    this.isMonitoring = false;
    console.log('🛑 Speed monitoring stopped');
  }

  private async handlePositionUpdate(position: GeolocationPosition) {
    const currentSpeed = (position.coords.speed || 0) * 2.237;

    const speedLimit = await this.getSpeedLimitForLocation(
      position.coords.latitude,
      position.coords.longitude
    );

    const excessSpeed = currentSpeed - speedLimit;
    const isOverLimit = excessSpeed > this.violationThreshold;

    const speedData: SpeedData = {
      currentSpeed: Math.round(currentSpeed),
      speedLimit,
      isOverLimit,
      violationAmount: Math.max(0, excessSpeed),
      timestamp: new Date(),
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };

    if (this.onSpeedUpdate) {
      this.onSpeedUpdate(speedData);
    }

    if (isOverLimit) {
      await this.recordViolation(speedData);
    }
  }

  private async getSpeedLimitForLocation(_lat: number, _lng: number): Promise<number> {
    // TODO: Integrate with Mapbox or other API for real speed limits
    return this.speedLimit;
  }

  private async recordViolation(speedData: SpeedData) {
    const pointsPenalty = this.calculatePenalty(speedData.violationAmount);

    const violation: SpeedViolation = {
      userId: this.userId,
      timestamp: speedData.timestamp,
      speedLimit: speedData.speedLimit,
      actualSpeed: speedData.currentSpeed,
      excessSpeed: speedData.violationAmount,
      location: { lat: speedData.latitude, lng: speedData.longitude },
      pointsPenalty,
    };

    try {
      const { error } = await supabase.from('speed_violations').insert({
        user_id: violation.userId,
        timestamp: violation.timestamp.toISOString(),
        speed_limit: violation.speedLimit,
        actual_speed: violation.actualSpeed,
        excess_speed: violation.excessSpeed,
        latitude: violation.location.lat,
        longitude: violation.location.lng,
        points_penalty: violation.pointsPenalty,
      });

      if (error) throw error;

      console.log('⚠️ Speed violation recorded:', violation);

      if (this.onViolation) {
        this.onViolation(violation);
      }
    } catch (error) {
      console.error('Failed to record violation:', error);
    }
  }

  private calculatePenalty(excessSpeed: number): number {
    if (excessSpeed >= 20) return 500;
    if (excessSpeed >= 15) return 300;
    if (excessSpeed >= 10) return 150;
    if (excessSpeed >= 5) return 50;
    return 0;
  }

  async checkViolationThreshold(userId: string): Promise<boolean> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('speed_violations')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', oneDayAgo);

      if (error) throw error;

      const violationCount = data?.length || 0;
      const VIOLATION_LIMIT = 3;

      if (violationCount >= VIOLATION_LIMIT) {
        await supabase
          .from('driver_settings')
          .update({ on_fire_game_enabled: false })
          .eq('user_id', userId);

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking violations:', error);
      return false;
    }
  }
}

export const speedDetectionService = new SpeedDetectionService();



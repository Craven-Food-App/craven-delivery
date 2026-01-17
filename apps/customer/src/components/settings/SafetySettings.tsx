import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNativeNotification } from '@/hooks/useNativeNotification';
import { AlertTriangle, Shield, Flame } from 'lucide-react';

interface SafetySettingsProps {
  userId: string;
  currentSettings: {
    onFireGameEnabled: boolean;
    speedDetectionEnabled: boolean;
  };
  onSettingsUpdate?: () => void;
}

export const SafetySettings: React.FC<SafetySettingsProps> = ({ 
  userId, 
  currentSettings,
  onSettingsUpdate 
}) => {
  const [onFireGameEnabled, setOnFireGameEnabled] = useState(currentSettings.onFireGameEnabled);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { showNotification } = useNativeNotification();

  const handleToggle = async (enabled: boolean) => {
    if (enabled) {
      setShowConfirmation(true);
    } else {
      await updateSetting(false);
    }
  };

  const confirmEnable = async () => {
    await updateSetting(true);
    setShowConfirmation(false);
  };

  const updateSetting = async (enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('driver_settings')
        .upsert({
          user_id: userId,
          on_fire_game_enabled: enabled,
          speed_detection_enabled: enabled,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setOnFireGameEnabled(enabled);
      
      showNotification(
        enabled ? 'ON FIRE Game Activated!' : 'ON FIRE Game Deactivated',
        enabled 
          ? 'Speed monitoring is now active. Drive safely to earn maximum points!' 
          : 'Game mode disabled. Speed monitoring turned off.',
        'success'
      );

      if (onSettingsUpdate) {
        onSettingsUpdate();
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      showNotification(
        'Settings Error',
        'Failed to update ON FIRE Game settings.',
        'error'
      );
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-lg p-6 border-2 border-orange-500/20">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">ON FIRE Game Mode</h3>
              <p className="text-sm text-gray-600">Gamified delivery experience</p>
            </div>
          </div>
          
          <button
            onClick={() => handleToggle(!onFireGameEnabled)}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
              onFireGameEnabled ? 'bg-orange-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                onFireGameEnabled ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-start gap-2">
            <Shield className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-700">
              <strong>Safety-First Gaming:</strong> Earn points by completing deliveries efficiently, 
              but speed limits are strictly enforced.
            </p>
          </div>
          
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-700">
              <strong>Speed Penalty:</strong> Driving 5+ MPH over the speed limit will reduce your points 
              and could disable game mode if violations persist.
            </p>
          </div>
        </div>

        <div className="bg-white/50 rounded-lg p-4 space-y-2">
          <h4 className="font-semibold text-gray-900 text-sm">🏆 How to Win:</h4>
          <ul className="text-sm text-gray-700 space-y-1 ml-4">
            <li>• <strong>Speed up pickups:</strong> Quick order gathering = bonus points</li>
            <li>• <strong>Fast photo uploads:</strong> Efficient delivery completion</li>
            <li>• <strong>High acceptance rate:</strong> Accept more orders for multipliers</li>
            <li>• <strong>Maintain streaks:</strong> Consecutive deliveries without rejection</li>
            <li>• <strong>Drive SAFELY:</strong> Stay within speed limits at all times</li>
          </ul>
        </div>

        {onFireGameEnabled && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-semibold text-green-800 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Speed monitoring active - Drive safely and earn points!
            </p>
          </div>
        )}
      </div>

      {showConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                <Flame className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Enable ON FIRE Game?</h3>
            </div>

            <div className="space-y-4 mb-6">
              <p className="text-gray-700">
                By enabling this feature, you agree to:
              </p>
              
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <Shield className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Allow speed monitoring while delivering</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Lose points</strong> for driving 5+ MPH over speed limit</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span>Follow all traffic laws and drive safely</span>
                </li>
              </ul>

              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm font-semibold text-red-800">
                  ⚠️ Repeated speed violations may result in game mode suspension
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={confirmEnable}
                className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600"
              >
                Enable Game Mode
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



/**
 * Service for managing driver payout settings
 */
import { supabase } from '@/integrations/supabase/client';
import { emitDriverOperationsChange } from '@/lib/driverOperationsEvents';

export interface PayoutSettings {
  basePayCents: number;
  shareBps: number;
}

export const payoutSettingsService = {
  /**
   * Get current active payout settings
   */
  async getSettings(): Promise<PayoutSettings> {
    const { data, error } = await supabase
      .from('driver_payout_settings')
      .select('driver_base_pay_cents, driver_delivery_fee_share_bps')
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch payout settings: ${error.message}`);
    }

    if (!data) {
      // Return defaults if no settings found
      return {
        basePayCents: 250,
        shareBps: 7000,
      };
    }

    return {
      basePayCents: data.driver_base_pay_cents == null ? 250 : Number(data.driver_base_pay_cents),
      shareBps: data.driver_delivery_fee_share_bps == null ? 7000 : Number(data.driver_delivery_fee_share_bps),
    };
  },

  /**
   * Save new payout settings
   */
  async saveSettings(settings: PayoutSettings): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase.rpc('set_active_driver_payout_settings', {
      p_base_pay_cents: settings.basePayCents,
      p_delivery_fee_share_bps: settings.shareBps,
    });

    if (error) {
      throw new Error(`Failed to save payout settings: ${error.message}`);
    }
    emitDriverOperationsChange({ area: 'payouts', action: 'settings_updated' });
  },
};







































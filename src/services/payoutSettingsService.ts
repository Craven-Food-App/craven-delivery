/**
 * Service for managing driver payout settings
 */
import { supabase } from '@/integrations/supabase/client';

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
      basePayCents: Number(data.driver_base_pay_cents) || 250,
      shareBps: Number(data.driver_delivery_fee_share_bps) || 7000,
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

    // Deactivate existing active row
    await supabase
      .from('driver_payout_settings')
      .update({ is_active: false })
      .eq('is_active', true);

    // Insert new active row
    const { error } = await supabase
      .from('driver_payout_settings')
      .insert({
        driver_base_pay_cents: settings.basePayCents,
        driver_delivery_fee_share_bps: settings.shareBps,
        is_active: true,
        updated_by: user.id,
      });

    if (error) {
      throw new Error(`Failed to save payout settings: ${error.message}`);
    }
  },
};































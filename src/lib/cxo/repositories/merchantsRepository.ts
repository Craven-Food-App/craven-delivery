import { supabase } from '@/integrations/supabase/client';
import { Merchant } from '@/types/cxo';

export const merchantsRepository = {
  async getAll(): Promise<Merchant[]> {
    const { data, error } = await supabase
      .from('merchants')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      // Table doesn't exist yet - migration needs to be run
      if (error.code === 'PGRST205') {
        console.warn('CXO Portal tables not found. Please run migration: 20250131000008_create_cxo_portal_schema.sql');
        return [];
      }
      console.error('Error fetching merchants:', error);
      return [];
    }

    return (data || []).map(this.mapMerchant);
  },

  async getAtRisk(): Promise<Merchant[]> {
    const { data, error } = await supabase
      .from('merchants')
      .select('*')
      .eq('is_at_risk', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching at-risk merchants:', error);
      return [];
    }

    return (data || []).map(this.mapMerchant);
  },

  async updateAtRisk(id: string, isAtRisk: boolean): Promise<boolean> {
    const { error } = await supabase
      .from('merchants')
      .update({ is_at_risk: isAtRisk })
      .eq('id', id);

    if (error) {
      console.error('Error updating merchant at-risk status:', error);
      return false;
    }

    return true;
  },

  mapMerchant(data: any): Merchant {
    return {
      id: data.id,
      name: data.name,
      address: data.address,
      zone: data.zone,
      status: data.status,
      avgPrepMinutes: data.avg_prep_minutes,
      rating: data.rating,
      isAtRisk: data.is_at_risk,
      createdAt: data.created_at,
    };
  },
};


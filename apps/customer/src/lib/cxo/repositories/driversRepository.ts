import { supabase } from '@/integrations/supabase/client';
import { Driver } from '@/types/cxo';

export const driversRepository = {
  async getAll(): Promise<Driver[]> {
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      // Table doesn't exist yet - migration needs to be run
      if (error.code === 'PGRST205') {
        console.warn('CXO Portal tables not found. Please run migration: 20250131000008_create_cxo_portal_schema.sql');
        return [];
      }
      console.error('Error fetching drivers:', error);
      return [];
    }

    return (data || []).map(this.mapDriver);
  },

  async getById(id: string): Promise<Driver | null> {
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching driver:', error);
      return null;
    }

    return data ? this.mapDriver(data) : null;
  },

  async getByStatus(status: 'active' | 'inactive' | 'suspended'): Promise<Driver[]> {
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('status', status)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching drivers by status:', error);
      return [];
    }

    return (data || []).map(this.mapDriver);
  },

  async getByOnlineState(onlineState: 'online' | 'offline'): Promise<Driver[]> {
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('online_state', onlineState)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching drivers by online state:', error);
      return [];
    }

    return (data || []).map(this.mapDriver);
  },

  mapDriver(data: any): Driver {
    return {
      id: data.id,
      name: data.name,
      phone: data.phone,
      status: data.status,
      onlineState: data.online_state,
      homeZone: data.home_zone,
      rating: data.rating,
      createdAt: data.created_at,
    };
  },
};


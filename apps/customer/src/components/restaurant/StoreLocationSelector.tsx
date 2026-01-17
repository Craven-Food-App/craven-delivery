import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Store, MapPin, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StoreLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  is_primary: boolean;
  is_active: boolean;
}

interface StoreLocationSelectorProps {
  selectedStoreId: string | null;
  onStoreChange: (storeId: string) => void;
  className?: string;
}

export default function StoreLocationSelector({ 
  selectedStoreId, 
  onStoreChange, 
  className = '' 
}: StoreLocationSelectorProps) {
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get restaurant ID
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!restaurant) return;

      // Fetch store locations
      const { data: storeData, error } = await supabase
        .from('store_locations')
        .select('id, name, address, city, state, is_primary, is_active')
        .eq('restaurant_id', restaurant.id)
        .eq('is_active', true)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;

      setStores(storeData || []);
      
      // Auto-select primary store if no store is selected
      if (!selectedStoreId && storeData && storeData.length > 0) {
        const primaryStore = storeData.find(store => store.is_primary);
        if (primaryStore) {
          onStoreChange(primaryStore.id);
        } else {
          onStoreChange(storeData[0].id);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stores:', error);
      toast({
        title: "Error",
        description: "Failed to fetch store locations",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const handleStoreChange = (storeId: string) => {
    onStoreChange(storeId);
  };

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Store className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-500">Loading stores...</span>
      </div>
    );
  }

  if (stores.length === 0) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Store className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-500">No store locations</span>
      </div>
    );
  }

  if (stores.length === 1) {
    const store = stores[0];
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Store className="w-4 h-4 text-red-500" />
        <span className="text-sm font-medium">{store.name}</span>
        {store.is_primary && (
          <Badge className="bg-red-500 text-white text-xs">Primary</Badge>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Store className="w-4 h-4 text-red-500" />
      <Select value={selectedStoreId || ''} onValueChange={handleStoreChange}>
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Select store location" />
        </SelectTrigger>
        <SelectContent>
          {stores.map((store) => (
            <SelectItem key={store.id} value={store.id}>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{store.name}</span>
                  {store.is_primary && (
                    <Badge className="bg-red-500 text-white text-xs">Primary</Badge>
                  )}
                </div>
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <MapPin className="w-3 h-3" />
                  <span>{store.city}, {store.state}</span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

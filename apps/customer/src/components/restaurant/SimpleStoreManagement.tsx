import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Store, MapPin, Phone, Mail, Plus, Edit, Trash2, CheckCircle, XCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SimpleStoreLocation {
  id: string;
  restaurant_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  created_at: string;
}

export default function SimpleStoreManagement() {
  const [stores, setStores] = useState<SimpleStoreLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddStore, setShowAddStore] = useState(false);
  const [newStore, setNewStore] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    email: ''
  });

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

      // Try to fetch from store_locations table first
      let { data: storeData, error } = await supabase
        .from('store_locations')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('created_at', { ascending: true });

      // If store_locations table doesn't exist, create a mock store from restaurant data
      if (error && error.code === '42P01') {
        console.log('store_locations table does not exist, creating mock store from restaurant data');
        const { data: restaurantData } = await supabase
          .from('restaurants')
          .select('*')
          .eq('id', restaurant.id)
          .single();

        if (restaurantData) {
          storeData = [{
            id: restaurant.id,
            restaurant_id: restaurant.id,
            name: `${restaurantData.name} - Main Location`,
            address: restaurantData.address || '',
            city: restaurantData.city || '',
            state: restaurantData.state || '',
            zip_code: restaurantData.zip_code || '',
            phone: restaurantData.phone || '',
            email: restaurantData.email || '',
            is_active: true,
            created_at: restaurantData.created_at || new Date().toISOString(),
            coordinates: { x: 0, y: 0 },
            delivery_radius_miles: 5,
            is_primary: true,
            manager_email: restaurantData.email || '',
            manager_name: '',
            manager_phone: restaurantData.phone || '',
            operating_hours: {},
            state_province: restaurantData.state || '',
            updated_at: new Date().toISOString()
          } as any];
        }
      }

      if (error && error.code !== '42P01') {
        throw error;
      }

      setStores(storeData || []);
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

  const handleAddStore = async () => {
    try {
      console.log('Starting to add store...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to add store locations",
          variant: "destructive"
        });
        return;
      }

      // Get restaurant ID
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!restaurant) {
        toast({
          title: "Error",
          description: "Restaurant not found. Please contact support.",
          variant: "destructive"
        });
        return;
      }

      console.log('Restaurant found:', restaurant.id);
      console.log('Store data to insert:', {
        restaurant_id: restaurant.id,
        ...newStore,
        is_active: true
      });

      // Try to insert into store_locations table
      let { data, error } = await supabase
        .from('store_locations')
        .insert({
          restaurant_id: restaurant.id,
          ...newStore,
          is_active: true
        })
        .select();

      // If store_locations table doesn't exist, show helpful message
      if (error && error.code === '42P01') {
        toast({
          title: "Database Setup Required",
          description: "Please run the APPLY_MULTI_STORE_SYSTEM.sql script in your Supabase SQL Editor to enable multi-store functionality.",
          variant: "destructive"
        });
        return;
      }

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('Successfully inserted store:', data);

      toast({
        title: "Success",
        description: "Store location added successfully"
      });

      setShowAddStore(false);
      setNewStore({
        name: '',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        phone: '',
        email: ''
      });
      fetchStores();
    } catch (error) {
      console.error('Error adding store:', error);
      toast({
        title: "Error",
        description: `Failed to add store location: ${error.message || 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading store locations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Store Locations</h2>
          <p className="text-gray-600">Manage your restaurant locations</p>
        </div>
        <Dialog open={showAddStore} onOpenChange={setShowAddStore}>
          <DialogTrigger asChild>
            <Button className="bg-red-500 hover:bg-red-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Store Location
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Store Location</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="store-name">Store Name</Label>
                <Input
                  id="store-name"
                  value={newStore.name}
                  onChange={(e) => setNewStore({ ...newStore, name: e.target.value })}
                  placeholder="e.g., Downtown Location"
                />
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={newStore.address}
                  onChange={(e) => setNewStore({ ...newStore, address: e.target.value })}
                  placeholder="123 Main Street"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={newStore.city}
                    onChange={(e) => setNewStore({ ...newStore, city: e.target.value })}
                    placeholder="City"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={newStore.state}
                    onChange={(e) => setNewStore({ ...newStore, state: e.target.value })}
                    placeholder="State"
                  />
                </div>
                <div>
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input
                    id="zip"
                    value={newStore.zip_code}
                    onChange={(e) => setNewStore({ ...newStore, zip_code: e.target.value })}
                    placeholder="12345"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newStore.phone}
                    onChange={(e) => setNewStore({ ...newStore, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newStore.email}
                    onChange={(e) => setNewStore({ ...newStore, email: e.target.value })}
                    placeholder="store@example.com"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowAddStore(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddStore} className="bg-red-500 hover:bg-red-600 text-white">
                  Add Store Location
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Store Locations */}
      <div className="grid gap-6">
        {stores.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Store className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Store Locations</h3>
              <p className="text-gray-600 mb-4">
                You haven't added any additional store locations yet. Add your first location to get started.
              </p>
              <Button 
                onClick={() => setShowAddStore(true)}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Store Location
              </Button>
            </CardContent>
          </Card>
        ) : (
          stores.map((store) => (
            <Card key={store.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <Store className="w-5 h-5 text-red-500" />
                      <CardTitle className="text-lg">{store.name}</CardTitle>
                      {store.is_active && (
                        <Badge className="bg-green-500 text-white">Active</Badge>
                      )}
                      {!store.is_active && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">
                        {store.address}, {store.city}, {store.state} {store.zip_code}
                      </span>
                    </div>
                    {store.phone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">{store.phone}</span>
                      </div>
                    )}
                    {store.email && (
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">{store.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

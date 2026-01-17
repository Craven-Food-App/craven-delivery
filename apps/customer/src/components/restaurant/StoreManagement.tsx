import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Store, MapPin, Phone, Mail, Clock, Users, Package, 
  Plus, Edit, Trash2, Settings, CheckCircle, XCircle,
  Building2, Navigation, Calendar, User, Star
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StoreLocation {
  id: string;
  restaurant_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone?: string;
  email?: string;
  manager_name?: string;
  manager_phone?: string;
  manager_email?: string;
  operating_hours: any;
  delivery_radius_miles: number;
  is_active: boolean;
  is_primary: boolean;
  coordinates?: { x: number; y: number };
  created_at: string;
  updated_at: string;
}

interface StoreEmployee {
  id: string;
  store_location_id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  hired_date: string;
  user_profile?: {
    full_name: string;
    email: string;
    phone: string;
  };
}

interface StoreInventory {
  id: string;
  store_location_id: string;
  menu_item_id: string;
  quantity_available: number;
  low_stock_threshold: number;
  is_available: boolean;
  menu_item?: {
    name: string;
    price_cents: number;
  };
}

export default function StoreManagement() {
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [employees, setEmployees] = useState<StoreEmployee[]>([]);
  const [inventory, setInventory] = useState<StoreInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddStore, setShowAddStore] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreLocation | null>(null);
  const [newStore, setNewStore] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    email: '',
    manager_name: '',
    manager_phone: '',
    manager_email: '',
    delivery_radius_miles: 5,
    is_primary: false,
    operating_hours: {
      monday: { open: '09:00', close: '22:00', closed: false },
      tuesday: { open: '09:00', close: '22:00', closed: false },
      wednesday: { open: '09:00', close: '22:00', closed: false },
      thursday: { open: '09:00', close: '22:00', closed: false },
      friday: { open: '09:00', close: '23:00', closed: false },
      saturday: { open: '09:00', close: '23:00', closed: false },
      sunday: { open: '10:00', close: '21:00', closed: false }
    }
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

      // Fetch store locations
      const { data: storeData, error } = await supabase
        .from('store_locations')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;

      setStores((storeData || []) as any);
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
        console.error('No user found');
        toast({
          title: "Error",
          description: "You must be logged in to add store locations",
          variant: "destructive"
        });
        return;
      }

      console.log('User found:', user.id);

      // Get restaurant ID
      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (restaurantError) {
        console.error('Error fetching restaurant:', restaurantError);
        toast({
          title: "Error",
          description: "Failed to fetch restaurant information",
          variant: "destructive"
        });
        return;
      }

      if (!restaurant) {
        console.error('No restaurant found for user');
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
        ...newStore
      });

      const { data, error } = await supabase
        .from('store_locations')
        .insert({
          restaurant_id: restaurant.id,
          ...newStore
        })
        .select();

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
        email: '',
        manager_name: '',
        manager_phone: '',
        manager_email: '',
        delivery_radius_miles: 5,
        is_primary: false,
        operating_hours: {
          monday: { open: '09:00', close: '22:00', closed: false },
          tuesday: { open: '09:00', close: '22:00', closed: false },
          wednesday: { open: '09:00', close: '22:00', closed: false },
          thursday: { open: '09:00', close: '22:00', closed: false },
          friday: { open: '09:00', close: '23:00', closed: false },
          saturday: { open: '09:00', close: '23:00', closed: false },
          sunday: { open: '10:00', close: '21:00', closed: false }
        }
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

  const handleUpdateStore = async (storeId: string, updates: Partial<StoreLocation>) => {
    try {
      const { error } = await supabase
        .from('store_locations')
        .update(updates)
        .eq('id', storeId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Store location updated successfully"
      });

      setEditingStore(null);
      fetchStores();
    } catch (error) {
      console.error('Error updating store:', error);
      toast({
        title: "Error",
        description: "Failed to update store location",
        variant: "destructive"
      });
    }
  };

  const handleDeleteStore = async (storeId: string) => {
    if (!confirm('Are you sure you want to delete this store location?')) return;

    try {
      const { error } = await supabase
        .from('store_locations')
        .delete()
        .eq('id', storeId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Store location deleted successfully"
      });

      fetchStores();
    } catch (error) {
      console.error('Error deleting store:', error);
      toast({
        title: "Error",
        description: "Failed to delete store location",
        variant: "destructive"
      });
    }
  };

  const toggleStoreStatus = async (storeId: string, isActive: boolean) => {
    await handleUpdateStore(storeId, { is_active: !isActive });
  };

  const setPrimaryStore = async (storeId: string) => {
    await handleUpdateStore(storeId, { is_primary: true });
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
          <h2 className="text-2xl font-bold text-gray-900">Store Management</h2>
          <p className="text-gray-600">Manage your restaurant locations and staff</p>
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
              <div className="grid grid-cols-2 gap-4">
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
                  <Label htmlFor="delivery-radius">Delivery Radius (miles)</Label>
                  <Input
                    id="delivery-radius"
                    type="number"
                    value={newStore.delivery_radius_miles}
                    onChange={(e) => setNewStore({ ...newStore, delivery_radius_miles: parseInt(e.target.value) })}
                  />
                </div>
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
                  <Label htmlFor="phone">Store Phone</Label>
                  <Input
                    id="phone"
                    value={newStore.phone}
                    onChange={(e) => setNewStore({ ...newStore, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Store Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newStore.email}
                    onChange={(e) => setNewStore({ ...newStore, email: e.target.value })}
                    placeholder="store@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="manager-name">Manager Name</Label>
                  <Input
                    id="manager-name"
                    value={newStore.manager_name}
                    onChange={(e) => setNewStore({ ...newStore, manager_name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="manager-phone">Manager Phone</Label>
                  <Input
                    id="manager-phone"
                    value={newStore.manager_phone}
                    onChange={(e) => setNewStore({ ...newStore, manager_phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="manager-email">Manager Email</Label>
                <Input
                  id="manager-email"
                  type="email"
                  value={newStore.manager_email}
                  onChange={(e) => setNewStore({ ...newStore, manager_email: e.target.value })}
                  placeholder="manager@example.com"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is-primary"
                  checked={newStore.is_primary}
                  onCheckedChange={(checked) => setNewStore({ ...newStore, is_primary: checked })}
                />
                <Label htmlFor="is-primary">Set as primary location</Label>
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
                      {store.is_primary && (
                        <Badge className="bg-red-500 text-white">Primary</Badge>
                      )}
                      {!store.is_active && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingStore(store)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleStoreStatus(store.id, store.is_active)}
                    >
                      {store.is_active ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                    </Button>
                    {!store.is_primary && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPrimaryStore(store.id)}
                      >
                        <Star className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteStore(store.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
                  <div className="space-y-2">
                    {store.manager_name && (
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">Manager: {store.manager_name}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <Navigation className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">Delivery radius: {store.delivery_radius_miles} miles</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">Added: {new Date(store.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Store Dialog */}
      {editingStore && (
        <Dialog open={!!editingStore} onOpenChange={() => setEditingStore(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Store Location</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-store-name">Store Name</Label>
                  <Input
                    id="edit-store-name"
                    value={editingStore.name}
                    onChange={(e) => setEditingStore({ ...editingStore, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-delivery-radius">Delivery Radius (miles)</Label>
                  <Input
                    id="edit-delivery-radius"
                    type="number"
                    value={editingStore.delivery_radius_miles}
                    onChange={(e) => setEditingStore({ ...editingStore, delivery_radius_miles: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-address">Address</Label>
                <Input
                  id="edit-address"
                  value={editingStore.address}
                  onChange={(e) => setEditingStore({ ...editingStore, address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="edit-city">City</Label>
                  <Input
                    id="edit-city"
                    value={editingStore.city}
                    onChange={(e) => setEditingStore({ ...editingStore, city: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-state">State</Label>
                  <Input
                    id="edit-state"
                    value={editingStore.state}
                    onChange={(e) => setEditingStore({ ...editingStore, state: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-zip">ZIP Code</Label>
                  <Input
                    id="edit-zip"
                    value={editingStore.zip_code}
                    onChange={(e) => setEditingStore({ ...editingStore, zip_code: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-phone">Store Phone</Label>
                  <Input
                    id="edit-phone"
                    value={editingStore.phone || ''}
                    onChange={(e) => setEditingStore({ ...editingStore, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-email">Store Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editingStore.email || ''}
                    onChange={(e) => setEditingStore({ ...editingStore, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-manager-name">Manager Name</Label>
                  <Input
                    id="edit-manager-name"
                    value={editingStore.manager_name || ''}
                    onChange={(e) => setEditingStore({ ...editingStore, manager_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-manager-phone">Manager Phone</Label>
                  <Input
                    id="edit-manager-phone"
                    value={editingStore.manager_phone || ''}
                    onChange={(e) => setEditingStore({ ...editingStore, manager_phone: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-manager-email">Manager Email</Label>
                <Input
                  id="edit-manager-email"
                  type="email"
                  value={editingStore.manager_email || ''}
                  onChange={(e) => setEditingStore({ ...editingStore, manager_email: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-is-primary"
                  checked={editingStore.is_primary}
                  onCheckedChange={(checked) => setEditingStore({ ...editingStore, is_primary: checked })}
                />
                <Label htmlFor="edit-is-primary">Set as primary location</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-is-active"
                  checked={editingStore.is_active}
                  onCheckedChange={(checked) => setEditingStore({ ...editingStore, is_active: checked })}
                />
                <Label htmlFor="edit-is-active">Active</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setEditingStore(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => handleUpdateStore(editingStore.id, editingStore)}
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                  Update Store Location
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

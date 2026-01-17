import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Store, MapPin, Phone, Mail, Plus, Building2, AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Restaurant {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string;
  is_active: boolean;
}

export default function BasicStoreManagement() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
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
    fetchRestaurant();
  }, []);

  const fetchRestaurant = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: restaurantData, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (error) throw error;

      setRestaurant(restaurantData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching restaurant:', error);
      toast({
        title: "Error",
        description: "Failed to fetch restaurant information",
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

      if (!restaurant) {
        toast({
          title: "Error",
          description: "Restaurant not found. Please contact support.",
          variant: "destructive"
        });
        return;
      }

      // For now, just show a message that this feature requires database setup
      toast({
        title: "Multi-Store Feature Setup Required",
        description: "To add multiple store locations, please run the APPLY_MULTI_STORE_SYSTEM.sql script in your Supabase SQL Editor first.",
        variant: "destructive"
      });

      setShowAddStore(false);
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
          <p className="mt-2 text-gray-600">Loading restaurant information...</p>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Restaurant Not Found</h3>
          <p className="text-gray-600">Please contact support to set up your restaurant.</p>
        </CardContent>
      </Card>
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
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <p className="text-yellow-800 text-sm">
                    <strong>Setup Required:</strong> To add multiple store locations, you need to run the database setup script first.
                  </p>
                </div>
              </div>
              
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
                  Setup Required
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Current Store Location */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Building2 className="w-5 h-5 text-red-500" />
            <CardTitle className="text-lg">{restaurant.name} - Main Location</CardTitle>
            <Badge className="bg-green-500 text-white">Active</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="text-sm">
                  {restaurant.address}, {restaurant.city}, {restaurant.state} {restaurant.zip_code}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-gray-500" />
                <span className="text-sm">{restaurant.phone}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-gray-500" />
                <span className="text-sm">{restaurant.email}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">Multi-Store Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-blue-800">
            <p>To enable multiple store locations for your restaurant:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>Go to your Supabase Dashboard</li>
              <li>Open the SQL Editor</li>
              <li>Copy and paste the contents of <code className="bg-blue-100 px-2 py-1 rounded">APPLY_MULTI_STORE_SYSTEM.sql</code></li>
              <li>Run the SQL script</li>
              <li>Refresh this page to access the full multi-store functionality</li>
            </ol>
            <p className="text-sm text-blue-600 mt-4">
              This will create all necessary database tables and policies for managing multiple store locations.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

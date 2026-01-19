import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Plus, Trash2, Check } from 'lucide-react';

interface DeliveryAddress {
  id: string;
  label: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  phone?: string;
  delivery_instructions?: string;
  is_default: boolean;
}

const DeliveryAddresses: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    name: '',
    street_address: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    instructions: '',
    is_default: false
  });

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/account');
        return;
      }

      const { data, error } = await supabase
        .from('delivery_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAddresses(data || []);
    } catch (error: any) {
      console.error('Error fetching addresses:', error);
      toast({
        title: "Error",
        description: "Failed to load delivery addresses",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addDeliveryAddress = async () => {
    if (!newAddress.name || !newAddress.street_address || !newAddress.city || !newAddress.state || !newAddress.zip_code) {
      toast({
        title: "Error",
        description: "Please fill in all required address fields",
        variant: "destructive"
      });
      return;
    }

    setUpdating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to add delivery addresses",
          variant: "destructive"
        });
        return;
      }

      const isDefault = newAddress.is_default || addresses.length === 0;

      if (isDefault) {
        await supabase
          .from('delivery_addresses')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }

      const { error } = await supabase
        .from('delivery_addresses')
        .insert({
          user_id: user.id,
          label: newAddress.name,
          street_address: newAddress.street_address,
          city: newAddress.city,
          state: newAddress.state,
          zip_code: newAddress.zip_code,
          phone: newAddress.phone || null,
          delivery_instructions: newAddress.instructions || null,
          is_default: isDefault
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Delivery address added successfully",
      });

      setShowAddForm(false);
      setNewAddress({
        name: '',
        street_address: '',
        city: '',
        state: '',
        zip_code: '',
        phone: '',
        instructions: '',
        is_default: false
      });
      await fetchAddresses();
    } catch (error: any) {
      console.error('Error adding delivery address:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add delivery address",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const setDefaultDeliveryAddress = async (addressId: string) => {
    setUpdating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('delivery_addresses')
        .update({ is_default: false })
        .eq('user_id', user.id);

      const { error } = await supabase
        .from('delivery_addresses')
        .update({ is_default: true })
        .eq('id', addressId);

      if (error) throw error;

      await fetchAddresses();
      
      toast({
        title: "Success",
        description: "Default delivery address updated"
      });
    } catch (error: any) {
      console.error('Error setting default address:', error);
      toast({
        title: "Error",
        description: "Failed to update default address",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const removeDeliveryAddress = async (addressId: string) => {
    if (!confirm('Are you sure you want to remove this delivery address?')) {
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('delivery_addresses')
        .delete()
        .eq('id', addressId);

      if (error) throw error;

      await fetchAddresses();
      
      toast({
        title: "Success",
        description: "Delivery address removed"
      });
    } catch (error: any) {
      console.error('Error removing delivery address:', error);
      toast({
        title: "Error",
        description: "Failed to remove delivery address",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/account')}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-gray-900">Delivery Addresses</h1>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 pb-32">
        {/* Add New Address Button */}
        {!showAddForm && (
          <Button
            onClick={() => setShowAddForm(true)}
            className="w-full mb-6 h-12 text-base bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add New Address
          </Button>
        )}

        {/* Add Address Form */}
        {showAddForm && (
          <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Add New Address</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowAddForm(false);
                  setNewAddress({
                    name: '',
                    street_address: '',
                    city: '',
                    state: '',
                    zip_code: '',
                    phone: '',
                    instructions: '',
                    is_default: false
                  });
                }}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="address_name" className="text-sm font-medium text-gray-700">
                  Address Name *
                </Label>
                <Input
                  id="address_name"
                  value={newAddress.name}
                  onChange={(e) => setNewAddress(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 h-12 text-base"
                  placeholder="e.g., Home, Work, Apartment"
                />
              </div>
              <div>
                <Label htmlFor="street_address" className="text-sm font-medium text-gray-700">
                  Street Address *
                </Label>
                <Input
                  id="street_address"
                  value={newAddress.street_address}
                  onChange={(e) => setNewAddress(prev => ({ ...prev, street_address: e.target.value }))}
                  className="mt-1 h-12 text-base"
                  placeholder="123 Main Street"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city" className="text-sm font-medium text-gray-700">City *</Label>
                  <Input
                    id="city"
                    value={newAddress.city}
                    onChange={(e) => setNewAddress(prev => ({ ...prev, city: e.target.value }))}
                    className="mt-1 h-12 text-base"
                    placeholder="City"
                  />
                </div>
                <div>
                  <Label htmlFor="state" className="text-sm font-medium text-gray-700">State *</Label>
                  <Input
                    id="state"
                    value={newAddress.state}
                    onChange={(e) => setNewAddress(prev => ({ ...prev, state: e.target.value }))}
                    className="mt-1 h-12 text-base"
                    placeholder="State"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="zip_code" className="text-sm font-medium text-gray-700">ZIP Code *</Label>
                <Input
                  id="zip_code"
                  value={newAddress.zip_code}
                  onChange={(e) => {
                    let value = e.target.value.replace(/\D/g, '').slice(0, 5);
                    setNewAddress(prev => ({ ...prev, zip_code: value }));
                  }}
                  className="mt-1 h-12 text-base"
                  placeholder="12345"
                  maxLength={5}
                />
              </div>
              <div>
                <Label htmlFor="address_phone" className="text-sm font-medium text-gray-700">
                  Phone Number (Optional)
                </Label>
                <Input
                  id="address_phone"
                  value={newAddress.phone}
                  onChange={(e) => {
                    let value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 10) {
                      setNewAddress(prev => ({ ...prev, phone: value }));
                    }
                  }}
                  className="mt-1 h-12 text-base"
                  placeholder="(555) 123-4567"
                  maxLength={10}
                />
              </div>
              <div>
                <Label htmlFor="delivery_instructions" className="text-sm font-medium text-gray-700">
                  Delivery Instructions (Optional)
                </Label>
                <Input
                  id="delivery_instructions"
                  value={newAddress.instructions}
                  onChange={(e) => setNewAddress(prev => ({ ...prev, instructions: e.target.value }))}
                  className="mt-1 h-12 text-base"
                  placeholder="e.g., Ring doorbell, Leave at door"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="address_is_default"
                  checked={newAddress.is_default}
                  onChange={(e) => setNewAddress(prev => ({ ...prev, is_default: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="address_is_default" className="text-sm text-gray-700">
                  Set as default delivery address
                </Label>
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewAddress({
                      name: '',
                      street_address: '',
                      city: '',
                      state: '',
                      zip_code: '',
                      phone: '',
                      instructions: '',
                      is_default: false
                    });
                  }}
                  variant="outline"
                  className="flex-1 h-12 text-base"
                  disabled={updating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={addDeliveryAddress}
                  className="flex-1 h-12 text-base bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                  disabled={updating}
                >
                  {updating ? 'Adding...' : 'Add Address'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Saved Addresses */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Saved Delivery Addresses</h2>
          
          {addresses.length === 0 ? (
            <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
              <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium mb-2">No delivery addresses saved</p>
              <p className="text-sm text-gray-500">Add a delivery address to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {addresses.map((address) => (
                <div key={address.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-900">{address.label || 'Address'}</p>
                          {address.is_default && (
                            <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs">
                              Default
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {address.street_address}
                        </p>
                        <p className="text-sm text-gray-600">
                          {address.city}, {address.state} {address.zip_code}
                        </p>
                        {address.delivery_instructions && (
                          <p className="text-xs text-gray-500 mt-1">
                            Note: {address.delivery_instructions}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!address.is_default && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDefaultDeliveryAddress(address.id)}
                          disabled={updating}
                          className="h-9"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Set Default
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeDeliveryAddress(address.id)}
                        disabled={updating}
                        className="h-9 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeliveryAddresses;


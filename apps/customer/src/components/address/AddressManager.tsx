import React, { useState, useEffect } from 'react';
import { Plus, MapPin, Edit, Trash2, Home, Building, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AddressAutocomplete } from '@/components/common/AddressAutocomplete';

interface DeliveryAddress {
  id: string;
  label: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  is_default: boolean;
}

interface AddressManagerProps {
  userId: string;
  onAddressSelect?: (address: DeliveryAddress) => void;
  selectedAddressId?: string;
}

const AddressManager: React.FC<AddressManagerProps> = ({ 
  userId, 
  onAddressSelect, 
  selectedAddressId 
}) => {
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingAddress, setEditingAddress] = useState<DeliveryAddress | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    label: '',
    street_address: '',
    city: '',
    state: '',
    zip_code: ''
  });

  useEffect(() => {
    fetchAddresses();
  }, [userId]);

  const fetchAddresses = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_addresses')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false });

      if (error) throw error;
      setAddresses(data || []);
    } catch (error) {
      console.error('Error fetching addresses:', error);
      toast({
        title: "Error",
        description: "Failed to load addresses",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (addresses.length >= 3 && !editingAddress) {
      toast({
        title: "Limit Reached",
        description: "You can only have up to 3 delivery addresses",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Attempting to save address for user:', userId);
      console.log('Form data:', formData);
      
      const addressData = {
        user_id: userId,
        ...formData,
        is_default: addresses.length === 0 // First address is default
      };

      console.log('Address data to save:', addressData);

      if (editingAddress) {
        const { error } = await supabase
          .from('delivery_addresses')
          .update(addressData)
          .eq('id', editingAddress.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('delivery_addresses')
          .insert(addressData);
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: editingAddress ? "Address updated" : "Address added"
      });

      resetForm();
      fetchAddresses();
    } catch (error) {
      console.error('Error saving address:', error);
      toast({
        title: "Error",
        description: "Failed to save address",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (addressId: string) => {
    try {
      const { error } = await supabase
        .from('delivery_addresses')
        .delete()
        .eq('id', addressId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Address deleted"
      });

      fetchAddresses();
    } catch (error) {
      console.error('Error deleting address:', error);
      toast({
        title: "Error",
        description: "Failed to delete address",
        variant: "destructive"
      });
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      // First, remove default from all addresses
      await supabase
        .from('delivery_addresses')
        .update({ is_default: false })
        .eq('user_id', userId);

      // Then set the selected address as default
      const { error } = await supabase
        .from('delivery_addresses')
        .update({ is_default: true })
        .eq('id', addressId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Default address updated"
      });

      fetchAddresses();
    } catch (error) {
      console.error('Error setting default address:', error);
      toast({
        title: "Error",
        description: "Failed to update default address",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      label: '',
      street_address: '',
      city: '',
      state: '',
      zip_code: ''
    });
    setEditingAddress(null);
    setIsAddingAddress(false);
  };

  const getAddressIcon = (label: string) => {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes('home')) return <Home className="h-4 w-4" />;
    if (lowerLabel.includes('work') || lowerLabel.includes('office')) return <Building className="h-4 w-4" />;
    return <MapPin className="h-4 w-4" />;
  };

  if (loading) {
    return <div className="animate-pulse">Loading addresses...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Delivery Addresses</h3>
        {addresses.length < 3 && (
          <Dialog open={isAddingAddress} onOpenChange={setIsAddingAddress}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Address
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Delivery Address</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="label">Address Label</Label>
                  <Select value={formData.label} onValueChange={(value) => setFormData(prev => ({ ...prev, label: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select address type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Home">Home</SelectItem>
                      <SelectItem value="Work">Work</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="street_address">Street Address</Label>
                  <AddressAutocomplete
                    value={formData.street_address}
                    onChange={(value) => setFormData(prev => ({ ...prev, street_address: value }))}
                    onAddressParsed={(parsed) => {
                      setFormData(prev => ({
                        ...prev,
                        street_address: parsed.street,
                        city: parsed.city,
                        state: parsed.state,
                        zip_code: parsed.zipCode
                      }));
                    }}
                    placeholder="123 Main St, City, State 12345"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="City"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                      placeholder="State"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="zip_code">ZIP Code</Label>
                  <Input
                    id="zip_code"
                    value={formData.zip_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, zip_code: e.target.value }))}
                    placeholder="12345"
                    required
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    Add Address
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {addresses.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No delivery addresses yet</p>
              <p className="text-sm">Add your first address to start ordering</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {addresses.map((address) => (
            <Card 
              key={address.id} 
              className={`cursor-pointer transition-colors ${
                selectedAddressId === address.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => onAddressSelect?.(address)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getAddressIcon(address.label)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{address.label}</span>
                        {address.is_default && (
                          <Badge variant="secondary" className="text-xs">Default</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {address.street_address}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {address.city}, {address.state} {address.zip_code}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!address.is_default && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetDefault(address.id);
                        }}
                        className="text-xs"
                      >
                        Set Default
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingAddress(address);
                        setFormData({
                          label: address.label,
                          street_address: address.street_address,
                          city: address.city,
                          state: address.state,
                          zip_code: address.zip_code
                        });
                        setIsAddingAddress(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(address.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isAddingAddress && editingAddress !== null} onOpenChange={(open) => {
        if (!open) resetForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Address</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="label">Address Label</Label>
              <Select value={formData.label} onValueChange={(value) => setFormData(prev => ({ ...prev, label: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select address type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Home">Home</SelectItem>
                  <SelectItem value="Work">Work</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="street_address">Street Address</Label>
              <AddressAutocomplete
                value={formData.street_address}
                onChange={(value) => setFormData(prev => ({ ...prev, street_address: value }))}
                onAddressParsed={(parsed) => {
                  setFormData(prev => ({
                    ...prev,
                    street_address: parsed.street,
                    city: parsed.city,
                    state: parsed.state,
                    zip_code: parsed.zipCode
                  }));
                }}
                placeholder="123 Main St, City, State 12345"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="City"
                  required
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                  placeholder="State"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="zip_code">ZIP Code</Label>
              <Input
                id="zip_code"
                value={formData.zip_code}
                onChange={(e) => setFormData(prev => ({ ...prev, zip_code: e.target.value }))}
                placeholder="12345"
                required
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                Update Address
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AddressManager;
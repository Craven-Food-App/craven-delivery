import React, { useState, useEffect } from 'react';
import { MapPin, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import AddressManager from './AddressManager';

interface DeliveryAddress {
  id: string;
  label: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  is_default: boolean;
}

interface AddressSelectorProps {
  userId: string;
  onAddressChange?: (address: DeliveryAddress | null) => void;
}

const AddressSelector: React.FC<AddressSelectorProps> = ({ userId, onAddressChange }) => {
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<DeliveryAddress | null>(null);
  const [showAddressManager, setShowAddressManager] = useState(false);
  const [loading, setLoading] = useState(true);

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
      
      const addressList = data || [];
      setAddresses(addressList);
      
      // Auto-select default address or first address
      const defaultAddress = addressList.find(addr => addr.is_default) || addressList[0];
      if (defaultAddress) {
        setSelectedAddress(defaultAddress);
        onAddressChange?.(defaultAddress);
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddressSelect = (address: DeliveryAddress) => {
    setSelectedAddress(address);
    onAddressChange?.(address);
  };

  if (loading) {
    return <div className="animate-pulse text-sm">Loading...</div>;
  }

  if (addresses.length === 0) {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => setShowAddressManager(true)}
        >
          <MapPin className="h-4 w-4" />
          <span className="text-sm">Add Address</span>
        </Button>

        <Dialog open={showAddressManager} onOpenChange={setShowAddressManager}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Manage Delivery Addresses</DialogTitle>
            </DialogHeader>
            <AddressManager 
              userId={userId} 
              onAddressSelect={() => {
                fetchAddresses();
                setShowAddressManager(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="flex items-center gap-2 max-w-xs">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <div className="text-left overflow-hidden">
              <div className="text-xs text-muted-foreground">Delivering to</div>
              <div className="text-xs font-medium truncate">
                {selectedAddress ? `${selectedAddress.street_address}, ${selectedAddress.city}` : 'Select Address'}
              </div>
            </div>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          {addresses.map((address) => (
            <DropdownMenuItem
              key={address.id}
              onClick={() => handleAddressSelect(address)}
              className="p-3 cursor-pointer"
            >
              <div className="flex items-start gap-3 w-full">
                <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{address.label}</span>
                    {address.is_default && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Default</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {address.street_address}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {address.city}, {address.state} {address.zip_code}
                  </p>
                </div>
                {selectedAddress?.id === address.id && (
                  <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                )}
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem
            onClick={() => setShowAddressManager(true)}
            className="p-3 cursor-pointer border-t mt-2"
          >
            <div className="flex items-center gap-3 w-full text-primary">
              <MapPin className="h-4 w-4" />
              <span>Manage Addresses</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showAddressManager} onOpenChange={setShowAddressManager}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Delivery Addresses</DialogTitle>
          </DialogHeader>
          <AddressManager 
            userId={userId} 
            selectedAddressId={selectedAddress?.id}
            onAddressSelect={(address) => {
              handleAddressSelect(address);
              fetchAddresses();
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AddressSelector;
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Address {
  label: string;
  name: string;
  address: string;
  apt_suite: string;
  city: string;
  state: string;
  zip: string;
}

interface AddressSelectorProps {
  onAddressSelect: (address: Partial<Address>) => void;
  initialAddress: any;
}

export const AddressSelector: React.FC<AddressSelectorProps> = ({ onAddressSelect, initialAddress }) => {
  const { toast } = useToast();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAddresses = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('delivery_addresses')
          .select('*')
          .eq('user_id', user.id)
          .order('is_default', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          setAddresses(data);
          const defaultAddr = data.find((a: any) => a.is_default) || data[0];
          setSelectedAddress(defaultAddr);
          
          // Format and pass to parent
          onAddressSelect({
            name: initialAddress?.name || '',
            address: defaultAddr.street_address,
            apt_suite: defaultAddr.apt_suite || '',
            city: defaultAddr.city,
            state: defaultAddr.state,
            zip: defaultAddr.zip_code,
          });
        }
      } catch (error) {
        console.error('Error loading addresses:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAddresses();
  }, []);

  const handleAddressSelect = (address: any) => {
    setSelectedAddress(address);
    onAddressSelect({
      name: initialAddress?.name || '',
      address: address.street_address,
      apt_suite: address.apt_suite || '',
      city: address.city,
      state: address.state,
      zip: address.zip_code,
    });
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading addresses...</div>;
  }

  if (addresses.length === 0) {
    return (
      <div className="p-4 border rounded-lg bg-yellow-50">
        <p className="text-sm text-gray-600 mb-2">No delivery address found.</p>
        <p className="text-sm text-gray-500">Please add a delivery address in your account settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {addresses.map((addr) => (
        <div
          key={addr.id}
          onClick={() => handleAddressSelect(addr)}
          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
            selectedAddress?.id === addr.id
              ? 'bg-orange-50 border-orange-500'
              : 'bg-gray-50 hover:bg-gray-100'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium text-sm">{addr.label || 'Address'}</p>
              <p className="text-sm text-gray-600 mt-1">
                {addr.street_address}
                {addr.apt_suite && `, ${addr.apt_suite}`}
              </p>
              <p className="text-sm text-gray-600">
                {addr.city}, {addr.state} {addr.zip_code}
              </p>
            </div>
            {addr.is_default && (
              <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded">Default</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

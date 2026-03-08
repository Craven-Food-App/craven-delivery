import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { safeLocalStorage } from '@/utils/safeStorage';

export interface DeliveryAddressRecord {
  id?: string;
  label?: string;
  street_address: string;
  apt_suite?: string;
  city: string;
  state: string;
  zip_code: string;
  is_default?: boolean;
}

interface DeliveryAddressContextType {
  selectedAddress: DeliveryAddressRecord | null;
  setSelectedAddress: (address: DeliveryAddressRecord | null) => void;
  selectedAddressDisplay: string;
}

const STORAGE_KEY = 'selected_delivery_address';

const DeliveryAddressContext = createContext<DeliveryAddressContextType | undefined>(undefined);

export const DeliveryAddressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedAddress, setSelectedAddressState] = useState<DeliveryAddressRecord | null>(null);

  useEffect(() => {
    try {
      const raw = safeLocalStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DeliveryAddressRecord;
        if (parsed?.street_address && parsed?.city && parsed?.state && parsed?.zip_code) {
          setSelectedAddressState(parsed);
        }
      }
    } catch (_) {}
  }, []);

  const setSelectedAddress = useCallback((address: DeliveryAddressRecord | null) => {
    setSelectedAddressState(address);
    try {
      if (address) {
        safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(address));
      } else {
        safeLocalStorage.removeItem(STORAGE_KEY);
      }
    } catch (_) {}
  }, []);

  const selectedAddressDisplay = selectedAddress
    ? `${selectedAddress.street_address}, ${selectedAddress.city}`
    : '';

  return (
    <DeliveryAddressContext.Provider value={{ selectedAddress, setSelectedAddress, selectedAddressDisplay }}>
      {children}
    </DeliveryAddressContext.Provider>
  );
};

export const useDeliveryAddress = () => {
  const context = useContext(DeliveryAddressContext);
  if (context === undefined) {
    throw new Error('useDeliveryAddress must be used within DeliveryAddressProvider');
  }
  return context;
};

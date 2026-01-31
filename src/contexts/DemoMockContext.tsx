import { createContext, useContext, ReactNode } from 'react';
import {
  mockRestaurants,
  mockMenuItems,
  mockCustomerOrders,
  mockMerchantOrders,
  mockMerchantAnalytics,
  mockDriverDeliveries,
  mockDriverStats,
} from '@/lib/mockDemoData';

interface DemoMockUser {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
}

interface DemoMockContextType {
  isMockMode: boolean;
  mockUser: DemoMockUser;
  mockRestaurants: typeof mockRestaurants;
  mockMenuItems: typeof mockMenuItems;
  mockCustomerOrders: typeof mockCustomerOrders;
  mockMerchantOrders: typeof mockMerchantOrders;
  mockMerchantAnalytics: typeof mockMerchantAnalytics;
  mockDriverDeliveries: typeof mockDriverDeliveries;
  mockDriverStats: typeof mockDriverStats;
  getMockData: (table: string, filters?: any) => any;
}

const DemoMockContext = createContext<DemoMockContextType | null>(null);

const demoMockUser: DemoMockUser = {
  id: 'demo-user-12345',
  email: 'demo@cravenusa.com',
  full_name: 'Demo User',
  phone: '+1 (555) 123-4567',
  avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Demo',
};

export function DemoMockProvider({ children }: { children: ReactNode }) {
  const getMockData = (table: string, filters?: any) => {
    // Map Supabase table names to mock data
    const mockDataMap: Record<string, any> = {
      restaurants: mockRestaurants,
      menu_items: Object.values(mockMenuItems).flat(),
      customer_orders: mockCustomerOrders,
      merchant_orders: mockMerchantOrders,
      deliveries: mockDriverDeliveries,
      user_profiles: [
        {
          ...demoMockUser,
          user_id: demoMockUser.id,
        },
      ],
      restaurant_profiles: [
        {
          id: 'demo-restaurant-1',
          user_id: demoMockUser.id,
          name: 'Bella Italia',
          restaurant_type: 'full_service',
          cuisine_type: 'Italian',
          phone: '+1 (555) 987-6543',
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          zip: '10001',
          status: 'active',
          is_open: true,
          rating: 4.8,
          total_orders: 1250,
          created_at: '2024-01-01T00:00:00Z',
        },
      ],
    };

    return mockDataMap[table] || [];
  };

  const value: DemoMockContextType = {
    isMockMode: true,
    mockUser: demoMockUser,
    mockRestaurants,
    mockMenuItems,
    mockCustomerOrders,
    mockMerchantOrders,
    mockMerchantAnalytics,
    mockDriverDeliveries,
    mockDriverStats,
    getMockData,
  };

  return (
    <DemoMockContext.Provider value={value}>
      {children}
    </DemoMockContext.Provider>
  );
}

export function useDemoMock() {
  const context = useContext(DemoMockContext);
  if (!context) {
    throw new Error('useDemoMock must be used within DemoMockProvider');
  }
  return context;
}

// Hook to check if we're in demo mode
export function useIsDemoMode() {
  const context = useContext(DemoMockContext);
  return context?.isMockMode ?? false;
}


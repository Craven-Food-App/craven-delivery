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

// Demo User for Customer
const demoMockUser: DemoMockUser = {
  id: 'demo-user-12345',
  email: 'demo@cravenusa.com',
  full_name: 'Demo User',
  phone: '+1 (555) 123-4567',
  avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Demo',
};

// Demo User for Merchant
const demoMerchantUser: DemoMockUser = {
  id: 'demo-merchant-12345',
  email: 'merchant.demo@cravenusa.com',
  full_name: 'Demo Merchant',
  phone: '+1 (555) 987-6543',
  avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Merchant',
};

// Demo User for Driver
const demoDriverUser: DemoMockUser = {
  id: 'demo-driver-12345',
  email: 'driver.demo@cravenusa.com',
  full_name: 'Demo Driver',
  phone: '+1 (555) 555-1234',
  avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Driver',
};

export function DemoMockProvider({ children }: { children: ReactNode }) {
  const getMockData = (table: string, filters?: any) => {
    // Determine which user based on URL path
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    let currentUser = demoMockUser;
    if (path.includes('/merchant')) {
      currentUser = demoMerchantUser;
    } else if (path.includes('/driver')) {
      currentUser = demoDriverUser;
    }

    // Map Supabase table names to mock data
    const mockDataMap: Record<string, any> = {
      restaurants: mockRestaurants,
      menu_items: Object.values(mockMenuItems).flat(),
      customer_orders: mockCustomerOrders,
      merchant_orders: mockMerchantOrders,
      deliveries: mockDriverDeliveries,
      user_profiles: [
        {
          ...currentUser,
          user_id: currentUser.id,
        },
      ],
      restaurant_profiles: [
        {
          id: 'demo-restaurant-1',
          user_id: demoMerchantUser.id,
          name: 'Bella Italia Trattoria',
          restaurant_type: 'full_service',
          cuisine_type: 'Italian',
          description: 'Authentic Italian cuisine with fresh ingredients and traditional recipes passed down through generations.',
          phone: '+1 (555) 987-6543',
          email: 'contact@bellaitalia.com',
          address: '123 Main Street',
          address_line_2: 'Suite 100',
          city: 'New York',
          state: 'NY',
          zip: '10001',
          country: 'USA',
          status: 'active',
          is_open: true,
          is_accepting_orders: true,
          rating: 4.8,
          total_orders: 1250,
          total_reviews: 523,
          logo_url: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400',
          header_image_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200',
          banner_image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200',
          opening_hours: {
            monday: { open: '11:00', close: '22:00' },
            tuesday: { open: '11:00', close: '22:00' },
            wednesday: { open: '11:00', close: '22:00' },
            thursday: { open: '11:00', close: '22:00' },
            friday: { open: '11:00', close: '23:00' },
            saturday: { open: '10:00', close: '23:00' },
            sunday: { open: '10:00', close: '21:00' },
          },
          delivery_fee: 3.99,
          minimum_order: 15.00,
          estimated_delivery_time: 30,
          accepts_cash: true,
          accepts_card: true,
          cuisines: ['Italian', 'Mediterranean', 'Pizza', 'Pasta'],
          dietary_options: ['Vegetarian', 'Gluten-Free Options', 'Vegan Options'],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: new Date().toISOString(),
        },
      ],
      driver_profiles: [
        {
          id: 'demo-driver-profile-1',
          user_id: demoDriverUser.id,
          first_name: 'Demo',
          last_name: 'Driver',
          phone: '+1 (555) 555-1234',
          email: 'driver.demo@cravenusa.com',
          vehicle_type: 'car',
          vehicle_make: 'Toyota',
          vehicle_model: 'Camry',
          vehicle_year: '2022',
          vehicle_color: 'Silver',
          license_plate: 'DEMO123',
          license_number: 'D1234567',
          license_state: 'CA',
          insurance_provider: 'State Farm',
          insurance_policy: 'SF-123456789',
          status: 'active',
          is_online: true,
          is_available: true,
          current_location: {
            latitude: 37.7749,
            longitude: -122.4194,
            city: 'San Francisco',
            state: 'CA',
          },
          rating: 4.9,
          total_deliveries: 1247,
          completed_deliveries: 1210,
          acceptance_rate: 98,
          completion_rate: 97,
          total_earnings: 24850.50,
          current_balance: 127.50,
          profile_photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Driver',
          background_check_status: 'approved',
          background_check_date: '2024-01-01T00:00:00Z',
          onboarding_completed: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: new Date().toISOString(),
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


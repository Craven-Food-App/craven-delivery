// Demo Supabase Client Wrapper
// This wraps the real Supabase client and intercepts calls to return mock data in demo mode

import { supabase as realSupabase } from '@/integrations/supabase/client';
import {
  mockRestaurants,
  mockMenuItems,
  mockCustomerOrders,
  mockMerchantOrders,
  mockMerchantAnalytics,
  mockDriverDeliveries,
  mockDriverStats,
  mockActiveDelivery,
} from './mockDemoData';

// Determine which demo user based on URL
function getDemoUser() {
  if (typeof window === 'undefined') {
    return {
      id: 'demo-user-12345',
      email: 'demo@cravenusa.com',
      app_metadata: {},
      user_metadata: { full_name: 'Demo User' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };
  }

  const path = window.location.pathname;
  
  if (path.includes('/merchant')) {
    return {
      id: 'demo-merchant-12345',
      email: 'merchant.demo@cravenusa.com',
      app_metadata: {},
      user_metadata: { full_name: 'Demo Merchant' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };
  }
  
  if (path.includes('/driver')) {
    return {
      id: 'demo-driver-12345',
      email: 'driver.demo@cravenusa.com',
      app_metadata: {},
      user_metadata: { full_name: 'Demo Driver' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };
  }

  return {
    id: 'demo-user-12345',
    email: 'demo@cravenusa.com',
    app_metadata: {},
    user_metadata: { full_name: 'Demo User' },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  };
}

const demoUser = getDemoUser();

const demoSession = {
  access_token: 'demo-token',
  refresh_token: 'demo-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: demoUser,
};

// Check if we're in demo mode
export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.pathname.startsWith('/investor-demo/');
}

// Create a demo Supabase client that returns mock data
export function createDemoSupabaseClient() {
  if (!isDemoMode()) {
    return realSupabase;
  }

  // Mock the Supabase client API
  return {
    auth: {
      getUser: async () => {
        const user = getDemoUser();
        return { data: { user }, error: null };
      },
      getSession: async () => {
        const user = getDemoUser();
        const session = { ...demoSession, user };
        return { data: { session }, error: null };
      },
      signOut: async () => {
        console.log('[Demo Mode] Sign out called (no-op in demo)');
        return { error: null };
      },
      signInWithPassword: async () => ({
        data: { user: demoUser, session: demoSession },
        error: null,
      }),
      onAuthStateChange: (callback: any) => {
        // Immediately call with signed in state
        callback('SIGNED_IN', demoSession);
        return {
          data: { subscription: { unsubscribe: () => {} } },
        };
      },
    },
    from: (table: string) => {
      const getMockData = () => {
        const user = getDemoUser();
        
        const mockDataMap: Record<string, any> = {
          restaurants: mockRestaurants,
          restaurant_profiles: [
            {
              id: 'demo-restaurant-1',
              user_id: 'demo-merchant-12345',
              name: 'Bella Italia Trattoria',
              restaurant_type: 'full_service',
              cuisine_type: 'Italian',
              description: 'Authentic Italian cuisine with fresh ingredients and traditional recipes.',
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
          menu_items: Object.values(mockMenuItems).flat().map(item => ({
            ...item,
            restaurant_id: 'demo-restaurant-1',
            is_available: true,
            created_at: '2024-01-01T00:00:00Z',
          })),
          customer_orders: mockCustomerOrders,
          merchant_orders: mockMerchantOrders,
          orders: mockMerchantOrders,
          deliveries: mockDriverDeliveries,
          delivery_assignments: mockDriverDeliveries.map(d => ({
            id: d.id,
            order_id: d.id,
            driver_id: 'demo-driver-12345',
            status: d.status,
            pickup_address: d.restaurantAddress,
            dropoff_address: d.customerAddress,
            distance_mi: d.distance,
            earnings_cents: Math.round(d.earnings * 100),
            created_at: new Date().toISOString(),
          })),
          active_deliveries: [mockActiveDelivery],
          user_profiles: [
            {
              id: 'demo-profile-1',
              user_id: user.id,
              full_name: user.user_metadata.full_name,
              email: user.email,
              phone: '+1 (555) 123-4567',
              avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Demo',
              created_at: '2024-01-01T00:00:00Z',
            },
          ],
          driver_profiles: [
            {
              id: 'demo-driver-profile-1',
              user_id: 'demo-driver-12345',
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
                latitude: 40.7589,
                longitude: -73.9851,
                city: 'New York',
                state: 'NY',
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
          driver_earnings: [
            {
              id: 'earnings-1',
              driver_id: 'demo-driver-12345',
              date: new Date().toISOString().split('T')[0],
              total_earnings: mockDriverStats.todayEarnings,
              total_deliveries: mockDriverStats.todayDeliveries,
              online_time_minutes: 263,
              created_at: new Date().toISOString(),
            },
          ],
        };

        return mockDataMap[table] || [];
      };

      return {
        select: (columns?: string) => {
          const data = getMockData();
          
          return {
            eq: (column: string, value: any) => ({
              single: async () => {
                const filtered = data.find((item: any) => item[column] === value);
                return { data: filtered || data[0], error: null };
              },
              maybeSingle: async () => {
                const filtered = data.find((item: any) => item[column] === value);
                return { data: filtered || null, error: null };
              },
              order: (column: string, options?: any) => ({
                limit: (count: number) => ({
                  then: (resolve: any) => resolve({ data, error: null }),
                }),
              }),
              then: (resolve: any) => resolve({ data, error: null }),
            }),
            order: (column: string, options?: any) => ({
              limit: (count: number) => ({
                then: (resolve: any) => resolve({ data: data.slice(0, count), error: null }),
              }),
              then: (resolve: any) => resolve({ data, error: null }),
            }),
            limit: (count: number) => ({
              single: async () => ({ data: data[0], error: null }),
              then: (resolve: any) => resolve({ data: data.slice(0, count), error: null }),
            }),
            single: async () => ({ data: data[0], error: null }),
            maybeSingle: async () => ({ data: data[0] || null, error: null }),
            then: (resolve: any) => resolve({ data, error: null }),
          };
        },
        insert: async (values: any) => {
          console.log('[Demo Mode] Insert called (no-op in demo):', values);
          return { data: values, error: null };
        },
        update: async (values: any) => {
          console.log('[Demo Mode] Update called (no-op in demo):', values);
          return { data: values, error: null };
        },
        upsert: async (values: any) => {
          console.log('[Demo Mode] Upsert called (no-op in demo):', values);
          return { data: values, error: null };
        },
        delete: async () => {
          console.log('[Demo Mode] Delete called (no-op in demo)');
          return { data: null, error: null };
        },
      };
    },
    rpc: async (fn: string, params?: any) => {
      console.log('[Demo Mode] RPC called (no-op in demo):', fn, params);
      
      // Return appropriate mock data for common RPC calls
      const mockRpcResponses: Record<string, any> = {
        get_restaurant_analytics: mockMerchantAnalytics,
        get_driver_stats: mockDriverStats,
      };
      
      return { data: mockRpcResponses[fn] || null, error: null };
    },
    storage: {
      from: (bucket: string) => ({
        upload: async () => {
          console.log('[Demo Mode] Storage upload (no-op in demo)');
          return { data: { path: 'demo-path' }, error: null };
        },
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://demo-storage.com/${path}` },
        }),
      }),
    },
    functions: {
      invoke: async (name: string, options?: any) => {
        console.log('[Demo Mode] Function invoke (no-op in demo):', name, options);
        return { data: null, error: null };
      },
    },
  };
}

// Export a demo-aware Supabase client
export const demoSupabase = createDemoSupabaseClient() as any;


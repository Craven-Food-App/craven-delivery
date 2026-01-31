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
} from './mockDemoData';

const demoUser = {
  id: 'demo-user-12345',
  email: 'demo@cravenusa.com',
  app_metadata: {},
  user_metadata: {
    full_name: 'Demo User',
  },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
};

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
      getUser: async () => ({
        data: { user: demoUser },
        error: null,
      }),
      getSession: async () => ({
        data: { session: demoSession },
        error: null,
      }),
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
        const mockDataMap: Record<string, any> = {
          restaurants: mockRestaurants,
          restaurant_profiles: [
            {
              id: 'demo-restaurant-1',
              user_id: demoUser.id,
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
              logo_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200',
            },
          ],
          menu_items: Object.values(mockMenuItems).flat(),
          customer_orders: mockCustomerOrders,
          merchant_orders: mockMerchantOrders,
          deliveries: mockDriverDeliveries,
          user_profiles: [
            {
              id: 'demo-profile-1',
              user_id: demoUser.id,
              full_name: 'Demo User',
              email: 'demo@cravenusa.com',
              phone: '+1 (555) 123-4567',
              avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Demo',
              created_at: '2024-01-01T00:00:00Z',
            },
          ],
          orders: mockCustomerOrders,
          driver_profiles: [
            {
              id: 'demo-driver-1',
              user_id: demoUser.id,
              first_name: 'Demo',
              last_name: 'Driver',
              phone: '+1 (555) 123-4567',
              vehicle_type: 'car',
              vehicle_make: 'Toyota',
              vehicle_model: 'Camry',
              vehicle_year: '2022',
              license_plate: 'DEMO123',
              status: 'active',
              is_online: true,
              rating: 4.9,
              total_deliveries: 1247,
              created_at: '2024-01-01T00:00:00Z',
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


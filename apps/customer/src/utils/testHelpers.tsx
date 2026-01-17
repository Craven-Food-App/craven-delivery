// @ts-nocheck
// Testing utilities for production readiness

import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/ThemeProvider';

// Mock Supabase client for testing
export const mockSupabase = {
  auth: {
    getUser: jest.fn(),
    getSession: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } }))
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        order: jest.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      order: jest.fn(() => Promise.resolve({ data: [], error: null }))
    })),
    insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
    update: jest.fn(() => Promise.resolve({ data: null, error: null })),
    upsert: jest.fn(() => Promise.resolve({ data: null, error: null })),
    delete: jest.fn(() => Promise.resolve({ data: null, error: null }))
  })),
  channel: jest.fn(() => ({
    subscribe: jest.fn(),
    send: jest.fn()
  })),
  functions: {
    invoke: jest.fn(() => Promise.resolve({ data: null, error: null }))
  }
};

// Mock geolocation for testing
export const mockGeolocation = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn()
};

// Mock navigator for testing
export const mockNavigator = {
  geolocation: mockGeolocation,
  onLine: true,
  connection: {
    effectiveType: '4g',
    downlink: 10,
    rtt: 50
  }
};

// Custom render function with providers
export const renderWithProviders = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );

  return render(ui, { wrapper: Wrapper, ...options });
};

// Mock data generators
export const generateMockOrder = (overrides = {}) => ({
  assignment_id: 'test-assignment-123',
  restaurant_name: 'Test Restaurant',
  restaurant_address: '123 Test St, Test City, TC 12345',
  customer_name: 'Test Customer',
  customer_phone: '+1234567890',
  customer_address: '456 Customer Ave, Test City, TC 12345',
  order_total: 25.99,
  delivery_fee: 3.99,
  driver_pay: 8.50,
  distance_mi: '2.5',
  expires_at: new Date(Date.now() + 300000).toISOString(), // 5 minutes from now
  estimated_time: 15,
  isTestOrder: true,
  ...overrides
});

export const generateMockDriver = (overrides = {}) => ({
  id: 'test-driver-123',
  email: 'driver@test.com',
  full_name: 'Test Driver',
  phone: '+1234567890',
  vehicle_type: 'car',
  status: 'offline',
  is_available: false,
  ...overrides
});

// Test utilities for async operations
export const waitFor = (ms: number) => 
  new Promise(resolve => setTimeout(resolve, ms));

export const flushPromises = () => 
  new Promise(resolve => setImmediate(resolve));

// Mock localStorage for testing
export const mockLocalStorage = () => {
  const store: Record<string, string> = {};
  
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    })
  };
};

// Performance testing utilities
export const measurePerformance = async (fn: () => Promise<any>) => {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  
  return {
    result,
    duration: end - start
  };
};

// Accessibility testing helpers
export const checkAccessibility = async (container: HTMLElement) => {
  // This would integrate with axe-core in a real implementation
  const issues: string[] = [];
  
  // Check for missing alt text
  const images = container.querySelectorAll('img');
  images.forEach((img, index) => {
    if (!img.getAttribute('alt')) {
      issues.push(`Image ${index} is missing alt text`);
    }
  });
  
  // Check for missing labels
  const inputs = container.querySelectorAll('input');
  inputs.forEach((input, index) => {
    if (!input.getAttribute('aria-label') && !input.getAttribute('aria-labelledby')) {
      const label = container.querySelector(`label[for="${input.id}"]`);
      if (!label) {
        issues.push(`Input ${index} is missing accessible label`);
      }
    }
  });
  
  return issues;
};

// Mock API responses
export function mockApiResponse<T>(data: T, delay = 0) {
  return new Promise<T>((resolve) => {
    setTimeout(() => resolve(data), delay);
  });
}

export function mockApiError(message: string, delay = 0): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), delay);
  });
}

// Test data cleanup
export const cleanupTestData = async () => {
  // Clean up any test data from localStorage
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('test_') || key.includes('test')) {
      localStorage.removeItem(key);
    }
  });
  
  // Clean up any test data from sessionStorage
  const sessionKeys = Object.keys(sessionStorage);
  sessionKeys.forEach(key => {
    if (key.startsWith('test_') || key.includes('test')) {
      sessionStorage.removeItem(key);
    }
  });
};

// E2E testing helpers
export const e2eHelpers = {
  loginAsDriver: async (driverEmail: string = 'driver@test.com') => {
    // Mock successful login
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-driver-123', email: driverEmail } }
    });
  },
  
  goOnline: async () => {
    // Mock going online
    mockSupabase.from().upsert.mockResolvedValue({ data: null, error: null });
  },
  
  receiveOrder: async (orderData = generateMockOrder()) => {
    // Mock receiving an order
    return orderData;
  }
};

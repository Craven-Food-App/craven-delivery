// Mock Data Service for Investor Demo Portal
// All data here is for demonstration purposes only

export interface MockRestaurant {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  reviewCount: number;
  deliveryTime: string;
  deliveryFee: number;
  minimumOrder: number;
  imageUrl: string;
  isOpen: boolean;
  featured: boolean;
  mostLoved: boolean;
}

export interface MockMenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
  popular?: boolean;
}

export interface MockOrder {
  id: string;
  orderNumber: string;
  restaurantName: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'in_transit' | 'delivered';
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  deliveryFee: number;
  tax: number;
  total: number;
  customerName: string;
  customerAddress: string;
  driverName?: string;
  estimatedDelivery: string;
  placedAt: string;
}

export interface MockDriver {
  id: string;
  firstName: string;
  lastName: string;
  rating: number;
  totalDeliveries: number;
  photoUrl?: string;
}

export interface MockDelivery {
  id: string;
  orderNumber: string;
  restaurantName: string;
  restaurantAddress: string;
  customerName: string;
  customerAddress: string;
  pickupTime: string;
  dropoffTime: string;
  distance: string;
  earnings: number;
  status: 'available' | 'accepted' | 'picked_up' | 'in_transit' | 'delivered';
  items: string[];
}

// Mock Restaurants
export const mockRestaurants: MockRestaurant[] = [
  {
    id: '1',
    name: 'Bella Italia',
    cuisine: 'Italian',
    rating: 4.8,
    reviewCount: 523,
    deliveryTime: '25-35 min',
    deliveryFee: 3.99,
    minimumOrder: 15,
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400',
    isOpen: true,
    featured: true,
    mostLoved: true,
  },
  {
    id: '2',
    name: 'Sushi Master',
    cuisine: 'Japanese',
    rating: 4.9,
    reviewCount: 892,
    deliveryTime: '30-40 min',
    deliveryFee: 4.99,
    minimumOrder: 20,
    imageUrl: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400',
    isOpen: true,
    featured: true,
    mostLoved: true,
  },
  {
    id: '3',
    name: 'Burger Haven',
    cuisine: 'American',
    rating: 4.6,
    reviewCount: 1247,
    deliveryTime: '20-30 min',
    deliveryFee: 2.99,
    minimumOrder: 10,
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
    isOpen: true,
    featured: false,
    mostLoved: true,
  },
  {
    id: '4',
    name: 'Thai Orchid',
    cuisine: 'Thai',
    rating: 4.7,
    reviewCount: 634,
    deliveryTime: '35-45 min',
    deliveryFee: 3.49,
    minimumOrder: 15,
    imageUrl: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=400',
    isOpen: true,
    featured: true,
    mostLoved: false,
  },
  {
    id: '5',
    name: 'Mediterranean Grill',
    cuisine: 'Mediterranean',
    rating: 4.8,
    reviewCount: 445,
    deliveryTime: '25-35 min',
    deliveryFee: 3.99,
    minimumOrder: 12,
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400',
    isOpen: true,
    featured: false,
    mostLoved: true,
  },
  {
    id: '6',
    name: 'Taco Fiesta',
    cuisine: 'Mexican',
    rating: 4.5,
    reviewCount: 789,
    deliveryTime: '20-30 min',
    deliveryFee: 2.49,
    minimumOrder: 8,
    imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400',
    isOpen: false,
    featured: false,
    mostLoved: false,
  },
];

// Mock Menu Items
export const mockMenuItems: Record<string, MockMenuItem[]> = {
  '1': [ // Bella Italia
    { id: '1-1', name: 'Margherita Pizza', description: 'Fresh mozzarella, basil, tomato sauce', price: 14.99, category: 'Pizza', popular: true },
    { id: '1-2', name: 'Spaghetti Carbonara', description: 'Creamy sauce, pancetta, parmesan', price: 16.99, category: 'Pasta', popular: true },
    { id: '1-3', name: 'Chicken Parmesan', description: 'Breaded chicken, marinara, mozzarella', price: 18.99, category: 'Entrees' },
    { id: '1-4', name: 'Caesar Salad', description: 'Romaine, parmesan, croutons, caesar dressing', price: 9.99, category: 'Salads' },
    { id: '1-5', name: 'Tiramisu', description: 'Classic Italian coffee dessert', price: 7.99, category: 'Desserts' },
  ],
  '2': [ // Sushi Master
    { id: '2-1', name: 'California Roll', description: 'Crab, avocado, cucumber', price: 8.99, category: 'Rolls', popular: true },
    { id: '2-2', name: 'Spicy Tuna Roll', description: 'Tuna, spicy mayo, cucumber', price: 10.99, category: 'Rolls', popular: true },
    { id: '2-3', name: 'Dragon Roll', description: 'Shrimp tempura, avocado, eel sauce', price: 15.99, category: 'Specialty Rolls', popular: true },
    { id: '2-4', name: 'Salmon Sashimi', description: '6 pieces of fresh salmon', price: 12.99, category: 'Sashimi' },
    { id: '2-5', name: 'Miso Soup', description: 'Traditional Japanese soup', price: 3.99, category: 'Appetizers' },
  ],
};

// Mock Orders (Customer View)
export const mockCustomerOrders: MockOrder[] = [
  {
    id: 'ord-1',
    orderNumber: '#2847',
    restaurantName: 'Bella Italia',
    status: 'in_transit',
    items: [
      { name: 'Margherita Pizza', quantity: 1, price: 14.99 },
      { name: 'Caesar Salad', quantity: 1, price: 9.99 },
    ],
    subtotal: 24.98,
    deliveryFee: 3.99,
    tax: 2.25,
    total: 31.22,
    customerName: 'Demo Customer',
    customerAddress: '123 Main St, Apt 4B, San Francisco, CA 94102',
    driverName: 'Sarah Johnson',
    estimatedDelivery: '6:45 PM',
    placedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(), // 20 mins ago
  },
];

// Mock Orders (Merchant View)
export const mockMerchantOrders: MockOrder[] = [
  {
    id: 'ord-m-1',
    orderNumber: '#2847',
    restaurantName: 'Bella Italia',
    status: 'ready',
    items: [
      { name: 'Margherita Pizza', quantity: 1, price: 14.99 },
      { name: 'Caesar Salad', quantity: 1, price: 9.99 },
    ],
    subtotal: 24.98,
    deliveryFee: 3.99,
    tax: 2.25,
    total: 31.22,
    customerName: 'Demo Customer',
    customerAddress: '123 Main St, Apt 4B',
    driverName: 'Sarah Johnson',
    estimatedDelivery: '6:45 PM',
    placedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
  },
  {
    id: 'ord-m-2',
    orderNumber: '#2848',
    restaurantName: 'Bella Italia',
    status: 'preparing',
    items: [
      { name: 'Spaghetti Carbonara', quantity: 2, price: 16.99 },
      { name: 'Tiramisu', quantity: 2, price: 7.99 },
    ],
    subtotal: 49.96,
    deliveryFee: 3.99,
    tax: 4.50,
    total: 58.45,
    customerName: 'John Smith',
    customerAddress: '456 Oak Ave, Unit 12',
    estimatedDelivery: '7:15 PM',
    placedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
  },
  {
    id: 'ord-m-3',
    orderNumber: '#2849',
    restaurantName: 'Bella Italia',
    status: 'confirmed',
    items: [
      { name: 'Chicken Parmesan', quantity: 1, price: 18.99 },
      { name: 'Caesar Salad', quantity: 1, price: 9.99 },
    ],
    subtotal: 28.98,
    deliveryFee: 3.99,
    tax: 2.61,
    total: 35.58,
    customerName: 'Emily Davis',
    customerAddress: '789 Pine St',
    estimatedDelivery: '7:30 PM',
    placedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
  },
];

// Mock Deliveries (Driver View)
export const mockDriverDeliveries: MockDelivery[] = [
  {
    id: 'del-1',
    orderNumber: '#2847',
    restaurantName: 'Bella Italia',
    restaurantAddress: '500 Market St, San Francisco, CA',
    customerName: 'Demo Customer',
    customerAddress: '123 Main St, Apt 4B, San Francisco, CA',
    pickupTime: '6:25 PM',
    dropoffTime: '6:45 PM',
    distance: '1.8 mi',
    earnings: 8.50,
    status: 'picked_up',
    items: ['Margherita Pizza', 'Caesar Salad'],
  },
  {
    id: 'del-2',
    orderNumber: '#2850',
    restaurantName: 'Sushi Master',
    restaurantAddress: '320 Castro St, San Francisco, CA',
    customerName: 'Alex Martinez',
    customerAddress: '890 Valencia St, San Francisco, CA',
    pickupTime: '7:00 PM',
    dropoffTime: '7:20 PM',
    distance: '2.3 mi',
    earnings: 10.25,
    status: 'available',
    items: ['California Roll', 'Spicy Tuna Roll', 'Miso Soup'],
  },
];

// Mock Analytics Data (Merchant View)
export interface MerchantAnalytics {
  todayRevenue: number;
  todayOrders: number;
  weekRevenue: number;
  weekOrders: number;
  avgOrderValue: number;
  topItems: Array<{ name: string; count: number }>;
}

export const mockMerchantAnalytics: MerchantAnalytics = {
  todayRevenue: 1847.50,
  todayOrders: 43,
  weekRevenue: 12345.75,
  weekOrders: 287,
  avgOrderValue: 42.99,
  topItems: [
    { name: 'Margherita Pizza', count: 34 },
    { name: 'Spaghetti Carbonara', count: 28 },
    { name: 'Chicken Parmesan', count: 21 },
  ],
};

// Mock Driver Stats
export interface DriverStats {
  todayEarnings: number;
  todayDeliveries: number;
  weekEarnings: number;
  weekDeliveries: number;
  rating: number;
  totalDeliveries: number;
  onlineTime: string;
}

export const mockDriverStats: DriverStats = {
  todayEarnings: 127.50,
  todayDeliveries: 12,
  weekEarnings: 845.25,
  weekDeliveries: 78,
  rating: 4.9,
  totalDeliveries: 1247,
  onlineTime: '4h 23m',
};

// Helper functions
export function getRestaurantById(id: string): MockRestaurant | undefined {
  return mockRestaurants.find(r => r.id === id);
}

export function getMenuItemsForRestaurant(restaurantId: string): MockMenuItem[] {
  return mockMenuItems[restaurantId] || [];
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function getOrderStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'confirmed':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'preparing':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'ready':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'picked_up':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case 'in_transit':
      return 'bg-cyan-100 text-cyan-800 border-cyan-200';
    case 'delivered':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function getOrderStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'confirmed':
      return 'Confirmed';
    case 'preparing':
      return 'Preparing';
    case 'ready':
      return 'Ready for Pickup';
    case 'picked_up':
      return 'Picked Up';
    case 'in_transit':
      return 'In Transit';
    case 'delivered':
      return 'Delivered';
    default:
      return status;
  }
}


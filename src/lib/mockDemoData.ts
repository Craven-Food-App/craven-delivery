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

// Mock Menu Items with realistic images
export const mockMenuItems: Record<string, MockMenuItem[]> = {
  '1': [ // Bella Italia
    { id: '1-1', name: 'Margherita Pizza', description: 'Fresh mozzarella, basil, tomato sauce', price: 14.99, category: 'Pizza', imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400', popular: true },
    { id: '1-2', name: 'Spaghetti Carbonara', description: 'Creamy sauce, pancetta, parmesan', price: 16.99, category: 'Pasta', imageUrl: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=400', popular: true },
    { id: '1-3', name: 'Chicken Parmesan', description: 'Breaded chicken, marinara, mozzarella', price: 18.99, category: 'Entrees', imageUrl: 'https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=400' },
    { id: '1-4', name: 'Caesar Salad', description: 'Romaine, parmesan, croutons, caesar dressing', price: 9.99, category: 'Salads', imageUrl: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400' },
    { id: '1-5', name: 'Tiramisu', description: 'Classic Italian coffee dessert', price: 7.99, category: 'Desserts', imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400' },
  ],
  '2': [ // Sushi Master
    { id: '2-1', name: 'California Roll', description: 'Crab, avocado, cucumber', price: 8.99, category: 'Rolls', imageUrl: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400', popular: true },
    { id: '2-2', name: 'Spicy Tuna Roll', description: 'Tuna, spicy mayo, cucumber', price: 10.99, category: 'Rolls', imageUrl: 'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=400', popular: true },
    { id: '2-3', name: 'Dragon Roll', description: 'Shrimp tempura, avocado, eel sauce', price: 15.99, category: 'Specialty Rolls', imageUrl: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400', popular: true },
    { id: '2-4', name: 'Salmon Sashimi', description: '6 pieces of fresh salmon', price: 12.99, category: 'Sashimi', imageUrl: 'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=400' },
    { id: '2-5', name: 'Miso Soup', description: 'Traditional Japanese soup', price: 3.99, category: 'Appetizers', imageUrl: 'https://images.unsplash.com/photo-1607301405390-d831c242f59b?w=400' },
  ],
  '3': [ // Burger Haven
    { id: '3-1', name: 'Classic Burger', description: 'Beef patty, lettuce, tomato, pickles', price: 12.99, category: 'Burgers', imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400', popular: true },
    { id: '3-2', name: 'Bacon Cheeseburger', description: 'Beef, bacon, cheese, special sauce', price: 14.99, category: 'Burgers', imageUrl: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400', popular: true },
    { id: '3-3', name: 'Crispy Fries', description: 'Golden french fries', price: 4.99, category: 'Sides', imageUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400' },
    { id: '3-4', name: 'Milkshake', description: 'Vanilla, chocolate, or strawberry', price: 5.99, category: 'Drinks', imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400' },
  ],
  '4': [ // Thai Orchid
    { id: '4-1', name: 'Pad Thai', description: 'Rice noodles, peanuts, lime', price: 13.99, category: 'Noodles', imageUrl: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=400', popular: true },
    { id: '4-2', name: 'Green Curry', description: 'Coconut curry, vegetables, jasmine rice', price: 14.99, category: 'Curry', imageUrl: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400', popular: true },
    { id: '4-3', name: 'Tom Yum Soup', description: 'Spicy and sour Thai soup', price: 8.99, category: 'Soups', imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400' },
  ],
  '5': [ // Mediterranean Grill
    { id: '5-1', name: 'Lamb Gyro', description: 'Slow-roasted lamb, tzatziki, pita', price: 13.99, category: 'Gyros', imageUrl: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=400', popular: true },
    { id: '5-2', name: 'Chicken Shawarma', description: 'Marinated chicken, garlic sauce', price: 12.99, category: 'Wraps', imageUrl: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=400', popular: true },
    { id: '5-3', name: 'Falafel Plate', description: 'Crispy falafel, hummus, tahini', price: 11.99, category: 'Vegetarian', imageUrl: 'https://images.unsplash.com/photo-1626804475297-41608ea09aeb?w=400' },
  ],
  '6': [ // Taco Fiesta
    { id: '6-1', name: 'Carne Asada Tacos', description: 'Grilled steak, onions, cilantro', price: 10.99, category: 'Tacos', imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400', popular: true },
    { id: '6-2', name: 'Chicken Burrito', description: 'Rice, beans, cheese, sour cream', price: 11.99, category: 'Burritos', imageUrl: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400', popular: true },
    { id: '6-3', name: 'Chips & Guacamole', description: 'Fresh tortilla chips, homemade guac', price: 6.99, category: 'Appetizers', imageUrl: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400' },
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

// Mock Deliveries (Driver View) - Enhanced for demo flow
export const mockDriverDeliveries: MockDelivery[] = [
  {
    id: 'del-1',
    orderNumber: '#2847',
    restaurantName: 'Bella Italia Trattoria',
    restaurantAddress: '123 Main Street, Suite 100, New York, NY 10001',
    customerName: 'Sarah Johnson',
    customerAddress: '456 Park Avenue, Apt 12B, New York, NY 10022',
    pickupTime: new Date(Date.now() + 5 * 60 * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    dropoffTime: new Date(Date.now() + 25 * 60 * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    distance: '1.8 mi',
    earnings: 12.50,
    status: 'accepted',
    items: ['Margherita Pizza', 'Caesar Salad', 'Tiramisu'],
  },
  {
    id: 'del-2',
    orderNumber: '#2850',
    restaurantName: 'Sushi Master',
    restaurantAddress: '320 Castro St, San Francisco, CA',
    customerName: 'Alex Martinez',
    customerAddress: '890 Valencia St, San Francisco, CA',
    pickupTime: new Date(Date.now() + 30 * 60 * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    dropoffTime: new Date(Date.now() + 50 * 60 * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    distance: '2.3 mi',
    earnings: 14.25,
    status: 'available',
    items: ['California Roll', 'Spicy Tuna Roll', 'Dragon Roll', 'Miso Soup'],
  },
  {
    id: 'del-3',
    orderNumber: '#2851',
    restaurantName: 'Burger Haven',
    restaurantAddress: '555 Market St, San Francisco, CA',
    customerName: 'Michael Chen',
    customerAddress: '234 Mission St, Apt 5, San Francisco, CA',
    pickupTime: new Date(Date.now() + 45 * 60 * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    dropoffTime: new Date(Date.now() + 60 * 60 * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    distance: '1.2 mi',
    earnings: 10.75,
    status: 'available',
    items: ['Classic Burger', 'Bacon Cheeseburger', 'Fries'],
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

// Enhanced Mock Data for Active Delivery Flow Demo
export interface ActiveDeliveryMock {
  id: string;
  orderNumber: string;
  status: 'heading_to_pickup' | 'arrived_at_pickup' | 'picked_up' | 'heading_to_customer' | 'arrived_at_customer' | 'delivered';
  restaurant: {
    name: string;
    address: string;
    phone: string;
    coordinates: { lat: number; lng: number };
    logo_url: string;
  };
  customer: {
    name: string;
    address: string;
    phone: string;
    coordinates: { lat: number; lng: number };
    delivery_instructions?: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    special_instructions?: string;
  }>;
  earnings: number;
  distance: string;
  estimatedTime: string;
  pickupTime: string;
  deliveryTime: string;
}

export const mockActiveDelivery: ActiveDeliveryMock = {
  id: 'active-del-1',
  orderNumber: '#2847',
  status: 'heading_to_pickup',
  restaurant: {
    name: 'Bella Italia Trattoria',
    address: '123 Main Street, Suite 100, New York, NY 10001',
    phone: '+1 (555) 987-6543',
    coordinates: { lat: 40.7589, lng: -73.9851 },
    logo_url: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=200',
  },
  customer: {
    name: 'Sarah Johnson',
    address: '456 Park Avenue, Apt 12B, New York, NY 10022',
    phone: '+1 (555) 123-4567',
    coordinates: { lat: 40.7614, lng: -73.9776 },
    delivery_instructions: 'Please call when you arrive. I\'ll come down to meet you.',
  },
  items: [
    { name: 'Margherita Pizza', quantity: 1 },
    { name: 'Caesar Salad', quantity: 1 },
    { name: 'Tiramisu', quantity: 1, special_instructions: 'Extra chocolate shavings' },
  ],
  earnings: 12.50,
  distance: '1.8 mi',
  estimatedTime: '18 min',
  pickupTime: new Date(Date.now() + 5 * 60 * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  deliveryTime: new Date(Date.now() + 25 * 60 * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
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


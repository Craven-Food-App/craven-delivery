import React, { useState, useEffect } from 'react';
import {
  Button,
  Card,
  TextInput,
  Badge,
  ScrollArea,
  Textarea,
  Select,
  Stack,
  Group,
  Text,
  Title,
  Box,
  Divider,
  Grid,
  ActionIcon,
  Tabs,
  Loader,
  Image as MantineImage,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconPlus,
  IconMinus,
  IconTrash,
  IconSearch,
  IconShoppingCart,
  IconUser,
  IconMapPin,
  IconCreditCard,
  IconLogout,
  IconClock,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { MenuItemModal } from './MenuItemModal';
import { AddressAutocomplete } from '@/components/common/AddressAutocomplete';
import { MobilePOSCart } from './MobilePOSCart';
import { useIsMobile } from '@/hooks/use-mobile';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  image_url?: string;
  category_id?: string;
  is_available: boolean;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
  preparation_time: number;
}

interface CartItem extends MenuItem {
  quantity: number;
  special_instructions?: string;
  modifiers?: SelectedModifier[];
}

interface SelectedModifier {
  id: string;
  name: string;
  price_cents: number;
}

interface CustomerInfo {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  special_instructions?: string;
  addressCoordinates?: { lat: number; lng: number };
}

interface Employee {
  id: string;
  employee_id: string;
  full_name: string;
  role: string;
  restaurant_id: string;
}

interface ModernPOSProps {
  restaurantId: string;
  employee: Employee;
  onLogout: () => void;
}

export const ModernPOS: React.FC<ModernPOSProps> = ({ restaurantId, employee, onLogout }) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    phone: ''
  });
  const [isValidAddress, setIsValidAddress] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('pickup');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'phone_payment'>('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchMenuCategories();
    fetchMenuItems();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [restaurantId]);

  const fetchMenuCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_categories')
        .select('id, name')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setCategories([
        { id: 'all', name: 'All Items' },
        ...(data || [])
      ]);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select(`
          *,
          menu_categories!left(name)
        `)
        .eq('restaurant_id', restaurantId)
        .eq('is_available', true)
        .order('name');

      if (error) throw error;
      setMenuItems(data || []);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      notifications.show({
        title: "Error loading menu",
        message: "Could not load menu items. Please refresh and try again.",
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredMenuItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (item: MenuItem, quantity: number = 1, modifiers: SelectedModifier[] = [], specialInstructions?: string) => {
    const cartItem: CartItem = {
      ...item,
      quantity,
      special_instructions: specialInstructions,
      modifiers
    };
    
    setCart(prevCart => [...prevCart, cartItem]);
    
    notifications.show({
      title: "Added to cart",
      message: `${quantity}x ${item.name} added to cart`,
      color: 'green',
    });
  };

  const quickAddToCart = (item: MenuItem) => {
    setSelectedMenuItem(item);
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter(item => item.id !== itemId));
    } else {
      setCart(cart.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      ));
    }
  };

  const updateSpecialInstructions = (itemId: string, instructions: string) => {
    setCart(cart.map(item =>
      item.id === itemId ? { ...item, special_instructions: instructions } : item
    ));
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => {
      const itemPrice = item.price_cents;
      const modifiersPrice = item.modifiers?.reduce((modSum, mod) => modSum + mod.price_cents, 0) || 0;
      return sum + ((itemPrice + modifiersPrice) * item.quantity);
    }, 0);
    const tax = Math.round(subtotal * 0.08); // 8% tax
    const deliveryFee = orderType === 'delivery' ? 299 : 0; // $2.99 delivery fee
    const total = subtotal + tax + deliveryFee;

    return {
      subtotal,
      tax,
      deliveryFee,
      total
    };
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      notifications.show({
        title: "Empty cart",
        message: "Please add items to the cart before placing an order.",
        color: 'red',
      });
      return;
    }

    if (!customerInfo.name || !customerInfo.phone) {
      notifications.show({
        title: "Missing customer information",
        message: "Please provide customer name and phone number.",
        color: 'red',
      });
      return;
    }

    if (orderType === 'delivery' && !customerInfo.address) {
      notifications.show({
        title: "Missing delivery address",
        message: "Please provide a valid delivery address for delivery orders.",
        color: 'red',
      });
      return;
    }

    if (orderType === 'delivery' && !isValidAddress) {
      notifications.show({
        title: "Invalid delivery address",
        message: "Please select a valid address from the suggestions.",
        color: 'red',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const totals = calculateTotals();

      // Ensure user is authenticated for RLS (orders.customer_id = auth.uid())
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        notifications.show({
          title: "Not signed in",
          message: "Please sign in to place an order.",
          color: 'red',
        });
        setIsSubmitting(false);
        return;
      }

      // Fetch restaurant information for pickup address
      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .select('id, name, address, city, state, zip_code, latitude, longitude')
        .eq('id', restaurantId)
        .single();

      if (restaurantError || !restaurant) {
        notifications.show({
          title: "Restaurant not found",
          message: "Could not load restaurant information.",
          color: 'red',
        });
        setIsSubmitting(false);
        return;
      }

      // Create pickup address from restaurant data
      const pickupAddress = {
        name: restaurant.name,
        address: restaurant.address || '',
        city: restaurant.city || '',
        state: restaurant.state || '',
        zip_code: restaurant.zip_code || '',
        phone: '', // Restaurant phone not needed for pickup
        email: '',
        special_instructions: '',
        ...(restaurant.latitude && restaurant.longitude && {
          latitude: restaurant.latitude,
          longitude: restaurant.longitude
        })
      };

      // Create dropoff address for delivery orders
      const dropoffAddress = orderType === 'delivery' ? {
        name: customerInfo.name,
        phone: customerInfo.phone,
        email: customerInfo.email || '',
        address: customerInfo.address || '',
        city: customerInfo.city || '',
        state: customerInfo.state || '',
        zip_code: customerInfo.zip_code || '',
        special_instructions: customerInfo.special_instructions || '',
        ...customerInfo.addressCoordinates && {
          latitude: customerInfo.addressCoordinates.lat,
          longitude: customerInfo.addressCoordinates.lng
        }
      } : null;

      // Calculate distance for delivery orders
      let distanceKm = null;
      if (orderType === 'delivery' && restaurant.latitude && restaurant.longitude && customerInfo.addressCoordinates) {
        try {
          const { data: distance } = await supabase.rpc('calculate_distance', {
            lat1: restaurant.latitude,
            lng1: restaurant.longitude,
            lat2: customerInfo.addressCoordinates.lat,
            lng2: customerInfo.addressCoordinates.lng
          });
          distanceKm = distance ? distance * 1.60934 : null; // Convert miles to km
        } catch (distError) {
          console.error('Distance calculation error:', distError);
        }
      }

      // Create order record using allowed columns on orders table
      const orderData = {
        customer_id: user.id,
        restaurant_id: restaurantId,
        subtotal_cents: totals.subtotal,
        delivery_fee_cents: totals.deliveryFee,
        tax_cents: totals.tax,
        total_cents: totals.total,
        order_status: paymentMethod === 'cash' ? 'confirmed' : 'pending',
        pickup_address: pickupAddress,
        dropoff_address: dropoffAddress,
        delivery_address: dropoffAddress, // Legacy field for compatibility
        distance_km: distanceKm,
        estimated_delivery_time: new Date(Date.now() + (orderType === 'delivery' ? 45 : 20) * 60000).toISOString()
      };

      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) {
        console.error('Checkout error:', orderError);
        throw orderError;
      }

      // Create order items for detailed tracking
      const orderItems = cart.map(item => ({
        order_id: newOrder.id,
        menu_item_id: item.id,
        quantity: item.quantity,
        price_cents: item.price_cents + (item.modifiers?.reduce((sum, mod) => sum + mod.price_cents, 0) || 0),
        special_instructions: item.special_instructions || null
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Order items error:', itemsError);
        // Don't fail the whole order if items fail to insert
      }

      // Trigger auto-assignment for delivery orders to send to drivers
      if (orderType === 'delivery') {
        try {
          console.log('Triggering auto-assignment for POS order:', newOrder.id);
          await supabase.functions.invoke('auto-assign-orders', {
            body: { orderId: newOrder.id }
          });
          console.log('Auto-assignment triggered successfully');
        } catch (autoAssignError) {
          console.error('Auto-assignment error:', autoAssignError);
          // Don't fail the order if auto-assignment fails
        }
      }

      const orderMessage = newOrder.pickup_code 
        ? `Order #${newOrder.order_number || newOrder.id.slice(-8)} created. Pickup Code: ${newOrder.pickup_code}. ${orderType === 'delivery' ? 'Auto-assignment triggered for delivery' : 'Ready for pickup in 20 minutes'}. Payment: ${paymentMethod.toUpperCase()}`
        : `Order #${newOrder.order_number || newOrder.id.slice(-8)} has been created. ${orderType === 'delivery' ? 'Auto-assignment triggered for delivery' : 'Ready for pickup in 20 minutes'}. Payment: ${paymentMethod.toUpperCase()}`;
      
      notifications.show({
        title: "Order placed successfully!",
        message: orderMessage,
        color: 'green',
        autoClose: 10000,
      });

      // Reset form
      setCart([]);
      setCustomerInfo({ name: '', phone: '' });
      setSearchQuery('');

    } catch (error) {
      console.error('Checkout error:', error);
      notifications.show({
        title: "Checkout failed",
        message: "Something went wrong placing the order. Please try again.",
        color: 'red',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <Box style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(to bottom right, var(--mantine-color-orange-0), var(--mantine-color-orange-1))' }}>
        <Stack align="center" gap="md">
          <Loader size="lg" color="orange" />
          <Text size="lg">Loading POS System...</Text>
        </Stack>
      </Box>
    );
  }

  return (
    <Box style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, var(--mantine-color-gray-0), var(--mantine-color-orange-0))' }}>
      {/* Header */}
      <Box style={{ borderBottom: '1px solid var(--mantine-color-gray-3)', backgroundColor: 'var(--mantine-color-body)', position: 'sticky', top: 0, zIndex: 50 }}>
        <Group justify="space-between" align="center" p="md">
          <Group gap="md">
            <Box p="xs" style={{ backgroundColor: 'var(--mantine-color-orange-0)', borderRadius: '8px' }}>
              <IconShoppingCart size={24} style={{ color: 'var(--mantine-color-orange-6)' }} />
            </Box>
            <Stack gap={0}>
              <Title order={3}>POS</Title>
              <Text size="sm" c="dimmed">Point of Sale System</Text>
            </Stack>
          </Group>
          
          <Group gap="md">
            <Stack gap={0} align="flex-end">
              <Text size="sm" fw={500}>{employee.full_name}</Text>
              <Text size="xs" c="dimmed" tt="capitalize">{employee.role} • {employee.employee_id}</Text>
            </Stack>
            <Stack gap={0} align="flex-end">
              <Text size="sm" fw={500}>{currentTime.toLocaleTimeString()}</Text>
              <Text size="xs" c="dimmed">{currentTime.toLocaleDateString()}</Text>
            </Stack>
            <Button variant="outline" size="sm" onClick={onLogout} leftSection={<IconLogout size={16} />}>
              Logout
            </Button>
          </Group>
        </Group>
      </Box>

      <Grid gutter="lg" p="md" style={{ minHeight: isMobile ? 'auto' : 'calc(100vh - 100px)' }}>
        {/* Menu Items - Left Side */}
        <Grid.Col span={{ base: 12, lg: 3 }}>
          <Stack gap="md">
            {/* Search */}
            <Card p="md" withBorder shadow="md">
              <TextInput
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="lg"
                leftSection={<IconSearch size={20} />}
                styles={{ input: { fontSize: '18px' } }}
              />
            </Card>

            {/* Category Tabs */}
            <Card p="md" withBorder shadow="md">
              <ScrollArea>
                <Group gap="xs" wrap="nowrap">
                  {categories.map((category) => (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? "filled" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category.id)}
                      style={{ whiteSpace: 'nowrap', minWidth: 'fit-content' }}
                    >
                      {category.name}
                    </Button>
                  ))}
                </Group>
              </ScrollArea>
            </Card>

            {/* Menu Grid */}
            <ScrollArea style={{ height: isMobile ? 'calc(100vh - 280px)' : '100%', flex: 1 }}>
              <Grid gutter="md" pb="md">
                {filteredMenuItems.map((item) => (
                  <Grid.Col key={item.id} span={{ base: 6, md: 4, lg: 6 }}>
                    <Card
                      p={0}
                      withBorder
                      shadow="md"
                      style={{ cursor: 'pointer', overflow: 'hidden' }}
                      onClick={() => quickAddToCart(item)}
                    >
                      <Box style={{ aspectRatio: '1', position: 'relative', background: 'linear-gradient(to bottom right, var(--mantine-color-orange-0), var(--mantine-color-orange-1))', overflow: 'hidden' }}>
                        {item.image_url ? (
                          <MantineImage
                            src={item.image_url}
                            alt={item.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            fit="cover"
                          />
                        ) : (
                          <Box style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <IconShoppingCart size={48} style={{ color: 'var(--mantine-color-dimmed)' }} />
                          </Box>
                        )}
                        <Box style={{ position: 'absolute', top: 8, right: 8 }}>
                          <Badge variant="filled" size="lg" fw={700}>
                            ${(item.price_cents / 100).toFixed(2)}
                          </Badge>
                        </Box>
                      </Box>
                      <Stack gap="xs" p="sm">
                        <Text fw={700} size="sm" lineClamp={1}>{item.name}</Text>
                        <Text size="xs" c="dimmed" lineClamp={2}>
                          {item.description}
                        </Text>
                      </Stack>
                    </Card>
                  </Grid.Col>
                ))}
              </Grid>
            </ScrollArea>
          </Stack>
        </Grid.Col>

        {/* Order Summary & Customer Info - Right Side (Desktop Only) */}
        {!isMobile && (
          <Grid.Col span={{ base: 12, lg: 2 }}>
            <Stack gap="md" style={{ height: '100%' }}>
              {/* Customer Information */}
              <Card p="md" withBorder shadow="md">
                <Stack gap="md">
                  <Group gap="xs">
                    <IconUser size={20} style={{ color: 'var(--mantine-color-orange-6)' }} />
                    <Title order={4}>Customer Information</Title>
                  </Group>
                  
                  <Grid gutter="sm">
                    <Grid.Col span={6}>
                      <TextInput
                        label="Name *"
                        size="sm"
                        value={customerInfo.name}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                        placeholder="Customer name"
                      />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <TextInput
                        label="Phone *"
                        size="sm"
                        value={customerInfo.phone}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                        placeholder="Phone number"
                      />
                    </Grid.Col>
                  </Grid>
                  
                  <Grid gutter="sm">
                    <Grid.Col span={6}>
                      <Select
                        label="Order Type"
                        size="sm"
                        value={orderType}
                        onChange={(value: 'delivery' | 'pickup') => setOrderType(value)}
                        data={[
                          { value: 'pickup', label: '🏪 Pickup' },
                          { value: 'delivery', label: '🚗 Delivery' },
                        ]}
                      />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <Select
                        label="Payment"
                        size="sm"
                        value={paymentMethod}
                        onChange={(value: any) => setPaymentMethod(value)}
                        data={[
                          { value: 'cash', label: '💵 Cash' },
                          { value: 'card', label: '💳 Card' },
                          { value: 'phone_payment', label: '📱 Phone Payment' },
                        ]}
                      />
                    </Grid.Col>
                  </Grid>

                  {orderType === 'delivery' && (
                    <AddressAutocomplete
                      value={customerInfo.address || ''}
                      onChange={(value, coordinates) => {
                        setCustomerInfo(prev => ({ 
                          ...prev, 
                          address: value,
                          ...(coordinates && { addressCoordinates: coordinates })
                        }));
                      }}
                      onValidAddress={(isValid) => setIsValidAddress(isValid)}
                      placeholder="123 Main St, City, State 12345"
                      required
                    />
                  )}
                </Stack>
              </Card>

              {/* Cart */}
              <Card p="md" withBorder shadow="md" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Stack gap="md" style={{ height: '100%' }}>
                  <Group justify="space-between" align="center">
                    <Group gap="xs">
                      <IconShoppingCart size={20} style={{ color: 'var(--mantine-color-orange-6)' }} />
                      <Title order={4}>Order Summary</Title>
                    </Group>
                    <Badge variant="light">
                      {cart.reduce((sum, item) => sum + item.quantity, 0)} items
                    </Badge>
                  </Group>
                  
                  {cart.length === 0 ? (
                    <Box style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Text c="dimmed" ta="center">
                        Tap menu items to add them to the order
                      </Text>
                    </Box>
                  ) : (
                    <>
                      <ScrollArea style={{ flex: 1 }}>
                        <Stack gap="sm">
                          {cart.map((item) => (
                            <Card key={item.id} p="sm" style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
                              <Stack gap="xs">
                                <Group justify="space-between" align="flex-start">
                                  <Text fw={500} size="sm">{item.name}</Text>
                                  <ActionIcon
                                    variant="subtle"
                                    color="red"
                                    size="sm"
                                    onClick={() => updateQuantity(item.id, 0)}
                                  >
                                    <IconTrash size={14} />
                                  </ActionIcon>
                                </Group>
                                <Group justify="space-between" align="center">
                                  <Group gap="xs">
                                    <ActionIcon
                                      variant="outline"
                                      size="sm"
                                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                    >
                                      <IconMinus size={14} />
                                    </ActionIcon>
                                    <Text fw={700} size="sm" style={{ minWidth: '2rem', textAlign: 'center' }}>{item.quantity}</Text>
                                    <ActionIcon
                                      variant="outline"
                                      size="sm"
                                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                    >
                                      <IconPlus size={14} />
                                    </ActionIcon>
                                  </Group>
                                  <Text fw={700} size="sm">
                                    ${((item.price_cents * item.quantity) / 100).toFixed(2)}
                                  </Text>
                                </Group>
                              </Stack>
                            </Card>
                          ))}
                        </Stack>
                      </ScrollArea>

                      <Divider />

                      {/* Totals */}
                      <Stack gap="xs">
                        <Group justify="space-between">
                          <Text size="sm">Subtotal</Text>
                          <Text size="sm">${(totals.subtotal / 100).toFixed(2)}</Text>
                        </Group>
                        {orderType === 'delivery' && (
                          <Group justify="space-between">
                            <Text size="sm">Delivery Fee</Text>
                            <Text size="sm">${(totals.deliveryFee / 100).toFixed(2)}</Text>
                          </Group>
                        )}
                        <Group justify="space-between">
                          <Text size="sm">Tax</Text>
                          <Text size="sm">${(totals.tax / 100).toFixed(2)}</Text>
                        </Group>
                        <Divider />
                        <Group justify="space-between">
                          <Text fw={700} size="lg">Total</Text>
                          <Text fw={700} size="lg">${(totals.total / 100).toFixed(2)}</Text>
                        </Group>
                      </Stack>

                      <Button
                        onClick={handleSubmitOrder}
                        disabled={isSubmitting || cart.length === 0}
                        size="lg"
                        fullWidth
                        leftSection={isSubmitting ? <Loader size="sm" /> : <IconClock size={20} />}
                      >
                        {isSubmitting ? 'Processing...' : `Place Order • $${(totals.total / 100).toFixed(2)}`}
                      </Button>
                    </>
                  )}
                </Stack>
              </Card>
            </Stack>
          </Grid.Col>
        )}
      </Grid>

      {/* Mobile Cart Drawer */}
      {isMobile && (
        <MobilePOSCart
          cart={cart}
          customerInfo={customerInfo}
          orderType={orderType}
          paymentMethod={paymentMethod}
          isValidAddress={isValidAddress}
          isSubmitting={isSubmitting}
          totals={totals}
          onUpdateQuantity={updateQuantity}
          onUpdateInstructions={updateSpecialInstructions}
          onCustomerInfoChange={(info) => setCustomerInfo(prev => ({ ...prev, ...info }))}
          onOrderTypeChange={setOrderType}
          onPaymentMethodChange={setPaymentMethod}
          onAddressSelect={(data) => {
            setCustomerInfo(prev => ({
              ...prev,
              address: data.address,
              addressCoordinates: data.coordinates
            }));
          }}
          onValidAddressChange={setIsValidAddress}
          onSubmit={handleSubmitOrder}
        />
      )}

      {selectedMenuItem && (
        <MenuItemModal
          item={selectedMenuItem}
          onClose={() => setSelectedMenuItem(null)}
          onAddToCart={addToCart}
        />
      )}
    </Box>
  );
};
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { openConfirmModal } from '@mantine/modals';

interface CartItem {
  id: string;
  name: string;
  price_cents: number;
  quantity: number;
  modifiers?: any[];
  special_instructions?: string;
  restaurant_id?: string;
  image_url?: string;
}

interface CartContextType {
  cartItems: CartItem[];
  restaurantId: string | null;
  cartCount: number;
  addToCart: (item: CartItem, restaurantId: string) => Promise<void>;
  removeFromCart: (itemId: string) => void;
  updateCartItem: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  loading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load cart from database on mount
  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Check if user is a driver - don't load cart for drivers
      const { data: driverProfile } = await supabase
        .from('driver_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (driverProfile) {
        // User is a driver, skip cart loading
        setLoading(false);
        return;
      }

      const { data: persistedCart } = await supabase
        .from('customer_carts')
        .select('*')
        .eq('customer_id', user.id)
        .maybeSingle();

      if (persistedCart) {
        setCartItems(Array.isArray(persistedCart.items) ? persistedCart.items as unknown as CartItem[] : []);
        setRestaurantId(persistedCart.restaurant_id || null);
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveCart = async (items: CartItem[], restaurantId: string | null) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('customer_carts')
        .upsert({
          customer_id: user.id,
          restaurant_id: restaurantId,
          items: items as any,
        });
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  };

  const addToCart = useCallback(async (item: CartItem, newRestaurantId: string) => {
    // Check if cart has items from a different restaurant
    if (restaurantId && restaurantId !== newRestaurantId && cartItems.length > 0) {
      // Show confirmation modal
      openConfirmModal({
        title: 'Cart Contains Items from Another Restaurant',
        children: (
          <div>
            <p>There are items in your cart from a different restaurant.</p>
            <p>Are you sure you want to clear your cart and add new items?</p>
          </div>
        ),
        labels: { confirm: 'Clear & Add', cancel: 'Cancel' },
        confirmProps: { color: 'red' },
        onConfirm: async () => {
          setCartItems([item]);
          setRestaurantId(newRestaurantId);
          await saveCart([item], newRestaurantId);
          toast({
            title: 'Cart Cleared',
            description: 'Added item from new restaurant',
          });
        },
      });
      return;
    }

    // Add to existing cart or create new cart
    const existingItem = cartItems.find(cartItem => cartItem.id === item.id);
    let updatedItems: CartItem[];

    if (existingItem) {
      updatedItems = cartItems.map(cartItem =>
        cartItem.id === item.id
          ? { ...cartItem, quantity: cartItem.quantity + item.quantity }
          : cartItem
      );
    } else {
      updatedItems = [...cartItems, { ...item, restaurant_id: newRestaurantId }];
    }

    setCartItems(updatedItems);
    setRestaurantId(newRestaurantId);
    await saveCart(updatedItems, newRestaurantId);

    toast({
      title: 'Added to Cart',
      description: `${item.name} added to your cart`,
    });
  }, [cartItems, restaurantId, toast]);

  const removeFromCart = useCallback(async (itemId: string) => {
    const updatedItems = cartItems.filter(item => item.id !== itemId);
    setCartItems(updatedItems);
    
    if (updatedItems.length === 0) {
      setRestaurantId(null);
    }
    
    await saveCart(updatedItems, updatedItems.length > 0 ? restaurantId : null);
  }, [cartItems, restaurantId]);

  const updateCartItem = useCallback(async (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeFromCart(itemId);
      return;
    }

    const updatedItems = cartItems.map(item =>
      item.id === itemId ? { ...item, quantity } : item
    );
    setCartItems(updatedItems);
    await saveCart(updatedItems, restaurantId);
  }, [cartItems, restaurantId, removeFromCart]);

  const clearCart = useCallback(async () => {
    setCartItems([]);
    setRestaurantId(null);
    await saveCart([], null);
  }, []);

  const getCartTotal = useCallback(() => {
    return cartItems.reduce((total, item) => total + (item.price_cents * item.quantity), 0);
  }, [cartItems]);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        restaurantId,
        cartCount,
        addToCart,
        removeFromCart,
        updateCartItem,
        clearCart,
        getCartTotal,
        loading,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};


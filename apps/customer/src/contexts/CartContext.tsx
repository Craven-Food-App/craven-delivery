import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { openConfirmModal } from '@mantine/modals';
import { safeLocalStorage } from '@/utils/safeStorage';

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

const CART_STORAGE_KEY = 'customer_cart';
const RESTAURANT_STORAGE_KEY = 'customer_cart_restaurant';

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
      // First, try to load from localStorage (works even when not logged in)
      const localCartData = safeLocalStorage.getItem(CART_STORAGE_KEY);
      const localRestaurantId = safeLocalStorage.getItem(RESTAURANT_STORAGE_KEY);
      
      if (localCartData) {
        try {
          const parsedItems = JSON.parse(localCartData) as CartItem[];
          if (Array.isArray(parsedItems) && parsedItems.length > 0) {
            setCartItems(parsedItems);
            setRestaurantId(localRestaurantId);
          }
        } catch (e) {
          console.error('Error parsing localStorage cart:', e);
        }
      }

      // Then try to load from database if user is logged in
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
        const dbItems = Array.isArray(persistedCart.items) ? persistedCart.items as unknown as CartItem[] : [];
        // Prefer database cart if it exists and has items, otherwise keep localStorage cart
        if (dbItems.length > 0) {
          setCartItems(dbItems);
          setRestaurantId(persistedCart.restaurant_id || null);
          // Sync to localStorage
          safeLocalStorage.setItem(CART_STORAGE_KEY, JSON.stringify(dbItems));
          if (persistedCart.restaurant_id) {
            safeLocalStorage.setItem(RESTAURANT_STORAGE_KEY, persistedCart.restaurant_id);
          }
        }
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveCart = async (items: CartItem[], restaurantId: string | null) => {
    // Always save to localStorage first (works even when offline or not logged in)
    try {
      safeLocalStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      if (restaurantId) {
        safeLocalStorage.setItem(RESTAURANT_STORAGE_KEY, restaurantId);
      } else {
        safeLocalStorage.removeItem(RESTAURANT_STORAGE_KEY);
      }
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }

    // Also save to database if user is logged in
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
      console.error('Error saving cart to database:', error);
    }
  };

  const addToCart = useCallback(async (item: CartItem, newRestaurantId: string) => {
    // Check if cart has items from a different restaurant
    if (restaurantId && restaurantId !== newRestaurantId && cartItems.length > 0) {
      // Show confirmation modal with clearer messaging
      openConfirmModal({
        title: 'Start a New Cart?',
        children: (
          <div style={{ padding: '1rem 0' }}>
            <p style={{ marginBottom: '0.5rem' }}>
              You have items in your cart from a different restaurant.
            </p>
            <p style={{ marginBottom: '0.5rem', fontWeight: 500 }}>
              Would you like to start a new cart and add this item?
            </p>
            <p style={{ fontSize: '0.875rem', color: '#666' }}>
              Your current cart will be cleared.
            </p>
          </div>
        ),
        labels: { confirm: 'Start New Cart', cancel: 'Keep Current Cart' },
        confirmProps: { color: 'orange', variant: 'filled' },
        cancelProps: { variant: 'outline' },
        onConfirm: async () => {
          setCartItems([item]);
          setRestaurantId(newRestaurantId);
          await saveCart([item], newRestaurantId);
          toast({
            title: 'New Cart Started',
            description: `${item.name} added to your cart`,
          });
        },
        onCancel: () => {
          toast({
            title: 'Cart Unchanged',
            description: 'Your current cart items have been preserved',
            variant: 'default',
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
    // Also clear localStorage
    safeLocalStorage.removeItem(CART_STORAGE_KEY);
    safeLocalStorage.removeItem(RESTAURANT_STORAGE_KEY);
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


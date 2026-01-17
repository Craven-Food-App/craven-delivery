import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CartItem {
  id: string;
  name: string;
  price_cents: number;
  quantity: number;
  modifiers?: any[];
  special_instructions?: string;
}

interface Cart {
  items: CartItem[];
  restaurant_id: string;
  delivery_address?: any;
  special_instructions?: string;
}

export const useCartPersistence = () => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPersistedCart();
  }, []);

  const loadPersistedCart = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: persistedCart } = await supabase
        .from('customer_carts')
        .select('*')
        .eq('customer_id', user.id)
        .single();

      if (persistedCart) {
        setCart({
          items: Array.isArray(persistedCart.items) ? persistedCart.items as unknown as CartItem[] : [],
          restaurant_id: persistedCart.restaurant_id,
          delivery_address: persistedCart.delivery_address,
          special_instructions: persistedCart.special_instructions
        });
      }
    } catch (error) {
      console.error('Error loading persisted cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveCart = async (cartData: Cart) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('customer_carts')
        .upsert({
          customer_id: user.id,
          restaurant_id: cartData.restaurant_id,
          items: cartData.items as any,
          delivery_address: cartData.delivery_address as any,
          special_instructions: cartData.special_instructions
        });

      if (error) throw error;
      setCart(cartData);
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  };

  const clearCart = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('customer_carts')
        .delete()
        .eq('customer_id', user.id);

      if (error) throw error;
      setCart(null);
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };

  return {
    cart,
    loading,
    saveCart,
    clearCart,
    loadPersistedCart
  };
};
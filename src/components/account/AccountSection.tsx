import React, { useState, useEffect } from 'react';
import '../temp-fix';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { User, CreditCard, MapPin, Bell, Star, DollarSign, Clock, Package, ChevronRight, MessageCircle, Edit, Save, X, Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface UserProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  email?: string;
  avatar_url: string | null;
  role: string;
  preferences: any;
  settings: any;
}

interface PaymentMethod {
  id: string;
  provider: string;
  token: string;
  last4: string;
  brand: string;
  is_default: boolean;
  user_id?: string;
}

interface DeliveryAddress {
  id: string;
  label: string;
  name?: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  phone?: string;
  delivery_instructions?: string;
  is_default: boolean;
}

interface OrderHistory {
  id: string;
  restaurant_name: string;
  total_cents: number;
  order_status: string;
  created_at: string;
}

export const AccountSection = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [orderHistory, setOrderHistory] = useState<OrderHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [expandedView, setExpandedView] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [editingProfile, setEditingProfile] = useState({
    full_name: '',
    phone: '',
    email: ''
  });
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState({
    card_number: '',
    expiry_date: '',
    cvv: '',
    cardholder_name: '',
    billing_address: '',
    is_default: false
  });
  const [showDeliveryAddresses, setShowDeliveryAddresses] = useState(false);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    name: '',
    street_address: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    instructions: '',
    is_default: false
  });

  useEffect(() => {
    fetchAccountData();
  }, []);

  const fetchAccountData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Create a basic profile object for display
      const tempProfile: UserProfile = {
        id: user.id,
        full_name: user.email?.split('@')[0] || 'User',
        phone: null,
        avatar_url: null,
        role: 'customer',
        preferences: {},
        settings: {}
      };
      setProfile(tempProfile);

      // Try to fetch user profile with error handling (optional)
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
      } else if (profileData) {
        setProfile(profileData);
      }

      // Fetch payment methods with error handling
      try {
        const { data: paymentData, error: paymentError } = await supabase
          .from('payment_methods')
          .select('*')
          .eq('user_id', user.id)
          .order('is_default', { ascending: false });

        if (paymentError) {
          console.error('Error fetching payment methods:', paymentError);
        } else if (paymentData) {
          setPaymentMethods(paymentData.map((pm: any) => ({
            ...pm,
            exp_month: 12,
            exp_year: 2025
          })));
        }
      } catch (error) {
        console.error('Error fetching payment methods:', error);
      }

      // Fetch delivery addresses with error handling
      try {
        const { data: addressData, error: addressError } = await supabase
          .from('delivery_addresses')
          .select('*')
          .eq('user_id', user.id)
          .order('is_default', { ascending: false });

        if (addressError) {
          console.error('Error fetching addresses:', addressError);
        } else if (addressData) {
          setAddresses(addressData);
        }
      } catch (error) {
        console.error('Error fetching addresses:', error);
      }

      // Fetch order history with error handling
      try {
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('customer_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (orderError) {
          console.error('Error fetching orders:', orderError);
        } else if (orderData) {
          const formattedOrders = orderData.map((order: any) => ({
            id: order.id,
            restaurant_name: 'Restaurant',
            total_cents: order.total_cents || 0,
            order_status: order.order_status || 'pending',
            created_at: order.created_at
          }));
          setOrderHistory(formattedOrders);
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
      }

    } catch (error) {
      console.error('Error fetching account data:', error);
      // Don't show error toast for basic profile loading
      // The component will still render with basic profile info
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    setUpdating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to update your profile",
          variant: "destructive"
        });
        return;
      }

      // Check if profile exists first
      const { data: existingProfile, error: checkError } = await supabase
        .from('user_profiles')
        .select('id, user_id, role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking profile:', checkError);
        throw checkError;
      }

      // Remove email from updates if present (email is in auth.users, not user_profiles)
      const { email, ...profileUpdates } = updates as any;
      
      const updateData = {
        ...profileUpdates,
        updated_at: new Date().toISOString()
      };

      let result;
      if (existingProfile) {
        // Update existing profile
        result = await supabase
          .from('user_profiles')
          .update(updateData)
          .eq('user_id', user.id)
          .select()
          .single();
      } else {
        // Create new profile with required fields
        result = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            role: 'customer', // Required field
            preferences: {},
            settings: {},
            ...profileUpdates
          })
          .select()
          .single();
      }

      if (result.error) {
        console.error('Profile operation error:', result.error);
        throw result.error;
      }

      if (result.data) {
        setProfile(result.data);
      }

      toast({
        title: "Success",
        description: "Profile updated successfully"
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      const errorMessage = error?.message || error?.details || 'Failed to update profile. Please try again.';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      
      // On mobile, redirect to restaurants landing page; otherwise go to auth
      const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile) {
        window.location.href = '/restaurants';
      } else {
        window.location.href = '/auth';
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive"
      });
    }
  };

  const openProfileEdit = () => {
    setEditingProfile({
      full_name: profile?.full_name || '',
      phone: profile?.phone || '',
      email: profile?.email || ''
    });
    setShowProfileEdit(true);
  };

  const saveProfileEdit = async () => {
    setUpdating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to update your profile",
          variant: "destructive"
        });
        return;
      }

      // Check if profile exists first
      const { data: existingProfile, error: checkError } = await supabase
        .from('user_profiles')
        .select('id, user_id, role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking profile:', checkError);
        throw checkError;
      }

      const updateData: any = {
        full_name: editingProfile.full_name || null,
        phone: editingProfile.phone || null,
        updated_at: new Date().toISOString()
      };

      let result;
      if (existingProfile) {
        // Update existing profile
        result = await supabase
          .from('user_profiles')
          .update(updateData)
          .eq('user_id', user.id)
          .select()
          .single();
      } else {
        // Create new profile with required role field
        result = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            full_name: editingProfile.full_name || null,
            phone: editingProfile.phone || null,
            role: 'customer', // Required field
            preferences: {},
            settings: {}
          })
          .select()
          .single();
      }

      if (result.error) {
        console.error('Profile operation error:', result.error);
        throw result.error;
      }

      if (result.data) {
        setProfile(result.data);
      }

      setShowProfileEdit(false);
      
      toast({
        title: "Success",
        description: "Profile updated successfully"
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      const errorMessage = error?.message || error?.details || 'Failed to update profile. Please try again.';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const openPaymentMethods = () => {
    setShowPaymentMethods(true);
  };

  const openAddPayment = () => {
    setNewPaymentMethod({
      card_number: '',
      expiry_date: '',
      cvv: '',
      cardholder_name: '',
      billing_address: '',
      is_default: false
    });
    setShowAddPayment(true);
  };

  const addPaymentMethod = async () => {
    if (!newPaymentMethod.card_number || !newPaymentMethod.expiry_date || !newPaymentMethod.cvv || !newPaymentMethod.cardholder_name) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setUpdating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('payment_methods')
        .insert({
          provider: 'card',
          token: `card_${Date.now()}`, // In production, this would come from a payment processor
          last4: newPaymentMethod.card_number.replace(/\s/g, '').slice(-4),
          brand: newPaymentMethod.cardholder_name || 'Card',
          is_default: newPaymentMethod.is_default || paymentMethods.length === 0
        });

      if (error) throw error;

      // Refresh payment methods
      await fetchAccountData();
      setShowAddPayment(false);
      
      toast({
        title: "Success",
        description: "Payment method added successfully"
      });
    } catch (error) {
      console.error('Error adding payment method:', error);
      toast({
        title: "Error",
        description: "Failed to add payment method",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const removePaymentMethod = async (paymentId: string) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;

      // Refresh payment methods
      await fetchAccountData();
      
      toast({
        title: "Success",
        description: "Payment method removed successfully"
      });
    } catch (error) {
      console.error('Error removing payment method:', error);
      toast({
        title: "Error",
        description: "Failed to remove payment method",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const setDefaultPaymentMethod = async (paymentId: string) => {
    setUpdating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // First, set all payment methods to not default
      await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('user_id', user.id);

      // Then set the selected one as default
      const { error } = await supabase
        .from('payment_methods')
        .update({ is_default: true })
        .eq('id', paymentId);

      if (error) throw error;

      // Refresh payment methods
      await fetchAccountData();
      
      toast({
        title: "Success",
        description: "Default payment method updated"
      });
    } catch (error) {
      console.error('Error setting default payment method:', error);
      toast({
        title: "Error",
        description: "Failed to update default payment method",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const openDeliveryAddresses = () => {
    setShowDeliveryAddresses(true);
  };

  const openAddAddress = () => {
    setNewAddress({
      name: '',
      street_address: '',
      city: '',
      state: '',
      zip_code: '',
      phone: '',
      instructions: '',
      is_default: false
    });
    setShowAddAddress(true);
  };

  const addDeliveryAddress = async () => {
    if (!newAddress.name || !newAddress.street_address || !newAddress.city || !newAddress.state || !newAddress.zip_code) {
      toast({
        title: "Error",
        description: "Please fill in all required address fields",
        variant: "destructive"
      });
      return;
    }

    setUpdating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to add delivery addresses",
          variant: "destructive"
        });
        return;
      }

      console.log('Adding delivery address for user:', user.id);
      console.log('Address data:', {
        user_id: user.id,
        label: newAddress.name,
        street_address: newAddress.street_address,
        city: newAddress.city,
        state: newAddress.state,
        zip_code: newAddress.zip_code,
        is_default: newAddress.is_default || addresses.length === 0
      });

      const { data, error } = await supabase
        .from('delivery_addresses')
        .insert({
          user_id: user.id,
          label: newAddress.name,
          street_address: newAddress.street_address,
          city: newAddress.city,
          state: newAddress.state,
          zip_code: newAddress.zip_code,
          is_default: newAddress.is_default || addresses.length === 0
        })
        .select();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('Successfully inserted:', data);

      // Refresh addresses
      await fetchAccountData();
      setShowAddAddress(false);
      
      toast({
        title: "Success",
        description: "Delivery address added successfully"
      });
    } catch (error) {
      console.error('Error adding delivery address:', error);
      toast({
        title: "Error",
        description: "Failed to add delivery address",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const removeDeliveryAddress = async (addressId: string) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('delivery_addresses')
        .delete()
        .eq('id', addressId);

      if (error) throw error;

      // Refresh addresses
      await fetchAccountData();
      
      toast({
        title: "Success",
        description: "Delivery address removed successfully"
      });
    } catch (error) {
      console.error('Error removing delivery address:', error);
      toast({
        title: "Error",
        description: "Failed to remove delivery address",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const setDefaultDeliveryAddress = async (addressId: string) => {
    setUpdating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // First, set all addresses to not default
      await supabase
        .from('delivery_addresses')
        .update({ is_default: false })
        .eq('user_id', user.id);

      // Then set the selected one as default
      const { error } = await supabase
        .from('delivery_addresses')
        .update({ is_default: true })
        .eq('id', addressId);

      if (error) throw error;

      // Refresh addresses
      await fetchAccountData();
      
      toast({
        title: "Success",
        description: "Default delivery address updated"
      });
    } catch (error) {
      console.error('Error setting default delivery address:', error);
      toast({
        title: "Error",
        description: "Failed to update default delivery address",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* DoorDash-style Mobile Account Page */}
      <div className="lg:hidden bg-white min-h-screen">
        {/* Header */}
        <div className="px-4 py-6 bg-white">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile?.avatar_url || ''} />
              <AvatarFallback className="bg-gradient-to-br from-red-500 to-red-600 text-white text-xl font-semibold">
                {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{profile?.full_name || 'User'}</h1>
              <p className="text-gray-600">Member since 2024</p>
            </div>
          </div>
        </div>

        {/* Account Menu */}
        <div className="px-4 space-y-1">
          {/* Profile Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <button 
              onClick={openProfileEdit}
              className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Account Details</p>
                  <p className="text-sm text-gray-600">Edit your personal information</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Payment Methods */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <button 
              onClick={openPaymentMethods}
              className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Payment Methods</p>
                  <p className="text-sm text-gray-600">{paymentMethods.length > 0 ? `${paymentMethods.length} saved` : 'Add payment method'}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Delivery Addresses */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <button 
              onClick={openDeliveryAddresses}
              className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Delivery Addresses</p>
                  <p className="text-sm text-gray-600">{addresses.length > 0 ? `${addresses.length} saved` : 'Add delivery address'}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Order History */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <button 
              onClick={() => navigate('/customer-dashboard?tab=orders')}
              className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Package className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Order History</p>
                  <p className="text-sm text-gray-600">{orderHistory.length > 0 ? `${orderHistory.length} orders` : 'No orders yet'}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <button 
              onClick={() => toast({ title: "Notifications", description: "Notification preferences feature coming soon!" })}
              className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Bell className="w-5 h-5 text-yellow-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Notifications</p>
                  <p className="text-sm text-gray-600">Manage your preferences</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Help & Support */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <button 
              onClick={() => toast({ title: "Help & Support", description: "Customer support feature coming soon!" })}
              className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Help & Support</p>
                  <p className="text-sm text-gray-600">Get help with your orders</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Sign Out */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <button 
              onClick={handleSignOut}
              className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-red-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-red-600">Sign Out</p>
                  <p className="text-sm text-gray-600">Sign out of your account</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Bottom Spacing */}
        <div className="h-20"></div>
      </div>

      {/* Desktop Version - DoorDash Style */}
      <div className="hidden lg:block max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center space-x-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile?.avatar_url || ''} />
              <AvatarFallback className="bg-gradient-to-br from-red-500 to-red-600 text-white text-2xl font-semibold">
                {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{profile?.full_name || 'User'}</h1>
              <p className="text-gray-600 text-lg">Member since 2024</p>
              <p className="text-gray-500">{profile?.phone || 'No phone number'}</p>
            </div>
          </div>
        </div>

        {/* Account Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Account Details */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <span>Account Details</span>
              </CardTitle>
              <CardDescription>Edit your personal information</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={openProfileEdit}
              >
                Edit Profile
              </Button>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <span>Payment Methods</span>
              </CardTitle>
              <CardDescription>{paymentMethods.length > 0 ? `${paymentMethods.length} saved` : 'Add payment method'}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={openPaymentMethods}
              >
                Manage Payment
              </Button>
            </CardContent>
          </Card>

          {/* Delivery Addresses */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <span>Delivery Addresses</span>
              </CardTitle>
              <CardDescription>{addresses.length > 0 ? `${addresses.length} saved` : 'Add delivery address'}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={openDeliveryAddresses}
              >
                Manage Addresses
              </Button>
            </CardContent>
          </Card>

          {/* Order History */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Package className="w-5 h-5 text-purple-600" />
                </div>
                <span>Order History</span>
              </CardTitle>
              <CardDescription>{orderHistory.length > 0 ? `${orderHistory.length} orders` : 'No orders yet'}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/customer-dashboard?tab=orders')}
              >
                View Orders
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Profile Edit Dialog */}
      <Dialog open={showProfileEdit} onOpenChange={setShowProfileEdit}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="full_name" className="text-sm font-medium text-gray-700">Full Name</Label>
              <Input
                id="full_name"
                value={editingProfile.full_name}
                onChange={(e) => setEditingProfile(prev => ({ ...prev, full_name: e.target.value }))}
                className="mt-1"
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <Label htmlFor="phone" className="text-sm font-medium text-gray-700">Phone Number</Label>
              <Input
                id="phone"
                value={editingProfile.phone}
                onChange={(e) => setEditingProfile(prev => ({ ...prev, phone: e.target.value }))}
                className="mt-1"
                placeholder="Enter your phone number"
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email Address</Label>
              <Input
                id="email"
                value={editingProfile.email}
                onChange={(e) => setEditingProfile(prev => ({ ...prev, email: e.target.value }))}
                className="mt-1"
                placeholder="Enter your email address"
                disabled
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>
            <div className="flex space-x-3 pt-4">
              <Button
                onClick={() => setShowProfileEdit(false)}
                variant="outline"
                className="flex-1"
                disabled={updating}
              >
                Cancel
              </Button>
              <Button
                onClick={saveProfileEdit}
                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                disabled={updating}
              >
                {updating ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Methods Management Dialog */}
      <Dialog open={showPaymentMethods} onOpenChange={setShowPaymentMethods}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">Payment Methods</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Add New Payment Method Button */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Saved Payment Methods</h3>
              <Button
                onClick={openAddPayment}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
              >
                Add New Card
              </Button>
            </div>

            {/* Payment Methods List */}
            {paymentMethods.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No payment methods saved</p>
                <p className="text-sm text-gray-400">Add a payment method to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {paymentMethods.map((payment) => (
                  <div key={payment.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {payment.brand || payment.provider} •••• {payment.last4 || '****'}
                          </p>
                          <p className="text-sm text-gray-600">
                            {payment.provider}
                          </p>
                          {payment.is_default && (
                            <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs mt-1">
                              Default
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {!payment.is_default && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDefaultPaymentMethod(payment.id)}
                            disabled={updating}
                          >
                            Set Default
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removePaymentMethod(payment.id)}
                          disabled={updating}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Payment Method Dialog */}
      <Dialog open={showAddPayment} onOpenChange={setShowAddPayment}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">Add Payment Method</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="card_number" className="text-sm font-medium text-gray-700">Card Number</Label>
              <Input
                id="card_number"
                value={newPaymentMethod.card_number}
                onChange={(e) => {
                  let value = e.target.value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
                  if (value.length <= 19) {
                    setNewPaymentMethod(prev => ({ ...prev, card_number: value }));
                  }
                }}
                className="mt-1"
                placeholder="1234 5678 9012 3456"
                maxLength={19}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expiry_date" className="text-sm font-medium text-gray-700">Expiry Date</Label>
                <Input
                  id="expiry_date"
                  value={newPaymentMethod.expiry_date}
                  onChange={(e) => {
                    let value = e.target.value.replace(/\D/g, '');
                    if (value.length >= 2) {
                      value = value.slice(0, 2) + '/' + value.slice(2, 4);
                    }
                    setNewPaymentMethod(prev => ({ ...prev, expiry_date: value }));
                  }}
                  className="mt-1"
                  placeholder="MM/YY"
                  maxLength={5}
                />
              </div>
              <div>
                <Label htmlFor="cvv" className="text-sm font-medium text-gray-700">CVV</Label>
                <Input
                  id="cvv"
                  value={newPaymentMethod.cvv}
                  onChange={(e) => {
                    let value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setNewPaymentMethod(prev => ({ ...prev, cvv: value }));
                  }}
                  className="mt-1"
                  placeholder="123"
                  maxLength={4}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="cardholder_name" className="text-sm font-medium text-gray-700">Cardholder Name</Label>
              <Input
                id="cardholder_name"
                value={newPaymentMethod.cardholder_name}
                onChange={(e) => setNewPaymentMethod(prev => ({ ...prev, cardholder_name: e.target.value }))}
                className="mt-1"
                placeholder="Enter cardholder name"
              />
            </div>
            <div>
              <Label htmlFor="billing_address" className="text-sm font-medium text-gray-700">Billing Address (Optional)</Label>
              <Input
                id="billing_address"
                value={newPaymentMethod.billing_address}
                onChange={(e) => setNewPaymentMethod(prev => ({ ...prev, billing_address: e.target.value }))}
                className="mt-1"
                placeholder="Enter billing address"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_default"
                checked={newPaymentMethod.is_default}
                onChange={(e) => setNewPaymentMethod(prev => ({ ...prev, is_default: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <Label htmlFor="is_default" className="text-sm text-gray-700">Set as default payment method</Label>
            </div>
            <div className="flex space-x-3 pt-4">
              <Button
                onClick={() => setShowAddPayment(false)}
                variant="outline"
                className="flex-1"
                disabled={updating}
              >
                Cancel
              </Button>
              <Button
                onClick={addPaymentMethod}
                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                disabled={updating}
              >
                {updating ? 'Adding...' : 'Add Card'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delivery Addresses Management Dialog */}
      <Dialog open={showDeliveryAddresses} onOpenChange={setShowDeliveryAddresses}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">Delivery Addresses</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Add New Address Button */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Saved Delivery Addresses</h3>
              <Button
                onClick={openAddAddress}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
              >
                Add New Address
              </Button>
            </div>

            {/* Addresses List */}
            {addresses.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No delivery addresses saved</p>
                <p className="text-sm text-gray-400">Add a delivery address to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {addresses.map((address) => (
                  <div key={address.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                          <MapPin className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-semibold text-gray-900">{address.label || 'Address'}</p>
                            {address.is_default && (
                              <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs">
                                Default
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {address.street_address}
                          </p>
                          <p className="text-sm text-gray-600">
                            {address.city}, {address.state} {address.zip_code}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {!address.is_default && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDefaultDeliveryAddress(address.id)}
                            disabled={updating}
                          >
                            Set Default
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeDeliveryAddress(address.id)}
                          disabled={updating}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Delivery Address Dialog */}
      <Dialog open={showAddAddress} onOpenChange={setShowAddAddress}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">Add Delivery Address</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="address_name" className="text-sm font-medium text-gray-700">Address Name</Label>
              <Input
                id="address_name"
                value={newAddress.name}
                onChange={(e) => setNewAddress(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1"
                placeholder="e.g., Home, Work, Apartment"
              />
            </div>
            <div>
              <Label htmlFor="street_address" className="text-sm font-medium text-gray-700">Street Address</Label>
              <Input
                id="street_address"
                value={newAddress.street_address}
                onChange={(e) => setNewAddress(prev => ({ ...prev, street_address: e.target.value }))}
                className="mt-1"
                placeholder="123 Main Street"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city" className="text-sm font-medium text-gray-700">City</Label>
                <Input
                  id="city"
                  value={newAddress.city}
                  onChange={(e) => setNewAddress(prev => ({ ...prev, city: e.target.value }))}
                  className="mt-1"
                  placeholder="City"
                />
              </div>
              <div>
                <Label htmlFor="state" className="text-sm font-medium text-gray-700">State</Label>
                <Input
                  id="state"
                  value={newAddress.state}
                  onChange={(e) => setNewAddress(prev => ({ ...prev, state: e.target.value }))}
                  className="mt-1"
                  placeholder="State"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="zip_code" className="text-sm font-medium text-gray-700">ZIP Code</Label>
              <Input
                id="zip_code"
                value={newAddress.zip_code}
                onChange={(e) => {
                  let value = e.target.value.replace(/\D/g, '').slice(0, 5);
                  setNewAddress(prev => ({ ...prev, zip_code: value }));
                }}
                className="mt-1"
                placeholder="12345"
                maxLength={5}
              />
            </div>
            <div>
              <Label htmlFor="address_phone" className="text-sm font-medium text-gray-700">Phone Number (Optional)</Label>
              <Input
                id="address_phone"
                value={newAddress.phone}
                onChange={(e) => {
                  let value = e.target.value.replace(/\D/g, '');
                  if (value.length <= 10) {
                    setNewAddress(prev => ({ ...prev, phone: value }));
                  }
                }}
                className="mt-1"
                placeholder="(555) 123-4567"
                maxLength={10}
              />
            </div>
            <div>
              <Label htmlFor="delivery_instructions" className="text-sm font-medium text-gray-700">Delivery Instructions (Optional)</Label>
              <Input
                id="delivery_instructions"
                value={newAddress.instructions}
                onChange={(e) => setNewAddress(prev => ({ ...prev, instructions: e.target.value }))}
                className="mt-1"
                placeholder="e.g., Ring doorbell, Leave at door"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="address_is_default"
                checked={newAddress.is_default}
                onChange={(e) => setNewAddress(prev => ({ ...prev, is_default: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <Label htmlFor="address_is_default" className="text-sm text-gray-700">Set as default delivery address</Label>
            </div>
            <div className="flex space-x-3 pt-4">
              <Button
                onClick={() => setShowAddAddress(false)}
                variant="outline"
                className="flex-1"
                disabled={updating}
              >
                Cancel
              </Button>
              <Button
                onClick={addDeliveryAddress}
                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                disabled={updating}
              >
                {updating ? 'Adding...' : 'Add Address'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* End of Account Section */}
    </div>
  );
};

export default AccountSection;
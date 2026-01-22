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
import { User, CreditCard, MapPin, Bell, Star, DollarSign, Clock, Package, ChevronRight, MessageCircle, Edit, Save, X, Camera, Smartphone } from 'lucide-react';
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
    navigate('/account/edit-profile');
  };


  const openPaymentMethods = () => {
    navigate('/account/payment-methods');
  };



  const openDeliveryAddresses = () => {
    navigate('/account/delivery-addresses');
  };

  const openTesterHub = () => {
    navigate('/tester-hub');
  };


  const getDisplayName = (fullName: string | null | undefined) => {
    if (!fullName) return 'User';
    const parts = fullName.trim().split(' ');
    const first = parts[0] || '';
    const lastInitial = parts.length > 1 ? `${parts[1].charAt(0).toUpperCase()}.` : '';
    return lastInitial ? `${first} ${lastInitial}` : first;
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
              <h1 className="text-2xl font-bold text-gray-900">
                {getDisplayName(profile?.full_name)}
              </h1>
              <p className="text-gray-600">Member since 2024</p>
            </div>
          </div>
        </div>

        {/* Account Menu - Full Width Edge-to-Edge */}
        <div className="bg-white">
          {/* Profile Section */}
          <button 
            onClick={openProfileEdit}
            className="w-full px-4 py-4 flex items-center justify-between hover:bg-white transition-colors border-b border-gray-200"
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

          {/* Payment Methods */}
          <button 
            onClick={openPaymentMethods}
            className="w-full px-4 py-4 flex items-center justify-between hover:bg-white transition-colors border-b border-gray-200"
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

          {/* Delivery Addresses */}
          <button 
            onClick={openDeliveryAddresses}
            className="w-full px-4 py-4 flex items-center justify-between hover:bg-white transition-colors border-b border-gray-200"
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

          {/* Order History */}
          <button 
            onClick={() => navigate('/order-history')}
            className="w-full px-4 py-4 flex items-center justify-between hover:bg-white transition-colors border-b border-gray-200"
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

          {/* CraveMore */}
          <button 
            onClick={() => navigate('/crave-more-subscription')}
            className="w-full px-4 py-4 flex items-center justify-between hover:bg-white transition-colors border-b border-gray-200"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
                <Star className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900">CraveMore/Get More with $0 delivery</p>
                <p className="text-sm text-gray-600">Unlock exclusive benefits</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          {/* My Credits */}
          <button 
            onClick={() => navigate('/my-credits')}
            className="w-full px-4 py-4 flex items-center justify-between hover:bg-white transition-colors border-b border-gray-200"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900">My Credits</p>
                <p className="text-sm text-gray-600">View and redeem your credits</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          {/* Invite Friends to Earn Credits */}
          <button 
            onClick={() => navigate('/invite-friends')}
            className="w-full px-4 py-4 flex items-center justify-between hover:bg-white transition-colors border-b border-gray-200"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                <Star className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900">Invite friends to earn credits</p>
                <p className="text-sm text-gray-600">Share Crave’n and get rewarded</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          {/* Notifications Settings */}
          <button 
            onClick={() => navigate('/notification-settings')}
            className="w-full px-4 py-4 flex items-center justify-between hover:bg-white transition-colors border-b border-gray-200"
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

          {/* Help & Support */}
          <button 
            onClick={() => navigate('/customer-support')}
            className="w-full px-4 py-4 flex items-center justify-between hover:bg-white transition-colors border-b border-gray-200"
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
              <h1 className="text-3xl font-bold text-gray-900">
                {getDisplayName(profile?.full_name)}
              </h1>
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
                onClick={() => navigate('/order-history')}
              >
                View Orders
              </Button>
            </CardContent>
          </Card>

          {/* Tester Hub */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
                <span>Early Access Hub</span>
              </CardTitle>
              <CardDescription>Track your tester progress and rewards</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={openTesterHub}
              >
                Open Tester Hub
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>




      {/* End of Account Section */}
    </div>
  );
};

export default AccountSection;
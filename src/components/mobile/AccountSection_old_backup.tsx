// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { User, Car, CheckCircle, AlertCircle, DollarSign, Settings, Bell, Shield, CreditCard, FileText, Edit, LogOut, ChevronRight, Star, UserPlus, HelpCircle, MessageCircle, Archive, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ProfileSection } from './ProfileSection';
import { PaymentMethodsSection } from './PaymentMethodsSection';
import { AppSettingsSection } from './AppSettingsSection';
import { VehicleManagementSection } from './VehicleManagementSection';
import { SafeDrivingSection } from './SafeDrivingSection';
import { DriverPreferencesPage } from './DriverPreferencesPage';
import { InstantCashoutModal } from './InstantCashoutModal';
type VehicleType = 'car' | 'bike' | 'scooter' | 'walk' | 'motorcycle';
interface CraverProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  vehicle_type: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_color?: string;
  profile_photo?: string;
}
export const AccountSection: React.FC<{
  activeTab: 'home' | 'schedule' | 'earnings' | 'notifications' | 'account';
  onTabChange: (tab: 'home' | 'schedule' | 'earnings' | 'notifications' | 'account') => void;
}> = ({
  activeTab,
  onTabChange
}) => {
  const [profile, setProfile] = useState<CraverProfile | null>(null);
  const [driverStats, setDriverStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isReferralEligible, setIsReferralEligible] = useState(false);
  const [driverStartDate, setDriverStartDate] = useState<Date | null>(null);
  const [currentSection, setCurrentSection] = useState<'main' | 'profile' | 'payments' | 'settings' | 'vehicle' | 'safety' | 'preferences'>('main');
  const [notifications, setNotifications] = useState(true);
  const [locationSharing, setLocationSharing] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('car');
  const [docsStatus, setDocsStatus] = useState<Record<VehicleType, boolean>>({
    car: false,
    bike: false,
    scooter: false,
    walk: false,
    motorcycle: false
  });
  const [showCashoutModal, setShowCashoutModal] = useState(false);
  const [availableCashout, setAvailableCashout] = useState(0);
  const {
    toast
  } = useToast();
  useEffect(() => {
    fetchProfile();
  }, []);
  const fetchProfile = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get feeder application
      const {
        data: application
      } = await supabase.from('feeder_applications').select('*').eq('user_id', user.id).single();

      // Get driver profile and stats
      const {
        data: driverProfile
      } = await supabase.from('driver_profiles').select('total_deliveries, rating').eq('user_id', user.id).single();

      // Get recent earnings (this week)
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);

      // Get today's orders for available cashout
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data: todayOrders } = await supabase
        .from('orders')
        .select('payout_cents')
        .eq('driver_id', user.id)
        .eq('order_status', 'delivered')
        .gte('created_at', todayStart.toISOString());

      const { data: weekOrders } = await supabase
        .from('orders')
        .select('payout_cents')
        .eq('driver_id', user.id)
        .eq('order_status', 'delivered')
        .gte('created_at', weekStart.toISOString());

      const weekEarnings = weekOrders?.reduce((sum, order) => sum + order.payout_cents, 0) || 0;
      const todayEarnings = todayOrders?.reduce((sum, order) => sum + order.payout_cents, 0) || 0;
      
      // Calculate available instant cashout (today's earnings minus $10 minimum)
      const availableForCashout = Math.max(0, (todayEarnings / 100) - 10);
      setAvailableCashout(availableForCashout);
      if (application) {
        setProfile({
          id: user.id,
          first_name: application.first_name,
          last_name: application.last_name,
          email: application.email,
          phone: application.phone,
          status: application.status,
          vehicle_type: application.vehicle_type,
          vehicle_make: application.vehicle_make,
          vehicle_model: application.vehicle_model,
          vehicle_color: application.vehicle_color,
          profile_photo: application.profile_photo
        });
        setDriverStats({
          weekEarnings: weekEarnings / 100,
          todayEarnings: todayEarnings / 100,
          totalDeliveries: driverProfile?.total_deliveries || 0,
          rating: driverProfile?.rating || 0
        });

        // Calculate referral eligibility
        const totalDeliveries = driverProfile?.total_deliveries || 0;
        const startDate = new Date(application.created_at);
        const daysSinceStart = Math.floor((new Date().getTime() - startDate.getTime()) / (1000 * 3600 * 24));
        
        setDriverStartDate(startDate);
        setIsReferralEligible(totalDeliveries >= 30 && daysSinceStart >= 30);

        // Map vehicle type and set docs status
        const vehicleTypeMapping: Record<string, VehicleType> = {
          'car': 'car',
          'bike': 'bike',
          'scooter': 'scooter',
          'motorcycle': 'motorcycle',
          'walking': 'walk'
        };
        const mappedVehicleType = vehicleTypeMapping[application.vehicle_type] || 'car';
        setSelectedVehicle(mappedVehicleType);

        // Set document status based on application data
        const newDocsStatus: Record<VehicleType, boolean> = {
          car: false,
          bike: false,
          scooter: false,
          walk: true,
          motorcycle: false
        };
        if (application.vehicle_type !== 'walking') {
          const hasRequiredDocs = !!(application.drivers_license_front && application.drivers_license_back && (application.vehicle_type === 'bike' || application.insurance_document && application.vehicle_registration));
          newDocsStatus[mappedVehicleType] = hasRequiredDocs;
        }
        setDocsStatus(newDocsStatus);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of your account"
      });
      // Redirect to mobile welcome screen (not driver-auth)
      window.location.href = '/mobile';
    } catch (error) {
      toast({
        title: "Error signing out",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500';
      case 'rejected':
        return 'bg-red-500';
      case 'under_review':
        return 'bg-blue-500';
      default:
        return 'bg-yellow-500';
    }
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const handleReferralClick = () => {
    if (isReferralEligible) {
      toast({
        title: "Referral Program",
        description: "Refer friends and earn rewards! Feature coming soon.",
      });
    } else {
      toast({
        title: "Not Eligible Yet",
        description: "Complete 30 deliveries and be active for 30 days to become eligible.",
        variant: "destructive"
      });
    }
  };

  const handleProfileClick = () => {
    setCurrentSection('profile');
  };

  const handlePaymentMethodsClick = () => {
    setCurrentSection('payments');
  };

  const handleAppSettingsClick = () => {
    setCurrentSection('settings');
  };

  const handleVehicleManagementClick = () => {
    setCurrentSection('vehicle');
  };

  const handleSafeDrivingClick = () => {
    setCurrentSection('safety');
  };

  const handlePreferencesClick = () => {
    setCurrentSection('preferences');
  };
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-20 w-20 bg-muted rounded-full mx-auto"></div>
            <div className="h-4 w-32 bg-muted rounded mx-auto"></div>
            <div className="h-3 w-24 bg-muted rounded mx-auto"></div>
          </div>
        </div>
      </div>;
  }

  // Render sub-sections
  if (currentSection === 'profile') {
    return <ProfileSection onBack={() => setCurrentSection('main')} />;
  }

  if (currentSection === 'payments') {
    return <PaymentMethodsSection onBack={() => setCurrentSection('main')} />;
  }

  if (currentSection === 'settings') {
    return <AppSettingsSection onBack={() => setCurrentSection('main')} />;
  }

  if (currentSection === 'vehicle') {
    return <VehicleManagementSection onBack={() => setCurrentSection('main')} />;
  }

  if (currentSection === 'safety') {
    return <SafeDrivingSection onBack={() => setCurrentSection('main')} />;
  }

  if (currentSection === 'preferences') {
    return <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-4 safe-area-top">
        <button onClick={() => setCurrentSection('main')} className="flex items-center text-slate-700 hover:text-slate-900">
          <ChevronRight className="h-5 w-5 rotate-180 mr-2" />
          <span className="font-medium">Back to Account</span>
        </button>
      </div>
      <DriverPreferencesPage />
    </div>;
  }
  return <div className="min-h-screen bg-slate-50 pb-20 overflow-y-auto">
      <div className="max-w-md mx-auto">
        {/* Header - Clean Style */}
        <div className="bg-white px-4 pt-6 pb-4">
          <h1 className="text-3xl font-bold text-slate-900 mb-2 text-right">Account</h1>
          <p className="text-sm text-slate-600 text-right">Manage your profile and settings</p>
        </div>

        {/* Profile Header with Stats */}
        <div className="px-4 py-6 bg-background">
          <div className="flex items-center space-x-4 mb-6">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile?.profile_photo} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                {profile?.first_name?.[0]}{profile?.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-foreground">
                {profile?.first_name} {profile?.last_name}
              </h2>
              <p className="text-sm text-muted-foreground capitalize">Driver</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-4">
              <div className="text-2xl font-bold text-green-600 dark:text-green-500">
                ${driverStats?.weekEarnings?.toFixed(2) || '0.00'}
              </div>
              <div className="text-sm text-green-700 dark:text-green-400">This week</div>
              <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                Today: ${driverStats?.todayEarnings?.toFixed(2) || '0.00'}
              </div>
              {availableCashout > 0.50 && (
                <Button 
                  size="sm" 
                  className="mt-2 h-8 bg-green-600 hover:bg-green-700 text-white text-xs px-3"
                  onClick={() => setShowCashoutModal(true)}
                >
                  Cash Out ${availableCashout.toFixed(2)}
                </Button>
              )}
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl p-4 flex items-center">
              <Star className="h-6 w-6 text-orange-500 mr-2" />
              <div>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-500">
                  {driverStats?.rating?.toFixed(1) || '5.0'}
                </div>
                <div className="text-sm text-orange-700 dark:text-orange-400">Rating</div>
              </div>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="space-y-0">
          {/* Refer a friend */}
          <button onClick={handleReferralClick} className="w-full">
            <div className="px-4 py-4 bg-background border-b border-border/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserPlus className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium text-foreground">Refer a friend to satisfy a Cave'n</h3>
                    <p className="text-sm text-muted-foreground">
                      {isReferralEligible ? 'Eligible' : 'Currently ineligible'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </button>

          {/* Profile */}
          <button onClick={handleProfileClick} className="w-full">
            <div className="px-4 py-4 bg-background border-b border-border/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">Profile</h3>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </button>

          {/* Payment methods */}
          <button onClick={handlePaymentMethodsClick} className="w-full">
            <div className="px-4 py-4 bg-background border-b border-border/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Wallet className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">Payment methods</h3>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </button>

          {/* Feeder Card */}
          

          {/* App Settings */}
          <button onClick={handleAppSettingsClick} className="w-full">
            <div className="px-4 py-4 bg-background border-b border-border/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">App Settings</h3>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </button>

          {/* Vehicle management */}
          <button onClick={handleVehicleManagementClick} className="w-full">
            <div className="px-4 py-4 bg-background border-b border-border/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Car className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">Vehicle management</h3>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </button>

          {/* Safe driving features */}
          <button onClick={handleSafeDrivingClick} className="w-full">
            <div className="px-4 py-4 bg-background border-b border-border/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">Safe driving features</h3>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </button>

          {/* Preferences */}
          <button onClick={handlePreferencesClick} className="w-full">
            <div className="px-4 py-4 bg-background border-b border-border/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <Settings className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">Preferences</h3>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </button>

          {/* Log Out */}
          <div className="px-4 py-4 bg-background">
            <button onClick={handleSignOut} className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <LogOut className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Log Out</h3>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Version Info */}
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">Version 2.392.0 Build 323526</p>
        </div>
      </div>

      {/* Instant Cashout Modal */}
      <InstantCashoutModal
        isOpen={showCashoutModal}
        onClose={() => setShowCashoutModal(false)}
        availableAmount={availableCashout}
        onSuccess={() => {
          // Refresh driver stats after successful cashout
          fetchProfile();
        }}
      />
    </div>;
};
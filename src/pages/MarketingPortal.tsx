import React, { useState, useEffect } from 'react';
import { MarketingAccessGuard } from '@/components/MarketingAccessGuard';
import { PromoCodeManager } from '@/components/admin/PromoCodeManager';
import { PromotionalBannerManager } from '@/components/admin/PromotionalBannerManager';
import { HeroImageManager } from '@/components/admin/HeroImageManager';
import { FeederHeroImageManager } from '@/components/admin/FeederHeroImageManager';
import { PartnerHeroImageManager } from '@/components/admin/PartnerHeroImageManager';
import { ICADocumentManager } from '@/components/admin/ICADocumentManager';
import { ApplicationBackgroundImageManager } from '@/components/admin/ApplicationBackgroundImageManager';
import { CustomerManagement } from '@/components/admin/CustomerManagement';
import { AnalyticsDashboard } from '@/components/admin/AnalyticsDashboard';
import { ReferralProgram } from '@/components/ReferralProgram';
import { ReferralVideoManager } from '@/components/admin/ReferralVideoManager';
import { ReferralSettingsManager } from '@/components/admin/ReferralSettingsManager';
import { LoyaltyDashboard } from '@/components/loyalty/LoyaltyDashboard';
import AllCampaignOverview from '@/pages/marketing/AllCampaignOverview';
import CustomerSegmentation from '@/pages/marketing/CustomerSegmentation';
import EmailCampaignManager from '@/pages/marketing/EmailCampaignManager';
import PushNotificationManager from '@/pages/marketing/PushNotificationManager';
import SMSCampaignManager from '@/pages/marketing/SMSCampaignManager';
import MerchantPartnerMarketing from '@/pages/marketing/MerchantPartnerMarketing';
import DriverAmbassadorPromotions from '@/pages/marketing/DriverAmbassadorPromotions';
import BudgetingSpendTracking from '@/pages/marketing/BudgetingSpendTracking';
import AssetManagement from '@/pages/marketing/AssetManagement';
import CampaignAutomation from '@/pages/marketing/CampaignAutomation';
import ToolsIntegrations from '@/pages/marketing/ToolsIntegrations';
import AdminRolesPermissions from '@/pages/marketing/AdminRolesPermissions';
import MarketingSettings from '@/pages/marketing/MarketingSettings';
import ExperimentalFeatures from '@/pages/marketing/ExperimentalFeatures';
import { AboutUsStatsToggle } from '@/components/admin/AboutUsStatsToggle';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, LayoutDashboard, Tag, Mail, Bell, Users, TrendingUp, BarChart, Gift, UserPlus, Award, 
  Megaphone, MessageSquare, Building2, Truck, DollarSign, FolderOpen, Zap, Plug, Shield, Settings, 
  Sparkles, Filter, PieChart, Image as ImageIcon, FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const MarketingPortal: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('campaign-dashboard');
  const [expandedSection, setExpandedSection] = useState<string | null>('dashboard');
  const [userId, setUserId] = useState<string | null>(null);
  const [marketingMetrics, setMarketingMetrics] = useState({
    activeCampaigns: 0,
    totalReach: 0,
    roi: 0,
    monthlySpend: 0
  });

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    fetchUser();
    fetchMarketingMetrics();
  }, []);

  const fetchMarketingMetrics = async () => {
    try {
      // Get active promo codes
      const { data: promoCodes } = await supabase
        .from('promo_codes')
        .select('id, usage_count')
        .eq('is_active', true);

      // Get total customers
      const { count: customerCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

      // Get referral stats
      const { count: referralCount } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true });

      // Get promo code usage
      const totalUsage = promoCodes?.reduce((sum, pc) => sum + (pc.usage_count || 0), 0) || 0;

      // Calculate ROI estimate (would need actual spend tracking)
      const revenueFromPromos = totalUsage * 1500; // Estimate $15 avg order
      const promoSpend = totalUsage * 500; // Estimate $5 avg discount
      const calculatedROI = promoSpend > 0 ? Math.round((revenueFromPromos / promoSpend) * 100) : 0;

      setMarketingMetrics({
        activeCampaigns: promoCodes?.length || 0,
        totalReach: customerCount || 0,
        roi: calculatedROI,
        monthlySpend: promoSpend
      });
    } catch (error) {
      console.error('Error fetching marketing metrics:', error);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const navSections = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: LayoutDashboard,
      items: [
        { id: 'campaign-dashboard', label: 'Marketing Overview', icon: LayoutDashboard },
      ]
    },
    {
      id: 'campaigns',
      title: 'Campaigns',
      icon: Megaphone,
      items: [
        { id: 'campaign-builder', label: 'Campaign Builder', icon: Megaphone },
        { id: 'campaign-automation', label: 'Automation', icon: Zap },
      ]
    },
    {
      id: 'communications',
      title: 'Communications',
      icon: Mail,
      items: [
        { id: 'email-campaigns', label: 'Email Campaigns', icon: Mail },
        { id: 'push-notifications', label: 'Push Notifications', icon: Bell },
        { id: 'sms-campaigns', label: 'SMS Campaigns', icon: MessageSquare },
      ]
    },
    {
      id: 'customers',
      title: 'Customer Insights',
      icon: Users,
      items: [
        { id: 'customer-management', label: 'Customer Management', icon: Users },
        { id: 'customer-segmentation', label: 'Segmentation', icon: Filter },
        { id: 'customer-analytics', label: 'Analytics', icon: TrendingUp },
      ]
    },
    {
      id: 'promotions',
      title: 'Promotions',
      icon: Gift,
      items: [
        { id: 'promo-codes', label: 'Promo Codes', icon: Tag },
        { id: 'promotional-banners', label: 'Promotional Banners', icon: ImageIcon },
        { id: 'hero-image', label: 'Hero Image', icon: ImageIcon },
        { id: 'feeder-hero-image', label: 'Feeder Hero Image', icon: ImageIcon },
        { id: 'partner-hero-image', label: 'Partner Hero Image', icon: ImageIcon },
        { id: 'application-background-image', label: 'Application Background', icon: ImageIcon },
        { id: 'ica-document', label: 'ICA Document', icon: FileText },
        { id: 'referral-program', label: 'Referral Program', icon: UserPlus },
        { id: 'loyalty-program', label: 'Loyalty Program', icon: Award },
      ]
    },
    {
      id: 'partners',
      title: 'Partners',
      icon: Building2,
      items: [
        { id: 'merchant-marketing', label: 'Merchant & Partner', icon: Building2 },
        { id: 'driver-ambassador', label: 'Driver & Ambassador', icon: Truck },
      ]
    },
    {
      id: 'analytics',
      title: 'Analytics',
      icon: BarChart,
      items: [
        { id: 'roi-tracking', label: 'Budget & Spend', icon: DollarSign },
        { id: 'conversion-funnel', label: 'Conversion Funnel', icon: PieChart },
      ]
    },
    {
      id: 'assets',
      title: 'Assets',
      icon: FolderOpen,
      items: [
        { id: 'asset-management', label: 'Asset Management', icon: FolderOpen },
      ]
    },
    {
      id: 'tools',
      title: 'Tools',
      icon: Plug,
      items: [
        { id: 'integrations', label: 'Integrations', icon: Plug },
        { id: 'settings', label: 'Settings', icon: Settings },
      ]
    },
    {
      id: 'admin',
      title: 'Admin',
      icon: Shield,
      items: [
        { id: 'roles-permissions', label: 'Roles & Permissions', icon: Shield },
      ]
    },
    {
      id: 'experimental',
      title: 'Experimental',
      icon: Sparkles,
      items: [
        { id: 'experimental-features', label: 'AI & Advanced', icon: Sparkles },
      ]
    }
  ];

  const renderContent = () => {
    switch (activeTab) {
      // Dashboard
      case 'dashboard':
      case 'campaign-dashboard':
      case 'marketing-dashboard':
        return <AllCampaignOverview />;

      // Campaigns
      case 'campaign-builder':
        return <AllCampaignOverview />;
      case 'campaign-automation':
        return <CampaignAutomation />;

      // Communications
      case 'email-campaigns':
        return <EmailCampaignManager />;
      case 'push-notifications':
        return <PushNotificationManager />;
      case 'sms-campaigns':
        return <SMSCampaignManager />;

      // Customers
      case 'customer-management':
        return <CustomerManagement />;
      case 'customer-segmentation':
        return <CustomerSegmentation />;
      case 'customer-analytics':
        return <AnalyticsDashboard />;

      // Promotions
      case 'promo-codes':
        return <PromoCodeManager />;
      case 'promotional-banners':
        return <PromotionalBannerManager />;
      case 'hero-image':
        return <HeroImageManager />;
      case 'feeder-hero-image':
        return <FeederHeroImageManager />;
      case 'partner-hero-image':
        return <PartnerHeroImageManager />;
      case 'application-background-image':
        return <ApplicationBackgroundImageManager />;
      case 'ica-document':
        return <ICADocumentManager />;
      case 'referral-program':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Referral Program Management</h2>
                <p className="text-muted-foreground">Manage referral settings, video content, and program configuration</p>
              </div>
            </div>
            <Tabs defaultValue="program" className="w-full">
              <TabsList>
                <TabsTrigger value="program">Program</TabsTrigger>
                <TabsTrigger value="video">Video Content</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              <TabsContent value="program" className="mt-6">
                <ReferralProgram userType="customer" />
              </TabsContent>
              <TabsContent value="video" className="mt-6">
                <ReferralVideoManager />
              </TabsContent>
              <TabsContent value="settings" className="mt-6">
                <ReferralSettingsManager />
              </TabsContent>
            </Tabs>
          </div>
        );
      case 'loyalty-program':
        return (
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Loyalty Program</h2>
              {userId && <LoyaltyDashboard userId={userId} />}
              {!userId && <p className="text-gray-600">Loading...</p>}
            </Card>
          </div>
        );

      // Partners
      case 'merchant-marketing':
        return <MerchantPartnerMarketing />;
      case 'driver-ambassador':
        return <DriverAmbassadorPromotions />;

      // Analytics
      case 'roi-tracking':
        return <BudgetingSpendTracking />;
      case 'conversion-funnel':
        return <AnalyticsDashboard />;

      // Assets
      case 'asset-management':
        return <AssetManagement />;

      // Tools
      case 'integrations':
        return <ToolsIntegrations />;
      case 'settings':
        return (
          <div className="space-y-6">
            <MarketingSettings />
            <AboutUsStatsToggle />
          </div>
        );

      // Admin
      case 'roles-permissions':
        return <AdminRolesPermissions />;

      // Experimental
      case 'experimental-features':
        return <ExperimentalFeatures />;

      default:
        return (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Marketing Portal</h2>
            <p className="text-gray-600">Navigate using the menu to access marketing features.</p>
          </Card>
        );
    }
  };

  return (
    <MarketingAccessGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="flex h-screen">
          {/* Sidebar */}
          <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/hub')}
                  className="p-0"
                  title="Back to Hub"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Hub
                </Button>
                <h1 className="text-lg font-bold">Marketing Portal</h1>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                {navSections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <div key={section.id} className="space-y-1">
                      <button
                        onClick={() => toggleSection(section.id)}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{section.title}</span>
                        </div>
                      </button>
                      {expandedSection === section.id && (
                        <div className="ml-6 space-y-1">
                          {section.items.map((item) => {
                            const ItemIcon = item.icon;
                            return (
                              <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                                  activeTab === item.id
                                    ? 'bg-orange-100 text-orange-700 font-medium'
                                    : 'text-gray-600 hover:bg-gray-100'
                                }`}
                              >
                                <ItemIcon className="h-4 w-4" />
                                <span>{item.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-auto">
            <div className="p-6">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </MarketingAccessGuard>
  );
};

export default MarketingPortal;


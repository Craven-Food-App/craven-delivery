import React, { useState, useEffect } from 'react';
import { MarketingAccessGuard } from '@/components/MarketingAccessGuard';
import { PromoCodeManager } from '@/components/admin/PromoCodeManager';
import { PromotionalBannerManager } from '@/components/admin/PromotionalBannerManager';
import { HeroImageManager } from '@/components/admin/HeroImageManager';
import { FeederHeroImageManager } from '@/components/admin/FeederHeroImageManager';
import { PartnerHeroImageManager } from '@/components/admin/PartnerHeroImageManager';
import { InvestorHeroImageManager } from '@/components/admin/InvestorHeroImageManager';
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
  Sparkles, Filter, PieChart, Image as ImageIcon, FileText, ChevronDown, ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import cravenLogo from "@/assets/craven-logo.png";

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
        { id: 'investor-hero-image', label: 'Investor Hero Image', icon: ImageIcon },
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
      case 'investor-hero-image':
        return <InvestorHeroImageManager />;
      case 'application-background-image':
        return <ApplicationBackgroundImageManager />;
      case 'ica-document':
        return <ICADocumentManager />;
      case 'referral-program':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Referral Program Management</h2>
                <p className="text-xs text-gray-500 mt-0.5">Manage referral settings, video content, and program configuration</p>
              </div>
            </div>
            <Tabs defaultValue="program" className="w-full">
              <div className="border-b border-gray-200 bg-[#fafbfc]">
                <div className="px-3 py-2">
                  <TabsList className="bg-transparent h-8 p-0">
                    <TabsTrigger value="program" className="h-7 px-3 text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">Program</TabsTrigger>
                    <TabsTrigger value="video" className="h-7 px-3 text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">Video Content</TabsTrigger>
                    <TabsTrigger value="settings" className="h-7 px-3 text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">Settings</TabsTrigger>
                  </TabsList>
                </div>
              </div>
              <TabsContent value="program" className="m-0 p-3">
                <ReferralProgram userType="customer" />
              </TabsContent>
              <TabsContent value="video" className="m-0 p-3">
                <ReferralVideoManager />
              </TabsContent>
              <TabsContent value="settings" className="m-0 p-3">
                <ReferralSettingsManager />
              </TabsContent>
            </Tabs>
          </div>
        );
      case 'loyalty-program':
        return (
          <div className="space-y-3">
            <Card className="border border-gray-200 shadow-sm">
              <div className="p-3">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">Loyalty Program</h2>
                {userId && <LoyaltyDashboard userId={userId} />}
                {!userId && <p className="text-xs text-gray-600">Loading...</p>}
              </div>
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
          <div className="space-y-3">
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
          <Card className="border border-gray-200 shadow-sm">
            <div className="p-3">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">Marketing Portal</h2>
              <p className="text-xs text-gray-600">Navigate using the menu to access marketing features.</p>
            </div>
          </Card>
        );
    }
  };

  return (
    <MarketingAccessGuard>
      <div className="flex h-screen w-full bg-[#f8f9fa]">
        {/* Compact Enterprise Sidebar */}
        <aside className="w-56 border-r border-gray-200 bg-white flex flex-col shadow-sm">
          {/* Header */}
          <div className="px-3 py-2.5 border-b border-gray-200 bg-[#fafbfc]">
            <div className="flex items-center gap-2 mb-2">
              <img src={cravenLogo} alt="Crave'n" className="h-5" />
              <span className="font-semibold text-sm text-gray-900">Marketing Portal</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/hub')}
              className="w-full justify-start h-7 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-2"
            >
              <ArrowLeft className="h-3 w-3 mr-1.5" />
              Back to Hub
            </Button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1">
            <div className="py-2 px-2">
              {navSections.map((section) => {
                const Icon = section.icon;
                const isExpanded = expandedSection === section.id;
                return (
                  <div key={section.id} className="mb-0.5">
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5" />
                        <span>{section.title}</span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-gray-400" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="ml-4 mt-0.5 space-y-0.5">
                        {section.items.map((item) => {
                          const ItemIcon = item.icon;
                          const isActive = activeTab === item.id;
                          return (
                            <button
                              key={item.id}
                              onClick={() => setActiveTab(item.id)}
                              className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-md transition-colors ${
                                isActive
                                  ? 'bg-[#e8f0fe] text-[#1a73e8] font-medium'
                                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                              }`}
                            >
                              <ItemIcon className="h-3 w-3" />
                              <span className="truncate">{item.label}</span>
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
        </aside>

        {/* Main Content Area - Compact */}
        <main className="flex-1 overflow-auto bg-[#f8f9fa]">
          <div className="h-full p-4">
            {renderContent()}
          </div>
        </main>
      </div>
    </MarketingAccessGuard>
  );
};

export default MarketingPortal;

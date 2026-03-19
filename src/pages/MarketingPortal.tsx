// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { MarketingAccessGuard } from '@/components/MarketingAccessGuard';
import { PromoCodeManager } from '@/components/admin/PromoCodeManager';
import { PromotionalBannerManager } from '@/components/admin/PromotionalBannerManager';
import { AdPlacementManager } from '@/components/admin/AdPlacementManager';
import { HeroImageManager } from '@/components/admin/HeroImageManager';
import { FeederHeroImageManager } from '@/components/admin/FeederHeroImageManager';
import { PartnerHeroImageManager } from '@/components/admin/PartnerHeroImageManager';
import { InvestorHeroImageManager } from '@/components/admin/InvestorHeroImageManager';
import { FoundationalSupportHeroImageManager } from '@/components/admin/FoundationalSupportHeroImageManager';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import {
  IconLayoutDashboard,
  IconSpeakerphone,
  IconBolt,
  IconMail,
  IconBell,
  IconMessageCircle,
  IconUsers,
  IconFilter,
  IconTrendingUp,
  IconTag,
  IconPhoto,
  IconFileText,
  IconUserPlus,
  IconAward,
  IconBuilding,
  IconTruck,
  IconCurrencyDollar,
  IconPieChart,
  IconFolder,
  IconPlug,
  IconSettings,
  IconShield,
  IconSparkles,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { UnifiedPortalShell, PortalTab, PortalKPI } from '@/components/portal/UnifiedPortalShell';

const TABS: PortalTab[] = [
  // Dashboard
  { id: 'campaign-dashboard', label: 'Marketing Overview', description: 'Campaign performance and key metrics.', section: 'Dashboard', icon: IconLayoutDashboard },
  // Campaigns
  { id: 'campaign-builder', label: 'Campaign Builder', description: 'Create and manage marketing campaigns.', section: 'Campaigns', icon: IconSpeakerphone },
  { id: 'campaign-automation', label: 'Automation', description: 'Automated campaign workflows and triggers.', section: 'Campaigns', icon: IconBolt },
  // Communications
  { id: 'email-campaigns', label: 'Email Campaigns', description: 'Design and send email marketing campaigns.', section: 'Communications', icon: IconMail },
  { id: 'push-notifications', label: 'Push Notifications', description: 'Mobile push notification management.', section: 'Communications', icon: IconBell },
  { id: 'sms-campaigns', label: 'SMS Campaigns', description: 'SMS marketing and text blast management.', section: 'Communications', icon: IconMessageCircle },
  // Customer Insights
  { id: 'customer-management', label: 'Customer Management', description: 'Customer profiles and account data.', section: 'Customer Insights', icon: IconUsers },
  { id: 'customer-segmentation', label: 'Segmentation', description: 'Audience segmentation and targeting.', section: 'Customer Insights', icon: IconFilter },
  { id: 'customer-analytics', label: 'Analytics', description: 'Customer behavior and conversion analytics.', section: 'Customer Insights', icon: IconTrendingUp },
  // Promotions
  { id: 'promo-codes', label: 'Promo Codes', description: 'Discount code creation and management.', section: 'Promotions', icon: IconTag },
  { id: 'promotional-banners', label: 'Banners', description: 'Promotional banner display management.', section: 'Promotions', icon: IconPhoto },
  { id: 'ad-placements', label: 'Ad Placements', description: 'Ad placement slots and customer ad configuration.', section: 'Promotions', icon: IconSpeakerphone },
  { id: 'hero-image', label: 'Hero Images', description: 'Homepage hero image management.', section: 'Promotions', icon: IconPhoto },
  { id: 'referral-program', label: 'Referral Program', description: 'Referral program settings and tracking.', section: 'Promotions', icon: IconUserPlus },
  { id: 'loyalty-program', label: 'Loyalty Program', description: 'Customer loyalty rewards and tiers.', section: 'Promotions', icon: IconAward },
  // Partners
  { id: 'merchant-marketing', label: 'Merchant & Partner', description: 'Co-marketing with merchant partners.', section: 'Partners', icon: IconBuilding },
  { id: 'driver-ambassador', label: 'Driver & Ambassador', description: 'Driver ambassador promotion programs.', section: 'Partners', icon: IconTruck },
  // Analytics & Assets
  { id: 'roi-tracking', label: 'Budget & Spend', description: 'Marketing spend tracking and ROI.', section: 'Analytics', icon: IconCurrencyDollar },
  { id: 'asset-management', label: 'Asset Management', description: 'Creative assets and media library.', section: 'Analytics', icon: IconFolder },
  // Admin
  { id: 'integrations', label: 'Integrations', description: 'Third-party marketing tool connections.', section: 'Admin', icon: IconPlug },
  { id: 'settings', label: 'Settings', description: 'Marketing portal configuration.', section: 'Admin', icon: IconSettings },
  { id: 'roles-permissions', label: 'Roles & Permissions', description: 'Team access and permission management.', section: 'Admin', icon: IconShield },
  { id: 'experimental-features', label: 'AI & Advanced', description: 'Experimental AI-powered features.', section: 'Admin', icon: IconSparkles },
];

const SECTIONS = ['Dashboard', 'Campaigns', 'Communications', 'Customer Insights', 'Promotions', 'Partners', 'Analytics', 'Admin'];

const MarketingPortal: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('campaign-dashboard');
  const [userId, setUserId] = useState<string | null>(null);
  const [kpis, setKpis] = useState<PortalKPI[]>([]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);

      const { data: promoCodes } = await supabase.from('promo_codes').select('id, usage_count').eq('is_active', true);
      const { count: customerCount } = await supabase.from('user_profiles').select('*', { count: 'exact', head: true });
      const { count: referralCount } = await supabase.from('referrals').select('*', { count: 'exact', head: true });
      const totalUsage = promoCodes?.reduce((sum, pc) => sum + (pc.usage_count || 0), 0) || 0;

      setKpis([
        { id: 'campaigns', label: 'Active Campaigns', value: String(promoCodes?.length || 0), delta: 'Promo codes', up: true },
        { id: 'reach', label: 'Total Reach', value: (customerCount || 0).toLocaleString(), delta: 'Customers', up: true },
        { id: 'referrals', label: 'Referrals', value: (referralCount || 0).toLocaleString(), delta: 'Total', up: true },
        { id: 'redemptions', label: 'Redemptions', value: totalUsage.toLocaleString(), delta: 'Promo uses', up: totalUsage > 0 },
      ]);
    };
    init();
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'campaign-dashboard': case 'dashboard': case 'marketing-dashboard': return <AllCampaignOverview />;
      case 'campaign-builder': return <AllCampaignOverview />;
      case 'campaign-automation': return <CampaignAutomation />;
      case 'email-campaigns': return <EmailCampaignManager />;
      case 'push-notifications': return <PushNotificationManager />;
      case 'sms-campaigns': return <SMSCampaignManager />;
      case 'customer-management': return <CustomerManagement />;
      case 'customer-segmentation': return <CustomerSegmentation />;
      case 'customer-analytics': return <AnalyticsDashboard />;
      case 'promo-codes': return <PromoCodeManager />;
      case 'promotional-banners': return <PromotionalBannerManager />;
      case 'ad-placements': return <AdPlacementManager />;
      case 'hero-image': return <HeroImageManager />;
      case 'feeder-hero-image': return <FeederHeroImageManager />;
      case 'partner-hero-image': return <PartnerHeroImageManager />;
      case 'investor-hero-image': return <InvestorHeroImageManager />;
      case 'foundational-support-hero-image': return <FoundationalSupportHeroImageManager />;
      case 'application-background-image': return <ApplicationBackgroundImageManager />;
      case 'ica-document': return <ICADocumentManager />;
      case 'referral-program':
        return (
          <Tabs defaultValue="program" className="w-full">
            <TabsList><TabsTrigger value="program">Program</TabsTrigger><TabsTrigger value="video">Video</TabsTrigger><TabsTrigger value="settings">Settings</TabsTrigger></TabsList>
            <TabsContent value="program"><ReferralProgram userType="customer" /></TabsContent>
            <TabsContent value="video"><ReferralVideoManager /></TabsContent>
            <TabsContent value="settings"><ReferralSettingsManager /></TabsContent>
          </Tabs>
        );
      case 'loyalty-program': return userId ? <LoyaltyDashboard userId={userId} /> : <p className="text-sm text-muted-foreground">Loading...</p>;
      case 'merchant-marketing': return <MerchantPartnerMarketing />;
      case 'driver-ambassador': return <DriverAmbassadorPromotions />;
      case 'roi-tracking': return <BudgetingSpendTracking />;
      case 'conversion-funnel': return <AnalyticsDashboard />;
      case 'asset-management': return <AssetManagement />;
      case 'integrations': return <ToolsIntegrations />;
      case 'settings': return <><MarketingSettings /><AboutUsStatsToggle /></>;
      case 'roles-permissions': return <AdminRolesPermissions />;
      case 'experimental-features': return <ExperimentalFeatures />;
      default: return <AllCampaignOverview />;
    }
  };

  return (
    <MarketingAccessGuard>
      <UnifiedPortalShell
        portalName="Marketing Portal"
        portalSubtitle="Campaign management and customer engagement"
        sectionLabel="Marketing Hub"
        tabs={TABS}
        sections={SECTIONS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        kpis={kpis}
        kpiLabel="Marketing Health — Live"
        lastUpdated={new Date()}
        onBack={() => navigate('/hub')}
      >
        {renderContent()}
      </UnifiedPortalShell>
    </MarketingAccessGuard>
  );
};

export default MarketingPortal;

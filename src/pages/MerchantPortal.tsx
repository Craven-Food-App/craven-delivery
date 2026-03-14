import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Button,
  Card,
  Menu,
  Stack,
  Group,
  Text,
  Title,
  Box,
  Loader,
  Badge,
  Avatar,
  ScrollArea,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconHome,
  IconTrendingUp,
  IconFileText,
  IconUsers,
  IconPackage,
  IconMenu2,
  IconCalendar,
  IconCurrencyDollar,
  IconSettings,
  IconChevronDown,
  IconCheck,
  IconDeviceTablet,
  IconBuildingStore,
  IconChevronUp,
  IconPlus,
  IconHelpCircle,
  IconMessageCircle,
  IconMail,
  IconClock,
  IconCircleCheck,
  IconShoppingBag,
  IconClipboardList,
  IconBoxMultiple,
  IconBarcode,
  IconTags,
  IconLogout,
} from "@tabler/icons-react";
import { useRestaurantSelector } from "@/hooks/useRestaurantSelector";

const MERCHANT_PORTAL_VERSION = "1.0.1";
import { useRestaurantOnboarding } from "@/hooks/useRestaurantOnboarding";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { getMerchantLabels } from "@/utils/merchantCategoryLabels";
import InsightsDashboard from "@/components/restaurant/dashboard/InsightsDashboard";
import CustomersDashboard from "@/components/restaurant/dashboard/CustomersDashboard";
import MenuDashboard from "@/components/restaurant/dashboard/MenuDashboard"; // Renamed to avoid conflict with Mantine Menu
import FinancialsDashboard from "@/components/restaurant/dashboard/FinancialsDashboard";
import SettingsDashboard from "@/components/restaurant/dashboard/SettingsDashboard";
import ReportsDashboard from "@/components/restaurant/dashboard/insights/ReportsDashboard";
import { RestaurantCustomerOrderManagement } from "@/components/restaurant/RestaurantCustomerOrderManagement";
import StoreAvailabilityDashboard from "@/components/restaurant/dashboard/StoreAvailabilityDashboard";
import RequestDeliveryDashboard from "@/components/restaurant/dashboard/RequestDeliveryDashboard";
import { HomeDashboard } from "@/components/merchant/HomeDashboard";
import MerchantWelcomeConfetti from "@/components/merchant/MerchantWelcomeConfetti";
import { getMerchantGroup } from "@/utils/merchantCategoryLabels";
import RetailHomeDashboard from "@/components/retail/RetailHomeDashboard";
import RetailProductCatalog from "@/components/retail/RetailProductCatalog";
import RetailInventoryDashboard from "@/components/retail/RetailInventoryDashboard";
import { GroceryHomeDashboard } from "@/components/grocery/GroceryHomeDashboard";
import { AddLocationWizard } from "@/components/merchant/AddLocationWizard";
import StoreActivation from "@/components/merchant/StoreActivation";
import GoLiveSection from "@/components/merchant/GoLiveSection";
import CraveNSetupSection from "@/components/merchant/CraveNSetupSection";
import cravenCLogo from "@/assets/craven-c-new.png";

// Helper function to format restaurant type for display
const formatRestaurantType = (type: string | null | undefined): string => {
  if (!type) return 'Store';

  const typeMap: Record<string, string> = {
    'full_service': 'Full Service Restaurant',
    'fast_casual': 'Fast Casual',
    'quick_service': 'Quick Service',
    'cafe': 'Café',
    'bakery': 'Bakery',
    'ghost_kitchen': 'Ghost Kitchen',
    'catering': 'Catering',
    'food_truck': 'Food Truck',
    'retail_store': 'Retail Store',
    'restaurant': 'Restaurant',
    'grocery': 'Grocery',
    'supermarket': 'Supermarket',
    'convenience': 'Convenience Store',
    'convenience_store': 'Convenience Store',
    'deli': 'Deli',
    'market': 'Market',
  };

  return typeMap[type] || type.split('_').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

const VALID_TABS = ['home','insights','reports','customers','orders','menu','products','inventory','availability','financials','settings','request-delivery'] as const;

const RestaurantSetup = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const sectionParam = searchParams.get('section') ?? searchParams.get('subtab');
  const [activeTab, setActiveTab] = useState<'home' | 'insights' | 'reports' | 'customers' | 'orders' | 'menu' | 'products' | 'inventory' | 'availability' | 'financials' | 'settings' | 'request-delivery'>(
    (tabParam && VALID_TABS.includes(tabParam as any)) ? (tabParam as any) : 'home'
  );
  const [settingsTab, setSettingsTab] = useState<string>(
    sectionParam && tabParam === 'settings' ? (sectionParam === 'bank-account' ? 'bank' : sectionParam) : 'account'
  );
  const [authChecked, setAuthChecked] = useState(false);
  const [userName, setUserName] = useState("User");
  const [fullName, setFullName] = useState<string | null>(null);
  const [showWelcomeConfetti, setShowWelcomeConfetti] = useState(false);
  const [addLocationModalOpen, setAddLocationModalOpen] = useState(false);
  const { restaurants, selectedRestaurant: restaurant, loading: restaurantLoading, selectRestaurant, refetchRestaurants } = useRestaurantSelector();
  const { progress, readiness, loading: onboardingLoading, refreshData } = useRestaurantOnboarding(restaurant?.id);
  const labels = getMerchantLabels(restaurant?.restaurant_type);

  // Redirect to merchant auth if not signed in
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/restaurant/auth', { replace: true });
        return;
      }
      setAuthChecked(true);
    };
    checkAuth();
  }, [navigate]);

  // Sync tab from URL on mount and when URL changes
  useEffect(() => {
    const tab = searchParams.get('tab');
    const section = searchParams.get('section') ?? searchParams.get('subtab');
    if (tab && ['home','insights','reports','customers','orders','menu','products','inventory','availability','financials','settings','request-delivery'].includes(tab)) {
      setActiveTab(tab as any);
    }
    if (section && tab === 'settings') {
      setSettingsTab(section === 'bank-account' ? 'bank' : section);
    }
  }, [searchParams]);

  // Keep URL in sync when tab changes. Only include section=delete-account when actually on that page.
  useEffect(() => {
    const currentTab = searchParams.get('tab');
    const currentSection = searchParams.get('section');
    const wantSection = activeTab === 'settings' && settingsTab === 'delete-account' ? 'delete-account' : null;
    if (currentTab !== activeTab || currentSection !== wantSection) {
      const next = new URLSearchParams(searchParams);
      next.set('tab', activeTab);
      if (wantSection) next.set('section', wantSection);
      else next.delete('section');
      setSearchParams(next, { replace: true });
    }
  }, [activeTab, settingsTab]);
  const merchantGroup = getMerchantGroup(restaurant?.restaurant_type);
  const isRetail = merchantGroup === 'retail' || merchantGroup === 'grocery';
  const isGrocery = merchantGroup === 'grocery';

  // Tablet-first: lock to landscape only — request lock when portal loads, show overlay if portrait
  const [isPortrait, setIsPortrait] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(orientation: portrait)').matches : false
  );
  useEffect(() => {
    const mql = window.matchMedia('(orientation: portrait)');
    const handler = () => setIsPortrait(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Lock orientation to landscape when merchant portal is active (supported on Android Chrome, some PWAs)
  useEffect(() => {
    const orient = typeof screen !== 'undefined' && screen.orientation && typeof (screen.orientation as { lock?: (mode: string) => Promise<void> }).lock === 'function';
    if (!orient) return;
    (screen.orientation as { lock: (mode: string) => Promise<void> })
      .lock('landscape')
      .catch(() => { /* ignore: e.g. requires fullscreen or not allowed */ });
    return () => {
      try {
        (screen.orientation as { unlock?: () => void }).unlock?.();
      } catch {
        // ignore
      }
    };
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .single();
        
        if (profile?.full_name) {
          const parts = profile.full_name.trim().split(/\s+/);
          setUserName(parts[0] || "User");
          setFullName(profile.full_name);
        }
      }
    };
    fetchUserProfile();
  }, []);

  // Listen for nav events from retail dashboard quick actions
  useEffect(() => {
    const handleNavEvent = (e: CustomEvent) => {
      setActiveTab(e.detail as any);
    };
    window.addEventListener('merchantPortalNav', handleNavEvent as EventListener);
    return () => window.removeEventListener('merchantPortalNav', handleNavEvent as EventListener);
  }, []);

  // Check for merchant welcome screen
  useEffect(() => {
    const checkWelcomeStatus = async () => {
      if (restaurant && (restaurant.merchant_welcome_shown === false || restaurant.merchant_welcome_shown === null)) {
        console.log('Showing welcome confetti for restaurant:', restaurant.name, 'merchant_welcome_shown:', restaurant.merchant_welcome_shown);
        setShowWelcomeConfetti(true);
      }
    };
    
    checkWelcomeStatus();
  }, [restaurant]);

  const handleAddLocationSuccess = (newRestaurantId: string) => {
    refetchRestaurants().then(() => selectRestaurant(newRestaurantId));
  };

  const isBusinessVerified = Boolean(progress?.business_info_verified) || Boolean(restaurant?.business_verified_at);

  const completedSteps = [
    isBusinessVerified,
    progress?.menu_preparation_status === 'ready',
    progress?.tablet_shipped
  ].filter(Boolean).length;

  const allStepsComplete = completedSteps === 3;

  const deadline = restaurant?.setup_deadline 
    ? format(new Date(restaurant.setup_deadline), 'EEE, MMM d')
    : readiness?.estimated_go_live 
      ? format(new Date(readiness.estimated_go_live), 'EEE, MMM d')
      : "Not set";

  if (!authChecked || restaurantLoading || onboardingLoading) {
    return (
      <Box style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <Loader size="xl" color="orange" />
      </Box>
    );
  }

  if (!restaurant) {
    return (
      <Box style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <Card p="xl" withBorder>
          <Stack gap="md">
            <Title order={3}>{labels.notFoundTitle}</Title>
            <Text c="dimmed">Please complete onboarding first.</Text>
            <Button onClick={() => navigate('/restaurant/register')}>
              Start Onboarding
            </Button>
          </Stack>
        </Card>
      </Box>
    );
  }

  const navItemsRestaurant: { tab: typeof activeTab; icon: React.ElementType; label: string }[] = [
    { tab: 'insights', icon: IconTrendingUp, label: 'Insights' },
    { tab: 'reports', icon: IconFileText, label: 'Reports' },
    { tab: 'customers', icon: IconUsers, label: 'Customers' },
    { tab: 'orders', icon: IconPackage, label: 'Orders' },
    { tab: 'menu', icon: IconMenu2, label: 'Menu' },
    { tab: 'availability', icon: IconCalendar, label: 'Hours' },
    { tab: 'financials', icon: IconCurrencyDollar, label: 'Financials' },
    { tab: 'settings', icon: IconSettings, label: 'Settings' },
    { tab: 'request-delivery', icon: IconDeviceTablet, label: 'Delivery' },
  ];
  const navItemsRetail: { tab: typeof activeTab; icon: React.ElementType; label: string }[] = [
    { tab: 'orders', icon: IconPackage, label: 'Orders' },
    { tab: 'customers', icon: IconUsers, label: 'Customers' },
    { tab: 'products', icon: IconShoppingBag, label: 'Products' },
    { tab: 'inventory', icon: IconBoxMultiple, label: 'Inventory' },
    { tab: 'insights', icon: IconTrendingUp, label: 'Insights' },
    { tab: 'reports', icon: IconFileText, label: 'Reports' },
    { tab: 'financials', icon: IconCurrencyDollar, label: 'Financials' },
    { tab: 'availability', icon: IconCalendar, label: 'Hours' },
    { tab: 'settings', icon: IconSettings, label: 'Settings' },
    { tab: 'request-delivery', icon: IconDeviceTablet, label: 'Delivery' },
  ];
  const navItems = isRetail ? navItemsRetail : navItemsRestaurant;

  return (
    <Box
      className="merchant-portal-root"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        minWidth: 0,
        width: '100%',
        background: '#ffffff',
        color: '#18181b',
        overflow: 'hidden',
      }}
    >
      <style>{`
        .merchant-portal-content > * { max-width: none; width: 100%; box-sizing: border-box; }
        .merchant-portal-bottom-nav .mantine-Button {
          min-height: 40px !important;
          padding: 4px 6px !important;
          flex: 0 0 auto !important;
          width: auto !important;
        }
        .merchant-portal-bottom-nav .mantine-Button .mantine-Button-section { margin-inline-end: 3px !important; }
        .merchant-portal-bottom-nav .mantine-Group { gap: 2px !important; }
      `}</style>

      {/* Top bar: logo, store selector, user */}
      <Box
        className="merchant-portal-topbar"
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid var(--mantine-color-gray-3)',
          background: '#fff',
          gap: 8,
        }}
      >
        <Group gap="xs">
          <img src={cravenCLogo} alt="Crave'n" style={{ height: '22px', width: 'auto' }} />
          <Text fw={600} size="sm">Merchant</Text>
          <Button variant={activeTab === 'home' ? 'light' : 'subtle'} color={activeTab === 'home' ? 'orange' : 'gray'} size="compact-xs" leftSection={<IconHome size={16} />} onClick={() => setActiveTab('home')}>
            Home
          </Button>
        </Group>
        <Menu width={240} position="bottom-start">
          <Menu.Target>
            <Button variant="subtle" size="compact-sm" leftSection={<Avatar size="sm" radius="xl" color="gray" src={restaurant?.logo_url}>{!restaurant?.logo_url && <IconBuildingStore size={14} />}</Avatar>} rightSection={<IconChevronDown size={14} />}>
              <Text size="xs" fw={600} lineClamp={1} style={{ maxWidth: 120 }}>{restaurant?.name}</Text>
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            {restaurants.map((r) => (
              <Menu.Item key={r.id} onClick={() => selectRestaurant(r.id)} leftSection={<Avatar size="xs" radius="xl" src={r.logo_url}>{!r.logo_url && <IconBuildingStore size={12} />}</Avatar>} rightSection={restaurant?.id === r.id ? <IconCircleCheck size={14} color="var(--mantine-color-orange-6)" /> : null} bg={restaurant?.id === r.id ? 'orange.0' : undefined}>{r.name}</Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
        <Menu width={200} position="bottom-end">
          <Menu.Target>
            <Button variant="subtle" size="compact-sm" p="xs">
              <Avatar size="sm" radius="xl" color="gray">{(fullName ?? userName).charAt(0).toUpperCase()}</Avatar>
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item component="a" href="/legal/privacy" target="_blank" rel="noopener noreferrer" leftSection={<IconFileText size={14} />}>Privacy</Menu.Item>
            <Menu.Item component="a" href="/legal/terms" target="_blank" rel="noopener noreferrer" leftSection={<IconFileText size={14} />}>Terms</Menu.Item>
            <Menu.Item component="a" href="/drive-on-demand-merchant-terms" target="_blank" rel="noopener noreferrer" leftSection={<IconFileText size={14} />}>Drive terms</Menu.Item>
            <Menu.Divider />
            <Menu.Item leftSection={<IconPlus size={14} />} onClick={() => navigate(window.location.pathname.startsWith('/portal') ? '/solutions' : '/restaurant/solutions')}>Add solutions</Menu.Item>
            <Menu.Divider />
            <Menu.Item leftSection={<IconLogout size={14} />} color="red" onClick={async () => { await supabase.auth.signOut(); navigate('/restaurant/auth'); }}>Log out</Menu.Item>
            <Menu.Label style={{ fontSize: 10, color: 'var(--mantine-color-dimmed)' }}>v{MERCHANT_PORTAL_VERSION}</Menu.Label>
          </Menu.Dropdown>
        </Menu>
      </Box>

      {/* Scrollable content - only this area scrolls */}
      <Box style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <ScrollArea h="100%" scrollbarSize={6} type="auto">
          <Box
            className="merchant-portal-content"
            style={{
              width: '100%',
              padding: '12px 16px 16px',
              boxSizing: 'border-box',
              minHeight: '100%',
            }}
          >
          {activeTab === 'home' ? (
            allStepsComplete ? (
              <>
                <div style={{ marginBottom: 12 }}>
                  <Text size="xs" c="dimmed">Welcome back, {userName}</Text>
                  <Title order={1}>Dashboard</Title>
                </div>
                {isGrocery ? (
                  <GroceryHomeDashboard
                    restaurantId={restaurant?.id || ''}
                    restaurant={restaurant}
                    readiness={readiness}
                    labels={labels}
                  />
                ) : isRetail ? (
                  <RetailHomeDashboard
                    restaurantId={restaurant?.id || ''}
                    restaurant={restaurant}
                    readiness={readiness}
                  />
                ) : (
                  <HomeDashboard
                    restaurantId={restaurant?.id || ''}
                    restaurant={restaurant}
                    readiness={readiness}
                  />
                )}
              </>
            ) : (
              <Box style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#7A726E', marginBottom: 4 }}>Welcome, {userName}</div>
                  <h1 style={{ fontSize: 22, fontWeight: 800, color: '#141210', letterSpacing: '-0.025em', lineHeight: 1.2, margin: '0 0 4px' }}>
                    Set up your store
                  </h1>
                  <div style={{ fontSize: 13, color: '#7A726E' }}>
                    Go live by <strong style={{ color: '#141210', fontWeight: 600 }}>{deadline}</strong>.
                  </div>
                </div>

                <StoreActivation
                  progress={progress}
                  restaurant={restaurant}
                  labels={labels}
                  onNavigateToSettings={(tab) => {
                    setSettingsTab(tab);
                    setActiveTab('settings');
                  }}
                  onContactSupport={() => {
                    window.open('/support', '_blank');
                  }}
                />

                <GoLiveSection
                  readiness={readiness}
                  targetDate={deadline}
                  onNavigateToSettings={(tab) => {
                    setSettingsTab(tab);
                    setActiveTab("settings");
                  }}
                  onNavigateToAvailability={() => setActiveTab("availability")}
                />

                <CraveNSetupSection
                  labels={labels}
                  onAddStoreOrBusiness={() => setAddLocationModalOpen(true)}
                />
              </Box>
            )
          ) : !restaurant ? (
            <div className="p-6 text-center">
              <p className="text-muted-foreground">Please select a store to continue.</p>
            </div>
          ) : activeTab === 'insights' ? <InsightsDashboard restaurantId={restaurant?.id} />
            : activeTab === 'reports' ? <ReportsDashboard restaurantId={restaurant?.id} />
            : activeTab === 'customers' ? <CustomersDashboard restaurantId={restaurant?.id} />
            : activeTab === 'orders' ? (
              <RestaurantCustomerOrderManagement
                restaurantId={restaurant.id}
                playSoundForNewOrders={(restaurant?.verification_notes as Record<string, boolean> | undefined)?.notif_newOrderSound !== false}
              />
            )
            : activeTab === 'menu' ? <MenuDashboard restaurantId={restaurant.id} />
            : activeTab === 'products' ? <RetailProductCatalog restaurantId={restaurant.id} restaurantType={restaurant?.restaurant_type} />
            : activeTab === 'inventory' ? <RetailInventoryDashboard restaurantId={restaurant.id} restaurantType={restaurant?.restaurant_type} />
            : activeTab === 'availability' ? <StoreAvailabilityDashboard restaurantId={restaurant?.id} />
            : activeTab === 'financials' ? <FinancialsDashboard restaurantId={restaurant?.id} />
            : activeTab === 'settings' ? <SettingsDashboard defaultTab={settingsTab} restaurantId={restaurant?.id} onSettingsTabChange={setSettingsTab} />
            : activeTab === 'request-delivery' ? <RequestDeliveryDashboard restaurantId={restaurant?.id} />
            : null}
          </Box>
        </ScrollArea>
      </Box>

      {/* Bottom nav - fixed, tight button width so more fit on one row */}
      <Box
        className="merchant-portal-bottom-nav"
        style={{
          flexShrink: 0,
          borderTop: '1px solid var(--mantine-color-gray-3)',
          background: '#fafafa',
          padding: '6px 4px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <Group gap={2} justify="center" wrap="wrap">
          {navItems.map(({ tab, icon: Icon, label }) => {
            const IconComp = Icon as any;
            return (
              <Button key={tab} variant={activeTab === tab ? 'light' : 'subtle'} color={activeTab === tab ? 'orange' : 'gray'} size="compact-xs" leftSection={<IconComp size={16} />} onClick={() => setActiveTab(tab)}>
                {label}
              </Button>
            );
          })}
        </Group>
      </Box>

      {/* Merchant Welcome Confetti */}
      {showWelcomeConfetti && (
        <MerchantWelcomeConfetti
          restaurantName={restaurant?.name || 'Your Store'}
          onComplete={() => setShowWelcomeConfetti(false)}
        />
      )}

      {/* Add new store / location wizard */}
      {restaurant && (
        <AddLocationWizard
          opened={addLocationModalOpen}
          onClose={() => setAddLocationModalOpen(false)}
          parentRestaurantId={restaurant.id}
          parentRestaurantName={restaurant.name || "Your store"}
          onSuccess={handleAddLocationSuccess}
        />
      )}
    </Box>
  );
};

export default RestaurantSetup;
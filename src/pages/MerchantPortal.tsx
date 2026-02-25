import { useState, useEffect } from "react";
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
  Divider,
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
  IconChevronLeft,
  IconChevronRight as IconChevronRightTabler,
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
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

  // Portrait: show rotate-device overlay (merchant portal is landscape-only, tablet-first)
  if (isPortrait) {
    return (
      <Box
        style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--mantine-color-gray-0)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          zIndex: 9999,
        }}
      >
        <Box
          style={{
            width: 80,
            height: 80,
            borderRadius: 16,
            background: 'var(--mantine-color-orange-1)',
            color: 'var(--mantine-color-orange-6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
          }}
        >
          <IconDeviceTablet size={48} style={{ transform: 'rotate(-90deg)' }} />
        </Box>
        <Title order={2} ta="center" mb="xs">
          Rotate your device
        </Title>
        <Text c="dimmed" ta="center" maw={320}>
          The Merchant Portal is designed for tablet in landscape. Please rotate your device to continue.
        </Text>
      </Box>
    );
  }

  return (
    <Box
      style={{
        display: 'flex',
        height: '100vh',
        minWidth: 1024,
        width: '100%',
        background: '#ffffff',
        color: '#18181b',
      }}
    >
      {/* Left Sidebar */}
      <Box style={{ width: sidebarCollapsed ? '72px' : '256px', borderRight: '1px solid var(--mantine-color-gray-3)', display: 'flex', flexDirection: 'column', transition: 'width 200ms ease-in-out', overflow: 'hidden' }}>
        {/* Logo + Collapse Toggle */}
        <Box p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)', display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'space-between' }}>
          {!sidebarCollapsed && (
            <Group gap="xs">
              <img 
                src={cravenCLogo} 
                alt="Crave'n" 
                style={{ height: '24px', width: 'auto' }}
              />
              <Text fw={600} size="lg">Merchant</Text>
            </Group>
          )}
          <Button
            variant="subtle"
            color="gray"
            size="compact-sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{ padding: 4 }}
          >
            {sidebarCollapsed ? <IconChevronRightTabler size={18} /> : <IconChevronLeft size={18} />}
          </Button>
        </Box>

        {/* Restaurant Selector */}
        <Box p={sidebarCollapsed ? 'xs' : 'md'} style={{ borderBottom: '1px solid var(--mantine-color-gray-3)', display: 'flex', justifyContent: 'center' }}>
          <Menu width={224} position="bottom-start">
            <Menu.Target>
              {sidebarCollapsed ? (
                <Button variant="subtle" size="compact-md" style={{ padding: 8 }}>
                  <Avatar size="sm" radius="xl" color="gray" src={restaurant?.logo_url}>
                    {!restaurant?.logo_url && <IconBuildingStore size={16} />}
                  </Avatar>
                </Button>
              ) : (
                <Button
                  variant="subtle"
                  fullWidth
                  justify="space-between"
                  leftSection={
                    <Group gap="xs">
                      <Avatar size="sm" radius="xl" color="gray" src={restaurant?.logo_url}>
                        {!restaurant?.logo_url && <IconBuildingStore size={16} />}
                      </Avatar>
                      <Stack gap={0}>
                        <Text size="sm" fw={600}>{restaurant.name}</Text>
                        <Text size="xs" c="dimmed">
                          {formatRestaurantType(restaurant.restaurant_type)} {restaurants.length > 1 && `(${restaurants.length})`}
                        </Text>
                      </Stack>
                    </Group>
                  }
                  rightSection={<IconChevronDown size={16} />}
                />
              )}
            </Menu.Target>
            <Menu.Dropdown>
              {restaurants.map((r) => (
                <Menu.Item
                  key={r.id}
                  onClick={() => selectRestaurant(r.id)}
                  leftSection={
                    <Avatar size="xs" radius="xl" src={r.logo_url}>
                      {!r.logo_url && <IconBuildingStore size={14} />}
                    </Avatar>
                  }
                  rightSection={restaurant?.id === r.id ? <IconCircleCheck size={16} color="var(--mantine-color-orange-6)" /> : null}
                  bg={restaurant?.id === r.id ? 'orange.0' : undefined}
                >
                  {r.name}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        </Box>

        {/* Navigation */}
        <ScrollArea style={{ flex: 1 }} p="xs" scrollbarSize={8} type="auto">
          <Stack gap="xs">
            <Button
              variant={activeTab === 'home' ? 'light' : 'subtle'}
              color={activeTab === 'home' ? 'orange' : 'gray'}
              fullWidth
              justify={sidebarCollapsed ? 'center' : 'flex-start'}
              leftSection={!sidebarCollapsed ? <IconHome size={20} /> : undefined}
              onClick={() => setActiveTab('home')}
              style={sidebarCollapsed ? { padding: '8px 0' } : undefined}
            >
              {sidebarCollapsed ? <IconHome size={20} /> : 'Home'}
            </Button>

            {isRetail ? (
              <>
                {!sidebarCollapsed && <Text size="xs" c="dimmed" fw={500} px="xs" mt="xs">Sales</Text>}
                
                {[
                  { tab: 'orders' as const, icon: IconPackage, label: 'Orders' },
                  { tab: 'customers' as const, icon: IconUsers, label: 'Customers' },
                ].map(({ tab, icon: Icon, label }) => (
                  <Button key={tab} variant={activeTab === tab ? 'light' : 'subtle'} color={activeTab === tab ? 'orange' : 'gray'} fullWidth justify={sidebarCollapsed ? 'center' : 'flex-start'} leftSection={!sidebarCollapsed ? <Icon size={20} /> : undefined} onClick={() => setActiveTab(tab)} style={sidebarCollapsed ? { padding: '8px 0' } : undefined}>
                    {sidebarCollapsed ? <Icon size={20} /> : label}
                  </Button>
                ))}

                {!sidebarCollapsed && <Text size="xs" c="dimmed" fw={500} px="xs" mt="xs">Catalog</Text>}
                
                {[
                  { tab: 'products' as const, icon: IconShoppingBag, label: 'Products' },
                  { tab: 'inventory' as const, icon: IconBoxMultiple, label: 'Inventory' },
                ].map(({ tab, icon: Icon, label }) => (
                  <Button key={tab} variant={activeTab === tab ? 'light' : 'subtle'} color={activeTab === tab ? 'orange' : 'gray'} fullWidth justify={sidebarCollapsed ? 'center' : 'flex-start'} leftSection={!sidebarCollapsed ? <Icon size={20} /> : undefined} onClick={() => setActiveTab(tab)} style={sidebarCollapsed ? { padding: '8px 0' } : undefined}>
                    {sidebarCollapsed ? <Icon size={20} /> : label}
                  </Button>
                ))}

                {!sidebarCollapsed && <Text size="xs" c="dimmed" fw={500} px="xs" mt="xs">Analytics</Text>}
                
                {[
                  { tab: 'insights' as const, icon: IconTrendingUp, label: 'Insights' },
                  { tab: 'reports' as const, icon: IconFileText, label: 'Reports' },
                  { tab: 'financials' as const, icon: IconCurrencyDollar, label: 'Financials' },
                ].map(({ tab, icon: Icon, label }) => (
                  <Button key={tab} variant={activeTab === tab ? 'light' : 'subtle'} color={activeTab === tab ? 'orange' : 'gray'} fullWidth justify={sidebarCollapsed ? 'center' : 'flex-start'} leftSection={!sidebarCollapsed ? <Icon size={20} /> : undefined} onClick={() => setActiveTab(tab)} style={sidebarCollapsed ? { padding: '8px 0' } : undefined}>
                    {sidebarCollapsed ? <Icon size={20} /> : label}
                  </Button>
                ))}

                {!sidebarCollapsed && <Text size="xs" c="dimmed" fw={500} px="xs" mt="xs">Store</Text>}
                
                {[
                  { tab: 'availability' as const, icon: IconCalendar, label: labels.availabilityLabel },
                  { tab: 'settings' as const, icon: IconSettings, label: 'Settings' },
                ].map(({ tab, icon: Icon, label }) => (
                  <Button key={tab} variant={activeTab === tab ? 'light' : 'subtle'} color={activeTab === tab ? 'orange' : 'gray'} fullWidth justify={sidebarCollapsed ? 'center' : 'flex-start'} leftSection={!sidebarCollapsed ? <Icon size={20} /> : undefined} onClick={() => setActiveTab(tab)} style={sidebarCollapsed ? { padding: '8px 0' } : undefined}>
                    {sidebarCollapsed ? <Icon size={20} /> : label}
                  </Button>
                ))}
              </>
            ) : (
              <>
                {[
                  { tab: 'insights' as const, icon: IconTrendingUp, label: 'Insights' },
                  { tab: 'reports' as const, icon: IconFileText, label: 'Reports' },
                  { tab: 'customers' as const, icon: IconUsers, label: 'Customers' },
                  { tab: 'orders' as const, icon: IconPackage, label: 'Orders' },
                  { tab: 'menu' as const, icon: IconMenu2, label: 'Menu' },
                  { tab: 'availability' as const, icon: IconCalendar, label: 'Store availability' },
                  { tab: 'financials' as const, icon: IconCurrencyDollar, label: 'Financials' },
                  { tab: 'settings' as const, icon: IconSettings, label: 'Settings' },
                ].map(({ tab, icon: Icon, label }) => (
                  <Button key={tab} variant={activeTab === tab ? 'light' : 'subtle'} color={activeTab === tab ? 'orange' : 'gray'} fullWidth justify={sidebarCollapsed ? 'center' : 'flex-start'} leftSection={!sidebarCollapsed ? <Icon size={20} /> : undefined} onClick={() => setActiveTab(tab)} style={sidebarCollapsed ? { padding: '8px 0' } : undefined}>
                    {sidebarCollapsed ? <Icon size={20} /> : label}
                  </Button>
                ))}
              </>
            )}
          </Stack>

          <Divider my="md" />

          <Stack gap="xs">
            {!sidebarCollapsed && <Text size="xs" c="dimmed" fw={500} px="xs">Channels</Text>}
            
            <Button
              variant={activeTab === 'request-delivery' ? 'light' : 'subtle'}
              color={activeTab === 'request-delivery' ? 'orange' : 'gray'}
              fullWidth
              justify={sidebarCollapsed ? 'center' : 'flex-start'}
              leftSection={!sidebarCollapsed ? <IconDeviceTablet size={20} /> : undefined}
              onClick={() => setActiveTab('request-delivery')}
              style={sidebarCollapsed ? { padding: '8px 0' } : undefined}
            >
              {sidebarCollapsed ? <IconDeviceTablet size={20} /> : 'Request a delivery'}
            </Button>
          </Stack>

          <Box mt="md">
            <Button
              variant="subtle"
              fullWidth
              justify={sidebarCollapsed ? 'center' : 'flex-start'}
              leftSection={!sidebarCollapsed ? <IconPlus size={20} /> : undefined}
              onClick={() => navigate(window.location.pathname.startsWith('/portal') ? '/solutions' : '/restaurant/solutions')}
              style={sidebarCollapsed ? { padding: '8px 0' } : undefined}
            >
              {sidebarCollapsed ? <IconPlus size={20} /> : 'Add solutions'}
            </Button>
          </Box>
        </ScrollArea>

        {/* User Profile */}
        <Box p={sidebarCollapsed ? 'xs' : 'md'} style={{ borderTop: '1px solid var(--mantine-color-gray-3)', display: 'flex', justifyContent: 'center' }}>
          <Menu width={224} position="top-end">
            <Menu.Target>
              {sidebarCollapsed ? (
                <Button variant="subtle" size="compact-md" style={{ padding: 8 }}>
                  <Avatar size="sm" radius="xl" color="gray">
                    {(fullName ?? userName).charAt(0).toUpperCase()}
                  </Avatar>
                </Button>
              ) : (
                <Button
                  variant="subtle"
                  fullWidth
                  justify="flex-start"
                  leftSection={
                    <Avatar size="sm" radius="xl" color="gray">
                      {(fullName ?? userName).charAt(0).toUpperCase()}
                    </Avatar>
                  }
                  rightSection={<IconChevronDown size={16} />}
                >
                  {userName}
                </Button>
              )}
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                component="a"
                href="/legal/privacy"
                target="_blank"
                rel="noopener noreferrer"
                leftSection={<IconFileText size={16} />}
              >
                Privacy Policy
              </Menu.Item>
              <Menu.Item
                component="a"
                href="/legal/terms"
                target="_blank"
                rel="noopener noreferrer"
                leftSection={<IconFileText size={16} />}
              >
                Terms of Service
              </Menu.Item>
              <Menu.Item
                component="a"
                href="/drive-on-demand-merchant-terms"
                target="_blank"
                rel="noopener noreferrer"
                leftSection={<IconFileText size={16} />}
              >
                Drive on demand terms
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item
                leftSection={<IconLogout size={16} />}
                color="red"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate('/restaurant/auth');
                }}
              >
                Log out
              </Menu.Item>
              <Menu.Divider />
              <Menu.Label style={{ fontSize: 11, color: "var(--mantine-color-dimmed)" }}>
                Version {MERCHANT_PORTAL_VERSION}
              </Menu.Label>
            </Menu.Dropdown>
          </Menu>
        </Box>
      </Box>

      {/* Main Content - full width unibody for all tabs */}
      <style>{`
        .merchant-portal-content > * { max-width: none; width: 100%; box-sizing: border-box; }
      `}</style>
      <ScrollArea style={{ flex: 1, minWidth: 0 }} scrollbarSize={8} type="auto">
        <Box
          className="merchant-portal-content"
          style={{
            width: '100%',
            padding: '52px 48px 80px',
            boxSizing: 'border-box',
            minHeight: '100%',
          }}
        >
          {activeTab === 'home' ? (
            allStepsComplete ? (
              <>
                <div style={{ marginBottom: 24 }}>
                  <Text size="sm" c="dimmed">Welcome back, {userName}</Text>
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
              <Box style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <div style={{ fontSize: 13.5, color: '#7A726E', marginBottom: 6 }}>Welcome, {userName}</div>
                  <h1 style={{ fontSize: 34, fontWeight: 800, color: '#141210', letterSpacing: '-0.025em', lineHeight: 1.1, margin: '0 0 6px' }}>
                    Set up your store
                  </h1>
                  <div style={{ fontSize: 14, color: '#7A726E' }}>
                    Complete these steps to go live with your store by <strong style={{ color: '#141210', fontWeight: 600 }}>{deadline}</strong>.
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
            : activeTab === 'orders' ? <RestaurantCustomerOrderManagement restaurantId={restaurant.id} />
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

      {/* Right Sidebar - Store Preview */}
      
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
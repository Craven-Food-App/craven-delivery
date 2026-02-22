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
} from "@tabler/icons-react";
import { useRestaurantSelector } from "@/hooks/useRestaurantSelector";
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

const RestaurantSetup = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'home' | 'insights' | 'reports' | 'customers' | 'orders' | 'menu' | 'products' | 'inventory' | 'availability' | 'financials' | 'settings' | 'request-delivery'>('home');
  const [userName, setUserName] = useState("User");
  const [fullName, setFullName] = useState<string | null>(null);
  const [settingsTab, setSettingsTab] = useState<string>("account");
  const [showWelcomeConfetti, setShowWelcomeConfetti] = useState(false);
  const [addLocationModalOpen, setAddLocationModalOpen] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const { restaurants, selectedRestaurant: restaurant, loading: restaurantLoading, selectRestaurant, refetchRestaurants } = useRestaurantSelector();
  const { progress, readiness, loading: onboardingLoading, refreshData } = useRestaurantOnboarding(restaurant?.id);
  const labels = getMerchantLabels(restaurant?.restaurant_type);

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

  // Keep URL in sync when tab changes
  useEffect(() => {
    const currentTab = searchParams.get('tab');
    if (currentTab !== activeTab) {
      const next = new URLSearchParams(searchParams);
      next.set('tab', activeTab);
      setSearchParams(next, { replace: true });
    }
  }, [activeTab]);
  const merchantGroup = getMerchantGroup(restaurant?.restaurant_type);
  const isRetail = merchantGroup === 'retail' || merchantGroup === 'grocery';
  const isGrocery = merchantGroup === 'grocery';

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

  if (restaurantLoading || onboardingLoading) {
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

  return (
    <Box style={{ display: 'flex', height: '100vh' }}>
      {/* Left Sidebar */}
      <Box style={{ width: '256px', borderRight: '1px solid var(--mantine-color-gray-3)', display: 'flex', flexDirection: 'column' }}>
        {/* Logo */}
        <Box p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
          <Group gap="xs">
            <img 
              src="/merchant-logo.png" 
              alt="Crave'N" 
              style={{ height: '24px', width: 'auto' }}
            />
            <Text fw={600} size="lg">Merchant</Text>
          </Group>
        </Box>

        {/* Restaurant Selector */}
        <Box p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
          <Menu width={224} position="bottom-start">
            <Menu.Target>
              <Button
                variant="subtle"
                fullWidth
                justify="space-between"
                leftSection={
                  <Group gap="xs">
                    <Avatar 
                      size="sm" 
                      radius="xl" 
                      color="gray"
                      src={restaurant?.logo_url}
                    >
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
        <ScrollArea style={{ flex: 1 }} p="xs">
          <Stack gap="xs">
            <Button
              variant={activeTab === 'home' ? 'light' : 'subtle'}
              color={activeTab === 'home' ? 'orange' : 'gray'}
              fullWidth
              justify="flex-start"
              leftSection={<IconHome size={20} />}
              onClick={() => setActiveTab('home')}
            >
              Home
            </Button>

            {isRetail ? (
              <>
                {/* ========== RETAIL / GROCERY SIDEBAR ========== */}
                <Text size="xs" c="dimmed" fw={500} px="xs" mt="xs">Sales</Text>
                
                <Button
                  variant={activeTab === 'orders' ? 'light' : 'subtle'}
                  color={activeTab === 'orders' ? 'orange' : 'gray'}
                  fullWidth
                  justify="flex-start"
                  leftSection={<IconPackage size={20} />}
                  onClick={() => setActiveTab('orders')}
                >
                  Orders
                </Button>
                
                <Button
                  variant={activeTab === 'customers' ? 'light' : 'subtle'}
                  color={activeTab === 'customers' ? 'orange' : 'gray'}
                  fullWidth
                  justify="flex-start"
                  leftSection={<IconUsers size={20} />}
                  onClick={() => setActiveTab('customers')}
                >
                  Customers
                </Button>

                <Text size="xs" c="dimmed" fw={500} px="xs" mt="xs">Catalog</Text>
                
                <Button
                  variant={activeTab === 'products' ? 'light' : 'subtle'}
                  color={activeTab === 'products' ? 'orange' : 'gray'}
                  fullWidth
                  justify="flex-start"
                  leftSection={<IconShoppingBag size={20} />}
                  onClick={() => setActiveTab('products')}
                >
                  Products
                </Button>
                
                <Button
                  variant={activeTab === 'inventory' ? 'light' : 'subtle'}
                  color={activeTab === 'inventory' ? 'orange' : 'gray'}
                  fullWidth
                  justify="flex-start"
                  leftSection={<IconBoxMultiple size={20} />}
                  onClick={() => setActiveTab('inventory')}
                >
                  Inventory
                </Button>

                <Text size="xs" c="dimmed" fw={500} px="xs" mt="xs">Analytics</Text>
                
                <Button
                  variant={activeTab === 'insights' ? 'light' : 'subtle'}
                  color={activeTab === 'insights' ? 'orange' : 'gray'}
                  fullWidth
                  justify="flex-start"
                  leftSection={<IconTrendingUp size={20} />}
                  onClick={() => setActiveTab('insights')}
                >
                  Insights
                </Button>
                
                <Button
                  variant={activeTab === 'reports' ? 'light' : 'subtle'}
                  color={activeTab === 'reports' ? 'orange' : 'gray'}
                  fullWidth
                  justify="flex-start"
                  leftSection={<IconFileText size={20} />}
                  onClick={() => setActiveTab('reports')}
                >
                  Reports
                </Button>
                
                <Button
                  variant={activeTab === 'financials' ? 'light' : 'subtle'}
                  color={activeTab === 'financials' ? 'orange' : 'gray'}
                  fullWidth
                  justify="flex-start"
                  leftSection={<IconCurrencyDollar size={20} />}
                  onClick={() => setActiveTab('financials')}
                >
                  Financials
                </Button>

                <Text size="xs" c="dimmed" fw={500} px="xs" mt="xs">Store</Text>
                
                <Button
                  variant={activeTab === 'availability' ? 'light' : 'subtle'}
                  color={activeTab === 'availability' ? 'orange' : 'gray'}
                  fullWidth
                  justify="flex-start"
                  leftSection={<IconCalendar size={20} />}
                  onClick={() => setActiveTab('availability')}
                >
                  {labels.availabilityLabel}
                </Button>
                
                <Button
                  variant={activeTab === 'settings' ? 'light' : 'subtle'}
                  color={activeTab === 'settings' ? 'orange' : 'gray'}
                  fullWidth
                  justify="flex-start"
                  leftSection={<IconSettings size={20} />}
                  onClick={() => setActiveTab('settings')}
                >
                  Settings
                </Button>
              </>
            ) : (
              <>
                {/* ========== RESTAURANT SIDEBAR ========== */}
                <Button
                  variant={activeTab === 'insights' ? 'light' : 'subtle'}
                  color={activeTab === 'insights' ? 'orange' : 'gray'}
                  fullWidth
                  justify="flex-start"
                  leftSection={<IconTrendingUp size={20} />}
                  onClick={() => setActiveTab('insights')}
                >
                  Insights
                </Button>
                
                <Button
                  variant={activeTab === 'reports' ? 'light' : 'subtle'}
                  color={activeTab === 'reports' ? 'orange' : 'gray'}
                  fullWidth
                  justify="flex-start"
                  leftSection={<IconFileText size={20} />}
                  onClick={() => setActiveTab('reports')}
                >
                  Reports
                </Button>
                
                <Button
                  variant={activeTab === 'customers' ? 'light' : 'subtle'}
                  color={activeTab === 'customers' ? 'orange' : 'gray'}
                  fullWidth
                  justify="flex-start"
                  leftSection={<IconUsers size={20} />}
                  onClick={() => setActiveTab('customers')}
                >
                  Customers
                </Button>
                
                <Button
                  variant={activeTab === 'orders' ? 'light' : 'subtle'}
                  color={activeTab === 'orders' ? 'orange' : 'gray'}
                  fullWidth
                  justify="flex-start"
                  leftSection={<IconPackage size={20} />}
                  onClick={() => setActiveTab('orders')}
                >
                  Orders
                </Button>
                
                <Button
                  variant={activeTab === 'menu' ? 'light' : 'subtle'}
                  color={activeTab === 'menu' ? 'orange' : 'gray'}
                  fullWidth
                  justify="flex-start"
                  leftSection={<IconMenu2 size={20} />}
                  onClick={() => setActiveTab('menu')}
                >
                  Menu
                </Button>
                
                <Button
                  variant={activeTab === 'availability' ? 'light' : 'subtle'}
                  color={activeTab === 'availability' ? 'orange' : 'gray'}
                  fullWidth
                  justify="flex-start"
                  leftSection={<IconCalendar size={20} />}
                  onClick={() => setActiveTab('availability')}
                >
                  Store availability
                </Button>
                
                <Button
                  variant={activeTab === 'financials' ? 'light' : 'subtle'}
                  color={activeTab === 'financials' ? 'orange' : 'gray'}
                  fullWidth
                  justify="flex-start"
                  leftSection={<IconCurrencyDollar size={20} />}
                  onClick={() => setActiveTab('financials')}
                >
                  Financials
                </Button>
                
                <Button
                  variant={activeTab === 'settings' ? 'light' : 'subtle'}
                  color={activeTab === 'settings' ? 'orange' : 'gray'}
                  fullWidth
                  justify="flex-start"
                  leftSection={<IconSettings size={20} />}
                  onClick={() => setActiveTab('settings')}
                >
                  Settings
                </Button>
              </>
            )}
          </Stack>

          <Divider my="md" />

          <Stack gap="xs">
            <Text size="xs" c="dimmed" fw={500} px="xs">Channels</Text>
            
            <Button
              variant={activeTab === 'request-delivery' ? 'light' : 'subtle'}
              color={activeTab === 'request-delivery' ? 'orange' : 'gray'}
              fullWidth
              justify="flex-start"
              leftSection={<IconDeviceTablet size={20} />}
              onClick={() => setActiveTab('request-delivery')}
            >
              Request a delivery
            </Button>
          </Stack>

          <Box mt="md">
            <Button
              variant="subtle"
              fullWidth
              justify="flex-start"
              leftSection={<IconPlus size={20} />}
              onClick={() => navigate(window.location.pathname.startsWith('/portal') ? '/solutions' : '/restaurant/solutions')}
            >
              Add solutions
            </Button>
          </Box>
        </ScrollArea>

        {/* User Profile */}
        <Box p="md" style={{ borderTop: '1px solid var(--mantine-color-gray-3)' }}>
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
        </Box>
      </Box>

      {/* Main Content */}
      <ScrollArea style={{ flex: 1 }}>
        <Box p="xl">
          {activeTab === 'home' ? (
            allStepsComplete ? (
              <Box style={{ maxWidth: '1280px', margin: '0 auto' }}>
                <Stack gap="xl" mb="xl">
                  <Text size="sm" c="dimmed">Welcome back, {userName}</Text>
                  <Title order={1}>Dashboard</Title>
                </Stack>
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
              </Box>
            ) : (
              <Box style={{ maxWidth: '1024px', margin: '0 auto' }}>
                <Stack gap="xl" mb="xl">
                  <Text size="sm" c="dimmed">Welcome, {userName}</Text>
                  <Title order={1}>Set up your store</Title>
                  <Text size="sm" c="dimmed">
                    Complete these steps to go live with your store by <Text component="span" fw={500}>{deadline}</Text>.
                  </Text>
                </Stack>

          {/* Prepare your store section */}
          <Box mb="lg">
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
          </Box>

          {/* Go live section */}
          <GoLiveSection
            readiness={readiness}
            targetDate={deadline}
            onNavigateToSettings={(tab) => {
              setSettingsTab(tab);
              setActiveTab("settings");
            }}
            onNavigateToAvailability={() => setActiveTab("availability")}
          />

          {/* Continue Crave'N setup */}
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
        : activeTab === 'settings' ? <SettingsDashboard defaultTab={settingsTab} restaurantId={restaurant?.id} /> 
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
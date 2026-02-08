import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  };
  
  return typeMap[type] || type.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

const RestaurantSetup = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'home' | 'insights' | 'reports' | 'customers' | 'orders' | 'menu' | 'availability' | 'financials' | 'settings' | 'request-delivery'>('home');
  const [prepareStoreExpanded, setPrepareStoreExpanded] = useState(true);
  const [userName, setUserName] = useState("User");
  const [settingsTab, setSettingsTab] = useState<string>("account");
  const [showWelcomeConfetti, setShowWelcomeConfetti] = useState(false);
  
  const { restaurants, selectedRestaurant: restaurant, loading: restaurantLoading, selectRestaurant } = useRestaurantSelector();
  const { progress, readiness, loading: onboardingLoading, refreshData } = useRestaurantOnboarding(restaurant?.id);
  const labels = getMerchantLabels(restaurant?.restaurant_type);

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
          setUserName(profile.full_name.split(' ')[0]);
        }
      }
    };
    fetchUserProfile();
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

  const handleCreateAdditionalLocation = async () => {
    if (!restaurant) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('create-additional-location', {
        body: {
          parent_restaurant_id: restaurant.id,
          location_data: {
            name: `${restaurant.name} - New Location`,
            address: "",
            city: "",
            state: "",
            zip_code: ""
          }
        }
      });

      if (error) throw error;

      notifications.show({
        title: "Success",
        message: "New location created successfully",
        color: 'green',
      });

      navigate('/restaurant/onboarding');
    } catch (error) {
      console.error('Error creating location:', error);
      notifications.show({
        title: "Error",
        message: "Failed to create new location",
        color: 'red',
      });
    }
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
              leftSection={labels.catalogLabel === 'Products' ? <IconShoppingBag size={20} /> : <IconMenu2 size={20} />}
              onClick={() => setActiveTab('menu')}
            >
              {labels.catalogLabel}
            </Button>
            
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
              onClick={() => navigate('/restaurant/solutions')}
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
                T
              </Avatar>
            }
            rightSection={<IconChevronDown size={16} />}
          >
            {userName} Stroman
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
                <HomeDashboard 
                  restaurantId={restaurant?.id || ''} 
                  restaurant={restaurant}
                  readiness={readiness}
                />
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
          <Card p="lg" mb="lg" withBorder>
            <Button
              variant="subtle"
              fullWidth
              onClick={() => setPrepareStoreExpanded(!prepareStoreExpanded)}
              rightSection={prepareStoreExpanded ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
              styles={{ root: { justifyContent: 'space-between', height: 'auto', padding: '16px' } }}
            >
              <Stack gap="xs" align="flex-start" style={{ flex: 1 }}>
                <Title order={3} style={{ textAlign: 'left' }}>Prepare your store</Title>
                <Text size="sm" c="dimmed" style={{ textAlign: 'left' }}>
                  Review other steps before your store goes live.
                </Text>
              </Stack>
              <Text size="sm" c="dimmed">{completedSteps} of 3 steps</Text>
            </Button>

            {prepareStoreExpanded && (
              <Stack gap="md" mt="md">
                {/* Business info verified */}
                <Card p="lg" withBorder>
                  <Group gap="md" align="flex-start">
                    <Box style={{ flexShrink: 0 }}>
                      <Box
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: isBusinessVerified ? 'var(--mantine-color-green-6)' : 'var(--mantine-color-orange-6)',
                        }}
                      >
                        {isBusinessVerified ? (
                          <Box style={{ position: 'relative' }}>
                            <IconClock size={24} style={{ color: 'white' }} />
                            <Box
                              style={{
                                position: 'absolute',
                                bottom: -4,
                                right: -4,
                                width: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--mantine-color-green-6)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <IconCircleCheck size={12} style={{ color: 'white' }} />
                            </Box>
                          </Box>
                        ) : (
                          <IconClock size={24} style={{ color: 'white' }} />
                        )}
                      </Box>
                    </Box>
                    <Stack gap="xs" style={{ flex: 1 }}>
                      <Title order={4}>
                        {isBusinessVerified 
                          ? 'Your business info was verified' 
                          : 'Business verification pending'}
                      </Title>
                      <Text size="sm" c="dimmed">
                        {isBusinessVerified
                          ? "We've reviewed and verified your business info. No further action is needed."
                          : "Our team is reviewing your business documents. This usually takes 1-2 business days."}
                      </Text>
                    </Stack>
                  </Group>
                </Card>

                {/* Menu preparation */}
                <Card p="lg" withBorder>
                  <Group gap="md" align="flex-start">
                    <Box style={{ flexShrink: 0 }}>
                      <Box
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: progress?.menu_preparation_status === 'ready' 
                            ? 'var(--mantine-color-green-6)' 
                            : progress?.menu_preparation_status === 'in_progress'
                              ? 'var(--mantine-color-green-6)'
                              : 'var(--mantine-color-red-6)',
                        }}
                      >
                        {progress?.menu_preparation_status === 'ready' ? (
                          <IconCircleCheck size={24} style={{ color: 'white' }} />
                        ) : (
                          <IconClock size={24} style={{ color: 'white' }} />
                        )}
                      </Box>
                    </Box>
                    <Stack gap="xs" style={{ flex: 1 }}>
                      <Group gap="xs" align="center">
                        <Title order={4}>
                          {progress?.menu_preparation_status === 'ready' 
                            ? labels.catalogPrepReady 
                            : progress?.menu_preparation_status === 'in_progress'
                              ? labels.catalogPrepInProgress
                              : labels.catalogPrepNotStarted}
                        </Title>
                        <Badge
                          color={
                            progress?.menu_preparation_status === 'ready'
                              ? 'green'
                              : progress?.menu_preparation_status === 'in_progress'
                                ? 'yellow'
                                : 'red'
                          }
                          variant="light"
                          size="sm"
                        >
                          {progress?.menu_preparation_status === 'ready' 
                            ? 'Complete' 
                            : progress?.menu_preparation_status === 'in_progress'
                              ? 'In progress'
                              : 'Not started'}
                        </Badge>
                      </Group>
                      <Text size="sm" c="dimmed" mb="md">
                        {progress?.menu_preparation_status === 'ready'
                          ? `Your ${labels.catalogLabel.toLowerCase()} has been prepared and is ready to go live.`
                          : `This usually takes 2 business days. You'll get an email when your ${labels.catalogLabel.toLowerCase()} is ready.`}
                      </Text>
                      
                      {progress?.menu_preparation_status === 'ready' && !restaurant?.header_image_url && (
                        <Box p="md" style={{ backgroundColor: 'var(--mantine-color-gray-0)', borderRadius: '8px' }}>
                          <Stack gap="xs">
                            <Text fw={600} size="sm">Add a store header</Text>
                            <Text size="sm" c="dimmed" mb="md">
                              Stores with a header image get up to 50% more monthly sales.
                            </Text>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSettingsTab('store');
                                setActiveTab('settings');
                              }}
                            >
                              Add a header image
                            </Button>
                          </Stack>
                        </Box>
                      )}
                    </Stack>
                  </Group>
                </Card>

                {/* Tablet status */}
                <Card p="lg" withBorder>
                  <Group gap="md" align="flex-start">
                    <Box style={{ flexShrink: 0 }}>
                      <Box
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: progress?.tablet_delivered_at 
                            ? 'var(--mantine-color-green-6)' 
                            : progress?.tablet_shipped 
                              ? 'var(--mantine-color-blue-6)' 
                              : progress?.tablet_preparing_shipment
                                ? 'var(--mantine-color-yellow-6)'
                                : 'var(--mantine-color-gray-3)',
                        }}
                      >
                        <IconDeviceTablet size={24} style={{ color: progress?.tablet_delivered_at || progress?.tablet_shipped || progress?.tablet_preparing_shipment ? 'white' : 'var(--mantine-color-dimmed)' }} />
                      </Box>
                    </Box>
                    <Stack gap="xs" style={{ flex: 1 }}>
                      <Group gap="xs" align="center">
                        <Title order={4}>
                          {progress?.tablet_delivered_at
                            ? 'Your tablet has been delivered'
                            : progress?.tablet_shipped
                              ? 'Your tablet is in transit'
                              : progress?.tablet_preparing_shipment
                                ? 'Tablet is preparing for shipment'
                                : 'Tablet not yet shipped'}
                        </Title>
                        {(progress?.tablet_shipped || progress?.tablet_preparing_shipment) && (
                          <Badge
                            color={
                              progress?.tablet_delivered_at
                                ? 'green'
                                : progress?.tablet_shipped
                                  ? 'blue'
                                  : 'yellow'
                            }
                            variant="light"
                            size="sm"
                          >
                            {progress?.tablet_delivered_at ? '✓ Delivered' : progress?.tablet_shipped ? '✓ In transit' : '⏱ Preparing'}
                          </Badge>
                        )}
                      </Group>
                      <Text size="sm" c="dimmed" mb="md">
                        {progress?.tablet_delivered_at
                          ? "Your tablet has been delivered and is ready to use."
                          : progress?.tablet_shipped
                            ? "We'll keep you updated on its status."
                            : progress?.tablet_preparing_shipment
                              ? "Your tablet is being prepared for shipment. You'll receive tracking info soon."
                              : "Your tablet will ship once business verification and menu preparation are complete."}
                      </Text>
                      
                      {progress?.tablet_shipping_label_url && (
                        <Button
                          onClick={() => window.open(progress.tablet_shipping_label_url!, '_blank')}
                          variant="outline"
                          size="sm"
                          fullWidth
                          leftSection={<IconPackage size={16} />}
                        >
                          View Shipping Label
                        </Button>
                      )}

                      {progress?.tablet_tracking_number && progress?.tablet_shipped && (
                        <Box p="md" style={{ backgroundColor: 'var(--mantine-color-gray-0)', borderRadius: '8px' }} mt="md">
                          <Stack gap="xs">
                            <Text fw={600} size="sm">Tracking Information</Text>
                            <Text size="sm">
                              <Text component="span" c="dimmed">Carrier:</Text> {progress.tablet_shipping_carrier || 'USPS'}
                            </Text>
                            <Text size="sm">
                              <Text component="span" c="dimmed">Tracking #:</Text> {progress.tablet_tracking_number}
                            </Text>
                            {progress.tablet_shipped_at && (
                              <Text size="sm">
                                <Text component="span" c="dimmed">Shipped:</Text> {format(new Date(progress.tablet_shipped_at), 'PPP')}
                              </Text>
                            )}
                            <Button
                              onClick={() => {
                                const carrier = progress.tablet_shipping_carrier || 'USPS';
                                const trackingUrl = carrier === 'USPS' 
                                  ? `https://tools.usps.com/go/TrackConfirmAction?tLabels=${progress.tablet_tracking_number}`
                                  : carrier === 'UPS'
                                  ? `https://www.ups.com/track?tracknum=${progress.tablet_tracking_number}`
                                  : carrier === 'FedEx'
                                  ? `https://www.fedex.com/fedextrack/?trknbr=${progress.tablet_tracking_number}`
                                  : `https://www.dhl.com/en/express/tracking.html?AWB=${progress.tablet_tracking_number}`;
                                window.open(trackingUrl, '_blank');
                              }}
                              size="sm"
                              fullWidth
                              mt="xs"
                            >
                              Track Package
                            </Button>
                          </Stack>
                        </Box>
                      )}
                    </Stack>
                  </Group>
                </Card>
              </Stack>
            )}
          </Card>

          {/* Go live section */}
          <Card p="lg" mb="lg" withBorder>
            <Group gap="md" align="flex-start">
              <Box style={{ flexShrink: 0 }}>
                <IconBuildingStore size={64} style={{ color: 'var(--mantine-color-orange-6)' }} />
              </Box>
              <Stack gap="xs" style={{ flex: 1 }}>
                <Group gap="xs" align="center">
                  <Title order={4}>Go live with your store</Title>
                  <Badge
                    color={readiness?.ready ? 'green' : 'orange'}
                    variant="light"
                    size="sm"
                  >
                    {readiness?.ready ? '✓ Ready' : '🔥 Not ready'}
                  </Badge>
                  {readiness && (
                    <Text size="xs" c="dimmed" fw={500}>
                      Readiness: {readiness.score}%
                    </Text>
                  )}
                </Group>
                <Text size="sm" c="dimmed" mb="md">
                  {readiness?.ready
                    ? `You're ready to go live! Your estimated launch date is ${deadline}.`
                    : `We recommend going live by ${deadline}. Complete the items below to go live.`}
                </Text>
                {readiness && readiness.blockers.length > 0 && (
                  <Box p="md" style={{ backgroundColor: 'var(--mantine-color-orange-0)', borderRadius: '8px' }} mt="md">
                    <Text fw={600} size="sm" c="orange.9" mb="xs">Required to go live:</Text>
                    <Stack gap="xs">
                      {readiness.blockers.map((blocker, idx) => (
                        <Text key={idx} size="sm" c="orange.8">• {blocker}</Text>
                      ))}
                    </Stack>
                  </Box>
                )}
                {readiness && readiness.missing_items.length > 0 && (
                  <Box p="md" style={{ backgroundColor: 'var(--mantine-color-blue-0)', borderRadius: '8px' }} mt="md">
                    <Text fw={600} size="sm" c="blue.9" mb="xs">Recommended items:</Text>
                    <Stack gap="xs">
                      {readiness.missing_items.slice(0, 3).map((item, idx) => (
                        <Text key={idx} size="sm" c="blue.8">• {item}</Text>
                      ))}
                    </Stack>
                  </Box>
                )}
              </Stack>
            </Group>
          </Card>

          {/* Continue Crave'N setup */}
          <Box mb="lg">
            <Stack gap="md">
              <Title order={2}>Continue your Crave'N setup</Title>
              <Text size="sm" c="dimmed" mb="md">
                While our team is preparing your {labels.entityLabel}, continue your Crave'N setup to maximize sales.
              </Text>

              <Card p="lg" withBorder>
                <Group gap="md" align="flex-start">
                  <Box style={{ flexShrink: 0 }}>
                    <Box
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--mantine-color-orange-0)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <IconBuildingStore size={32} style={{ color: 'var(--mantine-color-orange-6)' }} />
                    </Box>
                  </Box>
                  <Stack gap="xs" style={{ flex: 1 }}>
                    <Title order={4}>Add another store or a new business</Title>
                    <Text size="sm" c="dimmed" mb="md">
                      We noticed you signed up for more than one store location. Continue setting up your business on Crave'N by adding another store or business now.
                    </Text>
                    <Button 
                      color="orange"
                      onClick={handleCreateAdditionalLocation}
                    >
                      Add store or business
                    </Button>
                  </Stack>
                </Group>
              </Card>
            </Stack>
          </Box>
        </Box>
      )
      ) : !restaurant ? (
        <div className="p-6 text-center">
          <p className="text-muted-foreground">Please select a store to continue.</p>
        </div>
      ) : activeTab === 'insights' ? <InsightsDashboard /> : activeTab === 'reports' ? <ReportsDashboard /> : activeTab === 'customers' ? <CustomersDashboard /> : activeTab === 'orders' ? <RestaurantCustomerOrderManagement restaurantId={restaurant.id} /> : activeTab === 'menu' ? <MenuDashboard restaurantId={restaurant.id} /> : activeTab === 'availability' ? <StoreAvailabilityDashboard /> : activeTab === 'financials' ? <FinancialsDashboard /> : activeTab === 'settings' ? <SettingsDashboard defaultTab={settingsTab} /> : activeTab === 'request-delivery' ? <RequestDeliveryDashboard /> : null}
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
    </Box>
  );
};

export default RestaurantSetup;
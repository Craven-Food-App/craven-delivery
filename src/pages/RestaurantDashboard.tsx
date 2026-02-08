import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Button,
  Card,
  Badge,
  Tabs,
  Text,
  Title,
  Stack,
  Group,
  Grid,
  Box,
  Loader,
  Image,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconPlus,
  IconBuildingStore,
  IconMenu2,
  IconSettings,
  IconChartBar,
} from "@tabler/icons-react";
import Header from "@/components/Header";
import { MenuManagement } from "@/components/restaurant/MenuManagement";
import { RestaurantSettings } from "@/components/restaurant/RestaurantSettings";
import MenuImportTool from "@/components/restaurant/MenuImportTool";
import RestaurantHours from "@/components/restaurant/RestaurantHours";
import { NewOrderAlert } from "@/components/restaurant/NewOrderAlert";
import { RestaurantCustomerOrderManagement } from "@/components/restaurant/RestaurantCustomerOrderManagement";
import { PhoneOrderPOS } from "@/components/restaurant/PhoneOrderPOS";
import { EmployeeManagement } from "@/components/restaurant/EmployeeManagement";
import StoreManagement from "@/components/restaurant/StoreManagement";
import SimpleStoreManagement from "@/components/restaurant/SimpleStoreManagement";
import BasicStoreManagement from "@/components/restaurant/BasicStoreManagement";
import StoreLocationSelector from "@/components/restaurant/StoreLocationSelector";
import StoreSetupWizard from "@/components/restaurant/StoreSetupWizard";
import RestaurantBottomNav from "@/components/mobile/RestaurantBottomNav";
import { useIsMobile } from "@/hooks/use-mobile";

interface Restaurant {
  id: string;
  name: string;
  description: string;
  cuisine_type: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  delivery_fee_cents: number;
  min_delivery_time: number;
  max_delivery_time: number;
  is_active: boolean;
  is_promoted: boolean;
  rating: number;
  total_reviews: number;
  image_url: string;
  created_at: string;
}

const RestaurantDashboard = () => {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [showStoreSetup, setShowStoreSetup] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchRestaurant();
  }, []);

  const fetchRestaurant = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Use selectedStoreId if available (multi-restaurant support), otherwise fetch most recent
      let query = supabase
        .from("restaurants")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      
      if (selectedStoreId) {
        query = supabase
          .from("restaurants")
          .select("*")
          .eq("id", selectedStoreId)
          .eq("owner_id", user.id)
          .limit(1);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        notifications.show({
          title: "No restaurant found",
          message: "You haven't registered a restaurant yet. Let's get started!",
          color: 'blue',
        });
        navigate("/restaurant/register");
        return;
      }

      setRestaurant(data[0]);
    } catch (error) {
      console.error("Error fetching restaurant:", error);
      notifications.show({
        title: "Error loading restaurant",
        message: "There was a problem loading your restaurant information.",
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <Box style={{ minHeight: '100vh' }}>
        <Header />
        <Box p="xl">
          <Stack align="center" gap="md">
            <Loader size="lg" />
            <Text>Loading your restaurant dashboard...</Text>
          </Stack>
        </Box>
      </Box>
    );
  }

  if (!restaurant) {
    return (
      <Box style={{ minHeight: '100vh' }}>
        <Header />
        <Box p="xl">
          <Stack align="center" gap="md">
            <Title order={2}>No Restaurant Found</Title>
            <Text c="dimmed">You haven't registered a restaurant yet.</Text>
            <Button onClick={() => navigate("/restaurant/register")}>
              Register Your Restaurant
            </Button>
          </Stack>
        </Box>
      </Box>
    );
  }

  return (
    <Box style={{ minHeight: '100vh' }}>
      <Header />
      
      <Box p="xl">
        <Group justify="space-between" align="center" mb="xl">
          <Group gap="xl">
            <Stack gap="xs">
              <Title order={1}>Restaurant Dashboard</Title>
              <Text c="dimmed">Manage your restaurant and orders</Text>
            </Stack>
            <NewOrderAlert restaurantId={restaurant.id} />
          </Group>
          <Group gap="xs">
            <Badge color={restaurant.is_active ? "green" : "gray"}>
              {restaurant.is_active ? "Active" : "Inactive"}
            </Badge>
            {restaurant.is_promoted && <Badge variant="outline">Promoted</Badge>}
          </Group>
        </Group>

        {/* Store Location Selector */}
        <Box mb="xl">
          <StoreLocationSelector 
            selectedStoreId={selectedStoreId}
            onStoreChange={setSelectedStoreId}
          />
        </Box>

        <Tabs value={activeTab} onChange={setActiveTab}>
          {!isMobile && (
            <Tabs.List>
              <Tabs.Tab value="overview">Overview</Tabs.Tab>
              <Tabs.Tab value="menu">Menu</Tabs.Tab>
              <Tabs.Tab value="pos">Phone Orders</Tabs.Tab>
              <Tabs.Tab value="orders">Orders</Tabs.Tab>
              <Tabs.Tab value="stores">Stores</Tabs.Tab>
              <Tabs.Tab value="employees">Employees</Tabs.Tab>
              <Tabs.Tab value="settings">Settings</Tabs.Tab>
            </Tabs.List>
          )}

          <Tabs.Panel value="overview" pt="xl">
            <Stack gap="xl">
              <Grid gutter="md">
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                  <Card p="md" withBorder>
                    <Group justify="space-between" mb="xs">
                      <Text size="sm" fw={500}>Status</Text>
                      <IconBuildingStore size={16} style={{ color: 'var(--mantine-color-dimmed)' }} />
                    </Group>
                    <Text size="xl" fw={700}>
                      {restaurant.is_active ? "Online" : "Offline"}
                    </Text>
                    <Text size="sm" c="dimmed" mt="xs">
                      {restaurant.is_active 
                        ? "Your restaurant is accepting orders" 
                        : "Contact Crave'N support to activate your restaurant"}
                    </Text>
                  </Card>
                </Grid.Col>

                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                  <Card p="md" withBorder>
                    <Group justify="space-between" mb="xs">
                      <Text size="sm" fw={500}>Rating</Text>
                      <IconChartBar size={16} style={{ color: 'var(--mantine-color-dimmed)' }} />
                    </Group>
                    <Text size="xl" fw={700}>{restaurant.rating.toFixed(1)}</Text>
                    <Text size="xs" c="dimmed" mt="xs">
                      {restaurant.total_reviews} reviews
                    </Text>
                  </Card>
                </Grid.Col>

                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                  <Card p="md" withBorder>
                    <Group justify="space-between" mb="xs">
                      <Text size="sm" fw={500}>Delivery Fee</Text>
                      <IconSettings size={16} style={{ color: 'var(--mantine-color-dimmed)' }} />
                    </Group>
                    <Text size="xl" fw={700}>
                      ${(restaurant.delivery_fee_cents / 100).toFixed(2)}
                    </Text>
                    <Text size="xs" c="dimmed" mt="xs">
                      {restaurant.min_delivery_time}-{restaurant.max_delivery_time} min
                    </Text>
                  </Card>
                </Grid.Col>

                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                  <Card p="md" withBorder>
                    <Group justify="space-between" mb="xs">
                      <Text size="sm" fw={500}>Cuisine</Text>
                      <IconMenu2 size={16} style={{ color: 'var(--mantine-color-dimmed)' }} />
                    </Group>
                    <Text size="xl" fw={700}>{restaurant.cuisine_type}</Text>
                  </Card>
                </Grid.Col>
              </Grid>

              <Card p="md" withBorder>
                <Stack gap="md">
                  <div>
                    <Title order={4} mb="xs">Restaurant Information</Title>
                    <Text size="sm" c="dimmed">Your restaurant details</Text>
                  </div>
                  <Grid gutter="md">
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Stack gap="xs">
                        <Text fw={600}>{restaurant.name}</Text>
                        <Text size="sm" c="dimmed">{restaurant.description}</Text>
                      </Stack>
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Stack gap="xs">
                        <Text size="sm"><Text component="span" fw={600}>Phone:</Text> {restaurant.phone}</Text>
                        <Text size="sm"><Text component="span" fw={600}>Email:</Text> {restaurant.email}</Text>
                        <Text size="sm">
                          <Text component="span" fw={600}>Address:</Text> {restaurant.address}, {restaurant.city}, {restaurant.state} {restaurant.zip_code}
                        </Text>
                      </Stack>
                    </Grid.Col>
                  </Grid>
                  {restaurant.image_url && (
                    <Box mt="md">
                      <Image 
                        src={restaurant.image_url} 
                        alt={restaurant.name}
                        h={200}
                        fit="cover"
                        radius="md"
                      />
                    </Box>
                  )}
                </Stack>
              </Card>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="menu" pt="xl">
            <Stack gap="md">
              <MenuImportTool restaurantId={restaurant.id} onItemsImported={fetchRestaurant} />
              <MenuManagement restaurantId={restaurant.id} />
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="pos" pt="xl">
            <PhoneOrderPOS restaurantId={restaurant.id} />
          </Tabs.Panel>

          <Tabs.Panel value="orders" pt="xl">
            <RestaurantCustomerOrderManagement restaurantId={restaurant.id} />
          </Tabs.Panel>

          <Tabs.Panel value="stores" pt="xl">
            <BasicStoreManagement />
          </Tabs.Panel>

          <Tabs.Panel value="employees" pt="xl">
            <EmployeeManagement restaurantId={restaurant.id} />
          </Tabs.Panel>

          <Tabs.Panel value="settings" pt="xl">
            <Stack gap="md">
              <RestaurantHours restaurantId={restaurant.id} />
              <RestaurantSettings restaurant={restaurant} onUpdate={fetchRestaurant} />
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Box>
      
      {isMobile && (
        <RestaurantBottomNav 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
        />
      )}
    </Box>
  );
};

export default RestaurantDashboard;
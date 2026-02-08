import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AccountSettingsDashboard from "./settings/AccountSettingsDashboard";
import PricingPlansDashboard from "./settings/PricingPlansDashboard";
import StoreSettingsDashboard from "./settings/StoreSettingsDashboard";
import ManageUsersDashboard from "./settings/ManageUsersDashboard";
import StoreCommunicationsDashboard from "./settings/StoreCommunicationsDashboard";
import BankAccountDashboard from "./settings/BankAccountDashboard";
import IntegrationsDashboard from "./settings/IntegrationsDashboard";
import DeleteStoreDashboard from "./settings/DeleteStoreDashboard";
import { useRestaurantData } from "@/hooks/useRestaurantData";
import { getMerchantLabels } from "@/utils/merchantCategoryLabels";

interface SettingsDashboardProps {
  defaultTab?: string;
}

const SettingsDashboard = ({ defaultTab = "account" }: SettingsDashboardProps) => {
  const { restaurant } = useRestaurantData();
  const labels = getMerchantLabels(restaurant?.restaurant_type);

  return (
    <div className="w-full h-full bg-background">
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold mb-4">Settings</h1>
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="bg-muted flex-wrap h-auto">
              <TabsTrigger value="account">Account Settings</TabsTrigger>
              <TabsTrigger value="pricing">Pricing & Performance</TabsTrigger>
              <TabsTrigger value="store">Store Settings</TabsTrigger>
              <TabsTrigger value="users">Manage Users</TabsTrigger>
              <TabsTrigger value="communications">Store Communications</TabsTrigger>
              <TabsTrigger value="bank">Bank Account</TabsTrigger>
              {labels.showInventoryTab && (
                <TabsTrigger value="inventory">Inventory</TabsTrigger>
              )}
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
              <TabsTrigger value="delete-store">Delete Store</TabsTrigger>
            </TabsList>

            <TabsContent value="account" className="mt-6">
              <AccountSettingsDashboard />
            </TabsContent>

            <TabsContent value="pricing" className="mt-6">
              <PricingPlansDashboard />
            </TabsContent>

            <TabsContent value="store" className="mt-6">
              <StoreSettingsDashboard />
            </TabsContent>

            <TabsContent value="users" className="mt-6">
              <ManageUsersDashboard />
            </TabsContent>

            <TabsContent value="communications" className="mt-6">
              <StoreCommunicationsDashboard />
            </TabsContent>

            <TabsContent value="bank" className="mt-6">
              <BankAccountDashboard />
            </TabsContent>

            {labels.showInventoryTab && (
              <TabsContent value="inventory" className="mt-6">
                <div className="space-y-6">
                  <div className="border rounded-lg p-6 text-center">
                    <h2 className="text-xl font-semibold mb-2">Inventory Management</h2>
                    <p className="text-muted-foreground mb-4">
                      Track stock levels, set low-stock alerts, and manage your {labels.itemNounPlural}.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Use the <strong>Inventory</strong> tab in the sidebar for full stock management.
                    </p>
                  </div>
                </div>
              </TabsContent>
            )}

            <TabsContent value="integrations" className="mt-6">
              <IntegrationsDashboard />
            </TabsContent>

            <TabsContent value="delete-store" className="mt-6">
              <DeleteStoreDashboard />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default SettingsDashboard;

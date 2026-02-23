# Merchant Portal — Complete Settings Section

This document contains the full source code for the Settings section of the merchant portal so you can view it in one place. Files are listed in dependency order.

---

## `src/components/restaurant/dashboard/SettingsDashboard.tsx`

Main Settings wrapper with tabs: Account, Pricing, Store, Users, Communications, Bank, optional Inventory, Integrations, Delete Store.

```tsx
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
  restaurantId?: string;
}

const SettingsDashboard = ({ defaultTab = "account", restaurantId: _restaurantId }: SettingsDashboardProps) => {
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
```

---

## `src/components/restaurant/dashboard/settings/AccountSettingsDashboard.tsx`

Menu settings, tablet settings (login, pause PIN, chat), feeder/customer pickup instructions, save flow.

```tsx
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantData } from "@/hooks/useRestaurantData";
import { toast } from "sonner";

const AccountSettingsDashboard = () => {
  const { restaurant, loading } = useRestaurantData();
  const [autoDescriptions, setAutoDescriptions] = useState(true);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [cravemoreEligible, setCravemoreEligible] = useState(false);
  const [pickupInstructions, setPickupInstructions] = useState("");
  const [customerPickupInstructions, setCustomerPickupInstructions] = useState("");
  const [pausePin, setPausePin] = useState("");
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (restaurant?.id) {
      fetchSettings();
    }
  }, [restaurant?.id]);

  const fetchSettings = async () => {
    const restaurantData = restaurant as any;
    setAutoDescriptions(restaurantData?.auto_descriptions_enabled ?? true);
    setChatEnabled(restaurantData?.chat_enabled ?? true);
    setCravemoreEligible(restaurantData?.cravemore_eligible ?? false);
    setPickupInstructions(restaurantData?.verification_notes?.pickup_instructions || '');
    setCustomerPickupInstructions(restaurantData?.verification_notes?.customer_pickup_instructions || '');
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const existingNotes = (restaurant as any)?.verification_notes || {};
      const { error } = await supabase
        .from("restaurants")
        .update({
          auto_descriptions_enabled: autoDescriptions,
          chat_enabled: chatEnabled,
          cravemore_eligible: cravemoreEligible,
          verification_notes: {
            ...existingNotes,
            pickup_instructions: pickupInstructions,
            customer_pickup_instructions: customerPickupInstructions
          }
        })
        .eq("id", restaurant?.id);

      if (error) throw error;
      toast.success("Settings saved successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleCravemoreToggle = async (checked: boolean) => {
    setCravemoreEligible(checked);
    setSaving(true);
    try {
      const { error } = await supabase
        .from("restaurants")
        .update({ cravemore_eligible: checked })
        .eq("id", restaurant?.id);

      if (error) throw error;
      toast.success(checked ? "CraveMore enabled for your restaurant" : "CraveMore disabled for your restaurant");
    } catch (error) {
      console.error("Error updating CraveMore setting:", error);
      toast.error("Failed to update CraveMore setting");
      setCravemoreEligible(!checked);
    } finally {
      setSaving(false);
    }
  };

  const handleResetTabletPassword = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in again");
        return;
      }
      const { data, error } = await supabase.functions.invoke('reset-tablet-password', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (error) throw error;
      toast.success(data.message || "Password reset successfully");
      if (data.password && data.username) {
        toast.info(`Username: ${data.username}`, { duration: 10000 });
        toast.info(`New Password: ${data.password}`, { duration: 10000 });
      }
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast.error(error.message || "Failed to reset tablet password");
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePin = async () => {
    if (pausePin.length !== 4 || !/^\d{4}$/.test(pausePin)) {
      toast.error("PIN must be exactly 4 digits");
      return;
    }
    setSaving(true);
    try {
      const existingNotes = (restaurant as any)?.verification_notes || {};
      const { error } = await supabase
        .from("restaurants")
        .update({
          verification_notes: { ...existingNotes, pause_pin: pausePin }
        })
        .eq("id", restaurant?.id);
      if (error) throw error;
      toast.success("PIN created successfully");
      setShowPinDialog(false);
    } catch (error) {
      console.error("Error creating PIN:", error);
      toast.error("Failed to create PIN");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-8">
        <Card>
          <CardContent className="p-20 text-center">
            <p>Loading settings...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm">You do not have permission to access the daily payout currently.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">Menu settings</h2>
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Use auto-generated menu descriptions</h3>
                <p className="text-sm text-muted-foreground">
                  Add AI-powered descriptions to items that don't already have them across all of your stores.{" "}
                  <a href="#" className="text-primary underline">Learn more</a>
                </p>
              </div>
              <Switch checked={autoDescriptions} onCheckedChange={setAutoDescriptions} disabled={saving} />
            </div>
            <div className="pt-6 border-t">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Offer CraveMore to customers</h3>
                  <p className="text-sm text-muted-foreground">
                    Enable CraveMore for your restaurant. When enabled, customers will see the CraveMore logo next to your cuisine type.{" "}
                    <a href="#" className="text-primary underline">Learn more</a>
                  </p>
                </div>
                <Switch checked={cravemoreEligible} onCheckedChange={handleCravemoreToggle} disabled={saving} />
              </div>
            </div>
            <div className="pt-6 border-t">
              <h3 className="font-semibold mb-2">Alcohol sales</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Sell alcohol on Crave'n in compliance with local laws and regulations.{" "}
                <a href="#" className="text-primary underline">Learn more</a>
              </p>
              <Button variant="destructive">Add</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-6">Tablet Settings</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Login information</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Username:</p>
                  <p className="font-mono">{restaurant?.id?.slice(0, 15) || 'Not set'}</p>
                </div>
                <Button variant="outline" onClick={handleResetTabletPassword} disabled={saving}>
                  {saving ? "Resetting..." : "Reset password"}
                </Button>
              </div>
            </div>
            <div className="pt-6 border-t">
              <h3 className="font-semibold mb-2">Pause store PIN</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create and manage your PIN to pause your store on the Crave'n Tablet.
              </p>
              {!((restaurant as any)?.verification_notes?.pause_pin) ? (
                <>
                  <p className="text-sm text-red-600 mb-4">You haven't created a PIN yet.</p>
                  <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline">Create PIN</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Pause Store PIN</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="pin">4-Digit PIN</Label>
                          <Input
                            id="pin"
                            type="password"
                            maxLength={4}
                            placeholder="1234"
                            value={pausePin}
                            onChange={(e) => setPausePin(e.target.value.replace(/\D/g, ''))}
                          />
                        </div>
                        <Button onClick={handleCreatePin} disabled={saving || pausePin.length !== 4} className="w-full">
                          {saving ? "Creating..." : "Create PIN"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              ) : (
                <p className="text-sm text-green-600">PIN is set. Use it to pause your store on the tablet.</p>
              )}
            </div>
            <div className="pt-6 border-t">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Chat feature</h3>
                  <p className="text-sm text-muted-foreground">
                    Add chat functionality to contact customers directly through the Crave'n Tablet.
                  </p>
                </div>
                <Switch checked={chatEnabled} onCheckedChange={setChatEnabled} disabled={saving} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">Feeder pickup instructions</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Provide Feeders with instructions to help them navigate your store and improve the order delivery experience.
              </p>
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">Default instructions</h3>
              </div>
              <Textarea
                placeholder="Enter pickup instructions for delivery drivers..."
                value={pickupInstructions}
                onChange={(e) => setPickupInstructions(e.target.value)}
                className="min-h-24"
              />
              <p className="text-xs text-muted-foreground mt-2">
                e.g., "Use the side entrance" or "Ask for orders at the counter"
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">Customer pickup instructions</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Help customers pick up orders faster by providing clear pickup instructions.
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <Textarea
              placeholder="Enter pickup instructions for customers..."
              value={customerPickupInstructions}
              onChange={(e) => setCustomerPickupInstructions(e.target.value)}
              className="min-h-24"
            />
            <p className="text-xs text-muted-foreground">
              e.g., "Pick up at the front counter" or "Orders ready at the drive-thru window"
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSaveSettings} disabled={saving} size="lg">
          {saving ? "Saving..." : "Save All Changes"}
        </Button>
      </div>
    </div>
  );
};

export default AccountSettingsDashboard;
```

---

## `src/components/restaurant/dashboard/settings/StoreCommunicationsDashboard.tsx`

Alerts and performance reporting toggles.

```tsx
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

const StoreCommunicationsDashboard = () => {
  return (
    <div className="space-y-6 pb-8">
      <p className="text-muted-foreground">
        Manage your preferences around communications about your store
      </p>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-6">Important alerts</h2>
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Store deactivations</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Manage recipients of email alerts when your store is temporarily deactivated
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">tppandco@mail.com</span>
                  <Button variant="outline" size="sm">Edit</Button>
                </div>
              </div>
              <Switch />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-6">Performance reporting</h2>
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Store performance summary</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Learn about your store's performance and operational efficiency
                </p>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-primary">Weekly</span>
                  <span className="text-sm text-muted-foreground">•</span>
                  <span className="text-sm font-medium">tppandco@mail.com</span>
                  <Button variant="outline" size="sm">Edit</Button>
                </div>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StoreCommunicationsDashboard;
```

---

## `src/components/restaurant/dashboard/settings/ManageUsersDashboard.tsx`

Team list, invite dialog, delete user.

```tsx
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const ManageUsersDashboard = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newUser, setNewUser] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "staff"
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: restaurantData } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.id)
        .single();
      if (!restaurantData) return;
      setRestaurant(restaurantData);
      const { data: usersData } = await supabase
        .from('restaurant_users')
        .select('*')
        .eq('restaurant_id', restaurantData.id)
        .order('created_at', { ascending: false });
      setUsers(usersData || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const inviteUser = async () => {
    try {
      if (!restaurant) return;
      const response = await supabase.functions.invoke('invite-restaurant-user', {
        body: {
          restaurantId: restaurant.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role
        }
      });
      if (response.error) throw response.error;
      toast({ title: "Success", description: `Invitation sent to ${newUser.email}` });
      setShowInviteDialog(false);
      setNewUser({ email: "", firstName: "", lastName: "", role: "staff" });
      fetchData();
    } catch (error: any) {
      console.error('Error inviting user:', error);
      toast({ title: "Error", description: error.message || "Failed to send invitation", variant: "destructive" });
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const { error } = await supabase.from('restaurant_users').delete().eq('id', userId);
      if (error) throw error;
      toast({ title: "Success", description: "User removed from team" });
      fetchData();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({ title: "Error", description: "Failed to remove user", variant: "destructive" });
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      active: "default",
      pending: "secondary",
      inactive: "outline"
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search" className="pl-10" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogTrigger asChild>
            <Button variant="destructive" className="gap-2">
              <Plus className="w-4 h-4" />
              Add user
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite team member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Email *</Label>
                <Input type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} placeholder="email@example.com" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>First name</Label>
                  <Input value={newUser.firstName} onChange={e => setNewUser({ ...newUser, firstName: e.target.value })} placeholder="John" />
                </div>
                <div>
                  <Label>Last name</Label>
                  <Input value={newUser.lastName} onChange={e => setNewUser({ ...newUser, lastName: e.target.value })} placeholder="Doe" />
                </div>
              </div>
              <div>
                <Label>Role</Label>
                <Select value={newUser.role} onValueChange={role => setNewUser({ ...newUser, role })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={inviteUser} className="w-full" disabled={!newUser.email}>Send Invitation</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium text-sm">Email</th>
                    <th className="text-left p-4 font-medium text-sm">Name</th>
                    <th className="text-left p-4 font-medium text-sm">Role</th>
                    <th className="text-left p-4 font-medium text-sm">Status</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        No team members yet. Invite your first user to get started.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(user => (
                      <tr key={user.id} className="border-b hover:bg-muted/30">
                        <td className="p-4">{user.email}</td>
                        <td className="p-4">{user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : '-'}</td>
                        <td className="p-4 capitalize">{user.role}</td>
                        <td className="p-4">{getStatusBadge(user.status)}</td>
                        <td className="p-4">
                          <Button variant="ghost" size="sm" onClick={() => deleteUser(user.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ManageUsersDashboard;
```


---

## `src/components/restaurant/dashboard/settings/BankAccountDashboard.tsx`

Stripe Connect bank/business info and legacy section toggle.

**Full source:** `src/components/restaurant/dashboard/settings/BankAccountDashboard.tsx` (348 lines). Key behavior: loads Stripe Connect status via `get-stripe-connect-status`, shows verification status and bank account (last4, routing, bank name), "Setup Banking" / "Edit" opens `create-stripe-connect-link`. Toggle "Show legacy Stripe Connect section" shows/hides the Stripe card and business information block.

---

## `src/components/restaurant/dashboard/settings/IntegrationsDashboard.tsx`

POS integrations grid and connect/disconnect.

**Full source:** `src/components/restaurant/dashboard/settings/IntegrationsDashboard.tsx` (223 lines). Lists POS integrations (Checkmate, Olo, Square, Toast, etc.), connects via `restaurant_integrations` insert, shows Connected badge and Disconnect button.

---

## `src/components/restaurant/dashboard/settings/DeleteStoreDashboard.tsx`

Select store, type "DELETE," final confirm, then delete.

```tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Trash2, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Restaurant {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  created_at: string;
}

const DeleteStoreDashboard = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>("");
  const [deleteConfirmation, setDeleteConfirmation] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showFinalWarning, setShowFinalWarning] = useState(false);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to view stores");
        return;
      }
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, address, city, state, created_at')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRestaurants(data || []);
    } catch (error: any) {
      console.error('Error fetching restaurants:', error);
      toast.error('Failed to load stores');
    } finally {
      setLoading(false);
    }
  };

  const selectedRestaurant = restaurants.find(r => r.id === selectedRestaurantId);
  const canProceedToType = selectedRestaurantId !== "";
  const canProceedToFinal = deleteConfirmation === "DELETE";
  const canDelete = canProceedToFinal && showFinalWarning;

  const handleDelete = async () => {
    if (!selectedRestaurant) return;
    try {
      setDeleting(true);
      const { error } = await supabase.from('restaurants').delete().eq('id', selectedRestaurantId);
      if (error) throw error;
      toast.success(`Store "${selectedRestaurant.name}" has been deleted successfully`);
      setSelectedRestaurantId("");
      setDeleteConfirmation("");
      setShowFinalWarning(false);
      await fetchRestaurants();
    } catch (error: any) {
      console.error('Error deleting restaurant:', error);
      toast.error('Failed to delete store. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleFinalConfirm = () => {
    setShowFinalWarning(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading stores...</p>
        </div>
      </div>
    );
  }

  if (restaurants.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Delete Store</CardTitle>
          <CardDescription>Manage and delete your store locations</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>No stores found</AlertTitle>
            <AlertDescription>You don't have any stores to delete.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Delete Store
          </CardTitle>
          <CardDescription>
            Permanently delete a store. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="store-select">Select Store to Delete</Label>
            <Select
              value={selectedRestaurantId}
              onValueChange={(value) => {
                setSelectedRestaurantId(value);
                setDeleteConfirmation("");
                setShowFinalWarning(false);
              }}
            >
              <SelectTrigger id="store-select">
                <SelectValue placeholder="Choose a store to delete..." />
              </SelectTrigger>
              <SelectContent>
                {restaurants.map((restaurant) => (
                  <SelectItem key={restaurant.id} value={restaurant.id}>
                    {restaurant.name} - {restaurant.city}, {restaurant.state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedRestaurant && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="font-medium">{selectedRestaurant.name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedRestaurant.address}, {selectedRestaurant.city}, {selectedRestaurant.state}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Created: {new Date(selectedRestaurant.created_at).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          {canProceedToType && (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  Are you sure you want to delete this store? This will permanently remove all data associated with this store including orders, menu items, and settings.
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label htmlFor="delete-confirmation">
                  Type <span className="font-mono font-bold">DELETE</span> to confirm
                </Label>
                <Input
                  id="delete-confirmation"
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => {
                    setDeleteConfirmation(e.target.value);
                    setShowFinalWarning(false);
                  }}
                  placeholder="Type DELETE here"
                  className="font-mono"
                />
                {deleteConfirmation && deleteConfirmation !== "DELETE" && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <XCircle className="h-4 w-4" />
                    The confirmation text must match exactly (case sensitive)
                  </p>
                )}
                {canProceedToFinal && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    Confirmation text matches
                  </p>
                )}
              </div>
              {canProceedToFinal && (
                <Button variant="destructive" onClick={handleFinalConfirm} className="w-full" disabled={deleting}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Continue to Final Confirmation
                </Button>
              )}
            </div>
          )}

          <AlertDialog open={showFinalWarning} onOpenChange={setShowFinalWarning}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Final Warning
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <p className="font-semibold text-lg">This Cannot Be Undone.</p>
                  <p>
                    You are about to permanently delete <strong>{selectedRestaurant?.name}</strong>.
                    All associated data including orders, menu items, settings, and store locations will be permanently removed.
                  </p>
                  <p className="text-destructive font-medium">This action cannot be reversed.</p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setShowFinalWarning(false)}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Yes, Delete Store"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeleteStoreDashboard;
```

---

## `src/components/restaurant/dashboard/settings/PricingPlansDashboard.tsx`

Commission (15% delivery / 0% pickup), performance-based reach, optional growth tools, CraveMore info.

**Full source:** `src/components/restaurant/dashboard/settings/PricingPlansDashboard.tsx` (301 lines). Uses placeholder metrics, `reachTier()`, Progress bars, GrowthToolInfoModal, CraveMoreText.

---

## `src/components/restaurant/dashboard/settings/StoreSettingsDashboard.tsx`

Store details (name, type, address, phone, description), business hours, brand assets (header + logo with ImageCropper), Instagram, store preview sidebar.

**Full source:** `src/components/restaurant/dashboard/settings/StoreSettingsDashboard.tsx` (793 lines). Edit dialogs per field, AddressAutocomplete, RestaurantHours, Supabase storage upload for images, ImageCropper (16:9 header, round logo).

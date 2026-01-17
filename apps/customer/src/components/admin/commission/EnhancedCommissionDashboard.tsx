import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RefreshCw, DollarSign, TrendingUp, Settings, History, Target, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { GlobalSettings } from './components/GlobalSettings';
import { TierManagement } from './components/TierManagement';
import { RestaurantOverrides } from './components/RestaurantOverrides';
import { RevenueAnalytics } from './components/RevenueAnalytics';
import { ImpactSimulator } from './components/ImpactSimulator';
import { ChangeHistory } from './components/ChangeHistory';

export function EnhancedCommissionDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [globalSettings, setGlobalSettings] = useState<any>(null);
  const [tiers, setTiers] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      // Fetch current global settings
      const { data: settingsData } = await supabase
        .from('commission_settings')
        .select('*')
        .eq('is_active', true)
        .single();

      setGlobalSettings(settingsData);

      // Fetch tiers
      const { data: tiersData } = await supabase
        .from('commission_tiers')
        .select('*')
        .eq('is_active', true)
        .order('tier_level', { ascending: true });

      setTiers(tiersData || []);

      // Fetch overrides
      const { data: overridesData } = await supabase
        .from('restaurant_commission_overrides')
        .select(`
          *,
          restaurant:restaurants(id, name, email)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      setOverrides(overridesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load commission data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchData(true);
    toast.success('Data refreshed');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <DollarSign className="h-12 w-12 animate-pulse text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading commission system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            Commission & Fee Management
          </h2>
          <p className="text-muted-foreground mt-1">
            Enterprise pricing control system - Better than DoorDash
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="global" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="global">
            <Settings className="h-4 w-4 mr-2" />
            Global Settings
          </TabsTrigger>
          <TabsTrigger value="tiers">
            <Target className="h-4 w-4 mr-2" />
            Tier System
          </TabsTrigger>
          <TabsTrigger value="overrides">
            <DollarSign className="h-4 w-4 mr-2" />
            Overrides
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="simulator">
            <TrendingUp className="h-4 w-4 mr-2" />
            Simulator
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="mt-6">
          <GlobalSettings
            settings={globalSettings}
            onRefresh={() => fetchData(true)}
          />
        </TabsContent>

        <TabsContent value="tiers" className="mt-6">
          <TierManagement
            tiers={tiers}
            onRefresh={() => fetchData(true)}
          />
        </TabsContent>

        <TabsContent value="overrides" className="mt-6">
          <RestaurantOverrides
            overrides={overrides}
            onRefresh={() => fetchData(true)}
          />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <RevenueAnalytics
            tiers={tiers}
            overrides={overrides}
          />
        </TabsContent>

        <TabsContent value="simulator" className="mt-6">
          <ImpactSimulator
            currentSettings={globalSettings}
            onRefresh={() => fetchData(true)}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <ChangeHistory
            onRefresh={() => fetchData(true)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}


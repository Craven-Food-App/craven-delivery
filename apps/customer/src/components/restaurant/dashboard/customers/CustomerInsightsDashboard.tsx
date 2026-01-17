import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp } from "lucide-react";
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantData } from "@/hooks/useRestaurantData";
import { CraveMoreText } from "@/components/ui/cravemore-text";

interface CustomerStats {
  total: number;
  new: number;
  occasional: number;
  frequent: number;
}

const CustomerInsightsDashboard = () => {
  const { restaurant } = useRestaurantData();
  const [dateRange, setDateRange] = useState("this-month");
  const [customerType, setCustomerType] = useState("all");
  const [stats, setStats] = useState<CustomerStats>({ total: 0, new: 0, occasional: 0, frequent: 0 });
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    const fetchMapboxToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (error) throw error;
        setMapboxToken(data.token);
      } catch (error) {
        console.error('Error fetching Mapbox token:', error);
      }
    };

    fetchMapboxToken();
  }, []);

  useEffect(() => {
    if (restaurant?.id) {
      fetchCustomerStats();
    }
  }, [restaurant?.id, dateRange]);

  const fetchCustomerStats = async () => {
    try {
      let daysAgo = 30;
      if (dateRange === "last-month") daysAgo = 60;
      if (dateRange === "last-3-months") daysAgo = 90;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const { data: orders, error } = await supabase
        .from("orders")
        .select("customer_id, created_at")
        .eq("restaurant_id", restaurant?.id)
        .gte("created_at", startDate.toISOString());

      if (error) throw error;

      if (!orders || orders.length === 0) {
        setStats({ total: 0, new: 0, occasional: 0, frequent: 0 });
        return;
      }

      const customerOrderCounts = orders.reduce((acc, order) => {
        acc[order.customer_id] = (acc[order.customer_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const uniqueCustomers = Object.keys(customerOrderCounts).length;
      const newCustomers = Object.values(customerOrderCounts).filter(count => count === 1).length;
      const occasionalCustomers = Object.values(customerOrderCounts).filter(count => count >= 2 && count <= 5).length;
      const frequentCustomers = Object.values(customerOrderCounts).filter(count => count > 5).length;

      setStats({
        total: uniqueCustomers,
        new: newCustomers,
        occasional: occasionalCustomers,
        frequent: frequentCustomers
      });
    } catch (error) {
      console.error("Error fetching customer stats:", error);
    }
  };

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || map.current) return;

    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-98.5795, 39.8283],
      zoom: 4,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken]);

  const MetricCard = ({ title, value, subValue, isActive }: any) => (
    <Card className={isActive ? "border-primary" : ""}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Users className="w-6 h-6 text-muted-foreground" />
          </div>
        </div>
        <div className="text-sm text-muted-foreground mb-2">{title}</div>
        <div className="flex items-baseline gap-2 mb-2">
          <div className="text-3xl font-bold">{value}</div>
          <div className="text-sm text-muted-foreground">- - -</div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{subValue}</span>
          <span className="text-primary"><CraveMoreText /> customers</span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 pb-8">
      <p className="text-muted-foreground">
        Understand your customers and discover opportunities to grow and retain your customer base.
      </p>

      <div className="flex gap-4 items-center">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="this-month">This month</SelectItem>
            <SelectItem value="last-month">Last month</SelectItem>
            <SelectItem value="last-3-months">Last 3 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Overview</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {dateRange === "this-month" && "Current month data"}
          {dateRange === "last-month" && "Previous month data"}
          {dateRange === "last-3-months" && "Last 3 months data"}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard 
            title="Total customers" 
            value={stats.total} 
            subValue="0"
            isActive={customerType === "all"}
          />
          <MetricCard 
            title="New" 
            value={stats.new} 
            subValue="0"
            isActive={customerType === "new"}
          />
          <MetricCard 
            title="Occasional" 
            value={stats.occasional} 
            subValue="0"
            isActive={customerType === "occasional"}
          />
          <MetricCard 
            title="Frequent" 
            value={stats.frequent} 
            subValue="0"
            isActive={customerType === "frequent"}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          <CraveMoreText /> is a loyalty subscription service for customers. <CraveMoreText /> customers frequently place high-value orders.
        </p>
        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
          <span>Last updated on {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Customer locations</h2>
          <div className="flex gap-2">
            <Button 
              variant={customerType === "all" ? "outline" : "ghost"} 
              size="sm" 
              className="rounded-full"
              onClick={() => setCustomerType("all")}
            >
              All
            </Button>
            <Button 
              variant={customerType === "new" ? "outline" : "ghost"} 
              size="sm" 
              className="rounded-full"
              onClick={() => setCustomerType("new")}
            >
              New
            </Button>
            <Button 
              variant={customerType === "occasional" ? "outline" : "ghost"} 
              size="sm" 
              className="rounded-full"
              onClick={() => setCustomerType("occasional")}
            >
              Occasional
            </Button>
            <Button 
              variant={customerType === "frequent" ? "outline" : "ghost"} 
              size="sm" 
              className="rounded-full"
              onClick={() => setCustomerType("frequent")}
            >
              Frequent
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-2">Top delivery destinations</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This map shows customer locations where at least 2 customers place orders from the same zip code.
            </p>
            <div ref={mapContainer} className="w-full h-96 rounded-lg border" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CustomerInsightsDashboard;

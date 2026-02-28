import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, Repeat, Sparkles } from "lucide-react";
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

interface CustomerInsightsDashboardProps {
  restaurantId?: string;
  dateRange?: string;
  onDateRangeChange?: (value: string) => void;
}

const CustomerInsightsDashboard = ({ restaurantId: restaurantIdProp, dateRange: dateRangeProp, onDateRangeChange }: CustomerInsightsDashboardProps) => {
  const { restaurant } = useRestaurantData();
  const restaurantId = restaurantIdProp ?? restaurant?.id;
  const [internalDateRange, setInternalDateRange] = useState("this-month");
  const dateRange = dateRangeProp ?? internalDateRange;
  const setDateRange = onDateRangeChange ?? setInternalDateRange;
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
        if (data?.token) {
          setMapboxToken(data.token);
          return;
        }
      } catch (error) {
        console.error('Error fetching Mapbox token:', error);
      }
      // Fallback for local dev when Edge Function is blocked (e.g. CORS on localhost)
      const devToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
      if (devToken) {
        setMapboxToken(devToken);
      }
    };

    fetchMapboxToken();
  }, []);

  useEffect(() => {
    if (restaurantId) {
      fetchCustomerStats();
    }
  }, [restaurantId, dateRange]);

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
        .eq("restaurant_id", restaurantId)
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

  const metricCards: { key: keyof CustomerStats; title: string; icon: typeof Users }[] = [
    { key: "total", title: "Total customers", icon: Users },
    { key: "new", title: "New", icon: UserPlus },
    { key: "occasional", title: "Occasional", icon: Repeat },
    { key: "frequent", title: "Frequent", icon: Sparkles },
  ];

  const MetricCard = ({
    title,
    value,
    subValue,
    icon: Icon,
    isActive,
  }: {
    title: string;
    value: number;
    subValue: number;
    icon: typeof Users;
    isActive: boolean;
  }) => (
    <Card
      className={
        isActive
          ? "border-primary min-w-0"
          : "border-border/80 bg-card min-w-0"
      }
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-xs text-muted-foreground truncate">{title}</span>
        </div>
        <p className="text-lg font-bold tabular-nums">{value}</p>
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0 mt-1.5 text-xs text-muted-foreground leading-none">
          <span className="leading-none">{subValue}</span>
          <span className="inline-flex items-center leading-none text-primary">
            <CraveMoreText className="[&_img]:w-3 [&_img]:h-[13px]" />
          </span>
          <span className="leading-none text-primary">customers</span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 pb-8">
      <p className="text-muted-foreground">
        Understand your customers and discover opportunities to grow and retain your customer base.
      </p>

      <div>
        <h2 className="text-lg font-semibold mb-4">Overview</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {dateRange === "this-month" && "Current month data"}
          {dateRange === "last-month" && "Previous month data"}
          {dateRange === "last-3-months" && "Last 3 months data"}
        </p>
        <div className="flex flex-nowrap gap-2 w-full min-w-0">
          {metricCards.map(({ key, title, icon }) => (
            <div key={key} className="min-w-0 flex-1">
              <MetricCard
                title={title}
                value={stats[key]}
                subValue={0}
                icon={icon}
                isActive={customerType === key}
              />
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-0 text-xs text-muted-foreground leading-none">
          <span className="inline-flex items-center leading-none"><CraveMoreText /></span>
          <span className="leading-none">is a loyalty subscription for customers. Updated {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.</span>
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

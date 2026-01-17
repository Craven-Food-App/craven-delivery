import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantData } from "@/hooks/useRestaurantData";

const SalesDashboard = () => {
  const { restaurant } = useRestaurantData();
  const [dateRange, setDateRange] = useState("last7");
  const [chartView, setChartView] = useState<"sales" | "orders" | "ticket">("sales");
  const [salesData, setSalesData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (restaurant?.id) {
      fetchSalesData();
    }
  }, [restaurant?.id, dateRange]);

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      const days = dateRange === "last7" ? 7 : 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - days);

      // Fetch current period orders
      const { data: currentOrders, error: currentError } = await supabase
        .from("orders")
        .select("total_cents, created_at")
        .eq("restaurant_id", restaurant?.id)
        .gte("created_at", startDate.toISOString())
        .eq("order_status", "completed");

      if (currentError) throw currentError;

      // Fetch previous period orders
      const { data: previousOrders, error: prevError } = await supabase
        .from("orders")
        .select("total_cents, created_at")
        .eq("restaurant_id", restaurant?.id)
        .gte("created_at", prevStartDate.toISOString())
        .lt("created_at", startDate.toISOString())
        .eq("order_status", "completed");

      if (prevError) throw prevError;

      // Calculate overview metrics
      const grossSales = currentOrders?.reduce((sum, order) => sum + (order.total_cents / 100), 0) || 0;
      const prevGrossSales = previousOrders?.reduce((sum, order) => sum + (order.total_cents / 100), 0) || 0;
      const totalOrders = currentOrders?.length || 0;
      const prevTotalOrders = previousOrders?.length || 0;
      const avgTicket = totalOrders > 0 ? grossSales / totalOrders : 0;
      const prevAvgTicket = prevTotalOrders > 0 ? prevGrossSales / prevTotalOrders : 0;

      // Calculate changes
      const grossSalesChange = prevGrossSales > 0 ? ((grossSales - prevGrossSales) / prevGrossSales) * 100 : 0;
      const totalOrdersChange = prevTotalOrders > 0 ? ((totalOrders - prevTotalOrders) / prevTotalOrders) * 100 : 0;
      const avgTicketChange = prevAvgTicket > 0 ? ((avgTicket - prevAvgTicket) / prevAvgTicket) * 100 : 0;

      // Group by day
      const dayData = new Map();
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      currentOrders?.forEach(order => {
        const date = new Date(order.created_at);
        const dayName = dayNames[date.getDay()];
        if (!dayData.has(dayName)) {
          dayData.set(dayName, { current: 0, currentOrders: 0, currentTicket: 0 });
        }
        const day = dayData.get(dayName);
        day.current += order.total_cents / 100;
        day.currentOrders += 1;
        day.currentTicket = day.current / day.currentOrders;
      });

      previousOrders?.forEach(order => {
        const date = new Date(order.created_at);
        const dayName = dayNames[date.getDay()];
        if (!dayData.has(dayName)) {
          dayData.set(dayName, { previous: 0, previousOrders: 0, previousTicket: 0 });
        }
        const day = dayData.get(dayName);
        day.previous = (day.previous || 0) + order.total_cents / 100;
        day.previousOrders = (day.previousOrders || 0) + 1;
        day.previousTicket = day.previous / day.previousOrders;
      });

      const timeSeriesData = Array.from(dayData.entries()).map(([day, data]) => ({
        date: day,
        current: data.current || 0,
        previous: data.previous || 0,
        currentOrders: data.currentOrders || 0,
        previousOrders: data.previousOrders || 0,
        currentTicket: data.currentTicket || 0,
        previousTicket: data.previousTicket || 0,
      }));

      // Hour of day data (simplified for now)
      const hourOfDayData = Array.from({ length: 24 }, (_, i) => {
        const hour = i % 12 === 0 ? 12 : i % 12;
        const period = i < 12 ? 'AM' : 'PM';
        return { hour: `${hour} ${period}`, sales: 0 };
      });

      setSalesData({
        overview: {
          grossSales: Math.round(grossSales),
          grossSalesChange: Math.round(grossSalesChange),
          totalOrders,
          totalOrdersChange: Math.round(totalOrdersChange),
          avgTicket,
          avgTicketChange: Math.round(avgTicketChange),
        },
        timeSeriesData,
        dayOfWeekData: timeSeriesData,
        hourOfDayData,
      });
    } catch (error) {
      console.error("Error fetching sales data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !salesData) {
    return <div className="p-6">Loading sales data...</div>;
  }

  const MetricCard = ({ title, value, change, isPositive }: any) => (
    <Card>
      <CardContent className="pt-6">
        <div className="text-sm text-muted-foreground mb-2">{title}</div>
        <div className="text-3xl font-bold mb-2">{value}</div>
        <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          <span>{Math.abs(change)}%</span>
          <span className="text-muted-foreground ml-1">vs previous period</span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 pb-8">
      {/* Date Range Selector */}
      <div className="flex gap-4 items-center">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last7">Last 7 days</SelectItem>
            <SelectItem value="last30">Last 30 days</SelectItem>
            <SelectItem value="custom">Custom range</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">vs</span>
        <Select defaultValue="7days-prior">
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days-prior">7 days prior</SelectItem>
            <SelectItem value="14days-prior">14 days prior</SelectItem>
            <SelectItem value="30days-prior">30 days prior</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard 
          title="Gross sales" 
          value={`$${salesData.overview.grossSales.toLocaleString()}.00`}
          change={salesData.overview.grossSalesChange}
          isPositive={salesData.overview.grossSalesChange >= 0}
        />
        <MetricCard 
          title="Total orders" 
          value={salesData.overview.totalOrders.toLocaleString()}
          change={salesData.overview.totalOrdersChange}
          isPositive={salesData.overview.totalOrdersChange >= 0}
        />
        <MetricCard 
          title="Average ticket size" 
          value={`$${salesData.overview.avgTicket.toFixed(2)}`}
          change={salesData.overview.avgTicketChange}
          isPositive={salesData.overview.avgTicketChange >= 0}
        />
      </div>

      {/* Sales Over Time */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Sales over time</CardTitle>
            <div className="flex gap-2">
              <Button 
                variant={chartView === "sales" ? "default" : "outline"} 
                size="sm"
                onClick={() => setChartView("sales")}
              >
                Sales
              </Button>
              <Button 
                variant={chartView === "orders" ? "default" : "outline"} 
                size="sm"
                onClick={() => setChartView("orders")}
              >
                Total orders
              </Button>
              <Button 
                variant={chartView === "ticket" ? "default" : "outline"} 
                size="sm"
                onClick={() => setChartView("ticket")}
              >
                Average ticket value
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData.timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey={chartView === "sales" ? "current" : chartView === "orders" ? "currentOrders" : "currentTicket"} 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                name="Current period"
              />
              <Line 
                type="monotone" 
                dataKey={chartView === "sales" ? "previous" : chartView === "orders" ? "previousOrders" : "previousTicket"} 
                stroke="hsl(var(--muted-foreground))" 
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Previous period"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Day of Week Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Sales by day of week</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesData.dayOfWeekData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="current" fill="hsl(var(--primary))" name="Current period" />
              <Bar dataKey="previous" fill="hsl(var(--muted))" name="Previous period" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Hour of Day Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Sales by hour of day</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesData.hourOfDayData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="sales" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesDashboard;

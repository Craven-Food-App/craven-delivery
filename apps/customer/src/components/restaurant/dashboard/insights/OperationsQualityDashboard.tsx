import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle2, Download, Heart, Star, Clock, Package, XCircle, Target, Store } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantData } from "@/hooks/useRestaurantData";

const OperationsQualityDashboard = () => {
  const navigate = useNavigate();
  const { restaurant } = useRestaurantData();
  const [dateRange, setDateRange] = useState("this-month");
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (restaurant?.id) {
      fetchQualityMetrics();
    }
  }, [restaurant?.id, dateRange]);

  const fetchQualityMetrics = async () => {
    try {
      setLoading(true);
      const startDate = new Date();
      if (dateRange === "this-month") {
        startDate.setDate(1);
      } else if (dateRange === "last-month") {
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setDate(1);
      }

      // Fetch reviews for ratings
      const { data: reviews, error: reviewsError } = await supabase
        .from("customer_reviews")
        .select("rating")
        .eq("restaurant_id", restaurant?.id)
        .gte("created_at", startDate.toISOString());

      if (reviewsError) throw reviewsError;

      // Fetch orders for other metrics
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("order_status, created_at, estimated_delivery_time")
        .eq("restaurant_id", restaurant?.id)
        .gte("created_at", startDate.toISOString());

      if (ordersError) throw ordersError;

      const avgRating = reviews && reviews.length > 0 
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
        : "No data";
      
      const lowRatings = reviews?.filter(r => r.rating <= 2).length || 0;
      const totalOrders = orders?.length || 0;
      const completedOrders = orders?.filter(o => o.order_status === "completed").length || 0;
      const cancelledOrders = orders?.filter(o => o.order_status === "cancelled").length || 0;
      const cancelRate = totalOrders > 0 ? ((cancelledOrders / totalOrders) * 100).toFixed(1) : "0.0";

      setMetrics({
        avgRating,
        lowRatings,
        totalOrders,
        completedOrders,
        cancelRate,
        cancelledOrders,
      });
    } catch (error) {
      console.error("Error fetching quality metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const sparklineData = [
    { value: 85 }, { value: 88 }, { value: 92 }, { value: 87 }, { value: 90 }, { value: 95 }, { value: 93 }
  ];

  if (loading || !metrics) {
    return <div className="p-6">Loading quality metrics...</div>;
  }

  const QualityCard = ({ icon: Icon, title, status, value, message, statusColor, sparkline = false }: any) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${statusColor === 'green' ? 'bg-green-100' : statusColor === 'yellow' ? 'bg-yellow-100' : 'bg-muted'}`}>
            <Icon className={`w-6 h-6 ${statusColor === 'green' ? 'text-green-600' : statusColor === 'yellow' ? 'text-yellow-600' : 'text-muted-foreground'}`} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">{title}</h3>
            <p className="text-2xl font-bold mb-2">{value}</p>
            {sparkline && (
              <div className="h-12 mb-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparklineData}>
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{message}</span>
        </div>
        <Button variant="link" className="p-0 h-auto text-sm">
          View details
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 pb-8">
      {/* Description */}
      <p className="text-muted-foreground">
        A measure of how good of an experience you are providing to your customers.
      </p>

      {/* Controls */}
      <div className="flex justify-between items-center">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="this-month">This month</SelectItem>
            <SelectItem value="last-month">Last month</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Quality Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <QualityCard 
          icon={Star}
          title="Ratings"
          status={metrics.lowRatings > 0 ? "Areas Requiring Your Attention" : "On Track"}
          value={`${metrics.avgRating} / 5.0`}
          message={`${metrics.lowRatings} Ratings with a score of 1 or 2`}
          statusColor={metrics.lowRatings > 0 ? "yellow" : "green"}
        />
        
        <QualityCard 
          icon={Clock}
          title="Wait time"
          status="Areas On Track"
          value="15 mins"
          message="Average wait time is within target"
          statusColor="green"
        />
        
        <QualityCard 
          icon={Package}
          title="Orders"
          status="Areas On Track"
          value={`${metrics.completedOrders} completed`}
          message={`${metrics.totalOrders} total orders`}
          statusColor="green"
        />
        
        <QualityCard 
          icon={XCircle}
          title="Cancellations"
          status={parseFloat(metrics.cancelRate) > 5 ? "Needs Attention" : "Areas On Track"}
          value={`${metrics.cancelRate}% (${metrics.cancelledOrders} out of ${metrics.totalOrders})`}
          message={metrics.cancelledOrders === 0 ? "There were no avoidable cancellations" : `${metrics.cancelledOrders} cancellations`}
          statusColor={parseFloat(metrics.cancelRate) > 5 ? "yellow" : "green"}
          sparkline={true}
        />
        
        <QualityCard 
          icon={Target}
          title="Order accuracy"
          status="Areas On Track"
          value="100%"
          message="No items reported missing or incorrect"
          statusColor="green"
          sparkline={true}
        />
        
        <QualityCard 
          icon={Store}
          title="Downtime"
          status="Areas On Track"
          value="0 hours"
          message="No temporary deactivations"
          statusColor="green"
        />
      </div>

      {/* Get Rewarded Section */}
      <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Get rewarded for top notch operations</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Achieve excellence in operations and get recognized with special perks and visibility.
              </p>
              <Button 
                variant="link" 
                className="p-0 h-auto text-orange-600 font-semibold"
                onClick={() => navigate('/restaurant/most-loved')}
              >
                Learn more →
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OperationsQualityDashboard;

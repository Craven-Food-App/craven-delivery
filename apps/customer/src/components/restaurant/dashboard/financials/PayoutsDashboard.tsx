import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PayoutData {
  totalRevenue: number;
  totalCommission: number;
  netPayout: number;
  orderCount: number;
  commissionRate: number;
}

const PayoutsDashboard = () => {
  const [dateRange, setDateRange] = useState("last-30-days");
  const [loading, setLoading] = useState(true);
  const [payoutData, setPayoutData] = useState<PayoutData | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  useEffect(() => {
    const fetchRestaurantId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', user.id)
        .single();
      
      if (data) {
        setRestaurantId(data.id);
      }
    };

    fetchRestaurantId();
  }, []);

  useEffect(() => {
    if (restaurantId) {
      fetchPayouts();
    }
  }, [dateRange, restaurantId]);

  const getDateRange = () => {
    const end = new Date();
    const start = new Date();
    
    switch (dateRange) {
      case "last-30-days":
        start.setDate(end.getDate() - 30);
        break;
      case "last-60-days":
        start.setDate(end.getDate() - 60);
        break;
      case "last-90-days":
        start.setDate(end.getDate() - 90);
        break;
      default:
        start.setDate(end.getDate() - 30);
    }
    
    return { start: start.toISOString(), end: end.toISOString() };
  };

  const fetchPayouts = async () => {
    if (!restaurantId) return;
    
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      
      const { data, error } = await supabase.functions.invoke('calculate-restaurant-payouts', {
        body: {
          restaurantId,
          startDate: start,
          endDate: end
        }
      });

      if (error) throw error;
      
      if (data.success) {
        setPayoutData({
          totalRevenue: data.totalRevenue / 100,
          totalCommission: data.totalCommission / 100,
          netPayout: data.netPayout / 100,
          orderCount: data.orderCount,
          commissionRate: data.commissionRate
        });
      }
    } catch (error: any) {
      console.error('Error fetching payouts:', error);
      toast.error('Failed to load payout data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Description */}
      <p className="text-muted-foreground">
        Here is where you will find a summary of your Transactions and Payouts.{" "}
        <a href="#" className="text-primary underline">Learn more</a>
      </p>

      {/* Filters */}
      <div className="flex justify-between items-center">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last-30-days">Last 30 days</SelectItem>
            <SelectItem value="last-60-days">Last 60 days</SelectItem>
            <SelectItem value="last-90-days">Last 90 days</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="destructive" disabled>
          Create report
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-20">
            <p className="text-muted-foreground">Loading payout data...</p>
          </CardContent>
        </Card>
      ) : !payoutData || payoutData.orderCount === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="w-24 h-24 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mb-6">
              <DollarSign className="w-12 h-12 text-blue-600 dark:text-blue-400" strokeWidth={2} />
            </div>
            
            <h3 className="text-xl font-semibold mb-2">
              No financial records were found for
            </h3>
            <p className="text-muted-foreground">
              the selected time range or store.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${payoutData.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Commission ({payoutData.commissionRate}%)</p>
                    <p className="text-2xl font-bold text-orange-600">
                      ${payoutData.totalCommission.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Net Payout</p>
                    <p className="text-2xl font-bold text-primary">
                      ${payoutData.netPayout.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Completed Orders</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {payoutData.orderCount}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payout Summary */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">Payout Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Total Order Revenue</span>
                  <span className="font-semibold">${payoutData.totalRevenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Platform Commission ({payoutData.commissionRate}%)</span>
                  <span className="font-semibold text-orange-600">-${payoutData.totalCommission.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-3 bg-primary/5 px-3 rounded-lg">
                  <span className="font-semibold">You Receive</span>
                  <span className="text-xl font-bold text-primary">${payoutData.netPayout.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default PayoutsDashboard;

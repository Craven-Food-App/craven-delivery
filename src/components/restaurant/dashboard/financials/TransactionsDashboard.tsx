import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, TrendingUp, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface PayoutData {
  totalRevenue: number;
  totalCommission: number;
  netPayout: number;
  orderCount: number;
  commissionRate: number;
}

const TransactionsDashboard = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [payoutData, setPayoutData] = useState<PayoutData | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState("last-7-days");

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const userQuery = await supabase.auth.getUser();
      if (!userQuery.data?.user) return;

      const restaurantQuery = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', userQuery.data.user.id)
        .single();

      if (!restaurantQuery.data) return;

      const endDate = new Date().toISOString();
      const startDate = new Date();
      
      switch (dateRange) {
        case "last-7-days": startDate.setDate(startDate.getDate() - 7); break;
        case "last-30-days": startDate.setDate(startDate.getDate() - 30); break;
        case "last-90-days": startDate.setDate(startDate.getDate() - 90); break;
      }

      const response = await supabase.functions.invoke('calculate-restaurant-payouts', {
        body: {
          restaurantId: restaurantQuery.data.id,
          startDate: startDate.toISOString(),
          endDate
        }
      });

      if (response.data) setPayoutData(response.data);

      // Fetch orders - TS has deep instantiation issues with long Supabase query chains
      // @ts-ignore - Supabase type inference depth limit
      const ordersResponse = await supabase
        .from('orders')
        .select('id, order_number, total_cents, created_at')
        .eq('restaurant_id', restaurantQuery.data.id)
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate)
        .order('created_at', { ascending: false })
        .limit(50);

      setTransactions(ordersResponse.data || []);
    } catch (error) {
      console.error('Error:', error);
      toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const getTimeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last-7-days">Last 7 days</SelectItem>
            <SelectItem value="last-30-days">Last 30 days</SelectItem>
            <SelectItem value="last-90-days">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {payoutData ? formatCurrency(payoutData.totalRevenue) : "$0.00"}
              </div>
              <p className="text-xs text-muted-foreground">From {payoutData?.orderCount || 0} orders</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Commission</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {payoutData ? formatCurrency(payoutData.totalCommission) : "$0.00"}
              </div>
              <p className="text-xs text-muted-foreground">{payoutData?.commissionRate || 0}% platform fee</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Net Payout</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {payoutData ? formatCurrency(payoutData.netPayout) : "$0.00"}
              </div>
              <p className="text-xs text-muted-foreground">After commission</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Completed orders and payment details</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found for this period
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map(t => (
                <div key={t.id} className="flex justify-between border-b pb-3">
                  <div>
                    <div className="font-medium">{t.order_number}</div>
                    <div className="text-sm text-muted-foreground">{getTimeAgo(t.created_at)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatCurrency(t.total_cents || 0)}</div>
                    <div className="text-xs text-muted-foreground">Completed</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionsDashboard;
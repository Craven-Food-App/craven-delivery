import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, ExternalLink, RefreshCw } from 'lucide-react';
import OrderDrawer from './OrderDrawer';
import { formatCurrency } from '@/lib/utils';

interface Order {
  id: string;
  created_at: string;
  customer_id: string;
  restaurant_id: string;
  driver_id: string | null;
  amount_total_cents: number;
  platform_fee_cents: number;
  restaurant_net_cents: number;
  driver_pay_cents: number;
  tip_cents: number;
  payment_status: string;
  transfers_status: string;
  stripe_payment_intent_id: string | null;
  stripe_transfer_restaurant_id: string | null;
  stripe_transfer_driver_id: string | null;
  paid_at: string | null;
  transfers_error: string | null;
}

export default function OrdersTable() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [transfersFilter, setTransfersFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const loadOrders = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (statusFilter !== 'all') {
        query = query.eq('payment_status', statusFilter);
      }

      if (transfersFilter !== 'all') {
        query = query.eq('transfers_status', transfersFilter);
      }

      if (dateRange.start) {
        query = query.gte('created_at', dateRange.start);
      }

      if (dateRange.end) {
        query = query.lte('created_at', dateRange.end);
      }

      const { data, error } = await query;

      if (error) throw error;

      let filtered = data || [];

      if (searchQuery) {
        const queryLower = searchQuery.toLowerCase();
        filtered = filtered.filter((o: Order) =>
          o.id.toLowerCase().includes(queryLower) ||
          o.stripe_payment_intent_id?.toLowerCase().includes(queryLower)
        );
      }

      setOrders(filtered);
    } catch (error: any) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter, transfersFilter, dateRange]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      succeeded: 'bg-green-100 text-green-800 border-green-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      failed: 'bg-red-100 text-red-800 border-red-200',
      refunded: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return variants[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getTransfersBadge = (status: string) => {
    const variants: Record<string, string> = {
      complete: 'bg-green-100 text-green-800 border-green-200',
      partial: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      failed: 'bg-red-100 text-red-800 border-red-200',
      not_started: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return variants[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Orders</CardTitle>
            <Button variant="outline" size="sm" onClick={loadOrders}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search order ID or PI..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="succeeded">Succeeded</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Select value={transfersFilter} onValueChange={setTransfersFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Transfers Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transfers</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="not_started">Not Started</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input
                type="date"
                placeholder="Start Date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="text-sm"
              />
              <Input
                type="date"
                placeholder="End Date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="text-sm"
              />
            </div>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Order ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Splits</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Transfers</TableHead>
                  <TableHead>Stripe IDs</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                      No orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow 
                      key={order.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <TableCell className="font-mono text-xs">
                        {order.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(order.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(order.amount_total_cents / 100)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        <div>Platform: {formatCurrency((order.platform_fee_cents || 0) / 100)}</div>
                        <div>Restaurant: {formatCurrency((order.restaurant_net_cents || 0) / 100)}</div>
                        <div>Driver: {formatCurrency(((order.driver_pay_cents || 0) + (order.tip_cents || 0)) / 100)}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(order.payment_status)}>
                          {order.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getTransfersBadge(order.transfers_status)}>
                          {order.transfers_status}
                        </Badge>
                        {order.transfers_error && (
                          <div className="text-xs text-red-600 mt-1">{order.transfers_error}</div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        <div className="space-y-1">
                          {order.stripe_payment_intent_id && (
                            <div className="flex items-center gap-1">
                              <span>PI:</span>
                              <a
                                href={`https://dashboard.stripe.com/payments/${order.stripe_payment_intent_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-blue-600 hover:underline flex items-center gap-1"
                              >
                                {order.stripe_payment_intent_id.slice(0, 12)}...
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          )}
                          {order.stripe_transfer_restaurant_id && (
                            <div className="flex items-center gap-1">
                              <span>TR:</span>
                              <a
                                href={`https://dashboard.stripe.com/connect/transfers/${order.stripe_transfer_restaurant_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-blue-600 hover:underline flex items-center gap-1"
                              >
                                {order.stripe_transfer_restaurant_id.slice(0, 12)}...
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          )}
                          {order.stripe_transfer_driver_id && (
                            <div className="flex items-center gap-1">
                              <span>TD:</span>
                              <a
                                href={`https://dashboard.stripe.com/connect/transfers/${order.stripe_transfer_driver_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-blue-600 hover:underline flex items-center gap-1"
                              >
                                {order.stripe_transfer_driver_id.slice(0, 12)}...
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(order);
                          }}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Order Drawer */}
      {selectedOrder && (
        <OrderDrawer
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </>
  );
}


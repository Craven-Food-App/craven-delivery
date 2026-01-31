import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface Order {
  id: string;
  created_at: string;
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
  transfers_error: string | null;
  paid_at: string | null;
}

interface LedgerEntry {
  id: string;
  entry_type: string;
  owner_type: string;
  owner_id: string | null;
  amount_cents: number;
  currency: string;
  stripe_object_id: string | null;
  memo: string | null;
  created_at: string;
}

export default function OrderDrawer({ order, onClose }: { order: Order; onClose: () => void }) {
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    loadLedgerEntries();
  }, [order.id]);

  const loadLedgerEntries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ledger_entries')
        .select('*')
        .eq('order_id', order.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setLedgerEntries(data || []);
    } catch (error: any) {
      console.error('Error loading ledger:', error);
      toast.error('Failed to load ledger entries');
    } finally {
      setLoading(false);
    }
  };

  const handleRetryTransfers = async () => {
    setRetrying(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-retry-transfers', {
        body: { order_id: order.id },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Transfers retried successfully');
        onClose();
        // Reload parent
        window.location.reload();
      } else {
        throw new Error(data?.error || 'Retry failed');
      }
    } catch (error: any) {
      toast.error(`Retry failed: ${error.message}`);
    } finally {
      setRetrying(false);
    }
  };

  const handleRefund = async () => {
    if (!confirm('Are you sure you want to refund this order?')) return;

    try {
      const { data, error } = await supabase.functions.invoke('admin-refund-order', {
        body: { order_id: order.id },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Refund processed');
        onClose();
        window.location.reload();
      } else {
        throw new Error(data?.error || 'Refund failed');
      }
    } catch (error: any) {
      toast.error(`Refund failed: ${error.message}`);
    }
  };

  return (
    <Sheet open={!!order} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Order Details</SheetTitle>
          <SheetDescription>
            Order ID: <span className="font-mono text-xs">{order.id}</span>
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="summary" className="mt-6">
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="ledger">Ledger</TabsTrigger>
            <TabsTrigger value="stripe">Stripe Objects</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Payment Status:</span>
                  <Badge>{order.payment_status}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Transfers Status:</span>
                  <Badge>{order.transfers_status}</Badge>
                </div>
                {order.paid_at && (
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Paid At:</span>
                    <span className="text-sm">{new Date(order.paid_at).toLocaleString()}</span>
                  </div>
                )}
                {order.transfers_error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                      <div>
                        <div className="text-sm font-medium text-red-900">Transfer Error</div>
                        <div className="text-xs text-red-700 mt-1">{order.transfers_error}</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Splits</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Total Amount</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(order.amount_total_cents / 100)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Platform Fee (15%)</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency((order.platform_fee_cents || 0) / 100)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Restaurant Net</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency((order.restaurant_net_cents || 0) / 100)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Driver Pay</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency((order.driver_pay_cents || 0) / 100)}
                      </TableCell>
                    </TableRow>
                    {order.tip_cents > 0 && (
                      <TableRow>
                        <TableCell>Tip</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency((order.tip_cents || 0) / 100)}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ledger" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Ledger Entries</h3>
              <Button variant="outline" size="sm" onClick={loadLedgerEntries}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
            {loading ? (
              <div className="text-center py-8 text-slate-500">Loading...</div>
            ) : ledgerEntries.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No ledger entries</div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Memo</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgerEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">{entry.entry_type}</TableCell>
                        <TableCell className="text-sm">
                          {entry.owner_type}
                          {entry.owner_id && (
                            <span className="text-slate-500 ml-1">({entry.owner_id.slice(0, 8)})</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(entry.amount_cents / 100)}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">{entry.memo}</TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {new Date(entry.created_at).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="stripe" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Stripe Objects</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {order.stripe_payment_intent_id && (
                  <div>
                    <div className="text-sm font-medium mb-1">Payment Intent</div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                        {order.stripe_payment_intent_id}
                      </code>
                      <a
                        href={`https://dashboard.stripe.com/payments/${order.stripe_payment_intent_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        View in Stripe
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}
                {order.stripe_transfer_restaurant_id && (
                  <div>
                    <div className="text-sm font-medium mb-1">Restaurant Transfer</div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                        {order.stripe_transfer_restaurant_id}
                      </code>
                      <a
                        href={`https://dashboard.stripe.com/connect/transfers/${order.stripe_transfer_restaurant_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        View in Stripe
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}
                {order.stripe_transfer_driver_id && (
                  <div>
                    <div className="text-sm font-medium mb-1">Driver Transfer</div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                        {order.stripe_transfer_driver_id}
                      </code>
                      <a
                        href={`https://dashboard.stripe.com/connect/transfers/${order.stripe_transfer_driver_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        View in Stripe
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Admin Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.transfers_status === 'failed' && (
                  <Button
                    onClick={handleRetryTransfers}
                    disabled={retrying}
                    className="w-full"
                  >
                    {retrying ? 'Retrying...' : 'Retry Transfers'}
                  </Button>
                )}
                {order.payment_status === 'succeeded' && (
                  <Button
                    variant="destructive"
                    onClick={handleRefund}
                    className="w-full"
                  >
                    Issue Refund
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}


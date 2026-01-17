// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle, Search, Filter, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface RefundRequest {
  id: string;
  order_id: string;
  customer_id: string;
  amount_cents: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'processed';
  type: 'full' | 'partial';
  requested_at: string;
  processed_at?: string;
  processed_by?: string;
  admin_notes?: string;
  orders?: {
    order_number: string;
    total_cents: number;
    customer_name: string;
    restaurant_name: string;
  };
}

export const RefundManagement: React.FC = () => {
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchRefunds();
    subscribeToRefunds();
  }, []);

  const fetchRefunds = async () => {
    try {
      const { data, error } = await supabase
        .from('refund_requests')
        .select(`
          *,
          orders (
            order_number,
            total_cents,
            customer_name,
            restaurants (name)
          )
        `)
        .order('requested_at', { ascending: false });

      if (error) throw error;

      const formattedData = (data || []).map((refund: any) => ({
        ...refund,
        orders: {
          ...refund.orders,
          restaurant_name: refund.orders?.restaurants?.name || 'Unknown'
        }
      }));

      setRefunds(formattedData);
    } catch (error) {
      console.error('Error fetching refunds:', error);
      toast({
        title: 'Error loading refunds',
        description: 'Failed to load refund requests',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const subscribeToRefunds = () => {
    const channel = supabase
      .channel('refund-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'refund_requests'
        },
        () => {
          fetchRefunds();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleProcessRefund = async (refundId: string, action: 'approve' | 'reject') => {
    if (processing.has(refundId)) return;

    setProcessing(new Set(processing).add(refundId));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const refund = refunds.find(r => r.id === refundId);
      if (!refund) throw new Error('Refund not found');

      const finalAmount = refundAmount 
        ? parseFloat(refundAmount) * 100 
        : refund.amount_cents;

      // Update refund status
      const { error: refundError } = await supabase
        .from('refund_requests')
        .update({
          status: action === 'approve' ? 'approved' : 'rejected',
          processed_at: new Date().toISOString(),
          processed_by: user.id,
          admin_notes: adminNotes,
          amount_cents: finalAmount
        })
        .eq('id', refundId);

      if (refundError) throw refundError;

      if (action === 'approve') {
        // Process the actual refund through payment processor
        const { error: processError } = await supabase.functions.invoke('process-refund', {
          body: {
            refundId,
            orderId: refund.order_id,
            amountCents: finalAmount
          }
        });

        if (processError) {
          console.error('Refund processing error:', processError);
          toast({
            title: 'Refund approved but processing failed',
            description: 'Manual processing may be required',
            variant: 'destructive'
          });
        } else {
          // Update refund to processed
          await supabase
            .from('refund_requests')
            .update({ status: 'processed' })
            .eq('id', refundId);
        }
      }

      // Create audit log
      await supabase.from('admin_audit_logs').insert({
        admin_id: user.id,
        action: `refund_${action}`,
        entity_type: 'refund',
        entity_id: refundId,
        details: {
          amount_cents: finalAmount,
          reason: refund.reason,
          notes: adminNotes
        }
      });

      toast({
        title: action === 'approve' ? 'Refund approved' : 'Refund rejected',
        description: `Successfully ${action === 'approve' ? 'processed' : 'rejected'} refund request`
      });

      setSelectedRefund(null);
      setRefundAmount('');
      setAdminNotes('');
      fetchRefunds();
    } catch (error) {
      console.error('Error processing refund:', error);
      toast({
        title: 'Error processing refund',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setProcessing(prev => {
        const newSet = new Set(prev);
        newSet.delete(refundId);
        return newSet;
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      pending: { variant: 'secondary', icon: Clock },
      approved: { variant: 'default', icon: CheckCircle },
      rejected: { variant: 'destructive', icon: XCircle },
      processed: { variant: 'default', icon: CheckCircle }
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const filteredRefunds = refunds.filter(refund => {
    const matchesSearch = searchTerm === '' || 
      refund.orders?.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      refund.orders?.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || refund.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const pendingRefunds = refunds.filter(r => r.status === 'pending');
  const approvedRefunds = refunds.filter(r => r.status === 'approved' || r.status === 'processed');
  const rejectedRefunds = refunds.filter(r => r.status === 'rejected');
  const totalRefundedAmount = approvedRefunds.reduce((sum, r) => sum + r.amount_cents, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold">Refund Management</h2>
        <p className="text-muted-foreground">Process and manage customer refund requests</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingRefunds.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{approvedRefunds.length}</div>
            <p className="text-xs text-muted-foreground">Processed refunds</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{rejectedRefunds.length}</div>
            <p className="text-xs text-muted-foreground">Denied requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-500" />
              Total Refunded
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ${(totalRefundedAmount / 100).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order number or customer name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="processed">Processed</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={fetchRefunds} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Refunds List */}
      <Card>
        <CardHeader>
          <CardTitle>Refund Requests</CardTitle>
          <CardDescription>Review and process customer refund requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredRefunds.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No refund requests found</p>
              </div>
            ) : (
              filteredRefunds.map((refund) => (
                <Card key={refund.id} className="border">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold">Order #{refund.orders?.order_number}</h4>
                          {getStatusBadge(refund.status)}
                          <Badge variant="outline">
                            {refund.type === 'full' ? 'Full Refund' : 'Partial Refund'}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Customer:</span>
                            <span className="ml-2 font-medium">{refund.orders?.customer_name}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Restaurant:</span>
                            <span className="ml-2 font-medium">{refund.orders?.restaurant_name}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Order Total:</span>
                            <span className="ml-2 font-medium">
                              ${((refund.orders?.total_cents || 0) / 100).toFixed(2)}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Refund Amount:</span>
                            <span className="ml-2 font-medium text-red-600">
                              ${(refund.amount_cents / 100).toFixed(2)}
                            </span>
                          </div>
                        </div>

                        <div className="text-sm">
                          <span className="text-muted-foreground">Reason:</span>
                          <p className="mt-1">{refund.reason}</p>
                        </div>

                        <div className="text-xs text-muted-foreground">
                          Requested {format(new Date(refund.requested_at), 'PPp')}
                        </div>

                        {refund.admin_notes && (
                          <div className="text-sm bg-muted p-3 rounded-md">
                            <span className="font-medium">Admin Notes:</span>
                            <p className="mt-1">{refund.admin_notes}</p>
                          </div>
                        )}
                      </div>

                      {refund.status === 'pending' && (
                        <div className="ml-4">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button onClick={() => setSelectedRefund(refund)}>
                                Review
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Process Refund Request</DialogTitle>
                                <DialogDescription>
                                  Review and approve or reject this refund request
                                </DialogDescription>
                              </DialogHeader>

                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <Label>Order Number</Label>
                                    <p className="font-medium">{refund.orders?.order_number}</p>
                                  </div>
                                  <div>
                                    <Label>Customer</Label>
                                    <p className="font-medium">{refund.orders?.customer_name}</p>
                                  </div>
                                  <div>
                                    <Label>Order Total</Label>
                                    <p className="font-medium">
                                      ${((refund.orders?.total_cents || 0) / 100).toFixed(2)}
                                    </p>
                                  </div>
                                  <div>
                                    <Label>Requested Amount</Label>
                                    <p className="font-medium text-red-600">
                                      ${(refund.amount_cents / 100).toFixed(2)}
                                    </p>
                                  </div>
                                </div>

                                <div>
                                  <Label>Customer Reason</Label>
                                  <p className="text-sm mt-1">{refund.reason}</p>
                                </div>

                                <div>
                                  <Label htmlFor="refund-amount">
                                    Refund Amount (USD) - Optional
                                  </Label>
                                  <Input
                                    id="refund-amount"
                                    type="number"
                                    step="0.01"
                                    placeholder={`Default: $${(refund.amount_cents / 100).toFixed(2)}`}
                                    value={refundAmount}
                                    onChange={(e) => setRefundAmount(e.target.value)}
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Leave empty to refund the full requested amount
                                  </p>
                                </div>

                                <div>
                                  <Label htmlFor="admin-notes">Admin Notes</Label>
                                  <Textarea
                                    id="admin-notes"
                                    placeholder="Add notes about this refund decision..."
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    rows={3}
                                  />
                                </div>

                                <div className="flex gap-3 justify-end">
                                  <Button
                                    variant="destructive"
                                    onClick={() => handleProcessRefund(refund.id, 'reject')}
                                    disabled={processing.has(refund.id)}
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Reject
                                  </Button>
                                  <Button
                                    onClick={() => handleProcessRefund(refund.id, 'approve')}
                                    disabled={processing.has(refund.id)}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Approve & Process
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RefundManagement;

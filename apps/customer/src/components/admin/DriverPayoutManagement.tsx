import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Calendar, DollarSign, Users, Play, RefreshCw, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface PayoutBatch {
  id: string;
  payout_date: string;
  total_amount: number;
  total_drivers: number;
  status: string;
  processed_at: string | null;
  created_at: string;
}

interface DriverPayout {
  id: string;
  amount: number;
  status: string;
  error_message: string | null;
  processed_at: string | null;
  driver_payment_methods: {
    payment_type: string;
    account_identifier: string;
  };
  user_profiles: {
    full_name: string;
  } | null;
}

const DriverPayoutManagement = () => {
  const [payoutBatches, setPayoutBatches] = useState<PayoutBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<PayoutBatch | null>(null);
  const [driverPayouts, setDriverPayouts] = useState<DriverPayout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPayoutBatches();
  }, []);

  useEffect(() => {
    if (selectedBatch) {
      fetchDriverPayouts(selectedBatch.id);
    }
  }, [selectedBatch]);

  const fetchPayoutBatches = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_payout_batches')
        .select('*')
        .order('payout_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      setPayoutBatches(data || []);
    } catch (error) {
      console.error('Error fetching payout batches:', error);
      toast({
        title: "Error",
        description: "Failed to load payout batches",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDriverPayouts = async (batchId: string) => {
    try {
      const { data, error } = await supabase
        .from('driver_payouts')
        .select(`
          *,
          driver_payment_methods(payment_type, account_identifier)
        `)
        .eq('batch_id', batchId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Get user profiles separately since there's no direct relation
      const driverIds = data?.map(p => p.driver_id) || [];
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, full_name')
        .in('user_id', driverIds);

      // Merge the data
      const payoutsWithProfiles = data?.map(payout => ({
        ...payout,
        user_profiles: profiles?.find(p => p.user_id === payout.driver_id) || null
      })) || [];

      setDriverPayouts(payoutsWithProfiles);
    } catch (error) {
      console.error('Error fetching driver payouts:', error);
      toast({
        title: "Error",
        description: "Failed to load driver payouts",
        variant: "destructive"
      });
    }
  };

  const runDailyPayouts = async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('daily-driver-payouts');

      if (error) throw error;

      toast({
        title: "Success",
        description: `Processed ${data.successful_payouts} payouts successfully`,
      });

      fetchPayoutBatches();
    } catch (error) {
      console.error('Error running daily payouts:', error);
      toast({
        title: "Error",
        description: "Failed to process daily payouts",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'processing': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-10 bg-muted rounded"></div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Driver Payout Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button 
              onClick={runDailyPayouts} 
              disabled={isProcessing}
              className="flex items-center gap-2"
            >
              {isProcessing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isProcessing ? 'Processing...' : 'Run Daily Payouts'}
            </Button>
            <Button 
              variant="outline" 
              onClick={fetchPayoutBatches}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payout Batches */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Payout Batches
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payoutBatches.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No payout batches found
              </p>
            ) : (
              <div className="space-y-3">
                {payoutBatches.map((batch) => (
                  <div
                    key={batch.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedBatch?.id === batch.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedBatch(batch)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">
                          {format(new Date(batch.payout_date), 'MMM dd, yyyy')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {batch.total_drivers} drivers • {formatCurrency(batch.total_amount)}
                        </div>
                      </div>
                      <Badge className={getStatusColor(batch.status)}>
                        {batch.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Driver Payouts Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Driver Payouts
              {selectedBatch && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({format(new Date(selectedBatch.payout_date), 'MMM dd, yyyy')})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedBatch ? (
              <p className="text-muted-foreground text-center py-4">
                Select a payout batch to view details
              </p>
            ) : driverPayouts.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No driver payouts found for this batch
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {driverPayouts.map((payout) => (
                  <div key={payout.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">
                          {payout.user_profiles?.full_name || 'Unknown Driver'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(payout.amount)} → {payout.driver_payment_methods.account_identifier}
                        </div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {payout.driver_payment_methods.payment_type}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(payout.status)}>
                          {payout.status}
                        </Badge>
                        {payout.error_message && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                            <AlertCircle className="h-3 w-3" />
                            Error
                          </div>
                        )}
                      </div>
                    </div>
                    {payout.error_message && (
                      <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                        {payout.error_message}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Statistics */}
      {selectedBatch && (
        <Card>
          <CardHeader>
            <CardTitle>Batch Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {selectedBatch.total_drivers}
                </div>
                <div className="text-sm text-muted-foreground">Total Drivers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(selectedBatch.total_amount)}
                </div>
                <div className="text-sm text-muted-foreground">Total Amount</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {driverPayouts.filter(p => p.status === 'completed').length}
                </div>
                <div className="text-sm text-muted-foreground">Successful</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {driverPayouts.filter(p => p.status === 'failed').length}
                </div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DriverPayoutManagement;
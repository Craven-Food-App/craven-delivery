import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Zap, DollarSign, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PaymentMethod {
  id: string;
  payment_type: string;
  account_identifier: string;
  is_primary: boolean;
  is_verified: boolean;
}

interface InstantCashoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableAmount: number;
  onSuccess: () => void;
}

export const InstantCashoutModal: React.FC<InstantCashoutModalProps> = ({
  isOpen,
  onClose,
  availableAmount,
  onSuccess
}) => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchPaymentMethods();
    }
  }, [isOpen]);

  const fetchPaymentMethods = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('driver_payment_methods')
        .select('*')
        .eq('driver_id', user.id)
        .order('is_primary', { ascending: false });

      if (error) throw error;
      
      setPaymentMethods(data || []);
      // Auto-select primary method if available
      const primaryMethod = data?.find(method => method.is_primary);
      if (primaryMethod) {
        setSelectedMethodId(primaryMethod.id);
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      toast({
        title: "Error",
        description: "Failed to load payment methods",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const processCashout = async () => {
    if (!selectedMethodId) {
      toast({
        title: "Error",
        description: "Please select a payment method",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Process instant payout using manual-driver-payout function
      const { data, error } = await supabase.functions.invoke('manual-driver-payout', {
        body: {
          driver_id: user.id,
          amount: availableAmount,
          payment_method_id: selectedMethodId
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Cashout Successful! 💰",
          description: `$${availableAmount.toFixed(2)} has been sent to your ${data.transaction_id ? 'CashApp' : 'payment method'}`,
        });
        onSuccess();
        onClose();
      } else {
        throw new Error(data.message || 'Cashout failed');
      }
    } catch (error) {
      console.error('Cashout error:', error);
      toast({
        title: "Cashout Failed",
        description: error instanceof Error ? error.message : 'Please try again later',
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatAccountIdentifier = (type: string, identifier: string) => {
    switch (type) {
      case 'cashapp':
        return identifier.startsWith('$') ? identifier : `$${identifier}`;
      case 'venmo':
        return identifier.startsWith('@') ? identifier : `@${identifier}`;
      default:
        return identifier;
    }
  };

  const getMethodDisplayName = (type: string) => {
    switch (type) {
      case 'cashapp':
        return 'Cash App';
      case 'paypal':
        return 'PayPal';
      case 'venmo':
        return 'Venmo';
      case 'zelle':
        return 'Zelle';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-full bg-background rounded-t-3xl shadow-2xl transform transition-transform duration-300 ease-out animate-in slide-in-from-bottom-full">
        <div className="p-6 pb-8 space-y-6">
          {/* Header */}
          <div className="text-center safe-area-top">
            <div className="flex items-center justify-center mb-2">
              <div className="p-3 bg-orange-100 rounded-full">
                <Zap className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold">Instant Cashout</h2>
            <p className="text-muted-foreground">Get your earnings in minutes</p>
          </div>

          {/* Available Amount */}
          <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-700 mb-1">
                  ${availableAmount.toFixed(2)}
                </div>
                <div className="text-sm text-green-600">Available for instant cashout</div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method Selection */}
          {loading ? (
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
              <div className="h-10 bg-muted rounded"></div>
            </div>
          ) : paymentMethods.length === 0 ? (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="font-medium text-orange-800">No Payment Methods</p>
                    <p className="text-sm text-orange-600">Add a CashApp account to enable instant cashouts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <label className="text-sm font-medium">Select Payment Method</label>
              <Select value={selectedMethodId} onValueChange={setSelectedMethodId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose payment method" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        <span>{getMethodDisplayName(method.payment_type)}</span>
                        <span className="text-muted-foreground">
                          {formatAccountIdentifier(method.payment_type, method.account_identifier)}
                        </span>
                        {method.is_primary && (
                          <Badge variant="secondary" className="text-xs">Primary</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Instant Pay Details */}
          <Card className="bg-muted/30">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Instant Pay Fee</span>
                <span className="text-sm font-medium">$0.50</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">You'll receive</span>
                <span className="text-sm font-bold text-green-600">
                  ${Math.max(0, availableAmount - 0.50).toFixed(2)}
                </span>
              </div>
              <Separator />
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Funds typically arrive within minutes
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 h-12"
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={processCashout}
              disabled={paymentMethods.length === 0 || !selectedMethodId || isProcessing || availableAmount < 0.50}
              className="flex-1 h-12 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Cash Out Now
                </>
              )}
            </Button>
          </div>

          {/* Footer Note */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Instant cashout available once per day • $0.50 fee applies
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Plus, CreditCard, DollarSign } from 'lucide-react';

interface PaymentMethod {
  id: string;
  payment_type: string;
  account_identifier: string;
  is_primary: boolean;
  is_verified: boolean;
  created_at: string;
}

const DriverPaymentMethods = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newMethod, setNewMethod] = useState({
    payment_type: '',
    account_identifier: '',
    is_primary: false
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

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
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      toast({
        title: "Error",
        description: "Failed to load payment methods",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addPaymentMethod = async () => {
    if (!newMethod.payment_type || !newMethod.account_identifier) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setIsAdding(true);

      // If this is the first payment method or is_primary is true, set as primary
      const isPrimary = paymentMethods.length === 0 || newMethod.is_primary;

      // If setting as primary, unset other primary methods
      if (isPrimary) {
        await supabase
          .from('driver_payment_methods')
          .update({ is_primary: false })
          .eq('driver_id', user.id);
      }

      const { error } = await supabase
        .from('driver_payment_methods')
        .insert({
          driver_id: user.id,
          payment_type: newMethod.payment_type,
          account_identifier: newMethod.account_identifier,
          is_primary: isPrimary
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment method added successfully"
      });

      setNewMethod({ payment_type: '', account_identifier: '', is_primary: false });
      fetchPaymentMethods();
    } catch (error) {
      console.error('Error adding payment method:', error);
      toast({
        title: "Error",
        description: "Failed to add payment method",
        variant: "destructive"
      });
    } finally {
      setIsAdding(false);
    }
  };

  const setPrimary = async (methodId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Unset all primary methods
      await supabase
        .from('driver_payment_methods')
        .update({ is_primary: false })
        .eq('driver_id', user.id);

      // Set new primary
      const { error } = await supabase
        .from('driver_payment_methods')
        .update({ is_primary: true })
        .eq('id', methodId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Primary payment method updated"
      });

      fetchPaymentMethods();
    } catch (error) {
      console.error('Error setting primary method:', error);
      toast({
        title: "Error",
        description: "Failed to update primary payment method",
        variant: "destructive"
      });
    }
  };

  const deletePaymentMethod = async (methodId: string) => {
    try {
      const { error } = await supabase
        .from('driver_payment_methods')
        .delete()
        .eq('id', methodId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment method deleted"
      });

      fetchPaymentMethods();
    } catch (error) {
      console.error('Error deleting payment method:', error);
      toast({
        title: "Error",
        description: "Failed to delete payment method",
        variant: "destructive"
      });
    }
  };

  const getPaymentMethodIcon = (type: string) => {
    switch (type) {
      case 'cashapp':
        return <DollarSign className="h-5 w-5 text-green-600" />;
      case 'paypal':
        return <CreditCard className="h-5 w-5 text-blue-600" />;
      case 'venmo':
        return <DollarSign className="h-5 w-5 text-blue-500" />;
      case 'zelle':
        return <CreditCard className="h-5 w-5 text-purple-600" />;
      default:
        return <CreditCard className="h-5 w-5" />;
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Methods
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {paymentMethods.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No payment methods added yet. Add one to receive payouts.
            </p>
          ) : (
            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <div key={method.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getPaymentMethodIcon(method.payment_type)}
                    <div>
                      <div className="font-medium capitalize">
                        {method.payment_type}
                        {method.is_primary && (
                          <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                            Primary
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatAccountIdentifier(method.payment_type, method.account_identifier)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!method.is_primary && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPrimary(method.id)}
                      >
                        Set Primary
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deletePaymentMethod(method.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border-t pt-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span className="font-medium">Add Payment Method</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="payment-type">Payment Type</Label>
                  <Select
                    value={newMethod.payment_type}
                    onValueChange={(value) => setNewMethod({ ...newMethod, payment_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cashapp">Cash App</SelectItem>
                      <SelectItem value="paypal">PayPal</SelectItem>
                      <SelectItem value="venmo">Venmo</SelectItem>
                      <SelectItem value="zelle">Zelle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="account-identifier">
                    {newMethod.payment_type === 'cashapp' && '$Cashtag'}
                    {newMethod.payment_type === 'paypal' && 'Email Address'}
                    {newMethod.payment_type === 'venmo' && '@Username'}
                    {newMethod.payment_type === 'zelle' && 'Phone or Email'}
                    {!newMethod.payment_type && 'Account Info'}
                  </Label>
                  <Input
                    id="account-identifier"
                    type="text"
                    value={newMethod.account_identifier}
                    onChange={(e) => setNewMethod({ ...newMethod, account_identifier: e.target.value })}
                    placeholder={
                      newMethod.payment_type === 'cashapp' ? '$yourname' :
                      newMethod.payment_type === 'paypal' ? 'email@example.com' :
                      newMethod.payment_type === 'venmo' ? '@yourname' :
                      newMethod.payment_type === 'zelle' ? 'phone or email' :
                      'Enter account info'
                    }
                  />
                </div>
              </div>

              {paymentMethods.length > 0 && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="set-primary"
                    checked={newMethod.is_primary}
                    onCheckedChange={(checked) => setNewMethod({ ...newMethod, is_primary: checked })}
                  />
                  <Label htmlFor="set-primary">Set as primary payment method</Label>
                </div>
              )}

              <Button onClick={addPaymentMethod} disabled={isAdding} className="w-full">
                {isAdding ? 'Adding...' : 'Add Payment Method'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DriverPaymentMethods;
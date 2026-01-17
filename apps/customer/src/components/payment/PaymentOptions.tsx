import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Smartphone, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import CashAppPayment from './CashAppPayment';

interface PaymentOptionsProps {
  orderTotal: number;
  orderId: string;
  onPaymentMethod: (method: 'stripe' | 'cashapp') => void;
  onPaymentComplete: () => void;
  onClose: () => void;
}

const PaymentOptions = ({ orderTotal, orderId, onPaymentMethod, onPaymentComplete, onClose }: PaymentOptionsProps) => {
  const [selectedMethod, setSelectedMethod] = useState<'stripe' | 'cashapp' | null>(null);
  const [showCashApp, setShowCashApp] = useState(false);
  const { toast } = useToast();

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const handlePaymentSelection = (method: 'stripe' | 'cashapp') => {
    setSelectedMethod(method);
    
    if (method === 'cashapp') {
      setShowCashApp(true);
    } else {
      onPaymentMethod(method);
    }
  };

  if (showCashApp) {
    return (
      <CashAppPayment
        orderTotal={orderTotal}
        orderId={orderId}
        onPaymentComplete={onPaymentComplete}
        onCancel={() => setShowCashApp(false)}
      />
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Choose Payment Method</span>
          <Badge variant="outline">{formatPrice(orderTotal)}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stripe Payment */}
        <Button
          variant={selectedMethod === 'stripe' ? 'default' : 'outline'}
          className="w-full h-16 justify-start text-left"
          onClick={() => handlePaymentSelection('stripe')}
        >
          <div className="flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="font-semibold">Credit/Debit Card</div>
              <div className="text-sm text-muted-foreground">
                Visa, Mastercard, American Express
              </div>
            </div>
          </div>
        </Button>

        <Separator />

        {/* CashApp Payment */}
        <Button
          variant={selectedMethod === 'cashapp' ? 'default' : 'outline'}
          className="w-full h-16 justify-start text-left"
          onClick={() => handlePaymentSelection('cashapp')}
        >
          <div className="flex items-center gap-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <Smartphone className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <div className="font-semibold flex items-center gap-2">
                CashApp Pay
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Popular
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Pay with your CashApp balance
              </div>
            </div>
          </div>
        </Button>

        <Separator />

        {/* Cash on Delivery (Future) */}
        <Button
          variant="outline"
          className="w-full h-16 justify-start text-left opacity-50 cursor-not-allowed"
          disabled
        >
          <div className="flex items-center gap-4">
            <div className="p-2 bg-muted rounded-lg">
              <DollarSign className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <div className="font-semibold flex items-center gap-2">
                Cash on Delivery
                <Badge variant="outline">Coming Soon</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Pay when your order arrives
              </div>
            </div>
          </div>
        </Button>

        <div className="pt-4">
          <Button variant="ghost" onClick={onClose} className="w-full">
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentOptions;
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Upload, QrCode, Smartphone, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CashAppPaymentProps {
  orderTotal: number;
  orderId: string;
  onPaymentComplete: () => void;
  onCancel: () => void;
}

const CashAppPayment = ({ orderTotal, orderId, onPaymentComplete, onCancel }: CashAppPaymentProps) => {
  const [step, setStep] = useState<'instructions' | 'upload' | 'complete'>('instructions');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [notes, setNotes] = useState('');
  const { toast } = useToast();

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  
  // Your business $Cashtag - replace with actual
  const cashtag = '$CraveDelivery';
  const qrCodeUrl = `https://cash.app/${cashtag.slice(1)}`;

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setScreenshot(file);
        toast({
          title: 'Screenshot Uploaded',
          description: 'Payment proof uploaded successfully',
        });
      } else {
        toast({
          title: 'Invalid File',
          description: 'Please upload an image file',
          variant: 'destructive',
        });
      }
    }
  };

  const handleSubmitPayment = () => {
    if (!screenshot && !transactionId.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please upload a screenshot or provide a transaction ID',
        variant: 'destructive',
      });
      return;
    }

    // In a real app, you'd upload the screenshot and submit the payment proof
    // For now, we'll simulate the process
    setStep('complete');
    
    setTimeout(() => {
      toast({
        title: 'Payment Submitted',
        description: 'Your payment is being verified. You will receive confirmation shortly.',
      });
      onPaymentComplete();
    }, 2000);
  };

  if (step === 'complete') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-green-600">Payment Submitted!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              Your payment proof has been submitted and is being verified. 
              You'll receive a confirmation once your order is confirmed.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Order ID: {orderId}</p>
            <p className="text-sm font-medium">Amount: {formatPrice(orderTotal)}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'upload') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Upload Payment Proof</span>
            <Badge variant="outline">{formatPrice(orderTotal)}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              After sending payment via CashApp, please upload a screenshot of your payment confirmation or provide the transaction ID.
            </p>
          </div>

          <div className="space-y-3">
            <Label htmlFor="screenshot-upload">Payment Screenshot</Label>
            <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Upload screenshot of your CashApp payment
              </p>
              <input
                id="screenshot-upload"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => document.getElementById('screenshot-upload')?.click()}
              >
                Choose File
              </Button>
              {screenshot && (
                <p className="text-xs text-green-600 mt-2">
                  ✓ {screenshot.name}
                </p>
              )}
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-2">
            <Label htmlFor="transaction-id">Transaction ID (Optional)</Label>
            <Input
              id="transaction-id"
              placeholder="Enter CashApp transaction ID"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional information about your payment"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[60px]"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setStep('instructions')} className="flex-1">
              Back
            </Button>
            <Button onClick={handleSubmitPayment} className="flex-1">
              Submit Payment
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-green-600" />
            Pay with CashApp
          </span>
          <Badge variant="outline">{formatPrice(orderTotal)}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-medium text-green-800 mb-2">Send Payment To:</h3>
            <div className="text-2xl font-bold text-green-600">{cashtag}</div>
            <p className="text-sm text-green-700 mt-1">Amount: {formatPrice(orderTotal)}</p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Choose your payment method:</p>
            
            {/* Option 1: Direct CashApp Link */}
            <Button 
              className="w-full bg-green-600 hover:bg-green-700 text-white h-12"
              onClick={() => window.open(`https://cash.app/${cashtag}/${formatPrice(orderTotal).replace('$', '')}`, '_blank')}
            >
              <Smartphone className="h-5 w-5 mr-2" />
              Open CashApp & Send {formatPrice(orderTotal)}
            </Button>

            <Separator />

            {/* Option 2: QR Code */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Or scan QR code with CashApp:</p>
              <div className="flex justify-center p-4 bg-white border rounded-lg">
                <QrCode className="h-24 w-24 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Scan with your CashApp camera to pay {cashtag}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-xs text-yellow-800">
            <strong>Important:</strong> Include order ID "{orderId}" in your payment note
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button onClick={() => setStep('upload')} className="flex-1">
            I've Sent Payment
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CashAppPayment;
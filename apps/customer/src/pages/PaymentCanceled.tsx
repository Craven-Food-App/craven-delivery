import React from 'react';
import { Link } from 'react-router-dom';
import { XCircle, ArrowLeft, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const PaymentCanceled = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-8 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl text-red-600">Payment Canceled</CardTitle>
          <p className="text-muted-foreground">
            Your payment was canceled and no charges were made
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              Your order was not placed. You can return to the restaurant and try again when you're ready.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button onClick={() => window.history.back()} className="w-full">
              <RotateCcw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            
            <Link to="/" className="w-full">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentCanceled;
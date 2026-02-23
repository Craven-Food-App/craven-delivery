import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantData } from "@/hooks/useRestaurantData";
import { toast } from "sonner";
import { MoovOnboardingCard } from "./MoovOnboardingCard";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface StripeConnectStatus {
  hasAccount: boolean;
  accountId: string | null;
  onboardingComplete: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
  externalAccounts?: any[];
  requirements?: any;
}


const BankAccountDashboard = () => {
  const { restaurant, loading: restaurantLoading } = useRestaurantData();
  const [stripeStatus, setStripeStatus] = useState<StripeConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingLink, setCreatingLink] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showStripeSection, setShowStripeSection] = useState(false);

  useEffect(() => {
    const fetchStripeStatus = async () => {
      if (!restaurant?.id) {
        setLoading(false);
        setError("No restaurant found. Please complete restaurant setup first.");
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase.functions.invoke('get-stripe-connect-status');
        
        if (error) {
          console.error('Stripe status error:', error);
          throw new Error(error.message || 'Failed to fetch Stripe status');
        }
        
        setStripeStatus(data);
        setRetryCount(0);
      } catch (err: any) {
        console.error('Error fetching Stripe status:', err);
        const errorMessage = err.message || 'Failed to load banking status';
        setError(errorMessage);
        
        // Only show toast on first error, not on retries
        if (retryCount === 0) {
          toast.error(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStripeStatus();
  }, [restaurant?.id, retryCount]);

  const handleEditBankAccount = async () => {
    if (!restaurant?.id) {
      toast.error("Please complete restaurant setup first");
      return;
    }

    setCreatingLink(true);
    try {
      setError(null);
      
      const returnUrl = `${window.location.origin}/merchant-portal?tab=settings&subtab=bank-account`;
      const { data, error } = await supabase.functions.invoke('create-stripe-connect-link', {
        body: { returnUrl, refreshUrl: returnUrl, restaurantId: restaurant.id }
      });
      
      if (error) {
        console.error('Link creation error:', error);
        throw new Error(error.message || 'Failed to create Stripe link');
      }
      
      if (data?.url) {
        toast.success("Redirecting to Stripe...");
        window.location.href = data.url;
      } else {
        throw new Error('No redirect URL received');
      }
    } catch (err: any) {
      console.error('Error creating Stripe link:', err);
      const serverMsg: string = err?.message || err?.error || 'Failed to open banking setup';
      let friendly = serverMsg;
      if (serverMsg.toLowerCase().includes('rejected') || serverMsg.toLowerCase().includes('platform account')) {
        friendly = 'Banking setup is temporarily unavailable because the Stripe platform account is rejected. Please contact Stripe Support to resolve.';
      } else if (serverMsg.toLowerCase().includes('connect is not enabled')) {
        friendly = 'Stripe Connect is not enabled for this key. Enable Connect in your Stripe dashboard or use a Connect-enabled key.';
      }
      setError(friendly);
      toast.error(friendly);
      setCreatingLink(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  if (restaurantLoading || loading) {
    return (
      <div className="space-y-6 pb-8">
        <Skeleton className="h-4 w-full max-w-2xl" />
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-96" />
              </div>
              <Skeleton className="h-10 w-32" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-6 w-48 mb-4" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !stripeStatus) {
    return (
      <div className="space-y-6 pb-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button onClick={handleRetry} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const bankAccount = stripeStatus?.externalAccounts?.[0];
  const isVerified = stripeStatus?.onboardingComplete && stripeStatus?.payoutsEnabled;

  return (
    <div className="space-y-6 pb-8">
      {/* Description */}
      <p className="text-muted-foreground">
        Here is where you will find a summary of your banking information. Crave'n uses Moov to securely manage your payouts.
      </p>

      {/* Toggle for Stripe section */}
      <div className="flex items-center space-x-2 pb-4 border-b">
        <Switch
          id="show-stripe"
          checked={showStripeSection}
          onCheckedChange={setShowStripeSection}
        />
        <Label htmlFor="show-stripe" className="text-sm font-medium cursor-pointer">
          Show legacy Stripe Connect section
        </Label>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Bank Account Information - Stripe Section (Hidden by default) */}
      {showStripeSection && (
        <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Bank account information</h2>
              <p className="text-sm text-muted-foreground">
                Crave'n uses Stripe Connect to securely manage your payouts.
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={handleEditBankAccount}
              disabled={creatingLink}
            >
              {creatingLink ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : stripeStatus?.hasAccount ? 'Edit' : 'Setup Banking'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`p-4 border rounded-lg ${isVerified ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <div className="flex items-center gap-2 mb-3">
                {isVerified ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                )}
                <h3 className="font-semibold">Verification status</h3>
              </div>
              <p className={`font-semibold mb-2 ${isVerified ? 'text-green-600' : 'text-yellow-600'}`}>
                {isVerified ? 'Verified' : stripeStatus?.hasAccount ? 'Pending Verification' : 'Not Setup'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isVerified 
                  ? 'Your bank account is verified and ready to receive payouts.' 
                  : stripeStatus?.hasAccount 
                    ? 'Complete your Stripe Connect onboarding to receive payouts.'
                    : 'Set up your bank account to receive payouts from orders.'}
              </p>
            </div>

            {bankAccount ? (
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-4">Bank account</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Account number</span>
                    <span className="font-mono">••••{bankAccount.last4}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Routing number</span>
                    <span className="font-mono">{bankAccount.routing_number ? `••••${bankAccount.routing_number.slice(-4)}` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Bank name</span>
                    <span>{bankAccount.bank_name || 'N/A'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 border rounded-lg bg-muted/50">
                <h3 className="font-semibold mb-4">No bank account connected</h3>
                <p className="text-sm text-muted-foreground">
                  Click "Setup Banking" to connect your bank account and start receiving payouts.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      )}

      {/* Business Information - Stripe Section (Hidden by default) */}
      {showStripeSection && (
        <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">Business information</h2>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              To process payouts, Crave'n and our payments processing partner, Stripe, are required to collect your business information for compliance and tax purposes.
            </p>

            {stripeStatus?.requirements?.currently_due && stripeStatus.requirements.currently_due.length > 0 ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3 mb-4">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-900 mb-1">Action Required</h3>
                    <p className="text-red-700 font-semibold mb-2">
                      {stripeStatus.requirements.currently_due.length} requirement(s) pending
                    </p>
                    <p className="text-sm text-red-900 mb-3">
                      To avoid delayed payouts, please complete the required business verification. This should only take a few minutes.
                    </p>
                    <Button 
                      variant="destructive" 
                      onClick={handleEditBankAccount}
                      disabled={creatingLink}
                    >
                      {creatingLink ? 'Loading...' : 'Complete Verification'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : stripeStatus?.onboardingComplete ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <p className="text-green-700 font-semibold">Business information verified</p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  Set up your Stripe Connect account to begin receiving payouts from your orders.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      )}

      {/* Moov Onboarding - FIXED: Now passing restaurantId prop */}
      {restaurant?.id && (
        <div className="mt-6">
          <MoovOnboardingCard restaurantId={restaurant.id} />
        </div>
      )}
    </div>
  );
};

export default BankAccountDashboard;
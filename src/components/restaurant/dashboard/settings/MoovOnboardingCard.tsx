import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Loader2, AlertCircle, ExternalLink, RefreshCw } from "lucide-react";
import { useRestaurantData } from "@/hooks/useRestaurantData";

export const MoovOnboardingCard = () => {
  const { restaurant, loading: restaurantLoading } = useRestaurantData();
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [onboardingStatus, setOnboardingStatus] = useState<string | null>(null);
  const [moovAccountId, setMoovAccountId] = useState<string | null>(null);

  useEffect(() => {
    if (restaurant) {
      setOnboardingStatus(restaurant.moov_onboarding_status || null);
      setMoovAccountId(restaurant.moov_account_id || null);
    }
  }, [restaurant]);

  const handleCreateOnboardingLink = async () => {
    if (!restaurant?.id) {
      toast.error("Restaurant information not found");
      return;
    }

    setIsCreatingInvite(true);
    try {
      const response = await supabase.functions.invoke('create-moov-onboarding-invite', {
        body: { restaurantId: restaurant.id, feePlanCodes: ["merchant-direct"] }
      });

      if (response.error) throw response.error;

      const { link: onboardingLink } = response.data;

      if (!onboardingLink) {
        throw new Error('No onboarding link received');
      }

      // Use the link
      window.open(onboardingLink, '_blank');
    } catch (error: any) {
      console.error("Error creating Moov onboarding invite:", error);
      const errorMessage =
        error?.message || error?.error || "Failed to create onboarding link";
      toast.error(errorMessage);
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!restaurant?.id) return;

    try {
      const { data, error } = await supabase
        .from("restaurants")
        .select("moov_onboarding_status, moov_onboarding_complete, moov_account_id")
        .eq("id", restaurant.id)
        .single();

      if (error) throw error;

      if (data) {
        setOnboardingStatus(data.moov_onboarding_status || null);
        setMoovAccountId(data.moov_account_id || null);

        if (data.moov_onboarding_complete) {
          toast.success("Moov onboarding completed!");
        } else {
          toast.info("Onboarding status updated");
        }
      }
    } catch (error: any) {
      console.error("Error checking status:", error);
      toast.error("Failed to check onboarding status");
    }
  };

  // Check for onboarding completion on mount and when returning from Moov
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("moov_onboarding") === "complete") {
      // Small delay to allow database to update
      setTimeout(() => {
        handleCheckStatus();
        // Clean up URL
        window.history.replaceState({}, "", window.location.pathname + window.location.search.replace(/[?&]moov_onboarding=complete/, ""));
      }, 2000);
    }
  }, []);

  const getStatusBadge = () => {
    if (!onboardingStatus) {
      return <Badge variant="outline">Not Started</Badge>;
    }

    switch (onboardingStatus.toLowerCase()) {
      case "completed":
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Pending
          </Badge>
        );
      case "revoked":
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            Revoked
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">{onboardingStatus}</Badge>;
    }
  };

  const isCompleted = onboardingStatus?.toLowerCase() === "completed" || !!moovAccountId;
  const isPending = onboardingStatus?.toLowerCase() === "pending";

  if (restaurantLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Moov Account Setup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Moov Account Setup</CardTitle>
            <CardDescription>
              Complete your Moov account onboarding to enable payment processing
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isCompleted ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-sm text-green-900 dark:text-green-100">
                  Moov Account Connected
                </p>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  Your Moov account has been successfully set up and verified.
                  {moovAccountId && (
                    <span className="block mt-1 text-xs font-mono text-green-600 dark:text-green-400">
                      Account ID: {moovAccountId.slice(0, 8)}...
                    </span>
                  )}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleCheckStatus}
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Status
            </Button>
          </div>
        ) : isPending ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">
                  Onboarding In Progress
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Your Moov onboarding is in progress. Please complete the setup
                  process or check back later.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCheckStatus}
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Check Status
              </Button>
              <Button
                onClick={handleCreateOnboardingLink}
                disabled={isCreatingInvite}
                className="flex-1"
              >
                {isCreatingInvite ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Continue Setup
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-4">
                Complete your Moov account setup to enable:
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span>Accept card payments</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span>Process ACH transactions</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span>Receive payouts</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span>Manage wallet balance</span>
                </li>
              </ul>
            </div>
            <Button
              onClick={handleCreateOnboardingLink}
              disabled={isCreatingInvite}
              className="w-full"
              size="lg"
            >
              {isCreatingInvite ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Onboarding Link...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Start Moov Onboarding
                </>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              You'll be redirected to Moov's secure onboarding form
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};


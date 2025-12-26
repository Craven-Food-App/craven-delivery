import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { environment } from '@/config/environment';

interface MoovOnboardingCardProps {
  restaurantId: string;
}

export function MoovOnboardingCard({ restaurantId }: MoovOnboardingCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feePlanCodes, setFeePlanCodes] = useState<string[]>(["standard"]); // Default fee plan code
  const { toast } = useToast();

  // Fetch fee plan codes from restaurant if available
  useEffect(() => {
    const fetchFeePlanCodes = async () => {
      try {
        const { data, error } = await supabase
          .from('restaurants')
          .select('moov_fee_plan_codes')
          .eq('id', restaurantId)
          .single();

        if (!error && data) {
          const codes = (data as any).moov_fee_plan_codes;
          if (Array.isArray(codes) && codes.length > 0) {
            setFeePlanCodes(codes);
          }
        }
      } catch (err) {
        console.warn('Could not fetch fee plan codes from restaurant, using default:', err);
      }
    };

    if (restaurantId) {
      fetchFeePlanCodes();
    }
  }, [restaurantId]);

  const handleCreateOnboardingLink = async () => {
    setLoading(true);
    setError(null);

    try {
      // Ensure feePlanCodes is always a non-empty array
      const finalFeePlanCodes = Array.isArray(feePlanCodes) && feePlanCodes.length > 0 
        ? feePlanCodes 
        : ["standard"];
      
      const requestPayload = {
        restaurantId,
        feePlanCodes: finalFeePlanCodes,
      };

      console.log('Creating Moov onboarding invite for restaurant:', restaurantId);
      console.log('Using fee plan codes:', finalFeePlanCodes);

      console.log('Request payload:', JSON.stringify(requestPayload, null, 2));

      // Use fetch directly to get better error message access
      const SUPABASE_URL = environment.SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();
      
      const fetchResponse = await fetch(`${SUPABASE_URL}/functions/v1/create-moov-onboarding-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify(requestPayload),
      });

      let responseData;
      try {
        responseData = await fetchResponse.json();
      } catch (parseError) {
        const text = await fetchResponse.text();
        console.error('Failed to parse response as JSON:', text);
        responseData = { error: `Request failed with status ${fetchResponse.status}` };
      }

      if (!fetchResponse.ok) {
        console.error('Edge function error response:', responseData);
        const errorMessage = responseData.error || `Request failed with status ${fetchResponse.status}`;
        throw new Error(errorMessage);
      }

      // Treat responseData as the success data
      const data = responseData;
      const functionError = null;

      // Check if we got an error in the data
      if (data?.error) {
        console.error('API Error in response:', {
          error: data.error,
          details: data.details,
          received: data.received,
          fullResponse: data,
        });
        throw new Error(data.error);
      }

      // Extract the onboarding link
      const onboardingLink = data?.onboardingLink || data?.link || data?.url;

      if (!onboardingLink) {
        console.error('No onboarding link in response. Full data:', data);
        throw new Error('No onboarding link received from server');
      }

      console.log('Successfully created onboarding link:', onboardingLink);

      // Open the link in a new tab
      window.open(onboardingLink, '_blank');

      toast({
        title: 'Success!',
        description: 'Opening Moov onboarding page...',
      });

    } catch (err: any) {
      console.error('Error creating Moov onboarding invite:', err);
      
      // Try to extract a more detailed error message
      let errorMessage = 'Failed to create onboarding invite';
      
      if (err.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err.error) {
        errorMessage = err.error;
      }
      
      // Provide more helpful error messages
      if (errorMessage.includes('feePlanCodes')) {
        errorMessage = 'Fee plan codes are required. Please contact support.';
      } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        errorMessage = 'Moov API access denied. Please check your API credentials or contact support.';
      } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        errorMessage = 'Authentication failed. Please try logging out and back in.';
      }
      
      setError(errorMessage);
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Moov Payment Setup</CardTitle>
        <CardDescription>
          Complete your payment account setup with Moov to start accepting payments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Click below to begin the onboarding process. You'll be redirected to Moov's secure
            platform to complete your payment account setup.
          </p>
          
          <Button
            onClick={handleCreateOnboardingLink}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Link...
              </>
            ) : (
              <>
                <ExternalLink className="mr-2 h-4 w-4" />
                Start Moov Onboarding
              </>
            )}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <p>What you'll need:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Business Tax ID (EIN)</li>
            <li>Bank account information</li>
            <li>Business documentation</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
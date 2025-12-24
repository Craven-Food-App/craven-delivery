import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MoovOnboardingCardProps {
  restaurantId: string;
}

export function MoovOnboardingCard({ restaurantId }: MoovOnboardingCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleCreateOnboardingLink = async () => {
    setLoading(true);
    setError(null);

    try {
      const requestPayload = {
        restaurantId,
      };

      console.log('Creating Moov onboarding invite for restaurant:', restaurantId);

      const response = await supabase.functions.invoke(
        'create-moov-onboarding-invite',
        {
          body: requestPayload,
        }
      );

      // Log the COMPLETE response for debugging
      console.log('Full Edge Function Response:', JSON.stringify(response, null, 2));
      console.log('Response data:', response.data);
      console.log('Response error:', response.error);

      const { data, error: functionError } = response;

      if (functionError) {
        console.error('Edge Function Error Details:', {
          message: functionError.message,
          context: functionError.context,
          details: functionError,
        });
        throw new Error(functionError.message || 'Failed to create onboarding invite');
      }

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
      const errorMessage = err.message || 'Failed to create onboarding invite';
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
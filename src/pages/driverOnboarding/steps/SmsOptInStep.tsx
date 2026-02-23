// @ts-nocheck
import React, { useState } from 'react';
import { Button, Text, Stack, Box } from '@mantine/core';
import { MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SmsOptInStepProps {
  onNext: (data: any) => void;
  onBack: () => void;
  applicationData: any;
}

export const SmsOptInStep: React.FC<SmsOptInStepProps> = ({ onNext, onBack, applicationData }) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleOptIn = async () => {
    setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not found');
      }

      // Save SMS opt-in preference
      // Check if user_preferences or similar table exists, or update craver_applications
      const { error: updateError } = await supabase
        .from('craver_applications')
        .update({
          sms_opt_in: true,
          sms_opt_in_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating SMS opt-in:', updateError);
        // Don't throw - continue anyway
      }

      toast({
        title: "Opted In",
        description: "You'll receive SMS messages from Crave'n",
      });

      onNext({
        smsOptIn: true,
        ...applicationData
      });
    } catch (error: any) {
      console.error('Error opting in to SMS:', error);
      toast({
        title: "Error",
        description: "Failed to save preference. Continuing anyway...",
        variant: "default",
      });
      // Continue anyway
      onNext({
        smsOptIn: true,
        ...applicationData
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNoThanks = () => {
    onNext({
      smsOptIn: false,
      ...applicationData
    });
  };

  return (
    <Box
      style={{
        width: '100%',
        minHeight: '100vh',
        backgroundColor: '#FFFFFF',
        padding: '80px 24px 40px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <Stack gap="xl" style={{ maxWidth: '600px', width: '100%' }}>
        {/* Heading */}
        <Text fw={700} size="2xl" ta="center" style={{ fontSize: '32px', color: '#191919' }}>
          Opt in to Feeder texts
        </Text>

        {/* First Paragraph */}
        <Text size="sm" style={{ color: '#191919', lineHeight: '1.5' }}>
          Opt in to receive SMS messages via autodialer from Crave'n about special offers and other Feeder news to the number you provided.
        </Text>

        {/* Second Paragraph */}
        <Text size="sm" style={{ color: '#191919', lineHeight: '1.5' }}>
          Reply STOP to opt out of these messages and HELP for support. Message & data rates may apply and frequency may vary. Opting in is not a condition of signing up as a Feeder.
        </Text>

        {/* Buttons */}
        <Stack gap="md" mt="md">
          <Button
            size="lg"
            fullWidth
            loading={loading}
            onClick={handleOptIn}
            style={{
              height: '48px',
              backgroundColor: '#DC2626',
              borderRadius: '8px',
              fontWeight: 600,
            }}
          >
            Opt in
          </Button>

          <Button
            size="lg"
            fullWidth
            variant="subtle"
            onClick={handleNoThanks}
            style={{
              height: '48px',
              backgroundColor: '#F5F5F5',
              color: '#666666',
              borderRadius: '8px',
              fontWeight: 500,
            }}
          >
            No thanks
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
};


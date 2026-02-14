// @ts-nocheck
import { useState } from 'react';
import { Button, TextInput, Card, Stack, Text, Alert } from '@mantine/core';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const ResendWaitlistEmail = () => {
  const [email, setEmail] = useState('hr@cravenusa.com');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const sendEmail = async () => {
    if (!email) {
      toast.error('Please enter an email address');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // First, query the database to get user info
      let application = null;

      // Try feeder_applications first
      const { data: feederApp, error: feederError } = await supabase
        .from('feeder_applications')
        .select('*, regions(name)')
        .eq('email', email)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!feederError && feederApp) {
        application = feederApp;
      } else {
        // Try craver_applications
        const { data: craverApp, error: craverError } = await supabase
          .from('craver_applications')
          .select('*, regions(name)')
          .eq('email', email)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!craverError && craverApp) {
          application = craverApp;
        }
      }

      if (!application) {
        setResult(`❌ No application found for ${email}`);
        toast.error(`No application found for ${email}`);
        setLoading(false);
        return;
      }

      // Get waitlist position if not set
      let waitlistPosition = application.waitlist_position;
      if (!waitlistPosition && application.status === 'waitlist') {
        try {
          const { data: positionData, error: positionError } = await supabase.rpc('get_driver_queue_position', {
            driver_uuid: application.id
          });
          if (!positionError && positionData && positionData[0]) {
            waitlistPosition = positionData[0].queue_position;
          }
        } catch (e) {
          console.warn('Could not fetch waitlist position:', e);
        }
      }

      // Build driver name
      const firstName = application.legal_first_name || application.first_name || '';
      const middleName = application.legal_middle_name || application.middle_name || '';
      const lastName = application.legal_last_name || application.last_name || '';
      const driverName = `${firstName}${middleName ? ' ' + middleName : ''} ${lastName}`.trim() || 'Driver';

      // Get region name
      const regionName = application.regions?.name || `${application.city || ''}, ${application.state || ''}`.trim();

      // Prepare email payload
      const emailPayload = {
        driverName,
        driverEmail: application.email,
        city: application.city || '',
        state: application.state || '',
        waitlistPosition: waitlistPosition || 0,
        location: regionName,
        emailType: 'waitlist' as const
      };

      console.log('Sending waitlist email with payload:', emailPayload);

      // Call the edge function
      const { data, error } = await supabase.functions.invoke('send-driver-waitlist-email', {
        body: emailPayload,
      });

      if (error) {
        setResult(`❌ Error: ${error.message}`);
        toast.error(`Failed to send email: ${error.message}`);
      } else {
        setResult(`✅ Email sent successfully to ${email}!`);
        toast.success(`Waitlist email sent to ${email}`);
      }
    } catch (error: any) {
      setResult(`❌ Error: ${error.message}`);
      toast.error(`Failed to send email: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="md">
          <Text size="xl" fw={700}>Resend Waitlist Email</Text>
          
          <TextInput
            label="Email Address"
            placeholder="hr@cravenusa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Button
            onClick={sendEmail}
            loading={loading}
            fullWidth
            style={{ backgroundColor: '#FF6B00' }}
          >
            Send Waitlist Email
          </Button>

          {result && (
            <Alert color={result.includes('✅') ? 'green' : 'red'}>
              {result}
            </Alert>
          )}
        </Stack>
      </Card>
    </div>
  );
};


import React, { useState, useEffect } from 'react';
import { Text, Stack, Divider, Box, Loader, Button } from '@mantine/core';
import { CheckCircle, Clock, Mail, MapPin, Shield, Car } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import celebrationIcon from '@/assets/craven-c-celebration.png';

interface WaitlistSuccessStepProps {
  applicationData: any;
}

export const WaitlistSuccessStep: React.FC<WaitlistSuccessStepProps> = ({ applicationData }) => {
  const navigate = useNavigate();
  const [queuePosition, setQueuePosition] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQueuePosition();
  }, []);

  const fetchQueuePosition = async () => {
    if (!applicationData?.applicationId) return;

    try {
      const { data, error } = await supabase.rpc('get_driver_queue_position', {
        driver_uuid: applicationData.applicationId
      });

      if (error) {
        console.error('Error fetching queue position:', error);
      } else if (data && data[0]) {
        setQueuePosition(data[0]);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      style={{
        width: '100%',
        minHeight: '100vh',
        padding: '80px 24px 40px',
        maxWidth: '800px',
        margin: '0 auto',
        backgroundColor: '#FFFFFF'
      }}
    >
      <Stack gap="xl">
        {/* Header */}
        <Stack gap="xs" align="center">
          <Box style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginTop: '-70px' }}>
            <img 
              src={celebrationIcon} 
              alt="Celebration" 
              style={{ width: '80px', height: '80px', display: 'block' }}
            />
            <Text fw={700} size="2xl" style={{ fontSize: '32px', color: '#191919', marginTop: '30px' }}>
              Application Submitted
            </Text>
          </Box>
          <Text size="md" c="dimmed" style={{ lineHeight: '1.6' }}>
            You've been placed on our waitlist
          </Text>
        </Stack>

        {/* Waitlist Status */}
        <Box
          p="lg"
          style={{
            backgroundColor: '#F9F9F9',
            borderRadius: '8px',
            border: '1px solid #E5E5E5'
          }}
        >
          <Stack gap="md">
            <Box style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Clock size={20} style={{ color: '#666666' }} />
              <Text fw={600} size="lg" style={{ color: '#191919' }}>
                You're on the Waitlist
              </Text>
            </Box>
            <Text size="sm" style={{ color: '#666666', lineHeight: '1.6' }}>
              Thanks for applying! We've received your information and added you to our
              waitlist for your area. We're currently planning our launch in <strong style={{ color: '#ff7a00' }}>{applicationData.city}</strong>.
              You'll be notified by email when we're ready to activate you as a driver.
            </Text>
          </Stack>
        </Box>

        {/* What Happens Next */}
        <Box
          p="lg"
          style={{
            backgroundColor: '#F9F9F9',
            borderRadius: '8px',
            border: '1px solid #E5E5E5'
          }}
        >
          <Text fw={600} size="lg" mb="md" style={{ color: '#191919' }}>
            What Happens Next?
          </Text>
          <Stack gap="lg">
            <Box>
              <Box style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Mail size={16} style={{ color: '#666666' }} />
                <Text fw={500} size="sm" style={{ color: '#191919' }}>Email Confirmation</Text>
              </Box>
              <Text size="sm" style={{ color: '#666666', lineHeight: '1.6', paddingLeft: '24px' }}>
                Check your inbox at <strong style={{ color: '#ff7a00' }}>{applicationData.email}</strong> for a confirmation
                message with your waitlist position.
              </Text>
              <Box
                mt="sm"
                ml="xl"
                p="sm"
                style={{
                  backgroundColor: '#FFF7ED',
                  border: '1px solid #FED7AA',
                  borderRadius: '8px',
                }}
              >
                <Text fw={600} size="xs" style={{ color: '#9A3412', marginBottom: 2 }}>
                  Check Spam or Junk
                </Text>
                <Text size="xs" style={{ color: '#9A3412', lineHeight: 1.5 }}>
                  Confirmation emails sometimes go to Spam or Junk. If you do not see it in your inbox, check there so you can continue with next steps.
                </Text>
              </Box>
            </Box>
            <Divider color="#E5E5E5" />
            <Box>
              <Box style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <MapPin size={16} style={{ color: '#666666' }} />
                <Text fw={500} size="sm" style={{ color: '#191919' }}>Area Launch</Text>
              </Box>
              <Text size="sm" style={{ color: '#666666', lineHeight: '1.6', paddingLeft: '24px' }}>
                We'll contact you when we're ready to launch in your area and need drivers.
              </Text>
            </Box>
            <Divider color="#E5E5E5" />
            <Box>
              <Box style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Shield size={16} style={{ color: '#666666' }} />
                <Text fw={500} size="sm" style={{ color: '#191919' }}>Background Check</Text>
              </Box>
              <Text size="sm" style={{ color: '#666666', lineHeight: '1.6', paddingLeft: '24px' }}>
                When we activate you, we'll run a background check and complete onboarding.
              </Text>
            </Box>
            <Divider color="#E5E5E5" />
            <Box>
              <Box style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Car size={16} style={{ color: '#666666' }} />
                <Text fw={500} size="sm" style={{ color: '#191919' }}>Start Earning</Text>
              </Box>
              <Text size="sm" style={{ color: '#666666', lineHeight: '1.6', paddingLeft: '24px' }}>
                Once activated, you can start accepting delivery orders and earning money.
              </Text>
            </Box>
          </Stack>
        </Box>

        {/* Waitlist Position Info */}
        {loading ? (
          <Box ta="center" p="md">
            <Loader size="sm" color="#666666" />
            <Text size="sm" style={{ color: '#666666' }} mt="xs">Loading queue position...</Text>
          </Box>
        ) : queuePosition && (
          <Box
            p="lg"
            style={{
              backgroundColor: '#F9F9F9',
              borderRadius: '8px',
              border: '1px solid #E5E5E5'
            }}
          >
            <Stack align="center" gap="md">
              <Text fw={600} size="md" style={{ color: '#191919' }}>
                Your Position in Queue
              </Text>
              <Text
                fw={700}
                size="3xl"
                style={{ color: '#ff7a00', fontSize: '48px' }}
              >
                #{queuePosition.queue_position}
              </Text>
              <Text size="sm" style={{ color: '#666666' }}>
                out of <strong style={{ color: '#ff7a00' }}>{queuePosition.total_in_region}</strong> drivers in <strong style={{ color: '#ff7a00' }}>{queuePosition.region_name || 'your area'}</strong>
              </Text>
            </Stack>
          </Box>
        )}

        {/* Additional Info */}
        <Box
          p="lg"
          style={{
            backgroundColor: '#F9F9F9',
            borderRadius: '8px',
            border: '1px solid #E5E5E5'
          }}
        >
          <Stack gap="xs">
            <Box style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail size={16} style={{ color: '#666666' }} />
              <Text fw={500} size="sm" style={{ color: '#191919' }}>
                Stay Updated
              </Text>
            </Box>
            <Text size="sm" style={{ color: '#666666', lineHeight: '1.6', paddingLeft: '24px' }}>
              We'll send you regular updates about our launch timeline and when you can
              expect to start driving. Check your inbox regularly, including Spam or Junk.
            </Text>
          </Stack>
        </Box>

        {/* Done Button */}
        <Box mt="xl">
          <Button
            size="lg"
            fullWidth
            onClick={() => {
              // Navigate to home page or dashboard
              navigate('/');
            }}
            style={{
              height: '56px',
              fontSize: '16px',
              fontWeight: 600,
              borderRadius: '8px',
              backgroundColor: '#ff7a00',
            }}
          >
            Done
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};

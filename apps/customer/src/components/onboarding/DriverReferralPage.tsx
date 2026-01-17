import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, Stack, Text, Group } from '@mantine/core';
import { ArrowLeft } from 'lucide-react';
import { ReferralProgram } from '@/components/ReferralProgram';

export const DriverReferralPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box style={{ minHeight: '100vh', backgroundColor: 'var(--mantine-color-gray-0)', padding: 24 }}>
      <Box style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Button
          variant="subtle"
          onClick={() => navigate('/enhanced-onboarding')}
          mb="md"
          leftSection={<ArrowLeft size={16} />}
        >
          Back to Onboarding
        </Button>

        <Card p="lg" mb="md">
          <Stack gap="md">
            <Text fw={600} size="lg">
              Driver Referral Program
            </Text>
            <Text size="sm" c="dimmed">
              This task is required. You must refer at least one driver to complete it. Share your referral code and earn up to $400 per driver!
            </Text>
          </Stack>
        </Card>

        <Box style={{ backgroundColor: 'white', borderRadius: 8, padding: 24 }}>
          <ReferralProgram userType="driver" />
        </Box>
      </Box>
    </Box>
  );
};


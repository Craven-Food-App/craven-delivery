import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Text, Title, Button, Stack } from '@mantine/core';
import { savePendingReferralCode } from '@/lib/referralInviteStorage';

/**
 * Landing for https://…/r/:code — stores invite code and sends user to signup.
 */
const ReferralLanding: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (code) {
      savePendingReferralCode(code);
    }
  }, [code]);

  const goSignup = () => {
    if (code) savePendingReferralCode(code);
    navigate('/auth', { state: { mode: 'signup', referralCode: code } });
  };

  return (
    <Box
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'linear-gradient(180deg, #fff7ed 0%, #ffffff 60%)',
      }}
    >
      <Stack gap="md" style={{ maxWidth: 400, width: '100%' }}>
        <Title order={2} style={{ fontSize: 24, fontWeight: 800, color: '#111827' }}>
          You’re invited to Crave’n
        </Title>
        <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.6 }}>
          A friend shared invite code{' '}
          <strong style={{ letterSpacing: 1 }}>{(code || '').toUpperCase()}</strong>. Create your
          account with this code to unlock welcome rewards, then place your first order.
        </Text>
        <Button
          size="md"
          onClick={goSignup}
          style={{
            height: 48,
            borderRadius: 999,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
          }}
        >
          Sign up with this code
        </Button>
        <Button variant="subtle" onClick={() => navigate('/restaurants')} style={{ color: '#6b7280' }}>
          Browse without signing up
        </Button>
      </Stack>
    </Box>
  );
};

export default ReferralLanding;

import React, { useState, useEffect } from 'react';
import { Box, Text, Title, Button, Group, Stack, Paper, Divider } from '@mantine/core';
import {
  IconX,
  IconUsers,
  IconHelpCircle,
  IconLink,
  IconMail,
  IconMessageCircle,
  IconShare2,
  IconCopy
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCraveMoreOffer } from '@/hooks/useCraveMoreOffer';
import cravenReferHero from '@/assets/crave_friend_invite .png'; // Asset file has space in name
import { supabase } from '@/integrations/supabase/client';

const InviteFriends: React.FC = () => {
  const navigate = useNavigate();
  const { cartCount } = useCart();
  const isMobile = useIsMobile();
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const { offer } = useCraveMoreOffer();
  const [referralCode, setReferralCode] = useState<string>('CRAVEN10');
  const [loadingCode, setLoadingCode] = useState<boolean>(true);

  // Config-driven amounts so we can A/B or change later
  const BASE_CONFIG = {
    friendReward: 10,
    userReward: 10,
    minOrder: 25
  };

  const CRAVEMORE_CONFIG = {
    friendReward: 15,
    userReward: 20,
    minOrder: 25
  };

  const isCraveMore = offer?.currentMembership?.status === 'active';
  const config = isCraveMore ? CRAVEMORE_CONFIG : BASE_CONFIG;

  // Load or create a unique referral code for this customer
  // IMPORTANT: Codes are PERMANENT - once created, they never change
  useEffect(() => {
    const loadReferralCode = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoadingCode(false);
          return;
        }

        // FIRST: Always check for existing code (PERMANENT - never regenerate)
        const { data: existingCode, error: existingError } = await supabase
          .from('referral_codes')
          .select('code')
          .eq('user_id', user.id)
          .eq('user_type', 'customer')
          .eq('is_active', true)
          .maybeSingle();

        if (existingError) {
          console.warn('Error loading referral code:', existingError);
        }

        // If code exists, use it immediately (PERMANENT)
        if (existingCode?.code) {
          setReferralCode(existingCode.code);
          setLoadingCode(false);
          return; // Exit early - never call RPC if code exists
        }

        // ONLY generate if no code exists (first time only)
        // The RPC function also checks for existing codes as a safeguard
        const { data: newCode, error: rpcError } = await supabase.rpc(
          'generate_referral_code',
          {
            p_user_id: user.id,
            p_user_type: 'customer',
          }
        );

        if (rpcError) {
          console.error('Error generating referral code:', rpcError);
        } else if (newCode) {
          setReferralCode(newCode);
        }
      } catch (err) {
        console.error('Unexpected error loading referral code:', err);
      } finally {
        setLoadingCode(false);
      }
    };

    loadReferralCode();
  }, []);

  const referralLink = `https://cravenusa.com/r/${referralCode}`;

  const copyReferralLink = async () => {
    await navigator.clipboard.writeText(referralLink);
    alert('Referral link copied'); // lightweight success feedback
  };

  const handleCopyPrimary = async () => {
    await copyReferralLink();
  };

  const shareByEmail = async () => {
    const subject = encodeURIComponent("Crave’n – Try it and earn rewards");
    const body = encodeURIComponent(
      `I’m using Crave’n for delivery. Use my link to sign up and place your first order:\n\n${referralLink}`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const shareByText = async () => {
    const text = encodeURIComponent(
      `Try Crave’n, food, grocery, retail, convenience, and same-day courier (CX), all in one app. Use my link on your first order:\n${referralLink}`
    );
    window.location.href = `sms:?body=${text}`;
  };

  return (
    <Box
      style={{
        minHeight: '100vh',
        backgroundColor: 'white',
        paddingBottom:
          cartCount > 0
            ? 'calc(180px + env(safe-area-inset-bottom, 0px))'
            : 'calc(100px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {/* Top Navigation */}
      <Group
        p="md"
        style={{
          borderBottom: '1px solid #e5e7eb',
          paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
        }}
      >
        <Button
          variant="subtle"
          onClick={() => navigate('/account')}
          style={{ padding: '8px', minWidth: 'auto' }}
        >
          <IconX size={18} color="#111827" />
        </Button>
        <Group gap="xs" style={{ flex: 1, justifyContent: 'center' }}>
          <Title order={4} style={{ color: '#111827', fontWeight: 600 }}>
            Refer & Earn
          </Title>
        </Group>
        <Button
          variant="subtle"
          onClick={() => navigate('/customer-support')}
          style={{ padding: '8px', minWidth: 'auto', fontSize: '13px', fontWeight: 500, color: '#111827' }}
        >
          FAQ
        </Button>
      </Group>

      {/* Content */}
      <Stack gap="lg" p="md" style={{ maxWidth: '600px', margin: '0 auto' }}>
        {/* Hero image + headline / subhead */}
        <Stack gap="md">
          <Box
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: 4,
              marginBottom: 4
            }}
          >
            <img
              src={cravenReferHero}
              alt="Crave'n Refer & Earn"
              style={{
                maxWidth: 260,
                width: '100%',
                height: 'auto',
                display: 'block'
              }}
            />
          </Box>
          <Stack gap={4}>
            <Title order={2} style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>
              {isCraveMore ? 'CraveMore Members Earn More' : 'Earn $10 for Every Friend Who Orders'}
            </Title>
            <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.6 }}>
              Invite friends to Crave’n. When they place their first qualifying order, you both earn rewards.
            </Text>
          </Stack>
        </Stack>

        {/* Reward breakdown */}
        <Paper radius="md" p="md" withBorder>
          <Stack gap="sm">
            <Text style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
              What you and your friends get
            </Text>
            <Stack gap={10}>
              <Stack gap={2}>
                <Text style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                  Friend reward
                </Text>
                <Text style={{ fontSize: 13, color: '#4b5563' }}>
                  Your friend gets <strong>${config.friendReward} off</strong> their first order*.
                </Text>
                <Text style={{ fontSize: 12, color: '#6b7280' }}>
                  Minimum first order: <strong>${config.minOrder}</strong>.
                </Text>
              </Stack>

              <Stack gap={2}>
                <Text style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                  Your reward
                </Text>
                <Text style={{ fontSize: 13, color: '#4b5563' }}>
                  You earn <strong>${config.userReward} in Crave’n credits</strong> after their order
                  is completed.
                </Text>
                <Text style={{ fontSize: 12, color: '#6b7280' }}>
                  Credits apply automatically to your account on eligible orders.
                </Text>
              </Stack>
            </Stack>
          </Stack>
        </Paper>

        {/* CraveMore banner when applicable */}
        {isCraveMore && (
          <Box
            style={{
              borderRadius: 12,
              padding: '8px 12px',
              backgroundColor: '#fffbeb',
              border: '1px solid #fed7aa',
            }}
          >
            <Text style={{ fontSize: 12, color: '#92400e' }}>
              CraveMore members earn boosted referral rewards automatically.
            </Text>
          </Box>
        )}

        {/* Referral link module */}
        <Stack gap="xs">
          <Text style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Your invite link</Text>
          <Box
            style={{
              borderRadius: '999px',
              border: '1px solid #e5e7eb',
              padding: '8px 10px',
              backgroundColor: '#f9fafb',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <IconShare2 size={16} color="#6b7280" />
            <Text
              style={{
                fontSize: 12,
                color: '#111827',
                fontWeight: 600,
                flex: 1,
                wordBreak: 'break-all',
              }}
            >
              {referralLink}
            </Text>
            <Button
              size="xs"
              variant="subtle"
              onClick={copyReferralLink}
              style={{ paddingInline: 8, height: 30 }}
            >
              <IconCopy size={14} />
            </Button>
          </Box>
        </Stack>

        {/* Share actions */}
        <Group grow gap="md">
          <Button
            size="md"
            leftSection={<IconMail size={18} />}
            onClick={shareByEmail}
            style={{
              height: 48,
              fontSize: 14,
              fontWeight: 600,
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              borderRadius: '999px',
              color: '#ffffff',
            }}
          >
            Email
          </Button>
            <Button
            size="md"
            leftSection={<IconMessageCircle size={18} />}
            onClick={shareByText}
            style={{
              height: 48,
              fontSize: 14,
              fontWeight: 600,
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              borderRadius: '999px',
              color: '#ffffff',
            }}
            >
            Text
            </Button>
        </Group>

        {/* Reward activity */}
        <Button
          variant="outline"
          size="md"
          onClick={() => navigate('/my-credits')}
          style={{
            height: 44,
            borderRadius: 999,
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          View Reward Activity
        </Button>

        {/* How It Works expandable section */}
        <Box
          style={{
            borderRadius: 16,
            border: '1px solid #e5e7eb',
            backgroundColor: '#ffffff',
            overflow: 'hidden',
          }}
        >
          <button
            type="button"
            onClick={() => setHowItWorksOpen((prev) => !prev)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              background: 'white',
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>How It Works</Text>
            <Text style={{ fontSize: 18, color: '#6b7280' }}>{howItWorksOpen ? '−' : '+'}</Text>
          </button>
          {howItWorksOpen && (
            <>
              <Divider />
              <Stack gap={8} p="sm">
                <Group align="flex-start" gap="sm">
                  <Text style={{ fontSize: 13, fontWeight: 600, color: '#f97316' }}>1</Text>
                  <Text style={{ fontSize: 13, color: '#4b5563' }}>
                    Share your Crave’n referral link with someone new.
                  </Text>
                </Group>
                <Group align="flex-start" gap="sm">
                  <Text style={{ fontSize: 13, fontWeight: 600, color: '#f97316' }}>2</Text>
                  <Text style={{ fontSize: 13, color: '#4b5563' }}>
                    Your friend signs up and places a qualifying first order.
                  </Text>
                </Group>
                <Group align="flex-start" gap="sm">
                  <Text style={{ fontSize: 13, fontWeight: 600, color: '#f97316' }}>3</Text>
                  <Text style={{ fontSize: 13, color: '#4b5563' }}>
                    After delivery is completed, you earn Crave’n credits automatically.
                  </Text>
                </Group>
              </Stack>
            </>
          )}
        </Box>

        {/* Rules / guidelines */}
        <Stack gap={4}>
          <Text style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Program details</Text>
          <Text style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
            • One reward per new customer you invite.
          </Text>
          <Text style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
            • A minimum first order amount is required for rewards to apply.
          </Text>
          <Text style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
            • Credits are not cash, cannot be withdrawn, and can only be used on eligible
            Crave’n orders.
          </Text>
          <Text style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
            • Crave’n may adjust or end this program at any time.
          </Text>
        </Stack>
      </Stack>
    </Box>
  );
};

export default InviteFriends;

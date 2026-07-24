import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, Title, Button, Group, Stack, Paper, Divider } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconX,
  IconMail,
  IconMessageCircle,
  IconShare2,
  IconCopy,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useCraveMoreOffer } from '@/hooks/useCraveMoreOffer';
import { useNewCustomer365ReferralPromo } from '@/hooks/useNewCustomer365ReferralPromo';
import { useReferralTracker } from '@/hooks/useReferralTracker';
import { useReferralInviteStats } from '@/hooks/useReferralInviteStats';
import { NewCustomer365PromoCard } from '@/components/referral/NewCustomer365PromoCard';
import { ReferralTracker } from '@/components/referral/ReferralTracker';
import { InviteMissionBoard } from '@/components/referral/InviteMissionBoard';
import cravenReferHero from '@/assets/crave_friend_invite .png';
import { supabase } from '@/integrations/supabase/client';
import { isValidPersonalReferralCode } from '@/lib/referralCodeGuards';
import { logReferralInviteEvent } from '@/lib/logReferralInviteEvent';

const InviteFriends: React.FC = () => {
  const navigate = useNavigate();
  const { cartCount } = useCart();
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const { offer } = useCraveMoreOffer();
  const { promo: promo365, loading: promo365Loading } = useNewCustomer365ReferralPromo();
  const {
    referrals,
    loading: trackerLoading,
    error: trackerError,
    refresh: refreshTracker,
  } = useReferralTracker();
  const {
    stats: inviteStats,
    loading: statsLoading,
    refresh: refreshInviteStats,
  } = useReferralInviteStats();

  const [referralCode, setReferralCode] = useState<string>('');
  const [loadingCode, setLoadingCode] = useState(true);
  const [sharing, setSharing] = useState(false);

  const BASE_CONFIG = {
    friendReward: 10,
    userReward: 10,
    minOrder: 25,
  };

  const CRAVEMORE_CONFIG = {
    friendReward: 15,
    userReward: 20,
    minOrder: 25,
  };

  const isCraveMore = offer?.currentMembership?.status === 'active';
  const config = isCraveMore ? CRAVEMORE_CONFIG : BASE_CONFIG;
  const codeReady = isValidPersonalReferralCode(referralCode);
  const referralLink = codeReady ? `https://cravenusa.com/r/${referralCode}` : '';

  useEffect(() => {
    const loadReferralCode = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setReferralCode('');
          return;
        }

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

        if (isValidPersonalReferralCode(existingCode?.code)) {
          setReferralCode(existingCode!.code.toUpperCase());
          return;
        }

        const { data: newCode, error: rpcError } = await supabase.rpc('generate_referral_code', {
          p_user_id: user.id,
          p_user_type: 'customer',
        });

        if (rpcError) {
          console.error('Error generating referral code:', rpcError);
          notifications.show({
            title: 'Invite code unavailable',
            message: 'We could not load your personal invite code. Try again in a moment.',
            color: 'red',
          });
          setReferralCode('');
        } else if (isValidPersonalReferralCode(String(newCode || ''))) {
          setReferralCode(String(newCode).toUpperCase());
        } else {
          setReferralCode('');
        }
      } catch (err) {
        console.error('Unexpected error loading referral code:', err);
        setReferralCode('');
      } finally {
        setLoadingCode(false);
      }
    };

    loadReferralCode();
  }, []);

  const buildInviteMessage = useCallback(() => {
    return [
      `Join me on Crave’n for delivery.`,
      `Use my personal invite code ${referralCode} when you sign up (or open the link below).`,
      `You’ll get welcome rewards on your first qualifying order — and it counts toward my 365-day free delivery prize.`,
      ``,
      referralLink,
    ].join('\n');
  }, [referralCode, referralLink]);

  const requireCode = () => {
    if (loadingCode) {
      notifications.show({
        title: 'Almost ready',
        message: 'Your personal invite code is still loading.',
        color: 'orange',
      });
      return false;
    }
    if (!codeReady) {
      notifications.show({
        title: 'No invite code yet',
        message: 'Sign in and wait for your personal code before sharing.',
        color: 'red',
      });
      return false;
    }
    return true;
  };

  const afterShare = async (channel: 'email' | 'sms' | 'copy_link' | 'copy_code' | 'share') => {
    await logReferralInviteEvent({ channel, referralCode });
    await refreshInviteStats();
  };

  const copyReferralLink = async () => {
    if (!requireCode()) return;
    setSharing(true);
    try {
      await navigator.clipboard.writeText(referralLink);
      await afterShare('copy_link');
      notifications.show({
        title: 'Link copied',
        message: `Invite link with code ${referralCode} is on your clipboard.`,
        color: 'green',
      });
    } catch {
      notifications.show({
        title: 'Copy failed',
        message: 'Could not copy the link. Try again.',
        color: 'red',
      });
    } finally {
      setSharing(false);
    }
  };

  const copyReferralCode = async () => {
    if (!requireCode()) return;
    setSharing(true);
    try {
      await navigator.clipboard.writeText(referralCode);
      await afterShare('copy_code');
      notifications.show({
        title: 'Code copied',
        message: `${referralCode} is ready to paste.`,
        color: 'green',
      });
    } catch {
      notifications.show({
        title: 'Copy failed',
        message: 'Could not copy the code. Try again.',
        color: 'red',
      });
    } finally {
      setSharing(false);
    }
  };

  const shareByEmail = async () => {
    if (!requireCode()) return;
    setSharing(true);
    try {
      await afterShare('email');
      const subject = encodeURIComponent('Your Crave’n invite');
      const body = encodeURIComponent(buildInviteMessage());
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    } finally {
      setSharing(false);
    }
  };

  const shareByText = async () => {
    if (!requireCode()) return;
    setSharing(true);
    try {
      await afterShare('sms');
      const text = encodeURIComponent(buildInviteMessage());
      window.location.href = `sms:?body=${text}`;
    } finally {
      setSharing(false);
    }
  };

  const shareNative = async () => {
    if (!requireCode()) return;
    if (!navigator.share) {
      await copyReferralLink();
      return;
    }
    setSharing(true);
    try {
      await navigator.share({
        title: 'Crave’n invite',
        text: buildInviteMessage(),
        url: referralLink,
      });
      await afterShare('share');
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        notifications.show({
          title: 'Share cancelled',
          message: 'You can still copy your link or code below.',
          color: 'gray',
        });
      }
    } finally {
      setSharing(false);
    }
  };

  const displayCode = loadingCode ? 'Loading…' : codeReady ? referralCode : 'Unavailable';
  const displayLink = loadingCode
    ? 'Loading your invite link…'
    : codeReady
      ? referralLink
      : 'Sign in to unlock your personal invite link';

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
      <Group
        p="md"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          width: '100%',
          zIndex: 1000,
          backgroundColor: 'white',
          borderBottom: '1px solid #e5e7eb',
          paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
          flexShrink: 0,
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
          style={{
            padding: '8px',
            minWidth: 'auto',
            fontSize: '13px',
            fontWeight: 500,
            color: '#111827',
          }}
        >
          FAQ
        </Button>
      </Group>

      <Stack
        gap="lg"
        p="md"
        style={{
          maxWidth: '600px',
          margin: '0 auto',
          paddingTop: 'calc(100px + env(safe-area-inset-top, 0px))',
        }}
      >
        <Stack gap="md">
          <Box
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: 4,
              marginBottom: 4,
            }}
          >
            <img
              src={cravenReferHero}
              alt="Crave'n Refer & Earn"
              style={{
                maxWidth: 260,
                width: '100%',
                height: 'auto',
                display: 'block',
              }}
            />
          </Box>
          <Stack gap={4}>
            <Title order={2} style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>
              {isCraveMore
                ? 'CraveMore Members Earn More'
                : 'Earn $10 for Every Friend Who Orders'}
            </Title>
            <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.6 }}>
              Share your personal invite code. Track every share, open, signup, and qualifying
              order — then climb the invite ranks.
            </Text>
          </Stack>
        </Stack>

        <InviteMissionBoard stats={inviteStats} loading={statsLoading} />

        <NewCustomer365PromoCard
          promo={promo365}
          loading={promo365Loading || loadingCode}
          referralCode={codeReady ? referralCode : undefined}
        />

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
                  You earn <strong>${config.userReward} in Crave’n credits</strong> after their
                  order is completed.
                </Text>
                <Text style={{ fontSize: 12, color: '#6b7280' }}>
                  Credits apply automatically to your account on eligible orders.
                </Text>
              </Stack>
            </Stack>
          </Stack>
        </Paper>

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

        <Stack gap="xs">
          <Text style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
            Your personal invite code
          </Text>
          <Box
            style={{
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              padding: '12px 14px',
              backgroundColor: '#111827',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: 1.5,
                flex: 1,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              }}
            >
              {displayCode}
            </Text>
            <Button
              size="xs"
              variant="white"
              onClick={copyReferralCode}
              disabled={!codeReady || sharing}
              style={{ paddingInline: 10, height: 32, fontWeight: 700 }}
            >
              Copy code
            </Button>
          </Box>
        </Stack>

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
              {displayLink}
            </Text>
            <Button
              size="xs"
              variant="subtle"
              onClick={copyReferralLink}
              disabled={!codeReady || sharing}
              style={{ paddingInline: 8, height: 30 }}
            >
              <IconCopy size={14} />
            </Button>
          </Box>
          {!codeReady && !loadingCode && (
            <Text style={{ fontSize: 12, color: '#b91c1c' }}>
              Sharing is locked until your personal code is ready. Placeholder promo codes are never
              sent.
            </Text>
          )}
        </Stack>

        <Group grow gap="md">
          <Button
            size="md"
            leftSection={<IconMail size={18} />}
            onClick={shareByEmail}
            disabled={!codeReady || sharing}
            style={{
              height: 48,
              fontSize: 14,
              fontWeight: 600,
              background: codeReady
                ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
                : '#d1d5db',
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
            disabled={!codeReady || sharing}
            style={{
              height: 48,
              fontSize: 14,
              fontWeight: 600,
              background: codeReady
                ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
                : '#d1d5db',
              borderRadius: '999px',
              color: '#ffffff',
            }}
          >
            Text
          </Button>
        </Group>

        {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
          <Button
            variant="outline"
            size="md"
            onClick={shareNative}
            disabled={!codeReady || sharing}
            style={{ height: 44, borderRadius: 999, fontSize: 14, fontWeight: 600 }}
          >
            Share invite
          </Button>
        )}

        <ReferralTracker
          referrals={referrals}
          loading={trackerLoading}
          error={trackerError}
          onRefresh={() => {
            refreshTracker();
            refreshInviteStats();
          }}
        />

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
          View Wallet & Credits
        </Button>

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
                    Share your personal Crave’n code or link — never a generic promo code.
                  </Text>
                </Group>
                <Group align="flex-start" gap="sm">
                  <Text style={{ fontSize: 13, fontWeight: 600, color: '#f97316' }}>2</Text>
                  <Text style={{ fontSize: 13, color: '#4b5563' }}>
                    Watch opens and signups land on your invite mission board.
                  </Text>
                </Group>
                <Group align="flex-start" gap="sm">
                  <Text style={{ fontSize: 13, fontWeight: 600, color: '#f97316' }}>3</Text>
                  <Text style={{ fontSize: 13, color: '#4b5563' }}>
                    When their qualifying order completes, you earn credits and prize progress.
                  </Text>
                </Group>
              </Stack>
            </>
          )}
        </Box>

        <Stack gap={4}>
          <Text style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Program details</Text>
          <Text style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
            • One standard reward per new customer you invite who completes a qualifying order.
          </Text>
          <Text style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
            • A minimum first order amount is required for rewards to apply.
          </Text>
          <Text style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
            • Credits are not cash, cannot be withdrawn, and can only be used on eligible Crave’n
            orders.
          </Text>
          <Text style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
            • Eligible new customers may also earn a limited 365-day CraveMore free-delivery prize
            using the same invite code — see the prize section above.
          </Text>
          <Text style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
            • Crave’n may adjust or end this program at any time.
          </Text>
          <Text
            component="a"
            href="/legal/referral"
            style={{
              fontSize: 12,
              color: '#ea580c',
              fontWeight: 600,
              textDecoration: 'underline',
              marginTop: 4,
            }}
          >
            Full Referral Program Terms
          </Text>
        </Stack>
      </Stack>
    </Box>
  );
};

export default InviteFriends;

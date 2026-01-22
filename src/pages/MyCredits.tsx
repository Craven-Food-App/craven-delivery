import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, 
  Text, 
  Title, 
  Button, 
  Group, 
  ActionIcon, 
  Paper, 
  Stack,
  Badge,
  Divider
} from '@mantine/core';
import { 
  IconChevronLeft, 
  IconCreditCard,
  IconHome, 
  IconShoppingBag, 
  IconSearch, 
  IconUser, 
  IconShoppingCart,
  IconClock,
  IconCheck,
  IconX
} from '@tabler/icons-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';

type Coupon = {
  id: number;
  startX: number;
  startY: number;
  driftX: number;
  driftY: number;
  rotation: number;
  spin: number;
  scale: number;
  duration: number;
  delay: number;
  zIndex: number;
  tone: string;
};

const CouponsBlowingAnimation = () => {
  const coupons = useMemo<Coupon[]>(() => {
    const styles = [
      { label: '$20 OFF', start: '#D63A2F', end: '#9E0F1C', text: '#FFFFFF' },
      { label: '$10 OFF', start: '#E0453B', end: '#B1141E', text: '#FFFFFF' },
      { label: '15% OFF', start: '#F28B24', end: '#D86C08', text: '#FFFFFF' },
      { label: '$50 OFF', start: '#C92B24', end: '#8F0A14', text: '#FFFFFF' },
      { label: '5% OFF', start: '#F4A23A', end: '#E1790F', text: '#FFFFFF' },
      { label: '$25 OFF', start: '#D94A3C', end: '#A5161E', text: '#FFFFFF' },
      { label: '$30 OFF', start: '#E66A2D', end: '#C74E05', text: '#FFFFFF' },
      { label: '$15 OFF', start: '#E2533F', end: '#B0191F', text: '#FFFFFF' },
      { label: '$5 OFF', start: '#F2B04C', end: '#E08614', text: '#FFFFFF' },
      { label: '20% OFF', start: '#D53B2F', end: '#9A101C', text: '#FFFFFF' },
      { label: '$40 OFF', start: '#C93025', end: '#8D0B14', text: '#FFFFFF' },
      { label: '$12 OFF', start: '#F29A34', end: '#D7740E', text: '#FFFFFF' },
    ];

    return Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      startX: -80 + (i % 4) * 60,
      startY: 40 + (i % 6) * 35,
      driftX: 420 + (i % 5) * 40,
      driftY: -80 + (i % 4) * 25,
      rotation: -18 + (i % 7) * 6,
      spin: 45 + (i % 5) * 20,
      scale: 0.85 + (i % 4) * 0.08,
      duration: 6 + (i % 5) * 0.8,
      delay: i * 0.35,
      zIndex: 3 + (i % 4),
      tone: styles[i % styles.length].start,
      label: styles[i % styles.length].label,
      toneEnd: styles[i % styles.length].end,
      textColor: styles[i % styles.length].text,
    }));
  }, []);

  const serratedClip =
    'polygon(4% 0%, 96% 0%, 100% 7%, 96% 14%, 100% 21%, 96% 28%, 100% 35%, 96% 42%, 100% 49%, 96% 56%, 100% 63%, 96% 70%, 100% 77%, 96% 84%, 100% 91%, 96% 98%, 4% 100%, 0% 93%, 4% 86%, 0% 79%, 4% 72%, 0% 65%, 4% 58%, 0% 51%, 4% 44%, 0% 37%, 4% 30%, 0% 23%, 4% 16%, 0% 9%)';

  return (
    <Box
      style={{
        position: 'relative',
        width: '100%',
        height: '400px',
        overflow: 'hidden',
        backgroundColor: 'transparent',
        borderRadius: 0,
        marginBottom: '32px',
        boxShadow: 'none'
      }}
    >
      <Box
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 20% 20%, rgba(255, 148, 92, 0.12) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255, 188, 120, 0.1) 0%, transparent 55%)',
          animation: 'couponGlow 7s ease-in-out infinite'
        }}
      />

      {coupons.map((coupon) => (
        <Box
          key={`bg-${coupon.id}`}
          style={{
            position: 'absolute',
            left: '0px',
            top: '0px',
            width: '150px',
            height: '86px',
            background: `linear-gradient(135deg, ${coupon.tone} 0%, ${coupon.toneEnd} 100%)`,
            clipPath: serratedClip,
            transform: 'translate3d(0,0,0)',
            animation: `couponDrift ${coupon.duration}s ease-in-out infinite`,
            animationDelay: `${coupon.delay + 0.4}s`,
            zIndex: 1,
            opacity: 0.35,
            filter: 'blur(6px)',
            '--start-x': `${coupon.startX + 40}px`,
            '--start-y': `${coupon.startY + 10}px`,
            '--drift-x': `${coupon.driftX}px`,
            '--drift-y': `${coupon.driftY}px`,
            '--start-rot': `${coupon.rotation}deg`,
            '--spin': `${coupon.spin}deg`,
            '--scale': `${coupon.scale}`,
          } as React.CSSProperties}
        />
      ))}

      {coupons.map((coupon) => (
        <Box
          key={coupon.id}
          style={{
            position: 'absolute',
            left: '0px',
            top: '0px',
            width: '150px',
            height: '86px',
            background: `linear-gradient(135deg, ${coupon.tone} 0%, ${coupon.toneEnd} 100%)`,
            clipPath: serratedClip,
            border: '1px solid rgba(255, 255, 255, 0.25)',
            boxShadow: '0 18px 35px rgba(16, 24, 40, 0.22), 0 0 16px rgba(255, 120, 40, 0.22)',
            transform: 'translate3d(0,0,0)',
            animation: `couponDrift ${coupon.duration}s ease-in-out infinite`,
            animationDelay: `${coupon.delay}s`,
            zIndex: coupon.zIndex,
            '--start-x': `${coupon.startX}px`,
            '--start-y': `${coupon.startY}px`,
            '--drift-x': `${coupon.driftX}px`,
            '--drift-y': `${coupon.driftY}px`,
            '--start-rot': `${coupon.rotation}deg`,
            '--spin': `${coupon.spin}deg`,
            '--scale': `${coupon.scale}`,
          } as React.CSSProperties}
        >
          <Box
            style={{
              position: 'absolute',
              inset: '8px',
              border: '2px dashed rgba(255, 255, 255, 0.55)',
              borderRadius: '10px',
              background: 'linear-gradient(140deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.05) 100%)'
            }}
          />
          <Box
            style={{
              position: 'absolute',
              left: '12px',
              top: '12px',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.35)',
              boxShadow: 'inset 0 2px 6px rgba(255,255,255,0.7)'
            }}
          />
          <Text
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              color: coupon.textColor,
              fontWeight: 800,
              fontSize: '22px',
              letterSpacing: '0.5px',
              textShadow: '0 6px 12px rgba(0,0,0,0.25)'
            }}
          >
            {coupon.label}
          </Text>
          <Box
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '12px',
              background: 'linear-gradient(115deg, rgba(255,255,255,0.45) 0%, transparent 45%, rgba(255,255,255,0.2) 65%, transparent 100%)',
              animation: `couponShine ${coupon.duration * 0.8}s ease-in-out infinite`,
              animationDelay: `${coupon.delay + 0.6}s`
            }}
          />
        </Box>
      ))}

      <style>{`
        @keyframes couponDrift {
          0% {
            transform: translate3d(var(--start-x), var(--start-y), 0) rotate(var(--start-rot)) scale(var(--scale));
            opacity: 0;
          }
          12% {
            opacity: 1;
          }
          55% {
            transform: translate3d(calc(var(--start-x) + var(--drift-x) * 0.55), calc(var(--start-y) + var(--drift-y) * 0.55), 0) rotate(calc(var(--start-rot) + var(--spin) * 0.55)) scale(var(--scale));
            opacity: 0.95;
          }
          100% {
            transform: translate3d(calc(var(--start-x) + var(--drift-x)), calc(var(--start-y) + var(--drift-y)), 0) rotate(calc(var(--start-rot) + var(--spin))) scale(var(--scale));
            opacity: 0;
          }
        }

        @keyframes couponShine {
          0% { opacity: 0; }
          30% { opacity: 0.35; }
          60% { opacity: 0.15; }
          100% { opacity: 0; }
        }

        @keyframes couponGlow {
          0%, 100% { opacity: 0.9; }
          50% { opacity: 0.65; }
        }
      `}</style>
    </Box>
  );
};

export default function MyCredits() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { cartCount } = useCart();
  const [totalRedeemed, setTotalRedeemed] = useState(0);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [testerCredits, setTesterCredits] = useState<any>(null);
  const [testerEnrollmentStatus, setTesterEnrollmentStatus] = useState<string | null>(null);
  const [showDriverPrompt, setShowDriverPrompt] = useState(false);
  const [driverPromptShown, setDriverPromptShown] = useState(false);

  useEffect(() => {
    loadCreditsData();
  }, []);

  const loadCreditsData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Load user credits/rewards data
      // This would come from your rewards/credits table
      const { data, error } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // Silently handle if table doesn't exist or no row found
      if (error) {
        // Only log non-404 errors (table not found is expected)
        if (error.code !== 'PGRST116' && error.code !== '42P01') {
          console.log('Error loading credits:', error.message);
        }
      } else if (data) {
        setCredits(data.balance_cents || 0);
        setTotalRedeemed(data.total_redeemed_cents || 0);
      }

      // Load tester credits
      const { data: testerCreditsData, error: testerError } = await supabase.rpc(
        'get_available_tester_credits',
        { p_user_id: user.id }
      );

      if (!testerError && testerCreditsData) {
        setTesterCredits(testerCreditsData);
      }

      // Load enrollment status to determine language
      const { data: enrollment } = await supabase
        .from('android_tester_enrollments')
        .select('tester_reward_status, status')
        .eq('email', user.email)
        .maybeSingle();

      if (enrollment) {
        // Use status field if available, otherwise fall back to tester_reward_status
        setTesterEnrollmentStatus(enrollment.status === 'issued' ? 'issued' : enrollment.tester_reward_status);
      }

      // Check if Tier A is issued and driver prompt hasn't been shown
      if (enrollment && (enrollment.status === 'issued' || enrollment.tester_reward_status === 'issued')) {
        const promptShown = sessionStorage.getItem(`driver_prompt_shown_${user.id}`);
        if (!promptShown) {
          // Check if Tier A reward exists
          const { data: tierA } = await supabase
            .from('tester_reward_issuances')
            .select('id')
            .eq('user_id', user.id)
            .eq('tier', 'tier_a')
            .maybeSingle();
          
          if (tierA) {
            setShowDriverPrompt(true);
          }
        }
      }
    } catch (error: any) {
      // Table might not exist yet - that's okay, silently handle
      if (error?.code !== 'PGRST116' && error?.code !== '42P01') {
      console.log('Credits table not found, using defaults');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      style={{
        width: '100%',
        maxWidth: isMobile ? '100%' : '600px',
        margin: '0 auto',
        minHeight: '100vh',
        backgroundColor: 'white',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: 'calc(80px + env(safe-area-inset-top, 0px))',
        paddingBottom: cartCount > 0 ? 'calc(160px + env(safe-area-inset-bottom, 0px))' : 'calc(80px + env(safe-area-inset-bottom, 0px))'
      }}
    >
      {/* Page Header - Fixed at Top matching Chat Header Structure */}
      <Paper
        shadow="xs"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          width: '100%',
          zIndex: 1000,
          padding: '20px 24px',
          borderBottom: '1px solid #E5E7EB',
          backgroundColor: 'white',
          paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
          flexShrink: 0
        }}
      >
        <Group justify="space-between" align="center">
          <Group gap="md" align="center">
            <ActionIcon
              variant="subtle"
              size="lg"
              onClick={() => navigate(-1)}
              style={{
                color: '#374151',
                border: '1px solid #E5E7EB',
                borderRadius: '8px'
              }}
            >
              <IconChevronLeft size={20} />
            </ActionIcon>
            <Title
              order={2}
              style={{
                fontSize: '20px',
                fontWeight: 600,
                color: '#111827',
                margin: 0,
                lineHeight: '1.2'
              }}
            >
              My Credits
            </Title>
          </Group>
          <Button
            variant="light"
            size="sm"
            leftSection={<IconCreditCard size={16} />}
            onClick={() => navigate('/account/payment-methods')}
            style={{
              backgroundColor: '#F3F4F6',
              color: '#374151',
              fontWeight: 500
            }}
          >
            Linked cards
          </Button>
        </Group>
      </Paper>

      {/* Main Content */}
      <Box style={{ flex: 1, padding: '24px' }}>
        <Stack gap="lg" align="center">
          {/* Total Redeemed */}
          <Text
            size="sm"
            style={{
              color: '#6B7280',
              fontSize: '14px',
              marginBottom: '8px'
            }}
          >
            You've redeemed a total of ${(totalRedeemed / 100).toFixed(2)}
          </Text>

          {/* Premium Coupons Animation */}
          <CouponsBlowingAnimation />

          {/* Tester Balance/Credits Section */}
          {testerCredits && testerCredits.available_credit_cents > 0 && (
            <Paper p="md" withBorder radius="md" style={{ width: '100%', maxWidth: '400px' }}>
              <Stack gap="sm">
                <Group justify="space-between">
                  <Text fw={600} size="lg">
                    {testerEnrollmentStatus === 'issued' ? 'Crave\'n Credits' : 'Available Balance'}
                  </Text>
                  <Badge color="orange" size="lg">
                    ${(testerCredits.available_credit_cents / 100).toFixed(2)}
                  </Badge>
                </Group>
                {testerEnrollmentStatus !== 'issued' && (
                  <Text size="sm" c="dimmed">
                    Your reward balance will be available after testing completion.
                  </Text>
                )}
                {testerEnrollmentStatus === 'issued' && (
                  <Text size="sm" c="dimmed">
                    Available credits apply only to Crave'n platform fees
                  </Text>
                )}
                {testerCredits.earliest_expires_at && (
                  <Group gap="xs">
                    <IconClock size={14} />
                    <Text size="xs" c="dimmed">
                      Expires: {new Date(testerCredits.earliest_expires_at).toLocaleDateString()}
                    </Text>
                  </Group>
                )}
                {testerCredits.grants && testerCredits.grants.length > 0 && testerEnrollmentStatus === 'issued' && (
                  <Stack gap="xs" mt="xs">
                    <Divider />
                    {testerCredits.grants.map((grant: any, idx: number) => (
                      <Group key={idx} justify="space-between">
                        <Text size="xs" c="dimmed">
                          {grant.grant_type === 'base_enrollment' ? 'Base Enrollment' : 'Selected Tester Bonus'}
                        </Text>
                        <Group gap="xs">
                          <Text size="xs">
                            ${((grant.available_cents || 0) / 100).toFixed(2)} available
                          </Text>
                          {new Date(grant.expires_at) < new Date() ? (
                            <IconX size={12} color="red" />
                          ) : (
                            <IconCheck size={12} color="green" />
                          )}
                        </Group>
                      </Group>
                    ))}
                  </Stack>
                )}
              </Stack>
            </Paper>
          )}

          {/* Driver Prompt - One-time only after Tier A */}
          {showDriverPrompt && !driverPromptShown && (
            <Paper 
              p="md" 
              withBorder 
              radius="md" 
              style={{ 
                width: '100%', 
                maxWidth: '400px',
                background: 'linear-gradient(135deg, #ff6b00 0%, #ff8c1a 100%)',
                color: 'white'
              }}
            >
              <Stack gap="sm">
                <Group justify="space-between">
                  <Text fw={600} size="lg" c="white">
                    Earn More Rewards
                  </Text>
                  <ActionIcon
                    variant="subtle"
                    color="white"
                    onClick={async () => {
                      setShowDriverPrompt(false);
                      setDriverPromptShown(true);
                      const { data: { user } } = await supabase.auth.getUser();
                      if (user) {
                        sessionStorage.setItem(`driver_prompt_shown_${user.id}`, 'true');
                      }
                    }}
                  >
                    <IconX size={18} />
                  </ActionIcon>
                </Group>
                <Text size="sm" c="white" style={{ opacity: 0.9 }}>
                  Become a driver and earn an additional $25 reward!
                </Text>
                <Button
                  variant="white"
                  color="orange"
                  onClick={() => {
                    setShowDriverPrompt(false);
                    setDriverPromptShown(true);
                    navigate('/tester/driver-interest');
                  }}
                  fullWidth
                >
                  Learn More
                </Button>
              </Stack>
            </Paper>
          )}

          {/* Empty State Message - only show if no credits at all */}
          {(!testerCredits || testerCredits.available_credit_cents === 0) && credits === 0 && (
            <Stack gap="md" align="center" style={{ textAlign: 'center', marginTop: '16px' }}>
              <Title
                order={3}
                style={{
                  fontSize: '24px',
                  fontWeight: 600,
                  color: '#111827',
                  margin: 0
                }}
              >
                No credits...yet.
              </Title>
              <Text
                size="md"
                style={{
                  color: '#6B7280',
                  fontSize: '16px',
                  maxWidth: '400px',
                  lineHeight: '1.5'
                }}
              >
                Start earning credits by placing an order at a participating store.
              </Text>
            </Stack>
          )}

          {/* CTA Button */}
          <Button
            size="lg"
            onClick={() => navigate('/restaurants')}
            style={{
              backgroundColor: '#F3F4F6',
              color: '#111827',
              fontWeight: 600,
              fontSize: '16px',
              padding: '12px 24px',
              borderRadius: '8px',
              marginTop: '24px'
            }}
            rightSection={
              <Box
                style={{
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                →
              </Box>
            }
          >
            Explore stores with credits
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}

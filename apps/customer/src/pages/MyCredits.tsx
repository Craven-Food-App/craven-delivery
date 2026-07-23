import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionIcon, Box, Button, Group, Stack, Text, Title } from '@mantine/core';
import {
  IconChevronLeft,
  IconPlus,
  IconCreditCard,
} from '@tabler/icons-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';

type WalletCardKind = 'credits' | 'cravemore' | 'payment' | 'add';

interface PaymentMethodRow {
  id: string;
  brand?: string | null;
  last4?: string | null;
  is_default?: boolean;
  type?: string | null;
}

interface WalletStackCard {
  id: string;
  kind: WalletCardKind;
  title: string;
  subtitle: string;
  detail?: string;
  gradient: string;
  textColor: string;
  mutedColor: string;
  onOpen?: () => void;
}

const PEEK = 62;
const CARD_HEIGHT = 196;
const CARD_RADIUS = 16;

function brandGradient(brand?: string | null): string {
  const b = (brand || '').toLowerCase();
  if (b.includes('visa')) return 'linear-gradient(145deg, #1a1f71 0%, #0b3d91 55%, #15205b 100%)';
  if (b.includes('master')) return 'linear-gradient(145deg, #1f1f1f 0%, #eb001b 45%, #f79e1b 100%)';
  if (b.includes('amex') || b.includes('american')) return 'linear-gradient(145deg, #016fd0 0%, #004b8d 100%)';
  if (b.includes('discover')) return 'linear-gradient(145deg, #ff6000 0%, #c44500 100%)';
  return 'linear-gradient(145deg, #2c2c2e 0%, #1c1c1e 100%)';
}

function formatBrand(brand?: string | null): string {
  if (!brand) return 'Card';
  const b = brand.toLowerCase();
  if (b.includes('visa')) return 'Visa';
  if (b.includes('master')) return 'Mastercard';
  if (b.includes('amex') || b.includes('american')) return 'Amex';
  if (b.includes('discover')) return 'Discover';
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

export default function MyCredits() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [creditsCents, setCreditsCents] = useState(0);
  const [totalRedeemedCents, setTotalRedeemedCents] = useState(0);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodRow[]>([]);
  const [hasCraveMore, setHasCraveMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>('credits');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) {
          setLoading(false);
          return;
        }

        const [creditsRes, methodsRes, membershipRes] = await Promise.all([
          supabase.from('user_credits').select('*').eq('user_id', user.id).maybeSingle(),
          supabase
            .from('payment_methods')
            .select('id, brand, last4, is_default, type')
            .eq('user_id', user.id)
            .order('is_default', { ascending: false }),
          supabase
            .from('user_memberships')
            .select('id, status')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .maybeSingle(),
        ]);

        if (cancelled) return;

        if (creditsRes.data) {
          setCreditsCents(Number(creditsRes.data.balance_cents) || 0);
          setTotalRedeemedCents(Number(creditsRes.data.total_redeemed_cents) || 0);
        }
        if (methodsRes.data) {
          setPaymentMethods(methodsRes.data as PaymentMethodRow[]);
        }
        setHasCraveMore(!!membershipRes.data);
      } catch {
        // Tables may be missing in some environments — keep empty wallet stack.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = useMemo<WalletStackCard[]>(() => {
    const stack: WalletStackCard[] = [
      {
        id: 'credits',
        kind: 'credits',
        title: "Crave'n Credits",
        subtitle: `$${(creditsCents / 100).toFixed(2)}`,
        detail:
          totalRedeemedCents > 0
            ? `$${(totalRedeemedCents / 100).toFixed(2)} redeemed`
            : 'Earn credits on eligible orders',
        gradient: 'linear-gradient(145deg, #ff7a45 0%, #ff5f1f 42%, #ea580c 100%)',
        textColor: '#ffffff',
        mutedColor: 'rgba(255,255,255,0.78)',
      },
      {
        id: 'cravemore',
        kind: 'cravemore',
        title: 'CraveMore',
        subtitle: hasCraveMore ? 'Member' : 'Join',
        detail: hasCraveMore
          ? '$0 delivery on eligible orders'
          : 'Unlock member savings',
        gradient: 'linear-gradient(145deg, #111111 0%, #2a2a2a 50%, #3d2a1f 100%)',
        textColor: '#ffffff',
        mutedColor: 'rgba(255,255,255,0.65)',
        onOpen: () => navigate(hasCraveMore ? '/account/cravemore' : '/cravemore'),
      },
    ];

    for (const method of paymentMethods) {
      stack.push({
        id: `pm-${method.id}`,
        kind: 'payment',
        title: formatBrand(method.brand),
        subtitle: method.last4 ? `•••• ${method.last4}` : 'Payment card',
        detail: method.is_default ? 'Default' : 'Linked card',
        gradient: brandGradient(method.brand),
        textColor: '#ffffff',
        mutedColor: 'rgba(255,255,255,0.72)',
        onOpen: () => navigate('/account/payment-methods'),
      });
    }

    stack.push({
      id: 'add',
      kind: 'add',
      title: 'Add Card',
      subtitle: 'Payment method',
      detail: 'Link a card to checkout faster',
      gradient: 'linear-gradient(145deg, #3a3a3c 0%, #2c2c2e 100%)',
      textColor: '#ffffff',
      mutedColor: 'rgba(255,255,255,0.6)',
      onOpen: () => navigate('/account/payment-methods'),
    });

    return stack;
  }, [creditsCents, totalRedeemedCents, paymentMethods, hasCraveMore, navigate]);

  const selectedIndex = Math.max(
    0,
    cards.findIndex((c) => c.id === selectedId)
  );

  const stackHeight = useMemo(() => {
    const base = (cards.length - 1) * PEEK + CARD_HEIGHT;
    const expandExtra = CARD_HEIGHT - PEEK;
    return base + expandExtra + 24;
  }, [cards.length]);

  const getCardTop = (index: number) => {
    if (index <= selectedIndex) return index * PEEK;
    return index * PEEK + (CARD_HEIGHT - PEEK);
  };

  const creditsSelected = selectedId === 'credits';

  return (
    <Box
      style={{
        width: '100%',
        maxWidth: isMobile ? '100%' : 430,
        margin: '0 auto',
        minHeight: '100vh',
        backgroundColor: '#000000',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <Box
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          paddingTop: 'env(safe-area-inset-top, 0px)',
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.88) 70%, rgba(0,0,0,0) 100%)',
          paddingLeft: 16,
          paddingRight: 16,
          paddingBottom: 8,
        }}
      >
        <Group justify="space-between" align="center" pt={12} pb={4}>
          <ActionIcon
            variant="subtle"
            size="lg"
            onClick={() => navigate(-1)}
            aria-label="Back"
            style={{ color: '#f5f5f7' }}
          >
            <IconChevronLeft size={24} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            size="lg"
            onClick={() => navigate('/account/payment-methods')}
            aria-label="Linked cards"
            style={{ color: '#f5f5f7' }}
          >
            <IconPlus size={22} />
          </ActionIcon>
        </Group>
        <Title
          order={1}
          style={{
            fontSize: 34,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            margin: '4px 0 4px',
            color: '#f5f5f7',
          }}
        >
          Wallet
        </Title>
        <Text
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.55)',
            marginBottom: 8,
          }}
        >
          My Credits
        </Text>
      </Box>

      <Box px={16} style={{ flex: 1 }}>
        <Text
          size="sm"
          style={{
            color: 'rgba(255,255,255,0.55)',
            fontSize: 14,
            marginBottom: 16,
          }}
        >
          You&apos;ve redeemed a total of ${(totalRedeemedCents / 100).toFixed(2)}
        </Text>

        {loading ? (
          <Text c="dimmed" size="sm" mt="md">
            Loading wallet…
          </Text>
        ) : (
          <Box
            style={{
              position: 'relative',
              width: '100%',
              height: stackHeight,
              marginTop: 4,
            }}
          >
            {cards.map((card, index) => {
              const isSelected = card.id === selectedId;
              const top = getCardTop(index);
              return (
                <Box
                  key={card.id}
                  component="button"
                  type="button"
                  onClick={() => {
                    if (isSelected && card.onOpen) {
                      card.onOpen();
                      return;
                    }
                    setSelectedId(card.id);
                  }}
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top,
                    height: CARD_HEIGHT,
                    border: 0,
                    padding: 0,
                    margin: 0,
                    cursor: 'pointer',
                    borderRadius: CARD_RADIUS,
                    background: card.gradient,
                    boxShadow:
                      '0 12px 28px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.18)',
                    zIndex: isSelected ? 40 : 10 + index,
                    transform: isSelected ? 'scale(1)' : 'scale(0.985)',
                    transition:
                      'top 280ms cubic-bezier(0.22, 1, 0.36, 1), transform 220ms ease, box-shadow 220ms ease',
                    WebkitTapHighlightColor: 'transparent',
                    overflow: 'hidden',
                    textAlign: 'left',
                    color: card.textColor,
                  }}
                >
                  <Box
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'linear-gradient(125deg, rgba(255,255,255,0.22) 0%, transparent 42%, transparent 58%, rgba(255,255,255,0.08) 100%)',
                      pointerEvents: 'none',
                    }}
                  />

                  <Box
                    style={{
                      position: 'relative',
                      height: '100%',
                      padding: '18px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                      <Box style={{ minWidth: 0 }}>
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            color: card.mutedColor,
                            lineHeight: 1.2,
                          }}
                        >
                          {card.title}
                        </Text>
                        {card.kind === 'add' ? (
                          <Group gap={8} mt={10} align="center">
                            <IconPlus size={22} />
                            <Text fw={700} style={{ fontSize: 22 }}>
                              Add Card
                            </Text>
                          </Group>
                        ) : (
                          <Text
                            fw={800}
                            style={{
                              fontSize: card.kind === 'credits' ? 36 : 28,
                              letterSpacing: '-0.02em',
                              marginTop: 6,
                              lineHeight: 1.1,
                            }}
                          >
                            {card.subtitle}
                          </Text>
                        )}
                      </Box>
                      {card.kind === 'payment' || card.kind === 'add' ? (
                        <IconCreditCard size={28} style={{ opacity: 0.9, flexShrink: 0 }} />
                      ) : (
                        <Text
                          fw={800}
                          style={{
                            fontSize: 18,
                            letterSpacing: '-0.02em',
                            opacity: 0.95,
                            flexShrink: 0,
                          }}
                        >
                          {card.kind === 'credits' ? "C'" : 'CM'}
                        </Text>
                      )}
                    </Group>

                    <Group justify="space-between" align="flex-end" wrap="nowrap">
                      <Text
                        style={{
                          fontSize: 13,
                          color: card.mutedColor,
                          fontWeight: 500,
                        }}
                      >
                        {card.detail}
                      </Text>
                      {isSelected && card.onOpen ? (
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: card.mutedColor,
                          }}
                        >
                          Tap again to open
                        </Text>
                      ) : null}
                    </Group>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}

        {/* Keep My Credits page content below the wallet stack */}
        <Stack gap="md" align="center" mt="xl" pb="lg" style={{ textAlign: 'center' }}>
          {creditsSelected && creditsCents === 0 && (
            <>
              <Title
                order={3}
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: '#f5f5f7',
                  margin: 0,
                }}
              >
                No credits…yet.
              </Title>
              <Text
                style={{
                  color: 'rgba(255,255,255,0.55)',
                  fontSize: 16,
                  maxWidth: 360,
                  lineHeight: 1.5,
                }}
              >
                Start earning credits by placing an order at a participating store.
              </Text>
            </>
          )}

          {creditsSelected && creditsCents > 0 && (
            <Text
              style={{
                color: 'rgba(255,255,255,0.55)',
                fontSize: 15,
                maxWidth: 360,
                lineHeight: 1.5,
              }}
            >
              Your Crave&apos;n Credits balance is ready to use on eligible fees at checkout.
            </Text>
          )}

          <Button
            size="lg"
            onClick={() => navigate('/restaurants?browse=guest')}
            style={{
              backgroundColor: 'rgba(255,255,255,0.12)',
              color: '#f5f5f7',
              fontWeight: 600,
              fontSize: 16,
              padding: '12px 24px',
              borderRadius: 12,
              marginTop: 8,
              border: '1px solid rgba(255,255,255,0.14)',
            }}
            rightSection={<Text component="span">→</Text>}
          >
            Explore stores with credits
          </Button>

          <Button
            variant="subtle"
            size="sm"
            leftSection={<IconCreditCard size={16} />}
            onClick={() => navigate('/account/payment-methods')}
            style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}
          >
            Linked cards
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}

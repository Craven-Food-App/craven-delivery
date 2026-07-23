import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionIcon, Box, Button, Group, Stack, Text, Title } from '@mantine/core';
import {
  IconChevronLeft,
  IconPlus,
  IconCreditCard,
  IconNfc,
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
  last4?: string;
  brandLabel?: string;
  gradient: string;
  accent?: string;
  textColor: string;
  mutedColor: string;
  onOpen?: () => void;
}

const PEEK = 64;
const CARD_HEIGHT = 210;
const CARD_RADIUS = 18;

function brandGradient(brand?: string | null): string {
  const b = (brand || '').toLowerCase();
  if (b.includes('visa')) {
    return 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 28%, #2563eb 55%, #1e40af 100%)';
  }
  if (b.includes('master')) {
    return 'linear-gradient(135deg, #111827 0%, #1f2937 35%, #7f1d1d 70%, #b45309 100%)';
  }
  if (b.includes('amex') || b.includes('american')) {
    return 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 45%, #0284c7 100%)';
  }
  if (b.includes('discover')) {
    return 'linear-gradient(135deg, #9a3412 0%, #ea580c 50%, #fb923c 100%)';
  }
  return 'linear-gradient(135deg, #334155 0%, #475569 45%, #64748b 100%)';
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

/** EMV chip — gold metallic contact pad */
function EmvChip() {
  return (
    <Box
      aria-hidden
      style={{
        width: 44,
        height: 34,
        borderRadius: 6,
        background:
          'linear-gradient(145deg, #f5e6c8 0%, #d4af37 22%, #f0d78c 48%, #b8860b 72%, #e8c547 100%)',
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.65), inset 0 -2px 4px rgba(120,80,0,0.35), 0 2px 4px rgba(0,0,0,0.25)',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* Contact grid lines */}
      <Box
        style={{
          position: 'absolute',
          inset: 5,
          borderRadius: 3,
          border: '1px solid rgba(120,80,0,0.45)',
          background:
            'linear-gradient(90deg, transparent 31%, rgba(120,80,0,0.35) 32%, transparent 33%), linear-gradient(90deg, transparent 65%, rgba(120,80,0,0.35) 66%, transparent 67%), linear-gradient(0deg, transparent 45%, rgba(120,80,0,0.35) 46%, transparent 47%)',
        }}
      />
      <Box
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(120deg, rgba(255,255,255,0.55) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.2) 100%)',
        }}
      />
    </Box>
  );
}

function RealisticCardFace({ card }: { card: WalletStackCard }) {
  const showChip = card.kind !== 'add';
  const showPan =
    card.kind === 'payment'
      ? `••••  ••••  ••••  ${card.last4 || '••••'}`
      : card.kind === 'credits'
        ? card.subtitle
        : card.subtitle;

  return (
    <>
      {/* Plastic base texture */}
      <Box
        style={{
          position: 'absolute',
          inset: 0,
          background: card.gradient,
        }}
      />
      {/* Micro grain */}
      <Box
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.12,
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 2px), repeating-linear-gradient(90deg, rgba(0,0,0,0.03) 0 1px, transparent 1px 2px)',
          pointerEvents: 'none',
        }}
      />
      {/* Glossy highlight sweep */}
      <Box
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(118deg, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0.12) 18%, transparent 38%, transparent 62%, rgba(255,255,255,0.1) 78%, rgba(255,255,255,0.22) 100%)',
          pointerEvents: 'none',
        }}
      />
      {/* Soft holographic ribbon */}
      <Box
        style={{
          position: 'absolute',
          right: -20,
          top: 28,
          width: 120,
          height: 70,
          transform: 'rotate(18deg)',
          background:
            'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), rgba(168,85,247,0.12), rgba(56,189,248,0.1), rgba(255,255,255,0.08), transparent)',
          filter: 'blur(0.5px)',
          pointerEvents: 'none',
        }}
      />
      {/* Edge bevel */}
      <Box
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: CARD_RADIUS,
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -1px 0 rgba(0,0,0,0.25), inset 1px 0 0 rgba(255,255,255,0.12), inset -1px 0 0 rgba(0,0,0,0.12)',
          pointerEvents: 'none',
        }}
      />

      <Box
        style={{
          position: 'relative',
          height: '100%',
          padding: '18px 20px 16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          color: card.textColor,
        }}
      >
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Text
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: card.mutedColor,
              textShadow: '0 1px 1px rgba(0,0,0,0.25)',
            }}
          >
            {card.title}
          </Text>
          {card.kind === 'payment' ? (
            <Text
              fw={800}
              style={{
                fontSize: 18,
                fontStyle: 'italic',
                letterSpacing: '0.02em',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
              }}
            >
              {card.brandLabel}
            </Text>
          ) : card.kind === 'add' ? (
            <IconCreditCard size={26} style={{ opacity: 0.85 }} />
          ) : (
            <Text
              fw={800}
              style={{
                fontSize: 17,
                letterSpacing: '-0.02em',
                textShadow: '0 1px 2px rgba(0,0,0,0.25)',
              }}
            >
              {card.kind === 'credits' ? "Crave'n" : 'CraveMore'}
            </Text>
          )}
        </Group>

        {card.kind === 'add' ? (
          <Group gap={10} align="center" mt={8}>
            <Box
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.16)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255,255,255,0.28)',
              }}
            >
              <IconPlus size={22} />
            </Box>
            <Box>
              <Text fw={800} style={{ fontSize: 22, letterSpacing: '-0.02em' }}>
                Add Card
              </Text>
              <Text style={{ fontSize: 13, color: card.mutedColor }}>{card.detail}</Text>
            </Box>
          </Group>
        ) : (
          <>
            <Group gap={14} align="center" mt={4} wrap="nowrap">
              {showChip ? <EmvChip /> : null}
              <IconNfc
                size={28}
                style={{
                  color: card.mutedColor,
                  opacity: 0.9,
                  filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.25))',
                }}
              />
            </Group>

            <Text
              fw={700}
              style={{
                fontSize: card.kind === 'credits' ? 34 : 22,
                letterSpacing: card.kind === 'payment' ? '0.14em' : '-0.02em',
                fontVariantNumeric: 'tabular-nums',
                textShadow: '0 2px 3px rgba(0,0,0,0.35), 0 0 1px rgba(0,0,0,0.4)',
                marginTop: 10,
                lineHeight: 1.15,
              }}
            >
              {showPan}
            </Text>

            <Group justify="space-between" align="flex-end" wrap="nowrap" mt={6}>
              <Box style={{ minWidth: 0 }}>
                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: card.mutedColor,
                    marginBottom: 2,
                  }}
                >
                  {card.kind === 'credits' ? 'Available balance' : card.kind === 'cravemore' ? 'Status' : 'Cardholder'}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: card.textColor,
                    textShadow: '0 1px 1px rgba(0,0,0,0.25)',
                  }}
                >
                  {card.detail}
                </Text>
              </Box>
              {card.kind === 'payment' ? (
                <Box
                  style={{
                    width: 42,
                    height: 28,
                    borderRadius: 4,
                    background:
                      'linear-gradient(145deg, rgba(255,255,255,0.35), rgba(255,255,255,0.08))',
                    border: '1px solid rgba(255,255,255,0.35)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
                  }}
                />
              ) : null}
            </Group>
          </>
        )}
      </Box>
    </>
  );
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
            ? `$${(totalRedeemedCents / 100).toFixed(2)} redeemed lifetime`
            : 'Earn on eligible orders',
        gradient:
          'linear-gradient(135deg, #ff9a5a 0%, #ff6b35 32%, #ff5f1f 58%, #ea580c 100%)',
        textColor: '#ffffff',
        mutedColor: 'rgba(255,255,255,0.82)',
      },
      {
        id: 'cravemore',
        kind: 'cravemore',
        title: 'Membership',
        subtitle: hasCraveMore ? 'Active Member' : 'Join CraveMore',
        detail: hasCraveMore
          ? '$0 delivery on eligible orders'
          : 'Unlock member savings',
        gradient:
          'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 40%, #cbd5e1 70%, #94a3b8 100%)',
        textColor: '#0f172a',
        mutedColor: 'rgba(15,23,42,0.55)',
        onOpen: () => navigate(hasCraveMore ? '/account/cravemore' : '/cravemore'),
      },
    ];

    for (const method of paymentMethods) {
      stack.push({
        id: `pm-${method.id}`,
        kind: 'payment',
        title: 'Debit · Credit',
        subtitle: method.last4 ? `•••• ${method.last4}` : 'Payment card',
        last4: method.last4 || undefined,
        brandLabel: formatBrand(method.brand),
        detail: method.is_default ? 'Default card' : 'Linked card',
        gradient: brandGradient(method.brand),
        textColor: '#ffffff',
        mutedColor: 'rgba(255,255,255,0.78)',
        onOpen: () => navigate('/account/payment-methods'),
      });
    }

    stack.push({
      id: 'add',
      kind: 'add',
      title: 'New',
      subtitle: 'Add Card',
      detail: 'Link a card to checkout faster',
      gradient:
        'linear-gradient(135deg, #ffffff 0%, #f1f5f9 45%, #e2e8f0 100%)',
      textColor: '#0f172a',
      mutedColor: 'rgba(15,23,42,0.5)',
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
        backgroundColor: '#ffffff',
        backgroundImage:
          'radial-gradient(ellipse at top, #fff7ed 0%, #ffffff 42%, #f8fafc 100%)',
        color: '#0f172a',
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
            'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.92) 72%, rgba(255,255,255,0) 100%)',
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
            style={{ color: '#334155' }}
          >
            <IconChevronLeft size={24} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            size="lg"
            onClick={() => navigate('/account/payment-methods')}
            aria-label="Linked cards"
            style={{ color: '#334155' }}
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
            color: '#0f172a',
          }}
        >
          Wallet
        </Title>
        <Text
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: '#64748b',
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
            color: '#64748b',
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
                    border: card.kind === 'add' || card.kind === 'cravemore'
                      ? '1px solid rgba(15,23,42,0.08)'
                      : '0',
                    padding: 0,
                    margin: 0,
                    cursor: 'pointer',
                    borderRadius: CARD_RADIUS,
                    background: 'transparent',
                    boxShadow: isSelected
                      ? '0 18px 40px rgba(15, 23, 42, 0.22), 0 4px 12px rgba(15, 23, 42, 0.12)'
                      : '0 10px 24px rgba(15, 23, 42, 0.14), 0 2px 6px rgba(15, 23, 42, 0.08)',
                    zIndex: isSelected ? 40 : 10 + index,
                    transform: isSelected ? 'translateY(-2px) scale(1)' : 'scale(0.992)',
                    transition:
                      'top 280ms cubic-bezier(0.22, 1, 0.36, 1), transform 220ms ease, box-shadow 220ms ease',
                    WebkitTapHighlightColor: 'transparent',
                    overflow: 'hidden',
                    textAlign: 'left',
                  }}
                >
                  <RealisticCardFace card={card} />
                </Box>
              );
            })}
          </Box>
        )}

        <Stack gap="md" align="center" mt="xl" pb="lg" style={{ textAlign: 'center' }}>
          {creditsSelected && creditsCents === 0 && (
            <>
              <Title
                order={3}
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: '#0f172a',
                  margin: 0,
                }}
              >
                No credits…yet.
              </Title>
              <Text
                style={{
                  color: '#64748b',
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
                color: '#64748b',
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
              backgroundColor: '#ff5f1f',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: 16,
              padding: '12px 24px',
              borderRadius: 12,
              marginTop: 8,
              boxShadow: '0 8px 20px rgba(255, 95, 31, 0.28)',
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
            style={{ color: '#475569', fontWeight: 500 }}
          >
            Linked cards
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}

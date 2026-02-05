import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Text, Title, Button, Group, Stack, ActionIcon, Badge, Modal, ScrollArea } from '@mantine/core';
import { IconArrowLeft, IconTruck, IconPercentage, IconShoppingBag, IconGift, IconHome, IconSearch, IconUser, IconX } from '@tabler/icons-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCart } from '@/contexts/CartContext';
import cravemoreIcon from '@/assets/cravemore-icon.png';
import { analytics } from '@/utils/cravemoreAnalytics';
import { Capacitor } from '@capacitor/core';
import { useCraveMoreOffer, CraveMorePlan } from '@/hooks/useCraveMoreOffer';

const CraveMoreSubscription: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<CraveMorePlan | null>(null);
  const { offer, loading: plansLoading } = useCraveMoreOffer();

  // Set initial selected plan to most popular when plans load
  useEffect(() => {
    if (offer?.plans && offer.plans.length > 0 && !selectedPlan) {
      const mostPopular = offer.plans.find(p => p.isMostPopular);
      if (mostPopular) {
        setSelectedPlan(mostPopular);
      } else {
        // Default to first plan if no most popular
        setSelectedPlan(offer.plans[0]);
      }
    }
  }, [offer?.plans, selectedPlan]);

  const handleStartTrial = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to start your free trial');
        navigate('/auth?redirect=/crave-more-subscription');
        setLoading(false);
        return;
      }

      // Check if user already has an active membership
      if (offer?.currentMembership?.status === 'active') {
        toast.info('You already have an active CraveMore membership');
        navigate('/account/cravemore');
        setLoading(false);
        return;
      }

      // Use the user-selected plan, or default to monthly/most popular
      const availablePlans = offer?.plans || [];
      if (availablePlans.length === 0) {
        toast.error('No subscription plans available. Please try again later.');
        setLoading(false);
        return;
      }

      // Use selected plan, or default to monthly/most popular
      let planToUse = selectedPlan;
      if (!planToUse) {
        planToUse = availablePlans.find(p => p.planKey === 'monthly');
        if (!planToUse) {
          planToUse = availablePlans.find(p => p.isMostPopular) || availablePlans[0];
        }
      }

      // Detect device type for payment method preference
      const isNative = Capacitor.isNativePlatform();
      const platform = Capacitor.getPlatform();
      const isIOS = platform === 'ios' || /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = platform === 'android' || /Android/i.test(navigator.userAgent);
      
      // Determine preferred payment method
      let preferredPaymentMethod: 'apple_pay' | 'google_pay' | null = null;
      if (isNative || isIOS) {
        preferredPaymentMethod = 'apple_pay';
      } else if (isAndroid) {
        preferredPaymentMethod = 'google_pay';
      }

      // Track analytics
      analytics.planSelected(planToUse.planKey);
      analytics.checkoutStarted(planToUse.planKey);

      // Create checkout session with trial and preferred payment method
      const { data, error } = await supabase.functions.invoke('create-cravemore-checkout', {
        body: { 
          planKey: planToUse.planKey,
          startTrial: true, // Indicate this is a trial signup
          preferredPaymentMethod: preferredPaymentMethod // Pass preferred payment method
        },
      });

      if (error) {
        console.error('Checkout error:', error);
        
        // Handle specific errors
        let errorMsg = error.message || '';
        if (error.data) {
          if (typeof error.data === 'object') {
            errorMsg = error.data.error || error.data.message || errorMsg;
          }
        }

        if (errorMsg.includes('Unauthorized') || errorMsg.includes('401')) {
          toast.error('Please sign in to continue');
          navigate('/auth?redirect=/crave-more-subscription');
        } else if (errorMsg.includes('trial') || errorMsg.includes('already used')) {
          toast.error('You have already used your free trial. Please select a paid plan.');
          navigate('/crave-more');
        } else if (errorMsg.includes('Failed to send') || errorMsg.includes('CORS')) {
          toast.error('Checkout service is not available. Please try again later.', {
            duration: 8000,
          });
        } else {
          toast.error(errorMsg || 'Failed to start trial. Please try again.', {
            duration: 5000,
          });
        }
        setLoading(false);
        return;
      }

      if (data?.url) {
        // Redirect to checkout URL
        window.location.href = data.url;
      } else {
        // If no URL, navigate to success page
        navigate('/cravemore/success');
      }
    } catch (error: any) {
      console.error('Error starting trial:', error);
      toast.error('Failed to start trial. Please try again.');
      setLoading(false);
    }
  };

  const { cartCount } = useCart();

  return (
    <Box
      style={{
        minHeight: '100vh',
        backgroundColor: 'white',
        paddingBottom: cartCount > 0 
          ? 'calc(180px + env(safe-area-inset-bottom, 0px))' 
          : 'calc(100px + env(safe-area-inset-bottom, 0px))'
      }}
    >
      {/* Header - Fixed at Top matching Chat Header Structure */}
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
          flexShrink: 0
        }}
      >
        <Button
          variant="subtle"
          onClick={() => navigate('/account')}
          style={{ padding: '8px', minWidth: 'auto' }}
        >
          <IconArrowLeft size={20} color="#111827" />
        </Button>
        <Group gap="xs" style={{ flex: 1, justifyContent: 'center' }}>
          <img
            src={cravemoreIcon}
            alt="CraveMore"
            style={{
              width: '32px',
              height: '32px',
              objectFit: 'contain'
            }}
          />
          <Title order={4} style={{ color: '#111827', fontWeight: 600 }}>
            CraveMore
          </Title>
        </Group>
        <Box style={{ width: '36px' }} /> {/* Spacer for centering */}
      </Group>

      {/* Main Content */}
      <Stack gap="lg" p="md" style={{ maxWidth: '600px', margin: '0 auto', paddingTop: 'calc(80px + env(safe-area-inset-top, 0px))' }}>
        {/* Main Headline */}
        <Title
          order={2}
          style={{
            fontSize: isMobile ? '28px' : '32px',
            fontWeight: 700,
            color: '#111827',
            lineHeight: 1.2,
            marginTop: '8px',
            paddingTop: '65px'
          }}
        >
          Get $0 delivery fees plus exclusive benefits
        </Title>

        {/* Benefits Section */}
        <Stack gap="md" mt="xl">
          {/* Benefit 1: $0 delivery fees */}
          <Group gap="md" align="flex-start">
            <Box
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #ea580c 0%, #dc2626 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <IconTruck size={24} color="white" />
            </Box>
            <Stack gap={4} style={{ flex: 1 }}>
              <Text style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                $0 delivery fees
              </Text>
              <Text style={{ fontSize: '14px', color: '#6B7280', lineHeight: 1.5 }}>
                And lower service fees. On eligible orders.
              </Text>
            </Stack>
          </Group>

          {/* Benefit 2: Member-exclusive deals */}
          <Group gap="md" align="flex-start">
            <Box
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #ea580c 0%, #dc2626 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <IconPercentage size={24} color="white" />
            </Box>
            <Stack gap={4} style={{ flex: 1 }}>
              <Text style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                Member-exclusive deals
              </Text>
              <Text style={{ fontSize: '14px', color: '#6B7280', lineHeight: 1.5 }}>
                Save on restaurants, groceries, and more
              </Text>
            </Stack>
          </Group>

          {/* Benefit 3: 5% back on pickup orders */}
          <Group gap="md" align="flex-start">
            <Box
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <IconShoppingBag size={24} color="white" />
            </Box>
            <Stack gap={4} style={{ flex: 1 }}>
              <Text style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                5% back on eligible pickup orders
              </Text>
              <Text style={{ fontSize: '14px', color: '#6B7280', lineHeight: 1.5 }}>
                Earn 5% CraveMore credits on eligible orders
              </Text>
            </Stack>
          </Group>

          {/* Benefit 4: Priority support */}
          <Group gap="md" align="flex-start">
            <Box
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <IconGift size={24} color="white" />
            </Box>
            <Stack gap={4} style={{ flex: 1 }}>
              <Text style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                Priority customer support
              </Text>
              <Text style={{ fontSize: '14px', color: '#6B7280', lineHeight: 1.5 }}>
                Faster response times and dedicated support
              </Text>
            </Stack>
          </Group>
        </Stack>

        {/* Choose a plan Section */}
        <Box mt="xl">
          <Text style={{ fontSize: '16px', fontWeight: 600, color: '#111827', marginBottom: '12px' }}>
            Choose a plan
          </Text>

          {plansLoading && (
            <Text style={{ fontSize: '14px', color: '#6B7280' }}>Loading CraveMore plans...</Text>
          )}

          {!plansLoading && offer?.plans && offer.plans.length > 0 && (
            <Stack gap="sm">
              {offer.plans.map((plan: CraveMorePlan) => {
                const price = (plan.priceCents / 100).toFixed(2);
                let cadenceLabel = '';
                if (plan.planKey === 'monthly') cadenceLabel = 'per month';
                else if (plan.planKey === 'annual') cadenceLabel = 'per year';
                else cadenceLabel = 'one-time';

                const isSelected = selectedPlan?.id === plan.id;
                const isHighlighted = plan.isMostPopular || isSelected;

                return (
                  <Box
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: isHighlighted ? '2px solid #dc2626' : '1px solid #e5e7eb',
                      backgroundColor: isHighlighted ? '#fef2f2' : '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                      boxShadow: isSelected ? '0 2px 8px rgba(220, 38, 38, 0.15)' : 'none'
                    }}
                  >
                    <Stack gap={2} style={{ flex: 1 }}>
                      <Text style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                        {plan.displayName}
                      </Text>
                      <Text style={{ fontSize: '12px', color: '#6B7280' }}>
                        {plan.planKey === 'lifetime'
                          ? 'Lifetime CraveMore access'
                          : `CraveMore subscription (${plan.planKey})`}
                      </Text>
                    </Stack>
                    <Stack gap={2} style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>
                        ${price}
                      </Text>
                      <Text style={{ fontSize: '12px', color: '#6B7280' }}>{cadenceLabel}</Text>
                      {plan.isMostPopular && (
                        <Badge
                          size="xs"
                          radius="xl"
                          color="red"
                          style={{ marginTop: '4px' }}
                        >
                          {plan.badgeText || 'MOST POPULAR'}
                        </Badge>
                      )}
                      {isSelected && !plan.isMostPopular && (
                        <Badge
                          size="xs"
                          radius="xl"
                          color="red"
                          style={{ marginTop: '4px' }}
                        >
                          Selected
                        </Badge>
                      )}
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          )}

          {!plansLoading && (!offer || !offer.plans || offer.plans.length === 0) && (
            <Box
              style={{
                padding: '16px',
                borderRadius: '8px',
                border: '2px solid #dc2626',
                backgroundColor: '#fef2f2'
              }}
            >
              <Text style={{ fontSize: '14px', fontWeight: 600, color: '#dc2626' }}>
                Best Value
              </Text>
              <Text style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                CraveMore plans are temporarily unavailable. Please try again shortly.
              </Text>
            </Box>
          )}
        </Box>

        {/* Terms and Conditions */}
        <Box mt="md">
          <Text
            style={{
              fontSize: '12px',
              color: '#6B7280',
              lineHeight: 1.6
            }}
          >
            By tapping Start 30-day free trial, I agree to the{' '}
            <Text
              component="span"
              style={{
                color: '#2563eb',
                fontWeight: 600,
                textDecoration: 'underline',
                cursor: 'pointer'
              }}
              onClick={() => navigate('/legal/cravemore')}
            >
              CraveMore Subscription Terms
            </Text>
            {' '}and after my free trial, to an automatic recurring charge of $9.99/month + tax (or the then-current price), charged to a saved payment method until I cancel.{' '}
            <Text
              component="span"
              style={{
                color: '#2563eb',
                fontWeight: 600,
                textDecoration: 'underline',
                cursor: 'pointer'
              }}
              onClick={() => navigate('/account/cravemore')}
            >
              Cancel
            </Text>
            {' '}in Settings prior to any renewal to avoid future charges.
          </Text>
          <Text
            style={{
              marginTop: '8px',
              fontSize: '11px',
              color: '#6B7280',
              lineHeight: 1.5
            }}
          >
            30‑day free trial, then <strong>$9.99/month</strong>, auto‑renews until canceled. Cancel anytime in
            Account → CraveMore. No refunds for partial billing periods.
          </Text>
        </Box>

        {/* Terms and Conditions Modal */}
        <Modal
          opened={termsModalOpen}
          onClose={() => setTermsModalOpen(false)}
          title={
            <Title order={3} style={{ fontSize: '20px', fontWeight: 700 }}>
              CRAVEMORE™ SUBSCRIPTION TERMS
            </Title>
          }
          size="lg"
          centered
          styles={{
            body: { padding: '24px' },
            header: { padding: '20px 24px', borderBottom: '1px solid #e5e7eb' },
            close: { color: '#6B7280' }
          }}
        >
          <ScrollArea h={500}>
            <Stack gap="md">
              <Text style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>
                <strong>United States</strong>
                <br />
                <strong>Effective Date:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </Text>

              <Text style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827' }}>
                These CraveMore Subscription Terms ("CraveMore Terms") describe the rules that apply to your participation in <strong>CraveMore</strong>, the subscription program offered by <strong>Crave'n, Inc.</strong> ("Crave'n," "we," "us," or "our").
              </Text>

              <Text style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827' }}>
                CraveMore is part of the Crave'n platform and is governed by the Crave'n Consumer Terms and Conditions ("Consumer Terms"). These CraveMore Terms apply <strong>only</strong> to CraveMore. If there is a conflict, these CraveMore Terms control for subscription-related matters.
              </Text>

              <Title order={4} style={{ fontSize: '16px', fontWeight: 700, marginTop: '16px', marginBottom: '8px' }}>
                1. What CraveMore Is (and Is Not)
              </Title>
              <Text style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827' }}>
                CraveMore is an optional subscription that provides eligible customers with <strong>pricing and fee advantages</strong> on qualifying orders placed through the Crave'n platform.
              </Text>
              <Text style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827' }}>
                CraveMore:
              </Text>
              <Box component="ul" style={{ paddingLeft: '20px', marginTop: '8px' }}>
                <li style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827', marginBottom: '4px' }}>
                  Does <strong>not</strong> guarantee delivery times
                </li>
                <li style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827', marginBottom: '4px' }}>
                  Does <strong>not</strong> guarantee merchant participation
                </li>
                <li style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827', marginBottom: '4px' }}>
                  Does <strong>not</strong> make Crave'n a restaurant, merchant, or delivery provider
                </li>
              </Box>
              <Text style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827' }}>
                Crave'n operates a technology platform that connects customers, independent merchants, and independent delivery providers.
              </Text>

              <Title order={4} style={{ fontSize: '16px', fontWeight: 700, marginTop: '16px', marginBottom: '8px' }}>
                2. Who Can Subscribe
              </Title>
              <Text style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827' }}>
                You may enroll in CraveMore if:
              </Text>
              <Box component="ul" style={{ paddingLeft: '20px', marginTop: '8px' }}>
                <li style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827', marginBottom: '4px' }}>
                  You are at least 18 years old
                </li>
                <li style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827', marginBottom: '4px' }}>
                  You have an active Crave'n account in good standing
                </li>
                <li style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827', marginBottom: '4px' }}>
                  You have a valid payment method on file
                </li>
                <li style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827', marginBottom: '4px' }}>
                  You reside in the United States
                </li>
              </Box>
              <Text style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827' }}>
                Crave'n may limit or deny access based on location, account history, or operational capacity.
              </Text>

              <Title order={4} style={{ fontSize: '16px', fontWeight: 700, marginTop: '16px', marginBottom: '8px' }}>
                3. Subscription Plans
              </Title>
              <Text style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827' }}>
                CraveMore may be offered as:
              </Text>
              <Box component="ul" style={{ paddingLeft: '20px', marginTop: '8px' }}>
                <li style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827', marginBottom: '4px' }}>
                  A monthly subscription
                </li>
                <li style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827', marginBottom: '4px' }}>
                  A yearly subscription
                </li>
                <li style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827', marginBottom: '4px' }}>
                  A limited-time trial or promotional plan
                </li>
              </Box>
              <Text style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827' }}>
                Current pricing, billing frequency, and benefits are disclosed at signup and in your account.
              </Text>

              <Title order={4} style={{ fontSize: '16px', fontWeight: 700, marginTop: '16px', marginBottom: '8px' }}>
                4. CraveMore Benefits
              </Title>
              <Text style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827' }}>
                CraveMore benefits ("Benefits") may include:
              </Text>
              <Box component="ul" style={{ paddingLeft: '20px', marginTop: '8px' }}>
                <li style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827', marginBottom: '4px' }}>
                  Lower delivery fees
                </li>
                <li style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827', marginBottom: '4px' }}>
                  Lower service or platform fees
                </li>
                <li style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827', marginBottom: '4px' }}>
                  Access to member-only offers or promotions
                </li>
              </Box>
              <Text style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827' }}>
                Benefits apply only to:
              </Text>
              <Box component="ul" style={{ paddingLeft: '20px', marginTop: '8px' }}>
                <li style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827', marginBottom: '4px' }}>
                  Participating merchants
                </li>
                <li style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827', marginBottom: '4px' }}>
                  Orders that meet minimum order requirements shown at checkout
                </li>
                <li style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827', marginBottom: '4px' }}>
                  Eligible order types
                </li>
              </Box>
              <Text style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827' }}>
                Taxes, tips, regulatory fees, and certain surcharges are not discounted unless explicitly stated.
              </Text>
              <Text style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827' }}>
                Merchant participation may change at any time.
              </Text>

              <Title order={4} style={{ fontSize: '16px', fontWeight: 700, marginTop: '16px', marginBottom: '8px' }}>
                5. Automatic Renewal and Billing
              </Title>
              <Text style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827', fontWeight: 600 }}>
                CraveMore subscriptions renew automatically unless canceled.
              </Text>
              <Text style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827' }}>
                By subscribing, you authorize Crave'n to charge your payment method:
              </Text>
              <Box component="ul" style={{ paddingLeft: '20px', marginTop: '8px' }}>
                <li style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827', marginBottom: '4px' }}>
                  At the beginning of each subscription period
                </li>
                <li style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827', marginBottom: '4px' }}>
                  On a recurring basis
                </li>
                <li style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827', marginBottom: '4px' }}>
                  At the then-current subscription price plus applicable taxes
                </li>
              </Box>
              <Text style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827' }}>
                If a payment fails, we may retry using any payment method associated with your account. Failure to collect payment may result in loss of Benefits or cancellation.
              </Text>

              <Title order={4} style={{ fontSize: '16px', fontWeight: 700, marginTop: '16px', marginBottom: '8px' }}>
                6. Trials and Promotional Access
              </Title>
              <Text style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827' }}>
                Crave'n may offer free or discounted CraveMore trials.
              </Text>
              <Text style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827' }}>
                Unless otherwise stated:
              </Text>
              <Box component="ul" style={{ paddingLeft: '20px', marginTop: '8px' }}>
                <li style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827', marginBottom: '4px' }}>
                  Trials are available only to first-time subscribers
                </li>
                <li style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827', marginBottom: '4px' }}>
                  One trial per person or household
                </li>
                <li style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827', marginBottom: '4px' }}>
                  Trials automatically convert to paid subscriptions at the end of the trial period
                </li>
              </Box>
              <Text style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827' }}>
                You will not be charged if you cancel before the trial ends.
              </Text>
              <Text style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827' }}>
                If your CraveMore access is terminated for misuse or violation of the Consumer Terms, you are not eligible for future trials.
              </Text>

              <Title order={4} style={{ fontSize: '16px', fontWeight: 700, marginTop: '16px', marginBottom: '8px' }}>
                7. Cancellation
              </Title>
              <Text style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827' }}>
                You may cancel CraveMore at any time through your account settings.
              </Text>
              <Text style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827' }}>
                When you cancel:
              </Text>
              <Box component="ul" style={{ paddingLeft: '20px', marginTop: '8px' }}>
                <li style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827', marginBottom: '4px' }}>
                  You will not be charged again
                </li>
                <li style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827', marginBottom: '4px' }}>
                  Your Benefits continue until the end of the current billing period
                </li>
                <li style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827', marginBottom: '4px' }}>
                  Subscription fees already paid are not refunded
                </li>
              </Box>
              <Text style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827' }}>
                To avoid renewal charges, you must cancel before your next billing date.
              </Text>

              <Title order={4} style={{ fontSize: '16px', fontWeight: 700, marginTop: '16px', marginBottom: '8px' }}>
                8. Refund Policy
              </Title>
              <Text style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827' }}>
                Except where required by law:
              </Text>
              <Box component="ul" style={{ paddingLeft: '20px', marginTop: '8px' }}>
                <li style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827', marginBottom: '4px' }}>
                  CraveMore subscription fees are <strong>non-refundable</strong>
                </li>
                <li style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827', marginBottom: '4px' }}>
                  Partial periods are not prorated
                </li>
              </Box>
              <Text style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827' }}>
                Crave'n may issue refunds or credits at its discretion, but is not obligated to do so.
              </Text>

              <Title order={4} style={{ fontSize: '16px', fontWeight: 700, marginTop: '16px', marginBottom: '8px' }}>
                9. Changes to CraveMore
              </Title>
              <Text style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827' }}>
                Crave'n may update CraveMore by:
              </Text>
              <Box component="ul" style={{ paddingLeft: '20px', marginTop: '8px' }}>
                <li style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827', marginBottom: '4px' }}>
                  Adjusting pricing
                </li>
                <li style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827', marginBottom: '4px' }}>
                  Modifying Benefits
                </li>
                <li style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827', marginBottom: '4px' }}>
                  Adding or removing participating merchants
                </li>
                <li style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827', marginBottom: '4px' }}>
                  Discontinuing the program
                </li>
              </Box>
              <Text style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827' }}>
                If pricing changes, you will receive notice and an opportunity to cancel before renewal.
              </Text>
              <Text style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827' }}>
                Continued use after changes take effect means you accept the updated terms.
              </Text>

              <Title order={4} style={{ fontSize: '16px', fontWeight: 700, marginTop: '16px', marginBottom: '8px' }}>
                10. No Transfer or Sharing
              </Title>
              <Text style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827' }}>
                CraveMore subscriptions:
              </Text>
              <Box component="ul" style={{ paddingLeft: '20px', marginTop: '8px' }}>
                <li style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827', marginBottom: '4px' }}>
                  Are tied to your Crave'n account
                </li>
                <li style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827', marginBottom: '4px' }}>
                  May not be shared, transferred, or resold
                </li>
              </Box>

              <Title order={4} style={{ fontSize: '16px', fontWeight: 700, marginTop: '16px', marginBottom: '8px' }}>
                11. Suspension or Termination
              </Title>
              <Text style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827' }}>
                Crave'n may suspend or cancel CraveMore if:
              </Text>
              <Box component="ul" style={{ paddingLeft: '20px', marginTop: '8px' }}>
                <li style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827', marginBottom: '4px' }}>
                  Your account violates the Consumer Terms
                </li>
                <li style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827', marginBottom: '4px' }}>
                  Fraud, abuse, or misuse is suspected
                </li>
                <li style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827', marginBottom: '4px' }}>
                  Payment cannot be collected
                </li>
                <li style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827', marginBottom: '4px' }}>
                  Required by law or operational necessity
                </li>
              </Box>
              <Text style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827' }}>
                If Crave'n cancels your subscription for reasons unrelated to misconduct, we may provide a prorated refund for unused prepaid time.
              </Text>

              <Title order={4} style={{ fontSize: '16px', fontWeight: 700, marginTop: '16px', marginBottom: '8px' }}>
                12. No Guaranteed Savings
              </Title>
              <Text style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827' }}>
                CraveMore does not guarantee savings on every order. Savings depend on order size, merchant participation, fees, and location.
              </Text>

              <Title order={4} style={{ fontSize: '16px', fontWeight: 700, marginTop: '16px', marginBottom: '8px' }}>
                13. Governing Law and Disputes
              </Title>
              <Text style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827' }}>
                These CraveMore Terms are governed by Delaware law and are subject to the dispute resolution provisions in the Consumer Terms, including arbitration where applicable.
              </Text>

              <Title order={4} style={{ fontSize: '16px', fontWeight: 700, marginTop: '16px', marginBottom: '8px' }}>
                14. Contact
              </Title>
              <Text style={{ fontSize: '14px', lineHeight: 1.7, color: '#111827' }}>
                Questions about CraveMore can be directed to Crave'n Support through the app or website.
              </Text>
            </Stack>
          </ScrollArea>
          <Group justify="flex-end" mt="md" pt="md" style={{ borderTop: '1px solid #e5e7eb' }}>
            <Button onClick={() => setTermsModalOpen(false)}>
              Close
            </Button>
          </Group>
        </Modal>

        {/* Call to Action Button */}
        <Button
          size="lg"
          fullWidth
          onClick={handleStartTrial}
          loading={loading}
          disabled={!selectedPlan || loading || plansLoading}
          style={{
            marginTop: '24px',
            height: '56px',
            fontSize: '16px',
            fontWeight: 600,
            background: 'linear-gradient(135deg, #ea580c 0%, #dc2626 100%)',
            border: 'none',
            borderRadius: '8px'
          }}
        >
          Start 30-day free trial
        </Button>

        {/* Spacer to ensure content scrolls above bottom navigation */}
        <Box style={{ height: '120px' }} />
      </Stack>

    </Box>
  );
}

export default CraveMoreSubscription;

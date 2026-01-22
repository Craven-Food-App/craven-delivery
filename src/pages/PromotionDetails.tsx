import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Box,
  Text,
  Title,
  Group,
  Stack,
  Card,
  ThemeIcon,
  Image as MantineImage,
  Divider,
} from '@mantine/core';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';

const PromotionDetails: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const [promoImage, setPromoImage] = useState<string>('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [showStickyCTA, setShowStickyCTA] = useState(false);

  // Fetch promotional banner image
  useEffect(() => {
    const fetchPromoImage = async () => {
      try {
        const { data, error } = await supabase
          .from('promotional_banners')
          .select('image_url')
          .eq('is_active', true)
          .order('display_order', { ascending: true })
          .limit(1)
          .single();

        if (!error && data?.image_url) {
          setPromoImage(data.image_url);
        }
      } catch (error) {
        console.error('Error fetching promo image:', error);
      }
    };

    fetchPromoImage();
  }, []);

  // Handle scroll for sticky CTA
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setShowStickyCTA(scrollPosition > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const faqItems = [
    {
      question: 'Do I need a promo code?',
      answer: 'No. Your credit applies automatically when you order.',
    },
    {
      question: 'Can I use all $20 at once?',
      answer: 'No. Credit unlocks over your first three orders.',
    },
    {
      question: 'What if I cancel an order?',
      answer: 'Credit applies only to completed orders.',
    },
    {
      question: 'Can I combine this with other offers?',
      answer: 'Some offers may not stack.',
    },
  ];

  return (
    <Box style={{ minHeight: '100vh', backgroundColor: 'white', paddingBottom: '80px' }}>
      {/* Header */}
      <Box
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: 'white',
          borderBottom: '1px solid #e5e7eb',
          padding: isMobile ? '12px 16px' : '16px 24px',
        }}
      >
        <Group gap="md" align="center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            style={{ width: '40px', height: '40px' }}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Title order={2} fw={700} c="#171717" style={{ fontSize: isMobile ? '20px' : '24px' }}>
            Promotion Details
          </Title>
        </Group>
      </Box>

      {/* 1. Hero Section */}
      <Box style={{ position: 'relative', width: '100%' }}>
        {promoImage && (
          <MantineImage
            src={promoImage}
            alt="Crave'n Credit Promotion"
            style={{ width: '100%', height: isMobile ? '250px' : '350px', objectFit: 'cover' }}
          />
        )}
        {!promoImage && (
          <Box
            style={{
              width: '100%',
              height: isMobile ? '250px' : '350px',
              background: 'linear-gradient(135deg, #ff6b35 0%, #ea580c 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Stack gap="sm" align="center" style={{ textAlign: 'center', padding: '20px' }}>
              <Title
                order={1}
                c="white"
                fw={900}
                style={{ fontSize: isMobile ? '32px' : '48px', lineHeight: 1.2 }}
              >
                $20 in Crave'n Credit
              </Title>
              <Text size="lg" c="white" fw={500} style={{ opacity: 0.95 }}>
                Unlock it over your first 3 orders
              </Text>
            </Stack>
          </Box>
        )}
      </Box>

      {/* Content */}
      <Box style={{ padding: isMobile ? '24px 16px' : '32px 24px', maxWidth: '800px', margin: '0 auto' }}>
        <Stack gap="xl">
          {/* 2. What This Means */}
          <Box>
            <Title order={2} fw={700} c="#171717" mb="md" style={{ fontSize: isMobile ? '22px' : '28px' }}>
              How it works
            </Title>
            <Text size="md" c="#171717" style={{ lineHeight: 1.7, fontSize: isMobile ? '15px' : '16px' }}>
              New to Crave'n? We've got you.
              <br />
              <br />
              You'll unlock $20 in Crave'n credit as you place your first three orders.
              <br />
              <br />
              The credit applies automatically — no codes, no hassle.
            </Text>
          </Box>

          <Divider />

          {/* 3. Step Breakdown */}
          <Box>
            <Title order={2} fw={700} c="#171717" mb="lg" style={{ fontSize: isMobile ? '22px' : '28px' }}>
              Your credit breakdown
            </Title>
            <Stack gap="md">
              {/* Order 1 */}
              <Card
                p="lg"
                radius="md"
                withBorder
                style={{
                  borderColor: '#ff6b35',
                  borderWidth: '2px',
                  backgroundColor: 'white',
                }}
              >
                <Group gap="md" align="flex-start" wrap="nowrap">
                  <ThemeIcon
                    size={48}
                    radius="xl"
                    style={{
                      background: 'linear-gradient(135deg, #ff6b35, #ea580c)',
                      color: 'white',
                      fontWeight: 900,
                      fontSize: '20px',
                      flexShrink: 0,
                    }}
                  >
                    1
                  </ThemeIcon>
                  <Box style={{ flex: 1 }}>
                    <Text fw={700} size="lg" c="#171717" mb="xs">
                      Order #1
                    </Text>
                    <Text size="md" c="#737373" style={{ lineHeight: 1.6 }}>
                      Get $8 in credit on your first order.
                    </Text>
                  </Box>
                </Group>
              </Card>

              {/* Order 2 */}
              <Card
                p="lg"
                radius="md"
                withBorder
                style={{
                  borderColor: '#e5e7eb',
                  backgroundColor: 'white',
                }}
              >
                <Group gap="md" align="flex-start" wrap="nowrap">
                  <ThemeIcon
                    size={48}
                    radius="xl"
                    variant="light"
                    color="gray"
                    style={{
                      fontWeight: 900,
                      fontSize: '20px',
                      flexShrink: 0,
                    }}
                  >
                    2
                  </ThemeIcon>
                  <Box style={{ flex: 1 }}>
                    <Text fw={700} size="lg" c="#171717" mb="xs">
                      Order #2
                    </Text>
                    <Text size="md" c="#737373" style={{ lineHeight: 1.6 }}>
                      Get $7 in credit when you place your second order.
                    </Text>
                  </Box>
                </Group>
              </Card>

              {/* Order 3 */}
              <Card
                p="lg"
                radius="md"
                withBorder
                style={{
                  borderColor: '#e5e7eb',
                  backgroundColor: 'white',
                }}
              >
                <Group gap="md" align="flex-start" wrap="nowrap">
                  <ThemeIcon
                    size={48}
                    radius="xl"
                    variant="light"
                    color="gray"
                    style={{
                      fontWeight: 900,
                      fontSize: '20px',
                      flexShrink: 0,
                    }}
                  >
                    3
                  </ThemeIcon>
                  <Box style={{ flex: 1 }}>
                    <Text fw={700} size="lg" c="#171717" mb="xs">
                      Order #3
                    </Text>
                    <Text size="md" c="#737373" style={{ lineHeight: 1.6 }}>
                      Get $5 in credit on your third order.
                    </Text>
                  </Box>
                </Group>
              </Card>
            </Stack>

            <Text
              size="sm"
              c="#737373"
              mt="md"
              style={{ lineHeight: 1.6, fontStyle: 'italic' }}
            >
              Credit unlocks one order at a time and applies automatically at checkout.
            </Text>
          </Box>

          <Divider />

          {/* 4. Where the Credit Applies */}
          <Box>
            <Title order={2} fw={700} c="#171717" mb="md" style={{ fontSize: isMobile ? '22px' : '28px' }}>
              Where your credit is used
            </Title>
            <Stack gap="sm">
              <Group gap="sm" align="flex-start">
                <ThemeIcon size={24} radius="xl" color="green" variant="light">
                  <Check size={14} />
                </ThemeIcon>
                <Text size="md" c="#171717" style={{ lineHeight: 1.6 }}>
                  Delivery fees
                </Text>
              </Group>
              <Group gap="sm" align="flex-start">
                <ThemeIcon size={24} radius="xl" color="green" variant="light">
                  <Check size={14} />
                </ThemeIcon>
                <Text size="md" c="#171717" style={{ lineHeight: 1.6 }}>
                  Service fees
                </Text>
              </Group>
              <Group gap="sm" align="flex-start">
                <ThemeIcon size={24} radius="xl" color="red" variant="light">
                  <X size={14} />
                </ThemeIcon>
                <Text size="md" c="#737373" style={{ lineHeight: 1.6 }}>
                  Food prices
                </Text>
              </Group>
              <Group gap="sm" align="flex-start">
                <ThemeIcon size={24} radius="xl" color="red" variant="light">
                  <X size={14} />
                </ThemeIcon>
                <Text size="md" c="#737373" style={{ lineHeight: 1.6 }}>
                  Taxes or tips
                </Text>
              </Group>
            </Stack>
            <Text
              size="sm"
              c="#737373"
              mt="md"
              style={{ lineHeight: 1.6 }}
            >
              Restaurants and drivers are always paid in full.
            </Text>
          </Box>

          <Divider />

          {/* 5. Requirements */}
          <Box>
            <Title order={2} fw={700} c="#171717" mb="md" style={{ fontSize: isMobile ? '22px' : '28px' }}>
              What you need to know
            </Title>
            <Stack gap="xs">
              <Group gap="sm" align="flex-start">
                <Text size="md" c="#171717" style={{ lineHeight: 1.6 }}>
                  • New customers only
                </Text>
              </Group>
              <Group gap="sm" align="flex-start">
                <Text size="md" c="#171717" style={{ lineHeight: 1.6 }}>
                  • $15 minimum food order
                </Text>
              </Group>
              <Group gap="sm" align="flex-start">
                <Text size="md" c="#171717" style={{ lineHeight: 1.6 }}>
                  • One credit per order
                </Text>
              </Group>
              <Group gap="sm" align="flex-start">
                <Text size="md" c="#171717" style={{ lineHeight: 1.6 }}>
                  • Credits unlock in order and don't stack
                </Text>
              </Group>
              <Group gap="sm" align="flex-start">
                <Text size="md" c="#171717" style={{ lineHeight: 1.6 }}>
                  • Offer expires if unused
                </Text>
              </Group>
            </Stack>
          </Box>

          <Divider />

          {/* 7. FAQ */}
          <Box>
            <Title order={2} fw={700} c="#171717" mb="md" style={{ fontSize: isMobile ? '22px' : '28px' }}>
              Common questions
            </Title>
            <Stack gap="sm">
              {faqItems.map((item, index) => (
                <Card
                  key={index}
                  p="md"
                  radius="md"
                  withBorder
                  style={{
                    backgroundColor: 'white',
                    cursor: 'pointer',
                  }}
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                >
                  <Group justify="space-between" align="flex-start">
                    <Text fw={600} size="md" c="#171717" style={{ flex: 1, lineHeight: 1.5 }}>
                      {item.question}
                    </Text>
                    {expandedFaq === index ? (
                      <ChevronUp size={20} style={{ color: '#737373', flexShrink: 0 }} />
                    ) : (
                      <ChevronDown size={20} style={{ color: '#737373', flexShrink: 0 }} />
                    )}
                  </Group>
                  {expandedFaq === index && (
                    <Text size="sm" c="#737373" mt="sm" style={{ lineHeight: 1.6 }}>
                      {item.answer}
                    </Text>
                  )}
                </Card>
              ))}
            </Stack>
          </Box>
        </Stack>
      </Box>

      {/* 6. Sticky CTA Button */}
      {showStickyCTA && (
        <Box
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 200,
            backgroundColor: 'white',
            borderTop: '1px solid #e5e7eb',
            padding: isMobile ? '12px 16px' : '16px 24px',
            boxShadow: '0 -4px 12px rgba(0,0,0,0.1)',
          }}
        >
          <Button
            size="lg"
            onClick={() => navigate('/restaurants')}
            style={{
              width: '100%',
              background: 'linear-gradient(to right, #ff6b35, #b91c1c)',
              color: 'white',
              fontWeight: 700,
              padding: '16px',
              fontSize: '16px',
              borderRadius: '12px',
            }}
          >
            Start your first order
          </Button>
        </Box>
      )}

      {/* 6. Primary CTA (at bottom of content) */}
      <Box
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          backgroundColor: 'white',
          borderTop: '1px solid #e5e7eb',
          padding: isMobile ? '12px 16px' : '16px 24px',
          boxShadow: '0 -4px 12px rgba(0,0,0,0.1)',
          display: showStickyCTA ? 'none' : 'block',
        }}
      >
        <Stack gap="sm">
          <Button
            size="lg"
            onClick={() => navigate('/restaurants')}
            style={{
              width: '100%',
              background: 'linear-gradient(to right, #ff6b35, #b91c1c)',
              color: 'white',
              fontWeight: 700,
              padding: '16px',
              fontSize: '16px',
              borderRadius: '12px',
            }}
          >
            Start your first order
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate('/restaurants')}
            style={{
              width: '100%',
              borderColor: '#e5e7eb',
              color: '#171717',
              fontWeight: 600,
              padding: '14px',
              fontSize: '15px',
              borderRadius: '12px',
            }}
          >
            Browse restaurants
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};

export default PromotionDetails;

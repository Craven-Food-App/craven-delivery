import React, { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Card,
  Button,
  TextInput,
  Textarea,
  Select,
  Tabs,
  Badge,
  Stack,
  Group,
  Grid,
  Box,
  ThemeIcon,
  List,
  Paper,
  SimpleGrid,
  Center,
} from '@mantine/core';
import {
  IconBuildingStore,
  IconTruck,
  IconBuilding,
  IconTrendingUp,
  IconUsers,
  IconCurrencyDollar,
  IconClock,
  IconStar,
  IconCheck,
  IconArrowRight,
  IconPhone,
  IconMail,
  IconMapPin,
  IconRocket,
  IconShield,
  IconChartBar,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { supabase } from '@/integrations/supabase/client';

const PartnerWithUs = () => {
  const [selectedTab, setSelectedTab] = useState<string>('restaurant');
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    businessName: '',
    contactName: '',
    email: '',
    phone: '',
    partnershipType: '',
    businessType: '',
    location: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const conversationData = {
        type: 'customer_support' as const,
        status: 'active' as const,
        priority: 'high' as const,
        subject: `Partnership Inquiry - ${formData.partnershipType}`,
        metadata: {
          source: 'partnership_form',
          partnership_type: formData.partnershipType,
          business_name: formData.businessName,
          contact_name: formData.contactName,
          email: formData.email,
          phone: formData.phone,
          business_type: formData.businessType,
          location: formData.location,
        }
      };

      const { data: conversation, error: convError } = await supabase
        .from('chat_conversations')
        .insert(conversationData)
        .select()
        .single();

      if (convError) throw convError;

      const messageContent = `
Partnership Inquiry

Business Name: ${formData.businessName}
Contact Person: ${formData.contactName}
Email: ${formData.email}
Phone: ${formData.phone}
Partnership Type: ${formData.partnershipType}
Business Type: ${formData.businessType}
Location: ${formData.location}

Message:
${formData.message}
      `.trim();

      const messageData = {
        conversation_id: conversation.id,
        sender_type: 'customer' as const,
        content: messageContent,
        message_type: 'text' as const,
      };

      const { error: msgError } = await supabase
        .from('chat_messages')
        .insert(messageData);

      if (msgError) throw msgError;

      notifications.show({
        title: 'Partnership Inquiry Submitted!',
        message: "We've received your partnership request and will contact you within 2 business days.",
        color: 'green',
      });

      setFormData({
        businessName: '',
        contactName: '',
        email: '',
        phone: '',
        partnershipType: '',
        businessType: '',
        location: '',
        message: '',
      });

    } catch (error) {
      console.error('Error submitting partnership form:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to submit partnership inquiry. Please try again or contact us directly.',
        color: 'red',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchMarketingSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('marketing_settings')
          .select('partner_hero_image_url')
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching marketing settings:', error);
          return;
        }
        
        if (data?.partner_hero_image_url) {
          setHeroImageUrl(data.partner_hero_image_url);
        }
      } catch (error: any) {
        console.error('Error fetching marketing settings:', error);
      }
    };

    fetchMarketingSettings();
  }, []);

  return (
    <Box style={{ width: '100%', minHeight: '100vh', margin: 0, padding: 0 }}>
      {/* Header Section - Compact with Hero Image */}
      <Box
        style={{
          width: '100%',
          padding: '60px 0',
          background: heroImageUrl 
            ? `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${heroImageUrl})`
            : 'white',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          borderBottom: heroImageUrl ? 'none' : '1px solid #e9ecef',
        }}
      >
        <Container size="xl" style={{ width: '100%' }}>
          <Stack align="center" gap="xs">
            <Group gap="sm" align="center">
              <ThemeIcon 
                size={40} 
                radius="md" 
                color={heroImageUrl ? "white" : "orange"} 
                variant={heroImageUrl ? "filled" : "light"}
                style={heroImageUrl ? { background: 'rgba(255, 255, 255, 0.2)' } : {}}
              >
                <IconBuilding size={20} stroke={2} />
              </ThemeIcon>
              <Title
                order={1}
                size={28}
                fw={800}
                c={heroImageUrl ? "white" : "dark.9"}
                style={{ 
                  letterSpacing: '-0.5px',
                }}
              >
                Partner With Crave'n
              </Title>
            </Group>
            
            <Text 
              size="sm" 
              c={heroImageUrl ? "white" : "dimmed"} 
              ta="center" 
              maw={700}
              style={heroImageUrl ? { textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' } : {}}
            >
              Join our growing network of restaurants, drivers, and businesses.
              Together, we're revolutionizing food delivery and creating opportunities for everyone.
            </Text>
          </Stack>
        </Container>
      </Box>

      {/* Partnership Types Section - Full Page */}
      <Box 
        id="partnership-types"
        style={{ 
          width: '100%', 
          minHeight: '100vh',
          padding: '40px 0',
          background: 'white',
        }}
      >
        <Container size="xl" style={{ width: '100%' }}>
          <Stack gap="xl">
            <Stack align="center" gap="xs">
              <Title order={2} size={28} fw={800} ta="center" c="dark.9">
                Choose Your Partnership Path
              </Title>
              <Text size="sm" c="dimmed" ta="center" maw={600}>
                Select the partnership type that best fits your business needs
              </Text>
            </Stack>

            <Tabs value={selectedTab} onChange={(value) => setSelectedTab(value || 'restaurant')}>
              <Tabs.List 
                grow 
                style={{ 
                  marginBottom: 32,
                }}
              >
                <Tabs.Tab 
                  value="restaurant" 
                  leftSection={<IconBuildingStore size={18} />}
                >
                  Restaurants
                </Tabs.Tab>
                <Tabs.Tab 
                  value="driver" 
                  leftSection={<IconTruck size={18} />}
                >
                  Drivers
                </Tabs.Tab>
                <Tabs.Tab 
                  value="enterprise" 
                  leftSection={<IconBuilding size={18} />}
                >
                  Enterprise
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="restaurant">
                <Stack gap="xl">
                  <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
                    <Card shadow="sm" padding="md" radius="md" h="100%">
                      <Stack gap="sm">
                        <ThemeIcon size={48} radius="md" color="orange" variant="light">
                          <IconTrendingUp size={24} />
                        </ThemeIcon>
                        <Title order={4} size={18} fw={700}>
                          Increase Sales
                        </Title>
                        <Text c="dimmed" size="xs" style={{ lineHeight: 1.6 }}>
                          Reach new customers and increase order volume with our growing user base
                        </Text>
                      </Stack>
                    </Card>

                    <Card shadow="sm" padding="md" radius="md" h="100%">
                      <Stack gap="sm">
                        <ThemeIcon size={48} radius="md" color="orange" variant="light">
                          <IconUsers size={24} />
                        </ThemeIcon>
                        <Title order={4} size={18} fw={700}>
                          Easy Management
                        </Title>
                        <Text c="dimmed" size="xs" style={{ lineHeight: 1.6 }}>
                          Streamlined dashboard to manage orders, menu, and customer feedback
                        </Text>
                      </Stack>
                    </Card>

                    <Card shadow="sm" padding="md" radius="md" h="100%">
                      <Stack gap="sm">
                        <ThemeIcon size={48} radius="md" color="orange" variant="light">
                          <IconCurrencyDollar size={24} />
                        </ThemeIcon>
                        <Title order={4} size={18} fw={700}>
                          Competitive Rates
                        </Title>
                        <Text c="dimmed" size="xs" style={{ lineHeight: 1.6 }}>
                          Industry-leading commission rates and transparent pricing structure
                        </Text>
                      </Stack>
                    </Card>
                  </SimpleGrid>

                  <Card shadow="sm" padding="md" radius="md">
                    <Stack gap="md">
                      <Title order={4} size={20} fw={700} ta="center">
                        Restaurant Benefits
                      </Title>
                      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                        <List 
                          spacing="xs" 
                          size="xs" 
                          icon={
                            <ThemeIcon size={20} radius="xl" color="green" variant="light">
                              <IconCheck size={12} />
                            </ThemeIcon>
                          }
                        >
                          <List.Item>No setup fees or monthly charges</List.Item>
                          <List.Item>Real-time order management</List.Item>
                          <List.Item>Professional photography support</List.Item>
                          <List.Item>Marketing and promotional tools</List.Item>
                        </List>
                        <List 
                          spacing="xs" 
                          size="xs" 
                          icon={
                            <ThemeIcon size={20} radius="xl" color="green" variant="light">
                              <IconCheck size={12} />
                            </ThemeIcon>
                          }
                        >
                          <List.Item>Analytics and insights dashboard</List.Item>
                          <List.Item>Customer review management</List.Item>
                          <List.Item>Dedicated account manager</List.Item>
                          <List.Item>Fast and reliable payments</List.Item>
                        </List>
                      </SimpleGrid>
                    </Stack>
                  </Card>
                </Stack>
              </Tabs.Panel>

              <Tabs.Panel value="driver">
                <Stack gap="xl">
                  <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
                    <Card shadow="sm" padding="md" radius="md" h="100%">
                      <Stack gap="sm">
                        <ThemeIcon size={48} radius="md" color="orange" variant="light">
                          <IconClock size={24} />
                        </ThemeIcon>
                        <Title order={4} size={18} fw={700}>
                          Flexible Schedule
                        </Title>
                        <Text c="dimmed" size="xs" style={{ lineHeight: 1.6 }}>
                          Work when you want, where you want. Complete control over your schedule
                        </Text>
                      </Stack>
                    </Card>

                    <Card shadow="sm" padding="md" radius="md" h="100%">
                      <Stack gap="sm">
                        <ThemeIcon size={48} radius="md" color="orange" variant="light">
                          <IconCurrencyDollar size={24} />
                        </ThemeIcon>
                        <Title order={4} size={18} fw={700}>
                          Competitive Pay
                        </Title>
                        <Text c="dimmed" size="xs" style={{ lineHeight: 1.6 }}>
                          Earn competitive rates plus tips. Weekly payments directly to your account
                        </Text>
                      </Stack>
                    </Card>

                    <Card shadow="sm" padding="md" radius="md" h="100%">
                      <Stack gap="sm">
                        <ThemeIcon size={48} radius="md" color="orange" variant="light">
                          <IconStar size={24} />
                        </ThemeIcon>
                        <Title order={4} size={18} fw={700}>
                          Driver Support
                        </Title>
                        <Text c="dimmed" size="xs" style={{ lineHeight: 1.6 }}>
                          24/7 driver support and comprehensive safety features for peace of mind
                        </Text>
                      </Stack>
                    </Card>
                  </SimpleGrid>

                  <Card shadow="sm" padding="md" radius="md">
                    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                      <Stack gap="sm">
                        <Title order={5} size={16} fw={700}>
                          Basic Requirements
                        </Title>
                        <List 
                          spacing="xs" 
                          size="xs" 
                          icon={
                            <ThemeIcon size={20} radius="xl" color="green" variant="light">
                              <IconCheck size={12} />
                            </ThemeIcon>
                          }
                        >
                          <List.Item>18+ years old</List.Item>
                          <List.Item>Valid driver's license</List.Item>
                          <List.Item>Auto insurance</List.Item>
                          <List.Item>Reliable vehicle</List.Item>
                        </List>
                      </Stack>
                      <Stack gap="sm">
                        <Title order={5} size={16} fw={700}>
                          What We Provide
                        </Title>
                        <List 
                          spacing="xs" 
                          size="xs" 
                          icon={
                            <ThemeIcon size={20} radius="xl" color="green" variant="light">
                              <IconCheck size={12} />
                            </ThemeIcon>
                          }
                        >
                          <List.Item>Delivery bag and equipment</List.Item>
                          <List.Item>Background check processing</List.Item>
                          <List.Item>Training and onboarding</List.Item>
                          <List.Item>24/7 support and safety features</List.Item>
                        </List>
                      </Stack>
                    </SimpleGrid>
                  </Card>
                </Stack>
              </Tabs.Panel>

              <Tabs.Panel value="enterprise">
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                  <Card shadow="sm" padding="md" radius="md" h="100%">
                    <Stack gap="sm">
                      <ThemeIcon size={48} radius="md" color="orange" variant="light">
                        <IconBuilding size={24} />
                      </ThemeIcon>
                      <Title order={4} size={18} fw={700}>
                        Corporate Catering
                      </Title>
                      <Text c="dimmed" size="xs" style={{ lineHeight: 1.6 }}>
                        Large-scale catering solutions for corporate events, meetings, and office dining
                      </Text>
                      <Badge color="orange" variant="light" size="sm" style={{ width: 'fit-content' }}>
                        Custom Pricing
                      </Badge>
                    </Stack>
                  </Card>

                  <Card shadow="sm" padding="md" radius="md" h="100%">
                    <Stack gap="sm">
                      <ThemeIcon size={48} radius="md" color="orange" variant="light">
                        <IconRocket size={24} />
                      </ThemeIcon>
                      <Title order={4} size={18} fw={700}>
                        White Label Solutions
                      </Title>
                      <Text c="dimmed" size="xs" style={{ lineHeight: 1.6 }}>
                        Custom-branded delivery platform for your business with full integration support
                      </Text>
                      <Badge color="orange" variant="light" size="sm" style={{ width: 'fit-content' }}>
                        Enterprise Only
                      </Badge>
                    </Stack>
                  </Card>

                  <Card shadow="sm" padding="md" radius="md" h="100%">
                    <Stack gap="sm">
                      <ThemeIcon size={48} radius="md" color="orange" variant="light">
                        <IconChartBar size={24} />
                      </ThemeIcon>
                      <Title order={4} size={18} fw={700}>
                        API Integration
                      </Title>
                      <Text c="dimmed" size="xs" style={{ lineHeight: 1.6 }}>
                        Integrate our delivery network into your existing systems and applications
                      </Text>
                      <Badge color="orange" variant="light" size="sm" style={{ width: 'fit-content' }}>
                        Developer Friendly
                      </Badge>
                    </Stack>
                  </Card>

                  <Card shadow="sm" padding="md" radius="md" h="100%">
                    <Stack gap="sm">
                      <ThemeIcon size={48} radius="md" color="orange" variant="light">
                        <IconShield size={24} />
                      </ThemeIcon>
                      <Title order={4} size={18} fw={700}>
                        Event Partnerships
                      </Title>
                      <Text c="dimmed" size="xs" style={{ lineHeight: 1.6 }}>
                        Partner with us for festivals, conferences, and large-scale events
                      </Text>
                      <Badge color="orange" variant="light" size="sm" style={{ width: 'fit-content' }}>
                        Event Specific
                      </Badge>
                    </Stack>
                  </Card>
                </SimpleGrid>
              </Tabs.Panel>
            </Tabs>
          </Stack>
        </Container>
      </Box>

      {/* Partnership Form Section - Full Page */}
      <Box 
        id="partnership-form"
        style={{ 
          width: '100%', 
          minHeight: '100vh',
          padding: '60px 0',
          background: 'linear-gradient(135deg, #ff6b00 0%, #ff8c42 100%)',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Container size="md" style={{ width: '100%' }}>
          <Card 
            shadow="xl" 
            padding="xl" 
            radius="md"
            style={{ 
              background: 'white',
              border: 'none',
            }}
          >
            <Stack gap="md">
              <Stack gap="xs" align="center">
                <Title order={2} size={28} fw={800} ta="center" c="dark.9">
                  Start Your Partnership Journey
                </Title>
                <Text size="sm" c="dimmed" ta="center" maw={600}>
                  Tell us about your business and we'll get back to you within 2 business days
                </Text>
              </Stack>

              <form onSubmit={handleSubmit}>
                <Stack gap="md">
                  <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                    <TextInput
                      label="Business Name"
                      placeholder="Your business name"
                      required
                      value={formData.businessName}
                      onChange={(e) => handleInputChange('businessName', e.target.value)}
                      size="sm"
                      radius="md"
                    />
                    <TextInput
                      label="Contact Name"
                      placeholder="Your full name"
                      required
                      value={formData.contactName}
                      onChange={(e) => handleInputChange('contactName', e.target.value)}
                      size="sm"
                      radius="md"
                    />
                  </SimpleGrid>

                  <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                    <TextInput
                      label="Email"
                      type="email"
                      placeholder="business@example.com"
                      required
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      size="sm"
                      radius="md"
                    />
                    <TextInput
                      label="Phone"
                      type="tel"
                      placeholder="(555) 123-4567"
                      required
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      size="sm"
                      radius="md"
                    />
                  </SimpleGrid>

                  <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                    <Select
                      label="Partnership Type"
                      placeholder="Select partnership type"
                      required
                      value={formData.partnershipType}
                      onChange={(value) => handleInputChange('partnershipType', value || '')}
                      data={[
                        { value: 'restaurant', label: 'Restaurant Partner' },
                        { value: 'driver', label: 'Delivery Driver' },
                        { value: 'corporate-catering', label: 'Corporate Catering' },
                        { value: 'white-label', label: 'White Label Solution' },
                        { value: 'api-integration', label: 'API Integration' },
                        { value: 'event-partnership', label: 'Event Partnership' },
                        { value: 'franchise', label: 'Franchise Opportunity' },
                        { value: 'other', label: 'Other' },
                      ]}
                      size="sm"
                      radius="md"
                    />
                    <Select
                      label="Business Type"
                      placeholder="Select business type"
                      value={formData.businessType}
                      onChange={(value) => handleInputChange('businessType', value || '')}
                      data={[
                        { value: 'restaurant', label: 'Restaurant' },
                        { value: 'food-truck', label: 'Food Truck' },
                        { value: 'catering', label: 'Catering Company' },
                        { value: 'ghost-kitchen', label: 'Ghost Kitchen' },
                        { value: 'enterprise', label: 'Enterprise' },
                        { value: 'individual', label: 'Individual' },
                        { value: 'startup', label: 'Startup' },
                        { value: 'other', label: 'Other' },
                      ]}
                      size="sm"
                      radius="md"
                    />
                  </SimpleGrid>

                  <TextInput
                    label="Location"
                    placeholder="City, State"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    leftSection={<IconMapPin size={16} />}
                    size="sm"
                    radius="md"
                  />

                  <Textarea
                    label="Tell us about your business"
                    placeholder="Describe your business, goals, and what you're looking for in a partnership..."
                    required
                    value={formData.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    rows={4}
                    size="sm"
                    radius="md"
                  />

                  <Button
                    type="submit"
                    size="md"
                    color="orange"
                    loading={isSubmitting}
                    fullWidth
                    rightSection={<IconArrowRight size={18} />}
                  >
                    Submit Partnership Request
                  </Button>
                </Stack>
              </form>
            </Stack>
          </Card>
        </Container>
      </Box>

      {/* Contact Section - Full Page */}
      <Box 
        style={{ 
          width: '100%', 
          minHeight: '100vh',
          padding: '60px 0',
          background: 'white',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Container size="md" style={{ width: '100%' }}>
          <Stack align="center" gap="md">
            <Stack align="center" gap="xs">
              <Title order={2} size={28} fw={800} ta="center" c="dark.9">
                Have Questions?
              </Title>
              <Text size="sm" c="dimmed" ta="center" maw={600}>
                Our partnership team is here to help you get started
              </Text>
            </Stack>

            <Group gap="md" justify="center">
              <Button
                variant="outline"
                size="md"
                leftSection={<IconPhone size={18} />}
                color="orange"
              >
                Call Partnership Team
              </Button>
              <Button
                variant="outline"
                size="md"
                leftSection={<IconMail size={18} />}
                color="orange"
              >
                support@cravenusa.com
              </Button>
            </Group>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
};

export default PartnerWithUs;

// Merchant Referral Form
// Minimal form for merchant referrals

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Stack,
  TextInput,
  Button,
  Title,
  Text,
  Group,
  ActionIcon,
} from '@mantine/core';
import { IconArrowLeft, IconBuildingStore } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const TesterReferMerchant: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    merchant_name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.merchant_name || !formData.contact_email) {
      toast({
        title: 'Missing Information',
        description: 'Please provide merchant name and contact email.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/account');
        return;
      }

      const { error } = await supabase
        .from('tester_referrals')
        .insert({
          referrer_user_id: user.id,
          referral_type: 'merchant',
          merchant_name: formData.merchant_name,
          merchant_contact_name: formData.contact_name,
          merchant_contact_email: formData.contact_email,
          merchant_contact_phone: formData.contact_phone,
          status: 'submitted',
        });

      if (error) throw error;

      toast({
        title: 'Referral Submitted',
        description: 'Thank you! We\'ll reach out to the merchant soon.',
      });

      navigate('/tester-hub');
    } catch (error: any) {
      console.error('Referral error:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit referral. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack gap="md" p="md">
      <Group>
        <ActionIcon variant="subtle" onClick={() => navigate('/tester-hub')}>
          <IconArrowLeft size={20} />
        </ActionIcon>
        <Title order={4}>Refer a Merchant</Title>
      </Group>

      <Card p="md" radius="md" withBorder>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Help us grow! Refer a restaurant or merchant to join Crave'n.
          </Text>

          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              <TextInput
                label="Merchant Name"
                placeholder="Restaurant or business name"
                value={formData.merchant_name}
                onChange={(e) => setFormData({ ...formData, merchant_name: e.target.value })}
                required
              />

              <TextInput
                label="Contact Name"
                placeholder="Owner or manager name"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
              />

              <TextInput
                label="Contact Email"
                type="email"
                placeholder="contact@restaurant.com"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                required
              />

              <TextInput
                label="Contact Phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              />

              <Button type="submit" loading={loading} fullWidth>
                Submit Referral
              </Button>
            </Stack>
          </form>
        </Stack>
      </Card>
    </Stack>
  );
};

export default TesterReferMerchant;


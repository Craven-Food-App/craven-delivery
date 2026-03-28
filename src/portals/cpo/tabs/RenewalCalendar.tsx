import React, { useEffect, useState } from 'react';
import {
  Card,
  Title,
  Text,
  Stack,
  SimpleGrid,
  Skeleton,
} from '@mantine/core';
import { supabase } from '@/integrations/supabase/client';
import ExecutiveCalendar, { type CalendarRenewalItem } from '@/components/calendar/ExecutiveCalendar';

const RenewalCalendar: React.FC = () => {
  const [items, setItems] = useState<CalendarRenewalItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [docsRes, partnersRes] = await Promise.all([
        supabase.from('partnership_documents').select('id, document_name, expires_at, partnerships(partner_name)').not('expires_at', 'is', null),
        supabase.from('partnerships').select('id, partner_name, contract_end_date').not('contract_end_date', 'is', null),
      ]);

      const docItems: CalendarRenewalItem[] = (docsRes.data || []).map((d: any) => ({
        id: d.id,
        name: d.document_name,
        partnerName: d.partnerships?.partner_name || 'Unknown',
        type: 'document' as const,
        expiresAt: new Date(d.expires_at),
      }));

      const partnerItems: CalendarRenewalItem[] = (partnersRes.data || []).map((p: any) => ({
        id: p.id,
        name: `${p.partner_name} Contract`,
        partnerName: p.partner_name,
        type: 'partnership' as const,
        expiresAt: new Date(p.contract_end_date),
      }));

      setItems([...docItems, ...partnerItems]);
    } catch (err) {
      console.error('Calendar load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDaysUntil = (date: Date) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const expiring7 = items.filter((i) => {
    const d = getDaysUntil(i.expiresAt);
    return d >= 0 && d <= 7;
  });
  const expiring30 = items.filter((i) => {
    const d = getDaysUntil(i.expiresAt);
    return d > 7 && d <= 30;
  });
  const expired = items.filter((i) => getDaysUntil(i.expiresAt) < 0);

  if (loading) {
    return (
      <Stack gap="md">
        {[1, 2].map((i) => (
          <Skeleton key={i} height={200} radius="md" />
        ))}
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <div>
        <Title order={3}>Renewal Calendar &amp; Executive Schedule</Title>
        <Text size="sm" c="dimmed" mt={4}>
          Partnership renewal deadlines below; executive events are private to the organizer and invitees unless marked for all executives—the same rules apply as in the Company Portal.
        </Text>
      </div>

      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <Card shadow="sm" radius="md" padding="lg" withBorder style={{ borderLeft: '4px solid #e03131' }}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
            Expiring in 7 Days
          </Text>
          <Title order={2} c="red">
            {expiring7.length}
          </Title>
          {expiring7.slice(0, 2).map((i) => (
            <Text key={i.id} size="xs" c="dimmed" truncate>
              {i.partnerName} — {i.name}
            </Text>
          ))}
        </Card>
        <Card shadow="sm" radius="md" padding="lg" withBorder style={{ borderLeft: '4px solid #ff6a00' }}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
            Expiring in 30 Days
          </Text>
          <Title order={2} c="orange">
            {expiring30.length}
          </Title>
          {expiring30.slice(0, 2).map((i) => (
            <Text key={i.id} size="xs" c="dimmed" truncate>
              {i.partnerName} — {i.name}
            </Text>
          ))}
        </Card>
        <Card shadow="sm" radius="md" padding="lg" withBorder style={{ borderLeft: '4px solid #868e96' }}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
            Expired
          </Text>
          <Title order={2}>{expired.length}</Title>
        </Card>
      </SimpleGrid>

      <ExecutiveCalendar showRenewalLayer renewalItems={items} />
    </Stack>
  );
};

export default RenewalCalendar;

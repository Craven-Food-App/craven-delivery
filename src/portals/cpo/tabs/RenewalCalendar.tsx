import React, { useEffect, useState } from 'react';
import {
  Card,
  Title,
  Text,
  Group,
  Badge,
  Stack,
  SimpleGrid,
  Skeleton,
  Button,
  Modal,
  Table,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconChevronLeft, IconChevronRight, IconAlertTriangle } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';

interface ExpiringItem {
  id: string;
  name: string;
  partnerName: string;
  type: 'document' | 'partnership';
  expiresAt: Date;
}

const DAYS_IN_WEEK = 7;

const RenewalCalendar: React.FC = () => {
  const [items, setItems] = useState<ExpiringItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [detailOpened, { open: openDetail, close: closeDetail }] = useDisclosure(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [docsRes, partnersRes] = await Promise.all([
        supabase.from('partnership_documents').select('id, document_name, expires_at, partnerships(partner_name)').not('expires_at', 'is', null),
        supabase.from('partnerships').select('id, partner_name, contract_end_date').not('contract_end_date', 'is', null),
      ]);

      const docItems: ExpiringItem[] = (docsRes.data || []).map((d: any) => ({
        id: d.id,
        name: d.document_name,
        partnerName: d.partnerships?.partner_name || 'Unknown',
        type: 'document' as const,
        expiresAt: new Date(d.expires_at),
      }));

      const partnerItems: ExpiringItem[] = (partnersRes.data || []).map((p: any) => ({
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

  const getUrgencyColor = (date: Date) => {
    const days = getDaysUntil(date);
    if (days < 0) return 'dark';
    if (days <= 7) return 'red';
    if (days <= 30) return 'orange';
    return 'green';
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);
  while (calendarDays.length % DAYS_IN_WEEK !== 0) calendarDays.push(null);

  const getItemsForDay = (day: number) =>
    items.filter(item => {
      const d = item.expiresAt;
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });

  const handleDayClick = (day: number) => {
    const dayItems = getItemsForDay(day);
    if (dayItems.length > 0) {
      setSelectedDate(new Date(year, month, day));
      openDetail();
    }
  };

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Summary counts
  const now = new Date();
  const expiring7 = items.filter(i => { const d = getDaysUntil(i.expiresAt); return d >= 0 && d <= 7; });
  const expiring30 = items.filter(i => { const d = getDaysUntil(i.expiresAt); return d > 7 && d <= 30; });
  const expired = items.filter(i => getDaysUntil(i.expiresAt) < 0);

  if (loading) return <Stack gap="md">{[1, 2].map(i => <Skeleton key={i} height={200} radius="md" />)}</Stack>;

  const selectedDayItems = selectedDate
    ? items.filter(i => {
        const d = i.expiresAt;
        return d.getFullYear() === selectedDate.getFullYear() && d.getMonth() === selectedDate.getMonth() && d.getDate() === selectedDate.getDate();
      })
    : [];

  return (
    <Stack gap="lg">
      <Title order={3}>Renewal Calendar</Title>

      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <Card shadow="sm" radius="md" padding="lg" withBorder style={{ borderLeft: '4px solid #e03131' }}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Expiring in 7 Days</Text>
          <Title order={2} c="red">{expiring7.length}</Title>
          {expiring7.slice(0, 2).map(i => (
            <Text key={i.id} size="xs" c="dimmed" truncate>{i.partnerName} — {i.name}</Text>
          ))}
        </Card>
        <Card shadow="sm" radius="md" padding="lg" withBorder style={{ borderLeft: '4px solid #ff6a00' }}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Expiring in 30 Days</Text>
          <Title order={2} c="orange">{expiring30.length}</Title>
          {expiring30.slice(0, 2).map(i => (
            <Text key={i.id} size="xs" c="dimmed" truncate>{i.partnerName} — {i.name}</Text>
          ))}
        </Card>
        <Card shadow="sm" radius="md" padding="lg" withBorder style={{ borderLeft: '4px solid #868e96' }}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Expired</Text>
          <Title order={2}>{expired.length}</Title>
        </Card>
      </SimpleGrid>

      <Card shadow="sm" radius="md" padding="lg" withBorder>
        <Group justify="space-between" mb="md">
          <Button variant="subtle" color="gray" onClick={prevMonth}><IconChevronLeft size={18} /></Button>
          <Title order={4}>{monthName}</Title>
          <Button variant="subtle" color="gray" onClick={nextMonth}><IconChevronRight size={18} /></Button>
        </Group>

        <SimpleGrid cols={7} spacing={0}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <Text key={d} ta="center" fw={700} size="xs" c="dimmed" pb="xs">{d}</Text>
          ))}
          {calendarDays.map((day, idx) => {
            if (day === null) return <div key={idx} style={{ minHeight: 60 }} />;
            const dayItems = getItemsForDay(day);
            const isToday = new Date().getFullYear() === year && new Date().getMonth() === month && new Date().getDate() === day;
            return (
              <div
                key={idx}
                onClick={() => handleDayClick(day)}
                style={{
                  minHeight: 60,
                  padding: 4,
                  border: '1px solid #eee',
                  borderRadius: 4,
                  cursor: dayItems.length > 0 ? 'pointer' : 'default',
                  backgroundColor: isToday ? '#fff4e6' : dayItems.length > 0 ? '#fff9f0' : undefined,
                }}
              >
                <Text size="xs" fw={isToday ? 700 : 400} c={isToday ? 'orange' : undefined}>{day}</Text>
                {dayItems.slice(0, 2).map(item => (
                  <Badge key={item.id} size="xs" color={getUrgencyColor(item.expiresAt)} variant="light" fullWidth style={{ marginTop: 2 }}>
                    <Text size="xs" truncate>{item.partnerName}</Text>
                  </Badge>
                ))}
                {dayItems.length > 2 && (
                  <Text size="xs" c="dimmed" ta="center">+{dayItems.length - 2} more</Text>
                )}
              </div>
            );
          })}
        </SimpleGrid>
      </Card>

      <Modal
        opened={detailOpened}
        onClose={closeDetail}
        title={selectedDate ? `Renewals — ${selectedDate.toLocaleDateString()}` : 'Details'}
        size="md"
      >
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Partner</Table.Th>
              <Table.Th>Item</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>Status</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {selectedDayItems.map(item => (
              <Table.Tr key={item.id}>
                <Table.Td><Text fw={500} size="sm">{item.partnerName}</Text></Table.Td>
                <Table.Td><Text size="sm">{item.name}</Text></Table.Td>
                <Table.Td><Badge size="xs" variant="light">{item.type}</Badge></Table.Td>
                <Table.Td>
                  <Badge size="xs" color={getUrgencyColor(item.expiresAt)}>
                    {getDaysUntil(item.expiresAt) < 0 ? 'Expired' : `${getDaysUntil(item.expiresAt)}d left`}
                  </Badge>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Modal>
    </Stack>
  );
};

export default RenewalCalendar;

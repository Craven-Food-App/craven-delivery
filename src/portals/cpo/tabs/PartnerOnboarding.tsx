import React, { useEffect, useState } from 'react';
import {
  Card,
  Title,
  Text,
  Group,
  Badge,
  Button,
  Stack,
  Select,
  Checkbox,
  Progress,
  Skeleton,
  TextInput,
  ActionIcon,
  SimpleGrid,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconTrash, IconChecklist } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { ONBOARDING_DEFAULT_STEPS as DEFAULT_STEPS } from '../dealConstants';

interface OnboardingItem {
  id: string;
  partnership_id: string;
  step_name: string;
  step_order: number;
  completed: boolean;
  completed_at: string | null;
}

interface PartnerSummary {
  id: string;
  partner_name: string;
  status: string;
}

const PartnerOnboarding: React.FC = () => {
  const [partnerships, setPartnerships] = useState<PartnerSummary[]>([]);
  const [items, setItems] = useState<OnboardingItem[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newStep, setNewStep] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [partnersRes, itemsRes] = await Promise.all([
      supabase.from('partnerships').select('id, partner_name, status').order('partner_name'),
      supabase.from('partnership_onboarding_items').select('*').order('step_order'),
    ]);
    setPartnerships((partnersRes.data as PartnerSummary[]) || []);
    setItems((itemsRes.data as OnboardingItem[]) || []);
    setLoading(false);
  };

  const initializeDefaults = async (partnerId: string) => {
    const existing = items.filter(i => i.partnership_id === partnerId);
    if (existing.length > 0) return;

    const rows = DEFAULT_STEPS.map((step, idx) => ({
      partnership_id: partnerId,
      step_name: step,
      step_order: idx,
      completed: false,
    }));

    const { error } = await supabase.from('partnership_onboarding_items').insert(rows);
    if (error) {
      notifications.show({ title: 'Error', message: error.message, color: 'red' });
      return;
    }
    loadData();
  };

  const toggleItem = async (item: OnboardingItem) => {
    const { data: { user } } = await supabase.auth.getUser();
    const updates = item.completed
      ? { completed: false, completed_at: null, completed_by: null }
      : { completed: true, completed_at: new Date().toISOString(), completed_by: user?.id || null };

    await supabase.from('partnership_onboarding_items').update(updates).eq('id', item.id);
    loadData();
  };

  const addStep = async () => {
    if (!selectedPartner || !newStep.trim()) return;
    const partnerItems = items.filter(i => i.partnership_id === selectedPartner);
    const maxOrder = partnerItems.length > 0 ? Math.max(...partnerItems.map(i => i.step_order)) + 1 : 0;

    await supabase.from('partnership_onboarding_items').insert({
      partnership_id: selectedPartner,
      step_name: newStep.trim(),
      step_order: maxOrder,
      completed: false,
    });
    setNewStep('');
    loadData();
  };

  const deleteStep = async (id: string) => {
    await supabase.from('partnership_onboarding_items').delete().eq('id', id);
    loadData();
  };

  const handleSelectPartner = (id: string | null) => {
    setSelectedPartner(id);
    if (id) initializeDefaults(id);
  };

  const partnerItems = items.filter(i => i.partnership_id === selectedPartner);
  const completedCount = partnerItems.filter(i => i.completed).length;
  const progressPct = partnerItems.length > 0 ? Math.round((completedCount / partnerItems.length) * 100) : 0;

  // Summary cards for all partners
  const partnerSummaries = partnerships.map(p => {
    const pItems = items.filter(i => i.partnership_id === p.id);
    const pCompleted = pItems.filter(i => i.completed).length;
    const pPct = pItems.length > 0 ? Math.round((pCompleted / pItems.length) * 100) : -1;
    return { ...p, total: pItems.length, completed: pCompleted, pct: pPct };
  }).filter(p => p.total > 0);

  if (loading) return <Stack gap="md">{[1, 2].map(i => <Skeleton key={i} height={150} radius="md" />)}</Stack>;

  return (
    <Stack gap="lg">
      <Group justify="space-between" wrap="wrap">
        <Title order={3}>Partner Onboarding</Title>
        <Select
          placeholder="Select a partner"
          data={partnerships.map(p => ({ value: p.id, label: p.partner_name }))}
          value={selectedPartner}
          onChange={handleSelectPartner}
          searchable
          clearable
          style={{ minWidth: 250 }}
        />
      </Group>

      {/* Overview cards */}
      {!selectedPartner && partnerSummaries.length > 0 && (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          {partnerSummaries.map(p => (
            <Card
              key={p.id}
              shadow="sm"
              radius="md"
              padding="lg"
              withBorder
              style={{ cursor: 'pointer' }}
              onClick={() => handleSelectPartner(p.id)}
            >
              <Group justify="space-between" mb="sm">
                <Text fw={600} size="sm">{p.partner_name}</Text>
                <Badge
                  color={p.pct === 100 ? 'green' : p.pct >= 50 ? 'yellow' : 'orange'}
                  size="sm"
                >
                  {p.pct}%
                </Badge>
              </Group>
              <Progress value={p.pct} color={p.pct === 100 ? 'green' : 'orange'} size="sm" />
              <Text size="xs" c="dimmed" mt="xs">{p.completed}/{p.total} steps completed</Text>
            </Card>
          ))}
        </SimpleGrid>
      )}

      {!selectedPartner && partnerSummaries.length === 0 && (
        <Card shadow="sm" radius="md" padding="xl" withBorder>
          <Stack align="center" gap="sm">
            <IconChecklist size={40} color="gray" />
            <Text c="dimmed" ta="center">
              Select a partner above to start their onboarding checklist. Default steps will be created automatically.
            </Text>
          </Stack>
        </Card>
      )}

      {/* Selected partner checklist */}
      {selectedPartner && (
        <Card shadow="sm" radius="md" padding="lg" withBorder>
          <Group justify="space-between" mb="md">
            <div>
              <Title order={4}>
                {partnerships.find(p => p.id === selectedPartner)?.partner_name}
              </Title>
              <Text size="sm" c="dimmed">{completedCount} of {partnerItems.length} steps completed</Text>
            </div>
            <Badge
              size="lg"
              color={progressPct === 100 ? 'green' : progressPct >= 50 ? 'yellow' : 'orange'}
            >
              {progressPct}%
            </Badge>
          </Group>
          <Progress value={progressPct} color={progressPct === 100 ? 'green' : 'orange'} size="md" mb="lg" />

          <Stack gap="sm">
            {partnerItems.map(item => (
              <Group key={item.id} justify="space-between" p="xs" style={{
                borderRadius: 8,
                backgroundColor: item.completed ? 'rgba(34,139,34,0.05)' : 'transparent',
              }}>
                <Checkbox
                  label={item.step_name}
                  checked={item.completed}
                  onChange={() => toggleItem(item)}
                  styles={{ label: { textDecoration: item.completed ? 'line-through' : 'none', opacity: item.completed ? 0.6 : 1 } }}
                />
                <Group gap="xs">
                  {item.completed_at && (
                    <Text size="xs" c="dimmed">{new Date(item.completed_at).toLocaleDateString()}</Text>
                  )}
                  <ActionIcon variant="subtle" color="red" size="sm" onClick={() => deleteStep(item.id)}>
                    <IconTrash size={14} />
                  </ActionIcon>
                </Group>
              </Group>
            ))}
          </Stack>

          {/* Add custom step */}
          <Group mt="md">
            <TextInput
              placeholder="Add custom step..."
              value={newStep}
              onChange={e => setNewStep(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addStep()}
              style={{ flex: 1 }}
              size="sm"
            />
            <Button size="sm" variant="light" color="orange" leftSection={<IconPlus size={14} />} onClick={addStep}>
              Add
            </Button>
          </Group>
        </Card>
      )}
    </Stack>
  );
};

export default PartnerOnboarding;

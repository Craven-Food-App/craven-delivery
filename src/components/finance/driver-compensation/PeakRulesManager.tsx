// @ts-nocheck
import React, { useState } from 'react';
import {
  Card,
  Stack,
  Text,
  Title,
  Table,
  Button,
  Group,
  Modal,
  Select,
  NumberInput,
  Switch,
  Badge,
  ActionIcon,
  Loader,
  Center,
  TextInput,
} from '@mantine/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import { IconArrowLeft, IconPlus, IconEdit, IconTrash, IconCheck } from '@tabler/icons-react';

interface PeakRule {
  id: string;
  rule_name: string;
  rule_type: string;
  zone?: string;
  day_of_week?: number;
  start_time: string;
  end_time: string;
  multiplier: number;
  is_active: boolean;
  created_at: string;
}

export const PeakRulesManager: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [modalOpened, setModalOpened] = useState(false);
  const [editingRule, setEditingRule] = useState<PeakRule | null>(null);

  // Fetch peak rules
  const { data: rules, isLoading } = useQuery({
    queryKey: ['peak-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('peak_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error && error.code !== 'PGRST205') {
        console.error('Error fetching peak rules:', error);
      }

      return (data || []) as PeakRule[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('peak_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peak-rules'] });
      notifications.show({
        title: 'Rule Deleted',
        message: 'Peak rule has been deleted successfully.',
        color: 'green',
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('peak_rules')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peak-rules'] });
    },
  });

  if (isLoading) {
    return (
      <Center style={{ minHeight: '50vh' }}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
      <Stack gap="lg">
        <Group justify="space-between">
          <Group>
            <Button
              variant="subtle"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate('/finance/driver-compensation')}
            >
              Back
            </Button>
            <div>
              <Title order={2}>Peak Rules Manager</Title>
              <Text c="dimmed" size="sm">
                Configure peak time multipliers for driver compensation
              </Text>
            </div>
          </Group>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => {
              setEditingRule(null);
              setModalOpened(true);
            }}
          >
            Add Peak Rule
          </Button>
        </Group>

        <Card withBorder padding="lg">
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Rule Name</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Zone/Day</Table.Th>
                <Table.Th>Time Range</Table.Th>
                <Table.Th>Multiplier</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rules && rules.length > 0 ? (
                rules.map((rule) => (
                  <Table.Tr key={rule.id}>
                    <Table.Td>{rule.rule_name}</Table.Td>
                    <Table.Td>
                      <Badge variant="light">{rule.rule_type}</Badge>
                    </Table.Td>
                    <Table.Td>
                      {rule.zone || (rule.day_of_week !== null ? `Day ${rule.day_of_week}` : 'All')}
                    </Table.Td>
                    <Table.Td>
                      {rule.start_time} - {rule.end_time}
                    </Table.Td>
                    <Table.Td>
                      <Badge color="blue">{rule.multiplier}x</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Switch
                        checked={rule.is_active}
                        onChange={(e) =>
                          toggleActiveMutation.mutate({
                            id: rule.id,
                            isActive: e.currentTarget.checked,
                          })
                        }
                      />
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon
                          variant="subtle"
                          onClick={() => {
                            setEditingRule(rule);
                            setModalOpened(true);
                          }}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this rule?')) {
                              deleteMutation.mutate(rule.id);
                            }
                          }}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              ) : (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Text c="dimmed" ta="center" py="xl">
                      No peak rules configured. Click "Add Peak Rule" to create one.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Card>

        <PeakRuleModal
          opened={modalOpened}
          onClose={() => {
            setModalOpened(false);
            setEditingRule(null);
          }}
          rule={editingRule}
        />
      </Stack>
  );
};

interface PeakRuleModalProps {
  opened: boolean;
  onClose: () => void;
  rule: PeakRule | null;
}

const PeakRuleModal: React.FC<PeakRuleModalProps> = ({ opened, onClose, rule }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    rule_name: rule?.rule_name || '',
    rule_type: rule?.rule_type || 'time_based',
    zone: rule?.zone || '',
    day_of_week: rule?.day_of_week?.toString() || '',
    start_time: rule?.start_time || '09:00',
    end_time: rule?.end_time || '17:00',
    multiplier: rule?.multiplier || 1.5,
    is_active: rule?.is_active ?? true,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const ruleData: any = {
        rule_name: formData.rule_name,
        rule_type: formData.rule_type,
        start_time: formData.start_time,
        end_time: formData.end_time,
        multiplier: formData.multiplier,
        is_active: formData.is_active,
        created_by: user.id,
      };

      if (formData.rule_type === 'zone_based' && formData.zone) {
        ruleData.zone = formData.zone;
      }

      if (formData.rule_type === 'day_based' && formData.day_of_week) {
        ruleData.day_of_week = parseInt(formData.day_of_week);
      }

      if (rule?.id) {
        const { error } = await supabase
          .from('peak_rules')
          .update(ruleData)
          .eq('id', rule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('peak_rules').insert(ruleData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peak-rules'] });
      notifications.show({
        title: 'Rule Saved',
        message: 'Peak rule has been saved successfully.',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
      onClose();
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to save rule',
        color: 'red',
      });
    },
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={rule ? 'Edit Peak Rule' : 'Add Peak Rule'}
      size="lg"
    >
      <Stack gap="md">
        <TextInput
          label="Rule Name"
          placeholder="e.g., Weekend Rush Hour"
          value={formData.rule_name}
          onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
          required
        />

        <Select
          label="Rule Type"
          data={[
            { value: 'time_based', label: 'Time Based' },
            { value: 'zone_based', label: 'Zone Based' },
            { value: 'day_based', label: 'Day of Week Based' },
          ]}
          value={formData.rule_type}
          onChange={(value) => setFormData({ ...formData, rule_type: value || 'time_based' })}
        />

        {formData.rule_type === 'zone_based' && (
          <TextInput
            label="Zone"
            placeholder="e.g., Downtown, West Side"
            value={formData.zone}
            onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
          />
        )}

        {formData.rule_type === 'day_based' && (
          <Select
            label="Day of Week"
            data={[
              { value: '0', label: 'Sunday' },
              { value: '1', label: 'Monday' },
              { value: '2', label: 'Tuesday' },
              { value: '3', label: 'Wednesday' },
              { value: '4', label: 'Thursday' },
              { value: '5', label: 'Friday' },
              { value: '6', label: 'Saturday' },
            ]}
            value={formData.day_of_week}
            onChange={(value) => setFormData({ ...formData, day_of_week: value || '' })}
          />
        )}

        <Group grow>
          <TextInput
            label="Start Time"
            type="time"
            value={formData.start_time}
            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
          />
          <TextInput
            label="End Time"
            type="time"
            value={formData.end_time}
            onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
          />
        </Group>

        <NumberInput
          label="Multiplier"
          description="Earnings multiplier during peak time (e.g., 1.5 = 50% bonus)"
          min={1}
          max={3}
          step={0.1}
          decimalScale={1}
          value={formData.multiplier}
          onChange={(value) => setFormData({ ...formData, multiplier: Number(value) || 1 })}
        />

        <Switch
          label="Active"
          checked={formData.is_active}
          onChange={(e) => setFormData({ ...formData, is_active: e.currentTarget.checked })}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
            Save Rule
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};


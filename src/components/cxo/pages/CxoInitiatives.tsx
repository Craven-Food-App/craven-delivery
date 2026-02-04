// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Stack, Table, Button, Modal, TextInput, Textarea, Select, Group, Text, Title, Loader, Center, Badge } from '@mantine/core';
import { StatusBadge } from '@/components/cxo/shared/StatusBadge';
import { initiativesRepository } from '@/lib/cxo/repositories/initiativesRepository';
import { ExperienceInitiative } from '@/types/cxo';
import { IconPlus } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';

const CxoInitiatives: React.FC = () => {
  const [initiatives, setInitiatives] = useState<ExperienceInitiative[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [formData, setFormData] = useState({
    title: '',
    problemStatement: '',
    rootCause: '',
    plan: '',
    status: 'planned',
    startDate: new Date().toISOString().split('T')[0],
    targetDate: '',
    targetMetric: '',
    baseline: '',
    target: '',
  });

  useEffect(() => {
    loadInitiatives();
  }, [statusFilter]);

  const loadInitiatives = async () => {
    setLoading(true);
    try {
      const data = await initiativesRepository.getAll(
        statusFilter ? { status: statusFilter } : undefined
      );
      setInitiatives(data);
    } catch (error) {
      console.error('Error loading initiatives:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const initiative = {
      title: formData.title,
      problemStatement: formData.problemStatement,
      rootCause: formData.rootCause || null,
      plan: formData.plan,
      ownerId: user.id,
      status: formData.status as any,
      impactMetrics: {
        targetMetric: formData.targetMetric || undefined,
        baseline: formData.baseline ? parseFloat(formData.baseline) : undefined,
        target: formData.target ? parseFloat(formData.target) : undefined,
      },
      startDate: formData.startDate,
      targetDate: formData.targetDate || null,
    };

    if (!formData.title || !formData.problemStatement || !formData.plan) {
      notifications.show({
        title: 'Validation Error',
        message: 'Title, problem statement, and plan are required',
        color: 'red',
      });
      return;
    }

    const id = await initiativesRepository.create(initiative);
    if (id) {
      notifications.show({
        title: 'Success',
        message: 'Initiative created successfully',
        color: 'green',
      });
      setModalOpen(false);
      setFormData({
        title: '',
        problemStatement: '',
        rootCause: '',
        plan: '',
        status: 'planned',
        startDate: new Date().toISOString().split('T')[0],
        targetDate: '',
        targetMetric: '',
        baseline: '',
        target: '',
      });
      loadInitiatives();
    } else {
      notifications.show({
        title: 'Error',
        message: 'Failed to create initiative',
        color: 'red',
      });
    }
  };

  if (loading) {
    return (
      <Center style={{ minHeight: '50vh' }}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Experience Improvement Programs</Title>
        <Group>
          <Select
            placeholder="Filter by status"
            data={[
              { value: '', label: 'All Statuses' },
              { value: 'planned', label: 'Planned' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'completed', label: 'Completed' },
              { value: 'on_hold', label: 'On Hold' },
            ]}
            value={statusFilter}
            onChange={(value) => setStatusFilter(value || '')}
            clearable
          />
          <Button leftSection={<IconPlus size={16} />} onClick={() => setModalOpen(true)}>
            Create Initiative
          </Button>
        </Group>
      </Group>

      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Title</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Owner</Table.Th>
            <Table.Th>Start Date</Table.Th>
            <Table.Th>Target Date</Table.Th>
            <Table.Th>Impact Metric</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {initiatives.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={6}>
                <Text c="dimmed" ta="center" py="md">
                  No initiatives found
                </Text>
              </Table.Td>
            </Table.Tr>
          ) : (
            initiatives.map((initiative) => (
              <Table.Tr key={initiative.id}>
                <Table.Td>
                  <Text size="sm" fw={500}>
                    {initiative.title}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <StatusBadge status={initiative.status} />
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{initiative.ownerId || 'Unassigned'}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{new Date(initiative.startDate).toLocaleDateString()}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{initiative.targetDate ? new Date(initiative.targetDate).toLocaleDateString() : 'N/A'}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">
                    {initiative.impactMetrics.targetMetric || 'N/A'}
                    {initiative.impactMetrics.baseline !== undefined &&
                      ` (${initiative.impactMetrics.baseline} → ${initiative.impactMetrics.target || 'TBD'})`}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))
          )}
        </Table.Tbody>
      </Table>

      {/* Create Initiative Modal */}
      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title="Create Initiative" size="lg">
        <Stack gap="md">
          <TextInput
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
          <Textarea
            label="Problem Statement"
            value={formData.problemStatement}
            onChange={(e) => setFormData({ ...formData, problemStatement: e.target.value })}
            required
            minRows={3}
          />
          <Textarea
            label="Root Cause"
            value={formData.rootCause}
            onChange={(e) => setFormData({ ...formData, rootCause: e.target.value })}
            minRows={2}
          />
          <Textarea
            label="Plan"
            value={formData.plan}
            onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
            required
            minRows={3}
          />
          <Select
            label="Status"
            value={formData.status}
            onChange={(value) => setFormData({ ...formData, status: value || 'planned' })}
            data={[
              { value: 'planned', label: 'Planned' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'on_hold', label: 'On Hold' },
            ]}
          />
          <Group grow>
            <TextInput
              label="Start Date"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              required
            />
            <TextInput
              label="Target Date"
              type="date"
              value={formData.targetDate}
              onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
            />
          </Group>
          <TextInput
            label="Target Metric"
            value={formData.targetMetric}
            onChange={(e) => setFormData({ ...formData, targetMetric: e.target.value })}
            placeholder="e.g., late_delivery_rate"
          />
          <Group grow>
            <TextInput
              label="Baseline"
              type="number"
              value={formData.baseline}
              onChange={(e) => setFormData({ ...formData, baseline: e.target.value })}
              placeholder="Current value"
            />
            <TextInput
              label="Target"
              type="number"
              value={formData.target}
              onChange={(e) => setFormData({ ...formData, target: e.target.value })}
              placeholder="Target value"
            />
          </Group>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};

export default CxoInitiatives;


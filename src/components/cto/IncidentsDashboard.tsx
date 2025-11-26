import React, { useState, useEffect } from 'react';
import {
  Stack,
  Group,
  Title,
  Button,
  Modal,
  TextInput,
  Textarea,
  Select,
  Grid,
  Badge,
  ActionIcon,
  Tooltip,
  Text,
} from '@mantine/core';
import { IconPlus, IconEdit, IconTrash } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useEmbeddedToast';
import { MantineTable } from '@/components/cfo/MantineTable';
import { modals } from '@mantine/modals';
import { useForm } from '@mantine/form';
import { ctoNotificationService } from '@/services/ctoNotificationService';

export const IncidentsDashboard: React.FC = () => {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpened, setModalOpened] = useState(false);
  const [editingIncident, setEditingIncident] = useState<any>(null);
  const toast = useToast();

  const form = useForm({
    initialValues: {
      title: '',
      description: '',
      incident_type: 'outage',
      severity: 'medium',
      status: 'open',
    },
  });

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('it_incidents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setIncidents(data || []);
    } catch (error: any) {
      console.error('Error fetching incidents:', error);
      toast.error('Failed to load incidents', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingIncident(null);
    form.reset();
    setModalOpened(true);
  };

  const handleEdit = (record: any) => {
    setEditingIncident(record);
    form.setValues(record);
    setModalOpened(true);
  };

  const handleDelete = async (id: string) => {
    modals.openConfirmModal({
      title: 'Delete Incident',
      children: <Text size="sm">Are you sure you want to delete this incident?</Text>,
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('it_incidents').delete().eq('id', id);
          if (error) throw error;
          toast.success('Incident deleted successfully', 'Success');
          fetchIncidents();
        } catch (error: any) {
          console.error('Error deleting incident:', error);
          toast.error(error.message || 'Failed to delete incident', 'Error');
        }
      },
    });
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingIncident) {
        const { error } = await supabase
          .from('it_incidents')
          .update(values)
          .eq('id', editingIncident.id);
        if (error) throw error;
        toast.success('Incident updated successfully', 'Success');
      } else {
        const { error, data } = await supabase.from('it_incidents').insert(values).select().single();
        if (error) throw error;
        toast.success('Incident created successfully', 'Success');
        
        // Send notification for critical/high severity incidents
        if (values.severity === 'critical' || values.severity === 'high') {
          await ctoNotificationService.notifyCriticalIncident(data || values);
        }
      }
      setModalOpened(false);
      form.reset();
      fetchIncidents();
    } catch (error: any) {
      console.error('Error saving incident:', error);
      toast.error(error.message || 'Failed to save incident', 'Error');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'yellow';
      default: return 'blue';
    }
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={4}>Incident Management</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={handleCreate}>
          Report Incident
        </Button>
      </Group>

      <MantineTable
        data={incidents}
        loading={loading}
        rowKey="id"
        columns={[
          { title: 'Title', dataIndex: 'title' },
          { title: 'Type', dataIndex: 'incident_type' },
          {
            title: 'Severity',
            dataIndex: 'severity',
            render: (severity: string) => (
              <Badge color={getSeverityColor(severity)} variant="light">
                {severity}
              </Badge>
            ),
          },
          { title: 'Status', dataIndex: 'status' },
          {
            title: 'Reported',
            dataIndex: 'created_at',
            render: (v: string) => new Date(v).toLocaleString(),
          },
          {
            title: 'Actions',
            dataIndex: 'actions',
            render: (_: any, record: any) => (
              <Group gap="xs">
                <Tooltip label="Edit">
                  <ActionIcon variant="subtle" color="blue" onClick={() => handleEdit(record)}>
                    <IconEdit size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Delete">
                  <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(record.id)}>
                    <IconTrash size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            ),
          },
        ]}
      />

      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={editingIncident ? 'Edit Incident' : 'Report Incident'}
        size="lg"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Title"
              placeholder="Service outage in production"
              required
              {...form.getInputProps('title')}
            />
            <Textarea
              label="Description"
              placeholder="Describe the incident in detail..."
              required
              rows={4}
              {...form.getInputProps('description')}
            />
            <Select
              label="Type"
              required
              data={[
                { value: 'outage', label: 'Outage' },
                { value: 'bug', label: 'Bug' },
                { value: 'security', label: 'Security' },
                { value: 'performance', label: 'Performance' },
              ]}
              {...form.getInputProps('incident_type')}
            />
            <Grid>
              <Grid.Col span={6}>
                <Select
                  label="Severity"
                  required
                  data={[
                    { value: 'low', label: 'Low' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'High' },
                    { value: 'critical', label: 'Critical' },
                  ]}
                  {...form.getInputProps('severity')}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <Select
                  label="Status"
                  required
                  data={[
                    { value: 'open', label: 'Open' },
                    { value: 'investigating', label: 'Investigating' },
                    { value: 'resolved', label: 'Resolved' },
                  ]}
                  {...form.getInputProps('status')}
                />
              </Grid.Col>
            </Grid>
            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={() => setModalOpened(false)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
};

// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Stack, Table, Button, Modal, Textarea, Select, Group, Text, Title, Loader, Center, Badge, TextInput } from '@mantine/core';
import { StatusBadge } from '@/components/cxo/shared/StatusBadge';
import { SeverityBadge } from '@/components/cxo/shared/SeverityBadge';
import { incidentsRepository } from '@/lib/cxo/repositories/incidentsRepository';
import { ExperienceIncident } from '@/types/cxo';
import { IconPlus } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';

const CxoIncidents: React.FC = () => {
  const [incidents, setIncidents] = useState<ExperienceIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<ExperienceIncident | null>(null);
  const [filters, setFilters] = useState({
    type: '',
    severity: '',
    status: '',
    zone: '',
  });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'other' as ExperienceIncident['type'],
    severity: 'medium' as ExperienceIncident['severity'],
    zone: '',
  });
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadIncidents();
  }, [filters]);

  const loadIncidents = async () => {
    setLoading(true);
    try {
      const data = await incidentsRepository.getAll({
        type: filters.type || undefined,
        severity: filters.severity || undefined,
        status: filters.status || undefined,
        zone: filters.zone || undefined,
      });
      setIncidents(data);
    } catch (error) {
      console.error('Error loading incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (incidentId: string) => {
    const incident = await incidentsRepository.getById(incidentId);
    if (incident) {
      setSelectedIncident(incident);
      setDetailModalOpen(true);
    }
  };

  const handleCreate = async () => {
    if (!formData.title || !formData.description) {
      notifications.show({
        title: 'Validation Error',
        message: 'Title and description are required',
        color: 'red',
      });
      return;
    }

    const incidentId = await incidentsRepository.create({
      title: formData.title,
      description: formData.description,
      type: formData.type,
      severity: formData.severity,
      status: 'open',
      zone: formData.zone || undefined,
      reportedAt: new Date().toISOString(),
      ownerId: null,
      linkedTicketId: null,
      notes: null,
    });

    if (incidentId) {
      notifications.show({
        title: 'Success',
        message: 'Incident created successfully',
        color: 'green',
      });
      setCreateModalOpen(false);
      setFormData({ title: '', description: '', type: 'other', severity: 'medium', zone: '' });
      loadIncidents();
    } else {
      notifications.show({
        title: 'Error',
        message: 'Failed to create incident',
        color: 'red',
      });
    }
  };

  const handleUpdateStatus = async (incidentId: string, newStatus: string) => {
    const updates: any = { status: newStatus };
    if (newStatus === 'resolved' || newStatus === 'closed') {
      updates.resolvedAt = new Date().toISOString();
    }
    const success = await incidentsRepository.update(incidentId, updates);
    if (success) {
      notifications.show({
        title: 'Success',
        message: 'Incident status updated',
        color: 'green',
      });
      setDetailModalOpen(false);
      loadIncidents();
    } else {
      notifications.show({
        title: 'Error',
        message: 'Failed to update incident',
        color: 'red',
      });
    }
  };

  const handleAddNote = async () => {
    if (!selectedIncident || !notes.trim()) return;

    const success = await incidentsRepository.update(selectedIncident.id, {
      notes: selectedIncident.notes ? `${selectedIncident.notes}\n\n${new Date().toLocaleString()}: ${notes}` : `${new Date().toLocaleString()}: ${notes}`,
    });

    if (success) {
      notifications.show({
        title: 'Success',
        message: 'Note added successfully',
        color: 'green',
      });
      setNotes('');
      const updated = await incidentsRepository.getById(selectedIncident.id);
      if (updated) setSelectedIncident(updated);
      loadIncidents();
    } else {
      notifications.show({
        title: 'Error',
        message: 'Failed to add note',
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
        <Title order={2}>Incident & Risk Management</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setCreateModalOpen(true)}>
          Create Incident
        </Button>
      </Group>

      {/* Filters */}
      <Group>
        <Select
          label="Type"
          placeholder="All Types"
          data={[
            { value: '', label: 'All Types' },
            { value: 'system_outage', label: 'System Outage' },
            { value: 'merchant_outage', label: 'Merchant Outage' },
            { value: 'driver_shortage', label: 'Driver Shortage' },
            { value: 'safety', label: 'Safety' },
            { value: 'other', label: 'Other' },
          ]}
          value={filters.type}
          onChange={(value) => setFilters({ ...filters, type: value || '' })}
          clearable
        />
        <Select
          label="Severity"
          placeholder="All Severities"
          data={[
            { value: '', label: 'All Severities' },
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
            { value: 'critical', label: 'Critical' },
          ]}
          value={filters.severity}
          onChange={(value) => setFilters({ ...filters, severity: value || '' })}
          clearable
        />
        <Select
          label="Status"
          placeholder="All Statuses"
          data={[
            { value: '', label: 'All Statuses' },
            { value: 'open', label: 'Open' },
            { value: 'mitigating', label: 'Mitigating' },
            { value: 'resolved', label: 'Resolved' },
            { value: 'closed', label: 'Closed' },
          ]}
          value={filters.status}
          onChange={(value) => setFilters({ ...filters, status: value || '' })}
          clearable
        />
      </Group>

      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Title</Table.Th>
            <Table.Th>Type</Table.Th>
            <Table.Th>Severity</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Zone</Table.Th>
            <Table.Th>Reported At</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {incidents.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={7}>
                <Text c="dimmed" ta="center" py="md">
                  No incidents found
                </Text>
              </Table.Td>
            </Table.Tr>
          ) : (
            incidents.map((incident) => (
              <Table.Tr key={incident.id}>
                <Table.Td>
                  <Text size="sm" fw={500}>
                    {incident.title}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Badge>{incident.type.replace('_', ' ')}</Badge>
                </Table.Td>
                <Table.Td>
                  <SeverityBadge severity={incident.severity} />
                </Table.Td>
                <Table.Td>
                  <StatusBadge status={incident.status} />
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{incident.zone || 'N/A'}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{new Date(incident.reportedAt).toLocaleDateString()}</Text>
                </Table.Td>
                <Table.Td>
                  <Button size="xs" variant="subtle" onClick={() => handleViewDetails(incident.id)}>
                    View
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))
          )}
        </Table.Tbody>
      </Table>

      {/* Incident Detail Modal */}
      <Modal
        opened={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedIncident(null);
        }}
        title="Incident Details"
        size="lg"
      >
        {selectedIncident && (
          <Stack gap="md">
            <div>
              <Text size="sm" c="dimmed">
                Title
              </Text>
              <Text fw={500}>{selectedIncident.title}</Text>
            </div>
            <div>
              <Text size="sm" c="dimmed">
                Description
              </Text>
              <Text>{selectedIncident.description}</Text>
            </div>
            <Group>
              <div>
                <Text size="sm" c="dimmed">
                  Type
                </Text>
                <Badge>{selectedIncident.type.replace('_', ' ')}</Badge>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  Severity
                </Text>
                <SeverityBadge severity={selectedIncident.severity} />
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  Status
                </Text>
                <StatusBadge status={selectedIncident.status} />
              </div>
            </Group>
            <div>
              <Text size="sm" c="dimmed">
                Reported At
              </Text>
              <Text>{new Date(selectedIncident.reportedAt).toLocaleString()}</Text>
            </div>
            {selectedIncident.resolvedAt && (
              <div>
                <Text size="sm" c="dimmed">
                  Resolved At
                </Text>
                <Text>{new Date(selectedIncident.resolvedAt).toLocaleString()}</Text>
              </div>
            )}
            {selectedIncident.notes && (
              <div>
                <Text size="sm" c="dimmed">
                  Notes
                </Text>
                <Text>{selectedIncident.notes}</Text>
              </div>
            )}
            <Select
              label="Update Status"
              value={selectedIncident.status}
              onChange={(value) => value && handleUpdateStatus(selectedIncident.id, value)}
              data={[
                { value: 'open', label: 'Open' },
                { value: 'mitigating', label: 'Mitigating' },
                { value: 'resolved', label: 'Resolved' },
                { value: 'closed', label: 'Closed' },
              ]}
            />
            <div>
              <Textarea
                label="Add Note"
                placeholder="Enter notes about this incident..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                minRows={3}
              />
              <Button mt="sm" onClick={handleAddNote} disabled={!notes.trim()}>
                Add Note
              </Button>
            </div>
          </Stack>
        )}
      </Modal>

      {/* Create Incident Modal */}
      <Modal opened={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Create Incident" size="lg">
        <Stack gap="md">
          <TextInput
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            placeholder="Brief incident title"
          />
          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
            minRows={4}
            placeholder="Detailed description of the incident"
          />
          <Group grow>
            <Select
              label="Type"
              value={formData.type}
              onChange={(value) => setFormData({ ...formData, type: (value as any) || 'other' })}
              data={[
                { value: 'system_outage', label: 'System Outage' },
                { value: 'merchant_outage', label: 'Merchant Outage' },
                { value: 'driver_shortage', label: 'Driver Shortage' },
                { value: 'safety', label: 'Safety' },
                { value: 'other', label: 'Other' },
              ]}
              required
            />
            <Select
              label="Severity"
              value={formData.severity}
              onChange={(value) => setFormData({ ...formData, severity: (value as any) || 'medium' })}
              data={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'critical', label: 'Critical' },
              ]}
              required
            />
          </Group>
          <TextInput
            label="Zone (Optional)"
            value={formData.zone}
            onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
            placeholder="e.g., West Toledo"
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create Incident</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};

export default CxoIncidents;


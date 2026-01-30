import React, { useState, useEffect, useMemo } from 'react';
import {
  Stack,
  Group,
  Button,
  TextInput,
  Textarea,
  Select,
  Grid,
  ActionIcon,
  Tooltip,
  Text,
  Tabs,
  Card,
} from '@mantine/core';
import { IconPlus, IconEdit, IconTrash, IconBug } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useEmbeddedToast';
import { modals } from '@mantine/modals';
import { useForm } from '@mantine/form';
import { ctoNotificationService } from '@/services/ctoNotificationService';
import { PageHeader } from '@/components/tpi/PageHeader';
import { DataTable, ColumnDef } from '@/components/tpi/DataTable';
import { DetailDrawer } from '@/components/tpi/DetailDrawer';
import { FilterBar, Filter } from '@/components/tpi/FilterBar';
import { StatusBadge } from '@/components/tpi/StatusBadge';
import { EmptyState } from '@/components/tpi/EmptyState';
import { ErrorState } from '@/components/tpi/ErrorState';

export const IncidentsDashboard: React.FC = () => {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortColumn, setSortColumn] = useState('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [activeFilters, setActiveFilters] = useState<Filter[]>([]);
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
    setError(null);
    try {
      let query = supabase
        .from('it_incidents')
        .select('*', { count: 'exact' });

      // Apply filters
      activeFilters.forEach((filter) => {
        if (filter.value) {
          if (filter.type === 'text') {
            query = query.ilike(filter.id, `%${filter.value}%`);
          } else if (filter.type === 'select') {
            query = query.eq(filter.id, filter.value);
          }
        }
      });

      // Apply sorting
      query = query.order(sortColumn, { ascending: sortDirection === 'asc' });

      // Apply pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error: fetchError, count } = await query;
      
      if (fetchError) throw fetchError;
      setIncidents(data || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      console.error('Error fetching incidents:', err);
      setError(err.message || 'Failed to load incidents');
      toast.error('Failed to load incidents', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const [totalCount, setTotalCount] = useState(0);

  const handleCreate = () => {
    setEditingIncident(null);
    form.reset();
    setSelectedIncident(null);
    setDrawerOpen(true);
  };

  const handleRowClick = (row: any) => {
    setSelectedIncident(row.id);
    setEditingIncident(null);
    setDrawerOpen(true);
  };

  const handleEdit = (record: any) => {
    setEditingIncident(record);
    form.setValues(record);
    setSelectedIncident(record.id);
    setDrawerOpen(true);
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
      setDrawerOpen(false);
      setEditingIncident(null);
      setSelectedIncident(null);
      form.reset();
      fetchIncidents();
    } catch (error: any) {
      console.error('Error saving incident:', error);
      toast.error(error.message || 'Failed to save incident', 'Error');
    }
  };

  const getSeverityStatus = (severity: string): 'error' | 'warning' | 'info' | 'neutral' => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      default: return 'neutral';
    }
  };

  const getStatusStatus = (status: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' => {
    switch (status) {
      case 'resolved': return 'success';
      case 'investigating': return 'warning';
      case 'open': return 'info';
      default: return 'neutral';
    }
  };

  const availableFilters: Filter[] = useMemo(() => [
    {
      id: 'title',
      type: 'text',
      label: 'Title',
      value: activeFilters.find((f) => f.id === 'title')?.value || '',
    },
    {
      id: 'severity',
      type: 'select',
      label: 'Severity',
      value: activeFilters.find((f) => f.id === 'severity')?.value || '',
      options: [
        { label: 'Low', value: 'low' },
        { label: 'Medium', value: 'medium' },
        { label: 'High', value: 'high' },
        { label: 'Critical', value: 'critical' },
      ],
    },
    {
      id: 'status',
      type: 'select',
      label: 'Status',
      value: activeFilters.find((f) => f.id === 'status')?.value || '',
      options: [
        { label: 'Open', value: 'open' },
        { label: 'Investigating', value: 'investigating' },
        { label: 'Resolved', value: 'resolved' },
      ],
    },
    {
      id: 'incident_type',
      type: 'select',
      label: 'Type',
      value: activeFilters.find((f) => f.id === 'incident_type')?.value || '',
      options: [
        { label: 'Outage', value: 'outage' },
        { label: 'Bug', value: 'bug' },
        { label: 'Security', value: 'security' },
        { label: 'Performance', value: 'performance' },
      ],
    },
  ], [activeFilters]);

  const columns: ColumnDef<any>[] = useMemo(() => [
    {
      id: 'title',
      header: 'Title',
      accessor: (row) => row.title,
      sortable: true,
      render: (value, row) => (
        <div>
          <Text fw={500} size="sm">{value}</Text>
          {row.description && (
            <Text size="xs" c="dimmed" lineClamp={1}>
              {row.description}
            </Text>
          )}
        </div>
      ),
    },
    {
      id: 'incident_type',
      header: 'Type',
      accessor: (row) => row.incident_type,
      sortable: true,
      width: 120,
    },
    {
      id: 'severity',
      header: 'Severity',
      accessor: (row) => row.severity,
      sortable: true,
      render: (value) => (
        <StatusBadge
          status={getSeverityStatus(value)}
          label={value?.toUpperCase() || 'Unknown'}
          size="sm"
        />
      ),
      width: 120,
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (row) => row.status,
      sortable: true,
      render: (value) => (
        <StatusBadge
          status={getStatusStatus(value)}
          label={value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Unknown'}
          size="sm"
        />
      ),
      width: 120,
    },
    {
      id: 'created_at',
      header: 'Reported',
      accessor: (row) => row.created_at,
      sortable: true,
      render: (value) => new Date(value).toLocaleString(),
      width: 180,
    },
  ], []);

  const selectedIncidentData = useMemo(() => {
    return incidents.find((inc) => inc.id === selectedIncident);
  }, [incidents, selectedIncident]);

  useEffect(() => {
    fetchIncidents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, sortColumn, sortDirection, activeFilters]);

  const handleExport = (format: 'csv' | 'pdf') => {
    // Export logic
    toast.success(`Exporting incidents as ${format.toUpperCase()}...`, 'Export');
  };

  if (error && !loading) {
    return (
      <ErrorState
        message={error}
        retry={{
          label: 'Retry',
          onRetry: fetchIncidents,
        }}
      />
    );
  }

  return (
    <Stack gap="md">
      <PageHeader
        title="Incident Management"
        description="Track and resolve platform incidents"
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={handleCreate}>
            New Incident
          </Button>
        }
      />

      <FilterBar
        filters={availableFilters}
        activeFilters={activeFilters}
        onFilterChange={setActiveFilters}
      />

      <DataTable
        data={incidents}
        columns={columns}
        loading={loading}
        pagination={{
          page: currentPage,
          pageSize: pageSize,
          total: totalCount,
          onPageChange: setCurrentPage,
          onPageSizeChange: setPageSize,
        }}
        sorting={{
          column: sortColumn,
          direction: sortDirection,
          onSort: (col, dir) => {
            setSortColumn(col);
            setSortDirection(dir);
          },
        }}
        onRowClick={handleRowClick}
        exportable
        onExport={handleExport}
        emptyState={
          <EmptyState
            icon={IconBug}
            title="No incidents found"
            description="Get started by creating your first incident report."
            action={{
              label: 'New Incident',
              onClick: handleCreate,
            }}
          />
        }
        getRowId={(row) => row.id}
      />

      <DetailDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedIncident(null);
          setEditingIncident(null);
        }}
        title={editingIncident ? 'Edit Incident' : selectedIncidentData ? `Incident: ${selectedIncidentData.title}` : 'New Incident'}
        entityId={selectedIncident || undefined}
        width={700}
        footer={
          editingIncident ? (
            <Group justify="flex-end" gap="sm">
              <Button variant="subtle" onClick={() => {
                setEditingIncident(null);
                setDrawerOpen(false);
              }}>
                Cancel
              </Button>
              <Button onClick={() => form.onSubmit(handleSubmit)()}>
                Save Changes
              </Button>
            </Group>
          ) : selectedIncidentData ? (
            <Group justify="flex-end" gap="sm">
              <Button variant="subtle" onClick={() => handleDelete(selectedIncidentData.id)}>
                Delete
              </Button>
              <Button onClick={() => handleEdit(selectedIncidentData)}>
                Edit
              </Button>
            </Group>
          ) : null
        }
      >
        {editingIncident ? (
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
            </Stack>
          </form>
        ) : selectedIncidentData ? (
          <Tabs defaultValue="overview">
            <Tabs.List>
              <Tabs.Tab value="overview">Overview</Tabs.Tab>
              <Tabs.Tab value="activity">Activity</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="overview" pt="md">
              <Stack gap="md">
                <Card padding="md" withBorder>
                  <Stack gap="sm">
                    <div>
                      <Text size="xs" c="dimmed" fw={500}>Title</Text>
                      <Text fw={500}>{selectedIncidentData.title}</Text>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed" fw={500}>Description</Text>
                      <Text>{selectedIncidentData.description}</Text>
                    </div>
                    <Group>
                      <div>
                        <Text size="xs" c="dimmed" fw={500}>Severity</Text>
                        <StatusBadge
                          status={getSeverityStatus(selectedIncidentData.severity)}
                          label={selectedIncidentData.severity?.toUpperCase() || 'Unknown'}
                        />
                      </div>
                      <div>
                        <Text size="xs" c="dimmed" fw={500}>Status</Text>
                        <StatusBadge
                          status={getStatusStatus(selectedIncidentData.status)}
                          label={selectedIncidentData.status ? selectedIncidentData.status.charAt(0).toUpperCase() + selectedIncidentData.status.slice(1) : 'Unknown'}
                        />
                      </div>
                    </Group>
                    <div>
                      <Text size="xs" c="dimmed" fw={500}>Type</Text>
                      <Text>{selectedIncidentData.incident_type}</Text>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed" fw={500}>Reported</Text>
                      <Text>{new Date(selectedIncidentData.created_at).toLocaleString()}</Text>
                    </div>
                  </Stack>
                </Card>
              </Stack>
            </Tabs.Panel>
            <Tabs.Panel value="activity" pt="md">
              <Text size="sm" c="dimmed">Activity feed coming soon...</Text>
            </Tabs.Panel>
          </Tabs>
        ) : (
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
            </Stack>
          </form>
        )}
      </DetailDrawer>
    </Stack>
  );
};

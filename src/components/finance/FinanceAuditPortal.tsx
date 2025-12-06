import React, { useEffect, useState } from 'react';
import {
  Card,
  Text,
  Group,
  Stack,
  Loader,
  Center,
  Table,
  Badge,
  TextInput,
  Select,
  Button,
  ScrollArea,
  Modal,
  Divider,
  Title,
  Paper,
  Grid,
  Pagination,
  Alert,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import {
  IconSearch,
  IconFilter,
  IconEye,
  IconDownload,
  IconShield,
  IconAlertTriangle,
  IconCheck,
  IconX,
  IconFileText,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';
import { notifications } from '@mantine/notifications';

interface AuditEntry {
  id: string;
  timestamp: string;
  user_id: string | null;
  user_email?: string;
  user_name?: string;
  user_role?: string;
  action_type: string;
  action_category?: string;
  action_description: string;
  resource_type?: string;
  resource_id?: string | null;
  severity?: string;
  compliance_tag?: string | null;
  ip_address?: string;
  user_agent?: string;
  old_values?: any;
  new_values?: any;
  metadata?: any;
  source: 'finance' | 'unified' | 'admin' | 'ceo';
}

export const FinanceAuditPortal: React.FC = () => {
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(dayjs().subtract(30, 'days').toDate());
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
  const [detailModalOpened, setDetailModalOpened] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    fetchAuditData();
  }, [actionFilter, severityFilter, categoryFilter, startDate, endDate, currentPage]);

  const fetchAuditData = async () => {
    setLoading(true);
    try {
      const startDateStr = startDate ? dayjs(startDate).startOf('day').toISOString() : null;
      const endDateStr = endDate ? dayjs(endDate).endOf('day').toISOString() : null;

      // Fetch from finance-related audit tables only
      const queries: Promise<any>[] = [];

      // 1. Audit Logs (from finance audit system) - primary source
      let auditLogsQuery = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('entered_date', { ascending: false })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      if (startDateStr) auditLogsQuery = auditLogsQuery.gte('entered_date', startDateStr);
      if (endDateStr) auditLogsQuery = auditLogsQuery.lte('entered_date', endDateStr);
      if (actionFilter) auditLogsQuery = auditLogsQuery.eq('transaction_type', actionFilter);
      if (severityFilter) auditLogsQuery = auditLogsQuery.eq('severity', severityFilter);

      queries.push(auditLogsQuery.then(res => ({
        data: (res.data || []).map((item: any) => ({
          ...item,
          source: 'audit_logs' as const,
          timestamp: item.entered_date || item.created_at,
          action_type: item.transaction_type,
          action_description: `${item.transaction_type} transaction - ${item.source}`,
          resource_type: item.transaction_type,
          resource_id: item.transaction_id,
        })),
        count: res.count || 0,
      })).catch(() => ({ data: [], count: 0 }))); // Gracefully handle if table doesn't exist

      // 2. Unified Audit Trail - ONLY financial category
      let unifiedQuery = supabase
        .from('unified_audit_trail')
        .select('*', { count: 'exact' })
        .eq('action_category', 'financial') // Only financial actions
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      if (startDateStr) unifiedQuery = unifiedQuery.gte('created_at', startDateStr);
      if (endDateStr) unifiedQuery = unifiedQuery.lte('created_at', endDateStr);
      if (actionFilter) unifiedQuery = unifiedQuery.eq('action_type', actionFilter);
      if (severityFilter) unifiedQuery = unifiedQuery.eq('severity', severityFilter);

      queries.push(unifiedQuery.then(res => ({
        data: (res.data || []).map((item: any) => ({
          ...item,
          source: 'unified' as const,
          timestamp: item.created_at,
          resource_type: item.target_resource_type,
          resource_id: item.target_resource_id,
        })),
        count: res.count || 0,
      })).catch(() => ({ data: [], count: 0 }))); // Gracefully handle if table doesn't exist

      // 3. Admin Audit Logs - ONLY finance-related entities
      const financeEntityTypes = ['invoice', 'payment', 'expense', 'budget', 'financial_approval', 'bank_account', 'transaction', 'reconciliation', 'tax', 'payroll'];
      let adminQuery = supabase
        .from('admin_audit_logs')
        .select('*', { count: 'exact' })
        .in('entity_type', financeEntityTypes) // Only finance-related entities
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      if (startDateStr) adminQuery = adminQuery.gte('created_at', startDateStr);
      if (endDateStr) adminQuery = adminQuery.lte('created_at', endDateStr);
      if (actionFilter) adminQuery = adminQuery.eq('action', actionFilter);

      queries.push(adminQuery.then(res => ({
        data: (res.data || []).map((item: any) => ({
          ...item,
          source: 'admin' as const,
          timestamp: item.created_at,
          action_type: item.action,
          action_description: `${item.action} on ${item.entity_type}`,
          resource_type: item.entity_type,
          resource_id: item.entity_id,
          user_id: item.admin_id,
        })),
        count: res.count || 0,
      })).catch(() => ({ data: [], count: 0 }))); // Gracefully handle if table doesn't exist

      // 4. CEO Audit Trail - ONLY financial resource types
      const financeResourceTypes = ['financial_approval', 'invoice', 'payment', 'expense', 'budget', 'bank_account', 'transaction'];
      let ceoQuery = supabase
        .from('ceo_audit_trail')
        .select('*', { count: 'exact' })
        .in('target_resource_type', financeResourceTypes) // Only finance-related resources
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      if (startDateStr) ceoQuery = ceoQuery.gte('created_at', startDateStr);
      if (endDateStr) ceoQuery = ceoQuery.lte('created_at', endDateStr);
      if (actionFilter) ceoQuery = ceoQuery.eq('action_type', actionFilter);

      queries.push(ceoQuery.then(res => ({
        data: (res.data || []).map((item: any) => ({
          ...item,
          source: 'ceo' as const,
          timestamp: item.created_at,
          action_description: item.action_description,
          resource_type: item.target_resource_type,
          resource_id: item.target_resource_id,
          user_id: item.ceo_user_id,
        })),
        count: res.count || 0,
      })).catch(() => ({ data: [], count: 0 }))); // Gracefully handle if table doesn't exist or RLS blocks access

      const results = await Promise.allSettled(queries);
      
      const allEntries: AuditEntry[] = [];
      let totalCount = 0;

      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.data) {
          allEntries.push(...result.value.data);
          totalCount += result.value.count || 0;
        }
      });

      // Sort by timestamp (most recent first)
      allEntries.sort((a, b) => 
        dayjs(b.timestamp).valueOf() - dayjs(a.timestamp).valueOf()
      );

      // Apply search filter
      const filtered = searchTerm
        ? allEntries.filter(entry =>
            entry.action_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            entry.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            entry.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            entry.resource_type?.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : allEntries;

      setAuditEntries(filtered);
      setTotalPages(Math.ceil(totalCount / itemsPerPage));
    } catch (err) {
      console.error('Error loading audit data:', err);
      notifications.show({
        title: 'Error',
        message: 'Failed to load audit data',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
      case 'high':
        return 'red';
      case 'warning':
      case 'normal':
        return 'yellow';
      case 'low':
      case 'info':
        return 'blue';
      default:
        return 'gray';
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType?.toLowerCase()) {
      case 'create':
      case 'insert':
        return <IconCheck size={16} color="green" />;
      case 'update':
        return <IconFileText size={16} color="blue" />;
      case 'delete':
      case 'remove':
        return <IconX size={16} color="red" />;
      case 'approve':
        return <IconCheck size={16} color="green" />;
      case 'reject':
      case 'deny':
        return <IconX size={16} color="red" />;
      default:
        return <IconEye size={16} />;
    }
  };

  const exportToCSV = () => {
    const headers = ['Timestamp', 'User', 'Role', 'Action', 'Resource Type', 'Resource ID', 'Severity', 'Compliance Tag', 'Source'];
    const rows = auditEntries.map(entry => [
      dayjs(entry.timestamp).format('YYYY-MM-DD HH:mm:ss'),
      entry.user_email || entry.user_name || 'N/A',
      entry.user_role || 'N/A',
      entry.action_type,
      entry.resource_type || 'N/A',
      entry.resource_id || 'N/A',
      entry.severity || 'N/A',
      entry.compliance_tag || 'N/A',
      entry.source,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_log_${dayjs().format('YYYY-MM-DD')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    notifications.show({
      title: 'Export Complete',
      message: 'Audit log exported to CSV',
      color: 'green',
    });
  };

  if (loading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Stack gap="lg" p="lg">
      <Card p="xl" withBorder style={{ backgroundColor: '#f8f9fa' }}>
        <Group justify="space-between" mb="md">
          <div>
            <Title order={2} mb="xs">
              Finance Audit Portal
            </Title>
            <Text c="dimmed" size="sm">
              Comprehensive read-only audit trail of all finance department activities
            </Text>
          </div>
          <Badge size="lg" color="blue" leftSection={<IconShield size={16} />}>
            Read-Only
          </Badge>
        </Group>

        <Alert color="blue" icon={<IconShield size={16} />} mb="lg">
          <Text size="sm">
            This portal provides a complete, immutable audit trail of finance department activities only.
            All entries are read-only and cannot be modified or deleted.
            This ensures compliance with SOX, GDPR, and other financial regulatory requirements.
          </Text>
        </Alert>

        <Grid gutter="md" mb="lg">
          <Grid.Col span={{ base: 12, md: 4 }}>
            <TextInput
              placeholder="Search audit entries..."
              leftSection={<IconSearch size={16} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 2 }}>
            <Select
              placeholder="Action Type"
              data={['create', 'update', 'delete', 'approve', 'reject', 'view', 'export']}
              value={actionFilter}
              onChange={setActionFilter}
              clearable
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 2 }}>
            <Select
              placeholder="Severity"
              data={['critical', 'high', 'normal', 'low', 'info']}
              value={severityFilter}
              onChange={setSeverityFilter}
              clearable
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 2 }}>
            <Select
              placeholder="Category"
              data={['financial', 'personnel', 'system', 'security', 'compliance']}
              value={categoryFilter}
              onChange={setCategoryFilter}
              clearable
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 2 }}>
            <Button
              leftSection={<IconDownload size={16} />}
              onClick={exportToCSV}
              variant="light"
              fullWidth
            >
              Export CSV
            </Button>
          </Grid.Col>
        </Grid>

        <Grid gutter="md" mb="lg">
          <Grid.Col span={{ base: 12, md: 6 }}>
            <DatePickerInput
              label="Start Date"
              value={startDate}
              onChange={setStartDate}
              placeholder="Select start date"
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <DatePickerInput
              label="End Date"
              value={endDate}
              onChange={setEndDate}
              placeholder="Select end date"
            />
          </Grid.Col>
        </Grid>
      </Card>

      <Card p="lg" withBorder>
        <Group justify="space-between" mb="md">
          <Text fw={700} size="xl">
            Audit Entries ({auditEntries.length})
          </Text>
          <Badge color="blue">{auditEntries.length} total entries</Badge>
        </Group>

        {auditEntries.length === 0 ? (
          <Center h={200}>
            <Stack align="center" gap="md">
              <IconFileText size={48} color="gray" />
              <Text c="dimmed">No audit entries found for the selected filters.</Text>
            </Stack>
          </Center>
        ) : (
          <>
            <ScrollArea h={600}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Timestamp</Table.Th>
                    <Table.Th>User</Table.Th>
                    <Table.Th>Action</Table.Th>
                    <Table.Th>Resource</Table.Th>
                    <Table.Th>Severity</Table.Th>
                    <Table.Th>Compliance</Table.Th>
                    <Table.Th>Source</Table.Th>
                    <Table.Th>Details</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {auditEntries.map((entry) => (
                    <Table.Tr key={`${entry.source}-${entry.id}`}>
                      <Table.Td>
                        <Text size="sm" ff="monospace">
                          {dayjs(entry.timestamp).format('YYYY-MM-DD HH:mm:ss')}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Stack gap={2}>
                          <Text size="sm" fw={500}>
                            {entry.user_name || entry.user_email || 'System'}
                          </Text>
                          {entry.user_role && (
                            <Badge size="xs" variant="light">
                              {entry.user_role}
                            </Badge>
                          )}
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          {getActionIcon(entry.action_type)}
                          <Text size="sm">{entry.action_type}</Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Stack gap={2}>
                          <Text size="sm">
                            {entry.resource_type || 'N/A'}
                          </Text>
                          {entry.resource_id && (
                            <Text size="xs" c="dimmed" ff="monospace">
                              {entry.resource_id.substring(0, 8)}...
                            </Text>
                          )}
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={getSeverityColor(entry.severity)} size="sm">
                          {entry.severity || 'N/A'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        {entry.compliance_tag ? (
                          <Badge color="blue" size="sm" variant="light">
                            {entry.compliance_tag.toUpperCase()}
                          </Badge>
                        ) : (
                          <Text size="sm" c="dimmed">-</Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Badge size="sm" variant="outline">
                          {entry.source}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Tooltip label="View Details">
                          <ActionIcon
                            variant="light"
                            color="blue"
                            onClick={() => {
                              setSelectedEntry(entry);
                              setDetailModalOpened(true);
                            }}
                          >
                            <IconEye size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>

            {totalPages > 1 && (
              <Group justify="center" mt="md">
                <Pagination
                  value={currentPage}
                  onChange={setCurrentPage}
                  total={totalPages}
                />
              </Group>
            )}
          </>
        )}
      </Card>

      {/* Detail Modal */}
      <Modal
        opened={detailModalOpened}
        onClose={() => setDetailModalOpened(false)}
        title="Audit Entry Details"
        size="lg"
      >
        {selectedEntry && (
          <Stack gap="md">
            <Paper p="md" withBorder>
              <Title order={4} mb="md">Basic Information</Title>
              <Table>
                <Table.Tbody>
                  <Table.Tr>
                    <Table.Td fw={600}>Timestamp</Table.Td>
                    <Table.Td>{dayjs(selectedEntry.timestamp).format('YYYY-MM-DD HH:mm:ss')}</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td fw={600}>User</Table.Td>
                    <Table.Td>{selectedEntry.user_name || selectedEntry.user_email || 'System'}</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td fw={600}>Role</Table.Td>
                    <Table.Td>{selectedEntry.user_role || 'N/A'}</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td fw={600}>Action</Table.Td>
                    <Table.Td>{selectedEntry.action_type}</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td fw={600}>Description</Table.Td>
                    <Table.Td>{selectedEntry.action_description}</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td fw={600}>Resource Type</Table.Td>
                    <Table.Td>{selectedEntry.resource_type || 'N/A'}</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td fw={600}>Resource ID</Table.Td>
                    <Table.Td>
                      <Text ff="monospace" size="sm">{selectedEntry.resource_id || 'N/A'}</Text>
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td fw={600}>Severity</Table.Td>
                    <Table.Td>
                      <Badge color={getSeverityColor(selectedEntry.severity)}>
                        {selectedEntry.severity || 'N/A'}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td fw={600}>Compliance Tag</Table.Td>
                    <Table.Td>{selectedEntry.compliance_tag || 'N/A'}</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td fw={600}>Source</Table.Td>
                    <Table.Td>
                      <Badge>{selectedEntry.source}</Badge>
                    </Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            </Paper>

            {selectedEntry.old_values && Object.keys(selectedEntry.old_values).length > 0 && (
              <Paper p="md" withBorder>
                <Title order={4} mb="md">Previous Values</Title>
                <ScrollArea h={200}>
                  <pre style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                    {JSON.stringify(selectedEntry.old_values, null, 2)}
                  </pre>
                </ScrollArea>
              </Paper>
            )}

            {selectedEntry.new_values && Object.keys(selectedEntry.new_values).length > 0 && (
              <Paper p="md" withBorder>
                <Title order={4} mb="md">New Values</Title>
                <ScrollArea h={200}>
                  <pre style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                    {JSON.stringify(selectedEntry.new_values, null, 2)}
                  </pre>
                </ScrollArea>
              </Paper>
            )}

            {selectedEntry.metadata && Object.keys(selectedEntry.metadata).length > 0 && (
              <Paper p="md" withBorder>
                <Title order={4} mb="md">Metadata</Title>
                <ScrollArea h={200}>
                  <pre style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                    {JSON.stringify(selectedEntry.metadata, null, 2)}
                  </pre>
                </ScrollArea>
              </Paper>
            )}

            {selectedEntry.ip_address && (
              <Paper p="md" withBorder>
                <Title order={4} mb="md">Technical Details</Title>
                <Table>
                  <Table.Tbody>
                    <Table.Tr>
                      <Table.Td fw={600}>IP Address</Table.Td>
                      <Table.Td>
                        <Text ff="monospace" size="sm">{selectedEntry.ip_address}</Text>
                      </Table.Td>
                    </Table.Tr>
                    {selectedEntry.user_agent && (
                      <Table.Tr>
                        <Table.Td fw={600}>User Agent</Table.Td>
                        <Table.Td>
                          <Text size="sm">{selectedEntry.user_agent}</Text>
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </Table.Tbody>
                </Table>
              </Paper>
            )}
          </Stack>
        )}
      </Modal>
    </Stack>
  );
};


import React, { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Stack,
  Card,
  Table,
  Badge,
  Button,
  Group,
  TextInput,
  Select,
  Loader,
  Alert,
  Modal,
  Paper,
  Tabs,
  Grid,
  ScrollArea,
  ActionIcon,
  Tooltip,
  Divider,
  Timeline,
  Box,
} from '@mantine/core';
import {
  IconFolder,
  IconDownload,
  IconEye,
  IconFileText,
  IconSearch,
  IconFilter,
  IconCalendar,
  IconUser,
  IconShield,
  IconCheck,
  IconX,
  IconClock,
  IconArchive,
  IconHistory,
  IconBuilding,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';

interface FilingRecord {
  id: string;
  record_type: 'document' | 'action' | 'process' | 'status_change';
  category: string;
  title: string;
  description?: string;
  related_entity_type?: string; // 'appointment', 'resolution', 'workflow', 'officer'
  related_entity_id?: string;
  document_url?: string;
  status?: string;
  metadata?: any;
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

interface ExecutiveStatus {
  id: string;
  name: string;
  title: string;
  email: string;
  status: 'active' | 'removed' | 'resigned' | 'terminated';
  appointment_date?: string;
  removal_date?: string;
  resignation_date?: string;
  removal_reason?: string;
  resignation_reason?: string;
}

const RecordFilingSystem: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('documents');
  const [records, setRecords] = useState<FilingRecord[]>([]);
  const [executives, setExecutives] = useState<ExecutiveStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<FilingRecord | null>(null);

  useEffect(() => {
    loadAllRecords();
    loadExecutiveStatuses();
  }, [categoryFilter, typeFilter]);

  const loadAllRecords = async () => {
    setLoading(true);
    try {
      // Load from multiple sources and consolidate
      const [
        { data: execDocs },
        { data: resolutions },
        { data: appointments },
        { data: workflows },
        { data: logs },
      ] = await Promise.all([
        supabase
          .from('executive_documents')
          .select('id, type, file_url, signature_status, created_at, appointment_id, officer_name')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('governance_board_resolutions')
          .select('id, resolution_number, title, description, type, status, created_at, appointment_id')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('executive_appointments')
          .select('id, proposed_officer_name, proposed_title, status, created_at, effective_date')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('exit_workflows')
          .select('id, workflow_type, termination_type, status, effective_date, termination_reason, created_at')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('governance_logs')
          .select('id, action, entity_type, entity_id, description, timestamp, data')
          .order('timestamp', { ascending: false })
          .limit(200),
      ]);

      const allRecords: FilingRecord[] = [];

      // Convert executive documents
      if (execDocs) {
        execDocs.forEach((doc) => {
          allRecords.push({
            id: doc.id,
            record_type: 'document',
            category: 'executive_documents',
            title: `${doc.type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())} - ${doc.officer_name || 'Unknown'}`,
            description: `Executive document: ${doc.type}`,
            related_entity_type: 'appointment',
            related_entity_id: doc.appointment_id,
            document_url: doc.file_url,
            status: doc.signature_status,
            created_at: doc.created_at,
          });
        });
      }

      // Convert resolutions
      if (resolutions) {
        resolutions.forEach((res) => {
          allRecords.push({
            id: res.id,
            record_type: 'process',
            category: 'board_resolutions',
            title: `${res.resolution_number}: ${res.title}`,
            description: res.description,
            related_entity_type: 'resolution',
            related_entity_id: res.id,
            status: res.status,
            metadata: { type: res.type, appointment_id: res.appointment_id },
            created_at: res.created_at,
          });
        });
      }

      // Convert appointments
      if (appointments) {
        appointments.forEach((apt) => {
          allRecords.push({
            id: apt.id,
            record_type: 'process',
            category: 'executive_appointments',
            title: `Appointment: ${apt.proposed_officer_name} as ${apt.proposed_title}`,
            description: `Executive appointment - ${apt.status}`,
            related_entity_type: 'appointment',
            related_entity_id: apt.id,
            status: apt.status,
            metadata: { effective_date: apt.effective_date },
            created_at: apt.created_at,
          });
        });
      }

      // Convert exit workflows
      if (workflows) {
        workflows.forEach((wf) => {
          allRecords.push({
            id: wf.id,
            record_type: 'process',
            category: 'exit_workflows',
            title: `${wf.workflow_type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())} - ${wf.termination_type || 'N/A'}`,
            description: wf.termination_reason,
            related_entity_type: 'workflow',
            related_entity_id: wf.id,
            status: wf.status,
            metadata: { effective_date: wf.effective_date, termination_type: wf.termination_type },
            created_at: wf.created_at,
          });
        });
      }

      // Convert governance logs
      if (logs) {
        logs.forEach((log) => {
          allRecords.push({
            id: log.id,
            record_type: 'action',
            category: 'governance_actions',
            title: `${log.action} - ${log.entity_type}`,
            description: log.description,
            related_entity_type: log.entity_type,
            related_entity_id: log.entity_id,
            metadata: log.data,
            created_at: log.timestamp,
          });
        });
      }

      // Sort by date
      allRecords.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setRecords(allRecords);
    } catch (error: any) {
      console.error('Error loading records:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load filing records',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadExecutiveStatuses = async () => {
    try {
      // Load active executives
      const { data: activeOfficers } = await supabase
        .from('corporate_officers')
        .select('id, officer_name, title, email, status, appointment_date')
        .in('status', ['ACTIVE', 'REMOVED', 'RESIGNED', 'TERMINATED'])
        .order('appointment_date', { ascending: false });

      // Load exit workflows for removed/resigned
      const { data: exits } = await supabase
        .from('exit_workflows')
        .select('*, employee:employees(first_name, last_name, email, position)')
        .in('status', ['completed', 'board_approved'])
        .order('effective_date', { ascending: false });

      const executiveList: ExecutiveStatus[] = [];

      // Add active officers
      if (activeOfficers) {
        activeOfficers.forEach((officer) => {
          executiveList.push({
            id: officer.id,
            name: officer.officer_name,
            title: officer.title,
            email: officer.email,
            status: officer.status.toLowerCase() as any,
            appointment_date: officer.appointment_date,
          });
        });
      }

      // Add removed/resigned from exit workflows
      if (exits) {
        exits.forEach((exit: any) => {
          if (exit.employee) {
            const existing = executiveList.find(
              (e) => e.email === exit.employee.email
            );
            if (!existing) {
              executiveList.push({
                id: exit.id,
                name: `${exit.employee.first_name} ${exit.employee.last_name}`,
                title: exit.employee.position,
                email: exit.employee.email,
                status: exit.workflow_type === 'executive_removal' ? 'removed' : 'resigned',
                removal_date: exit.effective_date,
                removal_reason: exit.termination_reason,
              });
            }
          }
        });
      }

      setExecutives(executiveList);
    } catch (error: any) {
      console.error('Error loading executive statuses:', error);
    }
  };

  const filteredRecords = records.filter((record) => {
    const matchesSearch =
      !searchTerm ||
      record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || record.category === categoryFilter;
    const matchesType = typeFilter === 'all' || record.record_type === typeFilter;
    return matchesSearch && matchesCategory && matchesType;
  });

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    const statusMap: Record<string, { color: string; label: string }> = {
      signed: { color: 'green', label: 'Signed' },
      pending: { color: 'yellow', label: 'Pending' },
      ADOPTED: { color: 'green', label: 'Adopted' },
      EXECUTED: { color: 'blue', label: 'Executed' },
      PENDING_VOTE: { color: 'yellow', label: 'Pending Vote' },
      REJECTED: { color: 'red', label: 'Rejected' },
      active: { color: 'green', label: 'Active' },
      removed: { color: 'red', label: 'Removed' },
      resigned: { color: 'orange', label: 'Resigned' },
      terminated: { color: 'red', label: 'Terminated' },
    };
    const statusInfo = statusMap[status] || { color: 'gray', label: status };
    return <Badge color={statusInfo.color} variant="light">{statusInfo.label}</Badge>;
  };

  const getExecutiveStatusBadge = (executive: ExecutiveStatus) => {
    const statusMap = {
      active: { color: 'green', icon: <IconCheck size={14} />, label: 'Active' },
      removed: { color: 'red', icon: <IconX size={14} />, label: 'Removed' },
      resigned: { color: 'orange', icon: <IconClock size={14} />, label: 'Resigned' },
      terminated: { color: 'red', icon: <IconX size={14} />, label: 'Terminated' },
    };
    const statusInfo = statusMap[executive.status] || statusMap.active;
    return (
      <Badge color={statusInfo.color} variant="light" leftSection={statusInfo.icon}>
        {statusInfo.label}
      </Badge>
    );
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Box
          style={{
            background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
            borderRadius: '12px',
            padding: '32px',
            color: 'white',
          }}
        >
          <Group gap={16} mb={8}>
            <Box
              style={{
                backgroundColor: 'rgba(255, 106, 0, 0.2)',
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconArchive size={40} color="#ff6a00" stroke={2.5} />
            </Box>
            <div>
              <Title order={1} c="white" mb={4} style={{ letterSpacing: '0.5px' }}>
                Record Filing System
              </Title>
              <Text c="gray.3" size="lg" style={{ letterSpacing: '0.3px' }}>
                Comprehensive document and process record management
              </Text>
            </div>
          </Group>
        </Box>

        <Card padding={0} radius="md" withBorder>
          <Tabs value={activeTab} onChange={(value) => value && setActiveTab(value)}>
            <Tabs.List style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb', padding: '8px 16px' }}>
              <Tabs.Tab value="documents" leftSection={<IconFileText size={18} />}>
                Documents
              </Tabs.Tab>
              <Tabs.Tab value="processes" leftSection={<IconHistory size={18} />}>
                Processes
              </Tabs.Tab>
              <Tabs.Tab value="executives" leftSection={<IconUser size={18} />}>
                Executive Status
              </Tabs.Tab>
              <Tabs.Tab value="actions" leftSection={<IconShield size={18} />}>
                Actions & Logs
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="documents" pt="xl" px="xl" pb="xl">
              <Stack gap="md">
                <Group justify="space-between">
                  <TextInput
                    placeholder="Search documents..."
                    leftSection={<IconSearch size={16} />}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ flex: 1, maxWidth: 400 }}
                  />
                  <Group gap="xs">
                    <Select
                      placeholder="Category"
                      data={[
                        { value: 'all', label: 'All Categories' },
                        { value: 'executive_documents', label: 'Executive Documents' },
                        { value: 'board_resolutions', label: 'Board Resolutions' },
                        { value: 'governance_actions', label: 'Governance Actions' },
                      ]}
                      value={categoryFilter}
                      onChange={(value) => setCategoryFilter(value || 'all')}
                      style={{ width: 200 }}
                    />
                    <Select
                      placeholder="Type"
                      data={[
                        { value: 'all', label: 'All Types' },
                        { value: 'document', label: 'Documents' },
                        { value: 'action', label: 'Actions' },
                        { value: 'process', label: 'Processes' },
                      ]}
                      value={typeFilter}
                      onChange={(value) => setTypeFilter(value || 'all')}
                      style={{ width: 150 }}
                    />
                  </Group>
                </Group>

                {loading ? (
                  <Loader />
                ) : (
                  <ScrollArea h={600}>
                    <Table>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Title</Table.Th>
                          <Table.Th>Category</Table.Th>
                          <Table.Th>Status</Table.Th>
                          <Table.Th>Date</Table.Th>
                          <Table.Th>Actions</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {filteredRecords
                          .filter((r) => r.record_type === 'document' || activeTab === 'documents')
                          .map((record) => (
                            <Table.Tr key={record.id}>
                              <Table.Td>
                                <Text fw={500}>{record.title}</Text>
                                {record.description && (
                                  <Text size="xs" c="dimmed">
                                    {record.description}
                                  </Text>
                                )}
                              </Table.Td>
                              <Table.Td>
                                <Badge variant="light">{record.category.replace(/_/g, ' ')}</Badge>
                              </Table.Td>
                              <Table.Td>{getStatusBadge(record.status)}</Table.Td>
                              <Table.Td>
                                <Text size="sm">{dayjs(record.created_at).format('MMM D, YYYY')}</Text>
                              </Table.Td>
                              <Table.Td>
                                <Group gap="xs">
                                  {record.document_url && (
                                    <Tooltip label="View Document">
                                      <ActionIcon
                                        variant="light"
                                        onClick={() => {
                                          setSelectedRecord(record);
                                          setViewModalOpen(true);
                                        }}
                                      >
                                        <IconEye size={16} />
                                      </ActionIcon>
                                    </Tooltip>
                                  )}
                                  {record.document_url && (
                                    <Tooltip label="Download">
                                      <ActionIcon
                                        variant="light"
                                        component="a"
                                        href={record.document_url}
                                        download
                                      >
                                        <IconDownload size={16} />
                                      </ActionIcon>
                                    </Tooltip>
                                  )}
                                </Group>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>
                )}
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="processes" pt="xl" px="xl" pb="xl">
              <Stack gap="md">
                <Group justify="space-between">
                  <TextInput
                    placeholder="Search processes..."
                    leftSection={<IconSearch size={16} />}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ flex: 1, maxWidth: 400 }}
                  />
                </Group>

                {loading ? (
                  <Loader />
                ) : (
                  <ScrollArea h={600}>
                    <Table>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Process</Table.Th>
                          <Table.Th>Category</Table.Th>
                          <Table.Th>Status</Table.Th>
                          <Table.Th>Date</Table.Th>
                          <Table.Th>Actions</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {filteredRecords
                          .filter((r) => r.record_type === 'process')
                          .map((record) => (
                            <Table.Tr key={record.id}>
                              <Table.Td>
                                <Text fw={500}>{record.title}</Text>
                                {record.description && (
                                  <Text size="xs" c="dimmed">
                                    {record.description}
                                  </Text>
                                )}
                              </Table.Td>
                              <Table.Td>
                                <Badge variant="light">{record.category.replace(/_/g, ' ')}</Badge>
                              </Table.Td>
                              <Table.Td>{getStatusBadge(record.status)}</Table.Td>
                              <Table.Td>
                                <Text size="sm">{dayjs(record.created_at).format('MMM D, YYYY')}</Text>
                              </Table.Td>
                              <Table.Td>
                                <Button size="xs" variant="light">
                                  View Details
                                </Button>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>
                )}
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="executives" pt="xl" px="xl" pb="xl">
              <Stack gap="md">
                <Alert color="blue" variant="light">
                  Complete status of all executives - active, removed, and resigned
                </Alert>

                <ScrollArea h={600}>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Name</Table.Th>
                        <Table.Th>Title</Table.Th>
                        <Table.Th>Email</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>Appointment Date</Table.Th>
                        <Table.Th>Removal/Resignation</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {executives.map((exec) => (
                        <Table.Tr key={exec.id}>
                          <Table.Td>
                            <Text fw={500}>{exec.name}</Text>
                          </Table.Td>
                          <Table.Td>{exec.title}</Table.Td>
                          <Table.Td>{exec.email}</Table.Td>
                          <Table.Td>{getExecutiveStatusBadge(exec)}</Table.Td>
                          <Table.Td>
                            {exec.appointment_date ? (
                              <Text size="sm">{dayjs(exec.appointment_date).format('MMM D, YYYY')}</Text>
                            ) : (
                              <Text size="sm" c="dimmed">N/A</Text>
                            )}
                          </Table.Td>
                          <Table.Td>
                            {exec.removal_date && (
                              <div>
                                <Text size="sm" c="red">
                                  {dayjs(exec.removal_date).format('MMM D, YYYY')}
                                </Text>
                                {exec.removal_reason && (
                                  <Text size="xs" c="dimmed">
                                    {exec.removal_reason}
                                  </Text>
                                )}
                              </div>
                            )}
                            {exec.resignation_date && (
                              <div>
                                <Text size="sm" c="orange">
                                  {dayjs(exec.resignation_date).format('MMM D, YYYY')}
                                </Text>
                                {exec.resignation_reason && (
                                  <Text size="xs" c="dimmed">
                                    {exec.resignation_reason}
                                  </Text>
                                )}
                              </div>
                            )}
                            {!exec.removal_date && !exec.resignation_date && (
                              <Text size="sm" c="dimmed">N/A</Text>
                            )}
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="actions" pt="xl" px="xl" pb="xl">
              <Stack gap="md">
                <Group justify="space-between">
                  <TextInput
                    placeholder="Search actions..."
                    leftSection={<IconSearch size={16} />}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ flex: 1, maxWidth: 400 }}
                  />
                </Group>

                {loading ? (
                  <Loader />
                ) : (
                  <ScrollArea h={600}>
                    <Table>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Action</Table.Th>
                          <Table.Th>Entity</Table.Th>
                          <Table.Th>Description</Table.Th>
                          <Table.Th>Date</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {filteredRecords
                          .filter((r) => r.record_type === 'action')
                          .map((record) => (
                            <Table.Tr key={record.id}>
                              <Table.Td>
                                <Badge variant="light" color="blue">{record.title}</Badge>
                              </Table.Td>
                              <Table.Td>
                                <Badge variant="light">{record.related_entity_type}</Badge>
                              </Table.Td>
                              <Table.Td>
                                <Text size="sm">{record.description}</Text>
                              </Table.Td>
                              <Table.Td>
                                <Text size="sm">{dayjs(record.created_at).format('MMM D, YYYY HH:mm')}</Text>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>
                )}
              </Stack>
            </Tabs.Panel>
          </Tabs>
        </Card>

        {/* Document Viewer Modal */}
        <Modal
          opened={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          title={selectedRecord?.title}
          size="xl"
        >
          {selectedRecord?.document_url && (
            <iframe
              src={selectedRecord.document_url}
              style={{ width: '100%', height: '600px', border: 'none' }}
              title={selectedRecord.title}
            />
          )}
        </Modal>
      </Stack>
    </Container>
  );
};

export default RecordFilingSystem;















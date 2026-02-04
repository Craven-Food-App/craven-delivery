// @ts-nocheck
import React, { useEffect, useState } from 'react';
import {
  Modal,
  Stack,
  Text,
  Group,
  Badge,
  Divider,
  Table,
  Card,
  Tabs,
  ScrollArea,
  Paper,
  Title,
  Alert,
  Timeline,
  Code,
  Grid,
} from '@mantine/core';
import {
  IconShield,
  IconFileText,
  IconMapPin,
  IconDeviceDesktop,
  IconUser,
  IconAlertTriangle,
  IconClock,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';
import { AuditLog, AuditDocument, AuditTrailEntry } from './types';
import { CFOActionPanel } from './CFOActionPanel';

interface AuditDetailPanelProps {
  log: AuditLog | null;
  opened: boolean;
  onClose: () => void;
  onActionComplete?: () => void;
}

export const AuditDetailPanel: React.FC<AuditDetailPanelProps> = ({
  log,
  opened,
  onClose,
  onActionComplete,
}) => {
  const [documents, setDocuments] = useState<AuditDocument[]>([]);
  const [trailEntries, setTrailEntries] = useState<AuditTrailEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (log) {
      fetchRelatedData();
    }
  }, [log]);

  const fetchRelatedData = async () => {
    if (!log) return;
    setLoading(true);
    try {
      const [docsRes, trailRes] = await Promise.all([
        supabase
          .from('audit_documents')
          .select('*')
          .eq('audit_log_id', log.id)
          .order('uploaded_at', { ascending: false }),
        supabase
          .from('audit_trail')
          .select('*')
          .eq('target_type', 'audit_log')
          .eq('target_id', log.id)
          .order('created_at', { ascending: false }),
      ]);

      if (docsRes.data) setDocuments(docsRes.data as AuditDocument[]);
      if (trailRes.data) setTrailEntries(trailRes.data as AuditTrailEntry[]);
    } catch (error) {
      console.error('Error fetching related data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!log) return null;

  const formatCurrency = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Audit Case File"
      size="xl"
      scrollAreaComponent={ScrollArea.Autosize}
    >
      <Tabs defaultValue="overview">
        <Tabs.List>
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
          <Tabs.Tab value="documents">Documents ({documents.length})</Tabs.Tab>
          <Tabs.Tab value="trail">Audit Trail</Tabs.Tab>
          <Tabs.Tab value="actions">CFO Actions</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          <Stack gap="md">
            {/* Header */}
            <Card withBorder p="md" style={{ backgroundColor: '#f8f9fa' }}>
              <Group justify="space-between" mb="md">
                <div>
                  <Title order={4} mb="xs">Transaction {log.transaction_id || log.id.substring(0, 8)}</Title>
                  <Text c="dimmed" size="sm">
                    {dayjs(log.transaction_date).format('MMMM D, YYYY')} • {log.transaction_type}
                  </Text>
                </div>
                <Badge color={log.status === 'cleared' ? 'green' : log.status === 'flagged' ? 'red' : 'yellow'} size="lg">
                  {log.status}
                </Badge>
              </Group>
              <Group>
                <Badge color={log.severity === 'critical' ? 'red' : log.severity === 'high' ? 'orange' : 'blue'} size="sm">
                  {log.severity} severity
                </Badge>
                {log.anomaly_detected && (
                  <Badge color="red" size="sm" leftSection={<IconAlertTriangle size={12} />}>
                    Anomaly Detected
                  </Badge>
                )}
                {log.locked_at && (
                  <Badge color="gray" size="sm" leftSection={<IconShield size={12} />}>
                    Locked (Immutable)
                  </Badge>
                )}
              </Group>
            </Card>

            {/* Financial Details */}
            <Card withBorder p="md">
              <Title order={5} mb="md">Financial Details</Title>
              <Table>
                <Table.Tbody>
                  <Table.Tr>
                    <Table.Td fw={600}>Amount</Table.Td>
                    <Table.Td>
                      <Text fw={700} size="lg" c={log.transaction_type === 'revenue' ? 'green' : 'red'}>
                        {formatCurrency(log.amount)}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td fw={600}>Currency</Table.Td>
                    <Table.Td>{log.currency}</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td fw={600}>Source</Table.Td>
                    <Table.Td><Badge>{log.source}</Badge></Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td fw={600}>Account Category</Table.Td>
                    <Table.Td>{log.account_category || log.expense_category || '-'}</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td fw={600}>Risk Score</Table.Td>
                    <Table.Td>
                      <Badge color={log.risk_score > 70 ? 'red' : log.risk_score > 40 ? 'yellow' : 'green'}>
                        {log.risk_score}/100
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            </Card>

            {/* Flag Information */}
            {log.flag_reason && (
              <Alert color="red" icon={<IconAlertTriangle size={16} />} title="Flagged Transaction">
                <Text fw={600} mb="xs">Flag Reason:</Text>
                <Text>{log.flag_reason}</Text>
              </Alert>
            )}

            {/* Linked Entities */}
            <Card withBorder p="md">
              <Title order={5} mb="md">Linked Entities</Title>
              <Grid>
                {log.linked_vendor_id && (
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">Vendor ID</Text>
                    <Text ff="monospace" size="sm">{log.linked_vendor_id.substring(0, 8)}...</Text>
                  </Grid.Col>
                )}
                {log.linked_driver_id && (
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">Driver ID</Text>
                    <Text ff="monospace" size="sm">{log.linked_driver_id.substring(0, 8)}...</Text>
                  </Grid.Col>
                )}
                {log.linked_merchant_id && (
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">Merchant ID</Text>
                    <Text ff="monospace" size="sm">{log.linked_merchant_id.substring(0, 8)}...</Text>
                  </Grid.Col>
                )}
                {log.linked_customer_id && (
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">Customer ID</Text>
                    <Text ff="monospace" size="sm">{log.linked_customer_id.substring(0, 8)}...</Text>
                  </Grid.Col>
                )}
                {log.linked_order_id && (
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">Order ID</Text>
                    <Text ff="monospace" size="sm">{log.linked_order_id.substring(0, 8)}...</Text>
                  </Grid.Col>
                )}
              </Grid>
            </Card>

            {/* Technical Details */}
            <Card withBorder p="md">
              <Title order={5} mb="md">Technical Details</Title>
              <Stack gap="sm">
                {log.ip_address && (
                  <Group>
                    <IconMapPin size={16} />
                    <Text size="sm"><strong>IP Address:</strong> {log.ip_address}</Text>
                  </Group>
                )}
                {log.user_agent && (
                  <Group>
                    <IconDeviceDesktop size={16} />
                    <Text size="sm"><strong>User Agent:</strong> {log.user_agent}</Text>
                  </Group>
                )}
                {log.device_info && (
                  <Group>
                    <IconDeviceDesktop size={16} />
                    <Text size="sm"><strong>Device:</strong> {JSON.stringify(log.device_info)}</Text>
                  </Group>
                )}
                {log.geo_location && (
                  <Group>
                    <IconMapPin size={16} />
                    <Text size="sm"><strong>Location:</strong> {JSON.stringify(log.geo_location)}</Text>
                  </Group>
                )}
              </Stack>
            </Card>

            {/* Notes */}
            {(log.notes || log.internal_notes || log.cfo_comment) && (
              <Card withBorder p="md">
                <Title order={5} mb="md">Notes</Title>
                {log.notes && (
                  <div mb="md">
                    <Text size="sm" fw={600} mb="xs">Public Notes:</Text>
                    <Text size="sm">{log.notes}</Text>
                  </div>
                )}
                {log.internal_notes && (
                  <div mb="md">
                    <Text size="sm" fw={600} mb="xs">Internal Notes:</Text>
                    <Text size="sm">{log.internal_notes}</Text>
                  </div>
                )}
                {log.cfo_comment && (
                  <div>
                    <Text size="sm" fw={600} mb="xs">CFO Comment:</Text>
                    <Paper p="sm" style={{ backgroundColor: '#fef3c7' }}>
                      <Text size="sm">{log.cfo_comment}</Text>
                    </Paper>
                  </div>
                )}
              </Card>
            )}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="documents" pt="md">
          <Stack gap="md">
            {documents.length === 0 ? (
              <Alert color="blue">No documents attached to this transaction</Alert>
            ) : (
              documents.map((doc) => (
                <Card key={doc.id} withBorder p="md">
                  <Group justify="space-between">
                    <div>
                      <Text fw={600}>{doc.document_name}</Text>
                      <Text size="sm" c="dimmed">
                        {doc.document_type} • {dayjs(doc.uploaded_at).format('MMM D, YYYY')}
                      </Text>
                    </div>
                    <Badge color={doc.verified ? 'green' : 'yellow'}>
                      {doc.verified ? 'Verified' : 'Unverified'}
                    </Badge>
                  </Group>
                  {doc.description && (
                    <Text size="sm" mt="xs">{doc.description}</Text>
                  )}
                </Card>
              ))
            )}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="trail" pt="md">
          <Stack gap="md">
            {trailEntries.length === 0 ? (
              <Alert color="blue">No audit trail entries for this transaction</Alert>
            ) : (
              <Timeline active={-1} bulletSize={24} lineWidth={2}>
                {trailEntries.map((entry) => (
                  <Timeline.Item
                    key={entry.id}
                    bullet={<IconClock size={12} />}
                    title={entry.action_description}
                  >
                    <Text size="sm" c="dimmed">
                      {dayjs(entry.created_at).format('MMM D, YYYY [at] h:mm A')}
                    </Text>
                    {entry.user_email && (
                      <Text size="xs" c="dimmed">By: {entry.user_email} ({entry.user_role || 'user'})</Text>
                    )}
                    {entry.changed_fields && entry.changed_fields.length > 0 && (
                      <Text size="xs" c="dimmed" mt="xs">
                        Changed: {entry.changed_fields.join(', ')}
                      </Text>
                    )}
                  </Timeline.Item>
                ))}
              </Timeline>
            )}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="actions" pt="md">
          <CFOActionPanel
            log={log}
            onActionComplete={() => {
              onActionComplete?.();
              fetchRelatedData();
            }}
          />
        </Tabs.Panel>
      </Tabs>
    </Modal>
  );
};


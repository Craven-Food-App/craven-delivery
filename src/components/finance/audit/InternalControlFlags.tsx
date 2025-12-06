import React, { useEffect, useState } from 'react';
import {
  Card,
  Text,
  Group,
  Stack,
  Badge,
  Button,
  Collapse,
  Table,
  ActionIcon,
  Tooltip,
  Alert,
} from '@mantine/core';
import {
  IconChevronDown,
  IconChevronUp,
  IconAlertTriangle,
  IconEye,
  IconCheck,
  IconX,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';
import { AuditFlag } from './types';

interface InternalControlFlagsProps {
  onFlagClick?: (flag: AuditFlag) => void;
}

export const InternalControlFlags: React.FC<InternalControlFlagsProps> = ({ onFlagClick }) => {
  const [flags, setFlags] = useState<AuditFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    high: true,
    medium: true,
    low: true,
  });

  useEffect(() => {
    fetchFlags();
  }, []);

  const fetchFlags = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_flags')
        .select('*')
        .eq('status', 'open')
        .order('severity', { ascending: false })
        .order('detected_at', { ascending: false });

      if (error) throw error;
      setFlags((data || []) as AuditFlag[]);
    } catch (error) {
      console.error('Error fetching audit flags:', error);
    } finally {
      setLoading(false);
    }
  };

  const highRiskFlags = flags.filter(f => f.severity === 'high' || f.severity === 'critical');
  const mediumRiskFlags = flags.filter(f => f.severity === 'medium');
  const lowRiskFlags = flags.filter(f => f.severity === 'low');

  const getFlagTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      duplicate_payout: 'Duplicate Payout',
      payout_no_delivery: 'Payout with No Delivery',
      payment_outside_hours: 'Payment Outside Allowed Hours',
      amount_above_threshold: 'Amount Above Threshold',
      vendor_driver_mismatch: 'Vendor/Driver Mismatch',
      missing_w9: 'Missing W-9',
      possible_fraud: 'Possible Fraud',
      chargeback: 'Chargeback',
      refund_anomaly: 'Refund Anomaly',
      suspicious_rounding: 'Suspicious Rounding',
      late_expense: 'Late Expense',
      missing_receipt: 'Missing Receipt',
      category_mismatch: 'Category Mismatch',
      incorrect_mcc: 'Incorrect MCC Code',
      manual_adjustment: 'Manual Adjustment',
      estimate_vs_actual: 'Estimate vs Actual Mismatch',
      late_documentation: 'Documentation Uploaded Late',
      missing_signature: 'Missing Signature',
      out_of_policy: 'Out-of-Policy Purchase',
      expense_after_cutoff: 'Expense After Cutoff',
    };
    return labels[type] || type;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'red';
      case 'medium':
        return 'yellow';
      case 'low':
        return 'blue';
      default:
        return 'gray';
    }
  };

  const renderFlagSection = (title: string, severity: string, flagList: AuditFlag[], color: string) => (
    <Card withBorder p="md" mb="md">
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <ActionIcon
            variant="subtle"
            onClick={() => setExpandedSections({ ...expandedSections, [severity]: !expandedSections[severity] })}
          >
            {expandedSections[severity] ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
          </ActionIcon>
          <Text fw={700} size="lg">{title}</Text>
          <Badge color={color} size="lg">{flagList.length}</Badge>
        </Group>
      </Group>

      <Collapse in={expandedSections[severity]}>
        {flagList.length === 0 ? (
          <Text c="dimmed" size="sm" ta="center" py="md">No {title.toLowerCase()} flags</Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Flag Type</Table.Th>
                <Table.Th>Description</Table.Th>
                <Table.Th>Transaction</Table.Th>
                <Table.Th>Detected</Table.Th>
                <Table.Th>Confidence</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {flagList.map((flag) => (
                <Table.Tr key={flag.id}>
                  <Table.Td>
                    <Badge color={getSeverityColor(flag.severity)} size="sm">
                      {getFlagTypeLabel(flag.flag_type)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{flag.description}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" ff="monospace" c="dimmed">
                      {flag.transaction_id || flag.audit_log_id?.substring(0, 8) || '-'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{dayjs(flag.detected_at).format('MMM D, YYYY')}</Text>
                  </Table.Td>
                  <Table.Td>
                    {flag.confidence_score ? (
                      <Badge color={flag.confidence_score > 80 ? 'red' : flag.confidence_score > 60 ? 'yellow' : 'blue'} size="sm">
                        {flag.confidence_score}%
                      </Badge>
                    ) : (
                      <Text size="sm" c="dimmed">-</Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Tooltip label="View Details">
                        <ActionIcon
                          variant="light"
                          color="blue"
                          onClick={() => onFlagClick?.(flag)}
                        >
                          <IconEye size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Collapse>
    </Card>
  );

  if (loading) {
    return <Text c="dimmed">Loading flags...</Text>;
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <div>
          <Text fw={700} size="xl" mb="xs">Internal Control Flags</Text>
          <Text c="dimmed" size="sm">High, medium, and low-risk transaction flags requiring attention</Text>
        </div>
        <Button onClick={fetchFlags} variant="light">Refresh</Button>
      </Group>

      {flags.length === 0 ? (
        <Alert color="green" icon={<IconCheck size={16} />}>
          <Text fw={600}>All Clear!</Text>
          <Text size="sm">No outstanding internal control flags at this time.</Text>
        </Alert>
      ) : (
        <>
          {renderFlagSection('High-Risk Flags', 'high', highRiskFlags, 'red')}
          {renderFlagSection('Medium-Risk Flags', 'medium', mediumRiskFlags, 'yellow')}
          {renderFlagSection('Low-Risk Flags', 'low', lowRiskFlags, 'blue')}
        </>
      )}
    </Stack>
  );
};


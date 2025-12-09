import React, { useEffect, useState } from 'react';
import {
  Card,
  Text,
  Group,
  Stack,
  Table,
  Badge,
  Progress,
  Alert,
  Button,
  Tooltip,
} from '@mantine/core';
import {
  IconBrain,
  IconAlertTriangle,
  IconTrendingUp,
  IconTrendingDown,
  IconRefresh,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';
import { AIAnomaly } from './types';

export const AIAnomalyDetection: React.FC = () => {
  const [anomalies, setAnomalies] = useState<AIAnomaly[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnomalies();
  }, []);

  const fetchAnomalies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_anomalies')
        .select('*')
        .order('confidence_score', { ascending: false })
        .order('detected_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAnomalies((data || []) as AIAnomaly[]);
    } catch (error) {
      console.error('Error fetching anomalies:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAnomalyTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      spending_spike: 'Spending Spike',
      revenue_drop: 'Revenue Drop',
      payout_irregularity: 'Payout Irregularity',
      merchant_delay: 'Merchant Delay',
      fraud_pattern: 'Fraud Pattern',
      duplicate: 'Duplicate Transaction',
      suspicious_refund: 'Suspicious Refund',
      outlier_transaction: 'Outlier Transaction',
    };
    return labels[type] || type;
  };

  const getAnomalyIcon = (type: string) => {
    if (type.includes('spike') || type.includes('irregularity')) return IconTrendingUp;
    if (type.includes('drop') || type.includes('delay')) return IconTrendingDown;
    return IconAlertTriangle;
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <div>
          <Text fw={700} size="xl" mb="xs">AI Anomaly Detection</Text>
          <Text c="dimmed" size="sm">Machine learning-powered detection of unusual patterns and potential fraud</Text>
        </div>
        <Button leftSection={<IconRefresh size={16} />} onClick={fetchAnomalies}>
          Refresh
        </Button>
      </Group>

      {anomalies.length === 0 ? (
        <Alert color="green" icon={<IconBrain size={16} />}>
          <Text fw={600}>No Anomalies Detected</Text>
          <Text size="sm">All transactions appear normal at this time.</Text>
        </Alert>
      ) : (
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Anomaly Type</Table.Th>
              <Table.Th>Description</Table.Th>
              <Table.Th>Confidence</Table.Th>
              <Table.Th>Risk Score</Table.Th>
              <Table.Th>Detected</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {anomalies.map((anomaly) => {
              const Icon = getAnomalyIcon(anomaly.anomaly_type);
              return (
                <Table.Tr key={anomaly.id}>
                  <Table.Td>
                    <Group gap="xs">
                      <Icon size={16} color={anomaly.confidence_score > 80 ? '#ef4444' : '#f59e0b'} />
                      <Badge color={anomaly.confidence_score > 80 ? 'red' : 'orange'} size="sm">
                        {getAnomalyTypeLabel(anomaly.anomaly_type)}
                      </Badge>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{anomaly.description}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Tooltip label={`${anomaly.confidence_score}% confidence`}>
                      <Progress value={anomaly.confidence_score} color={anomaly.confidence_score > 80 ? 'red' : 'orange'} size="sm" />
                    </Tooltip>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={anomaly.risk_score > 70 ? 'red' : anomaly.risk_score > 40 ? 'yellow' : 'blue'}>
                      {anomaly.risk_score}/100
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{dayjs(anomaly.detected_at).format('MMM D, YYYY')}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={anomaly.status === 'resolved' ? 'green' : anomaly.status === 'escalated' ? 'red' : 'yellow'}>
                      {anomaly.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Button size="xs" variant="light">View Details</Button>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      )}

      {anomalies.length > 0 && (
        <Card withBorder p="md" style={{ backgroundColor: '#fef3c7' }}>
          <Text fw={600} mb="md">Recommended Actions</Text>
          <Stack gap="sm">
            {anomalies
              .filter(a => a.status === 'detected' && a.confidence_score > 70)
              .slice(0, 3)
              .map((anomaly) => (
                <div key={anomaly.id}>
                  <Text size="sm" fw={600} mb="xs">{getAnomalyTypeLabel(anomaly.anomaly_type)}</Text>
                  {anomaly.recommended_actions && anomaly.recommended_actions.length > 0 && (
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                      {anomaly.recommended_actions.map((action, idx) => (
                        <li key={idx}>
                          <Text size="sm">{action}</Text>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
          </Stack>
        </Card>
      )}
    </Stack>
  );
};



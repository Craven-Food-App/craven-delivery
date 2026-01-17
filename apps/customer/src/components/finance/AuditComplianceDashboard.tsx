import React, { useEffect, useState } from 'react';
import { Card, Text, Group, Stack, Loader, Center, Table, Badge } from '@mantine/core';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';

type SodRule = {
  id: string;
  rule_code: string;
  rule_name: string;
  violation_severity: string;
  enforcement_level: string;
  is_active: boolean;
};

type AccessReview = {
  id: string;
  review_period_start: string;
  review_period_end: string;
  review_type: string;
  status: string;
  completed_at: string | null;
};

type AuditRow = {
  id: number;
  timestamp: string;
  user_id: string | null;
  action_type: string;
  resource_type: string;
  resource_id: string | null;
  severity: string;
  compliance_tag: string | null;
};

export const AuditComplianceDashboard: React.FC = () => {
  const [sodRules, setSodRules] = useState<SodRule[]>([]);
  const [reviews, setReviews] = useState<AccessReview[]>([]);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sodRes, reviewRes, auditRes] = await Promise.all([
        supabase
          .from('sod_rules')
          .select('id, rule_code, rule_name, violation_severity, enforcement_level, is_active')
          .order('rule_code'),
        supabase
          .from('access_reviews')
          .select('id, review_period_start, review_period_end, review_type, status, completed_at')
          .order('review_period_start', { ascending: false })
          .limit(20),
        supabase
          .from('audit_logs')
          .select('id, entered_date, entered_by, transaction_type, transaction_id, severity')
          .order('entered_date', { ascending: false })
          .limit(50),
      ]);

      if (!sodRes.error && sodRes.data) setSodRules(sodRes.data as SodRule[]);
      if (!reviewRes.error && reviewRes.data) setReviews(reviewRes.data as AccessReview[]);
      if (!auditRes.error && auditRes.data) {
        // Map audit_logs fields to AuditRow interface
        const mappedAuditRows: AuditRow[] = (auditRes.data as any[]).map((item, idx) => ({
          id: idx,
          timestamp: item.entered_date || item.created_at || new Date().toISOString(),
          user_id: item.entered_by,
          action_type: item.transaction_type || 'unknown',
          resource_type: item.transaction_type || 'unknown',
          resource_id: item.transaction_id,
          severity: item.severity || 'low',
          compliance_tag: null, // audit_logs doesn't have compliance_tag
        }));
        setAuditRows(mappedAuditRows);
      }
    } catch (err) {
      console.error('Error loading audit & compliance data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Center h={200}>
        <Loader />
      </Center>
    );
  }

  return (
    <Stack gap="lg" p="lg">
      <Card p="lg" withBorder>
        <Text fw={700} size="xl" mb="md">
          Segregation of Duties Rules
        </Text>
        {sodRules.length === 0 ? (
          <Text c="dimmed">No SOD rules configured.</Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Code</Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th>Severity</Table.Th>
                <Table.Th>Enforcement</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {sodRules.map((r) => (
                <Table.Tr key={r.id}>
                  <Table.Td>{r.rule_code}</Table.Td>
                  <Table.Td>{r.rule_name}</Table.Td>
                  <Table.Td>
                    <Badge color={r.violation_severity === 'critical' ? 'red' : 'orange'}>
                      {r.violation_severity}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{r.enforcement_level}</Table.Td>
                  <Table.Td>
                    <Badge color={r.is_active ? 'green' : 'gray'}>{r.is_active ? 'Active' : 'Inactive'}</Badge>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      <Card p="lg" withBorder>
        <Text fw={700} size="xl" mb="md">
          Access Reviews
        </Text>
        {reviews.length === 0 ? (
          <Text c="dimmed">No access reviews recorded.</Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Period</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Completed At</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {reviews.map((r) => (
                <Table.Tr key={r.id}>
                  <Table.Td>
                    {r.review_period_start} – {r.review_period_end}
                  </Table.Td>
                  <Table.Td>{r.review_type}</Table.Td>
                  <Table.Td>
                    <Badge color={r.status === 'completed' ? 'green' : r.status === 'overdue' ? 'red' : 'orange'}>
                      {r.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    {r.completed_at ? dayjs(r.completed_at).format('YYYY-MM-DD HH:mm') : 'Not completed'}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      <Card p="lg" withBorder>
        <Group justify="space-between" mb="md">
          <Text fw={700} size="xl">
            Recent Finance Audit Log
          </Text>
          <Badge color="blue">Entries: {auditRows.length}</Badge>
        </Group>
        {auditRows.length === 0 ? (
          <Text c="dimmed">No audit events recorded yet.</Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Timestamp</Table.Th>
                <Table.Th>Action</Table.Th>
                <Table.Th>Resource</Table.Th>
                <Table.Th>Severity</Table.Th>
                <Table.Th>Compliance</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {auditRows.map((r) => (
                <Table.Tr key={r.id}>
                  <Table.Td>{dayjs(r.timestamp).format('YYYY-MM-DD HH:mm:ss')}</Table.Td>
                  <Table.Td>{r.action_type}</Table.Td>
                  <Table.Td>
                    {r.resource_type} {r.resource_id || ''}
                  </Table.Td>
                  <Table.Td>
                    <Badge color={r.severity === 'critical' ? 'red' : r.severity === 'warning' ? 'orange' : 'gray'}>
                      {r.severity}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{r.compliance_tag || '-'}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>
    </Stack>
  );
};



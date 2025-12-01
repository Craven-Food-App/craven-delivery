import React, { useEffect, useState } from 'react';
import { Card, Text, Group, Stack, Loader, Center, Table, Badge } from '@mantine/core';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';

type TaxReportRow = {
  id: string;
  report_name: string;
  report_period_start: string;
  report_period_end: string;
  status: string;
  report_type: string;
  generated_at: string;
};

export const TaxManagementView: React.FC = () => {
  const [rows, setRows] = useState<TaxReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('financial_reports')
        .select(
          'id, report_name, report_period_start, report_period_end, status, report_type, generated_at'
        )
        .in('report_type', ['expense_analysis', 'custom'])
        .order('generated_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setRows((data || []) as TaxReportRow[]);
    } catch (err) {
      console.error('Error loading tax-related reports:', err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const renderStatus = (status: string) => {
    const map: Record<string, string> = {
      draft: 'gray',
      final: 'green',
      archived: 'blue',
    };
    return <Badge color={map[status] || 'gray'}>{status}</Badge>;
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
        <Group justify="space-between" mb="md">
          <div>
            <Text fw={700} size="xl">
              Tax &amp; Compliance
            </Text>
            <Text c="dimmed" size="sm">
              Uses financial_reports for tax-relevant summaries and filings
            </Text>
          </div>
          <Badge color="violet" size="lg">
            Reports: {rows.length}
          </Badge>
        </Group>

        {rows.length === 0 ? (
          <Text c="dimmed">No tax-related reports found.</Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Period</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Generated At</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((r) => (
                <Table.Tr key={r.id}>
                  <Table.Td>{r.report_name}</Table.Td>
                  <Table.Td>{r.report_type}</Table.Td>
                  <Table.Td>
                    {dayjs(r.report_period_start).format('YYYY-MM-DD')} –{' '}
                    {dayjs(r.report_period_end).format('YYYY-MM-DD')}
                  </Table.Td>
                  <Table.Td>{renderStatus(r.status)}</Table.Td>
                  <Table.Td>{dayjs(r.generated_at).format('YYYY-MM-DD HH:mm')}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>
    </Stack>
  );
};



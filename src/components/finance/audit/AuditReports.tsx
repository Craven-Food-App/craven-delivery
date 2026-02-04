// @ts-nocheck
import React, { useEffect, useState } from 'react';
import {
  Card,
  Text,
  Group,
  Stack,
  Button,
  Table,
  Badge,
  Select,
  Modal,
  Textarea,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import {
  IconReport,
  IconDownload,
  IconPlus,
  IconFileText,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';
import { notifications } from '@mantine/notifications';
import { AuditReport } from './types';

export const AuditReports: React.FC = () => {
  const [reports, setReports] = useState<AuditReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generateModalOpened, setGenerateModalOpened] = useState(false);
  const [reportType, setReportType] = useState<string | null>(null);
  const [periodStart, setPeriodStart] = useState<Date | null>(null);
  const [periodEnd, setPeriodEnd] = useState<Date | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_reports')
        .select('*')
        .order('generated_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setReports((data || []) as AuditReport[]);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    if (!reportType || !periodStart || !periodEnd) {
      notifications.show({
        title: 'Error',
        message: 'Please fill in all fields',
        color: 'red',
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate report data (simplified - would include actual calculations)
      const reportData = {
        period: {
          start: dayjs(periodStart).format('YYYY-MM-DD'),
          end: dayjs(periodEnd).format('YYYY-MM-DD'),
        },
        summary: `Audit report for ${reportType} period`,
        metrics: {},
      };

      const { error } = await supabase
        .from('audit_reports')
        .insert({
          report_type: reportType,
          report_name: `${reportType} Report - ${dayjs(periodStart).format('MMM YYYY')}`,
          report_period_start: dayjs(periodStart).format('YYYY-MM-DD'),
          report_period_end: dayjs(periodEnd).format('YYYY-MM-DD'),
          report_data: reportData,
          summary: reportData.summary,
          generated_by: user.id,
          status: 'draft',
        });

      if (error) throw error;

      notifications.show({
        title: 'Success',
        message: 'Report generated successfully',
        color: 'green',
      });

      setGenerateModalOpened(false);
      setReportType(null);
      setPeriodStart(null);
      setPeriodEnd(null);
      fetchReports();
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to generate report',
        color: 'red',
      });
    }
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <div>
          <Text fw={700} size="xl" mb="xs">Periodic Audit Reports</Text>
          <Text c="dimmed" size="sm">Generate and manage compliance audit reports</Text>
        </div>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => setGenerateModalOpened(true)}
        >
          Generate Report
        </Button>
      </Group>

      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Report Name</Table.Th>
            <Table.Th>Type</Table.Th>
            <Table.Th>Period</Table.Th>
            <Table.Th>Generated</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {reports.map((report) => (
            <Table.Tr key={report.id}>
              <Table.Td>
                <Group gap="xs">
                  <IconFileText size={16} />
                  <Text size="sm" fw={600}>{report.report_name}</Text>
                </Group>
              </Table.Td>
              <Table.Td>
                <Badge variant="light" size="sm">{report.report_type}</Badge>
              </Table.Td>
              <Table.Td>
                <Text size="sm">
                  {dayjs(report.report_period_start).format('MMM D')} - {dayjs(report.report_period_end).format('MMM D, YYYY')}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm">{dayjs(report.generated_at).format('MMM D, YYYY')}</Text>
              </Table.Td>
              <Table.Td>
                <Badge color={report.status === 'approved' ? 'green' : report.status === 'final' ? 'blue' : 'yellow'}>
                  {report.status}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <Button size="xs" variant="light" leftSection={<IconDownload size={14} />}>
                    Download
                  </Button>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Modal
        opened={generateModalOpened}
        onClose={() => setGenerateModalOpened(false)}
        title="Generate Audit Report"
      >
        <Stack gap="md">
          <Select
            label="Report Type"
            placeholder="Select report type"
            data={[
              { value: 'monthly_audit', label: 'Monthly Audit Report' },
              { value: 'quarterly_audit', label: 'Quarterly Audit Report' },
              { value: 'annual_compliance', label: 'Annual Compliance Report' },
              { value: 'cfo_certification', label: 'CFO Certification' },
              { value: 'ceo_summary', label: 'CEO Summary' },
              { value: 'board_audit_packet', label: 'Board Audit Packet' },
            ]}
            value={reportType}
            onChange={setReportType}
            required
          />
          <DatePickerInput
            label="Period Start"
            value={periodStart}
            onChange={setPeriodStart}
            required
          />
          <DatePickerInput
            label="Period End"
            value={periodEnd}
            onChange={setPeriodEnd}
            required
          />
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setGenerateModalOpened(false)}>
              Cancel
            </Button>
            <Button onClick={generateReport}>Generate</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};


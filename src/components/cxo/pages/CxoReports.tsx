import React, { useEffect, useState } from 'react';
import { Stack, Table, Button, Modal, Textarea, Select, Group, Text, Title, Loader, Center, Badge, Card, TextInput } from '@mantine/core';
import { reportsRepository } from '@/lib/cxo/repositories/reportsRepository';
import { CxoReport } from '@/types/cxo';
import { IconPlus, IconEye } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

const CxoReports: React.FC = () => {
  const [reports, setReports] = useState<CxoReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<CxoReport | null>(null);
  const [filters, setFilters] = useState({
    type: '',
    startDate: '',
    endDate: '',
  });
  const [formData, setFormData] = useState({
    reportDate: new Date().toISOString().split('T')[0],
    type: 'daily' as 'daily' | 'weekly',
    biggestIssue: '',
    fixDeployed: '',
    metricsMoved: '',
    ticketBacklogStatus: '',
    recommendationForTomorrow: '',
  });

  useEffect(() => {
    loadReports();
  }, [filters]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await reportsRepository.getAll({
        type: filters.type || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      });
      setReports(data);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    const report = {
      reportDate: formData.reportDate,
      type: formData.type,
      biggestIssue: formData.biggestIssue || null,
      fixDeployed: formData.fixDeployed || null,
      metricsMoved: formData.metricsMoved || null,
      ticketBacklogStatus: formData.ticketBacklogStatus || null,
      recommendationForTomorrow: formData.recommendationForTomorrow || null,
      authorId: null,
    };

    const id = await reportsRepository.create(report);
    if (id) {
      notifications.show({
        title: 'Success',
        message: `${formData.type === 'daily' ? 'Daily' : 'Weekly'} report created successfully`,
        color: 'green',
      });
      setModalOpen(false);
      setFormData({
        reportDate: new Date().toISOString().split('T')[0],
        type: 'daily',
        biggestIssue: '',
        fixDeployed: '',
        metricsMoved: '',
        ticketBacklogStatus: '',
        recommendationForTomorrow: '',
      });
      loadReports();
    } else {
      notifications.show({
        title: 'Error',
        message: 'Failed to create report',
        color: 'red',
      });
    }
  };

  const handleViewReport = async (reportId: string) => {
    const report = await reportsRepository.getById(reportId);
    if (report) {
      setSelectedReport(report);
      setViewModalOpen(true);
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
        <Title order={2}>Daily & Weekly Executive Reports</Title>
        <Group>
          <Select
            placeholder="Filter by type"
            data={[
              { value: '', label: 'All Types' },
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
            ]}
            value={filters.type}
            onChange={(value) => setFilters({ ...filters, type: value || '' })}
            clearable
          />
          <Button leftSection={<IconPlus size={16} />} onClick={() => setModalOpen(true)}>
            Create Report
          </Button>
        </Group>
      </Group>

      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Date</Table.Th>
            <Table.Th>Type</Table.Th>
            <Table.Th>Biggest Issue</Table.Th>
            <Table.Th>Author</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {reports.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={5}>
                <Text c="dimmed" ta="center" py="md">
                  No reports found
                </Text>
              </Table.Td>
            </Table.Tr>
          ) : (
            reports.map((report) => (
              <Table.Tr key={report.id}>
                <Table.Td>
                  <Text size="sm">{new Date(report.reportDate).toLocaleDateString()}</Text>
                </Table.Td>
                <Table.Td>
                  <Badge>{report.type}</Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" lineClamp={2}>
                    {report.biggestIssue || 'N/A'}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{report.authorId || 'System'}</Text>
                </Table.Td>
                <Table.Td>
                  <Button size="xs" variant="subtle" leftSection={<IconEye size={14} />} onClick={() => handleViewReport(report.id)}>
                    View
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))
          )}
        </Table.Tbody>
      </Table>

      {/* Create Report Modal */}
      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title="Create Report" size="lg">
        <Stack gap="md">
          <Group grow>
            <TextInput
              label="Report Date"
              type="date"
              value={formData.reportDate}
              onChange={(e) => setFormData({ ...formData, reportDate: e.target.value })}
              required
            />
            <Select
              label="Type"
              value={formData.type}
              onChange={(value) => setFormData({ ...formData, type: (value as any) || 'daily' })}
              data={[
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
              ]}
              required
            />
          </Group>
          <Textarea
            label="Biggest Issue"
            value={formData.biggestIssue}
            onChange={(e) => setFormData({ ...formData, biggestIssue: e.target.value })}
            minRows={2}
          />
          <Textarea
            label="Fix Deployed"
            value={formData.fixDeployed}
            onChange={(e) => setFormData({ ...formData, fixDeployed: e.target.value })}
            minRows={2}
          />
          <Textarea
            label="Metrics Moved"
            value={formData.metricsMoved}
            onChange={(e) => setFormData({ ...formData, metricsMoved: e.target.value })}
            minRows={2}
          />
          <Textarea
            label="Ticket Backlog Status"
            value={formData.ticketBacklogStatus}
            onChange={(e) => setFormData({ ...formData, ticketBacklogStatus: e.target.value })}
            minRows={2}
          />
          <Textarea
            label="Recommendation for Tomorrow"
            value={formData.recommendationForTomorrow}
            onChange={(e) => setFormData({ ...formData, recommendationForTomorrow: e.target.value })}
            minRows={2}
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create</Button>
          </Group>
        </Stack>
      </Modal>

      {/* View Report Modal */}
      <Modal opened={viewModalOpen} onClose={() => setViewModalOpen(false)} title="Report View" size="lg">
        {selectedReport && (
          <Stack gap="md">
            <Card shadow="sm" padding="md" radius="md" withBorder>
              <Text size="sm" c="dimmed">
                Report Date
              </Text>
              <Text fw={500}>{new Date(selectedReport.reportDate).toLocaleDateString()}</Text>
            </Card>
            <Card shadow="sm" padding="md" radius="md" withBorder>
              <Text size="sm" c="dimmed">
                Biggest Issue
              </Text>
              <Text>{selectedReport.biggestIssue || 'N/A'}</Text>
            </Card>
            <Card shadow="sm" padding="md" radius="md" withBorder>
              <Text size="sm" c="dimmed">
                Fix Deployed
              </Text>
              <Text>{selectedReport.fixDeployed || 'N/A'}</Text>
            </Card>
            <Card shadow="sm" padding="md" radius="md" withBorder>
              <Text size="sm" c="dimmed">
                Metrics Moved
              </Text>
              <Text>{selectedReport.metricsMoved || 'N/A'}</Text>
            </Card>
            <Card shadow="sm" padding="md" radius="md" withBorder>
              <Text size="sm" c="dimmed">
                Ticket Backlog Status
              </Text>
              <Text>{selectedReport.ticketBacklogStatus || 'N/A'}</Text>
            </Card>
            <Card shadow="sm" padding="md" radius="md" withBorder>
              <Text size="sm" c="dimmed">
                Recommendation for Tomorrow
              </Text>
              <Text>{selectedReport.recommendationForTomorrow || 'N/A'}</Text>
            </Card>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
};

export default CxoReports;


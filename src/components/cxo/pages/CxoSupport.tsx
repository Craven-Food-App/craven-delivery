import React, { useEffect, useState } from 'react';
import { Stack, Table, Card, Group, Text, Title, Loader, Center, Badge, Select } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { supportStaffRepository } from '@/lib/cxo/repositories/supportStaffRepository';
import { SupportStaff, SupportStaffMetrics } from '@/types/cxo';
import { IconUsers, IconTrendingUp } from '@tabler/icons-react';

const CxoSupport: React.FC = () => {
  const [staff, setStaff] = useState<SupportStaff[]>([]);
  const [metrics, setMetrics] = useState<SupportStaffMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [roleFilter, setRoleFilter] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [selectedDate, roleFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [staffData, metricsData] = await Promise.all([
        supportStaffRepository.getAll(),
        selectedDate
          ? supportStaffRepository.getMetricsByDate(selectedDate.toISOString().split('T')[0])
          : Promise.resolve([]),
      ]);

      let filteredStaff = staffData;
      if (roleFilter) {
        filteredStaff = staffData.filter((s) => s.role === roleFilter);
      }

      setStaff(filteredStaff);
      setMetrics(metricsData);
    } catch (error) {
      console.error('Error loading support data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMetricsForStaff = (staffId: string): SupportStaffMetrics | undefined => {
    return metrics.find((m) => m.staffId === staffId);
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
      <Title order={2}>Support Operations & Performance</Title>

      {/* Filters */}
      <Group>
        <DatePickerInput
          label="Select Date"
          value={selectedDate}
          onChange={setSelectedDate}
          placeholder="Pick a date"
        />
        <Select
          label="Filter by Role"
          placeholder="All Roles"
          data={[
            { value: '', label: 'All Roles' },
            { value: 'support_agent', label: 'Support Agent' },
            { value: 'support_manager', label: 'Support Manager' },
            { value: 'driver_onboarding', label: 'Driver Onboarding' },
            { value: 'merchant_success', label: 'Merchant Success' },
          ]}
          value={roleFilter}
          onChange={(value) => setRoleFilter(value || '')}
          clearable
        />
      </Group>

      {/* Support Staff Registry */}
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={4} mb="md">
          Support Staff Registry
        </Title>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Role</Table.Th>
              <Table.Th>Active</Table.Th>
              <Table.Th>Last Metrics Date</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {staff.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <Text c="dimmed" ta="center" py="md">
                    No support staff found
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              staff.map((member) => (
                <Table.Tr key={member.id}>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {member.name}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge>{member.role.replace('_', ' ')}</Badge>
                  </Table.Td>
                  <Table.Td>
                    {member.active ? (
                      <Badge color="green">Active</Badge>
                    ) : (
                      <Badge color="gray">Inactive</Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {getMetricsForStaff(member.id)?.date
                        ? new Date(getMetricsForStaff(member.id)!.date).toLocaleDateString()
                        : 'No metrics'}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Card>

      {/* Performance Snapshot */}
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={4} mb="md">
          Performance Snapshot
        </Title>
        {metrics.length === 0 ? (
          <Text c="dimmed" ta="center" py="md">
            No metrics available for selected date
          </Text>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Staff Name</Table.Th>
                <Table.Th>Role</Table.Th>
                <Table.Th>Tickets Resolved</Table.Th>
                <Table.Th>Avg Handle Minutes</Table.Th>
                <Table.Th>Escalations</Table.Th>
                <Table.Th>CSAT Score</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {metrics.map((metric) => {
                const staffMember = staff.find((s) => s.id === metric.staffId);
                return (
                  <Table.Tr key={metric.id}>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {staffMember?.name || 'Unknown'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge>{staffMember?.role.replace('_', ' ') || 'N/A'}</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{metric.ticketsResolved}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{metric.avgHandleMinutes ? `${Math.round(metric.avgHandleMinutes)} min` : 'N/A'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{metric.escalationsCount}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{metric.csatScore ? metric.csatScore.toFixed(2) : 'N/A'}</Text>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        )}
      </Card>
    </Stack>
  );
};

export default CxoSupport;


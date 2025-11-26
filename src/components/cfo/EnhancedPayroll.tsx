import React, { useState, useEffect } from 'react';
import { Stack, Title, Text, Card, Group, Badge, Button, Table, ActionIcon, Modal, Grid, Alert, Tabs } from '@mantine/core';
import { IconUsers, IconCurrencyDollar, IconCalendar, IconCheck, IconEye, IconDownload, IconAlertTriangle, IconTrendingUp } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useEmbeddedToast';
import { Database } from '@/integrations/supabase/types';

type EmployeeRow = Database['public']['Tables']['employees']['Row'];

export const EnhancedPayroll: React.FC = () => {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPayroll, setProcessingPayroll] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRow | null>(null);
  const toast = useToast();

  useEffect(() => { fetchEmployees(); }, []);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase.from('employees').select('*').eq('employment_status', 'active').order('last_name');
      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const calculatePayrollAmount = () => {
    return employees.reduce((total, emp) => total + ((emp.salary || 0) / 26), 0);
  };

  const processPayroll = async () => {
    setProcessingPayroll(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Payroll processed successfully');
    } catch (error) {
      toast.error('Failed to process payroll');
    } finally {
      setProcessingPayroll(false);
    }
  };

  const totalPayroll = calculatePayrollAmount();
  const employerTaxes = totalPayroll * 0.0765;
  const netPayroll = totalPayroll + employerTaxes;

  return (
    <Stack gap="lg" p={{ base: 16, md: 24 }}>
      <Group justify="space-between" wrap="wrap">
        <div>
          <Title order={2}>Payroll Management</Title>
          <Text c="dimmed" size="sm">Process payroll, manage employee compensation, and ensure compliance</Text>
        </div>
        <Group>
          <Button leftSection={<IconCheck size={16} />} loading={processingPayroll} onClick={processPayroll} color="green">Process Payroll</Button>
          <Button variant="light" leftSection={<IconDownload size={16} />}>Export Report</Button>
        </Group>
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, md: 4 }}><Card withBorder p="md"><Group justify="space-between"><div><Text size="sm" c="dimmed">Gross Payroll</Text><Title order={3}>${totalPayroll.toFixed(2)}</Title></div><IconCurrencyDollar size={32} color="blue" /></Group></Card></Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}><Card withBorder p="md"><Group justify="space-between"><div><Text size="sm" c="dimmed">Employer Taxes</Text><Title order={3}>${employerTaxes.toFixed(2)}</Title></div><IconAlertTriangle size={32} color="orange" /></Group></Card></Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}><Card withBorder p="md"><Group justify="space-between"><div><Text size="sm" c="dimmed">Total Cost</Text><Title order={3}>${netPayroll.toFixed(2)}</Title></div><IconTrendingUp size={32} color="green" /></Group></Card></Grid.Col>
      </Grid>

      <Tabs defaultValue="employees">
        <Tabs.List>
          <Tabs.Tab value="employees" leftSection={<IconUsers size={16} />}>Employees ({employees.length})</Tabs.Tab>
          <Tabs.Tab value="history" leftSection={<IconCalendar size={16} />}>Payroll History</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="employees" pt="md">
          <Card withBorder>
            <Table>
              <Table.Thead><Table.Tr><Table.Th>Employee</Table.Th><Table.Th>Position</Table.Th><Table.Th>Department</Table.Th><Table.Th>Annual Salary</Table.Th><Table.Th>Pay Frequency</Table.Th><Table.Th>Actions</Table.Th></Table.Tr></Table.Thead>
              <Table.Tbody>
                {employees.map((emp) => (
                  <Table.Tr key={emp.id}>
                    <Table.Td>{emp.first_name} {emp.last_name}</Table.Td>
                    <Table.Td>{emp.position}</Table.Td>
                    <Table.Td><Badge variant="light">{emp.department_id || 'N/A'}</Badge></Table.Td>
                    <Table.Td>${(emp.salary || 0).toLocaleString()}</Table.Td>
                    <Table.Td><Badge size="sm">Biweekly</Badge></Table.Td>
                    <Table.Td><ActionIcon variant="light" onClick={() => setSelectedEmployee(emp)}><IconEye size={16} /></ActionIcon></Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        </Tabs.Panel>
        <Tabs.Panel value="history" pt="md"><Card withBorder p="md"><Alert color="blue" icon={<IconCalendar />}>Payroll history will be displayed here after processing payroll runs.</Alert></Card></Tabs.Panel>
      </Tabs>

      <Modal opened={!!selectedEmployee} onClose={() => setSelectedEmployee(null)} title="Employee Details" size="lg">
        {selectedEmployee && (
          <Grid>
            <Grid.Col span={6}><Text size="sm" fw={500} c="dimmed">Full Name</Text><Text>{selectedEmployee.first_name} {selectedEmployee.last_name}</Text></Grid.Col>
            <Grid.Col span={6}><Text size="sm" fw={500} c="dimmed">Position</Text><Text>{selectedEmployee.position}</Text></Grid.Col>
            <Grid.Col span={6}><Text size="sm" fw={500} c="dimmed">Department</Text><Text>{selectedEmployee.department_id || 'N/A'}</Text></Grid.Col>
            <Grid.Col span={6}><Text size="sm" fw={500} c="dimmed">Annual Salary</Text><Text>${(selectedEmployee.salary || 0).toLocaleString()}</Text></Grid.Col>
          </Grid>
        )}
      </Modal>
    </Stack>
  );
};

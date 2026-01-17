import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Stack,
  Group,
  Text,
  Badge,
  Paper,
  Modal,
  TextInput,
  NumberInput,
  Select,
  Table,
  ActionIcon,
  Tooltip,
  Loader,
  Center,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { supabase } from '@/integrations/supabase/client';
import {
  IconPlus,
  IconEdit,
  IconUsers,
  IconBriefcase,
} from '@tabler/icons-react';

interface FinancePosition {
  id: string;
  position_title: string;
  position_level: number;
  reports_to_position_id: string | null;
  reports_to_position?: FinancePosition;
  min_salary: number;
  max_salary: number;
  required_experience_years: number;
  required_education: string;
  key_responsibilities: string[];
  required_skills: string[];
  is_active: boolean;
  employees?: FinanceEmployee[];
}

interface FinanceEmployee {
  id: string;
  employee: {
    first_name: string;
    last_name: string;
    email: string;
  };
  position: FinancePosition;
  employment_status: string;
  hire_date: string;
}

export const FinanceDepartmentHierarchy: React.FC = () => {
  const [positions, setPositions] = useState<FinancePosition[]>([]);
  const [employees, setEmployees] = useState<FinanceEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<FinancePosition | null>(null);

  const [formData, setFormData] = useState({
    position_title: '',
    position_level: 5,
    reports_to_position_id: '',
    min_salary: '',
    max_salary: '',
    required_experience_years: 0,
    required_education: 'bachelor',
    key_responsibilities: [] as string[],
    required_skills: [] as string[],
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: positionsData, error: posError } = await supabase
        .from('finance_positions')
        .select('*')
        .order('position_level', { ascending: true })
        .order('position_title', { ascending: true });

      if (posError) {
        if (posError.code === '42P01' || posError.message?.includes('does not exist')) {
          notifications.show({
            title: 'Setup Required',
            message: 'Finance system tables not found. Please run the database migration.',
            color: 'orange',
          });
          return;
        }
        throw posError;
      }

      const { data: employeesData, error: empError } = await supabase
        .from('finance_employees')
        .select(`
          *,
          employee:employees!finance_employees_employee_id_fkey(first_name, last_name, email),
          position:finance_positions(*)
        `)
        .eq('employment_status', 'active');

      if (empError) {
        // Suppress relationship, policy, and schema errors
        if (
          empError.code === '42P01' || 
          empError.message?.includes('does not exist') ||
          empError.message?.includes('Could not find a relationship') ||
          empError.message?.includes('infinite recursion detected in policy') ||
          empError.message?.includes('schema cache')
        ) {
          console.warn('Supabase schema/relationship error (suppressed):', empError.message);
        } else {
          console.error('Error fetching finance employees:', empError);
        }
      }

      setPositions(positionsData || []);
      setEmployees(employeesData || []);
    } catch (error: any) {
      console.error('Error fetching finance department data:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to load finance department data',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const getLevelLabel = (level: number) => {
    const labels: Record<number, string> = {
      1: 'C-Level',
      2: 'VP/Director',
      3: 'Manager',
      4: 'Senior',
      5: 'Junior',
    };
    return labels[level] || `Level ${level}`;
  };

  const getEducationLabel = (edu: string) => {
    const labels: Record<string, string> = {
      bachelor: 'Bachelor\'s',
      master: 'Master\'s',
      mba: 'MBA',
      cpa: 'CPA',
      cfa: 'CFA',
    };
    return labels[edu] || edu;
  };

  const handleSubmit = async () => {
    try {
      const positionData = {
        ...formData,
        min_salary: parseFloat(formData.min_salary) || null,
        max_salary: parseFloat(formData.max_salary) || null,
        reports_to_position_id: formData.reports_to_position_id || null,
      };

      if (editingPosition) {
        const { error } = await supabase
          .from('finance_positions')
          .update(positionData)
          .eq('id', editingPosition.id);

        if (error) throw error;
        notifications.show({
          title: 'Success',
          message: 'Position updated successfully',
          color: 'green',
        });
      } else {
        const { error } = await supabase
          .from('finance_positions')
          .insert(positionData);

        if (error) throw error;
        notifications.show({
          title: 'Success',
          message: 'Position created successfully',
          color: 'green',
        });
      }

      setModalOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to save position',
        color: 'red',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      position_title: '',
      position_level: 5,
      reports_to_position_id: '',
      min_salary: '',
      max_salary: '',
      required_experience_years: 0,
      required_education: 'bachelor',
      key_responsibilities: [],
      required_skills: [],
      is_active: true,
    });
    setEditingPosition(null);
  };

  const totalPositions = positions.length;
  const filledPositions = employees.length;
  const openPositions = totalPositions - filledPositions;

  return (
    <Stack gap="lg">
      <Card p="lg" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <div>
            <Text fw={700} size="xl">Finance Department Hierarchy</Text>
            <Text c="dimmed" size="sm">View positions, roles, and organizational structure</Text>
          </div>
          <Group>
            <Paper p="md" withBorder>
              <Stack gap={4}>
                <Text size="xs" c="dimmed">Total Positions</Text>
                <Text fw={700} size="xl">{totalPositions}</Text>
                <Text size="xs" c="dimmed">{filledPositions} filled, {openPositions} open</Text>
              </Stack>
            </Paper>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => {
                resetForm();
                setModalOpen(true);
              }}
            >
              Add Position
            </Button>
          </Group>
        </Group>

        {loading ? (
          <Center h={200}>
            <Loader />
          </Center>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Position</Table.Th>
                <Table.Th>Level</Table.Th>
                <Table.Th>Reports To</Table.Th>
                <Table.Th>Salary Range</Table.Th>
                <Table.Th>Experience</Table.Th>
                <Table.Th>Education</Table.Th>
                <Table.Th>Filled</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {positions.map(position => {
                const positionEmployees = employees.filter(e => e.position.id === position.id);
                const reportsTo = positions.find(p => p.id === position.reports_to_position_id);

                return (
                  <Table.Tr key={position.id}>
                    <Table.Td>
                      <Text fw={500}>{position.position_title}</Text>
                      {positionEmployees.length > 0 && (
                        <Text size="xs" c="dimmed">
                          {positionEmployees.length} employee(s)
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Badge color={position.position_level === 1 ? 'violet' : 'blue'}>
                        {getLevelLabel(position.position_level)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{reportsTo?.position_title || 'CFO'}</Text>
                    </Table.Td>
                    <Table.Td>
                      {position.min_salary && position.max_salary ? (
                        <Text size="sm">
                          ${(position.min_salary / 1000).toFixed(0)}k - ${(position.max_salary / 1000).toFixed(0)}k
                        </Text>
                      ) : (
                        <Text size="sm" c="dimmed">N/A</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{position.required_experience_years}+ years</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" size="sm">
                        {getEducationLabel(position.required_education)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <IconUsers size={16} />
                        <Text size="sm">
                          {positionEmployees.length} / {positionEmployees.length > 0 ? positionEmployees.length : '?'}
                        </Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={position.is_active ? 'green' : 'gray'}>
                        {position.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Tooltip label="Edit">
                          <ActionIcon
                            variant="light"
                            onClick={() => {
                              setEditingPosition(position);
                              setFormData({
                                position_title: position.position_title,
                                position_level: position.position_level,
                                reports_to_position_id: position.reports_to_position_id || '',
                                min_salary: position.min_salary?.toString() || '',
                                max_salary: position.max_salary?.toString() || '',
                                required_experience_years: position.required_experience_years,
                                required_education: position.required_education,
                                key_responsibilities: position.key_responsibilities || [],
                                required_skills: position.required_skills || [],
                                is_active: position.is_active,
                              });
                              setModalOpen(true);
                            }}
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      <Modal
        opened={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        title={editingPosition ? 'Edit Position' : 'Create New Position'}
        size="lg"
      >
        <Stack gap="md">
          <TextInput
            label="Position Title"
            required
            value={formData.position_title}
            onChange={(e) => setFormData({ ...formData, position_title: e.target.value })}
          />

          <Select
            label="Position Level"
            required
            data={[
              { value: '1', label: 'Level 1 - C-Level (CFO)' },
              { value: '2', label: 'Level 2 - VP/Director' },
              { value: '3', label: 'Level 3 - Manager' },
              { value: '4', label: 'Level 4 - Senior' },
              { value: '5', label: 'Level 5 - Junior' },
            ]}
            value={formData.position_level.toString()}
            onChange={(value) => setFormData({ ...formData, position_level: parseInt(value || '5') })}
          />

          <Select
            label="Reports To"
            placeholder="Select reporting position"
            data={positions
              .filter(p => p.id !== editingPosition?.id)
              .map(p => ({ value: p.id, label: p.position_title }))}
            value={formData.reports_to_position_id}
            onChange={(value) => setFormData({ ...formData, reports_to_position_id: value || '' })}
            clearable
          />

          <Group grow>
            <NumberInput
              label="Min Salary"
              prefix="$"
              value={formData.min_salary}
              onChange={(value) => setFormData({ ...formData, min_salary: value?.toString() || '' })}
            />
            <NumberInput
              label="Max Salary"
              prefix="$"
              value={formData.max_salary}
              onChange={(value) => setFormData({ ...formData, max_salary: value?.toString() || '' })}
            />
          </Group>

          <NumberInput
            label="Required Experience (Years)"
            value={formData.required_experience_years}
            onChange={(value) => setFormData({ ...formData, required_experience_years: Number(value) || 0 })}
          />

          <Select
            label="Required Education"
            data={[
              { value: 'bachelor', label: 'Bachelor\'s Degree' },
              { value: 'master', label: 'Master\'s Degree' },
              { value: 'mba', label: 'MBA' },
              { value: 'cpa', label: 'CPA' },
              { value: 'cfa', label: 'CFA' },
            ]}
            value={formData.required_education}
            onChange={(value) => setFormData({ ...formData, required_education: value || 'bachelor' })}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => {
              setModalOpen(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingPosition ? 'Update' : 'Create'} Position
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};


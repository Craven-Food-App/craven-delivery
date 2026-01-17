import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Table,
  Modal,
  TextInput,
  NumberInput,
  Select,
  Stack,
  Group,
  Text,
  Badge,
  Progress,
  Grid,
  Paper,
  Tabs,
  ActionIcon,
  Tooltip,
  Loader,
  Center,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { supabase } from '@/integrations/supabase/client';
import { IconPlus, IconEdit, IconTrash, IconTrendingUp, IconTrendingDown } from '@tabler/icons-react';
import { calculateBudgetUtilization, getBudgetStatusColor } from '@/utils/finance';

interface Budget {
  id: string;
  budget_name: string;
  budget_year: number;
  budget_quarter: number | null;
  department: { name: string; id: string };
  category: { name: string; id: string };
  allocated_amount: number;
  spent_amount: number;
  committed_amount: number;
  remaining_amount: number;
  status: string;
}

export const BudgetManagement: React.FC = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    budget_name: '',
    budget_year: new Date().getFullYear(),
    budget_quarter: null as number | null,
    department_id: '',
    category_id: '',
    allocated_amount: '',
    status: 'active',
  });

  useEffect(() => {
    fetchBudgets();
    fetchDepartments();
    fetchCategories();
  }, []);

  const fetchBudgets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('budgets')
        .select(`
          *,
          department:departments(name, id),
          category:expense_categories(name, id)
        `)
        .order('budget_year', { ascending: false })
        .order('budget_quarter', { ascending: true });

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          notifications.show({
            title: 'Setup Required',
            message: 'Finance system tables not found. Please run the database migration.',
            color: 'orange',
          });
          return;
        }
        throw error;
      }
      setBudgets(data || []);
    } catch (error: any) {
      console.error('Error fetching budgets:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to load budgets',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    const { data } = await supabase.from('departments').select('id, name').order('name');
    setDepartments(data || []);
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      
      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          return; // Table doesn't exist yet
        }
        throw error;
      }
      setCategories(data || []);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const budgetData = {
        ...formData,
        allocated_amount: parseFloat(formData.allocated_amount),
        created_by: user.id,
        approved_by: editingBudget ? undefined : user.id,
        approved_at: editingBudget ? undefined : new Date().toISOString(),
      };

      if (editingBudget) {
        const { error } = await supabase
          .from('budgets')
          .update(budgetData)
          .eq('id', editingBudget.id);

        if (error) throw error;
        notifications.show({
          title: 'Success',
          message: 'Budget updated successfully',
          color: 'green',
        });
      } else {
        const { error } = await supabase.from('budgets').insert(budgetData);

        if (error) throw error;
        notifications.show({
          title: 'Success',
          message: 'Budget created successfully',
          color: 'green',
        });
      }

      setModalOpen(false);
      resetForm();
      fetchBudgets();
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to save budget',
        color: 'red',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      budget_name: '',
      budget_year: new Date().getFullYear(),
      budget_quarter: null,
      department_id: '',
      category_id: '',
      allocated_amount: '',
      status: 'active',
    });
    setEditingBudget(null);
  };

  const totalPositions = budgets.length;
  const filledPositions = budgets.filter(b => b.spent_amount > 0).length;
  const openPositions = totalPositions - filledPositions;

  return (
    <Stack gap="lg">
      <Card p="lg" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <div>
            <Text fw={700} size="xl">Budget Management</Text>
            <Text c="dimmed" size="sm">Create and manage department budgets</Text>
          </div>
          <Group>
            <Paper p="md" withBorder>
              <Stack gap={4}>
                <Text size="xs" c="dimmed">Total Budgets</Text>
                <Text fw={700} size="xl">{totalPositions}</Text>
              </Stack>
            </Paper>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => {
                resetForm();
                setModalOpen(true);
              }}
            >
              New Budget
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
                <Table.Th>Budget Name</Table.Th>
                <Table.Th>Year/Quarter</Table.Th>
                <Table.Th>Department</Table.Th>
                <Table.Th>Category</Table.Th>
                <Table.Th>Allocated</Table.Th>
                <Table.Th>Spent</Table.Th>
                <Table.Th>Committed</Table.Th>
                <Table.Th>Remaining</Table.Th>
                <Table.Th>Utilization</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {budgets.map(budget => {
                const utilization = budget.allocated_amount > 0 
                  ? ((budget.spent_amount + budget.committed_amount) / budget.allocated_amount) * 100 
                  : 0;
                return (
                  <Table.Tr key={budget.id}>
                    <Table.Td>{budget.budget_name}</Table.Td>
                    <Table.Td>
                      {budget.budget_year}
                      {budget.budget_quarter && ` Q${budget.budget_quarter}`}
                    </Table.Td>
                    <Table.Td>{budget.department?.name || 'N/A'}</Table.Td>
                    <Table.Td>{budget.category?.name || 'All Categories'}</Table.Td>
                    <Table.Td>
                      <Text fw={500}>${budget.allocated_amount.toLocaleString()}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text c="red">${budget.spent_amount.toLocaleString()}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text c="orange">${budget.committed_amount.toLocaleString()}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text
                        fw={600}
                        c={budget.remaining_amount < 0 ? 'red' : 'green'}
                      >
                        ${budget.remaining_amount.toLocaleString()}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Progress
                        value={utilization}
                        color={getBudgetStatusColor(utilization)}
                        size="sm"
                      />
                      <Text size="xs" c="dimmed" mt={4}>
                        {utilization.toFixed(1)}%
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={budget.status === 'active' ? 'green' : 'gray'}>
                        {budget.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Tooltip label="Edit">
                          <ActionIcon
                            variant="light"
                            onClick={() => {
                              setEditingBudget(budget);
                              setFormData({
                                budget_name: budget.budget_name,
                                budget_year: budget.budget_year,
                                budget_quarter: budget.budget_quarter || null,
                                department_id: budget.department?.id || '',
                                category_id: budget.category?.id || '',
                                allocated_amount: budget.allocated_amount.toString(),
                                status: budget.status,
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

      {/* Create/Edit Modal */}
      <Modal
        opened={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        title={editingBudget ? 'Edit Budget' : 'Create New Budget'}
        size="lg"
      >
        <Stack gap="md">
          <TextInput
            label="Budget Name"
            placeholder="e.g., Q1 2025 Marketing Budget"
            required
            value={formData.budget_name}
            onChange={(e) => setFormData({ ...formData, budget_name: e.target.value })}
          />

          <Grid>
            <Grid.Col span={6}>
              <NumberInput
                label="Budget Year"
                required
                value={formData.budget_year}
                onChange={(value) => setFormData({ ...formData, budget_year: Number(value) || new Date().getFullYear() })}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <Select
                label="Quarter (Optional)"
                placeholder="Select quarter"
                data={[
                  { value: '1', label: 'Q1' },
                  { value: '2', label: 'Q2' },
                  { value: '3', label: 'Q3' },
                  { value: '4', label: 'Q4' },
                ]}
                value={formData.budget_quarter?.toString() || null}
                onChange={(value) => setFormData({ ...formData, budget_quarter: value ? parseInt(value) : null })}
                clearable
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <Select
                label="Department"
                placeholder="Select department"
                data={departments.map(d => ({ value: d.id, label: d.name }))}
                value={formData.department_id}
                onChange={(value) => setFormData({ ...formData, department_id: value || '' })}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <Select
                label="Category (Optional)"
                placeholder="Leave empty for all categories"
                data={categories.map(c => ({ value: c.id, label: c.name }))}
                value={formData.category_id}
                onChange={(value) => setFormData({ ...formData, category_id: value || '' })}
                clearable
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <NumberInput
                label="Allocated Amount"
                required
                prefix="$"
                decimalScale={2}
                fixedDecimalScale
                value={formData.allocated_amount}
                onChange={(value) => setFormData({ ...formData, allocated_amount: value?.toString() || '' })}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <Select
                label="Status"
                data={[
                  { value: 'draft', label: 'Draft' },
                  { value: 'active', label: 'Active' },
                  { value: 'closed', label: 'Closed' },
                ]}
                value={formData.status}
                onChange={(value) => setFormData({ ...formData, status: value || 'active' })}
              />
            </Grid.Col>
          </Grid>

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => {
              setModalOpen(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingBudget ? 'Update' : 'Create'} Budget
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};


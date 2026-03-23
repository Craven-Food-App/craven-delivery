// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Button,
  Table,
  Modal,
  TextInput,
  NumberInput,
  Select,
  Textarea,
  Stack,
  Group,
  Text,
  Badge,
  Grid,
  Paper,
  Tabs,
  ActionIcon,
  Tooltip,
  Loader,
  Center,
  Alert,
  Divider,
  Box,
  ThemeIcon,
  RingProgress,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { supabase } from '@/integrations/supabase/client';
import {
  IconPlus,
  IconEye,
  IconSearch,
  IconReceipt,
  IconCreditCard,
  IconTrash,
  IconEdit,
  IconTruck,
  IconTool,
  IconUsers,
  IconBuildingStore,
  IconChartPie,
  IconCalendar,
  IconFilter,
} from '@tabler/icons-react';
import dayjs from 'dayjs';

// ── Types ───────────────────────────────────────────────────────────

interface ExpenseCategory {
  id: string;
  name: string;
}

const FALLBACK_CATEGORIES = [
  'Travel',
  'Meals & Entertainment',
  'Office Supplies',
  'Software & Subscriptions',
  'Marketing & Advertising',
  'Professional Services',
  'Utilities',
  'Rent & Facilities',
  'Equipment',
  'Training & Development',
  'Insurance',
  'Other',
] as const;

interface Expense {
  id: string;
  expense_date: string;
  category: string;
  description: string;
  amount: number;
  invoice_id?: string | null;
  vendor_name?: string;
  status: string;
  created_at: string;
}

const getCategoryIcon = (cat: string) => {
  const map: Record<string, any> = {
    'Stripe Fees': IconCreditCard,
    'Materials': IconBuildingStore,
    'Labor': IconUsers,
    'Equipment': IconTool,
    'Vehicle Maintenance': IconTruck,
  };
  return map[cat] || IconReceipt;
};

const getCategoryColor = (cat: string) => {
  const map: Record<string, string> = {
    'Stripe Fees': 'violet',
    'Materials': 'blue',
    'Labor': 'green',
    'Equipment': 'orange',
    'Marketing': 'pink',
    'Software & SaaS': 'cyan',
    'Insurance': 'teal',
    'Rent & Utilities': 'yellow',
    'Travel': 'indigo',
    'Vehicle Maintenance': 'grape',
  };
  return map[cat] || 'gray';
};

// ── Component ───────────────────────────────────────────────────────

export const Expenses: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [dateTo, setDateTo] = useState(dayjs().format('YYYY-MM-DD'));

  // Create/Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // View
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewExpense, setViewExpense] = useState<Expense | null>(null);

  // Form
  const [formData, setFormData] = useState({
    expense_date: dayjs().format('YYYY-MM-DD'),
    category: '',
    description: '',
    amount: '' as string | number,
    vendor_name: '',
    notes: '',
  });

  // ── Fetch ──────────────────────────────────────────────────────

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [dateFrom, dateTo]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('id, name')
        .order('name');
      if (!error && data) setCategories(data);
    } catch (e) {
      console.error('Failed to load expense categories:', e);
    }
  };

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      // Try the expense_requests table (which exists in the DB)
      const { data, error } = await supabase
        .from('expense_requests')
        .select('*')
        .gte('expense_date', dateFrom)
        .lte('expense_date', dateTo)
        .order('expense_date', { ascending: false });

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          // Table doesn't exist — show empty state
          setExpenses([]);
          return;
        }
        throw error;
      }

      setUseExpenseRequests(true);

      // Map expense_requests fields to our Expense interface
      const mapped: Expense[] = (data || []).map((r: any) => ({
        id: r.id,
        expense_date: r.expense_date || r.created_at?.split('T')[0],
        category: r.business_purpose || r.description?.split(' – ')[0] || 'Miscellaneous',
        description: r.description || r.business_purpose || '',
        amount: r.amount || 0,
        invoice_id: null,
        vendor_name: r.vendor_name || '',
        status: r.status || 'pending',
        created_at: r.created_at,
      }));

      setExpenses(mapped);
    } catch (error: any) {
      console.error('Error fetching expenses:', error);
      notifications.show({ title: 'Error', message: error.message || 'Failed to load expenses', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  // ── Computed ───────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = expenses;
    if (categoryFilter) list = list.filter(e => e.category === categoryFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.description?.toLowerCase().includes(q) ||
        e.vendor_name?.toLowerCase().includes(q) ||
        e.category?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [expenses, categoryFilter, search]);

  const stats = useMemo(() => {
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const thisMonth = expenses
      .filter(e => dayjs(e.expense_date).isSame(dayjs(), 'month'))
      .reduce((s, e) => s + e.amount, 0);

    // Category breakdown
    const byCategory: Record<string, number> = {};
    expenses.forEach(e => {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    });

    const topCategories = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { totalExpenses, thisMonth, byCategory, topCategories };
  }, [expenses]);

  // ── CRUD ───────────────────────────────────────────────────────

  const resetForm = () => {
    setFormData({ expense_date: dayjs().format('YYYY-MM-DD'), category: '', description: '', amount: '', vendor_name: '', notes: '' });
    setEditingExpense(null);
  };

  const handleSubmit = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const amt = typeof formData.amount === 'string' ? parseFloat(formData.amount) : formData.amount;

      // Resolve category name to ID
      const matchedCategory = categories.find(c => c.name === formData.category);
      if (!matchedCategory) {
        notifications.show({ title: 'Error', message: 'Please select a valid expense category', color: 'red' });
        return;
      }

      const payload: any = {
        amount: amt,
        description: formData.description,
        business_purpose: formData.category,
        expense_category_id: matchedCategory.id,
        expense_date: formData.expense_date,
        status: 'approved',
        priority: 'medium',
        requester_id: user.id,
        vendor_name: formData.vendor_name || null,
      };

      if (editingExpense) {
        const { error } = await supabase.from('expense_requests').update(payload).eq('id', editingExpense.id);
        if (error) throw error;
        notifications.show({ title: 'Updated', message: 'Expense updated', color: 'green' });
      } else {
        const { error } = await supabase.from('expense_requests').insert(payload);
        if (error) throw error;
        notifications.show({ title: 'Created', message: 'Expense recorded', color: 'green' });
      }
        } else {
          const { error } = await supabase.from('expense_requests').insert(payload);
          if (error) throw error;
          notifications.show({ title: 'Created', message: 'Expense recorded', color: 'green' });
        }
      }

      setModalOpen(false);
      resetForm();
      fetchExpenses();
    } catch (e: any) {
      notifications.show({ title: 'Error', message: e.message || 'Failed to save expense', color: 'red' });
    }
  };

  const handleDelete = async (expense: Expense) => {
    if (!window.confirm(`Delete this expense?`)) return;
    try {
      const table = useExpenseRequests ? 'expense_requests' : 'expense_requests';
      const { error } = await supabase.from(table).delete().eq('id', expense.id);
      if (error) throw error;
      notifications.show({ title: 'Deleted', message: 'Expense removed', color: 'orange' });
      fetchExpenses();
    } catch (e: any) {
      notifications.show({ title: 'Error', message: e.message, color: 'red' });
    }
  };

  const openEdit = (exp: Expense) => {
    setEditingExpense(exp);
    setFormData({
      expense_date: exp.expense_date,
      category: exp.category,
      description: exp.description,
      amount: exp.amount,
      vendor_name: exp.vendor_name || '',
      notes: '',
    });
    setModalOpen(true);
  };

  const getStatusColor = (s: string) => {
    const map: Record<string, string> = { approved: 'green', pending: 'orange', rejected: 'red', submitted: 'blue' };
    return map[s] || 'gray';
  };

  // ── Render ─────────────────────────────────────────────────────

  return (
    <Stack gap="lg">
      {/* Summary Cards */}
      <Grid>
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <Paper p="lg" withBorder radius="md" style={{ borderLeft: '4px solid var(--mantine-color-red-6)' }}>
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Total Expenses (Period)</Text>
                <Text fw={700} size="xl">${stats.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
              </div>
              <ThemeIcon size={48} radius="md" variant="light" color="red">
                <IconReceipt size={24} />
              </ThemeIcon>
            </Group>
          </Paper>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <Paper p="lg" withBorder radius="md" style={{ borderLeft: '4px solid var(--mantine-color-blue-6)' }}>
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>This Month</Text>
                <Text fw={700} size="xl">${stats.thisMonth.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
              </div>
              <ThemeIcon size={48} radius="md" variant="light" color="blue">
                <IconCalendar size={24} />
              </ThemeIcon>
            </Group>
          </Paper>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <Paper p="lg" withBorder radius="md" style={{ borderLeft: '4px solid var(--mantine-color-grape-6)' }}>
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Categories</Text>
                <Text fw={700} size="xl">{Object.keys(stats.byCategory).length}</Text>
              </div>
              <ThemeIcon size={48} radius="md" variant="light" color="grape">
                <IconChartPie size={24} />
              </ThemeIcon>
            </Group>
          </Paper>
        </Grid.Col>
      </Grid>

      {/* Category Breakdown */}
      {stats.topCategories.length > 0 && (
        <Card p="lg" withBorder radius="md">
          <Text fw={600} mb="md">Top Expense Categories</Text>
          <Stack gap="sm">
            {stats.topCategories.map(([cat, amount]) => {
              const pct = stats.totalExpenses > 0 ? (amount / stats.totalExpenses) * 100 : 0;
              const color = getCategoryColor(cat);
              return (
                <div key={cat}>
                  <Group justify="space-between" mb={4}>
                    <Group gap="xs">
                      <Badge color={color} variant="dot" size="sm">{cat}</Badge>
                    </Group>
                    <Group gap="xs">
                      <Text size="sm" fw={600}>${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
                      <Text size="xs" c="dimmed">({pct.toFixed(1)}%)</Text>
                    </Group>
                  </Group>
                  <div style={{ height: 6, background: '#f1f3f5', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: `var(--mantine-color-${color}-6)`, borderRadius: 3, transition: 'width 0.3s' }} />
                  </div>
                </div>
              );
            })}
          </Stack>
        </Card>
      )}

      {/* Main Expenses Table */}
      <Card p="lg" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <div>
            <Text fw={700} size="xl">Expenses</Text>
            <Text c="dimmed" size="sm">Track and categorize business expenses</Text>
          </div>
          <Button leftSection={<IconPlus size={16} />} onClick={() => { resetForm(); setModalOpen(true); }}>
            Add Expense
          </Button>
        </Group>

        {/* Filters */}
        <Grid mb="md">
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <TextInput
              placeholder="Search expenses..."
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 3 }}>
            <Select
              placeholder="All Categories"
              data={EXPENSE_CATEGORIES.map(c => ({ value: c, label: c }))}
              value={categoryFilter}
              onChange={setCategoryFilter}
              clearable
              leftSection={<IconFilter size={16} />}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 6, sm: 2.5 }}>
            <TextInput label="From" type="date" size="xs" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </Grid.Col>
          <Grid.Col span={{ base: 6, sm: 2.5 }}>
            <TextInput label="To" type="date" size="xs" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </Grid.Col>
        </Grid>

        {loading ? (
          <Center h={200}><Loader /></Center>
        ) : filtered.length === 0 ? (
          <Alert color="blue" icon={<IconReceipt size={16} />}>
            No expenses found for the selected period. Click "Add Expense" to record one.
          </Alert>
        ) : (
          <Box style={{ overflowX: 'auto' }}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Category</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Amount</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filtered.map(exp => (
                  <Table.Tr key={exp.id}>
                    <Table.Td>
                      <Text size="sm">{dayjs(exp.expense_date).format('MMM D, YYYY')}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={getCategoryColor(exp.category)} variant="light" size="sm">
                        {exp.category}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" lineClamp={1}>{exp.description}</Text>
                      {exp.vendor_name && <Text size="xs" c="dimmed">{exp.vendor_name}</Text>}
                    </Table.Td>
                    <Table.Td>
                      <Text fw={600} size="sm" c="red">
                        ${exp.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={getStatusColor(exp.status)} size="sm">
                        {exp.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        <Tooltip label="View">
                          <ActionIcon variant="light" size="sm" onClick={() => { setViewExpense(exp); setViewModalOpen(true); }}>
                            <IconEye size={14} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Edit">
                          <ActionIcon variant="light" color="blue" size="sm" onClick={() => openEdit(exp)}>
                            <IconEdit size={14} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Delete">
                          <ActionIcon variant="light" color="red" size="sm" onClick={() => handleDelete(exp)}>
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Box>
        )}

        {/* Totals Footer */}
        {filtered.length > 0 && (
          <Paper p="md" withBorder mt="md" bg="gray.0">
            <Group justify="space-between">
              <Text size="sm" fw={600}>
                {filtered.length} expense{filtered.length > 1 ? 's' : ''} shown
              </Text>
              <Text fw={700} size="lg">
                Total: ${filtered.reduce((s, e) => s + e.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
            </Group>
          </Paper>
        )}
      </Card>

      {/* ── Add/Edit Expense Modal ───────────────────────────── */}
      <Modal
        opened={modalOpen}
        onClose={() => { setModalOpen(false); resetForm(); }}
        title={editingExpense ? 'Edit Expense' : 'Add Expense'}
        size="md"
      >
        <Stack gap="md">
          <Grid>
            <Grid.Col span={6}>
              <TextInput
                label="Date"
                type="date"
                required
                value={formData.expense_date}
                onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <Select
                label="Category"
                required
                data={EXPENSE_CATEGORIES.map(c => ({ value: c, label: c }))}
                value={formData.category}
                onChange={(v) => setFormData({ ...formData, category: v || '' })}
                searchable
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <TextInput
                label="Description"
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <NumberInput
                label="Amount"
                required
                prefix="$"
                decimalScale={2}
                fixedDecimalScale
                value={formData.amount}
                onChange={(v) => setFormData({ ...formData, amount: v || '' })}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput
                label="Vendor (optional)"
                value={formData.vendor_name}
                onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <Textarea
                label="Notes"
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Grid.Col>
          </Grid>

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => { setModalOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.category || !formData.amount || !formData.description}>
              {editingExpense ? 'Update' : 'Record Expense'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* ── View Expense Modal ───────────────────────────────── */}
      <Modal
        opened={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title="Expense Details"
        size="md"
      >
        {viewExpense && (
          <Stack gap="md">
            <Grid>
              <Grid.Col span={6}>
                <Paper p="sm" withBorder>
                  <Text size="xs" c="dimmed">Amount</Text>
                  <Text fw={700} size="xl" c="red">
                    ${viewExpense.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </Text>
                </Paper>
              </Grid.Col>
              <Grid.Col span={6}>
                <Paper p="sm" withBorder>
                  <Text size="xs" c="dimmed">Status</Text>
                  <Badge color={getStatusColor(viewExpense.status)} size="lg" mt={4}>
                    {viewExpense.status.toUpperCase()}
                  </Badge>
                </Paper>
              </Grid.Col>
            </Grid>
            <Divider />
            <Grid>
              <Grid.Col span={6}>
                <Text size="xs" c="dimmed">Date</Text>
                <Text>{dayjs(viewExpense.expense_date).format('MMM D, YYYY')}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="xs" c="dimmed">Category</Text>
                <Badge color={getCategoryColor(viewExpense.category)} variant="light">{viewExpense.category}</Badge>
              </Grid.Col>
              <Grid.Col span={12}>
                <Text size="xs" c="dimmed">Description</Text>
                <Text>{viewExpense.description}</Text>
              </Grid.Col>
              {viewExpense.vendor_name && (
                <Grid.Col span={12}>
                  <Text size="xs" c="dimmed">Vendor</Text>
                  <Text>{viewExpense.vendor_name}</Text>
                </Grid.Col>
              )}
            </Grid>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
};

export default Expenses;


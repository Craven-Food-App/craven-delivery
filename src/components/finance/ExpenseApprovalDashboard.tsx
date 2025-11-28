import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Badge,
  Button,
  Modal,
  Textarea,
  Stack,
  Group,
  Text,
  Select,
  NumberInput,
  Paper,
  Tabs,
  Grid,
  ActionIcon,
  Tooltip,
  Loader,
  Center,
  Alert,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { supabase } from '@/integrations/supabase/client';
import {
  IconCheck,
  IconX,
  IconEye,
  IconFileText,
  IconCurrencyDollar,
  IconCalendar,
  IconUser,
  IconRefresh,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { getExpenseStatusColor, getPriorityColor } from '@/utils/finance';

interface ExpenseRequest {
  id: string;
  request_number: string;
  requester_name?: string;
  amount: number;
  description: string;
  business_purpose: string;
  expense_date: string;
  status: string;
  priority: string;
  expense_category: { name: string; code: string };
  department: { name: string };
  receipt_urls: string[];
  created_at: string;
}

export const ExpenseApprovalDashboard: React.FC = () => {
  const [expenses, setExpenses] = useState<ExpenseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseRequest | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('pending');
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      // Remove problematic user_profiles relationship to avoid query failures
      let query = supabase
        .from('expense_requests')
        .select(`
          *,
          expense_category:expense_categories(name, code),
          department:departments(name)
        `)
        .order('created_at', { ascending: false });

      // Filter by status based on active tab
      // IMPORTANT: This must match all possible tab values
      switch (activeTab) {
        case 'pending':
          // Show all expenses that need approval, including drafts and submitted expenses
          query = query.in('status', ['draft', 'submitted', 'pending_approval']);
          break;
        case 'approved':
          query = query.eq('status', 'approved');
          break;
        case 'rejected':
          query = query.eq('status', 'rejected');
          break;
        case 'paid':
          query = query.eq('status', 'paid');
          break;
        case 'cancelled':
          query = query.eq('status', 'cancelled');
          break;
        case 'draft':
          query = query.eq('status', 'draft');
          break;
        case 'all':
          // Show all expenses regardless of status - no filter
          break;
        default:
          // If tab value matches a status directly, filter by it
          // This handles any status values we might have missed
          console.warn(`Unknown tab value: ${activeTab}, filtering by status`);
          query = query.eq('status', activeTab);
          break;
      }

      const { data, error } = await query;

      if (error) {
        // Only suppress truly harmless schema errors (table doesn't exist)
        if (error.code === '42P01') {
          console.warn('Expense requests table does not exist yet:', error.message);
          setExpenses([]);
          return;
        }
        
        // Log and show actual errors
        console.error('Error fetching expenses:', error);
        notifications.show({
          title: 'Error',
          message: `Failed to load expenses: ${error.message}`,
          color: 'red',
        });
        setExpenses([]);
        return;
      }

      console.log(`Fetched ${data?.length || 0} expense requests for tab: ${activeTab}`);
      if (data && data.length > 0) {
        console.log('Sample expense:', data[0]);
      }

      // Also query pending expenses separately to get accurate count for badge
      const { data: pendingExpenses } = await supabase
        .from('expense_requests')
        .select('amount')
        .in('status', ['draft', 'submitted', 'pending_approval']);
      
      const actualPendingCount = pendingExpenses?.length || 0;
      const actualPendingAmount = pendingExpenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
      setPendingCount(actualPendingCount);
      setPendingAmount(actualPendingAmount);
      
      console.log(`Pending count from DB: ${actualPendingCount}, Amount: $${actualPendingAmount}`);

      // Also query all expenses to debug (remove after testing)
      const { data: allExpenses } = await supabase
        .from('expense_requests')
        .select('id, request_number, status, requester_id, amount')
        .limit(10);
      console.log(`Total expense requests in DB: ${allExpenses?.length || 0}`, allExpenses);

      // Fetch requester emails from auth.users if available
      // Note: We can't join auth.users directly, so we'll try to get user profiles
      const requesterIds = [...new Set((data || []).map(exp => exp.requester_id).filter(Boolean))];
      let requesterMap = new Map<string, string>();
      
      if (requesterIds.length > 0) {
        try {
          // Try to get user profiles for requester names
          const { data: profiles } = await supabase
            .from('user_profiles')
            .select('user_id, full_name, email')
            .in('user_id', requesterIds);
          
          if (profiles) {
            profiles.forEach(profile => {
              requesterMap.set(
                profile.user_id,
                profile.full_name || profile.email || 'Unknown User'
              );
            });
          }
        } catch (err) {
          console.warn('Could not fetch user profiles for requesters:', err);
        }
      }

      // Format expenses with requester names
      const formatted = (data || []).map(exp => ({
        ...exp,
        requester_name: requesterMap.get(exp.requester_id) || exp.requester_id?.substring(0, 8) || 'Unknown',
      }));

      setExpenses(formatted as any);
    } catch (error: any) {
      console.error('Unexpected error fetching expenses:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to load expenses',
        color: 'red',
      });
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleApprove = async () => {
    if (!selectedExpense) return;

    setActionLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('expense_requests')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', selectedExpense.id);

      if (error) throw error;

      // Log approval
      await supabase.from('expense_approval_log').insert({
        expense_request_id: selectedExpense.id,
        action: 'approved',
        actor_id: user.id,
        actor_name: user.email || 'Unknown',
        previous_status: selectedExpense.status,
        new_status: 'approved',
        comments: reviewNotes,
      });

      notifications.show({
        title: 'Approved',
        message: `Expense ${selectedExpense.request_number} has been approved`,
        color: 'green',
      });

      setModalOpen(false);
      setReviewNotes('');
      fetchExpenses();
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to approve expense',
        color: 'red',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedExpense) return;

    setActionLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (!reviewNotes.trim()) {
        notifications.show({
          title: 'Required',
          message: 'Please provide a rejection reason',
          color: 'orange',
        });
        setActionLoading(false);
        return;
      }

      const { error } = await supabase
        .from('expense_requests')
        .update({
          status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          rejection_reason: reviewNotes,
        })
        .eq('id', selectedExpense.id);

      if (error) throw error;

      // Log rejection
      await supabase.from('expense_approval_log').insert({
        expense_request_id: selectedExpense.id,
        action: 'rejected',
        actor_id: user.id,
        actor_name: user.email || 'Unknown',
        previous_status: selectedExpense.status,
        new_status: 'rejected',
        comments: reviewNotes,
      });

      notifications.show({
        title: 'Rejected',
        message: `Expense ${selectedExpense.request_number} has been rejected`,
        color: 'red',
      });

      setModalOpen(false);
      setReviewNotes('');
      fetchExpenses();
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to reject expense',
        color: 'red',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Pending count/amount are now fetched separately and stored in state
  // This ensures the badge shows accurate counts regardless of which tab is active
  
  return (
    <Stack gap="lg">
      <Card p="lg" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <div>
            <Text fw={700} size="xl">Expense Approval Dashboard</Text>
            <Text c="dimmed" size="sm">Review and approve expense requests</Text>
            <Text size="xs" c="dimmed" mt={4}>
              Check browser console for debug logs
            </Text>
          </div>
          <Group>
            <Tooltip label="Refresh">
              <ActionIcon
                variant="light"
                onClick={() => {
                  console.log('Manual refresh triggered');
                  fetchExpenses();
                }}
              >
                <IconRefresh size={18} />
              </ActionIcon>
            </Tooltip>
            <Paper p="md" withBorder>
            <Stack gap={4}>
              <Text size="xs" c="dimmed">Pending Approval</Text>
              <Text fw={700} size="xl" c="orange">{pendingCount}</Text>
              <Text size="xs" c="dimmed">${pendingAmount.toLocaleString()}</Text>
            </Stack>
          </Paper>
        </Group>
        </Group>

        <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'pending')}>
          <Tabs.List>
            <Tabs.Tab value="pending">
              Pending ({pendingCount})
            </Tabs.Tab>
            <Tabs.Tab value="approved">Approved</Tabs.Tab>
            <Tabs.Tab value="rejected">Rejected</Tabs.Tab>
            <Tabs.Tab value="paid">Paid</Tabs.Tab>
            <Tabs.Tab value="all">All</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value={activeTab} pt="md">
            {loading ? (
              <Center h={200}>
                <Loader />
              </Center>
            ) : expenses.length === 0 ? (
              <Alert color="blue">No expenses found</Alert>
            ) : (
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Request #</Table.Th>
                    <Table.Th>Requester</Table.Th>
                    <Table.Th>Category</Table.Th>
                    <Table.Th>Amount</Table.Th>
                    <Table.Th>Description</Table.Th>
                    <Table.Th>Priority</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {expenses.map(expense => (
                    <Table.Tr key={expense.id}>
                      <Table.Td>
                        <Text fw={500}>{expense.request_number}</Text>
                      </Table.Td>
                      <Table.Td>{expense.requester_name || 'Unknown'}</Table.Td>
                      <Table.Td>
                        <Text size="sm">{expense.expense_category?.name || 'N/A'}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text fw={600} c="green">${expense.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Tooltip label={expense.description}>
                          <Text size="sm" truncate style={{ maxWidth: 200 }}>
                            {expense.description}
                          </Text>
                        </Tooltip>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={getPriorityColor(expense.priority)} size="sm">
                          {expense.priority.toUpperCase()}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={getExpenseStatusColor(expense.status)} size="sm">
                          {expense.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <Tooltip label="View Details">
                            <ActionIcon
                              variant="light"
                              onClick={() => {
                                setSelectedExpense(expense);
                                setModalOpen(true);
                              }}
                            >
                              <IconEye size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Tabs.Panel>
        </Tabs>
      </Card>

      {/* Detail Modal */}
      <Modal
        opened={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setReviewNotes('');
        }}
        title={`Expense Request: ${selectedExpense?.request_number}`}
        size="lg"
      >
        {selectedExpense && (
          <Stack gap="md">
            <Grid>
              <Grid.Col span={6}>
                <Paper p="sm" withBorder>
                  <Text size="xs" c="dimmed">Amount</Text>
                  <Text fw={700} size="xl" c="green">
                    ${selectedExpense.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </Text>
                </Paper>
              </Grid.Col>
              <Grid.Col span={6}>
                <Paper p="sm" withBorder>
                  <Text size="xs" c="dimmed">Status</Text>
                  <Badge color={getExpenseStatusColor(selectedExpense.status)} size="lg" mt={4}>
                    {selectedExpense.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </Paper>
              </Grid.Col>
            </Grid>

            <div>
              <Text size="sm" fw={500} mb={4}>Description</Text>
              <Text>{selectedExpense.description}</Text>
            </div>

            <div>
              <Text size="sm" fw={500} mb={4}>Business Purpose</Text>
              <Text>{selectedExpense.business_purpose}</Text>
            </div>

            <Grid>
              <Grid.Col span={6}>
                <Text size="sm" fw={500} mb={4}>Category</Text>
                <Text>{selectedExpense.expense_category?.name}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="sm" fw={500} mb={4}>Department</Text>
                <Text>{selectedExpense.department?.name || 'N/A'}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="sm" fw={500} mb={4}>Expense Date</Text>
                <Text>{dayjs(selectedExpense.expense_date).format('MMM D, YYYY')}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="sm" fw={500} mb={4}>Priority</Text>
                <Badge color={getPriorityColor(selectedExpense.priority)}>
                  {selectedExpense.priority.toUpperCase()}
                </Badge>
              </Grid.Col>
            </Grid>

            {selectedExpense.receipt_urls && selectedExpense.receipt_urls.length > 0 && (
              <div>
                <Text size="sm" fw={500} mb={4}>Receipts</Text>
                <Group>
                  {selectedExpense.receipt_urls.map((url, idx) => (
                    <Button
                      key={idx}
                      component="a"
                      href={url}
                      target="_blank"
                      leftSection={<IconFileText size={16} />}
                      variant="light"
                      size="xs"
                    >
                      Receipt {idx + 1}
                    </Button>
                  ))}
                </Group>
              </div>
            )}

            {['submitted', 'pending_approval'].includes(selectedExpense.status) && (
              <>
                <Textarea
                  label="Review Notes"
                  placeholder="Add comments or rejection reason..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                />
                <Group justify="flex-end">
                  <Button
                    variant="outline"
                    color="red"
                    leftSection={<IconX size={16} />}
                    onClick={handleReject}
                    loading={actionLoading}
                    disabled={!reviewNotes.trim()}
                  >
                    Reject
                  </Button>
                  <Button
                    color="green"
                    leftSection={<IconCheck size={16} />}
                    onClick={handleApprove}
                    loading={actionLoading}
                  >
                    Approve
                  </Button>
                </Group>
              </>
            )}
          </Stack>
        )}
      </Modal>
    </Stack>
  );
};


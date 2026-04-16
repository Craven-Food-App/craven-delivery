// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Button,
  Badge,
  Modal,
  Textarea,
  Group,
  Stack,
  Title,
  Text,
  Card,
  Box,
  Grid,
  Divider,
  Loader,
  ActionIcon,
  Table,
  ScrollArea,
  Pagination,
  Select,
} from '@mantine/core';
import {
  IconCheck,
  IconX,
  IconTrash,
  IconCurrencyDollar,
  IconPlus,
  IconFileText,
  IconTrendingUp,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';
import { ExpenseRequestForm } from '@/components/finance/ExpenseRequestForm';
import { notifications } from '@mantine/notifications';

interface Approval {
  id: string;
  request_type: string;
  requester_name: string;
  amount: number;
  description: string;
  status: string;
  priority: string;
  requested_date: string;
}

export const FinancialApprovals: React.FC = () => {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [expenseFormVisible, setExpenseFormVisible] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ceo_financial_approvals')
        .select('*')
        .order('requested_date', { ascending: false });

      if (error) throw error;
      setApprovals(data || []);
    } catch (error) {
      console.error('Error fetching approvals:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load approvals',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (approval: Approval) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('ceo_financial_approvals')
        .update({
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes
        })
        .eq('id', approval.id);

      if (error) throw error;

      await supabase.rpc('log_ceo_action', {
        p_action_type: 'approved_financial_request',
        p_action_category: 'financial',
        p_target_type: 'financial_approval',
        p_target_id: approval.id,
        p_target_name: approval.description,
        p_description: `Approved ${approval.request_type} request for $${approval.amount.toLocaleString()} from ${approval.requester_name}`,
        p_severity: 'high'
      });

      notifications.show({
        title: 'Approval Granted',
        message: `Approved $${approval.amount.toLocaleString()} request`,
        color: 'green',
        icon: <IconCheck size={18} />,
      });
      setModalVisible(false);
      setReviewNotes('');
      fetchApprovals();
    } catch (error: any) {
      console.error('Error approving:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to approve',
        color: 'red',
      });
    }
  };

  const handleDeny = async (approval: Approval) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('ceo_financial_approvals')
        .update({
          status: 'rejected',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes
        })
        .eq('id', approval.id);

      if (error) throw error;

      await supabase.rpc('log_ceo_action', {
        p_action_type: 'denied_financial_request',
        p_action_category: 'financial',
        p_target_type: 'financial_approval',
        p_target_id: approval.id,
        p_target_name: approval.description,
        p_description: `Denied ${approval.request_type} request for $${approval.amount.toLocaleString()} from ${approval.requester_name}`,
        p_severity: 'high'
      });

      notifications.show({
        title: 'Request Denied',
        message: 'Financial request has been denied',
        color: 'red',
        icon: <IconX size={18} />,
      });
      setModalVisible(false);
      setReviewNotes('');
      fetchApprovals();
    } catch (error: any) {
      console.error('Error denying:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to deny',
        color: 'red',
      });
    }
  };

  const handleDelete = async (approval: Approval) => {
    try {
      const { error } = await supabase
        .from('ceo_financial_approvals')
        .delete()
        .eq('id', approval.id);

      if (error) throw error;

      notifications.show({
        title: 'Request Deleted',
        message: 'Financial request has been deleted',
        color: 'green',
        icon: <IconCheck size={18} />,
      });

      if (selectedApproval?.id === approval.id) {
        setModalVisible(false);
        setSelectedApproval(null);
      }
      setReviewNotes('');
      fetchApprovals();
    } catch (error: any) {
      console.error('Error deleting approval:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to delete request',
        color: 'red',
      });
    }
  };

  const pendingApprovals = approvals.filter(a => a.status === 'pending');
  const totalPendingAmount = pendingApprovals.reduce((sum, a) => sum + a.amount, 0);
  const paginatedApprovals = approvals.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'yellow',
      approved: 'green',
      denied: 'red',
      rejected: 'red',
      'on-hold': 'orange',
    };
    return colors[status] || 'gray';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'gray',
      normal: 'blue',
      high: 'orange',
      urgent: 'red',
    };
    return colors[priority] || 'gray';
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      expense: 'blue',
      budget: 'purple',
      bonus: 'green',
      raise: 'orange',
      investment: 'red',
    };
    return colors[type] || 'gray';
  };

  return (
    <Stack gap="xl">
      {/* Header */}
      <Group justify="space-between" align="flex-end">
        <Box>
          <Title order={2} fw={800} c="dark.9" style={{ letterSpacing: '-0.5px', marginBottom: '8px' }}>
            Financial Approvals
          </Title>
          <Text size="md" c="gray.6" fw={500}>
            Review and approve financial requests
          </Text>
        </Box>
        <Group>
          <Card
            withBorder
            radius="md"
            padding="md"
            style={{
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              borderColor: '#fbbf24',
            }}
          >
            <Stack gap={4} align="center">
              <Text size="xs" fw={700} c="gray.6" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                Pending Requests
              </Text>
              <Text size="2xl" fw={900} c="orange.7" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                {pendingApprovals.length}
              </Text>
              <Text size="sm" fw={600} c="dark.6">
                ${totalPendingAmount.toLocaleString()} total
              </Text>
            </Stack>
          </Card>
          <Button
            leftSection={<IconPlus size={18} />}
            onClick={() => setExpenseFormVisible(true)}
            size="lg"
            radius="md"
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            }}
          >
            Add Expense Request
          </Button>
        </Group>
      </Group>

      {/* Table */}
      <Card
        withBorder
        radius="lg"
        padding={0}
        style={{
          background: 'white',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <Box p="xl" style={{ display: 'flex', justifyContent: 'center' }}>
            <Loader size="lg" />
          </Box>
        ) : (
          <>
            <ScrollArea>
              <Table
                horizontalSpacing="lg"
                verticalSpacing="md"
                style={{ minWidth: 800 }}
                styles={{
                  thead: {
                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                    borderBottom: '2px solid #e2e8f0',
                  },
                  th: {
                    fontWeight: 700,
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: '#64748b',
                    padding: '16px',
                  },
                  td: {
                    padding: '16px',
                    borderBottom: '1px solid #f1f5f9',
                  },
                  tr: {
                    '&:hover': {
                      background: '#f8fafc',
                    },
                  },
                }}
              >
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Requester</Table.Th>
                    <Table.Th>Amount</Table.Th>
                    <Table.Th>Description</Table.Th>
                    <Table.Th>Priority</Table.Th>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {paginatedApprovals.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={8} style={{ textAlign: 'center', padding: '48px' }}>
                        <Stack align="center" gap="md">
                          <IconFileText size={48} color="#cbd5e1" />
                          <Text c="gray.5" fw={500}>
                            No financial approvals found
                          </Text>
                        </Stack>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    paginatedApprovals.map((approval) => (
                      <Table.Tr key={approval.id}>
                        <Table.Td>
                          <Badge
                            size="lg"
                            variant="light"
                            color={getTypeColor(approval.request_type)}
                            style={{ fontWeight: 700, textTransform: 'uppercase' }}
                          >
                            {approval.request_type}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text fw={600} c="dark.9">
                            {approval.requester_name}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="lg" fw={900} c="green.7" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                            ${approval.amount.toLocaleString()}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dark.7" lineClamp={1} style={{ maxWidth: '300px' }}>
                            {approval.description}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            size="md"
                            variant="filled"
                            color={getPriorityColor(approval.priority)}
                            style={{ fontWeight: 700 }}
                          >
                            {approval.priority.toUpperCase()}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="gray.6">
                            {dayjs(approval.requested_date).format('MMM D, YYYY')}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            size="lg"
                            variant="light"
                            color={getStatusColor(approval.status)}
                            style={{ fontWeight: 700, textTransform: 'uppercase' }}
                          >
                            {approval.status}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          {approval.status === 'pending' ? (
                            <Group justify="flex-end" gap="xs">
                              <Button
                                size="sm"
                                variant="light"
                                color="green"
                                leftSection={<IconCheck size={16} />}
                                onClick={() => {
                                  setSelectedApproval(approval);
                                  setModalVisible(true);
                                }}
                                radius="md"
                              >
                                Review
                              </Button>
                              <ActionIcon
                                size="lg"
                                variant="light"
                                color="red"
                                onClick={() => handleDelete(approval)}
                                aria-label="Delete request"
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Group>
                          ) : (
                            <Text size="xs" c="gray.5" style={{ textAlign: 'right' }}>
                              Completed
                            </Text>
                          )}
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </ScrollArea>
            {approvals.length > pageSize && (
              <Box p="md" style={{ borderTop: '1px solid #e2e8f0' }}>
                <Group justify="space-between">
                  <Text size="sm" c="gray.6">
                    Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, approvals.length)} of {approvals.length} approvals
                  </Text>
                  <Group>
                    <Select
                      value={pageSize.toString()}
                      onChange={(value) => {
                        setPageSize(Number(value));
                        setCurrentPage(1);
                      }}
                      data={['10', '25', '50', '100']}
                      style={{ width: 80 }}
                      size="sm"
                    />
                    <Pagination
                      value={currentPage}
                      onChange={setCurrentPage}
                      total={Math.ceil(approvals.length / pageSize)}
                      size="sm"
                      radius="md"
                    />
                  </Group>
                </Group>
              </Box>
            )}
          </>
        )}
      </Card>

      {/* Review Modal */}
      <Modal
        opened={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setReviewNotes('');
        }}
        title={
          <Title order={3} fw={800} c="dark.9">
            Review Approval Request
          </Title>
        }
        size="lg"
        radius="lg"
        styles={{
          header: {
            background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
            borderBottom: '1px solid #e2e8f0',
            padding: '24px',
          },
          body: {
            padding: '24px',
          },
        }}
      >
        {selectedApproval && (
          <Stack gap="xl">
            <Card
              withBorder
              radius="md"
              padding="lg"
              style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
                borderColor: '#e2e8f0',
              }}
            >
              <Grid>
                <Grid.Col span={6}>
                  <Text size="xs" fw={700} c="gray.5" tt="uppercase" style={{ letterSpacing: '0.5px', marginBottom: '8px' }}>
                    Requester
                  </Text>
                  <Text size="md" fw={600} c="dark.9">
                    {selectedApproval.requester_name}
                  </Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="xs" fw={700} c="gray.5" tt="uppercase" style={{ letterSpacing: '0.5px', marginBottom: '8px' }}>
                    Amount
                  </Text>
                  <Text size="2xl" fw={900} c="green.7" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                    ${selectedApproval.amount.toLocaleString()}
                  </Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="xs" fw={700} c="gray.5" tt="uppercase" style={{ letterSpacing: '0.5px', marginBottom: '8px' }}>
                    Type
                  </Text>
                  <Badge
                    size="lg"
                    variant="light"
                    color={getTypeColor(selectedApproval.request_type)}
                    style={{ fontWeight: 700, textTransform: 'uppercase' }}
                  >
                    {selectedApproval.request_type}
                  </Badge>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="xs" fw={700} c="gray.5" tt="uppercase" style={{ letterSpacing: '0.5px', marginBottom: '8px' }}>
                    Priority
                  </Text>
                  <Badge
                    size="lg"
                    variant="filled"
                    color={getPriorityColor(selectedApproval.priority)}
                    style={{ fontWeight: 700 }}
                  >
                    {selectedApproval.priority.toUpperCase()}
                  </Badge>
                </Grid.Col>
                <Grid.Col span={12}>
                  <Divider />
                  <Text size="xs" fw={700} c="gray.5" tt="uppercase" style={{ letterSpacing: '0.5px', marginTop: '16px', marginBottom: '8px' }}>
                    Description
                  </Text>
                  <Text size="sm" c="dark.7" style={{ lineHeight: 1.6 }}>
                    {selectedApproval.description}
                  </Text>
                </Grid.Col>
              </Grid>
            </Card>

            <Box>
              <Text size="sm" fw={600} c="dark.7" mb="xs">
                Review Notes
              </Text>
              <Textarea
                rows={4}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add notes about your decision..."
                radius="md"
                styles={{
                  input: {
                    borderColor: '#e2e8f0',
                    '&:focus': {
                      borderColor: '#3b82f6',
                    },
                  },
                }}
              />
            </Box>

            <Group justify="flex-end" mt="xl">
              <Button
                variant="subtle"
                onClick={() => {
                  setModalVisible(false);
                  setReviewNotes('');
                }}
                radius="md"
              >
                Cancel
              </Button>
              <Button
                color="red"
                variant="light"
                leftSection={<IconX size={16} />}
                onClick={() => handleDeny(selectedApproval)}
                radius="md"
              >
                Deny
              </Button>
              <Button
                color="red"
                variant="subtle"
                leftSection={<IconTrash size={16} />}
                onClick={() => handleDelete(selectedApproval)}
                radius="md"
              >
                Delete
              </Button>
              <Button
                color="green"
                leftSection={<IconCheck size={16} />}
                onClick={() => handleApprove(selectedApproval)}
                radius="md"
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                }}
              >
                Approve
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Add Expense Request Modal */}
      <Modal
        opened={expenseFormVisible}
        onClose={() => setExpenseFormVisible(false)}
        title={
          <Title order={3} fw={800} c="dark.9">
            New Expense Request
          </Title>
        }
        size="xl"
        radius="lg"
        styles={{
          header: {
            background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
            borderBottom: '1px solid #e2e8f0',
            padding: '24px',
          },
          body: {
            padding: '24px',
          },
        }}
      >
        <ExpenseRequestForm
          onSuccess={() => {
            setExpenseFormVisible(false);
            fetchApprovals();
          }}
          onCancel={() => setExpenseFormVisible(false)}
        />
      </Modal>
    </Stack>
  );
};

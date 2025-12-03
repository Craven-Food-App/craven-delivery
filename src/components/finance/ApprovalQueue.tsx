import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Badge,
  Button,
  Group,
  Text,
  Stack,
  Modal,
  Textarea,
  Title,
  Paper,
  ActionIcon,
  Tooltip,
  Alert,
  Tabs,
  Select,
  TextInput,
} from '@mantine/core';
import {
  IconCheck,
  IconX,
  IconClock,
  IconAlertCircle,
  IconCurrencyDollar,
  IconFileText,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { useFinanceRBAC } from '@/hooks/useFinanceRBAC';
import { logFinanceAction } from '@/utils/financePermissions';
import dayjs from 'dayjs';

export const ApprovalQueue: React.FC = () => {
  const { userRoles, getPrimaryRole } = useFinanceRBAC();
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<any | null>(null);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [filter, setFilter] = useState<string>('pending');

  useEffect(() => {
    fetchApprovals();
  }, [filter]);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('approval_queue')
        .select('*')
        .order('requested_at', { ascending: false });

      if (filter === 'pending') {
        query = query.eq('status', 'pending');
      } else if (filter === 'my-requests') {
        query = query.eq('requested_by', user.id);
      } else {
        query = query.in('status', ['approved', 'rejected']);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      setApprovals(data || []);
    } catch (error) {
      console.error('Error fetching approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedApproval) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const approvalHistory = selectedApproval.approval_history || [];
      approvalHistory.push({
        action: 'approved',
        approver_id: user.id,
        approver_role: selectedApproval.current_approver_role,
        approved_at: new Date().toISOString(),
        notes: notes,
      });

      const { error } = await supabase
        .from('approval_queue')
        .update({
          status: 'approved',
          updated_at: new Date().toISOString(),
          approval_history: approvalHistory,
        })
        .eq('id', selectedApproval.id);

      if (error) throw error;

      // Log audit action
      await logFinanceAction(user.id, {
        actionType: 'approve',
        resourceType: selectedApproval.transaction_type,
        resourceId: selectedApproval.transaction_id,
        newValues: { status: 'approved', notes },
        complianceTag: 'SOX',
        severity: 'critical',
      });

      setApproveModalOpen(false);
      setSelectedApproval(null);
      setNotes('');
      fetchApprovals();
    } catch (error) {
      console.error('Error approving:', error);
      alert('Failed to approve transaction');
    }
  };

  const handleReject = async () => {
    if (!selectedApproval) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const approvalHistory = selectedApproval.approval_history || [];
      approvalHistory.push({
        action: 'rejected',
        approver_id: user.id,
        approver_role: selectedApproval.current_approver_role,
        rejected_at: new Date().toISOString(),
        notes: notes,
      });

      const { error } = await supabase
        .from('approval_queue')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString(),
          approval_history: approvalHistory,
        })
        .eq('id', selectedApproval.id);

      if (error) throw error;

      // Log audit action
      await logFinanceAction(user.id, {
        actionType: 'reject',
        resourceType: selectedApproval.transaction_type,
        resourceId: selectedApproval.transaction_id,
        newValues: { status: 'rejected', notes },
        complianceTag: 'SOX',
        severity: 'critical',
      });

      setRejectModalOpen(false);
      setSelectedApproval(null);
      setNotes('');
      fetchApprovals();
    } catch (error) {
      console.error('Error rejecting:', error);
      alert('Failed to reject transaction');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      pending: { color: 'orange', label: 'Pending' },
      approved: { color: 'green', label: 'Approved' },
      rejected: { color: 'red', label: 'Rejected' },
      escalated: { color: 'yellow', label: 'Escalated' },
    };

    const config = statusConfig[status] || { color: 'gray', label: status };
    return <Badge color={config.color}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <Stack gap="lg" p="lg">
      <Group justify="space-between">
        <Title order={2}>Approval Queue</Title>
        <Select
          value={filter}
          onChange={(value) => setFilter(value || 'pending')}
          data={[
            { value: 'pending', label: 'Pending Approvals' },
            { value: 'my-requests', label: 'My Requests' },
            { value: 'history', label: 'Approval History' },
          ]}
        />
      </Group>

      {approvals.length === 0 && !loading && (
        <Alert icon={<IconAlertCircle size={16} />} title="No Approvals">
          {filter === 'pending' 
            ? 'You have no pending approvals at this time.'
            : 'No approvals found for this filter.'}
        </Alert>
      )}

      <Card p="lg" withBorder>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Type</Table.Th>
              <Table.Th>Amount</Table.Th>
              <Table.Th>Requested By</Table.Th>
              <Table.Th>Date</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {approvals.map((approval) => (
              <Table.Tr key={approval.id}>
                <Table.Td>
                  <Group gap="xs">
                    <IconFileText size={16} />
                    <Text fw={500}>{approval.transaction_type.replace('_', ' ').toUpperCase()}</Text>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Text fw={600}>{formatCurrency(approval.amount || 0, approval.currency || 'USD')}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{approval.requested_by || 'N/A'}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{dayjs(approval.requested_at).format('MMM D, YYYY h:mm A')}</Text>
                </Table.Td>
                <Table.Td>{getStatusBadge(approval.status)}</Table.Td>
                <Table.Td>
                  {approval.status === 'pending' && (
                    <Group gap="xs">
                      <Tooltip label="Approve">
                        <ActionIcon
                          color="green"
                          variant="light"
                          onClick={() => {
                            setSelectedApproval(approval);
                            setApproveModalOpen(true);
                          }}
                        >
                          <IconCheck size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Reject">
                        <ActionIcon
                          color="red"
                          variant="light"
                          onClick={() => {
                            setSelectedApproval(approval);
                            setRejectModalOpen(true);
                          }}
                        >
                          <IconX size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>

      {/* Approve Modal */}
      <Modal
        opened={approveModalOpen}
        onClose={() => {
          setApproveModalOpen(false);
          setSelectedApproval(null);
          setNotes('');
        }}
        title="Approve Transaction"
      >
        {selectedApproval && (
          <Stack gap="md">
            <Paper p="md" withBorder>
              <Text size="sm" c="dimmed">Transaction Type</Text>
              <Text fw={600}>{selectedApproval.transaction_type.replace('_', ' ').toUpperCase()}</Text>
            </Paper>
            <Paper p="md" withBorder>
              <Text size="sm" c="dimmed">Amount</Text>
              <Text fw={600} size="lg">
                {formatCurrency(selectedApproval.amount || 0, selectedApproval.currency || 'USD')}
              </Text>
            </Paper>
            <Textarea
              label="Approval Notes (Optional)"
              placeholder="Add any notes about this approval..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              minRows={3}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={() => setApproveModalOpen(false)}>
                Cancel
              </Button>
              <Button color="green" onClick={handleApprove}>
                Approve Transaction
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        opened={rejectModalOpen}
        onClose={() => {
          setRejectModalOpen(false);
          setSelectedApproval(null);
          setNotes('');
        }}
        title="Reject Transaction"
      >
        {selectedApproval && (
          <Stack gap="md">
            <Alert color="red" icon={<IconX size={16} />}>
              Are you sure you want to reject this transaction? This action cannot be undone.
            </Alert>
            <Paper p="md" withBorder>
              <Text size="sm" c="dimmed">Transaction Type</Text>
              <Text fw={600}>{selectedApproval.transaction_type.replace('_', ' ').toUpperCase()}</Text>
            </Paper>
            <Paper p="md" withBorder>
              <Text size="sm" c="dimmed">Amount</Text>
              <Text fw={600} size="lg">
                {formatCurrency(selectedApproval.amount || 0, selectedApproval.currency || 'USD')}
              </Text>
            </Paper>
            <Textarea
              label="Rejection Reason (Required)"
              placeholder="Please explain why this transaction is being rejected..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              minRows={3}
              required
            />
            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={() => setRejectModalOpen(false)}>
                Cancel
              </Button>
              <Button color="red" onClick={handleReject} disabled={!notes.trim()}>
                Reject Transaction
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
};





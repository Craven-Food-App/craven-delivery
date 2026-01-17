import React, { useEffect, useState } from 'react';
import { Stack, Table, Button, Select, Group, TextInput, Modal, Textarea, NumberInput, Text, Loader, Center, Badge } from '@mantine/core';
import { IconSearch, IconEye, IconEdit } from '@tabler/icons-react';
import { Title } from '@mantine/core';
import { FilterBar, FilterConfig } from '@/components/cxo/shared/FilterBar';
import { StatusBadge } from '@/components/cxo/shared/StatusBadge';
import { ticketsRepository } from '@/lib/cxo/repositories/ticketsRepository';
import { ExperienceTicket } from '@/types/cxo';
import { notifications } from '@mantine/notifications';
import { supabase } from '@/integrations/supabase/client';

const CxoTickets: React.FC = () => {
  const [tickets, setTickets] = useState<ExperienceTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    priority: '',
    needsApproval: '',
  });
  const [selectedTicket, setSelectedTicket] = useState<ExperienceTicket | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState<number>(0);

  useEffect(() => {
    loadTickets();
  }, [filters]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const data = await ticketsRepository.getAll({
        type: filters.type || undefined,
        status: filters.status || undefined,
        priority: filters.priority || undefined,
        needsApproval: filters.needsApproval === 'true' ? true : filters.needsApproval === 'false' ? false : undefined,
      });
      setTickets(data);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleViewDetails = async (ticketId: string) => {
    const ticket = await ticketsRepository.getById(ticketId);
    if (ticket) {
      setSelectedTicket(ticket);
      setDetailModalOpen(true);
    }
  };

  const handleApproveCredit = async () => {
    if (!selectedTicket) return;

    if (creditAmount <= 0) {
      notifications.show({
        title: 'Validation Error',
        message: 'Credit amount must be greater than 0',
        color: 'red',
      });
      return;
    }

    const success = await ticketsRepository.update(selectedTicket.id, {
      approvedCreditAmount: creditAmount,
      needsCxoApproval: false,
    });

    if (success) {
      notifications.show({
        title: 'Success',
        message: `Credit of $${creditAmount.toFixed(2)} approved`,
        color: 'green',
      });
      setApprovalModalOpen(false);
      setDetailModalOpen(false);
      setCreditAmount(0);
      loadTickets();
    } else {
      notifications.show({
        title: 'Error',
        message: 'Failed to approve credit',
        color: 'red',
      });
    }
  };

  const handleUpdateStatus = async (ticketId: string, newStatus: string) => {
    const success = await ticketsRepository.update(ticketId, { status: newStatus as any });
    if (success) {
      notifications.show({
        title: 'Success',
        message: 'Ticket status updated',
        color: 'green',
      });
      loadTickets();
    } else {
      notifications.show({
        title: 'Error',
        message: 'Failed to update ticket status',
        color: 'red',
      });
    }
  };

  const handleUpdatePriority = async (ticketId: string, newPriority: string) => {
    const success = await ticketsRepository.update(ticketId, { priority: newPriority as any });
    if (success) {
      notifications.show({
        title: 'Success',
        message: 'Ticket priority updated',
        color: 'green',
      });
      loadTickets();
    } else {
      notifications.show({
        title: 'Error',
        message: 'Failed to update ticket priority',
        color: 'red',
      });
    }
  };

  const handleTagRootCause = async (ticketId: string, rootCause: string) => {
    const success = await ticketsRepository.update(ticketId, { rootCauseTag: rootCause });
    if (success) {
      notifications.show({
        title: 'Success',
        message: 'Root cause tagged',
        color: 'green',
      });
      loadTickets();
    } else {
      notifications.show({
        title: 'Error',
        message: 'Failed to tag root cause',
        color: 'red',
      });
    }
  };

  const filterConfigs: FilterConfig[] = [
    {
      key: 'type',
      label: 'Type',
      type: 'select',
      options: [
        { value: '', label: 'All Types' },
        { value: 'driver', label: 'Driver' },
        { value: 'customer', label: 'Customer' },
        { value: 'merchant', label: 'Merchant' },
        { value: 'system', label: 'System' },
      ],
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: '', label: 'All Statuses' },
        { value: 'open', label: 'Open' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'resolved', label: 'Resolved' },
        { value: 'closed', label: 'Closed' },
      ],
    },
    {
      key: 'priority',
      label: 'Priority',
      type: 'select',
      options: [
        { value: '', label: 'All Priorities' },
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
        { value: 'critical', label: 'Critical' },
      ],
    },
    {
      key: 'needsApproval',
      label: 'Needs Approval',
      type: 'select',
      options: [
        { value: '', label: 'All' },
        { value: 'true', label: 'Yes' },
        { value: 'false', label: 'No' },
      ],
    },
  ];

  if (loading) {
    return (
      <Center style={{ minHeight: '50vh' }}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      <Title order={2}>Ticket Governance</Title>

      <FilterBar filters={filterConfigs} onFilterChange={handleFilterChange} onClear={() => setFilters({ type: '', status: '', priority: '', needsApproval: '' })} />

      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Created</Table.Th>
            <Table.Th>Type</Table.Th>
            <Table.Th>Category</Table.Th>
            <Table.Th>Priority</Table.Th>
            <Table.Th>Zone</Table.Th>
            <Table.Th>Summary</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Needs Approval</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {tickets.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={9}>
                <Text c="dimmed" ta="center" py="md">
                  No tickets found
                </Text>
              </Table.Td>
            </Table.Tr>
          ) : (
            tickets.map((ticket) => (
              <Table.Tr key={ticket.id}>
                <Table.Td>
                  <Text size="sm">{new Date(ticket.createdAt).toLocaleDateString()}</Text>
                </Table.Td>
                <Table.Td>
                  <Badge>{ticket.type}</Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{ticket.category}</Text>
                </Table.Td>
                <Table.Td>
                  <StatusBadge status={ticket.priority} />
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{ticket.zone || 'N/A'}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" lineClamp={2}>
                    {ticket.summary}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <StatusBadge status={ticket.status} />
                </Table.Td>
                <Table.Td>
                  {ticket.needsCxoApproval ? (
                    <Badge color="red">Yes</Badge>
                  ) : (
                    <Badge color="gray">No</Badge>
                  )}
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Button size="xs" variant="subtle" leftSection={<IconEye size={14} />} onClick={() => handleViewDetails(ticket.id)}>
                      View
                    </Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))
          )}
        </Table.Tbody>
      </Table>

      {/* Ticket Detail Modal */}
      <Modal
        opened={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedTicket(null);
        }}
        title="Ticket Details"
        size="lg"
      >
        {selectedTicket && (
          <Stack gap="md">
            <div>
              <Text size="sm" c="dimmed">
                Summary
              </Text>
              <Text fw={500}>{selectedTicket.summary}</Text>
            </div>
            <div>
              <Text size="sm" c="dimmed">
                Description
              </Text>
              <Text>{selectedTicket.description}</Text>
            </div>
            <Group>
              <div>
                <Text size="sm" c="dimmed">
                  Type
                </Text>
                <Badge>{selectedTicket.type}</Badge>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  Status
                </Text>
                <StatusBadge status={selectedTicket.status} />
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  Priority
                </Text>
                <StatusBadge status={selectedTicket.priority} />
              </div>
            </Group>
            <Select
              label="Update Status"
              value={selectedTicket.status}
              onChange={(value) => value && handleUpdateStatus(selectedTicket.id, value)}
              data={[
                { value: 'open', label: 'Open' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'resolved', label: 'Resolved' },
                { value: 'closed', label: 'Closed' },
              ]}
            />
            <Select
              label="Update Priority"
              value={selectedTicket.priority}
              onChange={(value) => value && handleUpdatePriority(selectedTicket.id, value)}
              data={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'critical', label: 'Critical' },
              ]}
            />
            <TextInput
              label="Tag Root Cause"
              placeholder="e.g., merchant_prep_delay, routing_issue"
              defaultValue={selectedTicket.rootCauseTag || ''}
              onBlur={(e) => {
                if (e.target.value && e.target.value !== selectedTicket.rootCauseTag) {
                  handleTagRootCause(selectedTicket.id, e.target.value);
                }
              }}
            />
            {selectedTicket.needsCxoApproval && (
              <Button
                color="orange"
                onClick={() => {
                  setApprovalModalOpen(true);
                }}
              >
                Approve Credit
              </Button>
            )}
          </Stack>
        )}
      </Modal>

      {/* Credit Approval Modal */}
      <Modal opened={approvalModalOpen} onClose={() => setApprovalModalOpen(false)} title="Approve Credit">
        <Stack gap="md">
          <NumberInput
            label="Credit Amount"
            value={creditAmount}
            onChange={(value) => setCreditAmount(typeof value === 'number' ? value : 0)}
            min={0}
            step={0.01}
            prefix="$"
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setApprovalModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApproveCredit}>Approve</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};

export default CxoTickets;


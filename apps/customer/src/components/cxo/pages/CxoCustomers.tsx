import React, { useEffect, useState } from 'react';
import { Stack, Table, Card, Group, Text, Title, Loader, Center, Badge, Grid, Button, Modal, NumberInput } from '@mantine/core';
import { MetricCard } from '@/components/cxo/shared/MetricCard';
import { StatusBadge } from '@/components/cxo/shared/StatusBadge';
import { analyticsRepository } from '@/lib/cxo/repositories/analyticsRepository';
import { ticketsRepository } from '@/lib/cxo/repositories/ticketsRepository';
import { ExperienceAnalytics, ExperienceTicket } from '@/types/cxo';
import { IconStar, IconTrendingUp, IconAlertCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

const CxoCustomers: React.FC = () => {
  const [analytics, setAnalytics] = useState<ExperienceAnalytics | null>(null);
  const [customerTickets, setCustomerTickets] = useState<ExperienceTicket[]>([]);
  const [approvalTickets, setApprovalTickets] = useState<ExperienceTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<ExperienceTicket | null>(null);
  const [creditAmount, setCreditAmount] = useState<number>(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [analyticsData, ticketsData, approvalData] = await Promise.all([
        analyticsRepository.getLatest('customer'),
        ticketsRepository.getAll({ type: 'customer' }),
        ticketsRepository.getAll({ type: 'customer', needsApproval: true }),
      ]);
      setAnalytics(analyticsData);
      setCustomerTickets(ticketsData);
      setApprovalTickets(approvalData);
    } catch (error) {
      console.error('Error loading customer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveCredit = async (ticket: ExperienceTicket) => {
    setSelectedTicket(ticket);
    setCreditAmount(ticket.approvedCreditAmount || 0);
    setApprovalModalOpen(true);
  };

  const handleConfirmApproval = async () => {
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
      setSelectedTicket(null);
      setCreditAmount(0);
      loadData();
    } else {
      notifications.show({
        title: 'Error',
        message: 'Failed to approve credit',
        color: 'red',
      });
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
      <Title order={2}>Customer Experience Oversight</Title>

      {/* Customer KPIs */}
      <Grid>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="CSAT Score"
            value={analytics?.csatScore ? `${analytics.csatScore.toFixed(1)}%` : 'N/A'}
            icon={<IconStar size={20} />}
            color="green"
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="NPS Score"
            value={analytics?.npsScore ? analytics.npsScore.toFixed(1) : 'N/A'}
            icon={<IconTrendingUp size={20} />}
            color="blue"
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Complaint Rate"
            value={analytics?.repeatComplaintRate ? `${(analytics.repeatComplaintRate * 100).toFixed(1)}%` : 'N/A'}
            icon={<IconAlertCircle size={20} />}
            color="orange"
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Repeat Complaint Rate"
            value={analytics?.repeatComplaintRate ? `${(analytics.repeatComplaintRate * 100).toFixed(1)}%` : 'N/A'}
            icon={<IconAlertCircle size={20} />}
            color="red"
          />
        </Grid.Col>
      </Grid>

      {/* Customer Tickets */}
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={4} mb="md">
          Customer Tickets
        </Title>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Created</Table.Th>
              <Table.Th>Category</Table.Th>
              <Table.Th>Priority</Table.Th>
              <Table.Th>Summary</Table.Th>
              <Table.Th>Status</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {customerTickets.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text c="dimmed" ta="center" py="md">
                    No customer tickets found
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              customerTickets.map((ticket) => (
                <Table.Tr key={ticket.id}>
                  <Table.Td>
                    <Text size="sm">{new Date(ticket.createdAt).toLocaleDateString()}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{ticket.category}</Text>
                  </Table.Td>
                  <Table.Td>
                    <StatusBadge status={ticket.priority} />
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" lineClamp={2}>
                      {ticket.summary}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <StatusBadge status={ticket.status} />
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Card>

      {/* Credits Approval Queue */}
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={4} mb="md">
          Credits Approval Queue
        </Title>
        {approvalTickets.length === 0 ? (
          <Text c="dimmed" ta="center" py="md">
            No tickets requiring credit approval
          </Text>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Created</Table.Th>
                <Table.Th>Summary</Table.Th>
                <Table.Th>Requested Credit</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {approvalTickets.map((ticket) => (
                <Table.Tr key={ticket.id}>
                  <Table.Td>
                    <Text size="sm">{new Date(ticket.createdAt).toLocaleDateString()}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" lineClamp={2}>
                      {ticket.summary}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      ${ticket.approvedCreditAmount || 0}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Button
                      size="xs"
                      variant="light"
                      color="orange"
                      onClick={() => handleApproveCredit(ticket)}
                    >
                      Review & Approve
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      {/* Credit Approval Modal */}
      <Modal opened={approvalModalOpen} onClose={() => setApprovalModalOpen(false)} title="Approve Credit">
        <Stack gap="md">
          {selectedTicket && (
            <>
              <div>
                <Text size="sm" c="dimmed">Ticket Summary</Text>
                <Text fw={500}>{selectedTicket.summary}</Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">Description</Text>
                <Text>{selectedTicket.description}</Text>
              </div>
            </>
          )}
          <NumberInput
            label="Credit Amount"
            value={creditAmount}
            onChange={(value) => setCreditAmount(typeof value === 'number' ? value : 0)}
            min={0}
            step={0.01}
            prefix="$"
            required
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setApprovalModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmApproval}>Approve Credit</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};

export default CxoCustomers;


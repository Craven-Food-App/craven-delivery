import React, { useEffect, useState } from 'react';
import { Grid, Stack, Alert, Text, Group, Button, Table, Badge, Card, Title, Loader, Center } from '@mantine/core';
import { IconAlertTriangle, IconClock, IconUsers, IconShoppingCart, IconBuildingStore, IconMessageCircle } from '@tabler/icons-react';
import { MetricCard } from '@/components/cxo/shared/MetricCard';
import { SectionCard } from '@/components/cxo/shared/SectionCard';
import { StatusBadge } from '@/components/cxo/shared/StatusBadge';
import { metricsRepository } from '@/lib/cxo/repositories/metricsRepository';
import { ticketsRepository } from '@/lib/cxo/repositories/ticketsRepository';
import { merchantsRepository } from '@/lib/cxo/repositories/merchantsRepository';
import { incidentsRepository } from '@/lib/cxo/repositories/incidentsRepository';
import { initiativesRepository } from '@/lib/cxo/repositories/initiativesRepository';
import { ExperienceMetricsSnapshot, ExperienceTicket, ExperienceIncident, ExperienceInitiative } from '@/types/cxo';

const CxoDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<ExperienceMetricsSnapshot | null>(null);
  const [approvalTickets, setApprovalTickets] = useState<ExperienceTicket[]>([]);
  const [openIncidents, setOpenIncidents] = useState<ExperienceIncident[]>([]);
  const [atRiskMerchants, setAtRiskMerchants] = useState(0);
  const [activeInitiatives, setActiveInitiatives] = useState<ExperienceInitiative[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [metricsData, ticketsData, incidentsData, merchantsData, initiativesData] = await Promise.all([
        metricsRepository.getLatestSnapshot(),
        ticketsRepository.getAll({ needsApproval: true }),
        incidentsRepository.getAll({ status: 'open' }),
        merchantsRepository.getAtRisk(),
        initiativesRepository.getAll({ status: 'in_progress' }),
      ]);

      setMetrics(metricsData);
      setApprovalTickets(ticketsData.slice(0, 5));
      setOpenIncidents(incidentsData.slice(0, 5));
      setAtRiskMerchants(merchantsData.length);
      setActiveInitiatives(initiativesData.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
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
      <Title order={2}>Executive CX Dashboard</Title>

      {/* Top Metric Cards */}
      <Grid>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Open Orders"
            value={metrics?.openOrders || 0}
            icon={<IconShoppingCart size={20} />}
            color="blue"
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Delayed Orders"
            value={metrics?.delayedOrders || 0}
            icon={<IconClock size={20} />}
            color="red"
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Avg Delivery Time"
            value={metrics?.avgDeliveryMinutes ? `${Math.round(metrics.avgDeliveryMinutes)} min` : 'N/A'}
            icon={<IconClock size={20} />}
            color="orange"
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Tickets (Open/Escalated)"
            value={`${metrics?.ticketsOpenCount || 0} / ${metrics?.ticketsEscalatedCount || 0}`}
            icon={<IconMessageCircle size={20} />}
            color="yellow"
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Drivers Online"
            value={metrics?.driverOnlineCount || 0}
            icon={<IconUsers size={20} />}
            color="green"
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Drivers Offline"
            value={metrics?.driverOfflineCount || 0}
            icon={<IconUsers size={20} />}
            color="gray"
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="At-Risk Restaurants"
            value={atRiskMerchants}
            icon={<IconBuildingStore size={20} />}
            color="red"
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Cancellation Rate"
            value={metrics?.cancellationRate ? `${metrics.cancellationRate.toFixed(1)}%` : '0%'}
            icon={<IconAlertTriangle size={20} />}
            color="orange"
          />
        </Grid.Col>
      </Grid>

      {/* Problem Zones Panel */}
      {metrics && metrics.problemZones.length > 0 && (
        <SectionCard title="Problem Zones">
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Zone</Table.Th>
                <Table.Th>Delayed Orders</Table.Th>
                <Table.Th>Avg Delivery Time</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {metrics.problemZones.map((zone, idx) => (
                <Table.Tr key={idx}>
                  <Table.Td>{zone.zone}</Table.Td>
                  <Table.Td>
                    <Badge color="red">{zone.delayedOrders}</Badge>
                  </Table.Td>
                  <Table.Td>{zone.avgDeliveryTime ? `${Math.round(zone.avgDeliveryTime)} min` : 'N/A'}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </SectionCard>
      )}

      {/* Experience Alerts */}
      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <SectionCard
            title="Tickets Needing CXO Approval"
            actions={
              <Button size="xs" variant="subtle" onClick={() => window.location.href = '/cxo/tickets'}>
                View All
              </Button>
            }
          >
            {approvalTickets.length === 0 ? (
              <Text c="dimmed" ta="center" py="md">
                No tickets requiring approval
              </Text>
            ) : (
              <Table>
                <Table.Tbody>
                  {approvalTickets.map((ticket) => (
                    <Table.Tr key={ticket.id}>
                      <Table.Td>
                        <Text size="sm" fw={500}>
                          {ticket.summary}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {ticket.type} • {ticket.zone || 'No zone'}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <StatusBadge status={ticket.priority} />
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </SectionCard>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <SectionCard
            title="Open Incidents"
            actions={
              <Button size="xs" variant="subtle" onClick={() => window.location.href = '/cxo/incidents'}>
                View All
              </Button>
            }
          >
            {openIncidents.length === 0 ? (
              <Text c="dimmed" ta="center" py="md">
                No open incidents
              </Text>
            ) : (
              <Table>
                <Table.Tbody>
                  {openIncidents.map((incident) => (
                    <Table.Tr key={incident.id}>
                      <Table.Td>
                        <Text size="sm" fw={500}>
                          {incident.title}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {incident.type} • {incident.zone || 'No zone'}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <StatusBadge status={incident.severity} />
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </SectionCard>
        </Grid.Col>
      </Grid>

      {/* Today's CXO Priorities */}
      <SectionCard
        title="Today's CXO Priorities"
        actions={
          <Button size="xs" variant="subtle" onClick={() => window.location.href = '/cxo/initiatives'}>
            View All
          </Button>
        }
      >
        {activeInitiatives.length === 0 ? (
          <Text c="dimmed" ta="center" py="md">
            No active initiatives
          </Text>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Initiative</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Target Date</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {activeInitiatives.map((initiative) => (
                <Table.Tr key={initiative.id}>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {initiative.title}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <StatusBadge status={initiative.status} />
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{initiative.targetDate || 'No target date'}</Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </SectionCard>
    </Stack>
  );
};

export default CxoDashboard;


import React, { useState } from 'react';
import {
  Stack,
  Title,
  Text,
  Card,
  Group,
  Badge,
  Button,
  Grid,
  Tabs,
  Table,
  Alert,
  Textarea,
} from '@mantine/core';
import {
  IconZoomMoney,
  IconMail,
  IconUsers,
  IconChartPie,
  IconDownload,
  IconSend,
} from '@tabler/icons-react';
import { useToast } from '@/hooks/useEmbeddedToast';

export const EnhancedInvestorRelations: React.FC = () => {
  const [updateDraft, setUpdateDraft] = useState('');
  const toast = useToast();

  const investors = [
    {
      name: 'Venture Capital Fund A',
      type: 'Lead Investor',
      ownership: '25%',
      investment: '$5M',
      round: 'Series A',
    },
    {
      name: 'Angel Investor Group',
      type: 'Angel',
      ownership: '10%',
      investment: '$500K',
      round: 'Seed',
    },
    {
      name: 'Strategic Partner B',
      type: 'Strategic',
      ownership: '15%',
      investment: '$2M',
      round: 'Series A',
    },
  ];

  const sendUpdate = () => {
    toast.success('Investor update sent successfully');
    setUpdateDraft('');
  };

  return (
    <Stack gap="lg" p={{ base: 16, md: 24 }}>
      <Group justify="space-between" wrap="wrap">
        <div>
          <Title order={2}>Investor Relations</Title>
          <Text c="dimmed" size="sm">
            Manage investor communications, updates, and fundraising activities
          </Text>
        </div>
        <Group>
          <Button variant="light" leftSection={<IconMail size={16} />}>
            Schedule Call
          </Button>
          <Button leftSection={<IconDownload size={16} />} color="blue">
            Data Room
          </Button>
        </Group>
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder p="md">
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">
                  Total Investors
                </Text>
                <Title order={3}>{investors.length}</Title>
              </div>
              <IconUsers size={32} color="blue" />
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder p="md">
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">
                  Total Capital Raised
                </Text>
                <Title order={3}>$7.5M</Title>
              </div>
              <IconZoomMoney size={32} color="green" />
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder p="md">
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">
                  Current Valuation
                </Text>
                <Title order={3}>$30M</Title>
              </div>
              <IconChartPie size={32} color="orange" />
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder p="md">
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">
                  Next Update Due
                </Text>
                <Title order={3}>7 days</Title>
              </div>
              <IconMail size={32} color="purple" />
            </Group>
          </Card>
        </Grid.Col>
      </Grid>

      <Tabs defaultValue="investors">
        <Tabs.List>
          <Tabs.Tab value="investors" leftSection={<IconUsers size={16} />}>
            Investor List
          </Tabs.Tab>
          <Tabs.Tab value="updates" leftSection={<IconMail size={16} />}>
            Monthly Updates
          </Tabs.Tab>
          <Tabs.Tab value="captable" leftSection={<IconChartPie size={16} />}>
            Cap Table
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="investors" pt="md">
          <Card withBorder>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Investor Name</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Ownership</Table.Th>
                  <Table.Th>Investment</Table.Th>
                  <Table.Th>Round</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {investors.map((investor, idx) => (
                  <Table.Tr key={idx}>
                    <Table.Td>{investor.name}</Table.Td>
                    <Table.Td>
                      <Badge variant="light">{investor.type}</Badge>
                    </Table.Td>
                    <Table.Td>{investor.ownership}</Table.Td>
                    <Table.Td>{investor.investment}</Table.Td>
                    <Table.Td>
                      <Badge>{investor.round}</Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="updates" pt="md">
          <Stack gap="md">
            <Alert color="blue" icon={<IconMail />}>
              <Text fw={500}>Next Monthly Update Due: February 1, 2024</Text>
              <Text size="sm">
                Send consistent monthly updates to maintain investor confidence
              </Text>
            </Alert>

            <Card withBorder p="md">
              <Title order={4} mb="md">
                Draft Monthly Update
              </Title>
              <Textarea
                placeholder="Key highlights:&#10;- Financial performance&#10;- Major milestones&#10;- Team updates&#10;- Key metrics&#10;- Asks from investors"
                minRows={10}
                value={updateDraft}
                onChange={(e) => setUpdateDraft(e.target.value)}
              />
              <Group justify="flex-end" mt="md">
                <Button
                  leftSection={<IconSend size={16} />}
                  onClick={sendUpdate}
                  disabled={!updateDraft.trim()}
                >
                  Send Update
                </Button>
              </Group>
            </Card>

            <Card withBorder p="md">
              <Title order={4} mb="md">
                Update Template
              </Title>
              <Text size="sm" c="dimmed">
                <strong>Monthly Investor Update - [Month, Year]</strong>
                <br />
                <br />
                <strong>Executive Summary</strong>
                <br />
                - Key achievement or milestone
                <br />
                - Brief financial snapshot
                <br />
                <br />
                <strong>Financial Performance</strong>
                <br />
                - Revenue: [Amount] ([% change] vs prior month)
                <br />
                - Expenses: [Amount]
                <br />
                - Cash Position: [Amount]
                <br />
                - Burn Rate: [Amount/month]
                <br />
                - Runway: [Months]
                <br />
                <br />
                <strong>Key Metrics</strong>
                <br />
                - Customer count
                <br />
                - User growth
                <br />
                - Engagement metrics
                <br />
                <br />
                <strong>Major Accomplishments</strong>
                <br />
                - Product launches
                <br />
                - Partnerships
                <br />
                - Team hires
                <br />
                <br />
                <strong>Challenges & How We're Addressing Them</strong>
                <br />
                <br />
                <strong>Looking Ahead</strong>
                <br />
                - Next month's priorities
                <br />
                <br />
                <strong>How You Can Help</strong>
                <br />
                - Specific asks from investors
              </Text>
            </Card>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="captable" pt="md">
          <Card withBorder p="md">
            <Alert color="blue" icon={<IconChartPie />}>
              <Text fw={500}>Cap Table Management</Text>
              <Text size="sm">
                Detailed cap table visualization and scenario modeling available in
                Capital Structure tab
              </Text>
            </Alert>

            <Stack gap="md" mt="md">
              <Grid>
                <Grid.Col span={6}>
                  <Text size="sm" fw={500} c="dimmed">
                    Total Shares Outstanding
                  </Text>
                  <Title order={3}>10,000,000</Title>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="sm" fw={500} c="dimmed">
                    Fully Diluted Shares
                  </Text>
                  <Title order={3}>12,000,000</Title>
                </Grid.Col>
              </Grid>

              <Text size="sm" c="dimmed" mt="md">
                <strong>Ownership Breakdown:</strong>
                <br />
                Founders: 50%
                <br />
                Investors: 40%
                <br />
                Employee Options Pool: 10%
              </Text>
            </Stack>
          </Card>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};

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
  Progress,
  Tabs,
  Table,
  Alert,
  NumberInput,
  Divider,
} from '@mantine/core';
import {
  IconFileText,
  IconCalculator,
  IconAlertTriangle,
  IconTrendingUp,
  IconDownload,
  IconCalendar,
} from '@tabler/icons-react';

export const EnhancedTaxPlanning: React.FC = () => {
  const [estimatedIncome, setEstimatedIncome] = useState(1000000);
  
  const calculateTaxes = () => {
    const federalRate = 0.21;
    const stateRate = 0.06;
    
    const federalTax = estimatedIncome * federalRate;
    const stateTax = estimatedIncome * stateRate;
    const totalTax = federalTax + stateTax;
    const effectiveRate = (totalTax / estimatedIncome) * 100;
    
    return { federalTax, stateTax, totalTax, effectiveRate };
  };

  const taxes = calculateTaxes();

  const taxCalendar = [
    { date: 'April 15', description: 'Q1 Estimated Payment Due', amount: taxes.totalTax / 4 },
    { date: 'June 15', description: 'Q2 Estimated Payment Due', amount: taxes.totalTax / 4 },
    { date: 'September 15', description: 'Q3 Estimated Payment Due', amount: taxes.totalTax / 4 },
    { date: 'January 15', description: 'Q4 Estimated Payment Due', amount: taxes.totalTax / 4 },
  ];

  return (
    <Stack gap="lg" p={{ base: 16, md: 24 }}>
      <Group justify="space-between" wrap="wrap">
        <div>
          <Title order={2}>Tax Planning & Strategy</Title>
          <Text c="dimmed" size="sm">
            Manage tax planning, estimate liabilities, and ensure compliance
          </Text>
        </div>
        <Group>
          <Button variant="light" leftSection={<IconDownload size={16} />}>
            Export Tax Report
          </Button>
        </Group>
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder p="md">
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">
                  Federal Tax
                </Text>
                <Title order={3}>${taxes.federalTax.toLocaleString()}</Title>
                <Text size="xs" c="dimmed">
                  21% rate
                </Text>
              </div>
              <IconFileText size={32} color="blue" />
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder p="md">
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">
                  State Tax
                </Text>
                <Title order={3}>${taxes.stateTax.toLocaleString()}</Title>
                <Text size="xs" c="dimmed">
                  6% rate
                </Text>
              </div>
              <IconCalculator size={32} color="orange" />
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder p="md">
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">
                  Total Tax Liability
                </Text>
                <Title order={3}>${taxes.totalTax.toLocaleString()}</Title>
              </div>
              <IconAlertTriangle size={32} color="red" />
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder p="md">
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">
                  Effective Rate
                </Text>
                <Title order={3}>{taxes.effectiveRate.toFixed(1)}%</Title>
              </div>
              <IconTrendingUp size={32} color="green" />
            </Group>
          </Card>
        </Grid.Col>
      </Grid>

      <Tabs defaultValue="calculator">
        <Tabs.List>
          <Tabs.Tab value="calculator" leftSection={<IconCalculator size={16} />}>
            Tax Calculator
          </Tabs.Tab>
          <Tabs.Tab value="calendar" leftSection={<IconCalendar size={16} />}>
            Tax Calendar
          </Tabs.Tab>
          <Tabs.Tab value="credits" leftSection={<IconTrendingUp size={16} />}>
            Tax Credits
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="calculator" pt="md">
          <Card withBorder p="md">
            <Stack gap="md">
              <Alert color="blue" icon={<IconCalculator />}>
                Adjust your estimated taxable income to calculate tax liability
              </Alert>
              
              <NumberInput
                label="Estimated Taxable Income"
                value={estimatedIncome}
                onChange={(val) => setEstimatedIncome(Number(val))}
                prefix="$"
                thousandSeparator=","
                size="lg"
              />

              <Divider />

              <Grid>
                <Grid.Col span={6}>
                  <Text size="sm" fw={500}>
                    Federal Tax (21%)
                  </Text>
                  <Title order={4}>${taxes.federalTax.toLocaleString()}</Title>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="sm" fw={500}>
                    State Tax (6%)
                  </Text>
                  <Title order={4}>${taxes.stateTax.toLocaleString()}</Title>
                </Grid.Col>
              </Grid>

              <Alert color="orange">
                <Text fw={500}>Quarterly Estimated Payment</Text>
                <Title order={3}>${(taxes.totalTax / 4).toLocaleString()}</Title>
              </Alert>
            </Stack>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="calendar" pt="md">
          <Card withBorder>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Due Date</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Amount</Table.Th>
                  <Table.Th>Status</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {taxCalendar.map((item, idx) => (
                  <Table.Tr key={idx}>
                    <Table.Td>{item.date}</Table.Td>
                    <Table.Td>{item.description}</Table.Td>
                    <Table.Td>${item.amount.toLocaleString()}</Table.Td>
                    <Table.Td>
                      <Badge color="yellow">Upcoming</Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="credits" pt="md">
          <Stack gap="md">
            <Card withBorder p="md">
              <Group justify="space-between">
                <div>
                  <Text fw={500}>R&D Tax Credit</Text>
                  <Text size="sm" c="dimmed">
                    Research and development tax credit eligibility
                  </Text>
                </div>
                <Badge color="green">Eligible</Badge>
              </Group>
            </Card>

            <Card withBorder p="md">
              <Group justify="space-between">
                <div>
                  <Text fw={500}>Work Opportunity Tax Credit</Text>
                  <Text size="sm" c="dimmed">
                    Hiring incentive for qualified employees
                  </Text>
                </div>
                <Badge color="blue">Review</Badge>
              </Group>
            </Card>

            <Card withBorder p="md">
              <Group justify="space-between">
                <div>
                  <Text fw={500}>Energy Efficiency Credit</Text>
                  <Text size="sm" c="dimmed">
                    Credits for energy-efficient improvements
                  </Text>
                </div>
                <Badge color="gray">Not Eligible</Badge>
              </Group>
            </Card>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};

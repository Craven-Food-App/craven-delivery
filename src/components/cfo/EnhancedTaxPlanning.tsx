import React, { useState, useEffect } from 'react';
import { Stack, Title, Text, Card, Group, Badge, Button, Grid, Tabs, Table, NumberInput, Divider, Alert } from '@mantine/core';
import { IconCalculator, IconCalendar, IconCertificate, IconDownload } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';

interface TaxCalendarItem {
  id: string;
  due_date: string;
  description: string;
  amount: number;
  status: string;
}

interface TaxCredit {
  id: string;
  credit_name: string;
  credit_type: string;
  estimated_value: number;
  eligibility_status: string;
}

export const EnhancedTaxPlanning: React.FC = () => {
  const [estimatedIncome, setEstimatedIncome] = useState(0);
  const [taxCalendar, setTaxCalendar] = useState<TaxCalendarItem[]>([]);
  const [taxCredits, setTaxCredits] = useState<TaxCredit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTaxData();
  }, []);

  const fetchTaxData = async () => {
    try {
      const [calendarRes, creditsRes, estimateRes] = await Promise.all([
        supabase.from('tax_calendar').select('*').order('due_date'),
        supabase.from('tax_credits').select('*'),
        supabase.from('tax_estimates').select('*').order('created_at', { ascending: false }).limit(1).single()
      ]);

      if (calendarRes.data) setTaxCalendar(calendarRes.data);
      if (creditsRes.data) setTaxCredits(creditsRes.data);
      if (estimateRes.data) setEstimatedIncome(estimateRes.data.estimated_income);
    } catch (error) {
      console.error('Error fetching tax data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTaxes = (income: number) => {
    const federalRate = 0.21;
    const stateRate = 0.065;
    const federalTax = income * federalRate;
    const stateTax = income * stateRate;
    const totalTax = federalTax + stateTax;
    const effectiveRate = income > 0 ? (totalTax / income) * 100 : 0;

    return { federalTax, stateTax, totalTax, effectiveRate };
  };

  const taxes = calculateTaxes(estimatedIncome);

  const saveTaxEstimate = async (newIncome: number) => {
    const newTaxes = calculateTaxes(newIncome);
    try {
      await supabase.from('tax_estimates').insert({
        estimated_income: newIncome,
        federal_tax: newTaxes.federalTax,
        state_tax: newTaxes.stateTax,
        total_tax: newTaxes.totalTax,
        effective_rate: newTaxes.effectiveRate,
        tax_year: new Date().getFullYear()
      });
    } catch (error) {
      console.error('Error saving tax estimate:', error);
    }
  };

  return (
    <Stack gap="lg" p={{ base: 16, md: 24 }}>
      <Group justify="space-between" wrap="wrap">
        <div>
          <Title order={2}>Tax Planning & Strategy</Title>
          <Text c="dimmed" size="sm">Manage tax planning, estimate liabilities, and ensure compliance</Text>
        </div>
        <Group>
          <Button variant="light" leftSection={<IconDownload size={16} />}>Export Tax Report</Button>
        </Group>
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder p="md">
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">Federal Tax</Text>
                <Title order={3}>${taxes.federalTax.toLocaleString()}</Title>
                <Text size="xs" c="dimmed">21% rate</Text>
              </div>
              <IconCalculator size={32} color="blue" />
            </Group>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder p="md">
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">State Tax</Text>
                <Title order={3}>${taxes.stateTax.toLocaleString()}</Title>
                <Text size="xs" c="dimmed">6.5% rate</Text>
              </div>
              <IconCalculator size={32} color="orange" />
            </Group>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder p="md">
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">Total Tax Liability</Text>
                <Title order={3}>${taxes.totalTax.toLocaleString()}</Title>
              </div>
              <IconCertificate size={32} color="red" />
            </Group>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder p="md">
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">Effective Rate</Text>
                <Title order={3}>{taxes.effectiveRate.toFixed(1)}%</Title>
              </div>
              <IconCalculator size={32} color="green" />
            </Group>
          </Card>
        </Grid.Col>
      </Grid>

      <Tabs defaultValue="calculator">
        <Tabs.List>
          <Tabs.Tab value="calculator" leftSection={<IconCalculator size={16} />}>Tax Calculator</Tabs.Tab>
          <Tabs.Tab value="calendar" leftSection={<IconCalendar size={16} />}>Tax Calendar</Tabs.Tab>
          <Tabs.Tab value="credits" leftSection={<IconCertificate size={16} />}>Tax Credits</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="calculator" pt="md">
          <Card withBorder p="md">
            <Stack gap="md">
              <NumberInput
                label="Estimated Annual Income"
                value={estimatedIncome}
                onChange={(val) => {
                  const newValue = val as number;
                  setEstimatedIncome(newValue);
                  saveTaxEstimate(newValue);
                }}
                prefix="$"
                thousandSeparator=","
                min={0}
              />
              <Divider />
              <Text fw={500}>Tax Calculation Results</Text>
              <Group justify="space-between"><Text>Federal Tax (21%):</Text><Text fw={500}>${taxes.federalTax.toLocaleString()}</Text></Group>
              <Group justify="space-between"><Text>State Tax (6.5%):</Text><Text fw={500}>${taxes.stateTax.toLocaleString()}</Text></Group>
              <Divider />
              <Group justify="space-between"><Text fw={700}>Total Tax Liability:</Text><Text fw={700} c="blue">${taxes.totalTax.toLocaleString()}</Text></Group>
              <Group justify="space-between"><Text>Effective Tax Rate:</Text><Text fw={500}>{taxes.effectiveRate.toFixed(2)}%</Text></Group>
            </Stack>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="calendar" pt="md">
          <Card withBorder p="md">
            {loading ? (
              <Text>Loading tax calendar...</Text>
            ) : taxCalendar.length === 0 ? (
              <Alert color="blue"><Text>No tax payments scheduled. Add tax deadlines to track upcoming obligations.</Text></Alert>
            ) : (
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
                  {taxCalendar.map(item => (
                    <Table.Tr key={item.id}>
                      <Table.Td><Text fw={500}>{new Date(item.due_date).toLocaleDateString()}</Text></Table.Td>
                      <Table.Td>{item.description}</Table.Td>
                      <Table.Td>{item.amount > 0 ? `$${item.amount.toLocaleString()}` : 'TBD'}</Table.Td>
                      <Table.Td><Badge color={item.status === 'paid' ? 'green' : item.status === 'overdue' ? 'red' : 'yellow'}>{item.status}</Badge></Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="credits" pt="md">
          <Stack gap="sm">
            {loading ? (
              <Text>Loading tax credits...</Text>
            ) : taxCredits.length === 0 ? (
              <Alert color="blue"><Text>No tax credits tracked. Add potential tax credits to monitor eligibility and savings.</Text></Alert>
            ) : (
              taxCredits.map(credit => (
                <Card key={credit.id} withBorder p="md">
                  <Group justify="space-between">
                    <div><Text fw={500}>{credit.credit_name}</Text><Text size="sm" c="dimmed">{credit.credit_type}</Text></div>
                    <div style={{ textAlign: 'right' }}>
                      <Text fw={700} c={credit.eligibility_status === 'Eligible' ? 'green' : credit.eligibility_status === 'Under Review' ? 'blue' : 'dimmed'}>
                        ${credit.estimated_value.toLocaleString()}
                      </Text>
                      <Badge color={credit.eligibility_status === 'Eligible' ? 'green' : credit.eligibility_status === 'Under Review' ? 'yellow' : 'gray'} mt="xs">
                        {credit.eligibility_status}
                      </Badge>
                    </div>
                  </Group>
                </Card>
              ))
            )}
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};

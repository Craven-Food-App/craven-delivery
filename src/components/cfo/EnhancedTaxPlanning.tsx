import React, { useState, useEffect } from 'react';
import { Stack, Title, Text, Card, Group, Badge, Button, Grid, Tabs, Table, NumberInput, Divider, Alert, Modal, TextInput, Select, Textarea } from '@mantine/core';
import { IconCalculator, IconCalendar, IconCertificate, IconDownload, IconPlus } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { useForm } from '@mantine/form';
import { DateInput } from '@mantine/dates';

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
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  
  const creditForm = useForm({
    initialValues: {
      credit_name: '',
      credit_type: '',
      estimated_value: 0,
      eligibility_status: 'Under Review',
    },
    validate: {
      credit_name: (value) => (value.length < 1 ? 'Credit name is required' : null),
      credit_type: (value) => (value.length < 1 ? 'Credit type is required' : null),
      estimated_value: (value) => (value < 0 ? 'Estimated value must be positive' : null),
    },
  });

  const calendarForm = useForm({
    initialValues: {
      due_date: new Date(),
      description: '',
      amount: 0,
      status: 'upcoming',
    },
    validate: {
      due_date: (value) => (!value ? 'Due date is required' : null),
      description: (value) => (value.length < 1 ? 'Description is required' : null),
      amount: (value) => (value < 0 ? 'Amount must be positive' : null),
    },
  });

  useEffect(() => {
    fetchTaxData();
    calculateAutomaticCredits();
  }, [estimatedIncome]);

  const fetchTaxData = async () => {
    try {
      setLoading(true);
      const [calendarRes, creditsRes, estimateRes] = await Promise.all([
        supabase.from('tax_calendar').select('*').order('due_date'),
        supabase.from('tax_credits').select('*'),
        supabase.from('tax_estimates').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle()
      ]);

      // Handle calendar data
      if (calendarRes.error) {
        console.error('Error fetching tax calendar:', calendarRes.error);
      } else {
        setTaxCalendar(calendarRes.data || []);
      }

      // Handle credits data
      if (creditsRes.error) {
        console.error('Error fetching tax credits:', creditsRes.error);
        console.error('Error details:', {
          message: creditsRes.error.message,
          code: creditsRes.error.code,
          details: creditsRes.error.details,
          hint: creditsRes.error.hint,
        });
      } else {
        console.log('Tax credits fetched successfully:', creditsRes.data?.length || 0, 'credits');
        setTaxCredits(creditsRes.data || []);
      }

      // Handle estimate data (use maybeSingle to avoid error if no records)
      if (estimateRes.error) {
        console.error('Error fetching tax estimates:', estimateRes.error);
      } else if (estimateRes.data) {
        setEstimatedIncome(estimateRes.data.estimated_income || 0);
      }
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
      const { error } = await supabase.from('tax_estimates').insert({
        estimated_income: newIncome,
        federal_tax: newTaxes.federalTax,
        state_tax: newTaxes.stateTax,
        total_tax: newTaxes.totalTax,
        effective_rate: newTaxes.effectiveRate,
        tax_year: new Date().getFullYear()
      });
      
      if (error) {
        console.error('Error saving tax estimate:', error);
        // Optionally show user-friendly error message
      } else {
        // Refresh the estimate after saving
        const { data } = await supabase
          .from('tax_estimates')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) {
          setEstimatedIncome(data.estimated_income || 0);
        }
      }
    } catch (error) {
      console.error('Error saving tax estimate:', error);
    }
  };

  const handleAddCredit = async (values: typeof creditForm.values) => {
    try {
      const { error } = await supabase.from('tax_credits').insert({
        credit_name: values.credit_name,
        credit_type: values.credit_type,
        estimated_value: values.estimated_value,
        eligibility_status: values.eligibility_status,
      });

      if (error) {
        console.error('Error adding tax credit:', error);
        alert('Failed to add tax credit: ' + error.message);
      } else {
        setCreditModalOpen(false);
        creditForm.reset();
        fetchTaxData(); // Refresh the list
      }
    } catch (error) {
      console.error('Error adding tax credit:', error);
      alert('Failed to add tax credit');
    }
  };

  const handleAddCalendarItem = async (values: typeof calendarForm.values) => {
    try {
      const { error } = await supabase.from('tax_calendar').insert({
        due_date: values.due_date.toISOString().split('T')[0], // Format as YYYY-MM-DD
        description: values.description,
        amount: values.amount,
        status: values.status,
      });

      if (error) {
        console.error('Error adding tax calendar item:', error);
        alert('Failed to add tax deadline: ' + error.message);
      } else {
        setCalendarModalOpen(false);
        calendarForm.reset();
        fetchTaxData(); // Refresh the list
      }
    } catch (error) {
      console.error('Error adding tax calendar item:', error);
      alert('Failed to add tax deadline');
    }
  };

  const calculateAutomaticCredits = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const yearStart = `${currentYear}-01-01`;
      const yearEnd = `${currentYear}-12-31`;

      // 1. Small Business Health Care Tax Credit
      // Calculate based on health insurance premiums from payroll
      // First get payroll runs for the year
      const { data: payrollRuns } = await supabase
        .from('payroll_runs')
        .select('id')
        .gte('pay_period_start', yearStart)
        .lte('pay_period_end', yearEnd);

      let totalHealthInsurance = 0;
      if (payrollRuns && payrollRuns.length > 0) {
        const runIds = payrollRuns.map(r => r.id);
        const { data: payrollData } = await supabase
          .from('payroll_entries')
          .select('pre_tax_details')
          .in('payroll_run_id', runIds);

        if (payrollData) {
          payrollData.forEach((entry: any) => {
            const preTax = entry.pre_tax_details || {};
            if (preTax.health_insurance) {
              totalHealthInsurance += parseFloat(preTax.health_insurance) || 0;
            }
          });
        }
      }

      let totalHealthInsurance = 0;
      if (payrollData) {
        payrollData.forEach((entry: any) => {
          const preTax = entry.pre_tax_details || {};
          if (preTax.health_insurance) {
            totalHealthInsurance += parseFloat(preTax.health_insurance) || 0;
          }
        });
      }

      // Small Business Health Care Tax Credit: Up to 50% of premiums (35% for non-profits)
      // Only for businesses with <25 FTE employees and average wages <$50k
      const { count: employeeCount } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('employment_status', 'active')
        .eq('employment_type', 'full-time');

      const avgWage = estimatedIncome > 0 && employeeCount && employeeCount > 0 
        ? estimatedIncome / employeeCount 
        : 0;

      let healthCareCredit = 0;
      if (employeeCount && employeeCount < 25 && avgWage < 50000 && totalHealthInsurance > 0) {
        healthCareCredit = totalHealthInsurance * 0.35; // 35% credit for for-profit businesses
      }

      // 2. Work Opportunity Tax Credit (WOTC)
      // Based on hiring employees from target groups
      // Simplified: Assume 10% of new hires qualify, credit up to $2,400-$9,600 per employee
      const { count: newHires } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('employment_status', 'active')
        .gte('hire_date', yearStart)
        .lte('hire_date', yearEnd);

      const wotcCredit = newHires && newHires > 0 
        ? Math.floor(newHires * 0.1) * 2400 // Assume 10% qualify, $2,400 average credit
        : 0;

      // 3. Research & Development Credit
      // Based on technology/development expenses (simplified calculation)
      // R&D credit is typically 20% of qualified research expenses
      const { data: techExpenses } = await supabase
        .from('ceo_financial_approvals')
        .select('amount, amount_cents, description')
        .eq('status', 'approved')
        .gte('requested_date', yearStart)
        .lte('requested_date', yearEnd);

      let rdExpenses = 0;
      if (techExpenses) {
        rdExpenses = techExpenses
          .filter((exp: any) => {
            const desc = (exp.description || '').toLowerCase();
            return desc.includes('research') || desc.includes('development') || 
                   desc.includes('technology') || desc.includes('rd') || 
                   desc.includes('r&d');
          })
          .reduce((sum: number, exp: any) => {
            // Handle both amount (numeric) and amount_cents (integer) formats
            const amount = exp.amount ? parseFloat(exp.amount) : (exp.amount_cents ? exp.amount_cents / 100 : 0);
            return sum + amount;
          }, 0);
      }
      const rdCredit = rdExpenses * 0.20; // 20% R&D credit

      // Auto-create or update credits if they don't exist
      const creditsToCreate = [
        {
          credit_name: 'Small Business Health Care Tax Credit',
          credit_type: 'Federal',
          estimated_value: healthCareCredit,
          eligibility_status: healthCareCredit > 0 ? 'Eligible' : 'Not Eligible',
        },
        {
          credit_name: 'Work Opportunity Tax Credit (WOTC)',
          credit_type: 'Federal',
          estimated_value: wotcCredit,
          eligibility_status: wotcCredit > 0 ? 'Under Review' : 'Not Eligible', // WOTC requires certification
        },
        {
          credit_name: 'Research & Development Tax Credit',
          credit_type: 'Federal',
          estimated_value: rdCredit,
          eligibility_status: rdCredit > 0 ? 'Under Review' : 'Not Eligible',
        },
      ];

      // Check existing auto-calculated credits and update or create
      for (const credit of creditsToCreate) {
        if (credit.estimated_value > 0) {
          const { data: existing } = await supabase
            .from('tax_credits')
            .select('id')
            .eq('credit_name', credit.credit_name)
            .limit(1)
            .maybeSingle();

          if (existing) {
            // Update existing
            await supabase
              .from('tax_credits')
              .update({
                estimated_value: credit.estimated_value,
                eligibility_status: credit.eligibility_status,
              })
              .eq('id', existing.id);
          } else {
            // Create new
            await supabase.from('tax_credits').insert(credit);
          }
        }
      }

      // Refresh the credits list
      fetchTaxData();
    } catch (error) {
      console.error('Error calculating automatic credits:', error);
      // Don't show alert - this runs automatically in background
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
          <Stack gap="md">
            <Group justify="space-between">
              <Title order={4}>Tax Calendar</Title>
              <Button 
                leftSection={<IconPlus size={16} />}
                onClick={() => setCalendarModalOpen(true)}
                variant="light"
              >
                Add Tax Deadline
              </Button>
            </Group>
            
            <Card withBorder p="md">
              {loading ? (
                <Text>Loading tax calendar...</Text>
              ) : taxCalendar.length === 0 ? (
                <Alert color="blue">
                  <Text>No tax payments scheduled. Add tax deadlines to track upcoming obligations.</Text>
                  <Button 
                    mt="md" 
                    leftSection={<IconPlus size={16} />}
                    onClick={() => setCalendarModalOpen(true)}
                    variant="light"
                  >
                    Add Your First Tax Deadline
                  </Button>
                </Alert>
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
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="credits" pt="md">
          <Stack gap="md">
            <Group justify="space-between">
              <div>
                <Title order={4}>Tax Credits</Title>
                <Text size="sm" c="dimmed">
                  Credits are automatically calculated from your payroll, expenses, and employee data. 
                  You can also add custom credits manually.
                </Text>
              </div>
              <Group>
                <Button 
                  onClick={calculateAutomaticCredits}
                  variant="subtle"
                  size="sm"
                >
                  Recalculate Credits
                </Button>
                <Button 
                  leftSection={<IconPlus size={16} />}
                  onClick={() => setCreditModalOpen(true)}
                  variant="light"
                >
                  Add Tax Credit
                </Button>
              </Group>
            </Group>
            
            {loading ? (
              <Text>Loading tax credits...</Text>
            ) : taxCredits.length === 0 ? (
              <Alert color="blue">
                <Text>No tax credits tracked. Add potential tax credits to monitor eligibility and savings.</Text>
                <Button 
                  mt="md" 
                  leftSection={<IconPlus size={16} />}
                  onClick={() => setCreditModalOpen(true)}
                  variant="light"
                >
                  Add Your First Tax Credit
                </Button>
              </Alert>
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

      <Modal
        opened={creditModalOpen}
        onClose={() => {
          setCreditModalOpen(false);
          creditForm.reset();
        }}
        title="Add Tax Credit"
        size="md"
      >
        <form onSubmit={creditForm.onSubmit(handleAddCredit)}>
          <Stack gap="md">
            <TextInput
              label="Credit Name"
              placeholder="e.g., Research & Development Credit"
              required
              {...creditForm.getInputProps('credit_name')}
            />
            
            <TextInput
              label="Credit Type"
              placeholder="e.g., Federal, State, Local"
              required
              {...creditForm.getInputProps('credit_type')}
            />
            
            <NumberInput
              label="Estimated Value ($)"
              placeholder="0"
              prefix="$"
              thousandSeparator=","
              min={0}
              required
              {...creditForm.getInputProps('estimated_value')}
            />
            
            <Select
              label="Eligibility Status"
              data={[
                { value: 'Eligible', label: 'Eligible' },
                { value: 'Under Review', label: 'Under Review' },
                { value: 'Not Eligible', label: 'Not Eligible' },
              ]}
              required
              {...creditForm.getInputProps('eligibility_status')}
            />
            
            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={() => {
                setCreditModalOpen(false);
                creditForm.reset();
              }}>
                Cancel
              </Button>
              <Button type="submit">
                Add Credit
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={calendarModalOpen}
        onClose={() => {
          setCalendarModalOpen(false);
          calendarForm.reset();
        }}
        title="Add Tax Deadline"
        size="md"
      >
        <form onSubmit={calendarForm.onSubmit(handleAddCalendarItem)}>
          <Stack gap="md">
            <DateInput
              label="Due Date"
              placeholder="Select due date"
              required
              {...calendarForm.getInputProps('due_date')}
            />
            
            <Textarea
              label="Description"
              placeholder="e.g., Quarterly Federal Tax Payment"
              required
              minRows={2}
              {...calendarForm.getInputProps('description')}
            />
            
            <NumberInput
              label="Amount ($)"
              placeholder="0"
              prefix="$"
              thousandSeparator=","
              min={0}
              {...calendarForm.getInputProps('amount')}
            />
            
            <Select
              label="Status"
              data={[
                { value: 'upcoming', label: 'Upcoming' },
                { value: 'paid', label: 'Paid' },
                { value: 'overdue', label: 'Overdue' },
              ]}
              required
              {...calendarForm.getInputProps('status')}
            />
            
            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={() => {
                setCalendarModalOpen(false);
                calendarForm.reset();
              }}>
                Cancel
              </Button>
              <Button type="submit">
                Add Deadline
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
};

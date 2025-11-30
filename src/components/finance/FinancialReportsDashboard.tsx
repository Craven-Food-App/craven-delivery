import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Select,
  TextInput,
  Stack,
  Group,
  Text,
  Paper,
  Table,
  Badge,
  ActionIcon,
  Tooltip,
  Loader,
  Center,
  Modal,
  Grid,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { supabase } from '@/integrations/supabase/client';
import {
  IconFileText,
  IconDownload,
  IconPlus,
  IconEye,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface FinancialReport {
  id: string;
  report_name: string;
  report_type: string;
  report_period_start: string;
  report_period_end: string;
  generated_at: string;
  status: string;
  summary: string;
  pdf_url: string;
}

export const FinancialReportsDashboard: React.FC = () => {
  const [reports, setReports] = useState<FinancialReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [reportType, setReportType] = useState<string>('expense_analysis');
  const [periodStart, setPeriodStart] = useState<Date>(dayjs().subtract(30, 'days').toDate());
  const [periodEnd, setPeriodEnd] = useState<Date>(new Date());
  const [summaryData, setSummaryData] = useState<any>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<FinancialReport | null>(null);

  useEffect(() => {
    fetchReports();
    fetchSummaryData();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('financial_reports')
        .select('*')
        .order('generated_at', { ascending: false })
        .limit(50);

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          notifications.show({
            title: 'Setup Required',
            message: 'Finance system tables not found. Please run the database migration.',
            color: 'orange',
          });
          return;
        }
        throw error;
      }
      setReports(data || []);
    } catch (error: any) {
      console.error('Error fetching reports:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to load reports',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSummaryData = async () => {
    try {
      const { data: expenses, error: expensesError } = await supabase
        .from('expense_requests')
        .select('amount, expense_date, status, expense_category:expense_categories(name)')
        .gte('expense_date', dayjs().subtract(90, 'days').toISOString().split('T')[0])
        .order('expense_date', { ascending: true });

      // Suppress schema errors
      if (
        expensesError &&
        (expensesError.message?.includes('Could not find a relationship') ||
          expensesError.message?.includes('infinite recursion detected in policy') ||
          expensesError.message?.includes('schema cache'))
      ) {
        console.warn('Supabase schema error (suppressed):', expensesError.message);
      }

      const { data: budgets } = await supabase
        .from('budgets')
        .select('allocated_amount, spent_amount, department:departments(name)')
        .eq('status', 'active');

      const { data: invoices } = await supabase
        .from('invoices')
        .select('total_amount, status, invoice_date')
        .gte('invoice_date', dayjs().subtract(90, 'days').toISOString().split('T')[0]);

      setSummaryData({
        expenses: expenses || [],
        budgets: budgets || [],
        invoices: invoices || [],
      });
    } catch (error) {
      console.error('Error fetching summary data:', error);
    }
  };

  const generateReport = async () => {
    setGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let reportData: any = {};
      let reportSummary = '';

      switch (reportType) {
        case 'expense_analysis':
          const { data: expenseData, error: expenseError } = await supabase
            .from('expense_requests')
            .select(`
              *,
              expense_category:expense_categories(name),
              department:departments(name)
            `)
            .gte('expense_date', periodStart.toISOString().split('T')[0])
            .lte('expense_date', periodEnd.toISOString().split('T')[0]);

          // Suppress schema errors
          if (
            expenseError &&
            (expenseError.message?.includes('Could not find a relationship') ||
              expenseError.message?.includes('infinite recursion detected in policy') ||
              expenseError.message?.includes('schema cache'))
          ) {
            console.warn('Supabase schema error (suppressed):', expenseError.message);
          }

          const totalExpenses = expenseData?.reduce((sum, e) => sum + e.amount, 0) || 0;
          const byCategory = expenseData?.reduce((acc: any, e: any) => {
            const cat = e.expense_category?.name || 'Other';
            acc[cat] = (acc[cat] || 0) + e.amount;
            return acc;
          }, {});

          reportData = {
            total_expenses: totalExpenses,
            expense_count: expenseData?.length || 0,
            by_category: byCategory,
            expenses: expenseData,
          };
          reportSummary = `Total expenses: $${totalExpenses.toLocaleString()} across ${expenseData?.length || 0} requests`;
          break;

        case 'budget_variance':
          const { data: budgetData } = await supabase
            .from('budgets')
            .select(`
              *,
              department:departments(name),
              category:expense_categories(name)
            `)
            .eq('status', 'active');

          const variances = budgetData?.map((b: any) => ({
            budget_name: b.budget_name,
            allocated: b.allocated_amount,
            spent: b.spent_amount,
            variance: b.allocated_amount - b.spent_amount,
            variance_percent: ((b.spent_amount / b.allocated_amount) * 100).toFixed(2),
          }));

          reportData = {
            budgets: budgetData,
            variances: variances,
          };
          reportSummary = `Analyzed ${budgetData?.length || 0} active budgets`;
          break;

        case 'cash_flow':
          const { data: invoiceData } = await supabase
            .from('invoices')
            .select('*')
            .gte('invoice_date', periodStart.toISOString().split('T')[0])
            .lte('invoice_date', periodEnd.toISOString().split('T')[0]);

          const { data: arData } = await supabase
            .from('accounts_receivable')
            .select('*')
            .gte('invoice_date', periodStart.toISOString().split('T')[0])
            .lte('invoice_date', periodEnd.toISOString().split('T')[0]);

          const totalPayable = invoiceData?.reduce((sum, i) => sum + i.total_amount, 0) || 0;
          const totalReceivable = arData?.reduce((sum, ar) => sum + ar.total_amount, 0) || 0;

          reportData = {
            payables: invoiceData,
            receivables: arData,
            total_payable: totalPayable,
            total_receivable: totalReceivable,
            net_cash_flow: totalReceivable - totalPayable,
          };
          reportSummary = `Net cash flow: $${(totalReceivable - totalPayable).toLocaleString()}`;
          break;

        default:
          reportData = {};
          reportSummary = 'Custom report generated';
      }

      const { data, error } = await supabase
        .from('financial_reports')
        .insert({
          report_name: `${reportType.replace('_', ' ').toUpperCase()} - ${dayjs(periodStart).format('MMM D')} to ${dayjs(periodEnd).format('MMM D, YYYY')}`,
          report_type: reportType,
          report_period_start: periodStart.toISOString().split('T')[0],
          report_period_end: periodEnd.toISOString().split('T')[0],
          generated_by: user.id,
          report_data: reportData,
          summary: reportSummary,
          status: 'final',
        })
        .select()
        .single();

      if (error) throw error;

      notifications.show({
        title: 'Success',
        message: 'Report generated successfully',
        color: 'green',
      });

      setModalOpen(false);
      fetchReports();
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to generate report',
        color: 'red',
      });
    } finally {
      setGenerating(false);
    }
  };

  const getReportTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      income_statement: 'Income Statement',
      balance_sheet: 'Balance Sheet',
      cash_flow: 'Cash Flow',
      budget_variance: 'Budget Variance',
      expense_analysis: 'Expense Analysis',
      custom: 'Custom Report',
    };
    return labels[type] || type;
  };

  const expenseChartData = summaryData?.expenses
    ? Object.entries(
        summaryData.expenses.reduce((acc: any, e: any) => {
          const date = dayjs(e.expense_date).format('MMM D');
          acc[date] = (acc[date] || 0) + e.amount;
          return acc;
        }, {})
      ).map(([date, amount]) => ({ date, amount }))
    : [];

  const categoryData = summaryData?.expenses
    ? Object.entries(
        summaryData.expenses.reduce((acc: any, e: any) => {
          const cat = e.expense_category?.name || 'Other';
          acc[cat] = (acc[cat] || 0) + e.amount;
          return acc;
        }, {})
      ).map(([name, value]) => ({ name, value }))
    : [];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  return (
    <Stack gap="lg">
      <Card p="lg" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <div>
            <Text fw={700} size="xl">Financial Reports</Text>
            <Text c="dimmed" size="sm">Generate and view financial reports</Text>
          </div>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => setModalOpen(true)}
          >
            Generate Report
          </Button>
        </Group>

        {summaryData && (
          <Grid mb="xl">
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Card p="md" radius="md" withBorder>
                <Text fw={600} mb="md">Expense Trends (Last 90 Days)</Text>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={expenseChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Line type="monotone" dataKey="amount" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Card p="md" radius="md" withBorder>
                <Text fw={600} mb="md">Expenses by Category</Text>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Grid.Col>
          </Grid>
        )}

        {loading ? (
          <Center h={200}>
            <Loader />
          </Center>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Report Name</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Period</Table.Th>
                <Table.Th>Generated</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {reports.map(report => (
                <Table.Tr key={report.id}>
                  <Table.Td>
                    <Text fw={500}>{report.report_name}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge>{getReportTypeLabel(report.report_type)}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {dayjs(report.report_period_start).format('MMM D')} - {dayjs(report.report_period_end).format('MMM D, YYYY')}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{dayjs(report.generated_at).format('MMM D, YYYY')}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={report.status === 'final' ? 'green' : 'gray'}>
                      {report.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Tooltip label="View Report">
                        <ActionIcon 
                          variant="light"
                          onClick={() => {
                            setSelectedReport(report);
                            setViewModalOpen(true);
                          }}
                        >
                          <IconEye size={16} />
                        </ActionIcon>
                      </Tooltip>
                      {report.pdf_url && (
                        <Tooltip label="Download PDF">
                          <ActionIcon
                            variant="light"
                            component="a"
                            href={report.pdf_url}
                            target="_blank"
                          >
                            <IconDownload size={16} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Generate Financial Report"
        size="md"
      >
        <Stack gap="md">
          <Select
            label="Report Type"
            required
            data={[
              { value: 'expense_analysis', label: 'Expense Analysis' },
              { value: 'budget_variance', label: 'Budget Variance' },
              { value: 'cash_flow', label: 'Cash Flow' },
              { value: 'income_statement', label: 'Income Statement' },
              { value: 'balance_sheet', label: 'Balance Sheet' },
            ]}
            value={reportType}
            onChange={(value) => setReportType(value || 'expense_analysis')}
          />

          <Grid>
            <Grid.Col span={6}>
              <TextInput
                label="Period Start"
                type="date"
                required
                value={dayjs(periodStart).format('YYYY-MM-DD')}
                onChange={(e) => e.target.value && setPeriodStart(new Date(e.target.value))}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput
                label="Period End"
                type="date"
                required
                value={dayjs(periodEnd).format('YYYY-MM-DD')}
                onChange={(e) => e.target.value && setPeriodEnd(new Date(e.target.value))}
              />
            </Grid.Col>
          </Grid>

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={generateReport} loading={generating}>
              Generate Report
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setSelectedReport(null);
        }}
        title={selectedReport?.report_name || "Report Details"}
        size="xl"
      >
        {selectedReport && (
          <Stack gap="md">
            <Group>
              <Badge>{getReportTypeLabel(selectedReport.report_type)}</Badge>
              <Badge color={selectedReport.status === 'final' ? 'green' : 'gray'}>
                {selectedReport.status}
              </Badge>
            </Group>
            
            <Paper p="md" withBorder>
              <Text fw={600} mb="xs">Report Period</Text>
              <Text size="sm">
                {dayjs(selectedReport.report_period_start).format('MMMM D, YYYY')} - {dayjs(selectedReport.report_period_end).format('MMMM D, YYYY')}
              </Text>
            </Paper>

            <Paper p="md" withBorder>
              <Text fw={600} mb="xs">Summary</Text>
              <Text size="sm">{selectedReport.summary}</Text>
            </Paper>

            <Paper p="md" withBorder>
              <Text fw={600} mb="xs">Generated</Text>
              <Text size="sm">{dayjs(selectedReport.generated_at).format('MMMM D, YYYY [at] h:mm A')}</Text>
            </Paper>

            {selectedReport.pdf_url && (
              <Button
                leftSection={<IconDownload size={16} />}
                component="a"
                href={selectedReport.pdf_url}
                target="_blank"
                fullWidth
              >
                Download PDF Report
              </Button>
            )}
          </Stack>
        )}
      </Modal>
    </Stack>
  );
};


import React, { useState } from 'react';
import {
  Stack,
  Title,
  Text,
  Card,
  Accordion,
  Group,
  Badge,
  Divider,
  List,
  Box,
  Paper,
  Tabs,
  Alert,
  Button,
  ActionIcon,
  TextInput,
} from '@mantine/core';
import {
  IconBook,
  IconQuestionMark,
  IconInfoCircle,
  IconChevronRight,
  IconChevronDown,
  IconSearch,
  IconFileText,
} from '@tabler/icons-react';

interface FAQItem {
  question: string;
  answer: string;
}

interface ComponentGuide {
  title: string;
  description: string;
  features: string[];
  howToUse: string[];
  tips: string[];
  relatedComponents?: string[];
}

export const CFOPortalInstructionManual: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const faqs: FAQItem[] = [
    {
      question: 'How do I access the CFO Portal?',
      answer: 'The CFO Portal is accessible through the main hub. You must have CFO or Finance role permissions. Navigate to the Executive Portals section and select "CFO Portal".',
    },
    {
      question: 'What is the difference between Accounts Payable and Accounts Receivable?',
      answer: 'Accounts Payable (AP) manages money the company owes to vendors and suppliers. Accounts Receivable (AR) tracks money owed to the company by customers. Use AP to process invoices and payments, and AR to monitor collections and outstanding balances.',
    },
    {
      question: 'How often should I review the Cash Flow Forecast?',
      answer: 'Review the Cash Flow Forecast weekly for active monitoring, and update it monthly with actuals. The forecast updates in real-time as transactions are recorded.',
    },
    {
      question: 'What does "Budget vs Actuals" show?',
      answer: 'Budget vs Actuals compares your planned budget to actual spending and revenue. Green indicates under budget (good for expenses), red indicates over budget. Use this to identify variances and adjust spending.',
    },
    {
      question: 'How do I approve financial spend requests?',
      answer: 'Navigate to "Approve Spend" in the sidebar. Review pending requests, check amounts and justifications, then approve or reject. All approvals are logged for audit purposes.',
    },
    {
      question: 'What is Treasury Management used for?',
      answer: 'Treasury Management tracks cash positions across bank accounts, manages investments, monitors debt instruments, and analyzes foreign exchange exposure. Use it to optimize cash management and reduce risk.',
    },
    {
      question: 'How does FP&A Forecasting work?',
      answer: 'FP&A (Financial Planning & Analysis) uses driver-based models and multiple scenarios (Base, Optimistic, Pessimistic) to forecast revenue, expenses, and profit. Update drivers like customer count or average order value to see forecast changes.',
    },
    {
      question: 'What is the Close Checklist for?',
      answer: 'The Close Checklist helps you complete month-end and year-end financial closes systematically. It tracks all required tasks like reconciling accounts, reviewing transactions, and preparing financial statements.',
    },
    {
      question: 'How do I manage my finance team?',
      answer: 'Use "Manage Team" to view finance department members, assign roles, set permissions, and manage access. You can add or remove team members and adjust their responsibilities.',
    },
    {
      question: 'What are the key metrics on the CFO Command Center?',
      answer: 'The Command Center displays: Total Cash Position, Cash Runway, Monthly Recurring Revenue (MRR), Gross Margin, Operating Cash Flow, AR Days Outstanding, AP Aging, and Debt-to-Equity Ratio. These update in real-time.',
    },
    {
      question: 'How do I export financial reports?',
      answer: 'Most sections have export options. Look for the "Export" or "Download" button in the top-right of each component. Reports can be exported as CSV, PDF, or Excel formats.',
    },
    {
      question: 'What should I do if I see an anomaly alert?',
      answer: 'Anomaly alerts indicate unusual financial patterns. Review the alert details, investigate the underlying data, and take corrective action if needed. Document your findings in the system.',
    },
    {
      question: 'How do I set up bank accounts in Treasury Management?',
      answer: 'Go to Advanced Treasury > Cash Positions tab, click "Add Account", enter bank name, account type, account number (last 4 digits), current balance, currency, and interest rate. Save to add the account.',
    },
    {
      question: 'Can I create custom financial scenarios?',
      answer: 'Yes, in FP&A & Forecasting, click "Create Scenario" to build custom forecast scenarios. Set probability, revenue assumptions, expense assumptions, and key drivers.',
    },
    {
      question: 'What is the difference between Cash Flow Forecast and FP&A Forecasting?',
      answer: 'Cash Flow Forecast focuses on cash inflows and outflows over time. FP&A Forecasting provides comprehensive financial planning with multiple scenarios, driver-based modeling, and budget comparisons.',
    },
  ];

  const componentGuides: Record<string, ComponentGuide> = {
    'CFO Command Center': {
      title: 'CFO Command Center',
      description: 'The main dashboard providing real-time financial overview with AI-powered analytics, predictive insights, and anomaly detection.',
      features: [
        'Advanced KPIs: Cash Position, Runway, MRR, Gross Margin, Operating Cash Flow',
        'AI Predictive Insights with confidence levels and impact assessment',
        'Anomaly Detection for unusual financial patterns',
        '12-Month Financial Performance Trends',
        'Financial Health Score with ring progress indicator',
        '6-Month Cash Flow Forecast',
        'Real-time data refresh every 30 seconds',
      ],
      howToUse: [
        'Review the KPI cards at the top for key metrics',
        'Check AI Predictive Insights for forward-looking insights',
        'Review Anomaly Alerts if any are present',
        'Examine the 12-Month Financial Performance chart for trends',
        'Monitor the Financial Health Score for overall status',
        'Use the Cash Flow Forecast to plan ahead',
      ],
      tips: [
        'Set up alerts for critical thresholds (e.g., runway < 6 months)',
        'Review predictive insights weekly to stay ahead of trends',
        'Investigate anomalies immediately to prevent issues',
        'Export data for board presentations',
      ],
    },
    'Finance Department': {
      title: 'Finance Department',
      description: 'Manage your finance team, view department hierarchy, and access finance-specific tools and reports.',
      features: [
        'Department hierarchy and organization chart',
        'Team member management and role assignments',
        'Finance-specific dashboards and reports',
        'Department performance metrics',
      ],
      howToUse: [
        'View the department structure and team members',
        'Assign roles and permissions to team members',
        'Access department-specific financial reports',
        'Monitor team performance and workload',
      ],
      tips: [
        'Regularly review team structure for efficiency',
        'Ensure proper role segregation for compliance',
        'Use department metrics to identify training needs',
      ],
    },
    'FP&A & Forecasting': {
      title: 'FP&A & Forecasting',
      description: 'Comprehensive financial planning and analysis with driver-based forecasting, multi-scenario planning, and budget management.',
      features: [
        'Multi-Scenario Forecasting (Base, Optimistic, Pessimistic)',
        'Driver-Based Planning with impact analysis',
        'Budget vs Actuals with variance tracking',
        'Weighted revenue/expense/profit forecasts',
        '12-Month Forecast Comparison charts',
        'Status indicators for budget items',
      ],
      howToUse: [
        'Navigate to FP&A & Forecasting in the sidebar',
        'Review the three forecast scenarios and their probabilities',
        'Switch to "Budget vs Actuals" tab to see variances',
        'Use "Driver-Based Planning" to model business drivers',
        'Create custom scenarios by clicking "Create Scenario"',
        'Compare scenarios using the 12-Month Forecast chart',
      ],
      tips: [
        'Update drivers monthly based on actual performance',
        'Adjust scenario probabilities as conditions change',
        'Investigate significant budget variances (>10%)',
        'Use driver-based planning for sensitivity analysis',
      ],
    },
    'Advanced Treasury': {
      title: 'Advanced Treasury Management',
      description: 'Comprehensive cash, investment, debt, and foreign exchange exposure management.',
      features: [
        'Cash Positions: Track balances across multiple bank accounts',
        'Investment Portfolio: Monitor equity, bonds, money market funds',
        'Debt Management: Track lines of credit, term loans, bonds',
        'FX Exposure: Analyze foreign currency exposure and hedging',
        'Treasury Metrics: Total Cash, Investments, Debt, Net Position',
      ],
      howToUse: [
        'Go to Advanced Treasury in the sidebar',
        'Click "Cash Positions" tab to view/manage bank accounts',
        'Click "Investments" tab to track investment portfolio',
        'Click "Debt Management" tab to monitor debt instruments',
        'Click "FX Exposure" tab to analyze currency risk',
        'Add new accounts/investments/debt using the "+" buttons',
      ],
      tips: [
        'Reconcile bank accounts weekly',
        'Review FX exposure monthly and adjust hedging',
        'Monitor debt maturity dates and plan refinancing',
        'Optimize cash across accounts for interest maximization',
      ],
    },
    'Review Transactions': {
      title: 'Review Transactions',
      description: 'View and analyze all financial transactions including orders, payments, and transfers.',
      features: [
        'Transaction listing with date, amount, and details',
        'Filtering and search capabilities',
        'Export functionality',
        'Real-time updates',
      ],
      howToUse: [
        'Navigate to "Review Transactions" in the sidebar',
        'Use date range picker to filter by period',
        'Search for specific transactions',
        'Click on transactions for detailed view',
        'Export data using the export button',
      ],
      tips: [
        'Review transactions daily for accuracy',
        'Investigate unusual transactions immediately',
        'Export monthly transaction reports for records',
      ],
    },
    'Process Payouts': {
      title: 'Process Payouts',
      description: 'Manage and process payouts to vendors, suppliers, and service providers.',
      features: [
        'Payout listing and status tracking',
        'Approval workflow',
        'Batch processing',
        'Payment history',
      ],
      howToUse: [
        'Go to "Process Payouts" in the sidebar',
        'Review pending payouts',
        'Approve or reject payouts',
        'Process approved payouts in batches',
        'Track payment status and history',
      ],
      tips: [
        'Process payouts on a regular schedule (weekly/bi-weekly)',
        'Verify all approvals before processing',
        'Maintain payment records for audit',
      ],
    },
    'Manage Team': {
      title: 'Manage Team',
      description: 'Manage finance department members, assign roles, and set permissions.',
      features: [
        'Team member listing',
        'Role and permission management',
        'Add/remove team members',
        'Access control settings',
      ],
      howToUse: [
        'Navigate to "Manage Team" in the sidebar',
        'View current team members and their roles',
        'Click "Add Member" to add new team members',
        'Edit roles and permissions for existing members',
        'Remove members if needed',
      ],
      tips: [
        'Follow principle of least privilege for permissions',
        'Regularly review team access for security',
        'Document role changes for audit purposes',
      ],
    },
    'Run Payables': {
      title: 'Accounts Payable (AP)',
      description: 'Manage accounts payable, process invoices, and track vendor payments.',
      features: [
        'Invoice management and tracking',
        'Approval workflow',
        'Payment scheduling',
        'Vendor management',
        'AP aging reports',
      ],
      howToUse: [
        'Go to "Run Payables" in the sidebar',
        'Review pending invoices',
        'Approve or reject invoices',
        'Schedule payments',
        'Monitor AP aging to prioritize payments',
      ],
      tips: [
        'Process invoices within payment terms to maintain vendor relationships',
        'Review AP aging weekly to avoid late payments',
        'Negotiate early payment discounts when possible',
      ],
    },
    'Collect Receivables': {
      title: 'Accounts Receivable (AR)',
      description: 'Track accounts receivable, monitor collections, and manage customer payments.',
      features: [
        'AR aging reports',
        'Collection workflow',
        'Customer payment tracking',
        'Credit risk assessment',
        'Collection reminders',
      ],
      howToUse: [
        'Navigate to "Collect Receivables" in the sidebar',
        'Review AR aging report',
        'Identify overdue accounts',
        'Send collection reminders',
        'Track payment status',
      ],
      tips: [
        'Monitor AR aging daily for early intervention',
        'Follow up on overdue accounts promptly',
        'Assess credit risk before extending credit',
        'Offer payment plans for large overdue balances',
      ],
    },
    'Approve Spend': {
      title: 'Approve Spend',
      description: 'Review and approve financial spend requests from departments.',
      features: [
        'Pending approval queue',
        'Request details and justifications',
        'Approval/rejection workflow',
        'Approval history and audit trail',
      ],
      howToUse: [
        'Go to "Approve Spend" in the sidebar',
        'Review pending spend requests',
        'Check amounts, justifications, and budgets',
        'Approve or reject requests',
        'Add comments if needed',
      ],
      tips: [
        'Review approvals daily to avoid delays',
        'Verify requests are within budget',
        'Document reasons for rejections',
        'Set up approval limits for delegation',
      ],
    },
    'Cash Flow Forecast': {
      title: 'Cash Flow Forecast',
      description: 'Project cash inflows and outflows to plan liquidity and manage cash position.',
      features: [
        'Cash flow projections',
        'Inflow and outflow tracking',
        'Scenario modeling',
        'Liquidity planning',
      ],
      howToUse: [
        'Navigate to "Cash Flow Forecast" in the sidebar',
        'Review projected cash flows',
        'Adjust assumptions using sliders',
        'Compare different scenarios',
        'Export forecasts for planning',
      ],
      tips: [
        'Update forecasts weekly with actuals',
        'Model different scenarios for risk planning',
        'Maintain minimum cash reserves',
        'Plan for seasonal variations',
      ],
    },
    'Track Budget vs Actuals': {
      title: 'Budget vs Actuals',
      description: 'Compare budgeted amounts to actual spending and revenue to identify variances.',
      features: [
        'Budget vs actual comparison',
        'Variance analysis',
        'Category breakdown',
        'Trend analysis',
      ],
      howToUse: [
        'Go to "Track Budget vs Actuals" in the sidebar',
        'Review variance by category',
        'Identify over/under budget items',
        'Investigate significant variances',
        'Adjust budgets as needed',
      ],
      tips: [
        'Review variances monthly',
        'Investigate variances >10%',
        'Update budgets quarterly based on actuals',
        'Use variance data for next period budgeting',
      ],
    },
    'Close Checklist': {
      title: 'Close Checklist',
      description: 'Systematic checklist for completing month-end and year-end financial closes.',
      features: [
        'Close task checklist',
        'Task assignment and tracking',
        'Completion status',
        'Documentation requirements',
      ],
      howToUse: [
        'Navigate to "Close Checklist" in the sidebar',
        'Review all close tasks',
        'Complete tasks and check them off',
        'Upload required documentation',
        'Finalize close when all tasks complete',
      ],
      tips: [
        'Start close process 3-5 days before month end',
        'Assign tasks to team members',
        'Review all reconciliations before finalizing',
        'Document any exceptions or adjustments',
      ],
    },
    'Executive Communications': {
      title: 'Executive Communications',
      description: 'Business email system for executive-level communications and document sharing.',
      features: [
        'Email management',
        'Document attachments',
        'Threaded conversations',
        'Search and filtering',
      ],
      howToUse: [
        'Go to "Executive Communications" in the sidebar',
        'Compose new emails',
        'Reply to existing threads',
        'Attach documents',
        'Search for past communications',
      ],
      tips: [
        'Use clear subject lines for easy searching',
        'Archive important communications',
        'Follow up on action items',
      ],
    },
    'Message Center': {
      title: 'Message Center',
      description: 'Internal messaging system for team communications and notifications.',
      features: [
        'Real-time messaging',
        'Group conversations',
        'Notifications',
        'Message history',
      ],
      howToUse: [
        'Navigate to "Message Center" in the sidebar',
        'Start new conversations',
        'Join group chats',
        'Respond to messages',
        'Manage notifications',
      ],
      tips: [
        'Use for quick team coordination',
        'Keep important messages for reference',
        'Set notification preferences',
      ],
    },
    'Draft Documents': {
      title: 'Draft Documents',
      description: 'Word processor for creating financial reports, memos, and documentation.',
      features: [
        'Rich text editing',
        'Document templates',
        'Save and load documents',
        'Export to PDF/Word',
      ],
      howToUse: [
        'Go to "Draft Documents" in the sidebar',
        'Create new document or load existing',
        'Use formatting tools',
        'Save your work',
        'Export when complete',
      ],
      tips: [
        'Save documents frequently',
        'Use templates for consistency',
        'Export important documents for backup',
      ],
    },
  };

  const filteredFAQs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGuides = Object.entries(componentGuides).filter(
    ([title]) => title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box p="md">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start">
          <Box>
            <Title order={2} mb="xs">
              CFO Portal Instruction Manual
            </Title>
            <Text c="dimmed" size="sm">
              Comprehensive guides and FAQs for all CFO Portal components and Finance Department operations
            </Text>
          </Box>
          <Badge size="lg" color="blue" variant="light" leftSection={<IconBook size={16} />}>
            Documentation
          </Badge>
        </Group>

        <Alert icon={<IconInfoCircle size={16} />} color="blue" title="Getting Started">
          <Text size="sm">
            Use the search function below to find specific topics, or browse through the sections. Each component guide includes features, usage instructions, and helpful tips.
          </Text>
        </Alert>

        <Tabs defaultValue="guides">
          <Tabs.List>
            <Tabs.Tab value="guides" leftSection={<IconFileText size={16} />}>
              Component Guides
            </Tabs.Tab>
            <Tabs.Tab value="faq" leftSection={<IconQuestionMark size={16} />}>
              FAQs
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="guides" pt="md">
            <Stack gap="md">
              <Paper p="md" withBorder>
                <Group>
                  <IconSearch size={20} />
                  <TextInput
                    placeholder="Search component guides..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ flex: 1 }}
                  />
                </Group>
              </Paper>

              <Accordion
                value={expandedSection}
                onChange={setExpandedSection}
                variant="separated"
                radius="md"
              >
                {filteredGuides.map(([title, guide]) => (
                  <Accordion.Item key={title} value={title}>
                    <Accordion.Control>
                      <Group justify="space-between">
                        <Text fw={600}>{guide.title}</Text>
                        <Badge variant="light" color="blue">
                          {guide.features.length} features
                        </Badge>
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap="md">
                        <Text c="dimmed">{guide.description}</Text>

                        <Divider label="Features" labelPosition="left" />

                        <List spacing="xs" size="sm">
                          {guide.features.map((feature, idx) => (
                            <List.Item key={idx}>{feature}</List.Item>
                          ))}
                        </List>

                        <Divider label="How to Use" labelPosition="left" />

                        <List spacing="xs" size="sm" type="ordered">
                          {guide.howToUse.map((step, idx) => (
                            <List.Item key={idx}>{step}</List.Item>
                          ))}
                        </List>

                        <Divider label="Tips & Best Practices" labelPosition="left" />

                        <List spacing="xs" size="sm">
                          {guide.tips.map((tip, idx) => (
                            <List.Item key={idx} icon={<IconInfoCircle size={14} color="#3b82f6" />}>
                              {tip}
                            </List.Item>
                          ))}
                        </List>

                        {guide.relatedComponents && guide.relatedComponents.length > 0 && (
                          <>
                            <Divider label="Related Components" labelPosition="left" />
                            <Group gap="xs">
                              {guide.relatedComponents.map((related, idx) => (
                                <Badge key={idx} variant="light" color="gray">
                                  {related}
                                </Badge>
                              ))}
                            </Group>
                          </>
                        )}
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                ))}
              </Accordion>

              {filteredGuides.length === 0 && (
                <Card p="xl" withBorder>
                  <Text ta="center" c="dimmed">
                    No component guides found matching "{searchQuery}"
                  </Text>
                </Card>
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="faq" pt="md">
            <Stack gap="md">
              <Paper p="md" withBorder>
                <Group>
                  <IconSearch size={20} />
                  <TextInput
                    placeholder="Search FAQs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ flex: 1 }}
                  />
                </Group>
              </Paper>

              <Accordion variant="separated" radius="md">
                {filteredFAQs.map((faq, idx) => (
                  <Accordion.Item key={idx} value={`faq-${idx}`}>
                    <Accordion.Control>
                      <Text fw={500}>{faq.question}</Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Text size="sm" c="dimmed">
                        {faq.answer}
                      </Text>
                    </Accordion.Panel>
                  </Accordion.Item>
                ))}
              </Accordion>

              {filteredFAQs.length === 0 && (
                <Card p="xl" withBorder>
                  <Text ta="center" c="dimmed">
                    No FAQs found matching "{searchQuery}"
                  </Text>
                </Card>
              )}
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Box>
  );
};


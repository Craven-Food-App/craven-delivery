import React, { useState, useMemo } from 'react';
import {
  Stack,
  Title,
  Text,
  Card,
  Group,
  Badge,
  Divider,
  Box,
  Paper,
  Tabs,
  TextInput,
  ScrollArea,
  NavLink,
  ThemeIcon,
  Accordion,
  List,
  Alert,
  Timeline,
  Grid,
} from '@mantine/core';
import {
  IconBook,
  IconSearch,
  IconDashboard,
  IconChartLine,
  IconBuildingBank,
  IconCurrencyDollar,
  IconFileInvoice,
  IconUsers,
  IconFileText,
  IconShield,
  IconTrendingUp,
  IconScale,
  IconZoomMoney,
  IconChartDots,
  IconChartPie,
  IconChartBar,
  IconCalendar,
  IconTarget,
  IconAlertTriangle,
  IconInfoCircle,
  IconClock,
  IconCheck,
  IconChevronRight,
  IconTrendingDown,
  IconFile,
  IconSettings,
} from '@tabler/icons-react';

interface TabGuide {
  id: string;
  title: string;
  icon: React.FC<any>;
  category: 'Operations' | 'Planning' | 'Reporting' | 'Communication';
  timeEstimate: string;
  difficulty: 'Basic' | 'Intermediate' | 'Advanced';
  purpose: string;
  whenToUse: string[];
  steps: {
    title: string;
    description: string;
    substeps?: string[];
  }[];
  keyFeatures: {
    feature: string;
    description: string;
  }[];
  subTabs?: {
    name: string;
    purpose: string;
    howTo: string[];
  }[];
  proTips: string[];
  commonIssues: {
    issue: string;
    solution: string;
  }[];
  relatedTabs: string[];
}

export const CFOKnowledgeBase: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<string | null>('dashboard');
  const [activeSection, setActiveSection] = useState<string>('overview');

  const tabGuides: TabGuide[] = [
    {
      id: 'dashboard',
      title: 'CFO Dashboard',
      icon: IconDashboard,
      category: 'Operations',
      timeEstimate: '5-10 min daily',
      difficulty: 'Basic',
      purpose: 'Central command center providing real-time financial overview with AI-powered analytics, predictive insights, and anomaly detection.',
      whenToUse: [
        'Daily morning check to review overall financial health',
        'Before executive meetings to get latest metrics',
        'When investigating financial anomalies or trends',
        'To monitor real-time cash position and runway',
      ],
      steps: [
        {
          title: 'Review Key Performance Indicators (KPIs)',
          description: 'Start at the top of the dashboard with the KPI cards',
          substeps: [
            'Check Total Cash Position - ensure adequate liquidity',
            'Review Cash Runway - plan if dropping below 6 months',
            'Monitor Monthly Recurring Revenue (MRR) - track growth',
            'Verify Gross Margin - investigate if below target',
            'Check Operating Cash Flow - ensure positive trend',
            'Review AR Days Outstanding - follow up if increasing',
            'Monitor AP Aging - prioritize overdue payments',
            'Check Debt-to-Equity Ratio - assess leverage',
          ],
        },
        {
          title: 'Analyze AI Predictive Insights',
          description: 'Review forward-looking predictions and recommendations',
          substeps: [
            'Read each insight card - focus on high confidence predictions',
            'Note the impact level (High/Medium/Low)',
            'Review the time horizon (30/60/90 days)',
            'Take action on high-impact, high-confidence insights',
            'Add insights to follow-up list for team discussions',
          ],
        },
        {
          title: 'Investigate Anomaly Alerts',
          description: 'Address unusual patterns immediately',
          substeps: [
            'Click on each anomaly alert to see details',
            'Review the metric affected and severity',
            'Check the underlying data causing the anomaly',
            'Determine if it requires immediate action',
            'Document investigation notes in the system',
          ],
        },
        {
          title: 'Review Financial Trends',
          description: 'Examine the 12-Month Performance chart',
          substeps: [
            'Identify upward/downward trends in revenue',
            'Compare expenses to revenue growth',
            'Note seasonal patterns for forecasting',
            'Look for inflection points requiring attention',
          ],
        },
        {
          title: 'Check Financial Health Score',
          description: 'Monitor the overall financial health ring indicator',
          substeps: [
            'Note the current score (0-100)',
            'Compare to previous period',
            'Identify which factors are affecting the score',
            'Create action plan if score is declining',
          ],
        },
        {
          title: 'Review Cash Flow Forecast',
          description: 'Plan for upcoming liquidity needs',
          substeps: [
            'Examine 6-month forecast projection',
            'Identify periods of cash shortage',
            'Plan for major inflows and outflows',
            'Adjust operations if forecast shows concerns',
          ],
        },
      ],
      keyFeatures: [
        {
          feature: 'Real-Time Data Updates',
          description: 'Dashboard refreshes every 30 seconds with latest financial data',
        },
        {
          feature: 'AI Predictive Analytics',
          description: 'Machine learning models predict future trends with confidence levels',
        },
        {
          feature: 'Anomaly Detection',
          description: 'Automated alerts for unusual financial patterns',
        },
        {
          feature: 'Interactive Charts',
          description: 'Click on chart elements to drill down into details',
        },
        {
          feature: 'Export Functionality',
          description: 'Download data for board presentations and reports',
        },
      ],
      proTips: [
        'Set up email alerts for critical metrics (runway < 6 months, negative cash flow)',
        'Review the dashboard first thing each morning before checking emails',
        'Use the export feature to create a weekly summary for your executive team',
        'Compare YoY (Year over Year) metrics to identify growth trends',
        'Document action items from anomaly investigations',
      ],
      commonIssues: [
        {
          issue: 'Dashboard shows outdated data',
          solution: 'Click the refresh icon or wait 30 seconds for auto-refresh. Check if data sync from source systems is functioning.',
        },
        {
          issue: 'Predictive insights seem inaccurate',
          solution: 'AI models improve over time. Ensure historical data is clean and complete. Contact support if predictions remain consistently off.',
        },
        {
          issue: 'Too many anomaly alerts',
          solution: 'Adjust sensitivity thresholds in Settings. Some volatility may be normal for your business - tune alerts accordingly.',
        },
      ],
      relatedTabs: ['FP&A & Forecasting', 'Cash Flow Forecast', 'Advanced Treasury'],
    },
    {
      id: 'fpa',
      title: 'FP&A & Forecasting',
      icon: IconChartLine,
      category: 'Planning',
      timeEstimate: '30-60 min weekly',
      difficulty: 'Advanced',
      purpose: 'Comprehensive financial planning and analysis with driver-based forecasting, multi-scenario planning, and budget management.',
      whenToUse: [
        'Monthly/quarterly financial planning cycles',
        'Creating board presentations and forecasts',
        'Scenario analysis for strategic decisions',
        'Budget variance analysis',
        'Preparing for fundraising or board meetings',
      ],
      steps: [
        {
          title: 'Review Multi-Scenario Forecasts',
          description: 'Analyze Base, Optimistic, and Pessimistic scenarios',
          substeps: [
            'Open FP&A & Forecasting tab',
            'Review Base Case scenario (most likely outcome)',
            'Check Optimistic scenario (upside potential)',
            'Review Pessimistic scenario (downside risk)',
            'Note probability-weighted revenue/expenses/profit',
            'Compare scenarios to identify key variables',
          ],
        },
        {
          title: 'Update Business Drivers',
          description: 'Modify key drivers that impact financial performance',
          substeps: [
            'Click "Driver-Based Planning" sub-tab',
            'Update customer count projections',
            'Adjust average order value assumptions',
            'Modify churn rate based on trends',
            'Update customer acquisition cost (CAC)',
            'Adjust other relevant drivers for your business',
            'Save changes and review impact on forecast',
          ],
        },
        {
          title: 'Analyze Budget vs Actuals',
          description: 'Compare planned budget to actual performance',
          substeps: [
            'Switch to "Budget vs Actuals" sub-tab',
            'Review each line item (Revenue, COGS, OpEx)',
            'Identify variances > 10%',
            'Investigate causes of major variances',
            'Update budget if assumptions have changed',
            'Document variance explanations',
          ],
        },
        {
          title: 'Create Custom Scenarios',
          description: 'Model specific what-if scenarios',
          substeps: [
            'Click "Create Scenario" button',
            'Name the scenario (e.g., "New Product Launch")',
            'Set probability percentage',
            'Adjust revenue assumptions',
            'Modify expense assumptions',
            'Update key drivers',
            'Save and compare to other scenarios',
          ],
        },
        {
          title: 'Generate Forecast Reports',
          description: 'Export forecasts for presentations',
          substeps: [
            'Review 12-Month Forecast Comparison chart',
            'Click "Export" button',
            'Choose format (PDF/Excel/CSV)',
            'Include selected scenarios',
            'Add commentary for stakeholders',
          ],
        },
      ],
      keyFeatures: [
        {
          feature: 'Multi-Scenario Planning',
          description: 'Model Base, Optimistic, and Pessimistic outcomes with probability weighting',
        },
        {
          feature: 'Driver-Based Forecasting',
          description: 'Link financial outcomes to business drivers (customers, pricing, churn)',
        },
        {
          feature: 'Variance Analysis',
          description: 'Automatically calculate and highlight budget variances',
        },
        {
          feature: 'Sensitivity Analysis',
          description: 'See how changes in drivers impact the forecast',
        },
        {
          feature: 'Rolling Forecasts',
          description: 'Continuously update forecasts with actual data',
        },
      ],
      subTabs: [
        {
          name: 'Scenarios',
          purpose: 'View and compare multiple forecast scenarios',
          howTo: [
            'Review Base/Optimistic/Pessimistic scenarios',
            'Compare probability-weighted outcomes',
            'Create new custom scenarios',
            'Toggle scenarios on/off in comparison chart',
          ],
        },
        {
          name: 'Driver-Based Planning',
          purpose: 'Model financial outcomes based on business drivers',
          howTo: [
            'Identify key business drivers (customers, pricing, etc.)',
            'Update driver assumptions',
            'Review impact on revenue and expenses',
            'Perform sensitivity analysis by adjusting drivers',
          ],
        },
        {
          name: 'Budget vs Actuals',
          purpose: 'Compare budgeted amounts to actual performance',
          howTo: [
            'Review variance by category',
            'Identify items over/under budget',
            'Investigate significant variances (>10%)',
            'Update budget if assumptions changed',
          ],
        },
      ],
      proTips: [
        'Update forecasts monthly after the close process completes',
        'Use driver-based planning for sensitivity analysis before board meetings',
        'Maintain scenario probabilities - adjust as market conditions change',
        'Document assumptions for each scenario to maintain consistency',
        'Link driver assumptions to actual KPIs from the dashboard',
        'Create a "Mid-Case" scenario between Base and Pessimistic for conservative planning',
      ],
      commonIssues: [
        {
          issue: 'Forecasts seem too volatile month-to-month',
          solution: 'Review driver assumptions for reasonableness. Consider using 3-month rolling averages for drivers. Smooth out seasonal variations.',
        },
        {
          issue: 'Budget variances are consistently in one direction',
          solution: 'Budget assumptions may be systematically biased. Recalibrate budget using actual trends. Involve department heads in assumption-setting.',
        },
        {
          issue: 'Unable to create new scenarios',
          solution: 'Check if you have reached the scenario limit (typically 10). Archive old scenarios. Ensure you have edit permissions.',
        },
      ],
      relatedTabs: ['CFO Dashboard', 'Budget vs Actuals', 'Scenario Planning', 'Cash Flow Forecast'],
    },
    {
      id: 'treasury',
      title: 'Advanced Treasury Management',
      icon: IconBuildingBank,
      category: 'Operations',
      timeEstimate: '20-30 min daily',
      difficulty: 'Advanced',
      purpose: 'Comprehensive management of cash positions, investments, debt instruments, and foreign exchange exposure.',
      whenToUse: [
        'Daily cash position monitoring',
        'Investment portfolio rebalancing',
        'Debt refinancing planning',
        'FX hedging decisions',
        'Bank reconciliation',
      ],
      steps: [
        {
          title: 'Monitor Cash Positions',
          description: 'Track balances across all bank accounts',
          substeps: [
            'Open Advanced Treasury tab',
            'Click "Cash Positions" sub-tab',
            'Review total cash across all accounts',
            'Check each account balance',
            'Note accounts below minimum balance',
            'Identify excess cash for investment',
            'Plan transfers between accounts if needed',
          ],
        },
        {
          title: 'Manage Investment Portfolio',
          description: 'Track and rebalance investments',
          substeps: [
            'Click "Investments" sub-tab',
            'Review total investment value',
            'Check asset allocation (stocks/bonds/money market)',
            'Review performance of each investment',
            'Identify underperforming assets',
            'Rebalance if allocation drifts > 5%',
            'Add new investments if cash available',
          ],
        },
        {
          title: 'Track Debt Instruments',
          description: 'Monitor debt obligations and covenants',
          substeps: [
            'Click "Debt Management" sub-tab',
            'Review total debt outstanding',
            'Check maturity dates',
            'Monitor interest rates',
            'Verify covenant compliance',
            'Plan for upcoming principal payments',
            'Identify refinancing opportunities',
          ],
        },
        {
          title: 'Analyze FX Exposure',
          description: 'Assess foreign currency risk',
          substeps: [
            'Click "FX Exposure" sub-tab',
            'Review exposure by currency',
            'Check current hedging positions',
            'Assess unhedged exposure',
            'Monitor exchange rate movements',
            'Update hedging strategy if needed',
          ],
        },
        {
          title: 'Add/Update Accounts',
          description: 'Maintain accurate account information',
          substeps: [
            'Click "+" button to add new account',
            'Enter bank name and account details',
            'Input current balance and currency',
            'Set account type (checking/savings/etc.)',
            'Enter interest rate if applicable',
            'Save and verify balance reflects correctly',
          ],
        },
      ],
      keyFeatures: [
        {
          feature: 'Multi-Currency Support',
          description: 'Track accounts and investments in multiple currencies',
        },
        {
          feature: 'Real-Time Balance Updates',
          description: 'Balances update automatically from bank feeds',
        },
        {
          feature: 'Investment Performance Tracking',
          description: 'Monitor returns and asset allocation',
        },
        {
          feature: 'Debt Covenant Monitoring',
          description: 'Track compliance with debt agreements',
        },
        {
          feature: 'FX Risk Analytics',
          description: 'Calculate value at risk (VaR) for FX exposure',
        },
      ],
      subTabs: [
        {
          name: 'Cash Positions',
          purpose: 'Monitor cash balances across all bank accounts',
          howTo: [
            'View list of all bank accounts',
            'Check total cash position',
            'Add new accounts with + button',
            'Update balances manually if needed',
            'Export cash position report',
          ],
        },
        {
          name: 'Investments',
          purpose: 'Track investment portfolio performance',
          howTo: [
            'Review equity, bond, and money market holdings',
            'Check total investment value',
            'Monitor asset allocation percentages',
            'Add new investments',
            'Rebalance portfolio as needed',
          ],
        },
        {
          name: 'Debt Management',
          purpose: 'Monitor debt instruments and covenants',
          howTo: [
            'View lines of credit, term loans, and bonds',
            'Track outstanding principal amounts',
            'Monitor maturity dates',
            'Check interest rates',
            'Verify covenant compliance',
          ],
        },
        {
          name: 'FX Exposure',
          purpose: 'Analyze foreign currency exposure and hedging',
          howTo: [
            'Review exposure by currency',
            'Check current hedging positions',
            'Calculate net exposure',
            'Assess hedging needs',
            'Monitor exchange rate movements',
          ],
        },
      ],
      proTips: [
        'Reconcile bank accounts weekly to catch discrepancies early',
        'Maintain 3-6 months of operating expenses in liquid cash',
        'Review FX exposure monthly and hedge positions exceeding risk tolerance',
        'Monitor debt maturity dates and plan refinancing 6-12 months in advance',
        'Optimize cash across accounts to maximize interest income',
        'Consider zero-balance accounts to automatically sweep excess cash',
      ],
      commonIssues: [
        {
          issue: 'Bank balances not syncing automatically',
          solution: 'Check bank feed connection in Settings. Verify credentials. Re-authenticate connection. If issue persists, update balances manually.',
        },
        {
          issue: 'Investment values seem outdated',
          solution: 'Market data may have a delay. Click refresh button. Check if data provider is experiencing issues. Contact support if > 1 day old.',
        },
        {
          issue: 'Unable to add new bank account',
          solution: 'Verify you have admin permissions. Check if account limit reached. Ensure all required fields are filled. Try different browser.',
        },
      ],
      relatedTabs: ['CFO Dashboard', 'Cash Flow Forecast', 'Risk Management'],
    },
    {
      id: 'ar',
      title: 'Accounts Receivable',
      icon: IconCurrencyDollar,
      category: 'Operations',
      timeEstimate: '15-20 min daily',
      difficulty: 'Intermediate',
      purpose: 'Track customer payments, monitor collections, and manage accounts receivable aging.',
      whenToUse: [
        'Daily collection monitoring',
        'Weekly AR aging review',
        'Before month-end close',
        'When cash flow is tight',
        'Credit risk assessment',
      ],
      steps: [
        {
          title: 'Review AR Aging Report',
          description: 'Monitor overdue customer balances',
          substeps: [
            'Open Accounts Receivable tab',
            'Review aging buckets (Current, 30, 60, 90+ days)',
            'Identify customers in 90+ days bucket',
            'Calculate DSO (Days Sales Outstanding)',
            'Note trend compared to prior period',
            'Prioritize collection efforts based on aging',
          ],
        },
        {
          title: 'Follow Up on Overdue Accounts',
          description: 'Contact customers with outstanding balances',
          substeps: [
            'Filter to show only overdue invoices',
            'Start with largest dollar amounts',
            'Send automated collection reminders',
            'Call customers with 60+ day balances',
            'Offer payment plans if needed',
            'Document all collection activities',
            'Escalate to collections agency if necessary',
          ],
        },
        {
          title: 'Process Customer Payments',
          description: 'Apply received payments to invoices',
          substeps: [
            'Click "Record Payment" button',
            'Select customer',
            'Enter payment amount and date',
            'Choose payment method',
            'Apply to specific invoices or oldest first',
            'Save and verify AR balance updated',
          ],
        },
        {
          title: 'Assess Credit Risk',
          description: 'Evaluate customer creditworthiness',
          substeps: [
            'Review payment history for each customer',
            'Calculate average days to pay',
            'Check credit limit vs outstanding balance',
            'Identify customers exceeding credit limit',
            'Put high-risk customers on hold',
            'Adjust credit limits as needed',
          ],
        },
        {
          title: 'Generate AR Reports',
          description: 'Create reports for analysis',
          substeps: [
            'Click "Export" button',
            'Select report type (Aging, Customer Summary)',
            'Choose date range',
            'Select format (PDF/Excel)',
            'Download and review',
          ],
        },
      ],
      keyFeatures: [
        {
          feature: 'AR Aging Buckets',
          description: 'Categorize receivables by days outstanding (Current, 30, 60, 90+)',
        },
        {
          feature: 'Automated Collection Reminders',
          description: 'Send emails automatically when invoices become overdue',
        },
        {
          feature: 'Payment History Tracking',
          description: 'View complete payment history for each customer',
        },
        {
          feature: 'DSO Calculation',
          description: 'Automatically calculate Days Sales Outstanding metric',
        },
        {
          feature: 'Credit Limit Management',
          description: 'Set and monitor credit limits per customer',
        },
      ],
      proTips: [
        'Review AR aging daily - early intervention prevents write-offs',
        'Call customers before sending to collections - maintain relationships',
        'Offer early payment discounts (2% 10 Net 30) to improve cash flow',
        'Require credit card on file for small/new customers',
        'Set up automated reminders at 7, 14, and 30 days past due',
        'Monitor DSO trend - target <45 days for B2B, <30 days for B2C',
      ],
      commonIssues: [
        {
          issue: 'Customer claims they paid but balance shows outstanding',
          solution: 'Check if payment was applied to correct invoice. Verify payment cleared bank. Search for unapplied payments. Contact customer for proof of payment.',
        },
        {
          issue: 'DSO is increasing despite collection efforts',
          solution: 'Review credit policy - may be too lenient. Check if salespeople offering extended terms. Analyze if specific customer segment causing issue. Consider factoring.',
        },
        {
          issue: 'Unable to send collection reminder',
          solution: 'Verify customer email address is valid. Check if customer unsubscribed. Verify email service is configured. Check spam folders.',
        },
      ],
      relatedTabs: ['CFO Dashboard', 'Cash Flow Forecast', 'Risk Management'],
    },
    {
      id: 'ap',
      title: 'Accounts Payable',
      icon: IconFileInvoice,
      category: 'Operations',
      timeEstimate: '20-30 min 2x/week',
      difficulty: 'Intermediate',
      purpose: 'Manage vendor invoices, approve payments, and optimize payment timing.',
      whenToUse: [
        'Twice-weekly payment processing',
        'Before check runs',
        'Month-end accrual review',
        'Vendor relationship management',
        'Early payment discount evaluation',
      ],
      steps: [
        {
          title: 'Review Pending Invoices',
          description: 'Process new vendor invoices',
          substeps: [
            'Open Accounts Payable tab',
            'Review list of pending invoices',
            'Verify invoice details (amount, due date, terms)',
            'Match invoices to POs if applicable',
            'Check for pricing discrepancies',
            'Verify receipt of goods/services',
            'Approve or flag for review',
          ],
        },
        {
          title: 'Approve Invoices for Payment',
          description: 'Move approved invoices to payment queue',
          substeps: [
            'Filter to show "Pending Approval" invoices',
            'Review each invoice for completeness',
            'Verify budget availability',
            'Check approval workflow requirements',
            'Click "Approve" for valid invoices',
            'Add to payment batch',
          ],
        },
        {
          title: 'Schedule Payments',
          description: 'Optimize payment timing',
          substeps: [
            'Review upcoming due dates',
            'Identify early payment discounts (2/10 Net 30)',
            'Calculate ROI of early payment discounts',
            'Schedule payments for optimal timing',
            'Ensure sufficient cash for payment batch',
            'Balance vendor relationships with cash conservation',
          ],
        },
        {
          title: 'Process Payment Batch',
          description: 'Execute scheduled payments',
          substeps: [
            'Click "Process Payments" button',
            'Review payment batch summary',
            'Verify total amount',
            'Select payment method (ACH/Check/Wire)',
            'Enter approver credentials',
            'Execute payment batch',
            'Verify payments posted to bank',
          ],
        },
        {
          title: 'Monitor AP Aging',
          description: 'Track outstanding payables',
          substeps: [
            'Click "AP Aging" sub-tab',
            'Review aging buckets',
            'Identify overdue payables',
            'Prioritize critical vendors',
            'Contact vendors if payment delayed',
            'Track days payable outstanding (DPO)',
          ],
        },
      ],
      keyFeatures: [
        {
          feature: 'AP Aging Analysis',
          description: 'Track payables by days outstanding to manage cash flow',
        },
        {
          feature: 'Approval Workflows',
          description: 'Multi-level approval routing based on dollar thresholds',
        },
        {
          feature: 'Early Payment Discount Tracking',
          description: 'Identify and calculate ROI of early payment discounts',
        },
        {
          feature: 'Batch Payment Processing',
          description: 'Process multiple payments efficiently in batches',
        },
        {
          feature: 'Vendor Performance Tracking',
          description: 'Monitor vendor delivery and pricing trends',
        },
      ],
      proTips: [
        'Process AP twice weekly - Wednesday and Friday typically optimal',
        'Take early payment discounts if ROI > cost of capital (usually 2/10 Net 30)',
        'Maintain strong vendor relationships - pay on time even when cash is tight',
        'Negotiate longer payment terms (Net 45 instead of Net 30) to improve cash flow',
        'Set up ACH for recurring vendors - saves time and money vs checks',
        'Target DPO of 45-60 days for optimal working capital management',
      ],
      commonIssues: [
        {
          issue: 'Invoice stuck in approval workflow',
          solution: 'Check approver status. Send reminder to approver. Verify approval hierarchy is correct. Use override if appropriate and documented.',
        },
        {
          issue: 'Duplicate invoice warnings',
          solution: 'Compare invoice details carefully. Check if PO was split. Verify invoice numbers. If truly duplicate, reject and notify vendor.',
        },
        {
          issue: 'Payment failed to process',
          solution: 'Verify sufficient bank balance. Check payment method details. Confirm vendor information is correct. Retry payment or contact bank.',
        },
      ],
      relatedTabs: ['CFO Dashboard', 'Cash Flow Forecast', 'Advanced Treasury'],
    },
    {
      id: 'payroll',
      title: 'Payroll Management',
      icon: IconUsers,
      category: 'Operations',
      timeEstimate: '1-2 hours biweekly',
      difficulty: 'Advanced',
      purpose: 'Process payroll, manage employee compensation, ensure compliance with tax regulations.',
      whenToUse: [
        'Biweekly/monthly payroll processing',
        'New hire compensation setup',
        'Annual compensation reviews',
        'Tax filing and compliance',
        'Year-end reporting',
      ],
      steps: [
        {
          title: 'Prepare Payroll',
          description: 'Gather inputs for payroll processing',
          substeps: [
            'Open Payroll Management tab',
            'Verify employee list is current',
            'Review timesheets/hours worked',
            'Process any bonuses or commissions',
            'Review deductions and benefits',
            'Check for any salary changes',
            'Verify tax withholding information',
          ],
        },
        {
          title: 'Review Payroll Summary',
          description: 'Validate payroll before processing',
          substeps: [
            'Click "Generate Payroll" button',
            'Review total gross pay',
            'Verify total deductions',
            'Check employer tax contributions',
            'Review net pay by employee',
            'Confirm bank account has sufficient funds',
            'Look for unusual variances',
          ],
        },
        {
          title: 'Process Payroll',
          description: 'Execute payroll payments',
          substeps: [
            'Click "Approve Payroll" button',
            'Enter authorization credentials',
            'Confirm payment date',
            'Verify direct deposit accounts',
            'Execute payroll run',
            'Generate payroll journal entry',
            'Confirm payments initiated',
          ],
        },
        {
          title: 'Distribute Pay Stubs',
          description: 'Provide payment documentation',
          substeps: [
            'Generate electronic pay stubs',
            'Send to employees via portal/email',
            'Verify all employees received',
            'Address any employee questions',
            'File copies for records',
          ],
        },
        {
          title: 'Remit Taxes',
          description: 'Pay payroll taxes to authorities',
          substeps: [
            'Calculate federal tax deposit',
            'Calculate state tax deposit',
            'Process EFTPS payment (federal)',
            'Process state tax payment',
            'Record tax payments in GL',
            'File required reports (941, etc.)',
          ],
        },
      ],
      keyFeatures: [
        {
          feature: 'Automated Tax Calculations',
          description: 'Calculate federal, state, and local taxes automatically',
        },
        {
          feature: 'Direct Deposit Integration',
          description: 'Process electronic payments to employee bank accounts',
        },
        {
          feature: 'Benefits Administration',
          description: 'Manage health insurance, 401(k), and other deductions',
        },
        {
          feature: 'Time & Attendance Integration',
          description: 'Import hours worked from time tracking systems',
        },
        {
          feature: 'Compliance Reporting',
          description: 'Generate W-2s, 1099s, and other required forms',
        },
      ],
      proTips: [
        'Process payroll 2 days before pay date to allow for bank processing time',
        'Review payroll reports before submitting - errors are expensive to correct',
        'Maintain separate bank account for payroll to avoid cash flow issues',
        'Set up payroll tax reminders - late penalties are significant',
        'Audit payroll quarterly - verify tax rates, employee info, deductions',
        'Consider outsourcing payroll if < 50 employees - often more cost effective',
      ],
      commonIssues: [
        {
          issue: 'Employee not receiving direct deposit',
          solution: 'Verify bank account and routing numbers. Check if account is active. Confirm employee signed up for direct deposit. Issue paper check as backup.',
        },
        {
          issue: 'Tax calculation seems incorrect',
          solution: 'Verify employee W-4 information. Check state withholding settings. Ensure tax rates are current. Consult with payroll tax specialist.',
        },
        {
          issue: 'Unable to submit payroll on time',
          solution: 'Start payroll process 3-4 days before deadline. Have backup approver designated. Keep emergency contact for payroll provider.',
        },
      ],
      relatedTabs: ['CFO Dashboard', 'Approve Spend', 'Financial Controls'],
    },
    {
      id: 'tax',
      title: 'Tax Planning',
      icon: IconFileText,
      category: 'Planning',
      timeEstimate: '2-4 hours quarterly',
      difficulty: 'Advanced',
      purpose: 'Manage tax planning, estimate tax liabilities, ensure compliance with tax regulations.',
      whenToUse: [
        'Quarterly tax estimate calculations',
        'Year-end tax planning',
        'Before major transactions',
        'Tax credit/incentive evaluation',
        'Tax return preparation',
      ],
      steps: [
        {
          title: 'Calculate Quarterly Estimates',
          description: 'Estimate federal and state tax liability',
          substeps: [
            'Open Tax Planning tab',
            'Review YTD taxable income',
            'Apply current tax rates',
            'Calculate estimated quarterly payment',
            'Compare to prior year safe harbor',
            'Adjust for any tax credits',
            'Schedule payment before deadline',
          ],
        },
        {
          title: 'Review Tax Positions',
          description: 'Assess tax strategies and exposures',
          substeps: [
            'Review R&D tax credit eligibility',
            'Evaluate bonus depreciation opportunities',
            'Check Section 179 deduction options',
            'Assess state tax nexus',
            'Review transfer pricing if international',
            'Document uncertain tax positions',
          ],
        },
        {
          title: 'Plan Year-End Tax Strategy',
          description: 'Optimize tax position before year end',
          substeps: [
            'Project annual taxable income',
            'Identify opportunities to defer income',
            'Accelerate deductible expenses if beneficial',
            'Review capital expenditure timing',
            'Evaluate retirement plan contributions',
            'Meet with tax advisor for strategy session',
          ],
        },
        {
          title: 'Prepare Tax Provision',
          description: 'Calculate tax expense for financial reporting',
          substeps: [
            'Calculate current tax expense',
            'Calculate deferred tax assets/liabilities',
            'Review temporary vs permanent differences',
            'Assess valuation allowance needs',
            'Prepare journal entry',
            'Document assumptions and calculations',
          ],
        },
      ],
      keyFeatures: [
        {
          feature: 'Tax Rate Calculator',
          description: 'Calculate effective tax rate by jurisdiction',
        },
        {
          feature: 'Quarterly Estimate Tracker',
          description: 'Monitor estimated tax payments vs liability',
        },
        {
          feature: 'Tax Credit Finder',
          description: 'Identify available tax credits and incentives',
        },
        {
          feature: 'Nexus Tracker',
          description: 'Monitor state tax nexus thresholds',
        },
        {
          feature: 'Compliance Calendar',
          description: 'Track tax filing and payment deadlines',
        },
      ],
      proTips: [
        'Work with tax advisor quarterly, not just at year-end',
        'Document all tax positions contemporaneously - easier than retroactive',
        'Consider tax impact before major transactions or structural changes',
        'File for extensions if needed - better to file late than file wrong',
        'Maintain separate files for each tax year for easy audit response',
        'Review state tax credits annually - many go unclaimed',
      ],
      commonIssues: [
        {
          issue: 'Quarterly estimate significantly different from prior quarters',
          solution: 'Review income/expense changes. Verify tax rate is current. Check for one-time items affecting calculation. Consult with tax advisor.',
        },
        {
          issue: 'Unclear if have state tax nexus',
          solution: 'Review sales and activities by state. Check nexus thresholds (economic and physical). Consult with state tax specialist. Register proactively if uncertain.',
        },
        {
          issue: 'Tax provision differs significantly from cash taxes',
          solution: 'Review timing differences (book vs tax depreciation, etc.). Verify all adjustments are proper. Ensure deferred tax calculation is correct.',
        },
      ],
      relatedTabs: ['CFO Dashboard', 'Financial Controls', 'Audit Management'],
    },
    {
      id: 'controls',
      title: 'Financial Controls',
      icon: IconShield,
      category: 'Reporting',
      timeEstimate: '30-45 min weekly',
      difficulty: 'Advanced',
      purpose: 'Monitor internal controls, ensure SOX compliance, manage financial risks.',
      whenToUse: [
        'Weekly control monitoring',
        'Quarterly SOX testing',
        'Before audit preparation',
        'After process changes',
        'Control deficiency investigation',
      ],
      steps: [
        {
          title: 'Review Control Dashboard',
          description: 'Monitor control effectiveness',
          substeps: [
            'Open Financial Controls tab',
            'Review control status summary',
            'Check for any failed controls',
            'Review control test results',
            'Note any exceptions or deficiencies',
            'Review control coverage by process',
          ],
        },
        {
          title: 'Execute Control Tests',
          description: 'Test key controls',
          substeps: [
            'Select control to test',
            'Review control description and objective',
            'Obtain evidence per test procedure',
            'Evaluate if control operated effectively',
            'Document test results',
            'Escalate any control failures',
          ],
        },
        {
          title: 'Investigate Control Deficiencies',
          description: 'Address control failures',
          substeps: [
            'Review nature of deficiency',
            'Assess if deficiency or significant deficiency',
            'Determine root cause',
            'Develop remediation plan',
            'Assign remediation owner',
            'Set target completion date',
            'Document in deficiency tracking log',
          ],
        },
        {
          title: 'Update Control Documentation',
          description: 'Maintain current control documentation',
          substeps: [
            'Review control narratives for accuracy',
            'Update if processes have changed',
            'Refresh process flowcharts',
            'Update risk control matrices (RCM)',
            'Version control all documentation',
            'Obtain management sign-off',
          ],
        },
      ],
      keyFeatures: [
        {
          feature: 'Control Testing Dashboard',
          description: 'Track status and results of control tests',
        },
        {
          feature: 'Deficiency Tracking',
          description: 'Monitor remediation of control deficiencies',
        },
        {
          feature: 'SOX Compliance Module',
          description: 'Manage Sarbanes-Oxley compliance requirements',
        },
        {
          feature: 'Control Documentation Library',
          description: 'Centralized repository for control procedures',
        },
        {
          feature: 'Segregation of Duties Matrix',
          description: 'Monitor conflicting access combinations',
        },
      ],
      proTips: [
        'Test key controls throughout the year, not just at year-end',
        'Document everything - if it\'s not documented, it didn\'t happen',
        'Rotate control testers to get fresh perspectives',
        'Implement detective controls to supplement preventive controls',
        'Review user access quarterly - remove access for terminated employees immediately',
        'Maintain a control issues log and review with audit committee',
      ],
      commonIssues: [
        {
          issue: 'Control failing repeatedly',
          solution: 'Re-evaluate control design - may not be effective. Assess if control owner has sufficient training. Consider if control is too complex. Redesign if necessary.',
        },
        {
          issue: 'Can\'t find evidence of control operation',
          solution: 'Review control documentation - may need better evidence retention. Implement system-generated evidence where possible. Train control owners on documentation.',
        },
        {
          issue: 'Segregation of duties violations',
          solution: 'Review access rights immediately. Implement compensating controls if segregation not possible. Document management override procedures. Consider system changes.',
        },
      ],
      relatedTabs: ['Audit Management', 'Risk Management', 'Tax Planning'],
    },
    {
      id: 'board',
      title: 'Board Reporting',
      icon: IconTrendingUp,
      category: 'Reporting',
      timeEstimate: '4-8 hours monthly',
      difficulty: 'Advanced',
      purpose: 'Prepare board presentations, financial packages, and executive summaries.',
      whenToUse: [
        'Before board meetings',
        'Monthly/quarterly board packages',
        'Strategic planning presentations',
        'Fundraising materials',
        'Investor updates',
      ],
      steps: [
        {
          title: 'Gather Board Package Data',
          description: 'Compile financial data for board',
          substeps: [
            'Open Board Reporting tab',
            'Pull financial statements (P&L, Balance Sheet, Cash Flow)',
            'Extract key metrics from dashboard',
            'Gather budget vs actuals',
            'Compile cash runway analysis',
            'Pull hiring and headcount data',
            'Gather KPIs by department',
          ],
        },
        {
          title: 'Create Executive Summary',
          description: 'Summarize key points for board',
          substeps: [
            'Highlight financial performance',
            'Note significant variances from budget/forecast',
            'Summarize cash position and runway',
            'Outline key accomplishments',
            'Flag key risks or concerns',
            'Present asks/requests for board',
            'Keep to 1-2 pages maximum',
          ],
        },
        {
          title: 'Build Board Presentation',
          description: 'Create visual presentation',
          substeps: [
            'Use board presentation template',
            'Lead with executive summary',
            'Show financial performance trends',
            'Present budget vs actuals with commentary',
            'Include cash flow forecast',
            'Add departmental KPIs',
            'End with asks and discussion topics',
            'Limit to 10-15 slides',
          ],
        },
        {
          title: 'Review with CEO',
          description: 'Align on board messaging',
          substeps: [
            'Schedule review meeting with CEO',
            'Walk through board package',
            'Align on narrative and messaging',
            'Incorporate CEO feedback',
            'Finalize asks for board',
            'Confirm timing and logistics',
          ],
        },
        {
          title: 'Distribute Board Package',
          description: 'Send materials to board members',
          substeps: [
            'Export final package to PDF',
            'Send via secure portal',
            'Confirm all board members received',
            'Provide advance copies to board chair',
            'Include appendix with detailed financials',
            'Send 3-5 days before meeting',
          ],
        },
      ],
      keyFeatures: [
        {
          feature: 'Board Package Template',
          description: 'Pre-formatted templates for consistent reporting',
        },
        {
          feature: 'One-Click Data Refresh',
          description: 'Update all metrics automatically',
        },
        {
          feature: 'Variance Commentary',
          description: 'Auto-generate commentary on significant variances',
        },
        {
          feature: 'Visual Analytics',
          description: 'Charts and graphs for board consumption',
        },
        {
          feature: 'Secure Distribution',
          description: 'Encrypted delivery to board members',
        },
      ],
      proTips: [
        'Establish consistent board package format - easier to compare over time',
        'Send materials 3-5 days in advance - board members need time to review',
        'Focus on trends and insights, not just numbers',
        'Use visuals liberally - board members appreciate clear charts',
        'Limit text on slides - use appendix for details',
        'Prepare answers for likely questions in advance',
        'Include both good and bad news - credibility comes from transparency',
      ],
      commonIssues: [
        {
          issue: 'Board wants more detail than fits in package',
          solution: 'Use executive summary in main deck. Move details to appendix. Offer deep-dive sessions between meetings. Create board portal with on-demand reports.',
        },
        {
          issue: 'Data changes between package send and meeting',
          solution: 'Set cut-off date and note in package. Prepare addendum with updates. Focus board discussion on trends vs specific numbers. Consider near-real-time dashboard access.',
        },
        {
          issue: 'Not enough time to prepare quality package',
          solution: 'Start package prep earlier in month. Automate data pulls. Use templates. Delegate sections to department heads. Set up production calendar.',
        },
      ],
      relatedTabs: ['CFO Dashboard', 'FP&A & Forecasting', 'Investor Relations'],
    },
    {
      id: 'investor',
      title: 'Investor Relations',
      icon: IconZoomMoney,
      category: 'Communication',
      timeEstimate: '2-4 hours monthly',
      difficulty: 'Intermediate',
      purpose: 'Manage investor communications, prepare investor updates, coordinate fundraising.',
      whenToUse: [
        'Monthly investor updates',
        'Quarterly investor calls',
        'Fundraising activities',
        'Investor due diligence',
        'Cap table management',
      ],
      steps: [
        {
          title: 'Prepare Monthly Investor Update',
          description: 'Create investor communication',
          substeps: [
            'Open Investor Relations tab',
            'Draft executive summary',
            'Include key financial metrics',
            'Highlight business milestones',
            'Note any concerns or risks',
            'Add upcoming events/plans',
            'Keep concise (1-2 pages)',
          ],
        },
        {
          title: 'Update Investor Dashboard',
          description: 'Provide real-time metrics access',
          substeps: [
            'Refresh investor dashboard data',
            'Verify all metrics are current',
            'Add commentary on significant changes',
            'Upload supporting documents',
            'Notify investors of update',
          ],
        },
        {
          title: 'Manage Fundraising Process',
          description: 'Coordinate capital raising activities',
          substeps: [
            'Prepare fundraising materials (deck, model)',
            'Coordinate data room setup',
            'Respond to investor diligence requests',
            'Track investor pipeline',
            'Coordinate term sheet negotiations',
            'Manage closing documents',
          ],
        },
        {
          title: 'Conduct Investor Calls',
          description: 'Host quarterly investor updates',
          substeps: [
            'Schedule calls with investor group',
            'Prepare presentation materials',
            'Review financial performance',
            'Discuss strategic initiatives',
            'Address investor questions',
            'Document action items',
            'Distribute call summary',
          ],
        },
      ],
      keyFeatures: [
        {
          feature: 'Investor Portal',
          description: 'Secure portal for investor document access',
        },
        {
          feature: 'Cap Table Management',
          description: 'Track ownership and dilution',
        },
        {
          feature: 'Fundraising Pipeline',
          description: 'Manage investor leads and status',
        },
        {
          feature: 'Update Templates',
          description: 'Consistent investor communication formats',
        },
        {
          feature: 'Due Diligence Checklist',
          description: 'Track investor diligence requests',
        },
      ],
      proTips: [
        'Send investor updates on the same day each month for consistency',
        'Be transparent - investors appreciate honesty about challenges',
        'Provide both good and bad news - builds credibility',
        'Respond to investor inquiries within 24 hours',
        'Maintain organized data room - saves time during diligence',
        'Track investor engagement - identify your champions',
      ],
      commonIssues: [
        {
          issue: 'Investor asking for information not prepared',
          solution: 'Ask for clarification on specific need. Set expectations on timing. Prepare FAQ document for common questions. Build library of pre-prepared materials.',
        },
        {
          issue: 'Cap table doesn\'t match expectations',
          solution: 'Reconcile all transactions from inception. Verify vesting schedules. Check for granted but unexercised options. Engage cap table software/specialist.',
        },
        {
          issue: 'Investor not engaging with updates',
          solution: 'Reach out directly to check if receiving updates. Ask for feedback on content/format. Vary communication methods. Schedule periodic check-in calls.',
        },
      ],
      relatedTabs: ['Board Reporting', 'CFO Dashboard', 'Capital Structure'],
    },
    {
      id: 'audit',
      title: 'Audit Management',
      icon: IconScale,
      category: 'Reporting',
      timeEstimate: '10-20 hours annually',
      difficulty: 'Advanced',
      purpose: 'Coordinate financial audits, manage audit requests, ensure audit readiness.',
      whenToUse: [
        'Year-end audit preparation',
        'During annual audit',
        'SOX audit planning',
        'Internal audit coordination',
        'Audit committee reporting',
      ],
      steps: [
        {
          title: 'Prepare for Audit Kickoff',
          description: 'Set up for successful audit',
          substeps: [
            'Open Audit Management tab',
            'Review prior year audit issues',
            'Prepare preliminary financial statements',
            'Schedule kickoff meeting with auditors',
            'Assign audit support team',
            'Set up audit file room/portal',
            'Prepare PBC (Prepared by Client) list',
          ],
        },
        {
          title: 'Manage Audit Requests',
          description: 'Track and fulfill auditor information requests',
          substeps: [
            'Log each audit request (IDR)',
            'Assign requests to team members',
            'Track due dates',
            'Gather requested documentation',
            'Review before submitting to auditors',
            'Upload to audit portal',
            'Follow up on outstanding requests',
          ],
        },
        {
          title: 'Coordinate Audit Fieldwork',
          description: 'Support auditors during testing',
          substeps: [
            'Schedule interviews with process owners',
            'Arrange workspace for auditors',
            'Facilitate system access',
            'Answer auditor questions promptly',
            'Document any control testing',
            'Address proposed adjustments',
            'Review audit findings weekly',
          ],
        },
        {
          title: 'Review Audit Results',
          description: 'Evaluate audit findings',
          substeps: [
            'Review draft audit report',
            'Discuss any proposed adjustments',
            'Review management letter comments',
            'Assess if any significant deficiencies',
            'Develop remediation plans',
            'Obtain management responses',
            'Schedule audit committee presentation',
          ],
        },
        {
          title: 'Finalize and Close Audit',
          description: 'Complete audit process',
          substeps: [
            'Review final financial statements',
            'Sign management representation letter',
            'Present to audit committee',
            'Issue final audited financials',
            'Archive audit files',
            'Conduct post-audit lessons learned',
            'Update procedures for next year',
          ],
        },
      ],
      keyFeatures: [
        {
          feature: 'Request Tracker',
          description: 'Log and monitor all audit information requests',
        },
        {
          feature: 'Document Repository',
          description: 'Centralized storage for audit documentation',
        },
        {
          feature: 'Issue Management',
          description: 'Track audit findings and remediation',
        },
        {
          feature: 'PBC List Manager',
          description: 'Standard prepared by client request lists',
        },
        {
          feature: 'Timeline Dashboard',
          description: 'Visual timeline of audit milestones',
        },
      ],
      proTips: [
        'Start audit prep in Q4 - don\'t wait until year-end',
        'Maintain year-round audit readiness - easier than cramming',
        'Build strong relationship with audit team - makes process smoother',
        'Respond to audit requests promptly - keeps audit on schedule',
        'Don\'t push back on every audit adjustment - pick your battles',
        'Document everything - verbal explanations don\'t count',
        'Use prior year issues as process improvement opportunities',
      ],
      commonIssues: [
        {
          issue: 'Can\'t locate documentation auditors requesting',
          solution: 'Implement better filing system during year. Use consistent naming conventions. Scan documents when received. Consider document management system.',
        },
        {
          issue: 'Audit running behind schedule',
          solution: 'Escalate with audit partner. Add resources to support team. Prioritize critical requests. Extend working hours if needed. Adjust audit committee schedule.',
        },
        {
          issue: 'Disagreement with auditor on accounting treatment',
          solution: 'Research authoritative guidance. Consult with technical accounting team. Escalate to audit partner if needed. Consider alternative approaches. Document rationale.',
        },
      ],
      relatedTabs: ['Financial Controls', 'Board Reporting', 'Tax Planning'],
    },
    {
      id: 'risk',
      title: 'Risk Management',
      icon: IconAlertTriangle,
      category: 'Planning',
      timeEstimate: '1-2 hours quarterly',
      difficulty: 'Advanced',
      purpose: 'Identify, assess, and mitigate financial and operational risks.',
      whenToUse: [
        'Quarterly risk assessment',
        'Strategic planning sessions',
        'Before major decisions',
        'Insurance renewal time',
        'Compliance reviews',
      ],
      steps: [
        {
          title: 'Conduct Risk Assessment',
          description: 'Identify and evaluate risks',
          substeps: [
            'Open Risk Management tab',
            'Review risk register',
            'Identify new/emerging risks',
            'Assess likelihood and impact',
            'Calculate risk scores',
            'Prioritize risks by severity',
            'Update risk heat map',
          ],
        },
        {
          title: 'Develop Mitigation Plans',
          description: 'Create risk response strategies',
          substeps: [
            'Select high-priority risks',
            'Determine mitigation approach (avoid/reduce/transfer/accept)',
            'Design specific mitigation actions',
            'Assign risk owners',
            'Set implementation timelines',
            'Determine success metrics',
            'Document in risk register',
          ],
        },
        {
          title: 'Monitor Key Risk Indicators',
          description: 'Track early warning signals',
          substeps: [
            'Review KRI dashboard',
            'Check if any KRIs exceeded thresholds',
            'Investigate threshold breaches',
            'Update risk assessments if needed',
            'Adjust mitigation strategies',
            'Communicate to stakeholders',
          ],
        },
        {
          title: 'Review Insurance Coverage',
          description: 'Ensure adequate risk transfer',
          substeps: [
            'Review current insurance policies',
            'Assess coverage adequacy',
            'Identify coverage gaps',
            'Evaluate cost vs benefit',
            'Shop competitive quotes',
            'Update coverage as needed',
          ],
        },
      ],
      keyFeatures: [
        {
          feature: 'Risk Register',
          description: 'Centralized database of identified risks',
        },
        {
          feature: 'Risk Heat Map',
          description: 'Visual representation of risk likelihood and impact',
        },
        {
          feature: 'Key Risk Indicators (KRIs)',
          description: 'Metrics that signal increasing risk exposure',
        },
        {
          feature: 'Mitigation Tracker',
          description: 'Monitor implementation of risk responses',
        },
        {
          feature: 'Insurance Policy Tracker',
          description: 'Manage insurance coverage and renewals',
        },
      ],
      proTips: [
        'Update risk register quarterly - risks evolve constantly',
        'Involve department heads in risk identification - CFO can\'t see everything',
        'Focus on residual risk after mitigation, not inherent risk',
        'Link risks to strategic objectives to prioritize',
        'Don\'t over-engineer - simple risk management is better than none',
        'Present top risks to board quarterly',
      ],
      commonIssues: [
        {
          issue: 'Risk register becomes stale',
          solution: 'Schedule quarterly risk refresh sessions. Link risk reviews to strategic planning. Assign risk owners to monitor ongoing. Make risk discussions part of leadership meetings.',
        },
        {
          issue: 'Mitigation plans not being implemented',
          solution: 'Assign clear ownership. Set deadlines. Track in performance reviews. Escalate to executive team. Allocate budget for mitigation.',
        },
        {
          issue: 'Too many risks identified - overwhelmed',
          solution: 'Focus on top 10-15 risks. Combine similar risks. Remove low-likelihood low-impact risks. Delegate risk management to department heads where appropriate.',
        },
      ],
      relatedTabs: ['Financial Controls', 'Advanced Treasury', 'Audit Management'],
    },
    {
      id: 'capital',
      title: 'Capital Structure',
      icon: IconChartPie,
      category: 'Planning',
      timeEstimate: '30-60 min monthly',
      difficulty: 'Advanced',
      purpose: 'Manage company capital structure, optimize debt-to-equity mix, plan financing.',
      whenToUse: [
        'Before fundraising',
        'Debt refinancing decisions',
        'Strategic planning',
        'Cap table analysis',
        'Valuation discussions',
      ],
      steps: [
        {
          title: 'Analyze Current Capital Structure',
          description: 'Review existing financing mix',
          substeps: [
            'Open Capital Structure tab',
            'Review total capitalization',
            'Calculate debt-to-equity ratio',
            'Analyze cost of capital',
            'Review equity ownership breakdown',
            'Check preferred vs common stock',
            'Assess dilution from options/warrants',
          ],
        },
        {
          title: 'Model Financing Scenarios',
          description: 'Evaluate different financing options',
          substeps: [
            'Click "Scenario Builder"',
            'Model equity raise (size, valuation)',
            'Model debt financing (amount, terms)',
            'Calculate dilution impact',
            'Assess impact on WACC',
            'Compare scenarios',
            'Present recommendations',
          ],
        },
        {
          title: 'Update Cap Table',
          description: 'Maintain accurate ownership records',
          substeps: [
            'Review current cap table',
            'Add new equity issuances',
            'Record option grants/exercises',
            'Update vesting schedules',
            'Calculate fully diluted ownership',
            'Run scenario analysis (exits, liquidity)',
            'Export for board/investors',
          ],
        },
        {
          title: 'Analyze Debt Capacity',
          description: 'Determine borrowing potential',
          substeps: [
            'Calculate leverage ratios',
            'Review debt covenants',
            'Assess debt service coverage',
            'Model additional debt scenarios',
            'Determine optimal debt level',
            'Identify appropriate debt instruments',
          ],
        },
      ],
      keyFeatures: [
        {
          feature: 'Cap Table Management',
          description: 'Track ownership and equity grants',
        },
        {
          feature: 'Scenario Modeling',
          description: 'Model different financing structures',
        },
        {
          feature: 'Waterfall Analysis',
          description: 'Calculate payouts in exit scenarios',
        },
        {
          feature: 'WACC Calculator',
          description: 'Calculate weighted average cost of capital',
        },
        {
          feature: 'Dilution Tracker',
          description: 'Monitor ownership dilution over time',
        },
      ],
      proTips: [
        'Update cap table immediately after any equity transaction',
        'Model multiple financing scenarios before fundraising',
        'Consider non-dilutive financing (debt, revenue-based) before equity',
        'Maintain clean cap table - messy structures complicate exits',
        'Document all liquidation preferences and rights',
        'Run exit scenarios annually to understand stakeholder incentives',
      ],
      commonIssues: [
        {
          issue: 'Cap table has discrepancies',
          solution: 'Reconcile from inception. Verify all stock issuances. Check vesting schedules. Confirm option exercises. Engage cap table specialist if complex.',
        },
        {
          issue: 'Can\'t determine optimal financing mix',
          solution: 'Consult with investment banker. Model multiple scenarios. Consider stage of company. Balance dilution vs flexibility. Align with strategic plans.',
        },
        {
          issue: 'Investors questioning valuation',
          solution: 'Prepare comparables analysis. Document valuation methodology. Provide detailed financial model. Engage independent valuation expert if needed.',
        },
      ],
      relatedTabs: ['Investor Relations', 'FP&A & Forecasting', 'Advanced Treasury'],
    },
    {
      id: 'scenario',
      title: 'Scenario Planning',
      icon: IconChartDots,
      category: 'Planning',
      timeEstimate: '2-4 hours quarterly',
      difficulty: 'Advanced',
      purpose: 'Model multiple future scenarios to support strategic planning and risk management.',
      whenToUse: [
        'Strategic planning sessions',
        'Before major investments',
        'Economic uncertainty',
        'Fundraising preparation',
        'Board planning discussions',
      ],
      steps: [
        {
          title: 'Define Scenarios',
          description: 'Identify scenarios to model',
          substeps: [
            'Open Scenario Planning tab',
            'Brainstorm potential scenarios',
            'Select 3-5 distinct scenarios',
            'Define key assumptions for each',
            'Name scenarios descriptively',
            'Document scenario narratives',
          ],
        },
        {
          title: 'Build Financial Models',
          description: 'Create detailed scenario models',
          substeps: [
            'Start with base case model',
            'Adjust revenue assumptions by scenario',
            'Modify cost structure',
            'Update headcount plans',
            'Adjust capital expenditures',
            'Calculate financial metrics for each',
            'Run for 3-5 year horizon',
          ],
        },
        {
          title: 'Analyze Results',
          description: 'Compare scenario outcomes',
          substeps: [
            'Review key metrics by scenario',
            'Compare profitability timelines',
            'Assess cash runway differences',
            'Identify break points and triggers',
            'Determine which scenarios are acceptable',
            'Identify hedging strategies',
          ],
        },
        {
          title: 'Develop Action Plans',
          description: 'Create response strategies',
          substeps: [
            'Define early warning indicators',
            'Create decision trees',
            'Develop contingency plans',
            'Identify strategic options',
            'Document trigger points',
            'Assign monitoring responsibilities',
          ],
        },
      ],
      keyFeatures: [
        {
          feature: 'Scenario Builder',
          description: 'Create and compare multiple future scenarios',
        },
        {
          feature: 'Assumption Manager',
          description: 'Define and track key scenario assumptions',
        },
        {
          feature: 'Sensitivity Analysis',
          description: 'Test impact of changing variables',
        },
        {
          feature: 'Decision Trees',
          description: 'Map strategic options and outcomes',
        },
        {
          feature: 'Trigger Point Alerts',
          description: 'Monitor for scenario-switching signals',
        },
      ],
      proTips: [
        'Don\'t model too many scenarios - focus on most likely and most impactful',
        'Make scenarios distinct enough to drive different decisions',
        'Update scenarios quarterly as conditions change',
        'Share scenarios with leadership team for strategic alignment',
        'Use scenario planning to stress-test strategic initiatives',
        'Link scenario planning to budget process for integrated planning',
      ],
      commonIssues: [
        {
          issue: 'Scenarios too similar to be useful',
          solution: 'Increase variance in key assumptions. Consider more extreme scenarios. Focus on variables with highest impact. Add qualitative scenarios not just quantitative.',
        },
        {
          issue: 'Scenario models too complex',
          solution: 'Simplify to key drivers only. Use high-level P&L vs detailed model. Focus on directional insights vs precision. Build capability over time.',
        },
        {
          issue: 'Leadership not engaging with scenarios',
          solution: 'Present in strategic planning session. Link to specific decisions. Use scenarios to frame board discussions. Show how scenarios inform strategy.',
        },
      ],
      relatedTabs: ['FP&A & Forecasting', 'Risk Management', 'Capital Structure'],
    },
    {
      id: 'documents',
      title: 'CFO Documents',
      icon: IconFile,
      category: 'Communication',
      timeEstimate: '10-15 min as needed',
      difficulty: 'Basic',
      purpose: 'Create, edit, and manage CFO-related documents and financial reports.',
      whenToUse: [
        'Creating board memos',
        'Drafting financial policies',
        'Writing investor letters',
        'Preparing financial analyses',
        'Document collaboration',
      ],
      steps: [
        {
          title: 'Create New Document',
          description: 'Start a new CFO document',
          substeps: [
            'Open CFO Documents tab',
            'Click "New Document" button',
            'Choose template or blank document',
            'Enter document title',
            'Select document type/category',
            'Begin drafting content',
          ],
        },
        {
          title: 'Format and Edit',
          description: 'Format document professionally',
          substeps: [
            'Use formatting toolbar',
            'Apply headers and styles',
            'Insert tables if needed',
            'Add bullet points and numbering',
            'Include financial data/charts',
            'Apply company branding',
          ],
        },
        {
          title: 'Collaborate and Review',
          description: 'Share for feedback',
          substeps: [
            'Click "Share" button',
            'Add reviewers',
            'Set permissions (view/edit)',
            'Request feedback',
            'Incorporate comments',
            'Track document versions',
          ],
        },
        {
          title: 'Finalize and Export',
          description: 'Complete and distribute document',
          substeps: [
            'Review final version',
            'Run spell check',
            'Click "Export" button',
            'Choose format (PDF/Word)',
            'Download or email',
            'Archive in document library',
          ],
        },
      ],
      keyFeatures: [
        {
          feature: 'Document Templates',
          description: 'Pre-formatted templates for common CFO documents',
        },
        {
          feature: 'Real-Time Collaboration',
          description: 'Multiple users can edit simultaneously',
        },
        {
          feature: 'Version History',
          description: 'Track changes and revert to previous versions',
        },
        {
          feature: 'Export Options',
          description: 'Export to PDF, Word, or other formats',
        },
        {
          feature: 'Integration with Financial Data',
          description: 'Insert live financial data and charts',
        },
      ],
      proTips: [
        'Use templates for consistency across documents',
        'Name documents clearly with dates for easy searching',
        'Save frequently to avoid losing work',
        'Use version control for important documents',
        'Share drafts early for feedback',
        'Maintain document library organized by category',
      ],
      commonIssues: [
        {
          issue: 'Document formatting breaks when exporting',
          solution: 'Use PDF export for consistent formatting. Check if using unsupported features. Simplify complex layouts. Test export before sharing.',
        },
        {
          issue: 'Can\'t find old documents',
          solution: 'Use search function with keywords. Filter by date or type. Check archived documents. Implement better file naming conventions.',
        },
        {
          issue: 'Collaboration conflicts (simultaneous edits)',
          solution: 'System auto-merges in real-time. Review merge carefully. Use comments for major changes. Coordinate on complex edits.',
        },
      ],
      relatedTabs: ['Board Reporting', 'Investor Relations', 'Executive Communications'],
    },
  ];

  // Filter tabs based on search query
  const filteredTabs = useMemo(() => {
    if (!searchQuery.trim()) return tabGuides;

    const query = searchQuery.toLowerCase();
    return tabGuides.filter(
      (tab) =>
        tab.title.toLowerCase().includes(query) ||
        tab.purpose.toLowerCase().includes(query) ||
        tab.category.toLowerCase().includes(query) ||
        tab.whenToUse.some((use) => use.toLowerCase().includes(query)) ||
        tab.steps.some((step) => step.title.toLowerCase().includes(query)) ||
        tab.proTips.some((tip) => tip.toLowerCase().includes(query))
    );
  }, [searchQuery, tabGuides]);

  // Category colors
  const categoryColors: Record<string, string> = {
    Operations: 'blue',
    Planning: 'green',
    Reporting: 'orange',
    Communication: 'purple',
  };

  // Difficulty colors
  const difficultyColors: Record<string, string> = {
    Basic: 'green',
    Intermediate: 'yellow',
    Advanced: 'red',
  };

  const selectedTabData = tabGuides.find((tab) => tab.id === selectedTab);

  return (
    <Stack gap="lg" p={{ base: 16, md: 24 }}>
      {/* Header */}
      <Group justify="space-between" wrap="wrap">
        <Box>
          <Group gap="sm" mb={8}>
            <ThemeIcon size="xl" variant="light" color="orange">
              <IconBook size={24} />
            </ThemeIcon>
            <Title order={1}>CFO Knowledge Hub</Title>
          </Group>
          <Text c="dimmed" size="sm">
            Comprehensive step-by-step guides for all CFO Portal features
          </Text>
        </Box>
        <Badge size="lg" variant="light" color="orange">
          17 Tabs Documented
        </Badge>
      </Group>

      {/* Search */}
      <TextInput
        placeholder="Search knowledge base..."
        leftSection={<IconSearch size={16} />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        size="md"
      />

      {/* Quick Start Alert */}
      <Alert
        icon={<IconInfoCircle />}
        title="Quick Start Guide"
        color="blue"
        variant="light"
      >
        <Text size="sm">
          Welcome to the CFO Knowledge Hub! Each tab below contains detailed
          walkthroughs, best practices, and troubleshooting tips. Click on any tab to
          view its complete guide.
        </Text>
      </Alert>

      <Grid>
        {/* Left Sidebar - Table of Contents */}
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder p="md">
            <Stack gap="xs">
              <Text fw={600} size="sm" mb="xs">
                Table of Contents
              </Text>
              <Divider />
              <ScrollArea h={600}>
                <Stack gap={4}>
                  {filteredTabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <NavLink
                        key={tab.id}
                        label={tab.title}
                        leftSection={<Icon size={18} />}
                        active={selectedTab === tab.id}
                        onClick={() => setSelectedTab(tab.id)}
                        rightSection={
                          <Badge size="xs" color={categoryColors[tab.category]}>
                            {tab.category}
                          </Badge>
                        }
                      />
                    );
                  })}
                </Stack>
              </ScrollArea>
            </Stack>
          </Card>
        </Grid.Col>

        {/* Main Content */}
        <Grid.Col span={{ base: 12, md: 9 }}>
          {selectedTabData ? (
            <ScrollArea h={600}>
              <Stack gap="lg">
                {/* Tab Header */}
                <Card withBorder p="xl">
                  <Group justify="space-between" wrap="wrap" mb="md">
                    <Group>
                      <ThemeIcon
                        size="xl"
                        variant="light"
                        color={categoryColors[selectedTabData.category]}
                      >
                        <selectedTabData.icon size={24} />
                      </ThemeIcon>
                      <Box>
                        <Title order={2}>{selectedTabData.title}</Title>
                        <Group gap="xs" mt={4}>
                          <Badge color={categoryColors[selectedTabData.category]}>
                            {selectedTabData.category}
                          </Badge>
                          <Badge color={difficultyColors[selectedTabData.difficulty]}>
                            {selectedTabData.difficulty}
                          </Badge>
                          <Badge variant="outline" leftSection={<IconClock size={12} />}>
                            {selectedTabData.timeEstimate}
                          </Badge>
                        </Group>
                      </Box>
                    </Group>
                  </Group>

                  <Text size="md" c="dimmed">
                    {selectedTabData.purpose}
                  </Text>
                </Card>

                {/* Navigation Tabs */}
                <Tabs value={activeSection} onChange={setActiveSection}>
                  <Tabs.List>
                    <Tabs.Tab value="overview" leftSection={<IconInfoCircle size={16} />}>
                      Overview
                    </Tabs.Tab>
                    <Tabs.Tab value="steps" leftSection={<IconCheck size={16} />}>
                      Step-by-Step
                    </Tabs.Tab>
                    <Tabs.Tab value="features" leftSection={<IconTarget size={16} />}>
                      Key Features
                    </Tabs.Tab>
                    {selectedTabData.subTabs && (
                      <Tabs.Tab value="subtabs" leftSection={<IconChevronRight size={16} />}>
                        Sub-Tabs
                      </Tabs.Tab>
                    )}
                    <Tabs.Tab value="tips" leftSection={<IconTrendingUp size={16} />}>
                      Pro Tips
                    </Tabs.Tab>
                    <Tabs.Tab value="issues" leftSection={<IconAlertTriangle size={16} />}>
                      Troubleshooting
                    </Tabs.Tab>
                  </Tabs.List>

                  {/* Overview Tab */}
                  <Tabs.Panel value="overview" pt="md">
                    <Stack gap="md">
                      <Card withBorder p="md">
                        <Title order={4} mb="sm">
                          When to Use This Tab
                        </Title>
                        <List spacing="sm">
                          {selectedTabData.whenToUse.map((use, idx) => (
                            <List.Item key={idx}>{use}</List.Item>
                          ))}
                        </List>
                      </Card>

                      {selectedTabData.relatedTabs.length > 0 && (
                        <Card withBorder p="md">
                          <Title order={4} mb="sm">
                            Related Tabs
                          </Title>
                          <Group gap="xs">
                            {selectedTabData.relatedTabs.map((relatedTab) => (
                              <Badge
                                key={relatedTab}
                                variant="outline"
                                style={{ cursor: 'pointer' }}
                                onClick={() => {
                                  const related = tabGuides.find(
                                    (t) => t.title === relatedTab
                                  );
                                  if (related) setSelectedTab(related.id);
                                }}
                              >
                                {relatedTab}
                              </Badge>
                            ))}
                          </Group>
                        </Card>
                      )}
                    </Stack>
                  </Tabs.Panel>

                  {/* Step-by-Step Tab */}
                  <Tabs.Panel value="steps" pt="md">
                    <Card withBorder p="md">
                      <Title order={4} mb="md">
                        Step-by-Step Instructions
                      </Title>
                      <Timeline active={-1} bulletSize={24} lineWidth={2}>
                        {selectedTabData.steps.map((step, idx) => (
                          <Timeline.Item
                            key={idx}
                            bullet={<IconCheck size={12} />}
                            title={step.title}
                          >
                            <Text size="sm" c="dimmed" mt={4}>
                              {step.description}
                            </Text>
                            {step.substeps && (
                              <List mt="sm" size="sm" withPadding>
                                {step.substeps.map((substep, subIdx) => (
                                  <List.Item key={subIdx}>{substep}</List.Item>
                                ))}
                              </List>
                            )}
                          </Timeline.Item>
                        ))}
                      </Timeline>
                    </Card>
                  </Tabs.Panel>

                  {/* Key Features Tab */}
                  <Tabs.Panel value="features" pt="md">
                    <Stack gap="sm">
                      {selectedTabData.keyFeatures.map((feature, idx) => (
                        <Card key={idx} withBorder p="md">
                          <Group gap="sm" mb="xs">
                            <ThemeIcon size="sm" variant="light" color="blue">
                              <IconTarget size={14} />
                            </ThemeIcon>
                            <Text fw={600}>{feature.feature}</Text>
                          </Group>
                          <Text size="sm" c="dimmed">
                            {feature.description}
                          </Text>
                        </Card>
                      ))}
                    </Stack>
                  </Tabs.Panel>

                  {/* Sub-Tabs Tab */}
                  {selectedTabData.subTabs && (
                    <Tabs.Panel value="subtabs" pt="md">
                      <Accordion variant="separated">
                        {selectedTabData.subTabs.map((subTab, idx) => (
                          <Accordion.Item key={idx} value={subTab.name}>
                            <Accordion.Control>{subTab.name}</Accordion.Control>
                            <Accordion.Panel>
                              <Stack gap="sm">
                                <Text size="sm" fw={500}>
                                  Purpose:
                                </Text>
                                <Text size="sm" c="dimmed">
                                  {subTab.purpose}
                                </Text>
                                <Divider />
                                <Text size="sm" fw={500}>
                                  How to Use:
                                </Text>
                                <List size="sm">
                                  {subTab.howTo.map((how, howIdx) => (
                                    <List.Item key={howIdx}>{how}</List.Item>
                                  ))}
                                </List>
                              </Stack>
                            </Accordion.Panel>
                          </Accordion.Item>
                        ))}
                      </Accordion>
                    </Tabs.Panel>
                  )}

                  {/* Pro Tips Tab */}
                  <Tabs.Panel value="tips" pt="md">
                    <Stack gap="sm">
                      {selectedTabData.proTips.map((tip, idx) => (
                        <Alert
                          key={idx}
                          icon={<IconTrendingUp size={16} />}
                          color="green"
                          variant="light"
                        >
                          {tip}
                        </Alert>
                      ))}
                    </Stack>
                  </Tabs.Panel>

                  {/* Troubleshooting Tab */}
                  <Tabs.Panel value="issues" pt="md">
                    <Accordion variant="separated">
                      {selectedTabData.commonIssues.map((issue, idx) => (
                        <Accordion.Item key={idx} value={issue.issue}>
                          <Accordion.Control>
                            <Group gap="sm">
                              <IconAlertTriangle size={16} color="orange" />
                              <Text>{issue.issue}</Text>
                            </Group>
                          </Accordion.Control>
                          <Accordion.Panel>
                            <Alert color="blue" variant="light">
                              <Text size="sm" fw={500} mb="xs">
                                Solution:
                              </Text>
                              <Text size="sm">{issue.solution}</Text>
                            </Alert>
                          </Accordion.Panel>
                        </Accordion.Item>
                      ))}
                    </Accordion>
                  </Tabs.Panel>
                </Tabs>
              </Stack>
            </ScrollArea>
          ) : (
            <Card withBorder p="xl">
              <Stack align="center" gap="md">
                <IconBook size={48} />
                <Text size="lg" c="dimmed">
                  Select a tab from the sidebar to view its guide
                </Text>
              </Stack>
            </Card>
          )}
        </Grid.Col>
      </Grid>
    </Stack>
  );
};
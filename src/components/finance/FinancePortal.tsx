import React, { useState } from 'react';
import { Tabs, Stack } from '@mantine/core';
import { ExpenseRequestForm } from './ExpenseRequestForm';
import { ExpenseApprovalDashboard } from './ExpenseApprovalDashboard';
import { BudgetManagement } from './BudgetManagement';
import { InvoiceManagement } from './InvoiceManagement';
import { FinancialReportsDashboard } from './FinancialReportsDashboard';
import { FinanceDepartmentHierarchy } from './FinanceDepartmentHierarchy';
import {
  IconCurrencyDollar,
  IconCheck,
  IconWallet,
  IconFileText,
  IconChartBar,
  IconUsers,
} from '@tabler/icons-react';

export const FinancePortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('expenses');

  return (
    <Stack gap="lg">
      <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'expenses')}>
        <Tabs.List>
          <Tabs.Tab value="expenses" leftSection={<IconCurrencyDollar size={16} />}>
            Expense Requests
          </Tabs.Tab>
          <Tabs.Tab value="approvals" leftSection={<IconCheck size={16} />}>
            Approvals
          </Tabs.Tab>
          <Tabs.Tab value="budgets" leftSection={<IconWallet size={16} />}>
            Budgets
          </Tabs.Tab>
          <Tabs.Tab value="invoices" leftSection={<IconFileText size={16} />}>
            Invoices
          </Tabs.Tab>
          <Tabs.Tab value="reports" leftSection={<IconChartBar size={16} />}>
            Reports
          </Tabs.Tab>
          <Tabs.Tab value="hierarchy" leftSection={<IconUsers size={16} />}>
            Hierarchy
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="expenses" pt="md">
          <ExpenseRequestForm />
        </Tabs.Panel>

        <Tabs.Panel value="approvals" pt="md">
          <ExpenseApprovalDashboard />
        </Tabs.Panel>

        <Tabs.Panel value="budgets" pt="md">
          <BudgetManagement />
        </Tabs.Panel>

        <Tabs.Panel value="invoices" pt="md">
          <InvoiceManagement />
        </Tabs.Panel>

        <Tabs.Panel value="reports" pt="md">
          <FinancialReportsDashboard />
        </Tabs.Panel>

        <Tabs.Panel value="hierarchy" pt="md">
          <FinanceDepartmentHierarchy />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};


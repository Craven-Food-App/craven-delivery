// @ts-nocheck
import React, { useState, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconLayoutDashboard,
  IconChecklist,
  IconFileText,
  IconBuildingBank,
  IconCurrencyDollar,
  IconWallet,
  IconChartBar,
  IconUsers,
  IconShield,
  IconTrendingUp,
  IconCar,
  IconSettings,
} from '@tabler/icons-react';
import { FinanceDashboard } from '@/components/finance/FinanceDashboard';
import { ApprovalQueue } from '@/components/finance/ApprovalQueue';
import { FinancialReportsDashboard } from '@/components/finance/FinancialReportsDashboard';
import { BudgetManagement } from '@/components/finance/BudgetManagement';
import { CorporateGeneralLedger } from '@/components/finance/CorporateGeneralLedger';
import { CorporateAccountsPayable } from '@/components/finance/CorporateAccountsPayable';
import { CorporateAccountsReceivable } from '@/components/finance/CorporateAccountsReceivable';
import { BankingTreasuryView } from '@/components/finance/BankingTreasuryView';
import { PayrollView } from '@/components/finance/PayrollView';
import { TaxManagementView } from '@/components/finance/TaxManagementView';
import { GeneralLedgerView } from '@/components/finance/GeneralLedgerView';
import { FinanceAuditComponent } from '@/components/finance/audit/FinanceAuditComponent';
import { DriverCompensationDashboard } from '@/components/finance/driver-compensation/DriverCompensationDashboard';
import CfoEvaluationGatePanel from '@/components/cfo/CfoEvaluationGatePanel';
import { useFinanceRBAC } from '@/hooks/useFinanceRBAC';
import { UnifiedPortalShell, PortalTab, PortalLoadingState, PortalAccessDenied } from '@/components/portal/UnifiedPortalShell';

const TABS: PortalTab[] = [
  { id: 'dashboard', label: 'Finance Dashboard', description: 'Financial overview and key metrics.', section: 'Core', icon: IconLayoutDashboard },
  { id: 'approvals', label: 'Approval Queue', description: 'Pending financial approvals and sign-offs.', section: 'Core', icon: IconChecklist },
  { id: 'reports', label: 'Financial Reports', description: 'Reporting and financial statements.', section: 'Core', icon: IconFileText },
  { id: 'general-ledger', label: 'General Ledger', description: 'Chart of accounts and journal entries.', section: 'Accounting', icon: IconBuildingBank },
  { id: 'accounts-payable', label: 'Accounts Payable', description: 'Vendor invoices and payments.', section: 'Accounting', icon: IconCurrencyDollar },
  { id: 'accounts-receivable', label: 'Accounts Receivable', description: 'Customer invoices and collections.', section: 'Accounting', icon: IconWallet },
  { id: 'banking-treasury', label: 'Banking & Treasury', description: 'Cash management and banking.', section: 'Operations', icon: IconBuildingBank },
  { id: 'payroll', label: 'Payroll', description: 'Payroll processing and management.', section: 'Operations', icon: IconUsers },
  { id: 'budget-forecast', label: 'Budget & Forecast', description: 'Budget planning and forecasting.', section: 'Operations', icon: IconChartBar },
  { id: 'fixed-assets', label: 'Fixed Assets', description: 'Asset tracking and depreciation.', section: 'Operations', icon: IconSettings },
  { id: 'tax-management', label: 'Tax Management', description: 'Tax planning and compliance.', section: 'Compliance', icon: IconShield },
  { id: 'audit', label: 'Audit', description: 'Financial audit and compliance.', section: 'Compliance', icon: IconShield },
  { id: 'driver-compensation', label: 'Driver Compensation', description: 'Driver pay rules and analytics.', section: 'Compliance', icon: IconCar },
  { id: 'cfo-evaluation', label: 'CFO Evaluation', description: 'CFO performance evaluation gate.', section: 'Compliance', icon: IconTrendingUp },
];

const SECTIONS = ['Core', 'Accounting', 'Operations', 'Compliance'];

const EnterpriseFinancePortal: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const { loading, hasFullAdmin } = useFinanceRBAC();

  if (loading) return <PortalLoadingState message="Loading finance portal..." />;

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <FinanceDashboard />;
      case 'approvals': return <ApprovalQueue />;
      case 'reports': return <FinancialReportsDashboard />;
      case 'general-ledger': return <CorporateGeneralLedger />;
      case 'accounts-payable': return <CorporateAccountsPayable />;
      case 'accounts-receivable': return <CorporateAccountsReceivable />;
      case 'banking-treasury': return <BankingTreasuryView />;
      case 'payroll': return <PayrollView />;
      case 'budget-forecast': return <BudgetManagement />;
      case 'fixed-assets': return <GeneralLedgerView mode="fixed-assets" />;
      case 'tax-management': return <TaxManagementView />;
      case 'audit': return <FinanceAuditComponent />;
      case 'driver-compensation': return <DriverCompensationDashboard />;
      case 'cfo-evaluation': return <CfoEvaluationGatePanel mode="cfo" />;
      default: return <FinanceDashboard />;
    }
  };

  return (
    <UnifiedPortalShell
      portalName="Enterprise Finance"
      portalSubtitle="Corporate finance, accounting, and treasury"
      sectionLabel="Finance Portal"
      tabs={TABS}
      sections={SECTIONS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      lastUpdated={new Date()}
      onBack={() => navigate('/hub')}
    >
      {renderContent()}
    </UnifiedPortalShell>
  );
};

export default EnterpriseFinancePortal;

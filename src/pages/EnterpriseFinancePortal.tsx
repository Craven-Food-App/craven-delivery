import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { FinanceDashboard } from '@/components/finance/FinanceDashboard';
import { ApprovalQueue } from '@/components/finance/ApprovalQueue';
import { FinancialReportsDashboard } from '@/components/finance/FinancialReportsDashboard';
import { BudgetManagement } from '@/components/finance/BudgetManagement';
import { InvoiceManagement } from '@/components/finance/InvoiceManagement';
import { AuditComplianceDashboard } from '@/components/finance/AuditComplianceDashboard';
import { FinanceAuditPortal } from '@/components/finance/FinanceAuditPortal';
import { FinanceAuditComponent } from '@/components/finance/audit/FinanceAuditComponent';
import { GeneralLedgerView } from '@/components/finance/GeneralLedgerView';
import { CorporateGeneralLedger } from '@/components/finance/CorporateGeneralLedger';
import { BankingTreasuryView } from '@/components/finance/BankingTreasuryView';
import { PayrollView } from '@/components/finance/PayrollView';
import { TaxManagementView } from '@/components/finance/TaxManagementView';
import { AccountsReceivableView } from '@/components/finance/AccountsReceivableView';
import { CorporateAccountsPayable } from '@/components/finance/CorporateAccountsPayable';
import { CorporateAccountsReceivable } from '@/components/finance/CorporateAccountsReceivable';
import { SimpleTest } from '@/components/finance/SimpleTest';
import { useFinanceRBAC } from '@/hooks/useFinanceRBAC';
import { EnterpriseFinancePortalLayout } from '@/components/finance/EnterpriseFinancePortalLayout';
import { DriverCompensationDashboard } from '@/components/finance/driver-compensation/DriverCompensationDashboard';
import { DriverCompensationConfig } from '@/components/finance/driver-compensation/DriverCompensationConfig';
import { PeakRulesManager } from '@/components/finance/driver-compensation/PeakRulesManager';
import { BonusesOverview } from '@/components/finance/driver-compensation/BonusesOverview';
import { ProfitabilityDashboard } from '@/components/finance/driver-compensation/ProfitabilityDashboard';

const EnterpriseFinancePortal: React.FC = () => {
  console.log('✅ EnterpriseFinancePortal component is rendering!');
  
  return (
    <EnterpriseFinancePortalLayout>
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<FinanceDashboard />} />
        <Route path="approvals" element={<ApprovalQueue />} />
        <Route path="reports" element={<FinancialReportsDashboard />} />
        <Route path="general-ledger" element={<CorporateGeneralLedger />} />
        <Route path="accounts-payable" element={<CorporateAccountsPayable />} />
        <Route path="accounts-receivable" element={<CorporateAccountsReceivable />} />
        <Route path="banking-treasury" element={<BankingTreasuryView />} />
        <Route path="payroll" element={<PayrollView />} />
        <Route path="budget-forecast" element={<BudgetManagement />} />
        <Route path="fixed-assets" element={<GeneralLedgerView mode="fixed-assets" />} />
        <Route path="tax-management" element={<TaxManagementView />} />
        <Route path="audit" element={<FinanceAuditComponent />} />
        <Route path="driver-compensation" element={<DriverCompensationDashboard />} />
        <Route path="driver-compensation/config" element={<DriverCompensationConfig />} />
        <Route path="driver-compensation/peak-rules" element={<PeakRulesManager />} />
        <Route path="driver-compensation/bonuses" element={<BonusesOverview />} />
        <Route path="driver-compensation/profitability" element={<ProfitabilityDashboard />} />
        <Route path="test" element={<SimpleTest />} />
        <Route path="*" element={<div style={{ padding: '2rem' }}><h1>Route Not Found in Finance Portal</h1><p>Available routes: general-ledger, accounts-payable, accounts-receivable, etc.</p></div>} />
      </Routes>
    </EnterpriseFinancePortalLayout>
  );
};

export default EnterpriseFinancePortal;

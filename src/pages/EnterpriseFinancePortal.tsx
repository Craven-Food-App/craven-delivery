import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { EnterpriseFinancePortalLayout } from '@/components/finance/EnterpriseFinancePortalLayout';
import { FinanceDashboard } from '@/components/finance/FinanceDashboard';
import { ApprovalQueue } from '@/components/finance/ApprovalQueue';
import { FinancialReportsDashboard } from '@/components/finance/FinancialReportsDashboard';
import { BudgetManagement } from '@/components/finance/BudgetManagement';
import { InvoiceManagement } from '@/components/finance/InvoiceManagement';
import { AuditComplianceDashboard } from '@/components/finance/AuditComplianceDashboard';
import { GeneralLedgerView } from '@/components/finance/GeneralLedgerView';
import { BankingTreasuryView } from '@/components/finance/BankingTreasuryView';
import { PayrollView } from '@/components/finance/PayrollView';
import { TaxManagementView } from '@/components/finance/TaxManagementView';
import { AccountsReceivableView } from '@/components/finance/AccountsReceivableView';
import { useFinanceRBAC } from '@/hooks/useFinanceRBAC';

const EnterpriseFinancePortal: React.FC = () => {
  const { loading, getPrimaryRole } = useFinanceRBAC();

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading Finance Portal...</p>
      </div>
    );
  }

  const primaryRole = getPrimaryRole();
  if (!primaryRole) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p>You do not have access to the Finance Portal. Please contact your administrator.</p>
      </div>
    );
  }

  return (
    <EnterpriseFinancePortalLayout>
      <Routes>
        <Route path="dashboard" element={<FinanceDashboard />} />
        <Route path="approvals" element={<ApprovalQueue />} />
        <Route path="reports" element={<FinancialReportsDashboard />} />
        <Route path="general-ledger" element={<GeneralLedgerView />} />
        <Route path="accounts-payable" element={<InvoiceManagement />} />
        <Route path="accounts-receivable" element={<AccountsReceivableView />} />
        <Route path="banking-treasury" element={<BankingTreasuryView />} />
        <Route path="payroll" element={<PayrollView />} />
        <Route path="budget-forecast" element={<BudgetManagement />} />
        <Route path="fixed-assets" element={<GeneralLedgerView mode="fixed-assets" />} />
        <Route path="tax-management" element={<TaxManagementView />} />
        <Route path="audit" element={<AuditComplianceDashboard />} />
        <Route path="/" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </EnterpriseFinancePortalLayout>
  );
};

export default EnterpriseFinancePortal;


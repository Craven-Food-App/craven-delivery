import React from 'react';
import FinancialProjections from '@/components/investor/FinancialProjections';
import InvestorAccessGuard from '@/components/investor/InvestorAccessGuard';
import InvestorLayout from '@/components/investor/InvestorLayout';

const FinancialProjectionsPage: React.FC = () => {
  return (
    <InvestorAccessGuard>
      <InvestorLayout fullScreen={true}>
        <FinancialProjections />
      </InvestorLayout>
    </InvestorAccessGuard>
  );
};

export default FinancialProjectionsPage;


import React from 'react';
import FinancialProjections from '@/components/investor/FinancialProjections';
import InvestorAccessGuard from '@/components/investor/InvestorAccessGuard';

const FinancialProjectionsPage: React.FC = () => {
  return (
    <InvestorAccessGuard>
      <FinancialProjections />
    </InvestorAccessGuard>
  );
};

export default FinancialProjectionsPage;


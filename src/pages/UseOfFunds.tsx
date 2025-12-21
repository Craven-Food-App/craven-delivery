import React from 'react';
import UseOfFunds from '@/components/investor/UseOfFunds';
import InvestorAccessGuard from '@/components/investor/InvestorAccessGuard';
import InvestorLayout from '@/components/investor/InvestorLayout';

const UseOfFundsPage: React.FC = () => {
  return (
    <InvestorAccessGuard>
      <InvestorLayout fullScreen={true}>
        <UseOfFunds />
      </InvestorLayout>
    </InvestorAccessGuard>
  );
};

export default UseOfFundsPage;


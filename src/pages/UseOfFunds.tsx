import React from 'react';
import UseOfFunds from '@/components/investor/UseOfFunds';
import InvestorAccessGuard from '@/components/investor/InvestorAccessGuard';

const UseOfFundsPage: React.FC = () => {
  return (
    <InvestorAccessGuard>
      <UseOfFunds />
    </InvestorAccessGuard>
  );
};

export default UseOfFundsPage;


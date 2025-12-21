import React from 'react';
import ExecutiveSummary from '@/components/investor/ExecutiveSummary';
import InvestorAccessGuard from '@/components/investor/InvestorAccessGuard';

const ExecutiveSummaryPage: React.FC = () => {
  return (
    <InvestorAccessGuard>
      <ExecutiveSummary />
    </InvestorAccessGuard>
  );
};

export default ExecutiveSummaryPage;


import React from 'react';
import ExecutiveSummary from '@/components/investor/ExecutiveSummary';
import InvestorAccessGuard from '@/components/investor/InvestorAccessGuard';
import InvestorLayout from '@/components/investor/InvestorLayout';

const ExecutiveSummaryPage: React.FC = () => {
  return (
    <InvestorAccessGuard>
      <InvestorLayout fullScreen={true}>
        <ExecutiveSummary />
      </InvestorLayout>
    </InvestorAccessGuard>
  );
};

export default ExecutiveSummaryPage;


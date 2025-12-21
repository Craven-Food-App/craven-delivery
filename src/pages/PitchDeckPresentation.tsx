import React from 'react';
import PitchDeckPresentation from '@/components/investor/PitchDeckPresentation';
import InvestorAccessGuard from '@/components/investor/InvestorAccessGuard';
import InvestorLayout from '@/components/investor/InvestorLayout';

const PitchDeckPresentationPage: React.FC = () => {
  return (
    <InvestorAccessGuard>
      <InvestorLayout fullScreen={true}>
        <PitchDeckPresentation />
      </InvestorLayout>
    </InvestorAccessGuard>
  );
};

export default PitchDeckPresentationPage;


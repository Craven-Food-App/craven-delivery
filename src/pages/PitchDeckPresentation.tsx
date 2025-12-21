import React from 'react';
import PitchDeckPresentation from '@/components/investor/PitchDeckPresentation';
import InvestorAccessGuard from '@/components/investor/InvestorAccessGuard';

const PitchDeckPresentationPage: React.FC = () => {
  return (
    <InvestorAccessGuard>
      <PitchDeckPresentation />
    </InvestorAccessGuard>
  );
};

export default PitchDeckPresentationPage;


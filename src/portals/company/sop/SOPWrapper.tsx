import React, { Suspense, lazy } from 'react';
import SuspenseLoader from '@/components/SuspenseLoader';

const SOPManagement = lazy(() => import('./SOPManagement'));

const SOPWrapper: React.FC = () => {
  return (
    <Suspense fallback={<SuspenseLoader message="Loading SOP Management" />}>
      <SOPManagement />
    </Suspense>
  );
};

export default SOPWrapper;


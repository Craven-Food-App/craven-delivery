import React from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import SOPManagement from './SOPManagement';

const SOPWrapper: React.FC = () => {
  return (
    <ErrorBoundary>
      <SOPManagement />
    </ErrorBoundary>
  );
};

export default SOPWrapper;


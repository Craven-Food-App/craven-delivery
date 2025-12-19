import React, { Suspense } from 'react';
import { Center, Loader, Container } from '@mantine/core';
import SOPManagement from './SOPManagement';

console.log('🔷 [SOP] SOPWrapper module loaded');

const LoadingFallback = () => (
  <Container size="xl" py="xl">
    <Center h={400}>
      <Loader size="lg" />
    </Center>
  </Container>
);

const SOPWrapper: React.FC = () => {
  console.log('🔷 [SOP] SOPWrapper component function called!');
  console.log('🔷 [SOP] About to render SOPManagement...');
  
  try {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <SOPManagement />
      </Suspense>
    );
  } catch (error) {
    console.error('🔷 [SOP] Error rendering SOPManagement:', error);
    return <div>Error loading SOP Management</div>;
  }
};

console.log('🔷 [SOP] SOPWrapper component defined, exporting...');
export default SOPWrapper;


import React from 'react';
import SOPManagement from './SOPManagement';

console.log('🔷 [SOP] SOPWrapper module loaded');

const SOPWrapper: React.FC = () => {
  console.log('🔷 [SOP] SOPWrapper component function called!');
  console.log('🔷 [SOP] About to render SOPManagement...');
  
  try {
    return <SOPManagement />;
  } catch (error) {
    console.error('🔷 [SOP] Error rendering SOPManagement:', error);
    return <div>Error loading SOP Management</div>;
  }
};

console.log('🔷 [SOP] SOPWrapper component defined, exporting...');
export default SOPWrapper;


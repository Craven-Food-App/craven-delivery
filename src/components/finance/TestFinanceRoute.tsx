import React from 'react';
import { useLocation } from 'react-router-dom';

export const TestFinanceRoute: React.FC = () => {
  const location = useLocation();
  
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Finance Route Test</h1>
      <p>Current path: {location.pathname}</p>
      <p>If you see this, routing is working!</p>
    </div>
  );
};


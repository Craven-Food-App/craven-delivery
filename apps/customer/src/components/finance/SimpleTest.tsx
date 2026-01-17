import React from 'react';
import { useLocation } from 'react-router-dom';

export const SimpleTest: React.FC = () => {
  const location = useLocation();
  
  return (
    <div style={{ padding: '50px', background: '#f0f0f0', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '48px', color: '#1890ff' }}>✅ ROUTE WORKS!</h1>
      <p style={{ fontSize: '24px' }}>Current path: <strong>{location.pathname}</strong></p>
      <p>If you see this, the routing is working correctly.</p>
    </div>
  );
};


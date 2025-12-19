import React from 'react';
import { Outlet } from 'react-router-dom';
import { CompanyShell } from './components/CompanyShell';
import { CompanySecureRoute } from '@/lib/authGuard';

const CompanyPortalLayout: React.FC = () => {
  return (
    <CompanySecureRoute
      allowedRoles={[
        'CRAVEN_FOUNDER',
        'CRAVEN_CORPORATE_SECRETARY',
        'CRAVEN_BOARD_MEMBER',
        'CRAVEN_EXECUTIVE',
      ]}
    >
      <CompanyShell>
        <Outlet />
      </CompanyShell>
    </CompanySecureRoute>
  );
};

export default CompanyPortalLayout;

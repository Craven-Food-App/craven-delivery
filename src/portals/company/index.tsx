import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { CompanyShell } from './components/CompanyShell';
import { CompanySecureRoute } from '@/lib/authGuard';
import SOPManagement from './sop/SOPManagement';

const CompanyPortalLayout: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;
  
  console.log('🏢 [CompanyPortalLayout] Rendering, path:', path);
  
  // Direct render for SOP route to bypass Outlet issues
  const isSopRoute = path === '/company/sop' || path.endsWith('/sop');
  
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
        {isSopRoute ? (
          (() => {
            console.log('🏢 [CompanyPortalLayout] Rendering SOPManagement directly');
            return <SOPManagement />;
          })()
        ) : (
          <Outlet />
        )}
      </CompanyShell>
    </CompanySecureRoute>
  );
};

export default CompanyPortalLayout;


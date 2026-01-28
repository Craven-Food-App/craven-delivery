import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import CompanyPortalLayout from './index';
import CapTableEquityPageEnhanced from './cap-table/CapTableEquityPageEnhanced';
import GovernancePage from './governance/GovernancePage';
import BoardPortalPage from './board/BoardPortalPage';
import TeamPage from './team/TeamPage';
import NewAppointmentForm from './governance-admin/NewAppointmentForm';

/**
 * Company Portal Routes
 * 
 * Simplified structure:
 * - /company/cap-table - Cap table & equity grants
 * - /company/governance - Governance admin (5 tabs)
 * - /company/governance-admin/appointments/new - Create new appointment (original workflow)
 * - /company/board - Board portal
 * - /company/team - Team management
 */
const CompanyPortalRoutes: React.FC = () => {
  console.log('🚀 [CompanyPortalRoutes] Component rendering');
  
  return (
    <Routes>
      <Route element={<CompanyPortalLayout />}>
        <Route index element={<Navigate to="cap-table" replace />} />
        <Route path="cap-table" element={<CapTableEquityPageEnhanced />} />
        <Route path="governance/*" element={<GovernancePage />} />
        {/* Keep old route for backward compatibility - original appointment creation workflow */}
        <Route path="governance-admin/appointments/new" element={<NewAppointmentForm />} />
        <Route path="board" element={<BoardPortalPage />} />
        <Route path="team" element={<TeamPage />} />
      </Route>
    </Routes>
  );
};

export default CompanyPortalRoutes;


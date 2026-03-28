import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import CompanyPortalLayout from './index';
import CompanyPortalDashboard from './CompanyPortalDashboard';
import CapTableEquityPageEnhanced from './cap-table/CapTableEquityPageEnhanced';
import GovernancePage from './governance/GovernancePage';
import BoardPortalPage from './board/BoardPortalPage';
import TeamPage from './team/TeamPage';
import NewAppointmentForm from './governance-admin/NewAppointmentForm';
import ExecutiveDashboard from './executives/ExecutiveDashboard';
import LeadershipPublicPage from './leadership-public/LeadershipPublicPage';
import SOPWrapper from './sop/SOPWrapper';
import ExecutiveCalendarPage from './ExecutiveCalendarPage';

/**
 * Company Portal Routes
 * 
 * Simplified structure:
 * - /company/cap-table - Cap table & equity grants
 * - /company/governance - Governance admin (5 tabs)
 * - /company/governance-admin/appointments/new - Create new appointment (original workflow)
 * - /company/governance-admin/appointments - Redirect to governance appointments tab
 * - /company/board - Board portal
 * - /company/team - Team management
 * - /company/executives - Executive Dashboard (My Appointment, Onboarding, Documents, Equity, etc.)
 * - /company/leadership - Public leadership directory
 * - /company/sop - SOP documents
 */
const CompanyPortalRoutes: React.FC = () => {
  console.log('🚀 [CompanyPortalRoutes] Component rendering');
  
  return (
    <Routes>
      <Route element={<CompanyPortalLayout />}>
        <Route index element={<CompanyPortalDashboard />} />
        <Route path="cap-table" element={<CapTableEquityPageEnhanced />} />
        <Route path="governance/*" element={<GovernancePage />} />
        {/* Old routes for backward compatibility */}
        <Route path="governance-admin/appointments/new" element={<NewAppointmentForm />} />
        <Route path="governance-admin/appointments" element={<Navigate to="/company/governance?tab=appointments" replace />} />
        <Route path="board" element={<BoardPortalPage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="executives" element={<ExecutiveDashboard />} />
        <Route path="calendar" element={<ExecutiveCalendarPage />} />
        <Route path="leadership" element={<LeadershipPublicPage />} />
        <Route path="sop" element={<SOPWrapper />} />
      </Route>
    </Routes>
  );
};

export default CompanyPortalRoutes;


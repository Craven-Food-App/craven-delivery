import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import CompanyPortalLayout from './index';
import CapTableTest from './cap-table/CapTableTest'; // Temporary test
// import CapTableEquityPageEnhanced from './cap-table/CapTableEquityPageEnhanced';
import GovernancePage from './governance/GovernancePage';
import BoardPortalPage from './board/BoardPortalPage';
import TeamPage from './team/TeamPage';

/**
 * Company Portal Routes
 * 
 * Simplified structure:
 * - /company/cap-table - Cap table & equity grants
 * - /company/governance - Governance admin (5 tabs)
 * - /company/board - Board portal
 * - /company/team - Team management
 */
const CompanyPortalRoutes: React.FC = () => {
  return (
    <Routes>
      <Route element={<CompanyPortalLayout />}>
        <Route index element={<Navigate to="cap-table" replace />} />
        <Route path="cap-table" element={<CapTableTest />} />
        <Route path="governance/*" element={<GovernancePage />} />
        <Route path="board" element={<BoardPortalPage />} />
        <Route path="team" element={<TeamPage />} />
      </Route>
    </Routes>
  );
};

export default CompanyPortalRoutes;


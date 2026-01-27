import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SOPPortalLayout } from './SOPPortalLayout';
import SOPDashboard from './SOPDashboard';

/**
 * SOP Portal Routes
 * 
 * Standalone portal for Standard Operating Procedures
 */
const SOPPortalRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<SOPPortalLayout />}>
        <Route index element={<SOPDashboard />} />
        <Route path="view/:id" element={<SOPDashboard />} />
        <Route path="create" element={<SOPDashboard />} />
        <Route path="categories" element={<SOPDashboard />} />
      </Route>
    </Routes>
  );
};

export default SOPPortalRoutes;


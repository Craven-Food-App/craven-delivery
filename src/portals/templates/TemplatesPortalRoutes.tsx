import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { TemplatesPortalLayout } from './TemplatesPortalLayout';
import TemplatesDashboard from './TemplatesDashboard';

/**
 * Templates Portal Routes
 * 
 * Standalone portal for Email and Document Templates
 */
const TemplatesPortalRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<TemplatesPortalLayout />}>
        <Route index element={<TemplatesDashboard />} />
        <Route path="email" element={<TemplatesDashboard />} />
        <Route path="documents" element={<TemplatesDashboard />} />
        <Route path="create" element={<TemplatesDashboard />} />
        <Route path="preview/:id" element={<TemplatesDashboard />} />
      </Route>
    </Routes>
  );
};

export default TemplatesPortalRoutes;


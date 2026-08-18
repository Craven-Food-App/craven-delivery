import React, { useEffect } from 'react';
import { HashRouter, Route, Routes, useNavigate } from 'react-router-dom';
import InternalHubRoutes from '@/routes/InternalHubRoutes';
import DesktopAuth from './auth/DesktopAuth';
import DesktopNotificationBridge from './notifications/DesktopNotificationBridge';
import DesktopTitleBar from './shell/DesktopTitleBar';

function DesktopNavigationBridge() {
  const navigate = useNavigate();

  useEffect(() => {
    return window.cravenDesktop?.onNavigate((route) => {
      navigate(route, { replace: false });
    });
  }, [navigate]);

  return null;
}

export default function App() {
  return (
    <HashRouter>
      <DesktopNavigationBridge />
      <DesktopNotificationBridge />
      <DesktopTitleBar />
      <Routes>
        {/* Desktop-specific sign-in chrome; every other route falls through to
            the shared portal tree. */}
        <Route path="/" element={<DesktopAuth />} />
        <Route path="/auth" element={<DesktopAuth />} />
        <Route path="/business-auth" element={<DesktopAuth />} />
        <Route path="*" element={<InternalHubRoutes />} />
      </Routes>
    </HashRouter>
  );
}

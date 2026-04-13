import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import BusinessAuthGuard from "./BusinessAuthGuard";
import InternalCommsPortal from "@root/portals/internal-comms/InternalCommsPortal";

const App: React.FC = () => {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <BusinessAuthGuard>
            <InternalCommsPortal />
          </BusinessAuthGuard>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;


import React, { useEffect, useState } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminAuth from "./pages/AdminAuth";
import BusinessAuthGuard from "@/components/BusinessAuthGuard";
import AdminHub from "./AdminHub";

const ADMIN_ALLOWED_EMAIL = "tstroman.ceo@cravenusa.com";

const AdminAccessGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setAllowed(user?.email?.toLowerCase() === ADMIN_ALLOWED_EMAIL.toLowerCase());
    };
    void check();
  }, []);

  if (allowed === null) return null;
  if (!allowed) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          color: "#0f172a",
          padding: 24,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Access denied</h1>
        <p style={{ fontSize: 14, color: "#64748b" }}>
          This admin app is restricted to {ADMIN_ALLOWED_EMAIL}.
        </p>
      </div>
    );
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/auth" element={<AdminAuth />} />
        <Route
          path="/"
          element={
            <BusinessAuthGuard>
              <AdminAccessGuard>
                <AdminHub />
              </AdminAccessGuard>
            </BusinessAuthGuard>
          }
        />
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </HashRouter>
  );
};

export default App;


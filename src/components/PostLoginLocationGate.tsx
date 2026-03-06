/**
 * Post-login location disclosure gate for the Feeder app.
 * Renders children (e.g. MobileDriverDashboard) only after:
 * - User is not logged in (dashboard will show welcome/login), or
 * - User is logged in and has seen the location disclosure (Continue or Not now).
 * Ensures no location API runs before the in-app disclosure per Google Play policy.
 */
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { hasLocationDisclosureConsent } from "@/utils/locationDisclosure";
import LocationDisclosure from "@/components/LocationDisclosure";

type Props = {
  children: React.ReactNode;
};

export function PostLoginLocationGate({ children }: Props) {
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [showDisclosure, setShowDisclosure] = useState(false);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      if (!mounted) return;
      setAuthChecked(true);
      setUser(u ?? null);
      if (u && !hasLocationDisclosureConsent()) {
        setShowDisclosure(true);
      }
    };

    check();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const u = session?.user ?? null;
      setUser(u);
      if (u && !hasLocationDisclosureConsent()) {
        setShowDisclosure(true);
      } else {
        setShowDisclosure(false);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const handleDisclosureDone = () => {
    setShowDisclosure(false);
  };

  // Wait until we know auth state so we don't flash dashboard before disclosure
  if (!authChecked) {
    return (
      <div
        style={{
          height: "100vh",
          width: "100vw",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fff",
        }}
      >
        <div style={{ width: 24, height: 24, border: "2px solid #f97316", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (user && showDisclosure) {
    return (
      <LocationDisclosure
        variant="feeder"
        onDone={handleDisclosureDone}
      />
    );
  }

  return <>{children}</>;
}

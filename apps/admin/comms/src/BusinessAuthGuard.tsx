import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Center, Loader, Stack, Text } from "@mantine/core";
import { supabase } from "@root/integrations/supabase/client";

interface BusinessAuthGuardProps {
  children: React.ReactNode;
}

const loginWithReturn = (navigate: ReturnType<typeof useNavigate>, pathname: string, search: string) => {
  const returnTo = `${pathname}${search || ""}`;
  const q = new URLSearchParams();
  q.set("hq", "true");
  if (returnTo && returnTo !== "/auth" && !returnTo.startsWith("/auth?")) {
    q.set("redirect", returnTo);
  }
  navigate(`/auth?${q.toString()}`);
};

const BusinessAuthGuard: React.FC<BusinessAuthGuardProps> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (error || !user) {
          setIsAuthenticated(false);
          loginWithReturn(navigate, location.pathname, location.search);
        } else {
          setIsAuthenticated(true);
        }
      } catch {
        if (cancelled) return;
        setIsAuthenticated(false);
        loginWithReturn(navigate, location.pathname, location.search);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        setIsAuthenticated(false);
        loginWithReturn(
          navigate,
          typeof window !== "undefined" ? window.location.pathname : location.pathname,
          typeof window !== "undefined" ? window.location.search : location.search,
        );
      } else if (event === "SIGNED_IN" && session?.user) {
        setIsAuthenticated(true);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname, location.search]);

  if (loading) {
    return (
      <Center h="100vh" bg="#111827">
        <Stack align="center" gap="sm">
          <Loader color="orange" />
          <Text size="sm" c="gray.2">
            Checking session…
          </Text>
        </Stack>
      </Center>
    );
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
};

export default BusinessAuthGuard;


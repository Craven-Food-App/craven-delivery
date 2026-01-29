import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@root/integrations/supabase/client";
import { isTorrance, isJustin } from "@root/utils/torranceAccess";

// Use background image from Android assets folder
// For Capacitor: assets in android/app/src/main/assets are accessible via /hub_background.png
// This works in both web dev (from public folder) and Capacitor builds (from assets)
const hubBackgroundImage = '/hub_background.png';


interface ExecutiveAuthGuardProps {
  children: React.ReactNode;
}

export const ExecutiveAuthGuard: React.FC<ExecutiveAuthGuardProps> = ({
  children,
}) => {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          navigate("/auth?hq=true&redirect=/hub");
          return;
        }

        const userEmail = user.email?.toLowerCase() || "";

        // TORRANCE STROMAN: UNIVERSAL EXECUTIVE ACCESS - CHECK FIRST
        if (isTorrance(userEmail)) {
          console.log("✅ TORRANCE STROMAN - Executive access granted to tablet app");
          setIsAuthorized(true);
          return;
        }

        // JUSTIN SWEET: EXECUTIVE ACCESS (CFO)
        if (isJustin(userEmail)) {
          console.log("✅ JUSTIN SWEET - Executive access granted to tablet app");
          setIsAuthorized(true);
          return;
        }

        // Standard executive checks for other users
        const { data: execUser } = await supabase
          .from("exec_users")
          .select("role, title")
          .eq("user_id", user.id)
          .maybeSingle();

        const { data: hasAccessCred } = await supabase
          .from("ceo_access_credentials")
          .select("user_email")
          .eq("user_email", userEmail)
          .maybeSingle();

        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        const hasExecutiveRole = roles?.some((r) =>
          ["ceo", "cfo", "cto", "coo", "cxo", "admin", "executive"].includes(
            r.role.toLowerCase()
          )
        );

        const isExec = !!(execUser || hasAccessCred || hasExecutiveRole);

        if (!isExec) {
          navigate("/auth?hq=true&redirect=/hub&error=executive_only");
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error("Error checking executive access:", error);
        navigate("/auth?hq=true&redirect=/hub");
      }
    };

    checkAccess();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        navigate("/auth?hq=true&redirect=/hub");
      } else if (event === "SIGNED_IN") {
        checkAccess();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (isAuthorized === null) {
    // Use the exact same structure and styling as BusinessAuth
    // BusinessAuth uses: className="min-h-screen flex items-center justify-center p-3 sm:p-4 bg-gray-900 overflow-hidden"
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "12px 16px",
          backgroundColor: "#111827", // bg-gray-900
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Background Container - Exact same as BusinessAuth */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100%",
            height: "100%",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              backgroundImage: `url(${hubBackgroundImage})`,
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              backgroundSize: "cover",
            }}
          />
        </div>

        {/* Loading Message (Overlay) - Centered like BusinessAuth's form */}
        <div
          style={{
            position: "relative",
            zIndex: 10,
            width: "100%",
            maxWidth: "448px", // max-w-md
            margin: "0 auto",
            padding: "0 12px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              padding: "20px 24px",
              borderRadius: "12px",
              background: "rgba(0, 0, 0, 0.6)",
              backdropFilter: "blur(20px) saturate(180%)",
              WebkitBackdropFilter: "blur(20px) saturate(180%)",
              border: "1px solid rgba(255, 122, 69, 0.3)",
              boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.5)",
            }}
          >
            <div
              style={{
                display: "inline-block",
                padding: "8px 12px",
                borderRadius: "9999px",
                backgroundColor: "#ff7a45",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                marginBottom: "8px",
              }}
            >
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  border: "2px solid #ffffff",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
            </div>
            <h1
              style={{
                fontSize: "24px",
                fontWeight: "800",
                color: "#ffffff",
                marginBottom: "4px",
              }}
            >
              Verifying Access
            </h1>
            <p
              style={{
                fontSize: "14px",
                color: "#d1d5db",
                marginTop: "4px",
              }}
            >
              Please wait while we verify your executive credentials...
            </p>
          </div>
        </div>

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
};

export default ExecutiveAuthGuard;




